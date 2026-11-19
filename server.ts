import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Country, City } from 'country-state-city';
import { createRequire } from 'module';
import type * as WebPushType from 'web-push';
import { WebSocketServer, WebSocket } from 'ws';
import {
  buildAndroidProjectEntries,
  buildZipBuffer,
  MOROCCO_30D_FALLBACK,
} from './src/androidExport.ts';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof WebPushType;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const liveAi = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  apiVersion: 'v1beta',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

type Lang = string;

function normalizeWorldLang(raw: unknown, fallback = 'ar'): string {
  const cleaned = String(raw || '').trim().toLowerCase();
  if (/^[a-z]{2,3}(-[a-z0-9]{2,4})?$/i.test(cleaned)) {
    return cleaned;
  }
  return fallback;
}

const QURAN_EDITIONS: Record<string, string> = {
  ar: 'ar.muyassar',
  en: 'en.sahih',
  fr: 'fr.hamidullah',
  tr: 'tr.diyanet',
  ur: 'ur.jalandhry',
  id: 'id.indonesian',
  es: 'es.cortes',
  ms: 'ms.basmeih',
  de: 'de.bubenheim',
  fa: 'fa.makarem',
  ru: 'ru.kuliev',
  bn: 'bn.bengali',
  hi: 'hi.hindi',
  zh: 'zh.jian',
  ja: 'ja.japanese',
  ko: 'ko.korean',
  it: 'it.piccardo',
  pt: 'pt.elhayek',
  nl: 'nl.keyzer',
  sv: 'sv.bernstrom',
  pl: 'pl.bielawskiego',
  so: 'so.abduh',
  sw: 'sw.barwani',
  uz: 'uz.sodik',
  az: 'az.mammadaliyev',
  bs: 'bs.korkut',
  sq: 'sq.nahi',
  ha: 'ha.gumi',
  th: 'th.thai',
  ta: 'ta.tamil',
  ml: 'ml.abdulhameed',
  ug: 'ug.saleh',
  tg: 'tg.ayati',
  dv: 'dv.divehi',
  cs: 'cs.hrbek',
  ro: 'ro.grigore',
  bg: 'bg.theophanov',
  no: 'no.berg',
  ku: 'ku.asan',
  am: 'am.sadiq',
  sd: 'sd.amroti',
  ps: 'ps.abdulwali',
};

const MOROCCO_MAJOR_CITIES: Array<{
  name: string;
  arabicName: string;
  latitude: number;
  longitude: number;
  stateCode: string;
}> = [
  { name: 'Salé', arabicName: 'سلا', latitude: 34.0531, longitude: -6.7985, stateCode: 'SAL' },
  { name: 'Rabat', arabicName: 'الرباط', latitude: 34.0209, longitude: -6.8416, stateCode: 'RAB' },
  { name: 'Casablanca', arabicName: 'الدار البيضاء', latitude: 33.5731, longitude: -7.5898, stateCode: 'CAS' },
  { name: 'Fès', arabicName: 'فاس', latitude: 34.0181, longitude: -5.0078, stateCode: 'FES' },
  { name: 'Marrakech', arabicName: 'مراكش', latitude: 31.6295, longitude: -7.9811, stateCode: 'MAR' },
  { name: 'Tanger', arabicName: 'طنجة', latitude: 35.7595, longitude: -5.834, stateCode: 'TNG' },
  { name: 'Agadir', arabicName: 'أكادير', latitude: 30.4278, longitude: -9.5981, stateCode: 'AGA' },
  { name: 'Oujda', arabicName: 'وجدة', latitude: 34.6814, longitude: -1.9086, stateCode: 'OUJ' },
  { name: 'Meknès', arabicName: 'مكناس', latitude: 33.8935, longitude: -5.5473, stateCode: 'MEK' },
  { name: 'Kénitra', arabicName: 'القنيطرة', latitude: 34.261, longitude: -6.5802, stateCode: 'KEN' },
  { name: 'Tétouan', arabicName: 'تطوان', latitude: 35.5889, longitude: -5.3626, stateCode: 'TET' },
  { name: 'Safi', arabicName: 'آسفي', latitude: 32.2994, longitude: -9.2372, stateCode: 'SAF' },
  { name: 'Mohammedia', arabicName: 'المحمدية', latitude: 33.6861, longitude: -7.3829, stateCode: 'MOH' },
  { name: 'El Jadida', arabicName: 'الجديدة', latitude: 33.2316, longitude: -8.5007, stateCode: 'JDI' },
  { name: 'Béni Mellal', arabicName: 'بني ملال', latitude: 32.3373, longitude: -6.3498, stateCode: 'BEM' },
  { name: 'Nador', arabicName: 'الناظور', latitude: 35.1681, longitude: -2.9335, stateCode: 'NAD' },
  { name: 'Taza', arabicName: 'تازة', latitude: 34.21, longitude: -4.01, stateCode: 'TAZ' },
  { name: 'Settat', arabicName: 'سطات', latitude: 33.001, longitude: -7.6166, stateCode: 'SET' },
  { name: 'Khouribga', arabicName: 'خريبكة', latitude: 32.8811, longitude: -6.9063, stateCode: 'KHO' },
  { name: 'Essaouira', arabicName: 'الصويرة', latitude: 31.5085, longitude: -9.7595, stateCode: 'ESS' },
  { name: 'Ouarzazate', arabicName: 'ورزازات', latitude: 30.9189, longitude: -6.8934, stateCode: 'OUA' },
  { name: 'Al Hoceima', arabicName: 'الحسيمة', latitude: 35.2517, longitude: -3.9372, stateCode: 'HOC' },
  { name: 'Laâyoune', arabicName: 'العيون', latitude: 27.1536, longitude: -13.2033, stateCode: 'LAA' },
  { name: 'Dakhla', arabicName: 'الداخلة', latitude: 23.6848, longitude: -15.958, stateCode: 'DAK' },
];

