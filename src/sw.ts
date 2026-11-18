import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

interface SwWindowClient {
  url: string;
  focused: boolean;
  focus?: () => Promise<SwWindowClient>;
  postMessage: (message: unknown) => void;
}

interface SwNotification {
  data?: {
    url?: string;
    prayerKey?: string;
    muezzin?: string;
    cityName?: string;
    alertType?: string;
  };
  close: () => void;
}

interface SwPushEvent extends Event {
  data?: {
    json: () => unknown;
    text: () => string;
  };
  waitUntil: (promise: Promise<unknown>) => void;
}

interface SwNotificationClickEvent extends Event {
  notification: SwNotification;
  waitUntil: (promise: Promise<unknown>) => void;
}

interface SwExtendableEvent extends Event {
  tag?: string;
  waitUntil: (promise: Promise<unknown>) => void;
}

interface ScheduleTestAdhanPayload {
  targetMs: number;
  cityName: string;
  language: string;
  muezzin: string;
  tag: string;
}

interface SwMessageEvent extends Event {
  data?: {
    type?: string;
    payload?: StoredNotificationConfig | ScheduleTestAdhanPayload;
  };
}

interface SwRegistration {
  showNotification: (title: string, options?: Record<string, unknown>) => Promise<void>;
  getNotifications: (filter?: { tag?: string }) => Promise<SwNotification[]>;
  periodicSync?: {
    register: (tag: string, options: { minInterval: number }) => Promise<void>;
  };
}

interface SwGlobalScope {
  __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>;
  registration: SwRegistration;
  clients: {
    matchAll: (options: { type: string; includeUncontrolled?: boolean }) => Promise<SwWindowClient[]>;
    openWindow: (url: string) => Promise<SwWindowClient | null>;
  };
  skipWaiting: () => Promise<void>;
  addEventListener: (type: string, listener: (event: Event) => void) => void;
}

interface StoredPrayerDay {
  dateKey: string;
  fajrMs: number;
  dhuhrMs: number;
  asrMs: number;
  maghribMs: number;
  ishaMs: number;
}

interface StoredNotificationConfig {
  cityName: string;
  language: string;
  enabledPrayers: Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', boolean>;
  preAdhanAlert10Min: boolean;
  schedule30Days: StoredPrayerDay[];
}

const sw = self as unknown as SwGlobalScope;

sw.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute((self as unknown as SwGlobalScope).__WB_MANIFEST);

// Cache Google Fonts stylesheets & webfonts
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'sakina-google-fonts-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// Cache selected Adhan audio locally for full offline Adhan playback
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/audio/adhan/'),
  new CacheFirst({
    cacheName: 'sakina-adhan-audio-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// Cache countries & cities offline
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/locations/'),
  new StaleWhileRevalidate({
    cacheName: 'sakina-locations-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

// Cache Quran Surah list and visited Surahs offline
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/quran/'),
  new NetworkFirst({
    cacheName: 'sakina-quran-v1',
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 130, maxAgeSeconds: 60 * 60 * 24 * 60 }),
    ],
  })
);

// IndexedDB helper for offline background notifications
const IDB_NAME = 'sakina-offline-db';
const IDB_STORE = 'state';

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openOfflineDb();
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore storage errors
  }
}

const PRAYER_LABELS_AR: Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

const PRAYER_LABELS_EN: Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

