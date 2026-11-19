import rawCountries from 'country-state-city/lib/assets/country.json';
import type { CityItem, CountryItem, LanguageCode } from '../types';

interface RawCountryRecord {
  isoCode: string;
  name: string;
  flag: string;
  latitude: string;
  longitude: string;
}

const ALL_COUNTRIES = rawCountries as RawCountryRecord[];

export const MOROCCO_MAJOR_CITIES: CityItem[] = [
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

const COUNTRIESNOW_NAME_OVERRIDES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  PS: 'Palestine',
  KR: 'South Korea',
  KP: 'North Korea',
  RU: 'Russia',
  TR: 'Turkey',
  SY: 'Syria',
  IR: 'Iran',
  TZ: 'Tanzania',
  VN: 'Vietnam',
  CZ: 'Czech Republic',
  NL: 'Netherlands',
};

const displayNameFormatters = new Map<string, Intl.DisplayNames | null>();
const memoryCitiesCache = new Map<string, CityItem[]>();

export function getLocalizedCountryNameClient(
  isoCode: string,
  fallback: string,
  lang: LanguageCode
): string {
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

export function getLocalizedCountriesClient(lang: LanguageCode): CountryItem[] {
  return ALL_COUNTRIES.map((c) => ({
    isoCode: c.isoCode,
    name: c.name,
    localizedName: getLocalizedCountryNameClient(c.isoCode, c.name, lang),
    flag: c.flag,
    latitude: Number(c.latitude) || 0,
    longitude: Number(c.longitude) || 0,
  })).sort((a, b) => {
    try {
      return a.localizedName.localeCompare(b.localizedName, lang);
    } catch {
      return a.localizedName.localeCompare(b.localizedName);
    }
  });
}

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

export async function getCitiesForCountryClient(isoCode: string): Promise<CityItem[]> {
  const iso = String(isoCode || 'MA').toUpperCase();
  if (iso === 'MA') {
    return MOROCCO_MAJOR_CITIES;
  }

  const cachedMem = memoryCitiesCache.get(iso);
  if (cachedMem && cachedMem.length > 0) {
    return cachedMem;
  }

  const storageKey = `sakina_cities_${iso}_v1`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as CityItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCitiesCache.set(iso, parsed);
        return parsed;
      }
    }
  } catch {
    // ignore storage read error
  }

  const country = ALL_COUNTRIES.find((c) => c.isoCode === iso);
  const countryLat = Number(country?.latitude) || 0;
  const countryLng = Number(country?.longitude) || 0;
  const countryQueryName = COUNTRIESNOW_NAME_OVERRIDES[iso] || country?.name || '';

  if (countryQueryName) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const url = `https://countriesnow.space/api/v0.1/countries/cities/q?country=${encodeURIComponent(
        countryQueryName
      )}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json = (await res.json()) as { error?: boolean; data?: string[] };
        if (Array.isArray(json.data) && json.data.length > 0) {
          const seen = new Set<string>();
          const cities: CityItem[] = [];
          for (const rawName of json.data) {
            const name = String(rawName || '').trim();
            if (!name) continue;
            const norm = name.toLowerCase();
            if (seen.has(norm)) continue;
            seen.add(norm);
            cities.push({
              name,
              latitude: countryLat,
              longitude: countryLng,
              stateCode: iso,
            });
          }
          cities.sort((a, b) => a.name.localeCompare(b.name));
          if (cities.length > 0) {
            memoryCitiesCache.set(iso, cities);
            try {
              localStorage.setItem(storageKey, JSON.stringify(cities.slice(0, 600)));
            } catch {
              // ignore quota error
            }
            return cities;
          }
        }
      }
    } catch {
      clearTimeout(timer);
    }
  }

  if (country) {
    return [
      {
        name: country.name,
        latitude: countryLat,
        longitude: countryLng,
        stateCode: iso,
      },
    ];
  }

  return MOROCCO_MAJOR_CITIES;
}

export async function resolveCityCoordinatesClient(
  city: CityItem,
  countryIso: string
): Promise<{ lat: number; lng: number }> {
  // Moroccan major cities (and cached precise cities) already have exact coordinates
  if (
    countryIso.toUpperCase() === 'MA' ||
    city.arabicName ||
    city.stateCode !== countryIso.toUpperCase()
  ) {
    return { lat: city.latitude, lng: city.longitude };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city.name
    )}&count=5&language=en`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const json = (await res.json()) as {
        results?: Array<{
          latitude: number;
          longitude: number;
          country_code?: string;
        }>;
      };
      const match =
        json.results?.find(
          (r) => r.country_code?.toUpperCase() === countryIso.toUpperCase()
        ) || json.results?.[0];
      if (match && Number.isFinite(match.latitude) && Number.isFinite(match.longitude)) {
        return { lat: match.latitude, lng: match.longitude };
      }
    }
  } catch {
    clearTimeout(timer);
  }

  return { lat: city.latitude, lng: city.longitude };
}

