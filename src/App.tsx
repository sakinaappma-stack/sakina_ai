import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, VolumeX } from 'lucide-react';
import type {
  AdhanPrayerKey,
  AppSettings,
  CityItem,
  CountryItem,
  LanguageCode,
  MuezzinId,
  PrayerKey,
  TabId,
} from './types';
import { getLanguageMeta, getUiTranslation } from './i18n/translations';
import {
  MUEZZINS,
  computePrayerSchedule,
  formatDates,
  formatPrayerTime,
  normalizeMuezzinId,
  playGentleAlertChime,
  suggestCalculationMethodForCountry,
} from './utils/prayerUtils';
import {
  type Stored30DayCalendar,
  cacheSelectedAdhanAudio,
  fetchAndCache30DayCalendar,
  getOfflinePlayableAdhanUrl,
  isAdhanAudioCached as checkIsAdhanAudioCached,
  load30DayCalendarFromCacheApi,
  load30DayCalendarFromStorage,
  scheduleTestAdhanIn2Min,
  showPrayerNotificationViaSw,
  syncNotificationsWithSwAndServer,
} from './utils/offlineStorage';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { QuranView } from './components/QuranView';
import { AdhkarView } from './components/AdhkarView';
import { SakinaAiView } from './components/SakinaAiView';
import { QiblaView } from './components/QiblaView';
import { TasbihView } from './components/TasbihView';
import { MosquesView } from './components/MosquesView';
import { SettingsView } from './components/SettingsView';
import { OfflineIndicator } from './components/PWAControls';

const STORAGE_KEY = 'sakina_ai_settings_v2';
const SAVED_CITY_STORAGE_KEY = 'sakina_selected_city_v1';
const TEST_ADHAN_STORAGE_KEY = 'sakina_test_adhan_target_v1';

interface AladhanTimings {
  dateKey: string;
  cityKey: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  timezoneCity?: string;
  latitude?: number;
  longitude?: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: 'ar',
  countryIso: 'MA',
  cityName: 'الدار البيضاء',
  cityLat: 33.5731,
  cityLng: -7.5898,
  calculationMethod: 'Morocco',
  madhab: 'shafi',
  darkMode: false,
  use24Hour: true,
  quranFontSize: 28,
  reciterId: 'alafasy',
  aiVoice: 'woman',
  adhan: {
    muezzin: 'moroccan',
    enabledPrayers: {
      fajr: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true,
    },
    preAdhanAlert10Min: true,
  },
};

function loadInitialSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const savedCityRaw = localStorage.getItem(SAVED_CITY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const savedCity = savedCityRaw ? JSON.parse(savedCityRaw) : null;

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      ...(savedCity
        ? {
            countryIso: savedCity.countryIso || parsed.countryIso || DEFAULT_SETTINGS.countryIso,
            cityName: savedCity.cityName || parsed.cityName || DEFAULT_SETTINGS.cityName,
            cityLat:
              typeof savedCity.cityLat === 'number'
                ? savedCity.cityLat
                : parsed.cityLat ?? DEFAULT_SETTINGS.cityLat,
            cityLng:
              typeof savedCity.cityLng === 'number'
                ? savedCity.cityLng
                : parsed.cityLng ?? DEFAULT_SETTINGS.cityLng,
          }
        : {}),
      reciterId: parsed.reciterId || DEFAULT_SETTINGS.reciterId,
      aiVoice: parsed.aiVoice === 'man' ? 'man' : 'woman',
      adhan: {
        ...DEFAULT_SETTINGS.adhan,
        ...(parsed.adhan || {}),
        muezzin: normalizeMuezzinId(parsed.adhan?.muezzin),
        enabledPrayers: {
          ...DEFAULT_SETTINGS.adhan.enabledPrayers,
          ...(parsed.adhan?.enabledPrayers || {}),
        },
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function parseAladhanHHMM(baseDate: Date, hhmm: string): Date {
  const clean = hhmm.trim().slice(0, 5);
  const [hStr, mStr] = clean.split(':');
  const d = new Date(baseDate);
  d.setHours(Number(hStr) || 0, Number(mStr) || 0, 0, 0);
  return d;
}

async function fetchAladhanByCoords(
  lat: number,
  lng: number,
  cityKey: string,
  dateKey: string
): Promise<AladhanTimings | null> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=5`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: {
        timings?: {
          Fajr: string;
          Sunrise: string;
          Dhuhr: string;
          Asr: string;
          Maghrib: string;
          Isha: string;
        };
        meta?: {
          latitude?: number;
          longitude?: number;
          timezone?: string;
        };
      };
    };
    const timings = json.data?.timings;
    if (!timings) return null;

    const tzParts = json.data?.meta?.timezone?.split('/');
    const timezoneCity = tzParts && tzParts.length > 1 ? tzParts[tzParts.length - 1].replace(/_/g, ' ') : undefined;

    return {
      dateKey,
      cityKey,
      fajr: timings.Fajr,
      sunrise: timings.Sunrise,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha,
      timezoneCity,
      latitude: json.data?.meta?.latitude,
      longitude: json.data?.meta?.longitude,
    };
  } catch {
    return null;
  }
}

async function fetchAladhanByCity(
  cityName: string,
  countryName: string,
  cityKey: string,
  dateKey: string
): Promise<AladhanTimings | null> {
  try {
    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(
      cityName
    )}&country=${encodeURIComponent(countryName)}&method=5`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: {
        timings?: {
          Fajr: string;
          Sunrise: string;
          Dhuhr: string;
          Asr: string;
          Maghrib: string;
          Isha: string;
        };
        meta?: {
          latitude?: number;
          longitude?: number;
        };
      };
    };
    const timings = json.data?.timings;
    if (!timings) return null;

    return {
      dateKey,
      cityKey,
      fajr: timings.Fajr,
      sunrise: timings.Sunrise,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha,
      latitude: json.data?.meta?.latitude,
      longitude: json.data?.meta?.longitude,
    };
  } catch {
    return null;
  }
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadInitialSettings);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [openCityPickerSignal, setOpenCityPickerSignal] = useState(0);
  const [aladhanTimings, setAladhanTimings] = useState<AladhanTimings | null>(null);
  const [calendar30d, setCalendar30d] = useState<Stored30DayCalendar | null>(() =>
    load30DayCalendarFromStorage()
  );
  const [adhanAudioCached, setAdhanAudioCached] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));
  const [notificationPromptDismissed, setNotificationPromptDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sakina_notif_prompt_dismissed_v1') === '1';
    } catch {
      return false;
    }
  });
  const [pendingAdhanAutoplay, setPendingAdhanAutoplay] = useState(false);

  // Adhan playback & alert banner state
  const [isAdhanPlaying, setIsAdhanPlaying] = useState(false);
  const [activeAlertBanner, setActiveAlertBanner] = useState<string | null>(null);
  const [testAdhanTargetMs, setTestAdhanTargetMs] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(TEST_ADHAN_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { targetMs?: number };
      if (parsed.targetMs && parsed.targetMs > Date.now()) {
        return parsed.targetMs;
      }
      localStorage.removeItem(TEST_ADHAN_STORAGE_KEY);
      return null;
    } catch {
      return null;
    }
  });
  const adhanAudioRef = useRef<HTMLAudioElement | null>(null);
  const adhanBlobRevokeRef = useRef<(() => void) | null>(null);
  const firedAdhanRef = useRef<string>('');
  const firedPreAlertRef = useRef<string>('');
  const testAdhanTagRef = useRef<string>('');

  const t = getUiTranslation(settings.language);
  const langMeta = getLanguageMeta(settings.language);

  // Persist settings and chosen city in localStorage
  useEffect(() => {
    const root = document.documentElement;
    root.lang = settings.language;
    root.dir = langMeta.dir;
    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      localStorage.setItem(
        SAVED_CITY_STORAGE_KEY,
        JSON.stringify({
          countryIso: settings.countryIso,
          cityName: settings.cityName,
          cityLat: settings.cityLat,
          cityLng: settings.cityLng,
        })
      );
    } catch {
      // ignore storage failure
    }
  }, [settings, langMeta.dir]);

  // 1-second timer for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load world countries localized to current language
  useEffect(() => {
    let active = true;
    setLoadingCountries(true);
    fetch(`/api/locations/countries?lang=${settings.language}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setCountries(data.countries || []);
      })
      .catch(() => {
        if (!active) return;
      })
      .finally(() => {
        if (active) setLoadingCountries(false);
      });
    return () => {
      active = false;
    };
  }, [settings.language]);

  // Load cities whenever country changes
  useEffect(() => {
    let active = true;
    setLoadingCities(true);
    fetch(`/api/locations/cities/${settings.countryIso}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setCities(data.cities || []);
      })
      .catch(() => {
        if (!active) return;
        setCities([]);
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });
    return () => {
      active = false;
    };
  }, [settings.countryIso]);

  const todayDateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentCityKey = `${settings.cityName}|${settings.cityLat.toFixed(2)}|${settings.cityLng.toFixed(2)}`;

  // Fetch initial Aladhan API timings for saved city on load / day change
  useEffect(() => {
    if (
      aladhanTimings &&
      aladhanTimings.dateKey === todayDateKey &&
      aladhanTimings.cityKey === currentCityKey
    ) {
      return;
    }
    let active = true;
    fetchAladhanByCoords(
      settings.cityLat,
      settings.cityLng,
      currentCityKey,
      todayDateKey
    ).then((result) => {
      if (active && result) {
        setAladhanTimings(result);
      }
    });
    return () => {
      active = false;
    };
  }, [currentCityKey, todayDateKey, aladhanTimings]);

  // Load 30-day calendar from Cache API if localStorage was empty, and refresh 30-day cache for current city
  useEffect(() => {
    let active = true;
    const syncCalendar = async () => {
      if (!calendar30d || calendar30d.cityKey !== currentCityKey) {
        const fromCacheApi = await load30DayCalendarFromCacheApi(currentCityKey);
        if (active && fromCacheApi) {
          setCalendar30d(fromCacheApi);
        }
      }

      const isFresh =
        calendar30d &&
        calendar30d.cityKey === currentCityKey &&
        Date.now() - calendar30d.fetchedAt < 12 * 60 * 60 * 1000 &&
        calendar30d.days.some((d) => d.dateKey === todayDateKey);

      if (isFresh) return;

      const updated = await fetchAndCache30DayCalendar({
        lat: settings.cityLat,
        lng: settings.cityLng,
        cityName: settings.cityName,
        countryIso: settings.countryIso,
        cityKey: currentCityKey,
        method: settings.calculationMethod,
        madhab: settings.madhab,
      });

      if (active) {
        setCalendar30d(updated);
      }
    };

    syncCalendar();
    return () => {
      active = false;
    };
  }, [
    currentCityKey,
    todayDateKey,
    settings.cityLat,
    settings.cityLng,
    settings.cityName,
    settings.countryIso,
    settings.calculationMethod,
    settings.madhab,
  ]);

  // Cache selected Adhan audio file locally on device whenever muezzin changes
  useEffect(() => {
    let active = true;
    checkIsAdhanAudioCached(settings.adhan.muezzin).then((cached) => {
      if (active) setAdhanAudioCached(cached);
    });
    cacheSelectedAdhanAudio(settings.adhan.muezzin).then((ok) => {
      if (active && ok) setAdhanAudioCached(true);
    });
    return () => {
      active = false;
    };
  }, [settings.adhan.muezzin]);

  // Keep Service Worker & Web Push synchronized with 30-day prayer times & Adhan preferences
  useEffect(() => {
    if (!calendar30d || calendar30d.days.length === 0) return;
    syncNotificationsWithSwAndServer({
      calendar: calendar30d,
      adhanSettings: settings.adhan,
      language: settings.language,
    });
  }, [calendar30d, settings.adhan, settings.language, notificationPermission]);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.isoCode === settings.countryIso),
    [countries, settings.countryIso]
  );

  const prayerComputation = useMemo(() => {
    const localComp = computePrayerSchedule(
      settings.cityLat,
      settings.cityLng,
      settings.calculationMethod,
      settings.madhab,
      settings.use24Hour,
      settings.language,
      now
    );

    const cachedToday =
      calendar30d && calendar30d.cityKey === currentCityKey
        ? calendar30d.days.find((d) => d.dateKey === todayDateKey)
        : undefined;

    const activeTimings =
      aladhanTimings &&
      aladhanTimings.dateKey === todayDateKey &&
      aladhanTimings.cityKey === currentCityKey
        ? aladhanTimings
        : cachedToday;

    if (activeTimings) {
      const orderedKeys: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
      const rawTimes: Record<PrayerKey, Date> = {
        fajr: parseAladhanHHMM(now, activeTimings.fajr),
        sunrise: parseAladhanHHMM(now, activeTimings.sunrise),
        dhuhr: parseAladhanHHMM(now, activeTimings.dhuhr),
        asr: parseAladhanHHMM(now, activeTimings.asr),
        maghrib: parseAladhanHHMM(now, activeTimings.maghrib),
        isha: parseAladhanHHMM(now, activeTimings.isha),
      };

      let nextKey: PrayerKey | null = null;
      let nextTime: Date | null = null;
      for (const key of orderedKeys) {
        if (key === 'sunrise') continue;
        if (rawTimes[key].getTime() > now.getTime()) {
          nextKey = key;
          nextTime = rawTimes[key];
          break;
        }
      }

      if (!nextKey || !nextTime) {
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
        const cachedTomorrow = calendar30d?.days.find((d) => d.dateKey === tomorrowKey);
        nextKey = 'fajr';
        nextTime = cachedTomorrow
          ? parseAladhanHHMM(tomorrow, cachedTomorrow.fajr)
          : localComp.nextPrayerTime;
      }

      const diffMs = Math.max(0, nextTime.getTime() - now.getTime());
      const remainingSeconds = Math.floor(diffMs / 1000);
      const hrs = Math.floor(remainingSeconds / 3600);
      const mins = Math.floor((remainingSeconds % 3600) / 60);
      const secs = remainingSeconds % 60;
      const countdown = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      const schedule = orderedKeys.map((key) => {
        const time = rawTimes[key];
        return {
          key,
          time,
          formattedTime: formatPrayerTime(time, settings.use24Hour, settings.language),
          isNext: key === nextKey && time.getTime() === nextTime.getTime(),
          isPassed: time.getTime() <= now.getTime(),
        };
      });

      return {
        ...localComp,
        schedule,
        nextPrayerKey: nextKey,
        nextPrayerTime: nextTime,
        remainingSeconds,
        countdown,
      };
    }

    return localComp;
  }, [
    settings.cityLat,
    settings.cityLng,
    settings.calculationMethod,
    settings.madhab,
    settings.use24Hour,
    settings.language,
    now,
    aladhanTimings,
    calendar30d,
    todayDateKey,
    currentCityKey,
  ]);

  const dates = useMemo(() => formatDates(now, settings.language), [now, settings.language]);

  const stopAdhanAudio = () => {
    if (adhanAudioRef.current) {
      adhanAudioRef.current.pause();
      adhanAudioRef.current.currentTime = 0;
    }
    if (adhanBlobRevokeRef.current) {
      adhanBlobRevokeRef.current();
      adhanBlobRevokeRef.current = null;
    }
    setPendingAdhanAutoplay(false);
    setIsAdhanPlaying(false);
  };

  const lastRequestedMuezzinRef = useRef<MuezzinId | undefined>(undefined);

  const playAdhanAudio = async (bannerText?: string, overrideMuezzin?: MuezzinId) => {
    const targetMuezzinId = overrideMuezzin || settings.adhan.muezzin;
    lastRequestedMuezzinRef.current = targetMuezzinId;
    const muezzin = MUEZZINS.find((m) => m.id === targetMuezzinId) || MUEZZINS[0];
    const resolved = await getOfflinePlayableAdhanUrl(muezzin.id);

    if (adhanBlobRevokeRef.current) {
      adhanBlobRevokeRef.current();
      adhanBlobRevokeRef.current = null;
    }
    if (resolved.revoke) {
      adhanBlobRevokeRef.current = resolved.revoke;
    }

    if (!adhanAudioRef.current) {
      adhanAudioRef.current = new Audio(resolved.url);
      adhanAudioRef.current.onended = () => setIsAdhanPlaying(false);
      adhanAudioRef.current.onerror = () => {
        setIsAdhanPlaying(false);
        playGentleAlertChime();
      };
    } else {
      adhanAudioRef.current.pause();
      adhanAudioRef.current.src = resolved.url;
      adhanAudioRef.current.load();
    }

    if (bannerText) {
      setActiveAlertBanner(bannerText);
    }

    try {
      adhanAudioRef.current.muted = false;
      await adhanAudioRef.current.play();
      setPendingAdhanAutoplay(false);
      setIsAdhanPlaying(true);
    } catch {
      setIsAdhanPlaying(false);
      setPendingAdhanAutoplay(true);
      playGentleAlertChime();
    }
  };

  const toggleAdhanPreview = () => {
    if (isAdhanPlaying) {
      stopAdhanAudio();
      setActiveAlertBanner(null);
    } else {
      void playAdhanAudio();
    }
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      if (result === 'granted' && calendar30d) {
        await syncNotificationsWithSwAndServer({
          calendar: calendar30d,
          adhanSettings: settings.adhan,
          language: settings.language,
        });
      }
    } catch {
      // ignore permission prompt error
    }
  };

  const handleScheduleTestAdhan2Min = async () => {
    // 1. Ensure notification permission is requested on user gesture so alert works even when app is closed
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      } catch {
        // continue with in-app timer
      }
    }

    // 2. Prime Moroccan Adhan audio element silently on user click to unlock mobile autoplay after 2 min
    if (!isAdhanPlaying) {
      try {
        const resolved = await getOfflinePlayableAdhanUrl('moroccan');
        if (!adhanAudioRef.current) {
          adhanAudioRef.current = new Audio(resolved.url);
          adhanAudioRef.current.onended = () => setIsAdhanPlaying(false);
          adhanAudioRef.current.onerror = () => {
            setIsAdhanPlaying(false);
            playGentleAlertChime();
          };
        } else {
          adhanAudioRef.current.src = resolved.url;
        }
        adhanAudioRef.current.muted = true;
        await adhanAudioRef.current.play();
        adhanAudioRef.current.pause();
        adhanAudioRef.current.currentTime = 0;
        adhanAudioRef.current.muted = false;
      } catch {
        if (adhanAudioRef.current) {
          adhanAudioRef.current.muted = false;
        }
      }
    }

    // 3. Schedule both Web Push (server) + Service Worker TimestampTrigger + in-app exact timer for 120s
    const { targetMs, tag } = await scheduleTestAdhanIn2Min({
      cityName: settings.cityName,
      language: settings.language,
      muezzin: 'moroccan',
      delaySeconds: 120,
    });

    testAdhanTagRef.current = tag;
    setTestAdhanTargetMs(targetMs);
    try {
      localStorage.setItem(TEST_ADHAN_STORAGE_KEY, JSON.stringify({ targetMs, tag }));
    } catch {
      // ignore storage failure
    }
  };

  const handleCancelTestAdhan = () => {
    setTestAdhanTargetMs(null);
    testAdhanTagRef.current = '';
    try {
      localStorage.removeItem(TEST_ADHAN_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleDismissNotificationPrompt = () => {
    setNotificationPromptDismissed(true);
    try {
      localStorage.setItem('sakina_notif_prompt_dismissed_v1', '1');
    } catch {
      // ignore
    }
  };

  const latestNotificationMetaRef = useRef({ t, cityName: settings.cityName });
  latestNotificationMetaRef.current = { t, cityName: settings.cityName };

  const triggerTestAdhanRef = useRef<(tag?: string) => void>(() => {});
  triggerTestAdhanRef.current = (tagOverride?: string) => {
    const meta = latestNotificationMetaRef.current;
    const isArabic = settings.language === 'ar' || settings.language === 'ur';
    const bannerText = isArabic
      ? `${meta.t.home.adhanRingingPrefix} (الأذان المغربي) - ${meta.cityName}`
      : `${meta.t.home.adhanRingingPrefix} (Moroccan Adhan) - ${meta.cityName}`;

    setTestAdhanTargetMs(null);
    try {
      localStorage.removeItem(TEST_ADHAN_STORAGE_KEY);
    } catch {
      // ignore
    }

    void playAdhanAudio(bannerText, 'moroccan');
    void showPrayerNotificationViaSw({
      title: meta.t.appName,
      body: bannerText,
      prayerKey: 'test',
      muezzin: 'moroccan',
      cityName: meta.cityName,
      alertType: 'adhan',
      tag: tagOverride || testAdhanTagRef.current || `test-adhan-${Date.now()}`,
    });
  };

  // Exact 2-minute test Adhan timer (works across tab switches & phone wake-ups)
  useEffect(() => {
    if (!testAdhanTargetMs) return;
    const remainingMs = testAdhanTargetMs - Date.now();
    if (remainingMs <= 0) {
      triggerTestAdhanRef.current(testAdhanTagRef.current);
      return;
    }

    const timer = setTimeout(() => {
      triggerTestAdhanRef.current(testAdhanTagRef.current);
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [testAdhanTargetMs]);

  useEffect(() => {
    if (testAdhanTargetMs && now.getTime() >= testAdhanTargetMs) {
      triggerTestAdhanRef.current(testAdhanTagRef.current);
    }
  }, [now, testAdhanTargetMs]);

  // Handle opening app from closed-app notification click (?playAdhan=...) or SW postMessage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const playAdhanParam = params.get('playAdhan') as AdhanPrayerKey | 'test' | null;
    const muezzinParam = (params.get('muezzin') as MuezzinId | null) || undefined;
    if (
      playAdhanParam &&
      (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'test'] as string[]).includes(playAdhanParam)
    ) {
      const meta = latestNotificationMetaRef.current;
      const cityParam = params.get('city') || meta.cityName;
      const bannerText =
        playAdhanParam === 'test'
          ? `${meta.t.home.adhanRingingPrefix} - ${cityParam}`
          : `${meta.t.home.adhanRingingPrefix} ${meta.t.prayers[playAdhanParam] || playAdhanParam} - ${cityParam}`;

      setTestAdhanTargetMs(null);
      try {
        localStorage.removeItem(TEST_ADHAN_STORAGE_KEY);
      } catch {
        // ignore
      }

      void playAdhanAudio(
        bannerText,
        muezzinParam || (playAdhanParam === 'test' ? 'moroccan' : undefined)
      );
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (!('serviceWorker' in navigator)) return;
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PLAY_ADHAN') {
        const meta = latestNotificationMetaRef.current;
        const pKey = (event.data.prayerKey as AdhanPrayerKey | 'test') || 'fajr';
        const mId = (event.data.muezzin as MuezzinId | undefined) || undefined;
        const cName = event.data.cityName || meta.cityName;
        const bannerText =
          pKey === 'test'
            ? `${meta.t.home.adhanRingingPrefix} - ${cName}`
            : `${meta.t.home.adhanRingingPrefix} ${meta.t.prayers[pKey] || pKey} - ${cName}`;

        if (pKey === 'test') {
          setTestAdhanTargetMs(null);
          try {
            localStorage.removeItem(TEST_ADHAN_STORAGE_KEY);
          } catch {
            // ignore
          }
        }

        void playAdhanAudio(bannerText, mId || (pKey === 'test' ? 'moroccan' : undefined));
      }
    };

    navigator.serviceWorker.addEventListener('message', onSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', onSwMessage);
    };
  }, []);

  // Retry autoplay if cold-launched from notification click before user gesture
  useEffect(() => {
    if (!pendingAdhanAutoplay) return;
    const resumeAudio = () => {
      if (adhanAudioRef.current) {
        adhanAudioRef.current
          .play()
          .then(() => {
            setIsAdhanPlaying(true);
            setPendingAdhanAutoplay(false);
          })
          .catch(() => {
            // keep waiting for tap
          });
      }
    };
    window.addEventListener('pointerdown', resumeAudio, { once: true });
    return () => window.removeEventListener('pointerdown', resumeAudio);
  }, [pendingAdhanAutoplay]);

  // Monitor exact prayer time & 10-minute pre-Adhan alert
  useEffect(() => {
    const todayKey = now.toISOString().slice(0, 10);

    for (const item of prayerComputation.schedule) {
      if (item.key === 'sunrise') continue;
      const prayerKey = item.key as AdhanPrayerKey;
      const isEnabled = settings.adhan.enabledPrayers[prayerKey];
      if (!isEnabled) continue;

      const diffSec = Math.round((item.time.getTime() - now.getTime()) / 1000);
      const uniqueKey = `${todayKey}-${prayerKey}`;

      if (
        settings.adhan.preAdhanAlert10Min &&
        diffSec <= 600 &&
        diffSec >= 596 &&
        firedPreAlertRef.current !== uniqueKey
      ) {
        firedPreAlertRef.current = uniqueKey;
        playGentleAlertChime();
        const preText = `${t.home.preAlert10MinPrefix} ${t.prayers[prayerKey]} - ${settings.cityName}`;
        setActiveAlertBanner(preText);
        void showPrayerNotificationViaSw({
          title: t.appName,
          body: preText,
          prayerKey,
          cityName: settings.cityName,
          alertType: 'pre-alert',
          tag: `pre10-${uniqueKey}`,
        });
      }

      if (diffSec <= 0 && diffSec >= -2 && firedAdhanRef.current !== uniqueKey) {
        firedAdhanRef.current = uniqueKey;
        const adhanText = `${t.home.adhanRingingPrefix} ${t.prayers[prayerKey]} - ${settings.cityName}`;
        void playAdhanAudio(adhanText);
        void showPrayerNotificationViaSw({
          title: t.appName,
          body: adhanText,
          prayerKey,
          cityName: settings.cityName,
          alertType: 'adhan',
          tag: `adhan-${uniqueKey}`,
        });
      }
    }
  }, [
    now,
    prayerComputation.schedule,
    settings.adhan,
    settings.cityName,
    t.appName,
    t.home.adhanRingingPrefix,
    t.home.preAlert10MinPrefix,
    t.prayers,
  ]);

  const handleSelectCountry = async (country: CountryItem) => {
    setGpsError(null);
    const suggestedMethod = suggestCalculationMethodForCountry(country.isoCode);
    setLoadingCities(true);
    try {
      const res = await fetch(`/api/locations/cities/${country.isoCode}`);
      const data = await res.json();
      const list: CityItem[] = data.cities || [];
      setCities(list);

      const preferred =
        country.isoCode === 'MA'
          ? list.find((c) => c.name.toLowerCase() === 'casablanca') || list[0]
          : list[0];

      const displayCity = preferred
        ? settings.language === 'ar' && preferred.arabicName
          ? preferred.arabicName
          : preferred.name
        : country.localizedName;

      const lat = preferred ? preferred.latitude : country.latitude;
      const lng = preferred ? preferred.longitude : country.longitude;

      setSettings((prev) => ({
        ...prev,
        countryIso: country.isoCode,
        cityName: displayCity,
        cityLat: lat,
        cityLng: lng,
        calculationMethod: suggestedMethod,
      }));
    } catch {
      setSettings((prev) => ({
        ...prev,
        countryIso: country.isoCode,
        cityName: country.localizedName,
        cityLat: country.latitude,
        cityLng: country.longitude,
        calculationMethod: suggestedMethod,
      }));
    } finally {
      setLoadingCities(false);
    }
  };

  const handleSelectCity = async (city: CityItem) => {
    setGpsError(null);
    const displayCity =
      settings.language === 'ar' && city.arabicName ? city.arabicName : city.name;
    const countryEnglish =
      settings.countryIso === 'MA' ? 'Morocco' : selectedCountry?.name || 'Morocco';

    const nextCityKey = `${displayCity}|${city.latitude.toFixed(2)}|${city.longitude.toFixed(2)}`;

    setSettings((prev) => ({
      ...prev,
      cityName: displayCity,
      cityLat: city.latitude,
      cityLng: city.longitude,
    }));

    const byCityTimings = await fetchAladhanByCity(
      city.name,
      countryEnglish,
      nextCityKey,
      todayDateKey
    );
    if (byCityTimings) {
      setAladhanTimings(byCityTimings);
    }
  };

  const handleSelectLanguage = (language: LanguageCode) => {
    setSettings((prev) => ({ ...prev, language }));
  };

  const handleUpdateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsError(t.home.gpsFailedChooseCity);
      setOpenCityPickerSignal((s) => s + 1);
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          const timestamp = Math.floor(Date.now() / 1000);
          const aladhanUrl = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=5`;

          const [revRes, aladhanRawRes] = await Promise.all([
            fetch(`/api/locations/reverse?lat=${lat}&lng=${lng}&lang=${settings.language}`).catch(
              () => null
            ),
            fetch(aladhanUrl).catch(() => null),
          ]);

          let resolvedCityName = '';
          let resolvedCountryIso = settings.countryIso;

          if (revRes && revRes.ok) {
            const revData = await revRes.json();
            resolvedCityName = revData.cityName || '';
            resolvedCountryIso = revData.countryIso || resolvedCountryIso;
          }

          let parsedAladhan: AladhanTimings | null = null;
          if (aladhanRawRes && aladhanRawRes.ok) {
            const json = (await aladhanRawRes.json()) as {
              data?: {
                timings?: {
                  Fajr: string;
                  Sunrise: string;
                  Dhuhr: string;
                  Asr: string;
                  Maghrib: string;
                  Isha: string;
                };
                meta?: {
                  timezone?: string;
                };
              };
            };
            const timings = json.data?.timings;
            const tzParts = json.data?.meta?.timezone?.split('/');
            const tzCity =
              tzParts && tzParts.length > 1
                ? tzParts[tzParts.length - 1].replace(/_/g, ' ')
                : '';

            if (!resolvedCityName && tzCity) {
              resolvedCityName = tzCity;
            }

            if (timings) {
              const finalName = resolvedCityName || settings.cityName;
              const gpsCityKey = `${finalName}|${lat.toFixed(2)}|${lng.toFixed(2)}`;
              parsedAladhan = {
                dateKey: todayDateKey,
                cityKey: gpsCityKey,
                fajr: timings.Fajr,
                sunrise: timings.Sunrise,
                dhuhr: timings.Dhuhr,
                asr: timings.Asr,
                maghrib: timings.Maghrib,
                isha: timings.Isha,
                timezoneCity: tzCity || undefined,
              };
            }
          }

          const finalCityName =
            resolvedCityName || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;

          if (parsedAladhan) {
            parsedAladhan.cityKey = `${finalCityName}|${lat.toFixed(2)}|${lng.toFixed(2)}`;
            setAladhanTimings(parsedAladhan);
          }

          setSettings((prev) => ({
            ...prev,
            countryIso: resolvedCountryIso,
            cityName: finalCityName,
            cityLat: lat,
            cityLng: lng,
            calculationMethod: suggestCalculationMethodForCountry(resolvedCountryIso),
          }));
        } catch {
          setGpsError(t.home.gpsFailedChooseCity);
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
        setGpsError(t.home.gpsFailedChooseCity);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  return (
    <div className="min-h-dvh islamic-lattice bg-[#F8FAF7] dark:bg-[#061A14] text-[#0A251C] dark:text-[#F2F7F4] pb-24">
      <OfflineIndicator t={t} />

      {/* Active Adhan / 10-Minute Alert Banner */}
      {(activeAlertBanner || isAdhanPlaying) && (
        <div className="sticky top-0 z-40 bg-[#0B4F3A] text-white border-b border-[#C59B38] shadow-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <Bell className="w-4 h-4 text-[#E5C366] shrink-0" />
              <span>{activeAlertBanner || t.home.adhanRingingPrefix}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pendingAdhanAutoplay && !isAdhanPlaying && (
                <button
                  type="button"
                  onClick={() =>
                    void playAdhanAudio(
                      activeAlertBanner || undefined,
                      lastRequestedMuezzinRef.current
                    )
                  }
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1 rounded-lg bg-[#E5C366] text-[#061A14] text-xs font-bold"
                >
                  <span>{t.pwa.tapToPlayAdhan}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  stopAdhanAudio();
                  setActiveAlertBanner(null);
                }}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1 rounded-lg bg-[#C59B38] text-[#061A14] text-xs font-bold"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>{t.home.stopAdhan}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        {activeTab === 'home' && (
          <HomeView
            settings={settings}
            countries={countries}
            cities={cities}
            loadingCountries={loadingCountries}
            loadingCities={loadingCities}
            schedule={prayerComputation.schedule}
            nextPrayerKey={prayerComputation.nextPrayerKey}
            remainingSeconds={prayerComputation.remainingSeconds}
            countdown={prayerComputation.countdown}
            qiblaAngle={prayerComputation.qiblaAngle}
            dates={dates}
            gpsLoading={gpsLoading}
            gpsError={gpsError}
            openCityPickerSignal={openCityPickerSignal}
            isAdhanPlaying={isAdhanPlaying}
            notificationPermission={notificationPermission}
            notificationPromptDismissed={notificationPromptDismissed}
            onRequestNotificationPermission={() => void handleRequestNotificationPermission()}
            onDismissNotificationPrompt={handleDismissNotificationPrompt}
            onToggleTestAdhan={toggleAdhanPreview}
            onSelectCountry={handleSelectCountry}
            onSelectCity={handleSelectCity}
            onSelectLanguage={handleSelectLanguage}
            onDetectGps={handleDetectGps}
            onOpenQibla={() => setActiveTab('qibla')}
            t={t}
          />
        )}

        {activeTab === 'quran' && (
          <QuranView
            language={settings.language}
            fontSize={settings.quranFontSize}
            reciterId={settings.reciterId}
            onChangeReciter={(reciterId) => handleUpdateSettings({ reciterId })}
            onChangeFontSize={(quranFontSize) => handleUpdateSettings({ quranFontSize })}
            t={t}
          />
        )}

        {activeTab === 'adhkar' && <AdhkarView language={settings.language} t={t} />}

        {activeTab === 'ai' && (
          <SakinaAiView
            language={settings.language}
            cityName={settings.cityName}
            countryName={selectedCountry?.localizedName || 'المغرب'}
            aiVoice={settings.aiVoice}
            t={t}
          />
        )}

        {activeTab === 'qibla' && (
          <QiblaView
            qiblaAngle={prayerComputation.qiblaAngle}
            distanceToKaabaKm={prayerComputation.distanceToKaabaKm}
            cityLat={settings.cityLat}
            cityLng={settings.cityLng}
            cityName={settings.cityName}
            countryFlag={selectedCountry?.flag || '🇲🇦'}
            language={settings.language}
            t={t}
          />
        )}

        {activeTab === 'tasbih' && <TasbihView t={t} />}

        {activeTab === 'mosques' && (
          <MosquesView
            cityLat={settings.cityLat}
            cityLng={settings.cityLng}
            cityName={settings.cityName}
            countryFlag={selectedCountry?.flag || '🇲🇦'}
            t={t}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            isAdhanPreviewPlaying={isAdhanPlaying}
            notificationPermission={notificationPermission}
            is30DaysCached={Boolean(calendar30d && calendar30d.days.length >= 25)}
            isAdhanAudioCached={adhanAudioCached}
            testAdhanRemainingSec={
              testAdhanTargetMs !== null
                ? Math.max(0, Math.ceil((testAdhanTargetMs - now.getTime()) / 1000))
                : null
            }
            onRequestNotificationPermission={() => void handleRequestNotificationPermission()}
            onToggleAdhanPreview={toggleAdhanPreview}
            onScheduleTestAdhan2Min={() => void handleScheduleTestAdhan2Min()}
            onCancelTestAdhan={handleCancelTestAdhan}
            onUpdateSettings={handleUpdateSettings}
            onResetDefaults={() => setSettings(DEFAULT_SETTINGS)}
            t={t}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} t={t} />
    </div>
  );
}
