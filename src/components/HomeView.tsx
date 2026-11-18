import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Compass,
  Globe,
  MapPin,
  Navigation,
  Search,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  AppSettings,
  CityItem,
  CountryItem,
  LanguageCode,
  PrayerKey,
  PrayerScheduleItem,
} from '../types';
import { LANGUAGES, type UITranslation } from '../i18n/translations';
import { formatHumanCountdown } from '../utils/prayerUtils';
import { NotificationPermissionBanner, PWAInstallButton } from './PWAControls';

interface HomeViewProps {
  settings: AppSettings;
  countries: CountryItem[];
  cities: CityItem[];
  loadingCountries: boolean;
  loadingCities: boolean;
  schedule: PrayerScheduleItem[];
  nextPrayerKey: PrayerKey;
  remainingSeconds: number;
  countdown: string;
  qiblaAngle: number;
  dates: { gregorian: string; hijri: string };
  gpsLoading: boolean;
  gpsError: string | null;
  openCityPickerSignal: number;
  isAdhanPlaying: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  notificationPromptDismissed: boolean;
  onRequestNotificationPermission: () => void;
  onDismissNotificationPrompt: () => void;
  onToggleTestAdhan: () => void;
  onSelectCountry: (country: CountryItem) => void;
  onSelectCity: (city: CityItem) => void;
  onSelectLanguage: (lang: LanguageCode) => void;
  onDetectGps: () => void;
  onOpenQibla: () => void;
  t: UITranslation;
}

const HERO_IMAGE = '/src/assets/images/sakina_hero_arch_1795026433672.jpg';

const MANUAL_MOROCCO_CITIES: CityItem[] = [
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
];