export async function reverseGeocodeClient(
  lat: number,
  lng: number,
  lang: LanguageCode
): Promise<{
  countryIso: string;
  countryName: string;
  countryFlag: string;
  cityName: string;
} | null> {
  // 1. Primary: Nominatim CORS endpoint
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&accept-language=${encodeURIComponent(
      lang
    )}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as {
        address?: {
          city?: string;
          town?: string;
          village?: string;
          municipality?: string;
          state?: string;
          country_code?: string;
        };
      };
      const addr = data.address || {};
      const isoCode = (addr.country_code || '').toUpperCase();
      const cityName =
        addr.city || addr.town || addr.village || addr.municipality || addr.state || '';
      const matchedCountry = ALL_COUNTRIES.find((c) => c.isoCode === isoCode);
      if (matchedCountry && cityName) {
        return {
          countryIso: matchedCountry.isoCode,
          countryName: getLocalizedCountryNameClient(
            matchedCountry.isoCode,
            matchedCountry.name,
            lang
          ),
          countryFlag: matchedCountry.flag,
          cityName,
        };
      }
    }
  } catch {
    // fall through to Photon
  }

  // 2. Fallback: Photon CORS endpoint
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const url = `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as {
        features?: Array<{
          properties?: {
            city?: string;
            town?: string;
            village?: string;
            state?: string;
            countrycode?: string;
          };
        }>;
      };
      const props = data.features?.[0]?.properties;
      if (props) {
        const isoCode = (props.countrycode || '').toUpperCase();
        const cityName = props.city || props.town || props.village || props.state || '';
        const matchedCountry = ALL_COUNTRIES.find((c) => c.isoCode === isoCode);
        if (matchedCountry && cityName) {
          return {
            countryIso: matchedCountry.isoCode,
            countryName: getLocalizedCountryNameClient(
              matchedCountry.isoCode,
              matchedCountry.name,
              lang
            ),
            countryFlag: matchedCountry.flag,
            cityName,
          };
        }
      }
    }
  } catch {
    // fall through to offline nearest match
  }

  // 3. Offline nearest Moroccan city or nearest country fallback
  let nearestMa: CityItem | null = null;
  let minMaDist = Infinity;
  for (const mc of MOROCCO_MAJOR_CITIES) {
    const d = haversineKm(lat, lng, mc.latitude, mc.longitude);
    if (d < minMaDist) {
      minMaDist = d;
      nearestMa = mc;
    }
  }
  if (nearestMa && minMaDist <= 120) {
    const maCountry = ALL_COUNTRIES.find((c) => c.isoCode === 'MA');
    return {
      countryIso: 'MA',
      countryName: getLocalizedCountryNameClient('MA', maCountry?.name || 'Morocco', lang),
      countryFlag: maCountry?.flag || '🇲🇦',
      cityName: lang === 'ar' && nearestMa.arabicName ? nearestMa.arabicName : nearestMa.name,
    };
  }

  let nearestCountry: RawCountryRecord | null = null;
  let minCountryDist = Infinity;
  for (const c of ALL_COUNTRIES) {
    const cLat = Number(c.latitude);
    const cLng = Number(c.longitude);
    if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) continue;
    const d = haversineKm(lat, lng, cLat, cLng);
    if (d < minCountryDist) {
      minCountryDist = d;
      nearestCountry = c;
    }
  }

  if (nearestCountry) {
    const localized = getLocalizedCountryNameClient(
      nearestCountry.isoCode,
      nearestCountry.name,
      lang
    );
    return {
      countryIso: nearestCountry.isoCode,
      countryName: localized,
      countryFlag: nearestCountry.flag,
      cityName: localized,
    };
  }

  return null;
}
