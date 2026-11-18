import React, { useState } from 'react';
import { Bell, Download, WifiOff, X } from 'lucide-react';
import type { UITranslation } from '../i18n/translations';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWA';

interface PWAInstallButtonProps {
  t: UITranslation;
  variant?: 'hero' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ t, variant = 'hero' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          variant === 'hero'
            ? 'inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-[#C59B38] hover:bg-[#B2892A] text-xs sm:text-sm font-bold text-[#061A14] transition-colors whitespace-nowrap shrink-0'
            : 'inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-[#0B4F3A] hover:bg-[#093F2E] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{t.pwa.installApp}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            variant === 'hero'
              ? 'inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-[#C59B38] hover:bg-[#B2892A] text-xs sm:text-sm font-bold text-[#061A14] transition-colors whitespace-nowrap shrink-0'
              : 'inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-[#0B4F3A] hover:bg-[#093F2E] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0'
          }
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>{t.pwa.installOnIos}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-6 shadow-xl space-y-4 text-start"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-[#0A251C] dark:text-[#F2F7F4]">
                  {t.pwa.iosTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label={t.pwa.close}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-[#436155] dark:text-[#9EC0B2]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#436155] dark:text-[#9EC0B2] whitespace-pre-line leading-relaxed">
                {t.pwa.iosInstructions}
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full min-h-[44px] rounded-xl bg-[#0B4F3A] text-white text-sm font-bold"
              >
                {t.pwa.close}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC<{ t: UITranslation }> = ({ t }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-[#9A741E] text-white border-b border-[#C59B38]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>{t.pwa.offlineBadge}</span>
      </div>
    </div>
  );
};

interface NotificationPermissionBannerProps {
  permission: NotificationPermission | 'unsupported';
  dismissed: boolean;
  onRequestPermission: () => void;
  onDismiss: () => void;
  t: UITranslation;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({
  permission,
  dismissed,
  onRequestPermission,
  onDismiss,
  t,
}) => {
  if (permission !== 'default' || dismissed) {
    return null;
  }

  return (
    <section className="rounded-2xl bg-[#EFF5F1] dark:bg-[#0E3A2C] border border-[#C59B38]/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0B4F3A] text-[#E5C366] flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-[#0A251C] dark:text-[#F2F7F4]">
            {t.pwa.prayerAlertPromptTitle}
          </h3>
          <p className="text-xs sm:text-sm text-[#436155] dark:text-[#BCE0D2]">
            {t.pwa.prayerAlertPromptDesc}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#113529] border border-[#DCE7E0] dark:border-[#1C4B3B] text-xs font-semibold text-[#436155] dark:text-[#9EC0B2]"
        >
          {t.pwa.notNow}
        </button>
        <button
          type="button"
          onClick={onRequestPermission}
          className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0B4F3A] hover:bg-[#093F2E] text-white text-xs sm:text-sm font-bold border border-[#C59B38] transition-colors whitespace-nowrap"
        >
          {t.pwa.enableAlertsBtn}
        </button>
      </div>
    </section>
  );
};