const displayNameFormatters = new Map<string, Intl.DisplayNames | null>();

function getLocalizedCountryName(isoCode: string, fallback: string, lang: Lang): string {
  try {
    let formatter = displayNameFormatters.get(lang);
    if (formatter === undefined) {
      try {
        formatter = new Intl.DisplayNames([lang], { type: 'region' });
      } catch {
        formatter = null;
      }
      displayNameFormatters.set(lang, formatter);
    }
    return formatter?.of(isoCode) || fallback;
  } catch {
    return fallback;
  }
}

function resolveAiLanguageLabel(lang: string, darijaMode: boolean): string {
  const base = lang.toLowerCase().split('-')[0];
  if (base === 'ar') {
    return darijaMode
      ? 'natural, warm Moroccan Darija (الدارجة المغربية الأصيلة والمفهومة) — or Modern Standard Arabic if the user speaks in MSA'
      : 'clear Modern Standard Arabic (العربية الفصحى السلسة)';
  }
  try {
    const label = new Intl.DisplayNames(['en'], { type: 'language' }).of(lang);
    if (label && label.toLowerCase() !== lang.toLowerCase()) {
      return label;
    }
  } catch {
    // fallback below
  }
  return lang || 'English';
}

const allCountriesRaw = Country.getAllCountries();
let allCitiesCache: ReturnType<typeof City.getAllCities> | null = null;
function getAllCitiesLazy() {
  if (!allCitiesCache) {
    allCitiesCache = City.getAllCities();
  }
  return allCitiesCache;
}
const citiesCache = new Map<
  string,
  Array<{ name: string; arabicName?: string; latitude: number; longitude: number; stateCode: string }>
>();
const surahListCache: { data: unknown[] | null; fetchedAt: number } = { data: null, fetchedAt: 0 };
const surahDetailCache = new Map<string, { data: unknown; fetchedAt: number }>();

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  return R * c;
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

const ADHAN_UPSTREAM_URLS: Record<string, string> = {
  moroccan: 'https://www.islamcan.com/audio/adhan/azan5.mp3',
  makkah: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
  madinah: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
  calm: 'https://www.islamcan.com/audio/adhan/azan4.mp3',
  aqsa: 'https://www.islamcan.com/audio/adhan/azan3.mp3',
};
const adhanAudioBufferCache = new Map<string, { buffer: Buffer; contentType: string }>();

interface StoredPushDay {
  dateKey: string;
  fajrMs: number;
  dhuhrMs: number;
  asrMs: number;
  maghribMs: number;
  ishaMs: number;
}

interface StoredPushRecord {
  endpoint: string;
  subscription: WebPushType.PushSubscription;
  cityName: string;
  language: string;
  enabledPrayers: Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', boolean>;
  preAdhanAlert10Min: boolean;
  schedule30Days: StoredPushDay[];
  firedKeys: string[];
  updatedAt: number;
}

const VAPID_FILE = path.resolve(__dirname, '.sakina-vapid.json');
const SUBS_FILE = path.resolve(__dirname, '.sakina-push-subs.json');

function initVapidKeys(): { publicKey: string; privateKey: string } {
  try {
    if (fs.existsSync(VAPID_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8')) as {
        publicKey?: string;
        privateKey?: string;
      };
      if (parsed.publicKey && parsed.privateKey) {
        return { publicKey: parsed.publicKey, privateKey: parsed.privateKey };
      }
    }
  } catch {
    // ignore read error
  }

  const keys = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2));
  } catch {
    // ignore write error on read-only FS
  }
  return keys;
}

