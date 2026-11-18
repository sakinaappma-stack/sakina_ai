import React from 'react';
import {
  BookOpen,
  Compass,
  HandHeart,
  Home,
  MapPin,
  Orbit,
  Settings,
  Sparkles,
} from 'lucide-react';
import type { TabId } from '../types';
import type { UITranslation } from '../i18n/translations';

interface BottomNavProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  t: UITranslation;
}

const NAV_ITEMS: Array<{ id: TabId; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'home', icon: Home },
  { id: 'quran', icon: BookOpen },
  { id: 'adhkar', icon: HandHeart },
  { id: 'ai', icon: Sparkles },
  { id: 'qibla', icon: Compass },
  { id: 'tasbih', icon: Orbit },
  { id: 'mosques', icon: MapPin },
  { id: 'settings', icon: Settings },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab, t }) => {
  return (
    <nav
      aria-label="Primary Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#DCE7E0] dark:border-[#1C4B3B] bg-white/95 dark:bg-[#061A14]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-8 items-center h-16 px-1 sm:px-3">
        {NAV_ITEMS.map(({ id, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center min-h-[48px] min-w-[40px] px-0.5 rounded-xl transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C59B38] ${
                isActive
                  ? 'text-[#0B4F3A] dark:text-[#E5C366]'
                  : 'text-[#436155] dark:text-[#9EC0B2] hover:text-[#0A251C] dark:hover:text-[#F2F7F4]'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0.5 w-6 h-0.5 rounded-full bg-[#C59B38] dark:bg-[#E5C366]"
                />
              )}
              <Icon
                className={`w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0 transition-transform duration-150 ${
                  isActive ? 'scale-105 stroke-[2.2]' : 'stroke-[1.75]'
                }`}
              />
              <span className="mt-1 text-[9.5px] sm:text-[11px] font-medium leading-none tracking-tight whitespace-nowrap truncate max-w-full">
                {t.nav[id]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
