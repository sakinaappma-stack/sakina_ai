import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Pause,
  Play,
  Plus,
  Search,
  Volume2,
} from 'lucide-react';
import type { LanguageCode, ReciterId, SurahDetail, SurahMeta } from '../types';
import type { UITranslation } from '../i18n/translations';
import { RECITERS } from '../utils/prayerUtils';

interface QuranViewProps {
  language: LanguageCode;
  fontSize: number;
  reciterId: ReciterId;
  onChangeReciter: (reciterId: ReciterId) => void;
  onChangeFontSize: (next: number) => void;
  t: UITranslation;
}

export const QuranView: React.FC<QuranViewProps> = ({
  language,
  fontSize,
  reciterId,
  onChangeReciter,
  onChangeFontSize,
  t,
}) => {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedSurahNum, setSelectedSurahNum] = useState<number | null>(null);
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [surahError, setSurahError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeReciter = useMemo(
    () => RECITERS.find((r) => r.id === reciterId) || RECITERS[0],
    [reciterId]
  );

  const loadSurahs = async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await fetch('/api/quran/surahs');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load surahs');
      setSurahs(data.surahs || []);
    } catch (err) {
      setListError(err instanceof Error ? err.message : t.quran.errorLoad);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadSurahs();
  }, []);

  const loadSurahDetail = async (num: number, lang: LanguageCode) => {
    setLoadingSurah(true);
    setSurahError(null);
    try {
      const res = await fetch(`/api/quran/surah/${num}?lang=${lang}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.quran.errorLoad);
      setSurahDetail(data);
    } catch (err) {
      setSurahError(err instanceof Error ? err.message : t.quran.errorLoad);
    } finally {
      setLoadingSurah(false);
    }
  };

  useEffect(() => {
    if (selectedSurahNum !== null) {
      loadSurahDetail(selectedSurahNum, language);
    }
  }, [selectedSurahNum, language]);

  // Seamlessly switch audio source when reciter changes
  useEffect(() => {
    if (!audioRef.current || !surahDetail) return;
    const wasPlaying = isPlaying;
    audioRef.current.pause();
    audioRef.current.src = activeReciter.buildUrl(surahDetail.number);
    audioRef.current.load();
    setAudioError(null);
    if (wasPlaying) {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [reciterId, surahDetail?.number]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handleOpenSurah = (num: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setAudioError(null);
    setSelectedSurahNum(num);
  };

  const togglePlayAudio = () => {
    if (!audioRef.current || !surahDetail) return;
    setAudioError(null);
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
          setAudioError(t.quran.errorLoad);
        });
    }
  };

  const filteredSurahs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        String(s.number) === q
    );
  }, [surahs, searchQuery]);

  const isRtl = language === 'ar' || language === 'ur';

  const reciterBar = (
    <div className="rounded-2xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-3 sm:p-4 space-y-2.5">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#436155] dark:text-[#9EC0B2]">
        <Volume2 className="w-4 h-4 text-[#9A741E] dark:text-[#E5C366]" />
        <span>{t.quran.selectReciter}</span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
        {RECITERS.map((reciter) => {
          const active = reciter.id === reciterId;
          const label = language === 'ar' || language === 'ur' ? reciter.arabicName : reciter.latinName;
          return (
            <button
              key={reciter.id}
              type="button"
              onClick={() => onChangeReciter(reciter.id)}
              className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                active
                  ? 'bg-[#0B4F3A] dark:bg-[#19785A] text-white border-[#C59B38]'
                  : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#0A251C] dark:text-[#F2F7F4] border-[#DCE7E0] dark:border-[#1C4B3B] hover:border-[#C59B38]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (selectedSurahNum !== null) {
    const activeAudioUrl = activeReciter.buildUrl(selectedSurahNum);
    const activeReciterLabel =
      language === 'ar' || language === 'ur' ? activeReciter.arabicName : activeReciter.latinName;

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.pause();
                setIsPlaying(false);
              }
              setSelectedSurahNum(null);
              setSurahDetail(null);
            }}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] text-sm font-semibold text-[#0B4F3A] dark:text-[#E5C366] hover:bg-[#EFF5F1] dark:hover:bg-[#113529] transition-colors"
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{t.quran.backToSurahs}</span>
          </button>

          <div className="flex items-center gap-2 bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] rounded-xl px-3 py-1">
            <span className="text-xs text-[#436155] dark:text-[#9EC0B2]">{t.quran.fontSize}</span>
            <button
              type="button"
              aria-label="Decrease font size"
              onClick={() => onChangeFontSize(Math.max(20, fontSize - 2))}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-[#EFF5F1] dark:hover:bg-[#113529]"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-mono-num text-xs font-semibold tabular-nums w-6 text-center">
              {fontSize}
            </span>
            <button
              type="button"
              aria-label="Increase font size"
              onClick={() => onChangeFontSize(Math.min(40, fontSize + 2))}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-[#EFF5F1] dark:hover:bg-[#113529]"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Easy Reciter Switcher inside Reader */}
        {reciterBar}

        {loadingSurah && (
          <div className="rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-12 text-center text-[#436155] dark:text-[#9EC0B2]">
            {t.quran.loadingAyahs}
          </div>
        )}

        {surahError && !loadingSurah && (
          <div className="rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-8 text-center space-y-4">
            <p className="text-sm text-red-600 dark:text-red-400">{surahError}</p>
            <button
              type="button"
              onClick={() => loadSurahDetail(selectedSurahNum, language)}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#0B4F3A] text-white text-sm font-semibold"
            >
              {t.quran.retry}
            </button>
          </div>
        )}

        {surahDetail && !loadingSurah && (
          <div className="space-y-5">
            {/* Surah Header + Audio */}
            <div className="rounded-3xl bg-[#0B4F3A] dark:bg-[#0E3A2C] text-white p-6 sm:p-7 border border-[#17684E] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="font-quran text-3xl sm:text-4xl font-bold text-white">
                  {language === 'ar' ? surahDetail.name : `${surahDetail.englishName} · ${surahDetail.name}`}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#DCEFE7]">
                  <span>{surahDetail.revelationType === 'Meccan' ? t.quran.meccan : t.quran.medinan}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{surahDetail.numberOfAyahs} {t.quran.ayahsCount}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#E5C366]">{activeReciterLabel}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <audio
                  ref={audioRef}
                  src={activeAudioUrl}
                  onEnded={() => setIsPlaying(false)}
                  onError={() => {
                    setIsPlaying(false);
                    setAudioError(t.quran.errorLoad);
                  }}
                  preload="none"
                />
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  className="inline-flex items-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl bg-[#C59B38] hover:bg-[#B2892A] text-[#061A14] font-bold text-sm transition-colors whitespace-nowrap shrink-0"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? t.quran.pauseRecitation : t.quran.playRecitation}</span>
                </button>
              </div>
            </div>

            {audioError && (
              <p className="text-xs text-red-600 dark:text-red-400 px-1">{audioError}</p>
            )}

            {/* Bismillah */}
            {surahDetail.number !== 1 && surahDetail.number !== 9 && (
              <div className="text-center py-4 font-quran text-2xl sm:text-3xl text-[#0B4F3A] dark:text-[#E5C366]">
                {t.quran.bismillah}
              </div>
            )}

            {/* Ayahs */}
            <div className="rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] divide-y divide-[#DCE7E0] dark:divide-[#1C4B3B]">
              {surahDetail.ayahs.map((ayah) => (
                <article key={ayah.number} className="p-5 sm:p-7 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono-num text-xs font-semibold text-[#9A741E] dark:text-[#E5C366] tabular-nums shrink-0 pt-2">
                      {surahDetail.number}:{ayah.numberInSurah}
                    </span>
                    <p
                      dir="rtl"
                      style={{ fontSize: `${fontSize}px`, lineHeight: 2.05 }}
                      className="font-quran text-right text-[#0A251C] dark:text-[#F2F7F4] flex-1"
                    >
                      {ayah.arabicText}{' '}
                      <span className="text-[#9A741E] dark:text-[#E5C366] font-normal select-none">
                        ﴿{ayah.numberInSurah.toLocaleString('ar-EG')}﴾
                      </span>
                    </p>
                  </div>
                  {ayah.translatedText && (
                    <p className="text-sm sm:text-base leading-relaxed text-[#436155] dark:text-[#B9D4C9] pt-1">
                      {ayah.translatedText}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#0A251C] dark:text-[#F2F7F4]">
            {t.quran.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#436155] dark:text-[#9EC0B2]">
            {t.quran.translationLabel}
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#436155] dark:text-[#9EC0B2] absolute top-1/2 -translate-y-1/2 start-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.quran.searchSurah}
            className="w-full min-h-[46px] ps-10 pe-4 py-2 rounded-xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] text-sm text-[#0A251C] dark:text-[#F2F7F4] focus:outline-none focus:border-[#0B4F3A] dark:focus:border-[#E5C366]"
          />
        </div>
      </div>

      {/* Prominent Easy Reciter Selection */}
      {reciterBar}

      {loadingList && (
        <div className="rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-12 text-center text-[#436155] dark:text-[#9EC0B2]">
          {t.quran.loadingSurahs}
        </div>
      )}

      {listError && !loadingList && (
        <div className="rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-8 text-center space-y-3">
          <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
          <button
            type="button"
            onClick={loadSurahs}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#0B4F3A] text-white text-sm font-semibold"
          >
            {t.quran.retry}
          </button>
        </div>
      )}

      {!loadingList && !listError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSurahs.map((surah) => (
            <button
              key={surah.number}
              type="button"
              onClick={() => handleOpenSurah(surah.number)}
              className="rounded-2xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] hover:border-[#C59B38] dark:hover:border-[#E5C366] p-4 flex items-center justify-between gap-3 text-start transition-colors min-h-[72px]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-[#EFF5F1] dark:bg-[#113529] text-[#0B4F3A] dark:text-[#E5C366] font-mono-num text-sm font-bold flex items-center justify-center shrink-0 tabular-nums">
                  {surah.number}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-base text-[#0A251C] dark:text-[#F2F7F4] truncate">
                    {language === 'ar' ? surah.name : surah.englishName}
                  </p>
                  <p className="text-xs text-[#436155] dark:text-[#9EC0B2] truncate">
                    {surah.revelationType === 'Meccan' ? t.quran.meccan : t.quran.medinan} · {surah.numberOfAyahs} {t.quran.ayahsCount}
                  </p>
                </div>
              </div>
              <span className="font-quran text-xl text-[#0B4F3A] dark:text-[#E5C366] shrink-0" dir="rtl">
                {surah.name.replace('سُورَةُ ', '')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
