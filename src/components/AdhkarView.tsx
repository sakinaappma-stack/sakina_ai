import React, { useMemo, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { ADHKAR_ITEMS, type AdhkarCategoryId } from '../data/adhkarData';
import type { LanguageCode } from '../types';
import type { UITranslation } from '../i18n/translations';
import { resolveCoreLang } from '../i18n/worldLanguages';

interface AdhkarViewProps {
  language: LanguageCode;
  t: UITranslation;
}

export const AdhkarView: React.FC<AdhkarViewProps> = ({ language, t }) => {
  const [category, setCategory] = useState<AdhkarCategoryId>('morning');
  const [counts, setCounts] = useState<Record<string, number>>({});

  const categories: Array<{ id: AdhkarCategoryId; label: string }> = [
    { id: 'morning', label: t.adhkar.morning },
    { id: 'evening', label: t.adhkar.evening },
    { id: 'afterPrayer', label: t.adhkar.afterPrayer },
    { id: 'sleep', label: t.adhkar.sleep },
    { id: 'quranicDuas', label: t.adhkar.quranicDuas },
  ];

  const items = useMemo(
    () => ADHKAR_ITEMS.filter((item) => item.category === category),
    [category]
  );

  const handleIncrement = (id: string, target: number) => {
    setCounts((prev) => {
      const current = prev[id] || 0;
      if (current >= target) return prev;
      return { ...prev, [id]: current + 1 };
    });
  };

  const resetCurrentCategory = () => {
    setCounts((prev) => {
      const next = { ...prev };
      for (const item of items) {
        delete next[item.id];
      }
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-[#0A251C] dark:text-[#F2F7F4]">
          {t.adhkar.title}
        </h2>
        <button
          type="button"
          onClick={resetCurrentCategory}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] text-xs font-semibold text-[#436155] dark:text-[#9EC0B2] hover:text-[#0B4F3A] dark:hover:text-[#E5C366]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{t.adhkar.resetCategory}</span>
        </button>
      </div>

      {/* Category Switcher */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => {
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-colors border ${
                active
                  ? 'bg-[#0B4F3A] dark:bg-[#19785A] text-white border-transparent'
                  : 'bg-white dark:bg-[#0C2920] text-[#436155] dark:text-[#9EC0B2] border-[#DCE7E0] dark:border-[#1C4B3B] hover:border-[#0B4F3A]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Adhkar Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((item) => {
          const current = counts[item.id] || 0;
          const done = current >= item.count;
          const coreLang = resolveCoreLang(language);
          const translation = coreLang !== 'ar' ? item.translations[coreLang] : '';

          return (
            <div
              key={item.id}
              className={`rounded-2xl p-5 sm:p-6 border flex flex-col justify-between gap-4 transition-colors ${
                done
                  ? 'bg-[#EFF5F1] dark:bg-[#113529] border-[#C59B38] dark:border-[#E5C366]'
                  : 'bg-white dark:bg-[#0C2920] border-[#DCE7E0] dark:border-[#1C4B3B]'
              }`}
            >
              <div className="space-y-3">
                <p
                  dir="rtl"
                  className="font-quran text-2xl leading-[1.9] text-[#0A251C] dark:text-[#F2F7F4]"
                >
                  {item.arabic}
                </p>
                {translation && (
                  <p className="text-sm leading-relaxed text-[#436155] dark:text-[#B9D4C9]">
                    {translation}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[#DCE7E0] dark:border-[#1C4B3B] flex items-center justify-between gap-3">
                <span className="text-xs text-[#436155] dark:text-[#9EC0B2]">
                  {item.source}
                </span>

                <button
                  type="button"
                  onClick={() => handleIncrement(item.id, item.count)}
                  className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl font-semibold text-sm transition-colors tabular-nums shrink-0 ${
                    done
                      ? 'bg-[#C59B38] text-[#061A14]'
                      : 'bg-[#0B4F3A] hover:bg-[#093F2E] text-white'
                  }`}
                >
                  {done ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{t.adhkar.completed}</span>
                    </>
                  ) : (
                    <span>
                      {current} / {item.count} · {t.adhkar.tapToCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
