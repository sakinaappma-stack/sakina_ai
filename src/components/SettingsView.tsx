import React, { useMemo, useState } from 'react';
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Globe,
  Heart,
  Info,
  Mail,
  Moon,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Sun,
  Timer,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  AdhanPrayerKey,
  AppSettings,
  CalculationMethodId,
  MadhabId,
  MuezzinId,
} from '../types';
import type { UITranslation } from '../i18n/translations';
import { getWorldLanguageByCode, getWorldLanguages } from '../i18n/worldLanguages';
import { MUEZZINS } from '../utils/prayerUtils';
import { PWAInstallButton } from './PWAControls';

interface SettingsViewProps {
  settings: AppSettings;
  isAdhanPreviewPlaying: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  is30DaysCached: boolean;
  isAdhanAudioCached: boolean;
  testAdhanRemainingSec: number | null;
  onRequestNotificationPermission: () => void;
  onToggleAdhanPreview: () => void;
  onScheduleTestAdhan2Min: () => void;
  onCancelTestAdhan: () => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onResetDefaults: () => void;
  t: UITranslation;
}

const CALC_METHODS: CalculationMethodId[] = [
  'Morocco',
  'MuslimWorldLeague',
  'UmmAlQura',
  'Egyptian',
  'Karachi',
  'NorthAmerica',
  'Dubai',
  'Kuwait',
  'Qatar',
  'Turkey',
  'Singapore',
];

