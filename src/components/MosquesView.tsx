import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, RefreshCw } from 'lucide-react';
import type { MosqueItem } from '../types';
import type { UITranslation } from '../i18n/translations';

interface MosquesViewProps {
  cityLat: number;
  cityLng: number;
  cityName: string;
  countryFlag: string;
  t: UITranslation;
}

const COURTYARD_IMAGE = '/src/assets/images/sakina_mosque_courtyard_1795026433990.jpg';

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

function formatWalkMinutes(distanceKm: number): number {
  return Math.max(1, Math.round(distanceKm * 12));
}

function createBlueUserIcon(): L.DivIcon {
  return L.divIcon({
    className: 'sakina-user-pin',
    html: `
      <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
        <span style="position:absolute;inset:0;border-radius:9999px;background:rgba(37,99,235,0.28);transform:scale(1.4);"></span>
        <span style="position:relative;width:16px;height:16px;border-radius:9999px;background:#2563EB;border:3px solid #FFFFFF;box-shadow:0 2px 8px rgba(37,99,235,0.55);"></span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function createGreenMosqueIcon(isSelected = false): L.DivIcon {
  const bg = isSelected ? '#C59B38' : '#059669';
  const border = isSelected ? '#0B4F3A' : '#FFFFFF';
  return L.divIcon({
    className: 'sakina-mosque-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-2px);">
        <div style="width:32px;height:32px;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:${bg};border:2.5px solid ${border};box-shadow:0 3px 8px rgba(0,0,0,0.32);display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);font-size:15px;line-height:1;">🕌</span>
        </div>
      </div>
    `,
    iconSize: [34, 38],
    iconAnchor: [17, 36],
    popupAnchor: [0, -34],
  });
}

async function queryOverpassClientDirect(
  lat: number,
  lng: number,
  radius: number
): Promise<MosqueItem[] | null> {
  const query = `
[out:json][timeout:10];
(
  node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
  way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
  relation["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
);
out center 40;
`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ];

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Accept: 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;

      const json = (await res.json()) as {
        elements?: Array<{
          id: number;
          type: string;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }>;
      };

      const elements = Array.isArray(json.elements) ? json.elements : [];
      const items = elements
        .map((el): MosqueItem | null => {
          const elLat = el.lat ?? el.center?.lat;
          const elLng = el.lon ?? el.center?.lon;
          if (typeof elLat !== 'number' || typeof elLng !== 'number') return null;

          const tags = el.tags || {};
          const name = tags['name:ar'] || tags.name || tags['name:en'] || tags['name:fr'] || '';
          const street = tags['addr:street'] || '';
          const city = tags['addr:city'] || tags['addr:suburb'] || '';
          const address = [street, city].filter(Boolean).join(', ');

          return {
            id: `${el.type}-${el.id}`,
            name,
            lat: elLat,
            lng: elLng,
            distanceKm: haversineKm(lat, lng, elLat, elLng),
            bearing: calculateBearing(lat, lng, elLat, elLng),
            address,
          };
        })
        .filter((m): m is MosqueItem => m !== null)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 30);

      return items;
    } catch {
      clearTimeout(timer);
    }
  }

  return null;
}

