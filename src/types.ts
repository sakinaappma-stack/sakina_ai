export type LanguageCode = 'ar' | 'en' | 'fr' | 'tr' | 'ur' | 'id' | 'es';

export type TabId =
  | 'home'
  | 'quran'
  | 'adhkar'
  | 'ai'
  | 'qibla'
  | 'tasbih'
  | 'mosques'
  | 'settings';

export type CalculationMethodId =
  | 'Morocco'
  | 'MuslimWorldLeague'
  | 'UmmAlQura'
  | 'Egyptian'
  | 'Karachi'
  | 'NorthAmerica'
  | 'Dubai'
  | 'Kuwait'
  | 'Qatar'
  | 'Turkey'
  | 'Singapore';

export type MadhabId = 'shafi' | 'hanafi';

export type ReciterId = 'alafasy' | 'maher' | 'basit' | 'ghamdi' | 'dosari';

export type MuezzinId = 'moroccan' | 'makkah' | 'madinah' | 'calm';

export type AdhanPrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface AdhanSettings {
  muezzin: MuezzinId;
  enabledPrayers: Record<AdhanPrayerKey, boolean>;
  preAdhanAlert10Min: boolean;
}

export interface CountryItem {
  isoCode: string;
  name: string;
  localizedName: string;
  flag: string;
  latitude: number;
  longitude: number;
}

export interface CityItem {
  name: string;
  arabicName?: string;
  latitude: number;
  longitude: number;
  stateCode: string;
}

export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerScheduleItem {
  key: PrayerKey;
  time: Date;
  formattedTime: string;
  isNext: boolean;
  isPassed: boolean;
}

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan' | string;
}

export interface AyahItem {
  number: number;
  numberInSurah: number;
  juz: number;
  page: number;
  arabicText: string;
  translatedText: string;
}

export interface SurahDetail {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  editionName: string;
  audioUrl: string;
  ayahs: AyahItem[];
}

export interface MosqueItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  bearing: number;
  address: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audioBase64?: string;
}

export interface AppSettings {
  language: LanguageCode;
  countryIso: string;
  cityName: string;
  cityLat: number;
  cityLng: number;
  calculationMethod: CalculationMethodId;
  madhab: MadhabId;
  darkMode: boolean;
  use24Hour: boolean;
  quranFontSize: number;
  reciterId: ReciterId;
  adhan: AdhanSettings;
}