const vapidKeys = initVapidKeys();
webpush.setVapidDetails(
  'mailto:sakina.app.ma@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const pushSubscriptions = new Map<string, StoredPushRecord>();

try {
  if (fs.existsSync(SUBS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf-8')) as StoredPushRecord[];
    if (Array.isArray(raw)) {
      for (const rec of raw) {
        if (rec && rec.endpoint && rec.subscription) {
          pushSubscriptions.set(rec.endpoint, rec);
        }
      }
    }
  }
} catch {
  // ignore malformed push store
}

function persistPushSubscriptions() {
  try {
    fs.writeFileSync(SUBS_FILE, JSON.stringify(Array.from(pushSubscriptions.values())));
  } catch {
    // ignore disk failure
  }
}

const PRAYER_NAMES_AR: Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

const PRAYER_NAMES_EN: Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

async function dispatchDuePrayerPushes() {
  if (pushSubscriptions.size === 0) return;
  const nowMs = Date.now();
  const prayerKeys: Array<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'> = [
    'fajr',
    'dhuhr',
    'asr',
    'maghrib',
    'isha',
  ];
  let dirty = false;

  for (const [endpoint, record] of pushSubscriptions.entries()) {
    for (const day of record.schedule30Days || []) {
      for (const pKey of prayerKeys) {
        if (!record.enabledPrayers?.[pKey]) continue;
        const targetMs = day[`${pKey}Ms`];
        if (!Number.isFinite(targetMs) || targetMs <= 0) continue;

        // 1) Exact prayer time window (within [-20s, +45s])
        const adhanTag = `adhan-${day.dateKey}-${pKey}`;
        const diffMs = nowMs - targetMs;
        if (diffMs >= -15000 && diffMs <= 55000 && !record.firedKeys.includes(adhanTag)) {
          record.firedKeys.push(adhanTag);
          if (record.firedKeys.length > 200) record.firedKeys = record.firedKeys.slice(-120);
          dirty = true;

          const isArabic = record.language === 'ar' || record.language === 'ur';
          const pName = isArabic ? PRAYER_NAMES_AR[pKey] : PRAYER_NAMES_EN[pKey];
          const body = isArabic
            ? `حان الآن وقت صلاة ${pName} - ${record.cityName}`
            : `Time for ${pName} prayer - ${record.cityName}`;

          const payload = JSON.stringify({
            title: 'السكينة AI',
            body,
            prayerKey: pKey,
            cityName: record.cityName,
            alertType: 'adhan',
            url: `/?playAdhan=${pKey}`,
            tag: adhanTag,
          });

          webpush.sendNotification(record.subscription, payload).catch((err) => {
            if (err && (err.statusCode === 404 || err.statusCode === 410)) {
              pushSubscriptions.delete(endpoint);
              persistPushSubscriptions();
            }
          });
        }

        // 2) Optional 10-minute pre-Adhan alert
        if (record.preAdhanAlert10Min) {
          const preTargetMs = targetMs - 10 * 60 * 1000;
          const preTag = `pre10-${day.dateKey}-${pKey}`;
          const preDiff = nowMs - preTargetMs;
          if (preDiff >= -15000 && preDiff <= 55000 && !record.firedKeys.includes(preTag)) {
            record.firedKeys.push(preTag);
            if (record.firedKeys.length > 200) record.firedKeys = record.firedKeys.slice(-120);
            dirty = true;

            const isArabic = record.language === 'ar' || record.language === 'ur';
            const pName = isArabic ? PRAYER_NAMES_AR[pKey] : PRAYER_NAMES_EN[pKey];
            const body = isArabic
              ? `باقي 10 دقائق على صلاة ${pName} - ${record.cityName}`
              : `10 minutes left until ${pName} - ${record.cityName}`;

            const payload = JSON.stringify({
              title: 'السكينة AI',
              body,
              prayerKey: pKey,
              cityName: record.cityName,
              alertType: 'pre-alert',
              url: '/',
              tag: preTag,
            });

            webpush.sendNotification(record.subscription, payload).catch((err) => {
              if (err && (err.statusCode === 404 || err.statusCode === 410)) {
                pushSubscriptions.delete(endpoint);
                persistPushSubscriptions();
              }
            });
          }
        }
      }
    }
  }

  if (dirty) {
    persistPushSubscriptions();
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // 1. All world countries with flags and localized names
  app.get('/api/locations/countries', (req, res) => {
    const lang = normalizeWorldLang(req.query.lang, 'ar');

    const countries = allCountriesRaw
      .map((c) => ({
        isoCode: c.isoCode,
        name: c.name,
        localizedName: getLocalizedCountryName(c.isoCode, c.name, lang),
        flag: c.flag,
        latitude: Number(c.latitude) || 0,
        longitude: Number(c.longitude) || 0,
      }))
      .sort((a, b) => {
        try {
          return a.localizedName.localeCompare(b.localizedName, lang);
        } catch {
          return a.localizedName.localeCompare(b.localizedName);
        }
      });

    res.json({ countries });
  });

  // 2. Cities for a specific country ISO code (with major Moroccan cities prioritized for MA)
  app.get('/api/locations/cities/:isoCode', (req, res) => {
    const isoCode = String(req.params.isoCode || '').toUpperCase();
    const country = allCountriesRaw.find((c) => c.isoCode === isoCode);
    if (!country) {
      res.status(404).json({ error: 'Country not found' });
      return;
    }

    let cities = citiesCache.get(isoCode);
    if (!cities) {
      const rawCities = City.getCitiesOfCountry(isoCode) || [];
      const seen = new Set<string>();
      cities = [];

      if (isoCode === 'MA') {
        for (const mc of MOROCCO_MAJOR_CITIES) {
          seen.add(mc.name.toLowerCase());
          seen.add(mc.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
          cities.push(mc);
        }
      }

      const otherCities: typeof cities = [];
      for (const city of rawCities) {
        const lat = Number(city.latitude);
        const lng = Number(city.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const normalized = city.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        otherCities.push({
          name: city.name,
          latitude: lat,
          longitude: lng,
          stateCode: city.stateCode || '',
        });
      }

      otherCities.sort((a, b) => a.name.localeCompare(b.name));
      cities = [...cities, ...otherCities];

      if (cities.length === 0) {
        cities = [
          {
            name: country.name,
            latitude: Number(country.latitude) || 0,
            longitude: Number(country.longitude) || 0,
            stateCode: '',
          },
        ];
      }
      citiesCache.set(isoCode, cities);
    }

    res.json({ cities });
  });

  // 2b. Reverse geocode coordinates -> exact city and country
  app.get('/api/locations/reverse', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const lang = normalizeWorldLang(req.query.lang, 'ar');

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: 'Valid lat and lng are required' });
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&accept-language=${lang}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'SakinaAI/1.0 (https://sakina.app)' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = (await response.json()) as {
          address?: {
            city?: string;
            town?: string;
            village?: string;
            municipality?: string;
            state?: string;
            country_code?: string;
            country?: string;
          };
        };
        const addr = data.address || {};
        const isoCode = (addr.country_code || '').toUpperCase();
        const cityName =
          addr.city || addr.town || addr.village || addr.municipality || addr.state || '';
        const matchedCountry = allCountriesRaw.find((c) => c.isoCode === isoCode);

        if (matchedCountry && cityName) {
          res.json({
            countryIso: matchedCountry.isoCode,
            countryName: getLocalizedCountryName(matchedCountry.isoCode, matchedCountry.name, lang),
            countryFlag: matchedCountry.flag,
            cityName,
            latitude: lat,
            longitude: lng,
          });
          return;
        }
      }
    } catch {
      // Fall through to offline nearest-city search across all world cities
    }

    // Offline fallback: find nearest city across all cities in dataset
    const allCitiesRaw = getAllCitiesLazy();
    let bestCity = allCitiesRaw[0];
    let minDist = Infinity;
    for (const c of allCitiesRaw) {
      const cLat = Number(c.latitude);
      const cLng = Number(c.longitude);
      if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) continue;
      // Quick bounding box filter to make scan instant
      if (Math.abs(cLat - lat) > 4 || Math.abs(cLng - lng) > 4) continue;
      const d = haversineKm(lat, lng, cLat, cLng);
      if (d < minDist) {
        minDist = d;
        bestCity = c;
      }
    }

    if (bestCity && minDist < Infinity) {
      const matchedCountry = allCountriesRaw.find((c) => c.isoCode === bestCity.countryCode);
      const arabicMa =
        bestCity.countryCode === 'MA'
          ? MOROCCO_MAJOR_CITIES.find(
              (m) => m.name.toLowerCase() === bestCity.name.toLowerCase()
            )?.arabicName
          : undefined;
      res.json({
        countryIso: bestCity.countryCode,
        countryName: matchedCountry
          ? getLocalizedCountryName(matchedCountry.isoCode, matchedCountry.name, lang)
          : bestCity.countryCode,
        countryFlag: matchedCountry?.flag || '🌍',
        cityName: lang === 'ar' && arabicMa ? arabicMa : bestCity.name,
        latitude: lat,
        longitude: lng,
      });
      return;
    }

    res.status(404).json({ error: 'Unable to resolve city from coordinates' });
  });

  // 3. Quran Surah list
  app.get('/api/quran/surahs', async (_req, res) => {
    try {
      const now = Date.now();
      if (surahListCache.data && now - surahListCache.fetchedAt < 1000 * 60 * 60 * 12) {
        res.json({ surahs: surahListCache.data });
        return;
      }
      const response = await fetch('https://api.alquran.cloud/v1/surah');
      if (!response.ok) {
        throw new Error(`Quran API responded with ${response.status}`);
      }
      const json = (await response.json()) as { data?: unknown[] };
      if (!Array.isArray(json.data)) {
        throw new Error('Unexpected Quran API response shape');
      }
      surahListCache.data = json.data;
      surahListCache.fetchedAt = now;
      res.json({ surahs: json.data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load surah list';
      res.status(502).json({ error: message });
    }
  });

  // 4. Quran Surah detail with Uthmani Arabic + localized translation/tafsir
  app.get('/api/quran/surah/:number', async (req, res) => {
    const num = Number(req.params.number);
    if (!Number.isInteger(num) || num < 1 || num > 114) {
      res.status(400).json({ error: 'Surah number must be between 1 and 114' });
      return;
    }

    const lang = normalizeWorldLang(req.query.lang, 'ar');
    const edition = QURAN_EDITIONS[lang] || QURAN_EDITIONS[lang.split('-')[0]] || 'en.sahih';
    const cacheKey = `${num}:${edition}`;

    const cached = surahDetailCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < 1000 * 60 * 60 * 12) {
      res.json(cached.data);
      return;
    }

    try {
      const url = `https://api.alquran.cloud/v1/surah/${num}/editions/quran-uthmani,${edition}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Quran API responded with ${response.status}`);
      }
      const json = (await response.json()) as {
        data?: Array<{
          number: number;
          name: string;
          englishName: string;
          englishNameTranslation: string;
          revelationType: string;
          numberOfAyahs: number;
          edition: { identifier: string; name: string; language: string };
          ayahs: Array<{
            number: number;
            text: string;
            numberInSurah: number;
            juz: number;
            page: number;
          }>;
        }>;
      };

      if (!Array.isArray(json.data) || json.data.length < 2) {
        throw new Error('Incomplete surah edition data');
      }

      const arabicEdition = json.data[0];
      const translatedEdition = json.data[1];
      const pad3 = String(num).padStart(3, '0');

      const payload = {
        number: arabicEdition.number,
        name: arabicEdition.name,
        englishName: arabicEdition.englishName,
        englishNameTranslation: arabicEdition.englishNameTranslation,
        revelationType: arabicEdition.revelationType,
        numberOfAyahs: arabicEdition.numberOfAyahs,
        editionName: translatedEdition.edition?.name || edition,
        audioUrl: `https://server8.mp3quran.net/afs/${pad3}.mp3`,
        ayahs: arabicEdition.ayahs.map((ayah, idx) => ({
          number: ayah.number,
          numberInSurah: ayah.numberInSurah,
          juz: ayah.juz,
          page: ayah.page,
          arabicText: ayah.text,
          translatedText: translatedEdition.ayahs[idx]?.text || '',
        })),
      };

      surahDetailCache.set(cacheKey, { data: payload, fetchedAt: Date.now() });
      res.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load surah';
      res.status(502).json({ error: message });
    }
  });

  // 5. Nearest mosques via OpenStreetMap Overpass API
  app.get('/api/mosques', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Math.min(Math.max(Number(req.query.radius) || 6000, 1000), 25000);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
      return;
    }

    const query = `
[out:json][timeout:8];
(
  node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
  way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
  relation["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
);
out center 40;
`;

    interface OverpassElement {
      id: number;
      type: string;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }

    interface OverpassResponse {
      elements?: OverpassElement[];
    }

    interface NominatimPlace {
      place_id: number;
      osm_type?: string;
      osm_id?: number;
      lat: string;
      lon: string;
      category?: string;
      type?: string;
      name?: string;
      display_name?: string;
    }

    const overpassEndpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.private.coffee/api/interpreter',
    ];

    try {
      let elements: OverpassElement[] = [];
      let succeeded = false;
      let lastError: Error | null = null;

      for (const endpoint of overpassEndpoints) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              Accept: 'application/json',
              'User-Agent': 'SakinaAI/1.0 (https://sakina.app)',
            },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (!response.ok) {
            throw new Error(`Overpass API returned ${response.status}`);
          }
          const json = (await response.json()) as OverpassResponse;
          elements = Array.isArray(json.elements) ? json.elements : [];
          succeeded = true;
          break;
        } catch (err) {
          clearTimeout(timeout);
          lastError = err instanceof Error ? err : new Error('Overpass request failed');
        }
      }

      const mosquesMap = new Map<
        string,
        {
          id: string;
          name: string;
          lat: number;
          lng: number;
          distanceKm: number;
          bearing: number;
          address: string;
        }
      >();

      if (succeeded && elements.length > 0) {
        for (const el of elements) {
          const elLat = el.lat ?? el.center?.lat;
          const elLng = el.lon ?? el.center?.lon;
          if (typeof elLat !== 'number' || typeof elLng !== 'number') continue;

          const tags = el.tags || {};
          const name = tags['name:ar'] || tags.name || tags['name:en'] || tags['name:fr'] || '';
          const street = tags['addr:street'] || '';
          const city = tags['addr:city'] || tags['addr:suburb'] || '';
          const address = [street, city].filter(Boolean).join(', ');
          const distanceKm = haversineKm(lat, lng, elLat, elLng);
          const bearing = calculateBearing(lat, lng, elLat, elLng);
          const id = `${el.type}-${el.id}`;

          mosquesMap.set(id, {
            id,
            name,
            lat: elLat,
            lng: elLng,
            distanceKm,
            bearing,
            address,
          });
        }
      }

      // If Overpass timed out/failed or returned empty, fall back to OpenStreetMap Nominatim mosque search
      if (!succeeded || mosquesMap.size === 0) {
        const radiusKm = radius / 1000;
        const latDelta = radiusKm / 111;
        const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
        const lngDelta = radiusKm / (111 * cosLat);
        const viewbox = `${(lng - lngDelta).toFixed(5)},${(lat + latDelta).toFixed(5)},${(
          lng + lngDelta
        ).toFixed(5)},${(lat - latDelta).toFixed(5)}`;

        const nominatimQueries = ['مسجد', 'mosque', 'mosquée'];
        const nomResults = await Promise.all(
          nominatimQueries.map(async (q) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            try {
              const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                q
              )}&format=jsonv2&limit=25&bounded=1&viewbox=${viewbox}`;
              const r = await fetch(url, {
                headers: {
                  Accept: 'application/json',
                  'User-Agent': 'SakinaAI/1.0 (https://sakina.app)',
                },
                signal: controller.signal,
              });
              clearTimeout(timer);
              if (!r.ok) return [] as NominatimPlace[];
              return (await r.json()) as NominatimPlace[];
            } catch {
              clearTimeout(timer);
              return [] as NominatimPlace[];
            }
          })
        );

        let nominatimOk = false;
        for (const list of nomResults) {
          if (list.length > 0) nominatimOk = true;
          for (const place of list) {
            const isWorship =
              place.category === 'amenity' ||
              place.type === 'place_of_worship' ||
              place.type === 'mosque';
            if (!isWorship) continue;

            const pLat = Number(place.lat);
            const pLng = Number(place.lon);
            if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) continue;

            const rawName = place.name || '';
            const fullText = `${rawName} ${place.display_name || ''}`;
            if (
              /église|church|cathedral|synagogue|temple|chapel|كنيسة|معبد|كاتدرائية/i.test(
                fullText
              )
            ) {
              continue;
            }

            const distanceKm = haversineKm(lat, lng, pLat, pLng);
            if (distanceKm > radiusKm) continue;

            const id = `${place.osm_type || 'osm'}-${place.osm_id || place.place_id}`;
            if (mosquesMap.has(id)) continue;

            const displayParts = (place.display_name || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            const address = displayParts.slice(1, 3).join(', ');

            mosquesMap.set(id, {
              id,
              name: rawName,
              lat: pLat,
              lng: pLng,
              distanceKm,
              bearing: calculateBearing(lat, lng, pLat, pLng),
              address,
            });
          }
        }

        if (!succeeded && !nominatimOk) {
          throw lastError || new Error('All Overpass endpoints failed');
        }
      }

      const mosques = Array.from(mosquesMap.values())
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 30);

      res.json({ mosques, center: { lat, lng }, radius });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to search nearby mosques';
      res.status(502).json({ error: message });
    }
  });

  // 6. Open-ended Sakina AI companion endpoint (supports Moroccan Darija & all languages)
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const {
        messages,
        lang = 'ar',
        darijaMode = true,
        cityName = '',
        countryName = '',
      } = req.body as {
        messages?: Array<{ role: 'user' | 'assistant'; text: string }>;
        lang?: Lang;
        darijaMode?: boolean;
        cityName?: string;
        countryName?: string;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Messages array is required' });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in environment secrets.',
        });
        return;
      }

      const targetLanguage = resolveAiLanguageLabel(normalizeWorldLang(lang, 'ar'), darijaMode);
      const locationContext =
        cityName && countryName ? `The user is currently located in ${cityName}, ${countryName}.` : '';

      const systemInstruction = `You are "السكينة AI" (Sakina AI), an intelligent, warm, open-minded, and deeply helpful assistant and spiritual companion.
You can answer ANY question the user asks freely and thoroughly—whether about daily life, technology, study, work, health tips, relationships, cooking, history, advice, emotional calm, Quran, Hadith, or Islamic guidance. Never refuse general everyday questions; be genuinely helpful on every topic while keeping a respectful, serene tone.
Language instruction: Respond in ${targetLanguage}. If the user writes or speaks in Moroccan Darija (الدارجة المغربية), always respond naturally in Moroccan Darija using clear Arabic script (with gentle warmth like خويا/أختي where fitting). If the user asks in another language (French, English, etc.), respond in that language.
${locationContext}
Keep your answers clear, practical, conversational, and easy to listen to when read aloud by voice synthesis (avoid cluttered markdown symbols like asterisks or complex tables).`;

      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.text || '') }],
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
        },
      });

      const reply = response.text?.trim();
      if (!reply) {
        throw new Error('Empty response from Gemini model');
      }

      res.json({ reply });
    } catch (error) {
      console.error('Sakina AI error:', error);
      const message = error instanceof Error ? error.message : 'AI service error';
      res.status(500).json({ error: message });
    }
  });

  // 7. Same-origin cacheable Adhan MP3 proxy (enables offline Cache API storage)
  app.get('/api/audio/adhan/:id', async (req, res) => {
    const rawId = String(req.params.id || 'moroccan').toLowerCase();
    const id = ADHAN_UPSTREAM_URLS[rawId] ? rawId : 'moroccan';
    const upstreamUrl = ADHAN_UPSTREAM_URLS[id];

    const cached = adhanAudioBufferCache.get(id);
    if (cached) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(cached.buffer);
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const upstream = await fetch(upstreamUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!upstream.ok) {
        throw new Error(`Audio upstream returned ${upstream.status}`);
      }
      const arrayBuf = await upstream.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
      adhanAudioBufferCache.set(id, { buffer, contentType });

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to fetch Adhan audio';
      res.status(502).json({ error: message });
    }
  });

  // 8. Web Push VAPID public key & subscription management for closed-app notifications
  app.get('/api/push/vapid-public-key', (_req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post('/api/push/subscribe', (req, res) => {
    const body = req.body as {
      subscription?: WebPushType.PushSubscription;
      cityName?: string;
      language?: string;
      enabledPrayers?: Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', boolean>;
      preAdhanAlert10Min?: boolean;
      schedule30Days?: StoredPushDay[];
    };

    if (!body?.subscription?.endpoint) {
      res.status(400).json({ error: 'Valid push subscription is required' });
      return;
    }

    const existing = pushSubscriptions.get(body.subscription.endpoint);
    pushSubscriptions.set(body.subscription.endpoint, {
      endpoint: body.subscription.endpoint,
      subscription: body.subscription,
      cityName: body.cityName || 'المغرب',
      language: body.language || 'ar',
      enabledPrayers: body.enabledPrayers || {
        fajr: true,
        dhuhr: true,
        asr: true,
        maghrib: true,
        isha: true,
      },
      preAdhanAlert10Min: Boolean(body.preAdhanAlert10Min),
      schedule30Days: Array.isArray(body.schedule30Days) ? body.schedule30Days.slice(0, 35) : [],
      firedKeys: existing?.firedKeys || [],
      updatedAt: Date.now(),
    });
    persistPushSubscriptions();
    res.json({ ok: true });
  });

  app.post('/api/push/unsubscribe', (req, res) => {
    const endpoint = String((req.body as { endpoint?: string })?.endpoint || '');
    if (endpoint && pushSubscriptions.delete(endpoint)) {
      persistPushSubscriptions();
    }
    res.json({ ok: true });
  });

  app.post('/api/push/schedule-test', (req, res) => {
    const body = req.body as {
      subscription?: WebPushType.PushSubscription;
      cityName?: string;
      language?: string;
      delaySeconds?: number;
      muezzin?: string;
      tag?: string;
    };

    if (!body?.subscription?.endpoint) {
      res.status(400).json({ error: 'Valid push subscription is required' });
      return;
    }

    const delaySeconds = Math.min(Math.max(Number(body.delaySeconds) || 120, 5), 600);
    const cityName = body.cityName || 'المغرب';
    const lang = body.language || 'ar';
    const muezzin = body.muezzin || 'moroccan';
    const tag = body.tag || `test-adhan-${Date.now()}`;
    const targetMs = Date.now() + delaySeconds * 1000;
    const isArabic = lang === 'ar' || lang === 'ur';

    const notificationBody = isArabic
      ? `حان الآن وقت أذان (الأذان المغربي) - ${cityName}`
      : `Time for Adhan (Moroccan Adhan) - ${cityName}`;

    const subscription = body.subscription;

    setTimeout(() => {
      const payload = JSON.stringify({
        title: 'السكينة AI',
        body: notificationBody,
        prayerKey: 'test',
        muezzin,
        cityName,
        alertType: 'adhan',
        url: `/?playAdhan=test&muezzin=${encodeURIComponent(muezzin)}&city=${encodeURIComponent(cityName)}`,
        tag,
      });

      webpush.sendNotification(subscription, payload).catch((err) => {
        if (err && (err.statusCode === 404 || err.statusCode === 410)) {
          pushSubscriptions.delete(subscription.endpoint);
          persistPushSubscriptions();
        }
      });
    }, delaySeconds * 1000);

    res.json({ ok: true, targetMs, tag });
  });

  // 9. One-click ready-to-open Android Studio project ZIP (code + Moroccan Adhan MP3 + 30-day Morocco schedule)
  app.get('/api/android-studio-bundle.zip', async (req, res) => {
    try {
      // 1) Fetch or reuse cached Moroccan Adhan MP3
      let adhanMp3 = adhanAudioBufferCache.get('moroccan')?.buffer;
      if (!adhanMp3) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
          const upstream = await fetch(ADHAN_UPSTREAM_URLS.moroccan, { signal: controller.signal });
          clearTimeout(timer);
          if (upstream.ok) {
            adhanMp3 = Buffer.from(await upstream.arrayBuffer());
            adhanAudioBufferCache.set('moroccan', {
              buffer: adhanMp3,
              contentType: upstream.headers.get('content-type') || 'audio/mpeg',
            });
          }
        } catch {
          clearTimeout(timer);
        }
      }

      // 2) Fetch live 30-day Morocco prayer times (method=5) or use verified fallback
      let schedule30Days = MOROCCO_30D_FALLBACK;
      try {
        const now = new Date();
        const y1 = now.getFullYear();
        const m1 = now.getMonth() + 1;
        const nextMonth = new Date(y1, now.getMonth() + 1, 1);
        const y2 = nextMonth.getFullYear();
        const m2 = nextMonth.getMonth() + 1;

        const [r1, r2] = await Promise.all([
          fetch(`https://api.aladhan.com/v1/calendar/${y1}/${m1}?latitude=34.0531&longitude=-6.7985&method=5`),
          fetch(`https://api.aladhan.com/v1/calendar/${y2}/${m2}?latitude=34.0531&longitude=-6.7985&method=5`),
        ]);
        if (r1.ok) {
          const j1 = (await r1.json()) as {
            data?: Array<{
              date?: { gregorian?: { date?: string } };
              timings?: Record<string, string>;
            }>;
          };
          const j2 = r2.ok
            ? ((await r2.json()) as {
                data?: Array<{
                  date?: { gregorian?: { date?: string } };
                  timings?: Record<string, string>;
                }>;
              })
            : { data: [] };
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const combined = [...(j1.data || []), ...(j2.data || [])]
            .filter((d) => {
              const g = d.date?.gregorian?.date;
              if (!g || !d.timings) return false;
              const [dd, mm, yyyy] = g.split('-').map(Number);
              return new Date(yyyy, mm - 1, dd).getTime() >= todayStart;
            })
            .slice(0, 30)
            .map((d) => ({
              date: d.date!.gregorian!.date!,
              fajr: (d.timings!.Fajr || '').slice(0, 5),
              sunrise: (d.timings!.Sunrise || '').slice(0, 5),
              dhuhr: (d.timings!.Dhuhr || '').slice(0, 5),
              asr: (d.timings!.Asr || '').slice(0, 5),
              maghrib: (d.timings!.Maghrib || '').slice(0, 5),
              isha: (d.timings!.Isha || '').slice(0, 5),
            }));
          if (combined.length >= 25) {
            schedule30Days = combined;
          }
        }
      } catch {
        // Use fallback 30-day Morocco schedule
      }

      const forwardedProto = req.headers['x-forwarded-proto'];
      const proto = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0] : req.protocol;
      const host = req.get('host');
      const appUrl =
        process.env.APP_URL ||
        (host ? `${proto}://${host}` : 'https://ais-pre-nzhw6r4ermqfmtsbfpznhz-1013124889516.europe-west2.run.app');

      const entries = buildAndroidProjectEntries({
        appUrl,
        prayerTimesJson: JSON.stringify(schedule30Days, null, 2),
        adhanMp3: adhanMp3 || Buffer.alloc(0),
      });
      const zipBuf = buildZipBuffer(entries);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="SakinaAI-AndroidStudio.zip"');
      res.setHeader('Content-Length', String(zipBuf.length));
      res.send(zipBuf);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to generate Android Studio bundle';
      res.status(500).json({ error: msg });
    }
  });

  setInterval(() => {
    dispatchDuePrayerPushes().catch(() => {
      // ignore scheduler cycle errors
    });
  }, 20000);

  if (process.env.NODE_ENV !== 'production') {
    let viteMiddleware: express.RequestHandler | null = null;
    const viteReadyPromise = import('vite')
      .then(({ createServer: createViteServer }) =>
        createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        })
      )
      .then((vite) => {
        viteMiddleware = vite.middlewares;
      });

    app.use(async (req, res, next) => {
      try {
        await viteReadyPromise;
        if (viteMiddleware) {
          viteMiddleware(req, res, next);
          return;
        }
      } catch (err) {
        next(err);
        return;
      }
      next();
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);

  // 10. Real-time Gemini Live API (/live) voice-to-voice WebSocket bridge
  const liveWss = new WebSocketServer({ server: httpServer, path: '/live' });

  liveWss.on('connection', (clientWs, req) => {
    const reqUrl = new URL(req.url || '/live', `http://${req.headers.host || 'localhost'}`);
    const lang = normalizeWorldLang(reqUrl.searchParams.get('lang'), 'ar');
    const darijaMode = reqUrl.searchParams.get('darija') !== '0';
    const voiceChoice = reqUrl.searchParams.get('voice') === 'man' ? 'man' : 'woman';
    const prebuiltVoiceName = voiceChoice === 'man' ? 'Charon' : 'Zephyr';
    const cityName = reqUrl.searchParams.get('city') || '';
    const countryName = reqUrl.searchParams.get('country') || '';

    if (!process.env.GEMINI_API_KEY) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'error', message: 'GEMINI_API_KEY is not configured.' }));
        clientWs.close();
      }
      return;
    }

    const targetLanguage = resolveAiLanguageLabel(lang, darijaMode);
    const locationContext =
      cityName && countryName ? `The user is currently located in ${cityName}, ${countryName}.` : '';

    const systemInstruction = `You are "السكينة AI" (Sakina AI), a warm, intelligent, calm spiritual and everyday voice companion.
Respond directly in natural spoken voice like a close, helpful friend sending a WhatsApp voice reply—concise, clear, and comforting.
Speak in ${targetLanguage}. If the user speaks in Moroccan Darija, respond naturally in Moroccan Darija; if they speak another language, match their language naturally.
${locationContext}
Answer any question the user asks freely (daily life, advice, emotional calm, Quran, Hadith, Islamic guidance, study, work, cooking, general knowledge).`;

    let closed = false;
    let turnActive = false;
    const sessionPromise = liveAi.live
      .connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: prebuiltVoiceName } },
          },
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: true,
            },
          },
          systemInstruction,
        },
        callbacks: {
          onopen: () => {
            if (!closed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'ready' }));
            }
          },
          onmessage: (message: LiveServerMessage) => {
            if (closed || clientWs.readyState !== WebSocket.OPEN) return;

            for (const part of message.serverContent?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ type: 'audio', data: part.inlineData.data }));
              }
            }

            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }

            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ type: 'turnComplete' }));
            }
          },
          onerror: (err: unknown) => {
            console.error('Gemini Live error:', err);
            if (!closed && clientWs.readyState === WebSocket.OPEN) {
              const evtMsg = (err as { message?: string })?.message;
              const message =
                evtMsg || (err instanceof Error ? err.message : 'Gemini Live API error');
              clientWs.send(JSON.stringify({ type: 'error', message }));
            }
          },
          onclose: () => {
            if (!closed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'closed' }));
            }
          },
        },
      })
      .catch((err: unknown) => {
        console.error('Gemini Live connect failed:', err);
        if (!closed && clientWs.readyState === WebSocket.OPEN) {
          const message = err instanceof Error ? err.message : 'Unable to connect to Gemini Live API';
          clientWs.send(JSON.stringify({ type: 'error', message }));
          clientWs.close();
        }
        return null;
      });

    clientWs.on('message', (rawData) => {
      let msg: { type?: string; audio?: string };
      try {
        msg = JSON.parse(rawData.toString()) as { type?: string; audio?: string };
      } catch {
        return;
      }

      sessionPromise.then((session) => {
        if (!session || closed) return;
        try {
          if (msg.type === 'activityStart') {
            if (!turnActive) {
              turnActive = true;
              session.sendRealtimeInput({ activityStart: {} });
            }
          } else if (msg.type === 'audio' && msg.audio) {
            if (!turnActive) {
              turnActive = true;
              session.sendRealtimeInput({ activityStart: {} });
            }
            session.sendRealtimeInput({
              audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (msg.type === 'activityEnd' || msg.type === 'audioStreamEnd') {
            if (turnActive) {
              turnActive = false;
              session.sendRealtimeInput({ activityEnd: {} });
            }
          }
        } catch (err) {
          if (clientWs.readyState === WebSocket.OPEN) {
            const errMsg = err instanceof Error ? err.message : 'Live audio send error';
            clientWs.send(JSON.stringify({ type: 'error', message: errMsg }));
          }
        }
      });
    });

    clientWs.on('close', () => {
      closed = true;
      sessionPromise.then((session) => {
        if (session) {
          try {
            session.close();
          } catch {
            // ignore close error
          }
        }
      });
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Sakina AI server running on http://localhost:${PORT}`);
  });
}

startServer();
