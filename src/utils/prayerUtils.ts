import {
  CalculationMethod,
  Coordinates,
  Madhab,
  PrayerTimes,
  Qibla,
} from 'adhan';
import type {
  CalculationMethodId,
  LanguageCode,
  MadhabId,
  MuezzinId,
  PrayerKey,
  PrayerScheduleItem,
  ReciterId,
} from '../types';
import { resolveCoreLang } from '../i18n/worldLanguages';

export interface ReciterOption {
  id: ReciterId;
  arabicName: string;
  latinName: string;
  buildUrl: (surahNumber: number) => string;
}

export const RECITERS: ReciterOption[] = [
  {
    id: 'alafasy',
    arabicName: 'مشاري راشد العفاسي',
    latinName: 'Mishary Alafasy',
    buildUrl: (n) => `https://server8.mp3quran.net/afs/${String(n).padStart(3, '0')}.mp3`,
  },
  {
    id: 'maher',
    arabicName: 'ماهر المعيقلي',
    latinName: 'Maher Al Muaiqly',
    buildUrl: (n) => `https://server12.mp3quran.net/maher/${String(n).padStart(3, '0')}.mp3`,
  },
  {
    id: 'basit',
    arabicName: 'عبد الباسط عبد الصمد',
    latinName: 'Abdul Basit',
    buildUrl: (n) => `https://server7.mp3quran.net/basit/${String(n).padStart(3, '0')}.mp3`,
  },
  {
    id: 'ghamdi',
    arabicName: 'سعد الغامدي',
    latinName: 'Saad Al Ghamdi',
    buildUrl: (n) => `https://server7.mp3quran.net/s_gmd/${String(n).padStart(3, '0')}.mp3`,
  },
  {
    id: 'dosari',
    arabicName: 'ياسر الدوسري',
    latinName: 'Yasser Al-Dosari',
    buildUrl: (n) => `https://server11.mp3quran.net/yasser/${String(n).padStart(3, '0')}.mp3`,
  },
];

export interface MuezzinOption {
  id: MuezzinId;
  arabicName: string;
  latinName: string;
  audioUrl: string;
}

export const MUEZZINS: MuezzinOption[] = [
  {
    id: 'moroccan',
    arabicName: 'الأذان المغربي',
    latinName: 'Moroccan Adhan',
    audioUrl: 'https://www.islamcan.com/audio/adhan/azan5.mp3',
  },
  {
    id: 'makkah',
    arabicName: 'أذان الحرم المكي',
    latinName: 'Al-Haram (Makkah)',
    audioUrl: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
  },
  {
    id: 'madinah',
    arabicName: 'أذان المسجد النبوي',
    latinName: 'Al-Nabawi (Madinah)',
    audioUrl: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
  },
  {
    id: 'calm',
    arabicName: 'أذان هادئ',
    latinName: 'Calm Adhan',
    audioUrl: 'https://www.islamcan.com/audio/adhan/azan4.mp3',
  },
];

export function normalizeMuezzinId(id: string | undefined): MuezzinId {
  if (id === 'moroccan' || id === 'makkah' || id === 'madinah' || id === 'calm') {
    return id;
  }
  return 'moroccan';
}

export function playGentleAlertChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.16;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.7);
    });
  } catch {
    // ignore Web Audio failure
  }
}

export function getCalculationParams(method: CalculationMethodId) {
  switch (method) {
    case 'Morocco': {
      const params = CalculationMethod.Other();
      params.fajrAngle = 19;
      params.ishaAngle = 17;
      return params;
    }
    case 'MuslimWorldLeague':
      return CalculationMethod.MuslimWorldLeague();
    case 'UmmAlQura':
      return CalculationMethod.UmmAlQura();
    case 'Egyptian':
      return CalculationMethod.Egyptian();
    case 'Karachi':
      return CalculationMethod.Karachi();
    case 'NorthAmerica':
      return CalculationMethod.NorthAmerica();
    case 'Dubai':
      return CalculationMethod.Dubai();
    case 'Kuwait':
      return CalculationMethod.Kuwait();
    case 'Qatar':
      return CalculationMethod.Qatar();
    case 'Turkey':
      return CalculationMethod.Turkey();
    case 'Singapore':
      return CalculationMethod.Singapore();
    default:
      return CalculationMethod.MuslimWorldLeague();
  }
}

export function suggestCalculationMethodForCountry(isoCode: string): CalculationMethodId {
  const code = isoCode.toUpperCase();
  if (code === 'MA') return 'Morocco';
  if (code === 'SA') return 'UmmAlQura';
  if (code === 'EG') return 'Egyptian';
  if (code === 'PK' || code === 'IN' || code === 'BD') return 'Karachi';
  if (code === 'US' || code === 'CA') return 'NorthAmerica';
  if (code === 'AE') return 'Dubai';
  if (code === 'KW') return 'Kuwait';
  if (code === 'QA') return 'Qatar';
  if (code === 'TR') return 'Turkey';
  if (code === 'SG' || code === 'MY' || code === 'ID') return 'Singapore';
  return 'MuslimWorldLeague';
}

export function formatPrayerTime(date: Date, use24Hour: boolean, lang: LanguageCode): string {
  const localeMap: Record<string, string> = {
    ar: 'ar-MA',
    en: 'en-US',
    fr: 'fr-FR',
    tr: 'tr-TR',
    ur: 'ur-PK',
    id: 'id-ID',
    es: 'es-ES',
  };

  const targetLocale = localeMap[lang] || lang || 'en-US';
  try {
    return new Intl.DateTimeFormat(targetLocale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !use24Hour,
    }).format(date);
  } catch {
    return date.toTimeString().slice(0, 5);
  }
}

