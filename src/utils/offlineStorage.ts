import {
  CalculationMethod,
  Coordinates,
  Madhab,
  PrayerTimes,
} from 'adhan';
import type {
  AdhanPrayerKey,
  AdhanSettings,
  CalculationMethodId,
  LanguageCode,
  MadhabId,
  MuezzinId,
} from '../types';
import { getCalculationParams } from './prayerUtils';

export interface StoredDayTimings {
  dateKey: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  fajrMs: number;
  sunriseMs: number;
  dhuhrMs: number;
  asrMs: number;
  maghribMs: number;
  ishaMs: number;
}

export interface Stored30DayCalendar {
  cityKey: string;
  cityName: string;
  countryIso: string;
  lat: number;
  lng: number;
  fetchedAt: number;
  days: StoredDayTimings[];
}

const CALENDAR_STORAGE_KEY = 'sakina_prayer_30d_v1';
const OFFLINE_DATA_CACHE = 'sakina-offline-data-v1';
const ADHAN_AUDIO_CACHE = 'sakina-adhan-audio-v1';
const CALENDAR_CACHE_URL = '/offline-cache/prayer-calendar-30d.json';

const IDB_NAME = 'sakina-offline-db';
const IDB_STORE = 'state';

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function formatHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function parseAladhanHHMMToEpoch(date: Date, hhmm: string): number {
  const clean = hhmm.trim().slice(0, 5);
  const [hStr, mStr] = clean.split(':');
  const d = new Date(date);
  d.setHours(Number(hStr) || 0, Number(mStr) || 0, 0, 0);
  return d.getTime();
}

export function buildLocal30DayCalendar(
  lat: number,
  lng: number,
  cityName: string,
  countryIso: string,
  cityKey: string,
  method: CalculationMethodId,
  madhab: MadhabId
): Stored30DayCalendar {
  const coords = new Coordinates(lat, lng);
  const params = getCalculationParams(method) || CalculationMethod.MuslimWorldLeague();
  params.madhab = madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;

  const days: StoredDayTimings[] = [];
  const base = new Date();
  base.setHours(12, 0, 0, 0);

  for (let i = 0; i < 31; i++) {
    const dayDate = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
    const pt = new PrayerTimes(coords, dayDate, params);
    days.push({
      dateKey: formatDateKey(dayDate),
      fajr: formatHHMM(pt.fajr),
      sunrise: formatHHMM(pt.sunrise),
      dhuhr: formatHHMM(pt.dhuhr),
      asr: formatHHMM(pt.asr),
      maghrib: formatHHMM(pt.maghrib),
      isha: formatHHMM(pt.isha),
      fajrMs: pt.fajr.getTime(),
      sunriseMs: pt.sunrise.getTime(),
      dhuhrMs: pt.dhuhr.getTime(),
      asrMs: pt.asr.getTime(),
      maghribMs: pt.maghrib.getTime(),
      ishaMs: pt.isha.getTime(),
    });
  }

  return {
    cityKey,
    cityName,
    countryIso,
    lat,
    lng,
    fetchedAt: Date.now(),
    days,
  };
}

