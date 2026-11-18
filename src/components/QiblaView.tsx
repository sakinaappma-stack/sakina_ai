import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Info, Map as MapIcon } from 'lucide-react';
import type { LanguageCode } from '../types';
import type { UITranslation } from '../i18n/translations';

interface QiblaViewProps {
  qiblaAngle: number;
  distanceToKaabaKm: number;
  cityLat: number;
  cityLng: number;
  cityName: string;
  countryFlag: string;
  language: LanguageCode;
  t: UITranslation;
}

const KAABA_LAT = 21.422487;
const KAABA_LNG = 39.826206;

function getCardinalLabel(angleDeg: number, lang: LanguageCode): string {
  const norm = ((angleDeg % 360) + 360) % 360;
  const idx = Math.round(norm / 45) % 8;
  const labelsAr = ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب'];
  const labelsFr = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
  const labelsEn = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  if (lang === 'ar' || lang === 'ur') return labelsAr[idx];
  if (lang === 'fr') return labelsFr[idx];
  return labelsEn[idx];
}

// Compute great-circle intermediate points from user location to Kaaba
function computeGeodesicPoints(
  lat1Deg: number,
  lon1Deg: number,
  lat2Deg: number,
  lon2Deg: number,
  steps = 48
): Array<[number, number]> {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const phi1 = toRad(lat1Deg);
  const lam1 = toRad(lon1Deg);
  const phi2 = toRad(lat2Deg);
  const lam2 = toRad(lon2Deg);

  const dPhi = phi2 - phi1;
  const dLam = lam2 - lam1;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) * Math.sin(dLam / 2);
  const delta = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (delta < 1e-6) {
    return [
      [lat1Deg, lon1Deg],
      [lat2Deg, lon2Deg],
    ];
  }

  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * delta) / Math.sin(delta);
    const B = Math.sin(f * delta) / Math.sin(delta);
    const x = A * Math.cos(phi1) * Math.cos(lam1) + B * Math.cos(phi2) * Math.cos(lam2);
    const y = A * Math.cos(phi1) * Math.sin(lam1) + B * Math.cos(phi2) * Math.sin(lam2);
    const z = A * Math.sin(phi1) + B * Math.sin(phi2);
    const phi = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lam = Math.atan2(y, x);
    pts.push([toDeg(phi), toDeg(lam)]);
  }
  return pts;
}