export const HomeView: React.FC<HomeViewProps> = ({
  settings,
  countries,
  cities,
  loadingCountries,
  loadingCities,
  schedule,
  nextPrayerKey,
  remainingSeconds,
  countdown,
  qiblaAngle,
  dates,
  gpsLoading,
  gpsError,
  openCityPickerSignal,
  isAdhanPlaying,
  notificationPermission,
  notificationPromptDismissed,
  onRequestNotificationPermission,
  onDismissNotificationPrompt,
  onToggleTestAdhan,
  onSelectCountry,
  onSelectCity,
  onSelectLanguage,
  onDetectGps,
  onOpenQibla,
  t,
}) => {
  const [modalMode, setModalMode] = useState<'country' | 'city' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [heroImgError, setHeroImgError] = useState(false);

  useEffect(() => {
    if (openCityPickerSignal > 0) {
      setSearchQuery('');
      setModalMode('city');
    }
  }, [openCityPickerSignal]);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.isoCode === settings.countryIso),
    [countries, settings.countryIso]
  );

  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.localizedName.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.isoCode.toLowerCase().includes(q)
    );
  }, [countries, searchQuery]);

  const effectiveCities = cities.length > 0 ? cities : MANUAL_MOROCCO_CITIES;

  const filteredCities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return effectiveCities;
    return effectiveCities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.arabicName && c.arabicName.toLowerCase().includes(q))
    );
  }, [effectiveCities, searchQuery]);

  const nextPrayerItem = schedule.find((item) => item.isNext) || schedule[0];
  const humanCountdown = formatHumanCountdown(
    remainingSeconds,
    t.prayers[nextPrayerKey],
    settings.language
  );

  const openPicker = (mode: 'country' | 'city') => {
    setSearchQuery('');
    setModalMode(mode);
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner with Big Title "السكينة AI" and Subtitle */}
      <section className="relative overflow-hidden rounded-3xl bg-[#072C21] text-[#F7F3E6] border border-[#1B5742]">
        {!heroImgError && (
          <img
            src={HERO_IMAGE}
            alt="السكينة AI"
            referrerPolicy="no-referrer"
            onError={() => setHeroImgError(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-55"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#06241B] via-[#06241B]/80 to-[#06241B]/50"
        />

        <div className="relative z-10 px-5 py-7 sm:px-8 sm:py-9 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-[#E5C366] font-medium flex flex-wrap items-center gap-2">
              {dates.hijri && <span>{dates.hijri}</span>}
              {dates.hijri && dates.gregorian && <span aria-hidden="true">·</span>}
              <span>{dates.gregorian}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PWAInstallButton t={t} variant="hero" />
              <button
                type="button"
                onClick={onDetectGps}
                disabled={gpsLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-white/15 hover:bg-white/25 text-xs sm:text-sm font-medium text-[#F7F3E6] backdrop-blur-sm border border-white/20 transition-colors whitespace-nowrap shrink-0"
              >
                <Navigation className="w-4 h-4 text-[#E5C366]" />
                <span>{gpsLoading ? t.home.gpsLoading : t.home.detectGps}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-w-2xl">
            <h1 className="font-quran text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
              {t.appName}
            </h1>
            <p className="text-base sm:text-lg text-[#E5C366] font-medium">
              {t.subtitle}
            </p>
          </div>

          {gpsError && (
            <div className="rounded-2xl bg-[#061A14]/90 border border-[#C59B38]/70 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs sm:text-sm text-amber-100 font-medium">{gpsError}</p>
                <button
                  type="button"
                  onClick={() => openPicker('city')}
                  className="min-h-[36px] px-3 py-1 rounded-lg bg-[#C59B38] text-[#061A14] text-xs font-bold whitespace-nowrap shrink-0"
                >
                  {t.home.chooseManually}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {MANUAL_MOROCCO_CITIES.map((mc) => (
                  <button
                    key={mc.name}
                    type="button"
                    onClick={() => onSelectCity(mc)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-white/15 hover:bg-[#C59B38] hover:text-[#061A14] text-xs sm:text-sm font-semibold text-white transition-colors"
                  >
                    {settings.language === 'ar' ? mc.arabicName : mc.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <NotificationPermissionBanner
        permission={notificationPermission}
        dismissed={notificationPromptDismissed}
        onRequestPermission={onRequestNotificationPermission}
        onDismiss={onDismissNotificationPrompt}
        t={t}
      />

      {/* First Screen Controls: Country (with Flags), City, Language */}
      <section className="rounded-2xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Country Selection with Flag */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-[#436155] dark:text-[#9EC0B2]">
              <span>{t.home.selectCountry}</span>
              <span className="tabular-nums">
                {countries.length > 0 ? `${countries.length} ${t.home.allCountriesCount}` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => openPicker('country')}
              disabled={loadingCountries}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#F8FAF7] dark:bg-[#113529] border border-[#DCE7E0] dark:border-[#1C4B3B] hover:border-[#0B4F3A] dark:hover:border-[#E5C366] flex items-center justify-between gap-2 text-start transition-colors"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl leading-none shrink-0" aria-hidden="true">
                  {selectedCountry?.flag || '🇲🇦'}
                </span>
                <span className="font-semibold text-sm sm:text-base text-[#0A251C] dark:text-[#F2F7F4] truncate">
                  {selectedCountry?.localizedName || t.home.quickMorocco}
                </span>
              </span>
              <ChevronDown className="w-4 h-4 text-[#436155] dark:text-[#9EC0B2] shrink-0" />
            </button>
          </div>

          {/* 2. City Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-[#436155] dark:text-[#9EC0B2]">
              <span>{t.home.selectCity}</span>
              <span className="tabular-nums">
                {effectiveCities.length > 0 ? `${effectiveCities.length}` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => openPicker('city')}
              disabled={loadingCities}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#F8FAF7] dark:bg-[#113529] border border-[#DCE7E0] dark:border-[#1C4B3B] hover:border-[#0B4F3A] dark:hover:border-[#E5C366] flex items-center justify-between gap-2 text-start transition-colors"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-[#9A741E] dark:text-[#E5C366] shrink-0" />
                <span className="font-semibold text-sm sm:text-base text-[#0A251C] dark:text-[#F2F7F4] truncate">
                  {loadingCities ? t.home.loadingCities : settings.cityName}
                </span>
              </span>
              <ChevronDown className="w-4 h-4 text-[#436155] dark:text-[#9EC0B2] shrink-0" />
            </button>
          </div>

          {/* 3. Language Selection */}
          <div className="space-y-1.5">
            <label
              htmlFor="home-language-select"
              className="flex items-center justify-between text-xs font-medium text-[#436155] dark:text-[#9EC0B2]"
            >
              <span>{t.home.selectLanguage}</span>
              <span>{LANGUAGES.find((l) => l.code === settings.language)?.quranEditionLabel}</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-[#0B4F3A] dark:text-[#E5C366] pointer-events-none absolute top-1/2 -translate-y-1/2 start-3.5" />
              <select
                id="home-language-select"
                value={settings.language}
                onChange={(e) => onSelectLanguage(e.target.value as LanguageCode)}
                className="w-full min-h-[48px] ps-10 pe-9 py-2.5 rounded-xl bg-[#F8FAF7] dark:bg-[#113529] border border-[#DCE7E0] dark:border-[#1C4B3B] hover:border-[#0B4F3A] dark:hover:border-[#E5C366] font-semibold text-sm sm:text-base text-[#0A251C] dark:text-[#F2F7F4] appearance-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[#C59B38]"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#436155] dark:text-[#9EC0B2] pointer-events-none absolute top-1/2 -translate-y-1/2 end-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* Prayer Times & Big Next Prayer Countdown */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Focal Anchor: Big Next Prayer Countdown */}
        <div className="lg:col-span-5 rounded-3xl bg-[#0B4F3A] dark:bg-[#0E3A2C] text-white p-6 sm:p-7 flex flex-col justify-between gap-5 border border-[#17684E]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm text-[#E5C366] font-medium">
                {t.home.nextPrayer}
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                {t.prayers[nextPrayerKey]}
              </h2>
            </div>
            <div className="text-end">
              <p className="text-xs text-[#BCE0D2]">{settings.cityName}</p>
              <p className="font-mono-num text-xl sm:text-2xl font-semibold text-[#E5C366] tabular-nums" dir="ltr">
                {nextPrayerItem?.formattedTime}
              </p>
            </div>
          </div>

          <div className="py-4 border-y border-white/15 space-y-2">
            <p className="text-xs text-[#BCE0D2]">{t.home.timeRemaining}</p>
            <p className="text-xl sm:text-2xl font-bold text-[#F5DC8B] leading-snug">
              {humanCountdown}
            </p>
            <div className="font-mono-num text-4xl sm:text-5xl font-bold tracking-wider text-white tabular-nums" dir="ltr">
              {countdown}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs sm:text-sm text-[#DCEFE7]">
            <button
              type="button"
              onClick={onToggleTestAdhan}
              className={`inline-flex items-center gap-2 min-h-[42px] px-3.5 py-2 rounded-xl font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isAdhanPlaying
                  ? 'bg-[#C59B38] text-[#061A14]'
                  : 'bg-white/12 hover:bg-white/20 text-white'
              }`}
            >
              {isAdhanPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#E5C366]" />}
              <span>{isAdhanPlaying ? t.home.stopAdhan : t.home.testAdhan}</span>
            </button>

            <button
              type="button"
              onClick={onOpenQibla}
              className="inline-flex items-center gap-1.5 min-h-[42px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#E5C366] font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <Compass className="w-4 h-4" />
              <span className="tabular-nums">{t.nav.qibla} · {Math.round(qiblaAngle)}°</span>
            </button>
          </div>
        </div>

        {/* All 6 Prayer Times Grid */}
        <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#DCE7E0] dark:border-[#1C4B3B]">
            <h3 className="text-lg font-bold text-[#0A251C] dark:text-[#F2F7F4]">
              {t.home.prayerTimesTitle}
            </h3>
            <span className="text-xs sm:text-sm text-[#436155] dark:text-[#9EC0B2] truncate">
              {selectedCountry?.flag} {settings.cityName}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 flex-1">
            {schedule.map((item) => {
              const active = item.isNext;
              return (
                <div
                  key={item.key}
                  className={`rounded-2xl p-4 flex flex-col justify-between gap-2 transition-colors border ${
                    active
                      ? 'bg-[#EFF5F1] dark:bg-[#144233] border-[#C59B38] dark:border-[#E5C366]'
                      : 'bg-[#F8FAF7] dark:bg-[#113529]/60 border-[#DCE7E0] dark:border-[#1C4B3B]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-sm font-semibold ${
                        active
                          ? 'text-[#0B4F3A] dark:text-[#E5C366]'
                          : 'text-[#436155] dark:text-[#9EC0B2]'
                      }`}
                    >
                      {t.prayers[item.key]}
                    </span>
                    {active && (
                      <span className="text-[11px] font-semibold text-[#9A741E] dark:text-[#E5C366]">
                        {t.home.nextPrayer}
                      </span>
                    )}
                  </div>
                  <div
                    className={`font-mono-num text-xl sm:text-2xl font-bold tabular-nums ${
                      active
                        ? 'text-[#0A251C] dark:text-white'
                        : item.isPassed
                        ? 'text-[#436155]/75 dark:text-[#9EC0B2]/70'
                        : 'text-[#0A251C] dark:text-[#F2F7F4]'
                    }`}
                    dir="ltr"
                  >
                    {item.formattedTime}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Searchable Country / City Modal Sheet */}
      {modalMode && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setModalMode(null)}
        >
          <div
            className="w-full sm:max-w-lg max-h-[82dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-[#DCE7E0] dark:border-[#1C4B3B] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#0A251C] dark:text-[#F2F7F4]">
                  {modalMode === 'country'
                    ? t.home.selectCountry
                    : `${t.home.selectCity} — ${selectedCountry?.flag || '🇲🇦'} ${selectedCountry?.localizedName || t.home.quickMorocco}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  aria-label="Close"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#436155] dark:text-[#9EC0B2] hover:bg-[#EFF5F1] dark:hover:bg-[#113529]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-[#436155] dark:text-[#9EC0B2] absolute top-1/2 -translate-y-1/2 start-3.5" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    modalMode === 'country'
                      ? t.home.searchCountryPlaceholder
                      : t.home.searchCityPlaceholder
                  }
                  className="w-full min-h-[46px] ps-10 pe-4 py-2 rounded-xl bg-[#F8FAF7] dark:bg-[#113529] border border-[#DCE7E0] dark:border-[#1C4B3B] text-sm text-[#0A251C] dark:text-[#F2F7F4] focus:outline-none focus:border-[#0B4F3A] dark:focus:border-[#E5C366]"
                />
              </div>
            </div>

            <div className="overflow-y-auto divide-y divide-[#DCE7E0]/60 dark:divide-[#1C4B3B]/60 p-2">
              {modalMode === 'country' &&
                (filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => {
                    const selected = country.isoCode === settings.countryIso;
                    return (
                      <button
                        key={country.isoCode}
                        type="button"
                        onClick={() => {
                          onSelectCountry(country);
                          setModalMode(null);
                        }}
                        className={`w-full min-h-[52px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-start transition-colors ${
                          selected
                            ? 'bg-[#EFF5F1] dark:bg-[#144233] text-[#0B4F3A] dark:text-[#E5C366] font-semibold'
                            : 'hover:bg-[#F8FAF7] dark:hover:bg-[#113529] text-[#0A251C] dark:text-[#F2F7F4]'
                        }`}
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl leading-none shrink-0" aria-hidden="true">
                            {country.flag}
                          </span>
                          <span className="truncate text-sm sm:text-base">
                            {country.localizedName}
                          </span>
                        </span>
                        <span className="text-xs font-mono-num text-[#436155] dark:text-[#9EC0B2] shrink-0">
                          {country.isoCode}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="py-10 text-center text-sm text-[#436155] dark:text-[#9EC0B2]">
                    {t.home.noResults}
                  </p>
                ))}

              {modalMode === 'city' &&
                (filteredCities.length > 0 ? (
                  filteredCities.slice(0, 250).map((city) => {
                    const displayLabel =
                      settings.language === 'ar' && city.arabicName
                        ? `${city.arabicName} · ${city.name}`
                        : city.name;
                    const selected =
                      city.name === settings.cityName ||
                      (city.arabicName && city.arabicName === settings.cityName);

                    return (
                      <button
                        key={`${city.name}-${city.stateCode}-${city.latitude}`}
                        type="button"
                        onClick={() => {
                          onSelectCity(city);
                          setModalMode(null);
                        }}
                        className={`w-full min-h-[52px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-start transition-colors ${
                          selected
                            ? 'bg-[#EFF5F1] dark:bg-[#144233] text-[#0B4F3A] dark:text-[#E5C366] font-semibold'
                            : 'hover:bg-[#F8FAF7] dark:hover:bg-[#113529] text-[#0A251C] dark:text-[#F2F7F4]'
                        }`}
                      >
                        <span className="truncate text-sm sm:text-base">{displayLabel}</span>
                        {city.stateCode && (
                          <span className="text-xs text-[#436155] dark:text-[#9EC0B2] shrink-0">
                            {city.stateCode}
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="py-10 text-center text-sm text-[#436155] dark:text-[#9EC0B2]">
                    {t.home.noResults}
                  </p>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
