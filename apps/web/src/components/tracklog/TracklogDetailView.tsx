'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Trophy,
  Share2,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  Activity,
  Gauge,
  Clock,
  Heart,
  Mountain,
  Flame,
  Zap,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  AntiCheatStatus,
  decodePolyline,
  formatDuration,
  formatPace,
  roundKm,
} from '@toprun/shared';
import type { TracklogActivityItem, TracklogSplitItem } from '../UserTracklogExplorer';
import AthleteAvatar, { AthleteHonorPill } from '../AthleteAvatar';

interface TracklogDetailViewProps {
  activity: TracklogActivityItem;
  onBackToList: () => void;
  onBackToTournament?: () => void;
  onOpenShareModal: () => void;
  onToggleHideActivity: (id: string) => Promise<void> | void;
  onDeleteActivity: (id: string) => Promise<void> | void;
  isAdmin?: boolean;
  isOwner?: boolean;
  theme: 'dark' | 'light';
}

export default function TracklogDetailView({
  activity,
  onBackToList,
  onBackToTournament,
  onOpenShareModal,
  onToggleHideActivity,
  onDeleteActivity,
  isAdmin = false,
  isOwner = true,
  theme,
}: TracklogDetailViewProps) {
  const [hoveredSplitKm, setHoveredSplitKm] = useState<number | null>(null);
  const [mapStyle, setMapStyle] = useState<'dark' | 'street' | 'satellite'>(
    theme === 'dark' ? 'dark' : 'street'
  );
  const [leafletReady, setLeafletReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const highlightMarkerRef = useRef<any>(null);

  useEffect(() => {
    setMapStyle((prev) => (prev === 'satellite' ? 'satellite' : theme === 'dark' ? 'dark' : 'street'));
  }, [theme]);

  // Decoded GPS coordinates
  const routeCoordinates = useMemo(() => {
    if (!activity.polyline) return [];
    const pts = decodePolyline(activity.polyline);
    if (pts.length < 2) return pts;

    const dense: Array<{ lat: number; lng: number }> = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const steps = 4;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        dense.push({
          lat: p1.lat + (p2.lat - p1.lat) * t,
          lng: p1.lng + (p2.lng - p1.lng) * t,
        });
      }
    }
    dense.push(pts[pts.length - 1]);
    return dense;
  }, [activity.polyline]);

  const splitCoordinates = useMemo(() => {
    if (routeCoordinates.length === 0 || !Array.isArray(activity.splits)) return [];
    const totalSplits = activity.splits.length;
    return activity.splits.map((sp, idx) => {
      const ratio = (idx + 1) / Math.max(totalSplits, 1);
      const ptIndex = Math.min(
        routeCoordinates.length - 1,
        Math.max(0, Math.floor(ratio * (routeCoordinates.length - 1)))
      );
      return {
        ...sp,
        coord: routeCoordinates[ptIndex],
      };
    });
  }, [activity.splits, routeCoordinates]);

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) {
      setLeafletReady(true);
      return;
    }

    const linkId = 'leaflet-css-cdn';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const scriptId = 'leaflet-js-cdn';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => setLeafletReady(true));
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setLeafletReady(true);
    document.body.appendChild(script);
  }, []);

  // Initialize & update Leaflet Map
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || routeCoordinates.length === 0) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      });
      if (map.attributionControl) {
        map.attributionControl.setPrefix(false);
      }
      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;

    // Switch Tile Layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const cartoApiKey = (process.env.NEXT_PUBLIC_CARTO_API_KEY || '').trim();
    const cartoAuthQuery = cartoApiKey ? `?key=${cartoApiKey}` : '';

    let tileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${cartoAuthQuery}`;
    let subdomains = 'abcd';
    let maxZoom = 19;
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

    if (mapStyle === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      subdomains = '';
      maxZoom = 19;
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
    } else if (mapStyle === 'dark') {
      tileUrl = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${cartoAuthQuery}`;
    }

    tileLayerRef.current = L.tileLayer(tileUrl, {
      subdomains,
      maxZoom,
      attribution,
    }).addTo(map);

    // Draw Route Polyline & Km Markers
    layerGroup.clearLayers();

    const latLngs = routeCoordinates.map((pt) => [pt.lat, pt.lng]);
    const glowLine = L.polyline(latLngs, {
      color: '#FC4C02',
      weight: 8,
      opacity: 0.28,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layerGroup);

    const mainLine = L.polyline(latLngs, {
      color: '#FC4C02',
      weight: 4.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layerGroup);

    const startPt = routeCoordinates[0];
    const endPt = routeCoordinates[routeCoordinates.length - 1];

    const startIcon = L.divIcon({
      className: 'custom-start-marker',
      html: `<div style="width:16px;height:16px;border-radius:9999px;background:#10B981;border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.45);" title="Điểm xuất phát"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    L.marker([startPt.lat, startPt.lng], { icon: startIcon })
      .bindTooltip('Điểm xuất phát (Start)', { direction: 'top' })
      .addTo(layerGroup);

    const endIcon = L.divIcon({
      className: 'custom-finish-marker',
      html: `<div style="width:16px;height:16px;border-radius:9999px;background:#E11D48;border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.45);" title="Điểm đích"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    L.marker([endPt.lat, endPt.lng], { icon: endIcon })
      .bindTooltip('Đích đến (Finish)', { direction: 'top' })
      .addTo(layerGroup);

    splitCoordinates.forEach((sp) => {
      if (!sp.coord) return;
      const bg = sp.isValid ? '#0F172A' : '#E11D48';
      const border = sp.isValid ? '#FC4C02' : '#FECDD3';
      const kmIcon = L.divIcon({
        className: 'custom-km-marker',
        html: `<div style="min-width:22px;height:22px;padding:0 5px;border-radius:9999px;background:${bg};color:#fff;border:2px solid ${border};font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${sp.splitIndex}</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([sp.coord.lat, sp.coord.lng], { icon: kmIcon });
      marker.bindTooltip(
        `<div style="font-family:'Be Vietnam Pro',sans-serif;font-size:11px;line-height:1.4;">
          <strong>Km ${sp.splitIndex}</strong> • Pace: <strong>${sp.formattedPace}</strong><br/>
          Nhịp tim: ${sp.averageHeartrate ? Math.round(sp.averageHeartrate) : '--'} bpm • Độ cao: ${
          sp.elevationDiffMeters >= 0 ? `+${sp.elevationDiffMeters}m` : `${sp.elevationDiffMeters}m`
        }<br/>
          Trạng thái: <span style="color:${sp.isValid ? '#10B981' : '#F43F5E'};font-weight:700;">${
          sp.isValid ? 'Hợp lệ' : 'Đã loại (' + sp.invalidReason + ')'
        }</span>
        </div>`,
        { direction: 'top', offset: [0, -8] }
      );
      marker.on('mouseover', () => setHoveredSplitKm(sp.splitIndex));
      marker.on('mouseout', () => setHoveredSplitKm(null));
      marker.addTo(layerGroup);
    });

    try {
      map.fitBounds(mainLine.getBounds(), { padding: [32, 32] });
    } catch {}
  }, [leafletReady, activity, routeCoordinates, splitCoordinates, mapStyle]);

  // Synchronized Hover Marker
  useEffect(() => {
    if (!leafletReady || !mapInstanceRef.current) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;

    if (highlightMarkerRef.current) {
      map.removeLayer(highlightMarkerRef.current);
      highlightMarkerRef.current = null;
    }

    if (hoveredSplitKm === null) return;
    const targetSplit = splitCoordinates.find((s) => s.splitIndex === hoveredSplitKm);
    if (!targetSplit?.coord) return;

    const pulseIcon = L.divIcon({
      className: 'custom-pulse-km',
      html: `<div style="width:34px;height:34px;border-radius:9999px;background:#FC4C02;border:3px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'JetBrains Mono',monospace;font-weight:800;font-size:12px;box-shadow:0 0 16px rgba(252,76,2,0.85);">Km ${targetSplit.splitIndex}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    highlightMarkerRef.current = L.marker([targetSplit.coord.lat, targetSplit.coord.lng], {
      icon: pulseIcon,
      zIndexOffset: 1000,
    }).addTo(map);
  }, [hoveredSplitKm, splitCoordinates, leafletReady]);

  // Splits & Elevation Profile
  const splits = useMemo(() => {
    return activity.splits && activity.splits.length > 0
      ? activity.splits
      : [
          {
            splitIndex: 1,
            distanceMeters: activity.validDistanceKm * 1000,
            movingTimeSec: activity.movingTimeSec || 300,
            paceSecPerKm: activity.avgPaceSecPerKm || 330,
            formattedPace: formatPace(activity.avgPaceSecPerKm || 330),
            elevationDiffMeters: 0,
            averageHeartrate: activity.avgHr || 140,
            isValid: activity.validDistanceKm > 0,
            invalidReason: null,
          },
        ];
  }, [activity]);

  const bestPaceSec = useMemo(() => {
    const valid = splits.filter((s) => s.isValid);
    return valid.length > 0
      ? Math.min(...valid.map((s) => s.paceSecPerKm))
      : activity.avgPaceSecPerKm;
  }, [splits, activity.avgPaceSecPerKm]);

  let currentElev = 12;
  const elevationProfile = useMemo(() => {
    return splits.map((sp) => {
      const diff = Math.round((sp.elevationDiffMeters || 0) * 10) / 10;
      currentElev = Math.round(Math.max(2, currentElev + diff) * 10) / 10;
      return {
        splitIndex: sp.splitIndex,
        elevationMeters: currentElev,
        diff,
        paceSecPerKm: sp.paceSecPerKm,
        formattedPace: sp.formattedPace,
        hr: Math.round(sp.averageHeartrate || activity.avgHr || 145),
        cadence: Math.round(sp.cadenceSpm || activity.avgCadence || 174),
        isValid: sp.isValid,
      };
    });
  }, [splits, activity.avgHr, activity.avgCadence]);

  const maxElev = Math.max(...elevationProfile.map((e) => e.elevationMeters), 25);
  const minElev = Math.min(...elevationProfile.map((e) => e.elevationMeters), 0);

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. STICKY TOP BAR: QUAY LẠI DANH SÁCH + TIÊU ĐỀ + HÀNH ĐỘNG
         ===================================================================== */}
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Back button + Title */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onBackToList}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#FC4C02] text-slate-700 dark:text-slate-200 hover:text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shadow-xs shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </button>
          {onBackToTournament && (
            <button
              type="button"
              onClick={onBackToTournament}
              className="px-3.5 py-2.5 rounded-xl bg-orange-50 dark:bg-[#FC4C02]/15 text-[#FC4C02] hover:bg-[#FC4C02] hover:text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0 border border-orange-200/80 dark:border-[#FC4C02]/30"
              title="Quay lại bảng xếp hạng & chi tiết giải đấu"
            >
              <Trophy className="w-4 h-4" />
              <span>← Quay lại giải đấu</span>
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <button
                type="button"
                onClick={onBackToList}
                className="hover:text-slate-900 dark:hover:text-white transition font-medium"
              >
                Nhật ký tracklog
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300 font-semibold truncate max-w-[200px] sm:max-w-[280px]">
                Chi tiết bài tập
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{activity.dateStr}</span>
              </span>
              {activity.source === 'STRAVA' && (
                <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-[#FC4C02]/10 text-[#FC4C02] border border-[#FC4C02]/20">
                  Strava
                </span>
              )}
              {activity.appliedMultiplier > 1 && (
                <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-0.5">
                  <Flame className="w-3 h-3" />
                  x{activity.appliedMultiplier} cuối tuần
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <div className="shrink-0 my-0.5">
                <AthleteAvatar
                  user={{
                    id: activity.userId,
                    fullName: activity.userName,
                    avatarUrl: (activity as any).userAvatar,
                  }}
                  size="sm"
                  showBadge={true}
                  showWings={true}
                  showSharkCrown={true}
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {activity.userName}
                </span>
                <AthleteHonorPill user={{ id: activity.userId, fullName: activity.userName }} />
                {activity.department && (
                  <span className="text-[11px] text-slate-400">• {activity.department}</span>
                )}
              </div>
            </div>

            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
              {activity.name}
            </h2>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={onOpenShareModal}
            className="px-3 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Chia sẻ ảnh Tracklog</span>
          </button>

          {(isAdmin || isOwner) && (
            <button
              type="button"
              onClick={() => onToggleHideActivity(activity.id)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activity.isHidden
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={activity.isHidden ? 'Bỏ ẩn và tính lại vào giải đấu' : 'Ẩn bài chạy khỏi giải đấu'}
            >
              {activity.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{activity.isHidden ? 'Hiện lại' : 'Ẩn bài'}</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => onDeleteActivity(activity.id)}
              className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              title="Xoá vĩnh viễn bài chạy (Admin)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          2. TOÀN CHIỀU RỘNG: BẢN ĐỒ VỆ TINH GPS TƯƠNG TÁC LỚN
         ===================================================================== */}
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm relative">
        {/* Map Header & Controls */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FC4C02]/10 text-[#FC4C02] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Bản Đồ Lộ Trình GPS & Vệ Tinh
              </h3>
              <p className="text-[10px] text-slate-400">
                Hiển thị từng mốc km, điểm xuất phát và đích đến
              </p>
            </div>
          </div>

          {/* Map Layer Switcher */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#0F1420] p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMapStyle('satellite')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                mapStyle === 'satellite'
                  ? 'bg-[#FC4C02] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Vệ tinh
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('dark')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                mapStyle === 'dark'
                  ? 'bg-[#FC4C02] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bản đồ tối
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('street')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                mapStyle === 'street'
                  ? 'bg-[#FC4C02] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Đường phố
            </button>
          </div>
        </div>

        {/* Map Canvas */}
        <div ref={mapContainerRef} className="w-full h-[400px] sm:h-[480px] bg-slate-950 relative z-10" />

        {/* Map Overlay Badge */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/90 dark:bg-[#0F1420]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono font-bold shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{activity.deviceName || 'Thiết bị GPS'}</span>
          <span className="text-slate-400">•</span>
          <span>{splits.length} km mốc</span>
        </div>
      </div>

      {/* =====================================================================
          3. BỘ 8 THẺ THÔNG SỐ TELEMETRY CHI TIẾT
         ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Quãng đường hợp lệ */}
        <div className="rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-3 space-y-1 shadow-sm">
          <span className="text-[10px] text-slate-400 font-semibold block">Quãng đường</span>
          <div className="text-lg font-black font-mono text-slate-900 dark:text-white tabular-nums">
            {roundKm(activity.validDistanceKm)} <span className="text-xs font-normal text-slate-400">km</span>
          </div>
          <span className="text-[9px] text-emerald-500 font-bold block">
            {activity.invalidDistanceKm > 0 ? `Gốc ${roundKm(activity.rawDistanceKm)}km` : '100% Hợp lệ'}
          </span>
        </div>

        {/* 2. Pace trung bình */}
        <div className="rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-3 space-y-1 shadow-sm">
          <span className="text-[10px] text-slate-400 font-semibold block">Pace TB</span>
          <div className="text-lg font-black font-mono text-[#FC4C02] tabular-nums">
            {formatPace(activity.avgPaceSecPerKm)}
          </div>
          <span className="text-[9px] text-slate-400 font-mono block">
            Best {formatPace(bestPaceSec)}
          </span>
        </div>

        {/* 3. Thời gian di chuyển */}
        <div className="rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-3 space-y-1 shadow-sm">
          <span className="text-[10px] text-slate-400 font-semibold block">Moving Time</span>
          <div className="text-lg font-black font-mono text-slate-900 dark:text-white tabular-nums">
            {formatDuration(activity.movingTimeSec)}
          </div>
          <span className="text-[9px] text-slate-400 font-mono block">Di chuyển</span>
        </div>

        {/* 4. Tổng thời gian hoạt động */}
        <div className="rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-3 space-y-1 shadow-sm">
          <span className="text-[10px] text-slate-400 font-semibold block">Elapsed Time</span>
          <div className="text-lg font-black font-mono text-slate-700 dark:text-slate-300 tabular-nums">
            {formatDuration(activity.elapsedTimeSec || activity.movingTimeSec)}
          </div>
          <span className="text-[9px] text-slate-400 font-mono block">Tổng thời gian</span>
        </div>

        {/* 5. Độ dốc tích luỹ */}
        <div className="rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-3 space-y-1 shadow-sm">
          <span className="text-[10px] text-slate-400 font-semibold block">Độ cao Gain</span>
          <div className="text-lg font-black font-mono text-emerald-500 tabular-nums">
            +{Math.round(activity.elevationGain)} <span className="text-xs font-normal text-slate-400">m</span>
          </div>
          <span className="text-[9px] text-slate-400 font-mono block">Leo dốc</span>
        </div>

        {/* 6. Nhịp tim trung bình */}
        <div className="rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-3 space-y-1 shadow-sm">
          <span className="text-[10px] text-slate-400 font-semibold block">Nhịp tim</span>
          <div className="text-lg font-black font-mono text-rose-500 tabular-nums flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 fill-rose-500" />
            <span>{activity.avgHr ? Math.round(activity.avgHr) : '—'}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-mono block">
            Max: {activity.maxHr ? `${Math.round(activity.maxHr)}` : '190'} bpm
          </span>
        </div>

        {/* 7. Nhịp bước chân (Cadence) */}
        <div className="rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-3 space-y-1 shadow-sm">
          <span className="text-[10px] text-slate-400 font-semibold block">Cadence</span>
          <div className="text-lg font-black font-mono text-amber-500 tabular-nums">
            {activity.avgCadence ? Math.round(activity.avgCadence) : 174}
          </div>
          <span className="text-[9px] text-slate-400 font-mono block">spm (bước/phút)</span>
        </div>

        {/* 8. Năng lượng (Calo) */}
        <div className="rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-3 space-y-1 shadow-sm">
          <span className="text-[10px] text-slate-400 font-semibold block">Năng lượng</span>
          <div className="text-lg font-black font-mono text-purple-500 tabular-nums">
            {activity.calories ? Math.round(activity.calories) : Math.round(activity.validDistanceKm * 65)}
          </div>
          <span className="text-[9px] text-slate-400 font-mono block">kcal đốt cháy</span>
        </div>
      </div>

      {/* =====================================================================
          4. PHÂN TÍCH TỪNG KM (SPLITS BREAKDOWN) VÀ BIỂU ĐỒ CAO ĐỘ
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 6 cols: Km-by-Km Splits List */}
        <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#FC4C02]" />
              <span>Phân Tích Chi Tiết Từng KM (Splits)</span>
            </h3>
            <span className="text-xs font-mono font-bold text-slate-400">
              {splits.length} km
            </span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {splits.map((sp) => {
              const isHovered = hoveredSplitKm === sp.splitIndex;
              const isFastest = sp.paceSecPerKm === bestPaceSec;

              return (
                <div
                  key={sp.splitIndex}
                  onMouseEnter={() => setHoveredSplitKm(sp.splitIndex)}
                  onMouseLeave={() => setHoveredSplitKm(null)}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition cursor-pointer ${
                    isHovered
                      ? 'border-[#FC4C02] bg-[#FC4C02]/10 ring-1 ring-[#FC4C02]/40'
                      : sp.isValid
                      ? 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800'
                      : 'bg-rose-50/60 dark:bg-rose-950/25 border-rose-200 dark:border-rose-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs">
                      {sp.splitIndex}
                    </span>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          Pace: {sp.formattedPace}
                        </span>
                        {isFastest && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400/20 text-amber-500">
                            Nhanh nhất
                          </span>
                        )}
                        {!sp.isValid && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500 text-white">
                            Loại ({sp.invalidReason})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                        <span>Độ dốc: {sp.elevationDiffMeters >= 0 ? `+${sp.elevationDiffMeters}m` : `${sp.elevationDiffMeters}m`}</span>
                        <span>•</span>
                        <span>Tim: {sp.averageHeartrate ? Math.round(sp.averageHeartrate) : '—'} bpm</span>
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-slate-500 text-[11px]">
                    {formatDuration(sp.movingTimeSec)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 6 cols: Elevation Profile Chart */}
        <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Mountain className="w-4 h-4 text-emerald-500" />
              <span>Biểu Đồ Sóng Độ Cao (Elevation Profile)</span>
            </h3>
            <span className="text-xs font-mono text-emerald-500 font-bold">
              +{Math.round(activity.elevationGain)}m leo dốc
            </span>
          </div>

          {/* Elevation Bar Chart */}
          <div className="h-44 flex items-end gap-1.5 pt-4">
            {elevationProfile.map((pt) => {
              const range = Math.max(maxElev - minElev, 10);
              const pct = Math.max(15, Math.round(((pt.elevationMeters - minElev) / range) * 100));
              const isHovered = hoveredSplitKm === pt.splitIndex;

              return (
                <div
                  key={pt.splitIndex}
                  onMouseEnter={() => setHoveredSplitKm(pt.splitIndex)}
                  onMouseLeave={() => setHoveredSplitKm(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full gap-1 group cursor-pointer"
                  title={`Km ${pt.splitIndex}: ${pt.elevationMeters}m (${pt.formattedPace})`}
                >
                  <span className={`text-[9px] font-mono font-bold transition ${
                    isHovered ? 'text-[#FC4C02] opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                  }`}>
                    {pt.elevationMeters}m
                  </span>
                  <div className="w-full rounded-t-md bg-slate-100 dark:bg-slate-800 h-full flex items-end overflow-hidden p-0.5">
                    <div
                      className={`w-full rounded-t-sm transition-all duration-200 ${
                        isHovered
                          ? 'bg-[#FC4C02]'
                          : 'bg-gradient-to-t from-emerald-500 to-teal-400 group-hover:from-emerald-400 group-hover:to-teal-300'
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">
                    K{pt.splitIndex}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
            💡 Di chuột vào các cột Km hoặc dòng Splits để đánh dấu vị trí tương ứng trực tiếp trên bản đồ GPS vệ tinh phía trên.
          </p>
        </div>
      </div>
    </div>
  );
}