export function load30DayCalendarFromStorage(cityKey?: string): Stored30DayCalendar | null {
  try {
    const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored30DayCalendar;
    if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) return null;
    if (cityKey && parsed.cityKey !== cityKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function load30DayCalendarFromCacheApi(
  cityKey?: string
): Promise<Stored30DayCalendar | null> {
  try {
    if (!('caches' in window)) return null;
    const cache = await caches.open(OFFLINE_DATA_CACHE);
    const match = await cache.match(CALENDAR_CACHE_URL);
    if (!match) return null;
    const parsed = (await match.json()) as Stored30DayCalendar;
    if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) return null;
    if (cityKey && parsed.cityKey !== cityKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function save30DayCalendarToAllStores(calendar: Stored30DayCalendar): Promise<void> {
  try {
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(calendar));
  } catch {
    // ignore quota error
  }

  try {
    if ('caches' in window) {
      const cache = await caches.open(OFFLINE_DATA_CACHE);
      await cache.put(
        CALENDAR_CACHE_URL,
        new Response(JSON.stringify(calendar), {
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
  } catch {
    // ignore Cache API error
  }
}

interface AladhanMonthDay {
  timings: {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  };
  date?: {
    gregorian?: {
      date?: string; // DD-MM-YYYY
    };
  };
}

function parseDdMmYyyy(raw: string): Date | null {
  const parts = raw.split('-');
  if (parts.length !== 3) return null;
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export async function fetchAndCache30DayCalendar(params: {
  lat: number;
  lng: number;
  cityName: string;
  countryIso: string;
  countryEnglish?: string;
  cityEnglishName?: string;
  cityKey: string;
  method: CalculationMethodId;
  madhab: MadhabId;
  useCityEndpoint?: boolean;
}): Promise<Stored30DayCalendar> {
  const now = new Date();
  const year1 = now.getFullYear();
  const month1 = now.getMonth() + 1;
  const nextMonthDate = new Date(year1, now.getMonth() + 1, 1);
  const year2 = nextMonthDate.getFullYear();
  const month2 = nextMonthDate.getMonth() + 1;

  const buildUrl = (y: number, m: number) => {
    if (params.useCityEndpoint && params.cityEnglishName && params.countryEnglish) {
      return `https://api.aladhan.com/v1/calendarByCity/${y}/${m}?city=${encodeURIComponent(
        params.cityEnglishName
      )}&country=${encodeURIComponent(params.countryEnglish)}&method=5`;
    }
    return `https://api.aladhan.com/v1/calendar/${y}/${m}?latitude=${params.lat}&longitude=${params.lng}&method=5`;
  };

  try {
    const [r1, r2] = await Promise.all([
      fetch(buildUrl(year1, month1)),
      fetch(buildUrl(year2, month2)),
    ]);

    if (!r1.ok) throw new Error('Aladhan calendar failed');
    const j1 = (await r1.json()) as { data?: AladhanMonthDay[] };
    const j2 = r2.ok ? ((await r2.json()) as { data?: AladhanMonthDay[] }) : { data: [] };

    const combined = [...(j1.data || []), ...(j2.data || [])];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const days: StoredDayTimings[] = [];
    for (const entry of combined) {
      const gDateStr = entry.date?.gregorian?.date;
      if (!gDateStr || !entry.timings) continue;
      const dayDate = parseDdMmYyyy(gDateStr);
      if (!dayDate) continue;
      if (dayDate.getTime() < todayStart.getTime()) continue;

      const fajr = entry.timings.Fajr.trim().slice(0, 5);
      const sunrise = entry.timings.Sunrise.trim().slice(0, 5);
      const dhuhr = entry.timings.Dhuhr.trim().slice(0, 5);
      const asr = entry.timings.Asr.trim().slice(0, 5);
      const maghrib = entry.timings.Maghrib.trim().slice(0, 5);
      const isha = entry.timings.Isha.trim().slice(0, 5);

      days.push({
        dateKey: formatDateKey(dayDate),
        fajr,
        sunrise,
        dhuhr,
        asr,
        maghrib,
        isha,
        fajrMs: parseAladhanHHMMToEpoch(dayDate, fajr),
        sunriseMs: parseAladhanHHMMToEpoch(dayDate, sunrise),
        dhuhrMs: parseAladhanHHMMToEpoch(dayDate, dhuhr),
        asrMs: parseAladhanHHMMToEpoch(dayDate, asr),
        maghribMs: parseAladhanHHMMToEpoch(dayDate, maghrib),
        ishaMs: parseAladhanHHMMToEpoch(dayDate, isha),
      });

      if (days.length >= 30) break;
    }

    if (days.length >= 25) {
      const calendar: Stored30DayCalendar = {
        cityKey: params.cityKey,
        cityName: params.cityName,
        countryIso: params.countryIso,
        lat: params.lat,
        lng: params.lng,
        fetchedAt: Date.now(),
        days,
      };
      await save30DayCalendarToAllStores(calendar);
      return calendar;
    }
  } catch {
    // Offline fallback: compute full 30 days locally using adhan math
  }

  const localCalendar = buildLocal30DayCalendar(
    params.lat,
    params.lng,
    params.cityName,
    params.countryIso,
    params.cityKey,
    params.method,
    params.madhab
  );
  await save30DayCalendarToAllStores(localCalendar);
  return localCalendar;
}

export async function cacheSelectedAdhanAudio(muezzinId: MuezzinId): Promise<boolean> {
  const audioPath = `/api/audio/adhan/${muezzinId}`;
  try {
    if (!('caches' in window)) return false;
    const cache = await caches.open(ADHAN_AUDIO_CACHE);
    const existing = await cache.match(audioPath);
    if (existing) return true;

    const res = await fetch(audioPath);
    if (!res.ok) return false;
    await cache.put(audioPath, res.clone());
    return true;
  } catch {
    return false;
  }
}

export async function isAdhanAudioCached(muezzinId: MuezzinId): Promise<boolean> {
  const audioPath = `/api/audio/adhan/${muezzinId}`;
  try {
    if (!('caches' in window)) return false;
    const cache = await caches.open(ADHAN_AUDIO_CACHE);
    const existing = await cache.match(audioPath);
    return Boolean(existing);
  } catch {
    return false;
  }
}

export async function getOfflinePlayableAdhanUrl(
  muezzinId: MuezzinId
): Promise<{ url: string; revoke?: () => void }> {
  const audioPath = `/api/audio/adhan/${muezzinId}`;
  try {
    if ('caches' in window) {
      const cache = await caches.open(ADHAN_AUDIO_CACHE);
      const match = await cache.match(audioPath);
      if (match) {
        const blob = await match.blob();
        const objectUrl = URL.createObjectURL(blob);
        return {
          url: objectUrl,
          revoke: () => URL.revokeObjectURL(objectUrl),
        };
      }
    }
  } catch {
    // fall through
  }
  return { url: audioPath };
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveNotificationConfigIdb(config: unknown): Promise<void> {
  try {
    const db = await openIdb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(config, 'notificationConfig');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore IDB error
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function syncNotificationsWithSwAndServer(params: {
  calendar: Stored30DayCalendar;
  adhanSettings: AdhanSettings;
  language: LanguageCode;
}): Promise<void> {
  const compactDays = params.calendar.days.map((d) => ({
    dateKey: d.dateKey,
    fajrMs: d.fajrMs,
    dhuhrMs: d.dhuhrMs,
    asrMs: d.asrMs,
    maghribMs: d.maghribMs,
    ishaMs: d.ishaMs,
  }));

  const payload = {
    cityName: params.calendar.cityName,
    language: params.language,
    enabledPrayers: params.adhanSettings.enabledPrayers,
    preAdhanAlert10Min: params.adhanSettings.preAdhanAlert10Min,
    schedule30Days: compactDays,
  };

  await saveNotificationConfigIdb(payload);

  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({
      type: 'SCHEDULE_PRAYERS',
      payload,
    });

    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      'pushManager' in registration &&
      navigator.onLine
    ) {
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const keyRes = await fetch('/api/push/vapid-public-key');
        if (keyRes.ok) {
          const { publicKey } = (await keyRes.json()) as { publicKey: string };
          if (publicKey) {
            const convertedKey = urlBase64ToUint8Array(publicKey);
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedKey.buffer as ArrayBuffer,
            });
          }
        }
      }

      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            cityName: params.calendar.cityName,
            language: params.language,
            enabledPrayers: params.adhanSettings.enabledPrayers,
            preAdhanAlert10Min: params.adhanSettings.preAdhanAlert10Min,
            schedule30Days: compactDays,
          }),
        });
      }
    }
  } catch {
    // Push subscription may be restricted in some preview iframes; local SW notifications remain active
  }
}

export async function showPrayerNotificationViaSw(params: {
  title: string;
  body: string;
  prayerKey: AdhanPrayerKey | 'test';
  muezzin?: MuezzinId;
  cityName: string;
  alertType: 'adhan' | 'pre-alert';
  tag: string;
}): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const muezzinQuery = params.muezzin ? `&muezzin=${encodeURIComponent(params.muezzin)}` : '';
  const targetUrl =
    params.alertType === 'adhan'
      ? `/?playAdhan=${params.prayerKey}${muezzinQuery}&city=${encodeURIComponent(params.cityName)}`
      : '/';

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(params.title, {
        body: params.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: params.tag,
        renotify: true,
        requireInteraction: params.alertType === 'adhan',
        vibrate: [300, 150, 300],
        data: {
          url: targetUrl,
          prayerKey: params.prayerKey,
          muezzin: params.muezzin || '',
          cityName: params.cityName,
          alertType: params.alertType,
        },
      } as NotificationOptions);
      return;
    }
    new Notification(params.title, {
      body: params.body,
      icon: '/pwa-192x192.png',
      tag: params.tag,
    });
  } catch {
    // ignore notification error
  }
}