export const QiblaView: React.FC<QiblaViewProps> = ({
  qiblaAngle,
  distanceToKaabaKm,
  cityLat,
  cityLng,
  cityName,
  countryFlag,
  language,
  t,
}) => {
  const [heading, setHeading] = useState<number | null>(null);
  const [unwrappedHeading, setUnwrappedHeading] = useState<number>(0);
  const [previewBlockedNotice, setPreviewBlockedNotice] = useState(false);
  const [showQiblaMap, setShowQiblaMap] = useState(false);
  const [mapMode, setMapMode] = useState<'street' | 'kaaba'>('street');

  const unwrappedHeadingRef = useRef<number | null>(null);
  const gotAbsoluteRef = useRef(false);
  const receivedSampleRef = useRef(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const cardinalLabel = useMemo(
    () => getCardinalLabel(qiblaAngle, language),
    [qiblaAngle, language]
  );

  // Android direct DeviceOrientationEvent listener on mount — no permission button needed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    receivedSampleRef.current = false;
    gotAbsoluteRef.current = false;

    const handleOrientation = (event: Event, isAbsoluteEvent: boolean) => {
      const e = event as DeviceOrientationEvent;
      if (typeof e.alpha !== 'number' || Number.isNaN(e.alpha)) return;

      if (isAbsoluteEvent || e.absolute === true) {
        gotAbsoluteRef.current = true;
      } else if (gotAbsoluteRef.current) {
        // Prefer absolute true-north orientation events over relative orientation events
        return;
      }

      // Android compass azimuth clockwise from North = (360 - alpha) % 360
      const rawHeading = (360 - e.alpha + 360) % 360;

      // Compensate for device screen orientation
      const screenAngle = window.screen?.orientation?.angle ?? 0;
      const adjusted = (rawHeading + screenAngle + 360) % 360;

      if (!receivedSampleRef.current) {
        receivedSampleRef.current = true;
        setPreviewBlockedNotice(false);
      }

      if (unwrappedHeadingRef.current === null) {
        unwrappedHeadingRef.current = adjusted;
      } else {
        const prevMod = ((unwrappedHeadingRef.current % 360) + 360) % 360;
        const delta = ((adjusted - prevMod + 540) % 360) - 180;
        unwrappedHeadingRef.current = unwrappedHeadingRef.current + delta;
      }

      setHeading(adjusted);
      setUnwrappedHeading(unwrappedHeadingRef.current);
    };

    const onAbs = (ev: Event) => handleOrientation(ev, true);
    const onRel = (ev: Event) => handleOrientation(ev, false);

    window.addEventListener('deviceorientationabsolute', onAbs, true);
    window.addEventListener('deviceorientation', onRel, true);

    // If running inside an iframe preview (e.g. AI Studio Preview) that blocks sensor events
    const inIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    const previewTimer = setTimeout(() => {
      if (!receivedSampleRef.current && inIframe) {
        setPreviewBlockedNotice(true);
      }
    }, 1800);

    return () => {
      clearTimeout(previewTimer);
      window.removeEventListener('deviceorientationabsolute', onAbs, true);
      window.removeEventListener('deviceorientation', onRel, true);
    };
  }, []);

  // Initialize & update Leaflet Qibla Map when visible
  useEffect(() => {
    if (!showQiblaMap || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [cityLat, cityLng],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const geodesicPts = computeGeodesicPoints(cityLat, cityLng, KAABA_LAT, KAABA_LNG, 56);

    // Draw Qibla geodesic bearing line from user's location straight to the Kaaba
    L.polyline(geodesicPts, {
      color: '#059669',
      weight: 4.5,
      opacity: 0.9,
      dashArray: '8 6',
    }).addTo(map);

    // User location blue dot
    const userIcon = L.divIcon({
      className: 'sakina-qibla-user-pin',
      html: `
        <div style="width:20px;height:20px;border-radius:9999px;background:#2563EB;border:3px solid #FFFFFF;box-shadow:0 2px 8px rgba(37,99,235,0.55);"></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    L.marker([cityLat, cityLng], { icon: userIcon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:Cairo,sans-serif;font-weight:700;color:#1D4ED8;">${cityName} · ${Math.round(
          qiblaAngle
        )}°</div>`
      );

    // Kaaba pin
    const kaabaIcon = L.divIcon({
      className: 'sakina-kaaba-pin',
      html: `
        <div style="width:32px;height:32px;border-radius:9999px;background:#0B4F3A;border:2.5px solid #C59B38;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.35);">🕋</div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    L.marker([KAABA_LAT, KAABA_LNG], { icon: kaabaIcon })
      .addTo(map)
      .bindPopup('<div style="font-family:Cairo,sans-serif;font-weight:700;color:#0B4F3A;">الكعبة المشرفة</div>');

    if (mapMode === 'kaaba') {
      map.fitBounds(
        L.latLngBounds([
          [cityLat, cityLng],
          [KAABA_LAT, KAABA_LNG],
        ]),
        { padding: [36, 36] }
      );
    } else {
      map.setView([cityLat, cityLng], 15);
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [showQiblaMap, cityLat, cityLng, cityName, qiblaAngle, mapMode]);

  const dialRotation = heading !== null ? -unwrappedHeading : 0;
  const relativeAngle = heading !== null ? ((qiblaAngle - heading + 540) % 360) - 180 : 0;
  const isAligned = heading !== null && Math.abs(relativeAngle) <= 6;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#0A251C] dark:text-[#F2F7F4]">
            {t.qibla.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#436155] dark:text-[#9EC0B2]">
            {t.qibla.subtitle} · {countryFlag} {cityName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {heading !== null && (
            <span className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#EFF5F1] dark:bg-[#113529] border border-[#C59B38] text-xs sm:text-sm font-bold text-[#0B4F3A] dark:text-[#E5C366]">
              <Compass className="w-4 h-4" />
              <span>{t.qibla.compassActive}</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowQiblaMap((v) => !v)}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] text-xs sm:text-sm font-semibold text-[#0B4F3A] dark:text-[#E5C366]"
          >
            <MapIcon className="w-4 h-4" />
            <span>{showQiblaMap ? 'إخفاء خريطة القبلة' : 'خريطة القبلة'}</span>
          </button>
        </div>
      </div>

      {/* Helpful notice only if AI Studio Preview iframe blocks DeviceOrientationEvent */}
      {previewBlockedNotice && heading === null && (
        <div className="rounded-2xl bg-[#EFF5F1] dark:bg-[#113529] border border-[#C59B38]/60 px-4 py-3 flex items-center gap-3 text-xs sm:text-sm font-medium text-[#0A251C] dark:text-[#F2F7F4]">
          <Info className="w-5 h-5 text-[#C59B38] shrink-0" />
          <span>
            {language === 'ar'
              ? 'ملاحظة: نافذة المعاينة (Preview) كتمنع حساس البوصلة مؤقتاً؛ منين تحل التطبيق مباشرة فمتصفح الهاتف غتشتغل البوصلة تلقائياً.'
              : 'Note: Preview iframe blocks orientation sensors; open the app URL directly on your phone browser for live rotation.'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* SVG Islamic Compass */}
        <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-6 sm:p-10 flex flex-col items-center justify-center gap-5">
          {/* Top fixed phone-direction marker */}
          <div className="flex flex-col items-center -mb-3">
            <span className="text-[11px] font-bold text-[#9A741E] dark:text-[#E5C366]">
              {language === 'ar' ? 'اتجاه الهاتف' : 'Phone Top'}
            </span>
            <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[10px] border-t-[#C59B38]" />
          </div>

          <div
            className={`relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center rounded-full transition-shadow duration-200 ${
              isAligned ? 'ring-4 ring-[#059669]/40' : ''
            }`}
          >
            <svg
              viewBox="0 0 320 320"
              className="w-full h-full transition-transform duration-100 ease-out"
              style={{ transform: `rotate(${dialRotation}deg)` }}
            >
              {/* Outer Rings */}
              <circle
                cx="160"
                cy="160"
                r="146"
                fill="none"
                stroke="currentColor"
                className="text-[#DCE7E0] dark:text-[#1C4B3B]"
                strokeWidth="2"
              />
              <circle
                cx="160"
                cy="160"
                r="132"
                fill="none"
                stroke="#C59B38"
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Degree ticks */}
              {Array.from({ length: 36 }).map((_, i) => {
                const angle = i * 10;
                const isMajor = i % 9 === 0;
                const r1 = isMajor ? 132 : 138;
                const r2 = 146;
                const rad = (angle * Math.PI) / 180;
                const x1 = 160 + r1 * Math.sin(rad);
                const y1 = 160 - r1 * Math.cos(rad);
                const x2 = 160 + r2 * Math.sin(rad);
                const y2 = 160 - r2 * Math.cos(rad);
                return (
                  <line
                    key={angle}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isMajor ? '#C59B38' : 'currentColor'}
                    className={isMajor ? '' : 'text-[#436155]/40 dark:text-[#9EC0B2]/35'}
                    strokeWidth={isMajor ? '2.5' : '1.2'}
                  />
                );
              })}

              {/* True North Marker (الشمال الحقيقي) */}
              <g>
                <polygon points="160,8 153,22 167,22" fill="#DC2626" />
                <text
                  x="160"
                  y="40"
                  textAnchor="middle"
                  className="fill-[#DC2626] text-xs font-extrabold"
                >
                  N · شمال
                </text>
              </g>
              <text x="292" y="165" textAnchor="middle" className="fill-[#436155] dark:fill-[#9EC0B2] text-xs font-semibold">
                E
              </text>
              <text x="160" y="298" textAnchor="middle" className="fill-[#436155] dark:fill-[#9EC0B2] text-xs font-semibold">
                S
              </text>
              <text x="28" y="165" textAnchor="middle" className="fill-[#436155] dark:fill-[#9EC0B2] text-xs font-semibold">
                W
              </text>

              {/* Qibla Pointer Needle */}
              <g transform={`rotate(${qiblaAngle} 160 160)`}>
                <line
                  x1="160"
                  y1="160"
                  x2="160"
                  y2="46"
                  stroke="#059669"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <polygon points="160,32 147,60 173,60" fill="#C59B38" />
                {/* Kaaba stylized gold square marker */}
                <rect x="149" y="66" width="22" height="22" rx="4" fill="#0A251C" stroke="#C59B38" strokeWidth="2" />
                <line x1="149" y1="73" x2="171" y2="73" stroke="#C59B38" strokeWidth="2" />
              </g>

              {/* Center Pivot */}
              <circle cx="160" cy="160" r="10" fill="#0B4F3A" stroke="#C59B38" strokeWidth="3" />
            </svg>
          </div>

          <div className="text-center space-y-1.5">
            <p className="text-base sm:text-lg font-bold text-[#0B4F3A] dark:text-[#E5C366]">
              {language === 'ar'
                ? `القبلة: ${Math.round(qiblaAngle)}° ${cardinalLabel}`
                : `Qibla: ${Math.round(qiblaAngle)}° ${cardinalLabel}`}
            </p>
            <p className="text-xs text-[#436155] dark:text-[#9EC0B2]">
              {language === 'ar' ? 'الشمال الحقيقي: 0° N (السهم الأحمر)' : 'True North: 0° N (Red arrow)'}
              {heading !== null &&
                ` · ${language === 'ar' ? 'اتجاهك' : 'Heading'}: ${Math.round(heading)}°`}
            </p>
          </div>

          {heading !== null && (
            <p
              className={`text-sm font-bold px-4 py-1.5 rounded-xl ${
                isAligned
                  ? 'bg-[#059669] text-white'
                  : 'bg-[#EFF5F1] dark:bg-[#113529] text-[#0B4F3A] dark:text-[#E5C366]'
              }`}
            >
              {isAligned
                ? t.qibla.facingQibla
                : relativeAngle > 0
                ? t.qibla.turnRight
                : t.qibla.turnLeft}
            </p>
          )}
        </div>

        {/* Exact Bearing & Distance */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-5 sm:p-6 space-y-2">
            <p className="text-xs font-medium text-[#436155] dark:text-[#9EC0B2]">
              {t.qibla.bearingFromNorth}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-[#0B4F3A] dark:text-[#E5C366] tabular-nums">
              {Math.round(qiblaAngle)}° {cardinalLabel}
            </p>
            <p className="font-mono-num text-xs text-[#436155] dark:text-[#9EC0B2]" dir="ltr">
              {qiblaAngle.toFixed(1)}° from True North (N)
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] p-5 sm:p-6 space-y-2">
            <p className="text-xs font-medium text-[#436155] dark:text-[#9EC0B2]">
              {t.qibla.distanceToKaaba}
            </p>
            <p className="font-mono-num text-3xl font-bold text-[#0A251C] dark:text-[#F2F7F4] tabular-nums">
              {distanceToKaabaKm.toLocaleString()} {t.qibla.km}
            </p>
          </div>

          <p className="text-xs leading-relaxed text-[#436155] dark:text-[#9EC0B2] px-1">
            {t.qibla.calibrationHint}
          </p>
        </div>
      </div>

      {/* Qibla Map */}
      {showQiblaMap && (
        <section className="rounded-3xl overflow-hidden border border-[#DCE7E0] dark:border-[#1C4B3B] bg-white dark:bg-[#0C2920] shadow-sm">
          <div className="px-5 py-3.5 border-b border-[#DCE7E0] dark:border-[#1C4B3B] flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-[#0A251C] dark:text-[#F2F7F4]">
                {language === 'ar' ? 'خريطة اتجاه القبلة' : 'Qibla Direction Map'}
              </h3>
              <p className="text-xs text-[#436155] dark:text-[#9EC0B2]">
                {language === 'ar'
                  ? `الخط الأخضر يشير مباشرة نحو الكعبة المشرفة (${Math.round(qiblaAngle)}° ${cardinalLabel})`
                  : `Green line points directly to Makkah (${Math.round(qiblaAngle)}° ${cardinalLabel})`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMapMode('street')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold border ${
                  mapMode === 'street'
                    ? 'bg-[#0B4F3A] text-white border-transparent'
                    : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#436155] dark:text-[#9EC0B2] border-[#DCE7E0] dark:border-[#1C4B3B]'
                }`}
              >
                {language === 'ar' ? 'موقعي والشارع' : 'Street View'}
              </button>
              <button
                type="button"
                onClick={() => setMapMode('kaaba')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold border ${
                  mapMode === 'kaaba'
                    ? 'bg-[#0B4F3A] text-white border-transparent'
                    : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#436155] dark:text-[#9EC0B2] border-[#DCE7E0] dark:border-[#1C4B3B]'
                }`}
              >
                {language === 'ar' ? 'المسار للكعبة 🕋' : 'Path to Kaaba 🕋'}
              </button>
            </div>
          </div>
          <div
            ref={mapContainerRef}
            className="w-full h-[320px] sm:h-[380px] relative z-0"
            dir="ltr"
          />
        </section>
      )}
    </div>
  );
};