export const MosquesView: React.FC<MosquesViewProps> = ({
  cityLat,
  cityLng,
  cityName,
  countryFlag,
  t,
}) => {
  const [mosques, setMosques] = useState<MosqueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [overpassFailed, setOverpassFailed] = useState(false);
  const [expandedNotice, setExpandedNotice] = useState<string | null>(null);
  const [gpsWarning, setGpsWarning] = useState<string | null>(null);
  const [radius, setRadius] = useState(6000);
  const [selectedMosqueId, setSelectedMosqueId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    label: string;
    isGps: boolean;
  }>({
    lat: cityLat,
    lng: cityLng,
    label: cityName,
    isGps: false,
  });
  const [bannerError, setBannerError] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const mosquesLayerRef = useRef<L.LayerGroup | null>(null);
  const mosqueMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const skipNextEffectSearchRef = useRef(false);

  useEffect(() => {
    setCoords({ lat: cityLat, lng: cityLng, label: cityName, isGps: false });
  }, [cityLat, cityLng, cityName]);

  const queryMosquesOnce = async (
    lat: number,
    lng: number,
    searchRadius: number
  ): Promise<{ ok: boolean; items: MosqueItem[] }> => {
    const directItems = await queryOverpassClientDirect(lat, lng, searchRadius);
    if (directItems && directItems.length > 0) {
      return { ok: true, items: directItems };
    }

    try {
      const res = await fetch(`/api/mosques?lat=${lat}&lng=${lng}&radius=${searchRadius}`);
      const data = (await res.json()) as { mosques?: MosqueItem[] };
      if (res.ok && Array.isArray(data.mosques)) {
        if (data.mosques.length > 0) {
          return { ok: true, items: data.mosques };
        }
        return { ok: true, items: [] };
      }
    } catch {
      // fall through
    }

    if (directItems !== null) {
      return { ok: true, items: directItems };
    }

    return { ok: false, items: [] };
  };

  const fetchMosques = async (
    lat: number,
    lng: number,
    searchRadius: number,
    allowAutoExpand = true
  ) => {
    setLoading(true);
    setOverpassFailed(false);
    setSelectedMosqueId(null);
    if (allowAutoExpand) {
      setExpandedNotice(null);
    }

    try {
      const firstTry = await queryMosquesOnce(lat, lng, searchRadius);

      if (firstTry.ok && firstTry.items.length > 0) {
        setMosques(firstTry.items);
        setOverpassFailed(false);
        return;
      }

      // If 0 mosques found in smaller radius (e.g. 6km), auto-expand to 15km with clear notice
      if (allowAutoExpand && searchRadius < 15000) {
        const oldKm = Math.round(searchRadius / 1000);
        setExpandedNotice(`ما لقيناش مساجد في ${oldKm}km، قلبنا في 15km`);
        skipNextEffectSearchRef.current = true;
        setRadius(15000);

        const expandedTry = await queryMosquesOnce(lat, lng, 15000);
        if (expandedTry.ok) {
          setMosques(expandedTry.items);
          setOverpassFailed(false);
          return;
        }
      }

      if (firstTry.ok) {
        setMosques([]);
        setOverpassFailed(false);
      } else {
        setMosques([]);
        setOverpassFailed(true);
      }
    } catch {
      setMosques([]);
      setOverpassFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (skipNextEffectSearchRef.current) {
      skipNextEffectSearchRef.current = false;
      return;
    }
    void fetchMosques(coords.lat, coords.lng, radius, true);
  }, [coords.lat, coords.lng, radius]);

  // Initialize Leaflet + OpenStreetMap once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    userLayerRef.current = L.layerGroup().addTo(map);
    mosquesLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      userLayerRef.current = null;
      mosquesLayerRef.current = null;
    };
  }, []);

  // Render blue location dot whenever coordinates update
  useEffect(() => {
    const map = mapInstanceRef.current;
    const userLayer = userLayerRef.current;
    if (!map || !userLayer) return;

    userLayer.clearLayers();

    L.circle([coords.lat, coords.lng], {
      radius: coords.isGps ? 120 : 250,
      color: '#2563EB',
      weight: 1.5,
      fillColor: '#3B82F6',
      fillOpacity: 0.14,
    }).addTo(userLayer);

    const userLabel = escapeHtml(
      coords.isGps ? t.mosques.myLocationLabel || 'موقعي الحالي' : coords.label
    );

    const userMarker = L.marker([coords.lat, coords.lng], {
      icon: createBlueUserIcon(),
      zIndexOffset: 1000,
    }).addTo(userLayer);

    userMarker.bindPopup(
      `<div style="font-family:Cairo,sans-serif;text-align:center;font-weight:700;color:#1D4ED8;padding:2px 6px;">🔵 ${userLabel}</div>`
    );

    map.setView([coords.lat, coords.lng], coords.isGps ? 15 : 14, { animate: true });
  }, [coords.lat, coords.lng, coords.isGps, coords.label, t.mosques.myLocationLabel]);

  // Render green Overpass mosque pins whenever mosque list updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    const mosquesLayer = mosquesLayerRef.current;
    if (!map || !mosquesLayer) return;

    mosquesLayer.clearLayers();
    mosqueMarkersRef.current.clear();

    if (mosques.length === 0) return;

    const bounds = L.latLngBounds([[coords.lat, coords.lng]]);

    for (const mosque of mosques) {
      const walkMin = formatWalkMinutes(mosque.distanceKm);
      const safeName = escapeHtml(mosque.name || t.mosques.unnamedMosque);
      const safeAddr = mosque.address ? escapeHtml(mosque.address) : '';

      const marker = L.marker([mosque.lat, mosque.lng], {
        icon: createGreenMosqueIcon(mosque.id === selectedMosqueId),
      }).addTo(mosquesLayer);

      marker.bindPopup(`
        <div style="font-family:Cairo,sans-serif;min-width:170px;line-height:1.5;">
          <div style="font-weight:700;color:#0B4F3A;font-size:14px;">🕌 ${safeName}</div>
          ${safeAddr ? `<div style="color:#436155;font-size:12px;">${safeAddr}</div>` : ''}
          <div style="color:#9A741E;font-weight:700;font-size:12px;margin-top:4px;">${mosque.distanceKm.toFixed(
            2
          )} km · ~${walkMin} دقيقة</div>
        </div>
      `);

      marker.on('click', () => {
        setSelectedMosqueId(mosque.id);
      });

      mosqueMarkersRef.current.set(mosque.id, marker);
      bounds.extend([mosque.lat, mosque.lng]);
    }

    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
  }, [mosques, coords.lat, coords.lng, t.mosques.unnamedMosque]);

  // Highlight selected mosque pin
  useEffect(() => {
    for (const [id, marker] of mosqueMarkersRef.current.entries()) {
      marker.setIcon(createGreenMosqueIcon(id === selectedMosqueId));
    }
  }, [selectedMosqueId]);

  const handleFocusMosque = (mosque: MosqueItem) => {
    setSelectedMosqueId(mosque.id);
    const map = mapInstanceRef.current;
    const marker = mosqueMarkersRef.current.get(mosque.id);
    if (map) {
      map.setView([mosque.lat, mosque.lng], 16, { animate: true });
    }
    if (marker) {
      marker.openPopup();
    }
    mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleUseGps = () => {
    setGpsWarning(null);
    setExpandedNotice(null);
    if (!navigator.geolocation) {
      setGpsWarning(t.mosques.errorState);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const sameCoords =
          Math.abs(coords.lat - lat) < 1e-6 && Math.abs(coords.lng - lng) < 1e-6;
        setCoords({
          lat,
          lng,
          label: t.mosques.myLocationLabel || 'موقعي الحالي GPS',
          isGps: true,
        });
        if (sameCoords) {
          void fetchMosques(lat, lng, radius, true);
        }
      },
      () => {
        setGpsWarning(t.mosques.errorState);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Retry strictly re-searches mosques for the active coordinates (does NOT reset GPS)
  const handleRetrySearchMosques = () => {
    setGpsWarning(null);
    void fetchMosques(coords.lat, coords.lng, radius, true);
  };

  return (
    <div className="space-y-5">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-[#072C21] text-white border border-[#1B5742]">
        {!bannerError && (
          <img
            src={COURTYARD_IMAGE}
            alt={t.mosques.title}
            referrerPolicy="no-referrer"
            onError={() => setBannerError(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#06241B] via-[#06241B]/75 to-[#06241B]/45"
        />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{t.mosques.title}</h2>
            <p className="text-sm text-[#DCEFE7]">
              {t.mosques.subtitle} · {countryFlag} {coords.label}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleUseGps}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-[#C59B38] hover:bg-[#B2892A] text-[#061A14] text-sm font-bold transition-colors whitespace-nowrap shrink-0"
            >
              <Navigation className="w-4 h-4" />
              <span>{t.mosques.useMyLocation}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setGpsWarning(null);
                setExpandedNotice(null);
                setCoords({ lat: cityLat, lng: cityLng, label: cityName, isGps: false });
              }}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-medium backdrop-blur-sm transition-colors whitespace-nowrap shrink-0"
            >
              <MapPin className="w-4 h-4" />
              <span>{t.mosques.searchCurrentCity}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Radius & Retry Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#436155] dark:text-[#9EC0B2]">
            {t.mosques.radiusLabel}:
          </span>
          {[3000, 6000, 15000].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setExpandedNotice(null);
                setRadius(r);
              }}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl font-mono-num text-xs font-semibold tabular-nums border transition-colors ${
                radius === r
                  ? 'bg-[#0B4F3A] text-white border-transparent'
                  : 'bg-white dark:bg-[#0C2920] text-[#436155] dark:text-[#9EC0B2] border-[#DCE7E0] dark:border-[#1C4B3B]'
              }`}
            >
              {r / 1000} km
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleRetrySearchMosques}
          disabled={loading}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] text-xs font-semibold text-[#0B4F3A] dark:text-[#E5C366]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t.quran.retry}</span>
        </button>
      </div>

      {/* Embedded Interactive Leaflet + OpenStreetMap Map */}
      <div className="rounded-3xl overflow-hidden border border-[#DCE7E0] dark:border-[#1C4B3B] bg-white dark:bg-[#0C2920] shadow-sm">
        <div
          ref={mapContainerRef}
          className="w-full h-[360px] sm:h-[430px] relative z-0"
          dir="ltr"
        />
        <div className="px-4 py-2.5 border-t border-[#DCE7E0] dark:border-[#1C4B3B] flex flex-wrap items-center justify-between gap-2 text-xs text-[#436155] dark:text-[#9EC0B2]">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#2563EB] border-2 border-white shadow-xs inline-block" />
              <span>{t.mosques.myLocationLabel || 'موقعي الحالي'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#059669] text-[10px]">
                🕌
              </span>
              <span>{t.mosques.title}</span>
            </span>
          </div>
          {loading && (
            <span className="font-semibold text-[#0B4F3A] dark:text-[#E5C366]">
              {t.mosques.searching}
            </span>
          )}
        </div>
      </div>

      {gpsWarning && (
        <div className="rounded-2xl bg-amber-50 dark:bg-[#113529] border border-[#C59B38]/60 px-4 py-3 text-xs sm:text-sm text-[#0A251C] dark:text-[#F2F7F4]">
          {gpsWarning}
        </div>
      )}

      {expandedNotice && (
        <div className="rounded-2xl bg-[#EFF5F1] dark:bg-[#113529] border border-[#C59B38]/70 px-4 py-3 text-xs sm:text-sm font-semibold text-[#0B4F3A] dark:text-[#E5C366]">
          {expandedNotice}
        </div>
      )}

      {/* In-app Retry card when Overpass fails or returns empty */}
      {!loading && (overpassFailed || mosques.length === 0) && (
        <div className="rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-6 sm:p-8 text-center space-y-4">
          <p className="text-sm text-[#436155] dark:text-[#9EC0B2]">
            {overpassFailed ? t.mosques.errorState : t.mosques.emptyState}
          </p>
          <button
            type="button"
            onClick={handleRetrySearchMosques}
            className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-[#0B4F3A] hover:bg-[#093F2E] text-white text-sm font-bold border border-[#C59B38] transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-[#E5C366]" />
            <span>{t.quran.retry}</span>
          </button>
        </div>
      )}

      {/* Summary + Mosque List with Distance in km & walking minutes */}
      {!loading && !overpassFailed && mosques.length > 0 && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base sm:text-lg font-bold text-[#0A251C] dark:text-[#F2F7F4]">
              تم العثور على {mosques.length} مسجد
            </h3>
            <span className="font-mono-num text-xs text-[#436155] dark:text-[#9EC0B2]">
              {radius / 1000} km
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {mosques.map((mosque) => {
              const walkMin = formatWalkMinutes(mosque.distanceKm);
              const active = mosque.id === selectedMosqueId;

              return (
                <div
                  key={mosque.id}
                  onClick={() => handleFocusMosque(mosque)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleFocusMosque(mosque);
                    }
                  }}
                  className={`rounded-2xl bg-white dark:bg-[#0C2920] border p-5 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                    active
                      ? 'border-[#C59B38] ring-1 ring-[#C59B38]'
                      : 'border-[#DCE7E0] dark:border-[#1C4B3B] hover:border-[#0B4F3A] dark:hover:border-[#E5C366]'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <h4 className="font-bold text-base text-[#0A251C] dark:text-[#F2F7F4] truncate flex items-center gap-1.5">
                      <span aria-hidden="true">🕌</span>
                      <span className="truncate">{mosque.name || t.mosques.unnamedMosque}</span>
                    </h4>
                    {mosque.address && (
                      <p className="text-xs text-[#436155] dark:text-[#9EC0B2] truncate">
                        {mosque.address}
                      </p>
                    )}
                    <p className="text-xs text-[#9A741E] dark:text-[#E5C366] font-mono-num tabular-nums">
                      {mosque.distanceKm.toFixed(2)} km · ~{walkMin} دقيقة مشي
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFocusMosque(mosque);
                    }}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-[#EFF5F1] dark:bg-[#113529] hover:bg-[#0B4F3A] hover:text-white text-[#0B4F3A] dark:text-[#E5C366] text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{t.mosques.showOnMap || t.mosques.openMap}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