async function scheduleLocalTriggerNotifications(config: StoredNotificationConfig) {
  await idbSet('notificationConfig', config);

  const TriggerCtor = (globalThis as unknown as { TimestampTrigger?: new (ts: number) => unknown })
    .TimestampTrigger;
  const nowMs = Date.now();
  const prayerKeys: Array<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'> = [
    'fajr',
    'dhuhr',
    'asr',
    'maghrib',
    'isha',
  ];

  if (TriggerCtor && typeof sw.registration.showNotification === 'function') {
    try {
      const existing = await sw.registration.getNotifications();
      for (const n of existing) {
        if (n.data?.prayerKey) {
          n.close();
        }
      }
    } catch {
      // ignore
    }

    const horizonMs = nowMs + 48 * 60 * 60 * 1000;
    const isArabic = config.language === 'ar' || config.language === 'ur';

    for (const day of config.schedule30Days || []) {
      for (const pKey of prayerKeys) {
        if (!config.enabledPrayers?.[pKey]) continue;
        const targetMs = day[`${pKey}Ms`];
        if (!Number.isFinite(targetMs) || targetMs <= nowMs + 5000 || targetMs > horizonMs) {
          continue;
        }
        const pName = isArabic ? PRAYER_LABELS_AR[pKey] : PRAYER_LABELS_EN[pKey];
        const body = isArabic
          ? `حان الآن وقت صلاة ${pName} - ${config.cityName}`
          : `Time for ${pName} prayer - ${config.cityName}`;

        try {
          await sw.registration.showNotification('السكينة AI', {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `adhan-${day.dateKey}-${pKey}`,
            renotify: true,
            requireInteraction: true,
            vibrate: [300, 150, 300],
            showTrigger: new TriggerCtor(targetMs),
            data: {
              url: `/?playAdhan=${pKey}`,
              prayerKey: pKey,
              cityName: config.cityName,
              alertType: 'adhan',
            },
          });
        } catch {
          // TimestampTrigger unsupported in this browser runtime
        }

        if (config.preAdhanAlert10Min) {
          const preMs = targetMs - 10 * 60 * 1000;
          if (preMs > nowMs + 5000) {
            const preBody = isArabic
              ? `باقي 10 دقائق على صلاة ${pName} - ${config.cityName}`
              : `10 minutes left until ${pName} - ${config.cityName}`;
            try {
              await sw.registration.showNotification('السكينة AI', {
                body: preBody,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: `pre10-${day.dateKey}-${pKey}`,
                showTrigger: new TriggerCtor(preMs),
                data: {
                  url: '/',
                  prayerKey: pKey,
                  cityName: config.cityName,
                  alertType: 'pre-alert',
                },
              });
            } catch {
              // ignore
            }
          }
        }
      }
    }
  }

  try {
    if (sw.registration.periodicSync) {
      await sw.registration.periodicSync.register('sakina-prayer-check', {
        minInterval: 15 * 60 * 1000,
      });
    }
  } catch {
    // periodicSync requires installed PWA / permission
  }
}

async function checkOfflineDuePrayers() {
  const config = await idbGet<StoredNotificationConfig>('notificationConfig');
  if (!config || !Array.isArray(config.schedule30Days)) return;

  const fired = (await idbGet<string[]>('firedKeys')) || [];
  const nowMs = Date.now();
  const prayerKeys: Array<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'> = [
    'fajr',
    'dhuhr',
    'asr',
    'maghrib',
    'isha',
  ];
  const isArabic = config.language === 'ar' || config.language === 'ur';
  let changed = false;

  for (const day of config.schedule30Days) {
    for (const pKey of prayerKeys) {
      if (!config.enabledPrayers?.[pKey]) continue;
      const targetMs = day[`${pKey}Ms`];
      if (!Number.isFinite(targetMs)) continue;

      const diff = nowMs - targetMs;
      const tag = `adhan-${day.dateKey}-${pKey}`;
      if (diff >= -5000 && diff <= 5 * 60 * 1000 && !fired.includes(tag)) {
        fired.push(tag);
        changed = true;
        const pName = isArabic ? PRAYER_LABELS_AR[pKey] : PRAYER_LABELS_EN[pKey];
        const body = isArabic
          ? `حان الآن وقت صلاة ${pName} - ${config.cityName}`
          : `Time for ${pName} prayer - ${config.cityName}`;

        await sw.registration.showNotification('السكينة AI', {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag,
          renotify: true,
          requireInteraction: true,
          vibrate: [300, 150, 300],
          data: {
            url: `/?playAdhan=${pKey}`,
            prayerKey: pKey,
            cityName: config.cityName,
            alertType: 'adhan',
          },
        });
      }
    }
  }

  if (changed) {
    await idbSet('firedKeys', fired.slice(-120));
  }
}