export async function scheduleTestAdhanIn2Min(params: {
  cityName: string;
  language: LanguageCode;
  muezzin?: MuezzinId;
  delaySeconds?: number;
}): Promise<{ targetMs: number; tag: string; pushScheduled: boolean }> {
  const delaySeconds = params.delaySeconds ?? 120;
  const muezzin: MuezzinId = params.muezzin || 'moroccan';
  const targetMs = Date.now() + delaySeconds * 1000;
  const tag = `test-adhan-${targetMs}`;

  // Ensure Moroccan Adhan MP3 is cached for instant playback
  void cacheSelectedAdhanAudio(muezzin);

  let pushScheduled = false;

  if (!('serviceWorker' in navigator)) {
    return { targetMs, tag, pushScheduled };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({
      type: 'SCHEDULE_TEST_ADHAN',
      payload: {
        targetMs,
        cityName: params.cityName,
        language: params.language,
        muezzin,
        tag,
      },
    });

    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      'pushManager' in registration &&
      navigator.onLine
    ) {
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const keyRes = await fetch('/api/push/vapid-public-key');
        if (keyRes.ok) {
          const { publicKey } = (await keyRes.json()) as { publicKey: string };
          if (publicKey) {
            const convertedKey = urlBase64ToUint8Array(publicKey);
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedKey.buffer as ArrayBuffer,
            });
          }
        }
      }

      if (subscription) {
        const res = await fetch('/api/push/schedule-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            cityName: params.cityName,
            language: params.language,
            delaySeconds,
            muezzin,
            tag,
          }),
        });
        if (res.ok) {
          pushScheduled = true;
        }
      }
    }
  } catch {
    // In-app + SW trigger fallback still runs
  }

  return { targetMs, tag, pushScheduled };
}
