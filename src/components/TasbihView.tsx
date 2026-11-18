import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { UITranslation } from '../i18n/translations';

interface TasbihViewProps {
  t: UITranslation;
}

const TARGET_OPTIONS = [33, 99, 100, 1000];

export const TasbihView: React.FC<TasbihViewProps> = ({ t }) => {
  const [selectedPhraseIdx, setSelectedPhraseIdx] = useState(0);
  const [target, setTarget] = useState(33);
  const [count, setCount] = useState(0);
  const [sessionTotal, setSessionTotal] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('sakina_tasbih_total') || '0') || 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sakina_tasbih_total', String(sessionTotal));
    } catch {
      // ignore storage errors
    }
  }, [sessionTotal]);

  const phrase = t.tasbih.phrases[selectedPhraseIdx] || t.tasbih.phrases[0];
  const progress = Math.min(count / target, 1);
  const radius = 104;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const handleTap = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12);
    }
    setCount((prev) => (prev + 1 > target ? 1 : prev + 1));
    setSessionTotal((prev) => prev + 1);
  };

  const handleReset = () => {
    setCount(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#0A251C] dark:text-[#F2F7F4]">
            {t.tasbih.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#436155] dark:text-[#9EC0B2] tabular-nums">
            {t.tasbih.totalCount}: <strong className="font-mono-num text-[#0B4F3A] dark:text-[#E5C366]">{sessionTotal.toLocaleString()}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] text-sm font-semibold text-[#436155] dark:text-[#9EC0B2] hover:text-[#0B4F3A] dark:hover:text-[#E5C366]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{t.tasbih.reset}</span>
        </button>
      </div>

      {/* Phrase Selector */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {t.tasbih.phrases.map((item, idx) => {
          const active = idx === selectedPhraseIdx;
          return (
            <button
              key={item.transliteration}
              type="button"
              onClick={() => {
                setSelectedPhraseIdx(idx);
                setCount(0);
              }}
              className={`min-h-[46px] px-4 py-2 rounded-xl font-quran text-lg whitespace-nowrap shrink-0 border transition-colors ${
                active
                  ? 'bg-[#0B4F3A] dark:bg-[#19785A] text-white border-transparent'
                  : 'bg-white dark:bg-[#0C2920] text-[#0A251C] dark:text-[#F2F7F4] border-[#DCE7E0] dark:border-[#1C4B3B] hover:border-[#C59B38]'
              }`}
            >
              {item.arabic}
            </button>
          );
        })}
      </div>

      {/* Interactive Ring */}
      <div className="rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-6 sm:p-10 flex flex-col items-center gap-6">
        <div className="text-center space-y-1">
          <h3 dir="rtl" className="font-quran text-3xl sm:text-4xl font-bold text-[#0B4F3A] dark:text-[#E5C366]">
            {phrase.arabic}
          </h3>
          <p className="text-xs sm:text-sm text-[#436155] dark:text-[#9EC0B2]">
            {phrase.transliteration} · {phrase.meaning}
          </p>
        </div>

        <button
          type="button"
          onClick={handleTap}
          className="relative w-64 h-64 rounded-full flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[#C59B38] active:scale-[0.97] transition-transform duration-100 select-none cursor-pointer"
          aria-label={t.tasbih.tapHint}
        >
          <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90">
            <circle
              cx="120"
              cy="120"
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-[#EFF5F1] dark:text-[#113529]"
              strokeWidth="12"
            />
            <circle
              cx="120"
              cy="120"
              r={radius}
              fill="none"
              stroke="#C59B38"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-150 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono-num text-5xl font-bold text-[#0A251C] dark:text-[#F2F7F4] tabular-nums">
              {count}
            </span>
            <span className="font-mono-num text-sm text-[#436155] dark:text-[#9EC0B2] tabular-nums mt-1">
              / {target}
            </span>
          </div>
        </button>

        <p className="text-xs text-[#436155] dark:text-[#9EC0B2]">{t.tasbih.tapHint}</p>

        {/* Target Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#436155] dark:text-[#9EC0B2]">
            {t.tasbih.targetLabel}:
          </span>
          {TARGET_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setTarget(opt);
                if (count > opt) setCount(0);
              }}
              className={`min-h-[40px] min-w-[48px] px-3 py-1 rounded-xl font-mono-num text-xs font-semibold tabular-nums border transition-colors ${
                target === opt
                  ? 'bg-[#C59B38] text-[#061A14] border-transparent'
                  : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#0A251C] dark:text-[#F2F7F4] border-[#DCE7E0] dark:border-[#1C4B3B]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