const ADHAN_PRAYERS: AdhanPrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const SUPPORT_EMAIL = 'sakina.app.ma@gmail.com';

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  isAdhanPreviewPlaying,
  notificationPermission,
  is30DaysCached,
  isAdhanAudioCached,
  testAdhanRemainingSec,
  onRequestNotificationPermission,
  onToggleAdhanPreview,
  onScheduleTestAdhan2Min,
  onCancelTestAdhan,
  onUpdateSettings,
  onResetDefaults,
  t,
}) => {
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [supportOpen, setSupportOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const worldLanguages = useMemo(
    () => getWorldLanguages(settings.language),
    [settings.language]
  );

  const activeLanguage = useMemo(
    () => getWorldLanguageByCode(settings.language, settings.language),
    [settings.language]
  );

  const filteredLanguages = useMemo(() => {
    const q = langSearch.trim().toLowerCase();
    if (!q) return worldLanguages;
    return worldLanguages.filter(
      (lang) =>
        lang.nativeName.toLowerCase().includes(q) ||
        lang.englishName.toLowerCase().includes(q) ||
        lang.localizedName.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
    );
  }, [worldLanguages, langSearch]);

  const formatTestCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const togglePrayerAdhan = (key: AdhanPrayerKey) => {
    onUpdateSettings({
      adhan: {
        ...settings.adhan,
        enabledPrayers: {
          ...settings.adhan.enabledPrayers,
          [key]: !settings.adhan.enabledPrayers[key],
        },
      },
    });
  };

  const handleCopyAppLink = async () => {
    const url = window.location.origin;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleShareApp = async () => {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t.appName,
          text: t.settings.aboutDescription,
          url,
        });
        return;
      } catch {
        // User cancelled or share unsupported; fall back to copy
      }
    }
    await handleCopyAppLink();
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Clean Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-[#0A251C] dark:text-[#F2F7F4]">
          {t.settings.title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <PWAInstallButton t={t} variant="settings" />
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 min-h-[42px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] text-xs font-semibold text-[#436155] dark:text-[#9EC0B2] hover:text-[#0B4F3A] dark:hover:text-[#E5C366]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.settings.resetDefaults}</span>
          </button>
        </div>
      </div>

      {/* 1. Language Section (All World Languages) */}
      <section className="rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-[#0B4F3A] dark:text-[#E5C366] shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#0A251C] dark:text-[#F2F7F4]">
                {t.settings.languageSectionTitle}
              </h3>
              <p className="text-xs text-[#436155] dark:text-[#9EC0B2]">
                {worldLanguages.length} {t.settings.worldLanguagesCount}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLangPickerOpen((prev) => !prev)}
            aria-expanded={langPickerOpen}
            className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-xl bg-[#F8FAF7] dark:bg-[#113529] border border-[#DCE7E0] dark:border-[#1C4B3B] hover:border-[#0B4F3A] dark:hover:border-[#E5C366] text-xs sm:text-sm font-bold text-[#0A251C] dark:text-[#F2F7F4] transition-colors"
          >
            <span>{activeLanguage.nativeName}</span>
            {langPickerOpen ? (
              <ChevronUp className="w-4 h-4 text-[#436155] dark:text-[#9EC0B2]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#436155] dark:text-[#9EC0B2]" />
            )}
          </button>
        </div>

        {langPickerOpen && (
          <div className="space-y-3 pt-1">
            <div className="relative">
              <Search className="w-4 h-4 text-[#436155] dark:text-[#9EC0B2] pointer-events-none absolute top-1/2 -translate-y-1/2 start-3.5" />
              <input
                type="search"
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                placeholder={t.settings.languageSearchPlaceholder}
                className="w-full min-h-[44px] ps-10 pe-4 py-2 rounded-xl bg-[#F8FAF7] dark:bg-[#113529] border border-[#DCE7E0] dark:border-[#1C4B3B] text-sm text-[#0A251C] dark:text-[#F2F7F4] focus:outline-none focus:border-[#0B4F3A] dark:focus:border-[#E5C366]"
              />
            </div>

            <div className="max-h-64 overflow-y-auto rounded-2xl border border-[#DCE7E0] dark:border-[#1C4B3B] divide-y divide-[#DCE7E0]/70 dark:divide-[#1C4B3B]/70">
              {filteredLanguages.length === 0 ? (
                <p className="p-4 text-center text-xs text-[#436155] dark:text-[#9EC0B2]">
                  {t.home.noResults}
                </p>
              ) : (
                filteredLanguages.map((lang) => {
                  const selected = settings.language.toLowerCase() === lang.code.toLowerCase();
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        onUpdateSettings({ language: lang.code });
                        setLangPickerOpen(false);
                        setLangSearch('');
                      }}
                      className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-start transition-colors ${
                        selected
                          ? 'bg-[#EFF5F1] dark:bg-[#113529] text-[#0B4F3A] dark:text-[#E5C366]'
                          : 'bg-white dark:bg-[#0C2920] hover:bg-[#F8FAF7] dark:hover:bg-[#113529]/60 text-[#0A251C] dark:text-[#F2F7F4]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{lang.nativeName}</p>
                        <p className="text-xs text-[#436155] dark:text-[#9EC0B2] truncate">
                          {lang.localizedName !== lang.nativeName
                            ? `${lang.localizedName} · ${lang.englishName}`
                            : lang.englishName}
                        </p>
                      </div>
                      {selected && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </section>

      {/* Sakina AI Voice Selection */}
      <section className="rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-[#0B4F3A] dark:text-[#E5C366] shrink-0" />
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#0A251C] dark:text-[#F2F7F4]">
              {t.settings.aiVoiceTitle}
            </h3>
            <p className="text-xs text-[#436155] dark:text-[#9EC0B2]">
              {t.settings.aiVoiceSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onUpdateSettings({ aiVoice: 'woman' })}
            aria-pressed={settings.aiVoice === 'woman'}
            className={`relative min-h-[104px] p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2.5 transition-all ${
              settings.aiVoice === 'woman'
                ? 'bg-[#0B4F3A] text-white border-[#C59B38] shadow-sm'
                : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#0A251C] dark:text-[#F2F7F4] border-[#DCE7E0] dark:border-[#1C4B3B] hover:border-[#0B4F3A]/60'
            }`}
          >
            {settings.aiVoice === 'woman' && (
              <span className="absolute top-2.5 end-2.5 w-5 h-5 rounded-full bg-[#C59B38] text-[#061A14] flex items-center justify-center">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
            )}
            <span
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                settings.aiVoice === 'woman'
                  ? 'bg-white/15 text-[#E5C366]'
                  : 'bg-[#EFF5F1] dark:bg-[#0C2920] text-[#0B4F3A] dark:text-[#E5C366]'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-7 h-7"
                aria-hidden="true"
              >
                <circle cx="12" cy="8.5" r="3.5" />
                <path d="M7.5 11.5c0-3 2-5.5 4.5-5.5s4.5 2.5 4.5 5.5c0 1.4.4 2.6.9 3.5" />
                <path d="M7.5 11.5c0 1.4-.4 2.6-.9 3.5" />
                <path d="M6.5 20.5a5.5 5.5 0 0 1 11 0" />
              </svg>
            </span>
            <span className="text-sm sm:text-base font-bold">{t.settings.aiVoiceWoman}</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ aiVoice: 'man' })}
            aria-pressed={settings.aiVoice === 'man'}
            className={`relative min-h-[104px] p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2.5 transition-all ${
              settings.aiVoice === 'man'
                ? 'bg-[#0B4F3A] text-white border-[#C59B38] shadow-sm'
                : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#0A251C] dark:text-[#F2F7F4] border-[#DCE7E0] dark:border-[#1C4B3B] hover:border-[#0B4F3A]/60'
            }`}
          >
            {settings.aiVoice === 'man' && (
              <span className="absolute top-2.5 end-2.5 w-5 h-5 rounded-full bg-[#C59B38] text-[#061A14] flex items-center justify-center">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
            )}
            <span
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                settings.aiVoice === 'man'
                  ? 'bg-white/15 text-[#E5C366]'
                  : 'bg-[#EFF5F1] dark:bg-[#0C2920] text-[#0B4F3A] dark:text-[#E5C366]'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-7 h-7"
                aria-hidden="true"
              >
                <circle cx="12" cy="8.5" r="3.5" />
                <path d="M8.5 7.5c1-1.5 5-1.5 7 0" />
                <path d="M5.5 20.5a6.5 6.5 0 0 1 13 0" />
              </svg>
            </span>
            <span className="text-sm sm:text-base font-bold">{t.settings.aiVoiceMan}</span>
          </button>
        </div>
      </section>

      {/* Adhan & Notifications Section */}
      <section className="rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] divide-y divide-[#DCE7E0] dark:divide-[#1C4B3B]">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-[#9A741E] dark:text-[#E5C366]" />
              <h3 className="text-base sm:text-lg font-bold text-[#0A251C] dark:text-[#F2F7F4]">
                {t.settings.adhanSectionTitle}
              </h3>
            </div>

            <button
              type="button"
              onClick={onToggleAdhanPreview}
              className={`inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                isAdhanPreviewPlaying
                  ? 'bg-[#C59B38] text-[#061A14]'
                  : 'bg-[#0B4F3A] hover:bg-[#093F2E] text-white'
              }`}
            >
              {isAdhanPreviewPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isAdhanPreviewPlaying ? t.settings.stopPreview : t.settings.previewAdhan}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="settings-muezzin"
              className="block text-xs font-semibold text-[#436155] dark:text-[#9EC0B2]"
            >
              {t.settings.muezzinVoice}
            </label>
            <select
              id="settings-muezzin"
              value={settings.adhan.muezzin}
              onChange={(e) =>
                onUpdateSettings({
                  adhan: {
                    ...settings.adhan,
                    muezzin: e.target.value as MuezzinId,
                  },
                })
              }
              className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-[#F8FAF7] dark:bg-[#113529] border border-[#DCE7E0] dark:border-[#1C4B3B] text-sm font-semibold text-[#0A251C] dark:text-[#F2F7F4]"
            >
              {MUEZZINS.map((m) => (
                <option key={m.id} value={m.id}>
                  {settings.language === 'ar' || settings.language === 'ur'
                    ? m.arabicName
                    : `${m.latinName} — ${m.arabicName}`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {ADHAN_PRAYERS.map((prayerKey) => {
              const enabled = settings.adhan.enabledPrayers[prayerKey];
              return (
                <button
                  key={prayerKey}
                  type="button"
                  onClick={() => togglePrayerAdhan(prayerKey)}
                  aria-pressed={enabled}
                  className={`min-h-[50px] px-3 py-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    enabled
                      ? 'bg-[#0B4F3A] text-white border-[#C59B38]'
                      : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#436155] dark:text-[#9EC0B2] border-[#DCE7E0] dark:border-[#1C4B3B]'
                  }`}
                >
                  <span className="text-sm font-bold">{t.settings.adhanPrayers[prayerKey]}</span>
                  <span className={`text-[11px] ${enabled ? 'text-[#E5C366]' : 'opacity-75'}`}>
                    {enabled ? t.settings.enabledLabel : t.settings.disabledLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 10-Minute Pre-Adhan Alert & Background Notifications */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-[#0A251C] dark:text-[#F2F7F4]">
                {t.settings.preAdhan10Min}
              </p>
              <p className="text-xs text-[#436155] dark:text-[#9EC0B2]">
                {t.settings.preAdhanDesc}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.adhan.preAdhanAlert10Min}
              onClick={() =>
                onUpdateSettings({
                  adhan: {
                    ...settings.adhan,
                    preAdhanAlert10Min: !settings.adhan.preAdhanAlert10Min,
                  },
                })
              }
              className={`min-h-[40px] min-w-[68px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                settings.adhan.preAdhanAlert10Min
                  ? 'bg-[#C59B38] text-[#061A14]'
                  : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#436155] dark:text-[#9EC0B2] border border-[#DCE7E0] dark:border-[#1C4B3B]'
              }`}
            >
              {settings.adhan.preAdhanAlert10Min
                ? t.settings.enabledLabel
                : t.settings.disabledLabel}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-[#0A251C] dark:text-[#F2F7F4]">
                {t.pwa.notificationsTitle}
              </p>
              <p className="text-xs text-[#436155] dark:text-[#9EC0B2]">
                {notificationPermission === 'granted'
                  ? t.pwa.alertsEnabled
                  : notificationPermission === 'denied'
                  ? t.pwa.alertsBlocked
                  : t.pwa.prayerAlertPromptDesc}
              </p>
            </div>
            {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
              <button
                type="button"
                onClick={onRequestNotificationPermission}
                disabled={notificationPermission === 'denied'}
                className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl bg-[#0B4F3A] hover:bg-[#093F2E] disabled:opacity-50 text-white text-xs font-bold transition-colors shrink-0"
              >
                <Bell className="w-4 h-4 text-[#E5C366]" />
                <span>{t.pwa.enableAlertsBtn}</span>
              </button>
            )}
            {notificationPermission === 'granted' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B4F3A] dark:text-[#E5C366]">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.settings.enabledLabel}</span>
              </span>
            )}
          </div>

          {/* 2-Minute Scheduled Adhan Test */}
          <div className="rounded-2xl bg-[#F8FAF7] dark:bg-[#113529] border border-[#DCE7E0] dark:border-[#1C4B3B] p-3.5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs sm:text-sm font-semibold text-[#0A251C] dark:text-[#F2F7F4]">
              {testAdhanRemainingSec !== null
                ? settings.language === 'ar'
                  ? `سيصوني الأذان المغربي بعد ${formatTestCountdown(testAdhanRemainingSec)}`
                  : `Moroccan Adhan alert in ${formatTestCountdown(testAdhanRemainingSec)}`
                : settings.language === 'ar'
                ? 'اختبار الأذان المغربي بعد دقيقتين'
                : '2-Minute Moroccan Adhan Test'}
            </p>

            {testAdhanRemainingSec !== null ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono-num inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl bg-[#0B4F3A] text-[#E5C366] text-xs font-bold tabular-nums">
                  <Timer className="w-3.5 h-3.5" />
                  <span>{formatTestCountdown(testAdhanRemainingSec)}</span>
                </span>
                <button
                  type="button"
                  onClick={onCancelTestAdhan}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] text-xs font-bold text-[#436155] dark:text-[#9EC0B2]"
                >
                  {settings.language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onScheduleTestAdhan2Min}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#C59B38] hover:bg-[#b58c2c] text-[#061A14] text-xs font-bold transition-colors shrink-0"
              >
                <Timer className="w-4 h-4" />
                <span>
                  {settings.language === 'ar' ? 'جرب الأذان بعد دقيقتين' : 'Test Adhan in 2 Min'}
                </span>
              </button>
            )}
          </div>

          {(is30DaysCached || isAdhanAudioCached) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#436155] dark:text-[#9EC0B2]">
              {is30DaysCached && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFF5F1] dark:bg-[#113529] text-[#0B4F3A] dark:text-[#E5C366] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.pwa.cached30DaysReady}</span>
                </span>
              )}
              {isAdhanAudioCached && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFF5F1] dark:bg-[#113529] text-[#0B4F3A] dark:text-[#E5C366] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.pwa.adhanAudioCached}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Display & Prayer Calculation */}
      <section className="rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-5 sm:p-6 space-y-5">
        <h3 className="text-base sm:text-lg font-bold text-[#0A251C] dark:text-[#F2F7F4]">
          {t.settings.displayAndPrayerTitle}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#436155] dark:text-[#9EC0B2]">
              {t.settings.appearance}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ darkMode: false })}
                className={`min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 border transition-colors ${
                  !settings.darkMode
                    ? 'bg-[#0B4F3A] text-white border-transparent'
                    : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#436155] dark:text-[#9EC0B2] border-[#DCE7E0] dark:border-[#1C4B3B]'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>{t.settings.lightMode}</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ darkMode: true })}
                className={`min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 border transition-colors ${
                  settings.darkMode
                    ? 'bg-[#0B4F3A] text-white border-transparent'
                    : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#436155] dark:text-[#9EC0B2] border-[#DCE7E0] dark:border-[#1C4B3B]'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>{t.settings.darkMode}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#436155] dark:text-[#9EC0B2]">
              {t.settings.timeFormat}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ use24Hour: false })}
                className={`min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors ${
                  !settings.use24Hour
                    ? 'bg-[#0B4F3A] text-white border-transparent'
                    : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#436155] dark:text-[#9EC0B2] border-[#DCE7E0] dark:border-[#1C4B3B]'
                }`}
              >
                {t.settings.format12h}
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ use24Hour: true })}
                className={`min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors ${
                  settings.use24Hour
                    ? 'bg-[#0B4F3A] text-white border-transparent'
                    : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#436155] dark:text-[#9EC0B2] border-[#DCE7E0] dark:border-[#1C4B3B]'
                }`}
              >
                {t.settings.format24h}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="settings-method"
              className="block text-xs font-semibold text-[#436155] dark:text-[#9EC0B2]"
            >
              {t.settings.calculationMethod}
            </label>
            <select
              id="settings-method"
              value={settings.calculationMethod}
              onChange={(e) =>
                onUpdateSettings({ calculationMethod: e.target.value as CalculationMethodId })
              }
              className="w-full min-h-[46px] px-3.5 py-2 rounded-xl bg-[#F8FAF7] dark:bg-[#113529] border border-[#DCE7E0] dark:border-[#1C4B3B] text-xs sm:text-sm font-semibold text-[#0A251C] dark:text-[#F2F7F4]"
            >
              {CALC_METHODS.map((method) => (
                <option key={method} value={method}>
                  {t.settings.methods[method]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-[#436155] dark:text-[#9EC0B2]">
              {t.settings.madhabLabel}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(['shafi', 'hanafi'] as MadhabId[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onUpdateSettings({ madhab: m })}
                  className={`min-h-[46px] px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    settings.madhab === m
                      ? 'bg-[#0B4F3A] text-white border-transparent'
                      : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#436155] dark:text-[#9EC0B2] border-[#DCE7E0] dark:border-[#1C4B3B]'
                  }`}
                >
                  {m === 'shafi' ? t.settings.shafiLabel : t.settings.hanafiLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="settings-quran-size"
              className="text-xs font-semibold text-[#436155] dark:text-[#9EC0B2]"
            >
              {t.settings.quranTextSize}
            </label>
            <span className="font-mono-num text-xs font-bold text-[#9A741E] dark:text-[#E5C366] tabular-nums">
              {settings.quranFontSize}px
            </span>
          </div>
          <input
            id="settings-quran-size"
            type="range"
            min={20}
            max={40}
            step={2}
            value={settings.quranFontSize}
            onChange={(e) => onUpdateSettings({ quranFontSize: Number(e.target.value) })}
            className="w-full accent-[#0B4F3A]"
          />
        </div>
      </section>

      {/* 2. About the App Section */}
      <section className="rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-5 sm:p-6 space-y-3.5">
        <div className="flex items-center gap-2.5">
          <Info className="w-5 h-5 text-[#0B4F3A] dark:text-[#E5C366] shrink-0" />
          <h3 className="text-base sm:text-lg font-bold text-[#0A251C] dark:text-[#F2F7F4]">
            {t.settings.aboutTitle}
          </h3>
        </div>

        <p className="text-sm leading-relaxed text-[#436155] dark:text-[#B9D4C9]">
          {t.settings.aboutDescription}
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {t.settings.aboutFeatures.map((feature, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 rounded-xl bg-[#F8FAF7] dark:bg-[#113529] border border-[#DCE7E0]/80 dark:border-[#1C4B3B] px-3.5 py-2.5 text-xs sm:text-sm text-[#0A251C] dark:text-[#F2F7F4]"
            >
              <CheckCircle2 className="w-4 h-4 text-[#0B4F3A] dark:text-[#E5C366] shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Support the App Section */}
      <section className="rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-lg">
            <div className="flex items-center gap-2.5">
              <Heart className="w-5 h-5 text-[#C59B38] shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-[#0A251C] dark:text-[#F2F7F4]">
                {t.settings.supportTitle}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#436155] dark:text-[#B9D4C9]">
              {t.settings.supportDescription}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSupportOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0B4F3A] hover:bg-[#093F2E] text-white border border-[#C59B38] text-sm font-bold transition-colors shrink-0"
          >
            <Heart className="w-4 h-4 text-[#E5C366]" />
            <span>{t.settings.supportBtn}</span>
          </button>
        </div>

        {supportOpen && (
          <div className="rounded-2xl bg-[#F8FAF7] dark:bg-[#113529] border border-[#DCE7E0] dark:border-[#1C4B3B] p-4 space-y-3">
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => void handleShareApp()}
                className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-xl bg-[#0B4F3A] text-white text-xs sm:text-sm font-semibold hover:bg-[#093F2E] transition-colors"
              >
                <Share2 className="w-4 h-4 text-[#E5C366]" />
                <span>{t.settings.supportShareBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleCopyAppLink()}
                className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] text-xs sm:text-sm font-semibold text-[#0A251C] dark:text-[#F2F7F4]"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-[#059669]" />
                ) : (
                  <Copy className="w-4 h-4 text-[#9A741E] dark:text-[#E5C366]" />
                )}
                <span>
                  {copiedLink ? t.settings.supportCopiedLabel : t.settings.supportCopyLinkBtn}
                </span>
              </button>

              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Support Sakina AI')}`}
                className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] text-xs sm:text-sm font-semibold text-[#0A251C] dark:text-[#F2F7F4]"
              >
                <Mail className="w-4 h-4 text-[#9A741E] dark:text-[#E5C366]" />
                <span>{t.settings.supportContactBtn}</span>
              </a>
            </div>

            <p className="text-xs text-[#436155] dark:text-[#9EC0B2]">
              {t.settings.supportDuaNote}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