export function formatHumanCountdown(
  remainingSeconds: number,
  prayerLabel: string,
  lang: LanguageCode
): string {
  const coreLang = resolveCoreLang(lang);
  const totalMinutes = Math.max(0, Math.ceil(remainingSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (coreLang === 'ar') {
    if (remainingSeconds <= 5) return `حان الآن وقت أذان ${prayerLabel}`;
    if (totalMinutes < 1) return `باقي أقل من دقيقة لـ${prayerLabel}`;
    if (hours === 0) return `باقي ${minutes} دقيقة لـ${prayerLabel}`;
    const hourWord = hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتان' : `${hours} ساعات`;
    if (minutes === 0) return `باقي ${hourWord} لـ${prayerLabel}`;
    return `باقي ${hourWord} و ${minutes} دقيقة لـ${prayerLabel}`;
  }

  if (coreLang === 'fr') {
    if (remainingSeconds <= 5) return `C'est l'heure de ${prayerLabel}`;
    if (hours === 0) return `${minutes} min restantes pour ${prayerLabel}`;
    return `${hours}h ${minutes}min restantes pour ${prayerLabel}`;
  }

  if (coreLang === 'tr') {
    if (remainingSeconds <= 5) return `${prayerLabel} vakti girdi`;
    if (hours === 0) return `${prayerLabel} vaktine ${minutes} dakika kaldı`;
    return `${prayerLabel} vaktine ${hours} sa ${minutes} dk kaldı`;
  }

  if (coreLang === 'ur') {
    if (remainingSeconds <= 5) return `${prayerLabel} کی اذان کا وقت ہو گیا ہے`;
    if (hours === 0) return `${prayerLabel} میں ${minutes} منٹ باقی ہیں`;
    return `${prayerLabel} میں ${hours} گھنٹے ${minutes} منٹ باقی ہیں`;
  }

  if (coreLang === 'id') {
    if (remainingSeconds <= 5) return `Waktu adzan ${prayerLabel} telah tiba`;
    if (hours === 0) return `${minutes} menit lagi menuju ${prayerLabel}`;
    return `${hours} jam ${minutes} menit lagi menuju ${prayerLabel}`;
  }

  if (coreLang === 'es') {
    if (remainingSeconds <= 5) return `Es la hora del adhan de ${prayerLabel}`;
    if (hours === 0) return `Faltan ${minutes} min para ${prayerLabel}`;
    return `Faltan ${hours} h ${minutes} min para ${prayerLabel}`;
  }

  if (remainingSeconds <= 5) return `Time for ${prayerLabel} Adhan`;
  if (hours === 0) return `${minutes} min left until ${prayerLabel}`;
  return `${hours}h ${minutes}m left until ${prayerLabel}`;
}

export function computePrayerSchedule(
  lat: number,
  lng: number,
  method: CalculationMethodId,
  madhab: MadhabId,
  use24Hour: boolean,
  lang: LanguageCode,
  now: Date = new Date()
): {
  schedule: PrayerScheduleItem[];
  nextPrayerKey: PrayerKey;
  nextPrayerTime: Date;
  remainingSeconds: number;
  countdown: string;
  qiblaAngle: number;
  distanceToKaabaKm: number;
} {
  const coordinates = new Coordinates(lat, lng);
  const params = getCalculationParams(method);
  params.madhab = madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;

  const todayTimes = new PrayerTimes(coordinates, now, params);

  const orderedKeys: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const rawTimes: Record<PrayerKey, Date> = {
    fajr: todayTimes.fajr,
    sunrise: todayTimes.sunrise,
    dhuhr: todayTimes.dhuhr,
    asr: todayTimes.asr,
    maghrib: todayTimes.maghrib,
    isha: todayTimes.isha,
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
    const tomorrowTimes = new PrayerTimes(coordinates, tomorrow, params);
    nextKey = 'fajr';
    nextTime = tomorrowTimes.fajr;
  }

  const diffMs = Math.max(0, nextTime.getTime() - now.getTime());
  const remainingSeconds = Math.floor(diffMs / 1000);
  const hrs = Math.floor(remainingSeconds / 3600);
  const mins = Math.floor((remainingSeconds % 3600) / 60);
  const secs = remainingSeconds % 60;
  const countdown = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const schedule: PrayerScheduleItem[] = orderedKeys.map((key) => {
    const time = rawTimes[key];
    return {
      key,
      time,
      formattedTime: formatPrayerTime(time, use24Hour, lang),
      isNext: key === nextKey && time.getTime() === nextTime.getTime(),
      isPassed: time.getTime() <= now.getTime(),
    };
  });

  const qiblaAngle = Qibla(coordinates);
  const distanceToKaabaKm = haversineDistanceKm(lat, lng, 21.422487, 39.826206);

  return {
    schedule,
    nextPrayerKey: nextKey,
    nextPrayerTime: nextTime,
    remainingSeconds,
    countdown,
    qiblaAngle,
    distanceToKaabaKm,
  };
}

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function formatDates(date: Date, lang: LanguageCode): { gregorian: string; hijri: string } {
  const localeMap: Record<string, string> = {
    ar: 'ar-SA',
    en: 'en-US',
    fr: 'fr-FR',
    tr: 'tr-TR',
    ur: 'ur-PK',
    id: 'id-ID',
    es: 'es-ES',
  };
  const loc = localeMap[lang] || lang || 'ar-SA';

  let gregorian = '';
  let hijri = '';

  try {
    gregorian = new Intl.DateTimeFormat(loc, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    gregorian = date.toDateString();
  }

  try {
    hijri = new Intl.DateTimeFormat(`${loc}-u-ca-islamic-umalqura`, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    hijri = '';
  }

  return { gregorian, hijri };
}