async function scheduleTestAdhanNotification(payload: ScheduleTestAdhanPayload) {
  const TriggerCtor = (globalThis as unknown as { TimestampTrigger?: new (ts: number) => unknown })
    .TimestampTrigger;
  if (!TriggerCtor || typeof sw.registration.showNotification !== 'function') return;

  const isArabic = payload.language === 'ar' || payload.language === 'ur';
  const body = isArabic
    ? `حان الآن وقت أذان (الأذان المغربي) - ${payload.cityName}`
    : `Time for Adhan (Moroccan Adhan) - ${payload.cityName}`;

  try {
    await sw.registration.showNotification('السكينة AI', {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: payload.tag || `test-adhan-${payload.targetMs}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 150, 300],
      showTrigger: new TriggerCtor(payload.targetMs),
      data: {
        url: `/?playAdhan=test&muezzin=${encodeURIComponent(
          payload.muezzin || 'moroccan'
        )}&city=${encodeURIComponent(payload.cityName)}`,
        prayerKey: 'test',
        muezzin: payload.muezzin || 'moroccan',
        cityName: payload.cityName,
        alertType: 'adhan',
      },
    });
  } catch {
    // TimestampTrigger unsupported in this browser runtime
  }
}

sw.addEventListener('message', (event: Event) => {
  const msgEvent = event as SwMessageEvent;
  if (msgEvent.data?.type === 'SKIP_WAITING') {
    sw.skipWaiting();
    return;
  }
  if (msgEvent.data?.type === 'SCHEDULE_PRAYERS' && msgEvent.data.payload) {
    scheduleLocalTriggerNotifications(msgEvent.data.payload as StoredNotificationConfig);
    return;
  }
  if (msgEvent.data?.type === 'SCHEDULE_TEST_ADHAN' && msgEvent.data.payload) {
    scheduleTestAdhanNotification(msgEvent.data.payload as ScheduleTestAdhanPayload);
  }
});

sw.addEventListener('periodicsync', (event: Event) => {
  const syncEvent = event as SwExtendableEvent;
  if (syncEvent.tag === 'sakina-prayer-check') {
    syncEvent.waitUntil(checkOfflineDuePrayers());
  }
});

sw.addEventListener('push', (event: Event) => {
  const pushEvent = event as SwPushEvent;
  let data: {
    title?: string;
    body?: string;
    prayerKey?: string;
    muezzin?: string;
    cityName?: string;
    alertType?: string;
    url?: string;
    tag?: string;
  } = {};

  try {
    if (pushEvent.data) {
      data = pushEvent.data.json() as typeof data;
    }
  } catch {
    data = {
      title: 'السكينة AI',
      body: pushEvent.data?.text() || 'حان الآن وقت الصلاة',
    };
  }

  const title = data.title || 'السكينة AI';
  const muezzinQuery = data.muezzin ? `&muezzin=${encodeURIComponent(data.muezzin)}` : '';
  const options: Record<string, unknown> = {
    body: data.body || 'حان الآن وقت الصلاة',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || `sakina-push-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 150, 300],
    data: {
      url: data.url || (data.prayerKey ? `/?playAdhan=${data.prayerKey}${muezzinQuery}` : '/'),
      prayerKey: data.prayerKey || 'fajr',
      muezzin: data.muezzin || '',
      cityName: data.cityName || '',
      alertType: data.alertType || 'adhan',
    },
  };

  pushEvent.waitUntil(sw.registration.showNotification(title, options));
});

sw.addEventListener('notificationclick', (event: Event) => {
  const clickEvent = event as SwNotificationClickEvent;
  clickEvent.notification.close();

  const data = clickEvent.notification.data || {};
  const prayerKey = data.prayerKey || 'fajr';
  const muezzin = data.muezzin || '';
  const cityName = data.cityName || '';
  const alertType = data.alertType || 'adhan';
  const muezzinQuery = muezzin ? `&muezzin=${encodeURIComponent(muezzin)}` : '';
  const targetUrl =
    data.url ||
    (alertType === 'adhan'
      ? `/?playAdhan=${encodeURIComponent(prayerKey)}${muezzinQuery}&city=${encodeURIComponent(cityName)}`
      : '/');

  clickEvent.waitUntil(
    sw.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (windowClients) => {
        for (const client of windowClients) {
          if (client.focus) {
            const focused = await client.focus();
            focused.postMessage({
              type: 'PLAY_ADHAN',
              prayerKey,
              muezzin,
              cityName,
              alertType,
            });
            return;
          }
        }
        await sw.clients.openWindow(targetUrl);
      })
  );
});
