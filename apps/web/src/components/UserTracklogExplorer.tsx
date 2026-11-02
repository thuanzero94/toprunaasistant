'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Calendar,
  Eye,
  EyeOff,
  FileUp,
  Gauge,
  Heart,
  MapPin,
  Mountain,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  Trash2,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import {
  AntiCheatStatus,
  decodePolyline,
  formatDuration,
  formatPace,
  polylineToSvgPath,
} from '@toprun/shared';

export interface TracklogSplitItem {
  splitIndex: number;
  distanceMeters: number;
  movingTimeSec: number;
  paceSecPerKm: number;
  formattedPace: string;
  elevationDiffMeters: number;
  averageHeartrate: number | null;
  cadenceSpm?: number;
  isValid: boolean;
  invalidReason: string | null;
}

export interface TracklogActivityItem {
  id: string;
  userId?: string;
  userName: string;
  department: string;
  source: string;
  externalId: string;
  name: string;
  sportType?: string;
  dateStr: string;
  startDateIso?: string;
  locationName?: string;
  rawDistanceKm: number;
  validDistanceKm: number;
  invalidDistanceKm: number;
  appliedMultiplier: number;
  finalCountedDistanceKm: number;
  movingTimeSec: number;
  elapsedTimeSec?: number;
  avgPaceSecPerKm: number;
  elevationGain: number;
  avgHr: number;
  maxHr?: number;
  avgCadence: number;
  calories?: number;
  deviceName: string;
  isHidden?: boolean;
  antiCheatStatus: AntiCheatStatus;
  flagReasons: string[];
  polyline: string;
  kudos: number;
  liked: boolean;
  splits: TracklogSplitItem[];
}

interface Props {
  activities: TracklogActivityItem[];
  selectedActivityId: string;
  currentUserId?: string;
  currentUserRole?: string;
  onSelectActivity: (id: string) => void;
  onToggleHideActivity: (id: string) => Promise<void> | void;
  onDeleteActivity: (id: string) => Promise<void> | void;
  onOpenShareModal: () => void;
  onGpxUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSyncStravaLive: () => Promise<void>;
  isSyncingStrava: boolean;
  theme: 'dark' | 'light';
}

export default function UserTracklogExplorer({
  activities,
  selectedActivityId,
  currentUserId,
  currentUserRole,
  onSelectActivity,
  onToggleHideActivity,
  onDeleteActivity,
  onOpenShareModal,
  onGpxUpload,
  onSyncStravaLive,
  isSyncingStrava,
  theme,
}: Props) {
  const isAdmin = currentUserRole === 'ADMIN';
  const [ownerFilter, setOwnerFilter] = useState<'mine' | 'all'>('mine');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'flagged' | 'hidden'>('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  const hiddenCount = useMemo(
    () => activities.filter((a) => Boolean(a.isHidden)).length,
    [activities]
  );

  // Helper to determine if an activity belongs to current user
  const isMyActivity = (act: TracklogActivityItem) => {
    if (currentUserId && act.userId === currentUserId) return true;
    return false;
  };

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // If not admin, strictly only allow own activities
      if (!isAdmin || ownerFilter === 'mine') {
        if (!isMyActivity(act)) return false;
      }
      if (statusFilter === 'hidden') {
        if (!act.isHidden) return false;
      } else if (statusFilter === 'valid') {
        if (act.isHidden || act.antiCheatStatus !== AntiCheatStatus.VALID) return false;
      } else if (statusFilter === 'flagged') {
        if (act.isHidden || act.antiCheatStatus === AntiCheatStatus.VALID) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          act.name.toLowerCase().includes(q) ||
          act.userName.toLowerCase().includes(q) ||
          act.deviceName.toLowerCase().includes(q) ||
          act.externalId.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [activities, ownerFilter, statusFilter, searchQuery, isAdmin, currentUserId]);

  const selectedActivity = useMemo(() => {
    if (filteredActivities.length === 0) return null;
    return (
      filteredActivities.find((a) => a.id === selectedActivityId) ||
      filteredActivities[0]
    );
  }, [filteredActivities, selectedActivityId]);

  // Decoded GPS coordinates & interpolated Km coordinates along the polyline
  const routeCoordinates = useMemo(() => {
    if (!selectedActivity?.polyline) return [];
    const pts = decodePolyline(selectedActivity.polyline);
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
  }, [selectedActivity]);

  const splitCoordinates = useMemo(() => {
    if (!selectedActivity || routeCoordinates.length === 0) return [];
    const totalSplits = selectedActivity.splits.length;
    return selectedActivity.splits.map((sp, idx) => {
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
  }, [selectedActivity, routeCoordinates]);

  // Load Leaflet CSS & JS dynamically on client
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

  // Initialize & update Leaflet Map when selectedActivity or mapStyle changes
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || routeCoordinates.length === 0) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      });
      layerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      mapStyle === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : mapStyle === 'satellite'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(map);

    layerGroup.clearLayers();

    const latLngs = routeCoordinates.map((pt) => [pt.lat, pt.lng]);

    L.polyline(latLngs, {
      color: '#FC4C02',
      weight: 9,
      opacity: 0.22,
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
    const startIcon = L.divIcon({
      className: 'custom-start-icon',
      html: `<div style="width:16px;height:16px;border-radius:9999px;background:#10B981;border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.45);" title="Điểm xuất phát"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    L.marker([startPt.lat, startPt.lng], { icon: startIcon })
      .bindTooltip('Điểm xuất phát (Start)', { direction: 'top' })
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
          Nhịp tim: ${sp.averageHeartrate ? Math.round(sp.averageHeartrate) : '--'} bpm • Độ cao: ${sp.elevationDiffMeters >= 0 ? `+${sp.elevationDiffMeters}m` : `${sp.elevationDiffMeters}m`
        }<br/>
          Trạng thái: <span style="color:${sp.isValid ? '#10B981' : '#F43F5E'};font-weight:700;">${sp.isValid ? 'Hợp lệ' : 'Đã loại (' + sp.invalidReason + ')'
        }</span>
        </div>`,
        { direction: 'top', offset: [0, -8] }
      );
      marker.on('mouseover', () => setHoveredSplitKm(sp.splitIndex));
      marker.on('mouseout', () => setHoveredSplitKm(null));
      marker.addTo(layerGroup);
    });

    try {
      map.fitBounds(mainLine.getBounds(), { padding: [28, 28] });
    } catch {
      // Ignore fitBounds error
    }
  }, [leafletReady, selectedActivity, routeCoordinates, splitCoordinates, mapStyle]);

  // Synchronized Hover Highlight Marker on Map
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
      html: `<div style="width:34px;height:34px;border-radius:9999px;background:rgba(252,76,2,0.28);border:3px solid #FC4C02;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'JetBrains Mono',monospace;font-weight:800;font-size:12px;box-shadow:0 0 16px rgba(252,76,2,0.85);background-color:#FC4C02;">Km ${targetSplit.splitIndex}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    highlightMarkerRef.current = L.marker([targetSplit.coord.lat, targetSplit.coord.lng], {
      icon: pulseIcon,
      zIndexOffset: 1000,
    }).addTo(map);
  }, [hoveredSplitKm, splitCoordinates, leafletReady]);

  // Computed Analytics for Charts
  const analytics = useMemo(() => {
    if (!selectedActivity) return null;
    const splits =
      selectedActivity.splits && selectedActivity.splits.length > 0
        ? selectedActivity.splits
        : [
          {
            splitIndex: 1,
            distanceMeters: selectedActivity.validDistanceKm * 1000,
            movingTimeSec: selectedActivity.movingTimeSec || 300,
            paceSecPerKm: selectedActivity.avgPaceSecPerKm || 330,
            formattedPace: formatPace(selectedActivity.avgPaceSecPerKm || 330),
            elevationDiffMeters: 0,
            averageHeartrate: selectedActivity.avgHr || 140,
            isValid: selectedActivity.validDistanceKm > 0,
            invalidReason: selectedActivity.validDistanceKm > 0 ? null : 'Không tính km chạy bộ',
          },
        ];

    const validSplits = splits.filter((s) => s.isValid);

    const bestPaceSec =
      validSplits.length > 0
        ? Math.min(...validSplits.map((s) => s.paceSecPerKm))
        : selectedActivity.avgPaceSecPerKm;

    const maxPaceSec = Math.max(...splits.map((s) => s.paceSecPerKm), 420);
    const minPaceSec = Math.min(...splits.map((s) => s.paceSecPerKm), 180);

    let currentElev = 12;
    const elevationProfile = splits.map((sp) => {
      const diff = Math.round((sp.elevationDiffMeters || 0) * 10) / 10;
      currentElev = Math.round(Math.max(2, currentElev + diff) * 10) / 10;
      return {
        splitIndex: sp.splitIndex,
        elevationMeters: currentElev,
        diff,
        paceSecPerKm: sp.paceSecPerKm,
        formattedPace: sp.formattedPace,
        hr: Math.round(sp.averageHeartrate || selectedActivity.avgHr || 145),
        cadence: Math.round(sp.cadenceSpm || selectedActivity.avgCadence || 174),
        isValid: sp.isValid,
      };
    });

    const maxElev = Math.max(...elevationProfile.map((e) => e.elevationMeters), 25);
    const minElev = Math.min(...elevationProfile.map((e) => e.elevationMeters), 0);

    const userMaxHr = selectedActivity.maxHr || 192;
    const zones = [
      { id: 'Z1', name: 'Z1 • Khởi động / Phục hồi', color: 'bg-sky-500', count: 0 },
      { id: 'Z2', name: 'Z2 • Đốt mỡ / Nền tảng bền (Aerobic)', color: 'bg-emerald-500', count: 0 },
      { id: 'Z3', name: 'Z3 • Phát triển sức bền (Tempo)', color: 'bg-amber-500', count: 0 },
      { id: 'Z4', name: 'Z4 • Ngưỡng Lactate (Threshold)', color: 'bg-orange-500', count: 0 },
      { id: 'Z5', name: 'Z5 • Cường độ tối đa (VO2 Max)', color: 'bg-rose-500', count: 0 },
    ];

    elevationProfile.forEach((pt) => {
      const pct = pt.hr / userMaxHr;
      if (pct < 0.65) zones[0].count++;
      else if (pct < 0.75) zones[1].count++;
      else if (pct < 0.85) zones[2].count++;
      else if (pct < 0.92) zones[3].count++;
      else zones[4].count++;
    });

    const totalPts = Math.max(elevationProfile.length, 1);
    const hrZones = zones.map((z) => ({
      ...z,
      percentage: Math.round((z.count / totalPts) * 100),
    }));

    const estimatedCalories =
      selectedActivity.calories || Math.round(selectedActivity.validDistanceKm * 65);

    return {
      splits,
      bestPaceSec,
      maxPaceSec,
      minPaceSec,
      elevationProfile,
      maxElev,
      minElev,
      hrZones,
      estimatedCalories,
    };
  }, [selectedActivity]);

  // Summary KPIs & Recent 7-Run Bar Chart across active (non-hidden) activities
  const summaryStats = useMemo(() => {
    const scopeActs = activities.filter((act) => {
      if (!isAdmin || ownerFilter === 'mine') {
        return isMyActivity(act);
      }
      return true;
    });

    const activeActs = scopeActs.filter((a) => !a.isHidden && a.validDistanceKm > 0);
    const totalValidKm = activeActs.reduce((acc, a) => acc + a.validDistanceKm, 0);
    const totalElevation = activeActs.reduce((acc, a) => acc + a.elevationGain, 0);
    const totalTimeSec = activeActs.reduce((acc, a) => acc + a.movingTimeSec, 0);
    const avgPace = totalValidKm > 0 ? Math.round(totalTimeSec / totalValidKm) : 330;

    // Recent 7 valid runs for the top bar chart
    const recentBars = activeActs
      .slice(0, 7)
      .reverse()
      .map((a) => ({
        id: a.id,
        label: a.dateStr.split('•')[0]?.trim().slice(0, 5) || 'Buổi',
        km: Math.round(a.validDistanceKm * 10) / 10,
        name: a.name,
      }));

    return {
      totalRuns: scopeActs.length,
      activeRunsCount: activeActs.length,
      hiddenRunsCount: scopeActs.filter((a) => a.isHidden).length,
      totalValidKm: Math.round(totalValidKm * 100) / 100,
      totalElevation: Math.round(totalElevation),
      avgPaceFormatted: formatPace(avgPace),
      recentBars,
    };
  }, [activities, ownerFilter, isAdmin, currentUserId]);

  const hoveredSplitDetail =
    analytics?.elevationProfile?.find((p) => p.splitIndex === hoveredSplitKm) ||
    analytics?.elevationProfile?.[0];

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. TOP SUMMARY DASHBOARD & RECENT RUNS VOLUME CHART (CHART 1/4)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: KPI Summary + Quick Strava Sync Controls */}
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 flex flex-col justify-between space-y-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FC4C02]/10 text-[#FC4C02] text-xs font-semibold">
                <Activity className="w-3.5 h-3.5" />
                <span>Nhật ký Hoạt động &amp; Đồng bộ Strava</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">
                Thống kê quãng đường hợp lệ tính vào Giải chạy
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onSyncStravaLive}
                disabled={isSyncingStrava}
                className="px-4 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStrava ? 'animate-spin' : ''}`} />
                <span>{isSyncingStrava ? 'Đang tải từ Strava...' : 'Đồng bộ Strava ngay'}</span>
              </button>

              <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition">
                <FileUp className="w-3.5 h-3.5 text-[#FC4C02]" />
                <span>Nhập file GPX</span>
                <input type="file" accept=".gpx,.xml" onChange={onGpxUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* 4 Clean KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Hoạt động tính giải
              </div>
              <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                {summaryStats.activeRunsCount}{' '}
                <span className="text-xs font-normal text-slate-400">
                  / {summaryStats.totalRuns} buổi
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Tổng km tính vào Giải
              </div>
              <div className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {summaryStats.totalValidKm} <span className="text-xs font-normal">km</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Pace TB • Độ cao
              </div>
              <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-1.5">
                {summaryStats.avgPaceFormatted.replace(' /km', '')}{' '}
                <span className="text-xs text-slate-400">• +{summaryStats.totalElevation}m</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Hoạt động đã ẩn
              </div>
              <div className="text-xl font-extrabold font-mono text-slate-600 dark:text-slate-300 mt-1">
                {summaryStats.hiddenRunsCount}{' '}
                <span className="text-xs font-normal text-slate-400">buổi (0 km)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 cols: CHART 1/4 — Biểu đồ Khối lượng các buổi chạy gần nhất */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#FC4C02]" />
                <span>Biểu đồ quãng đường các buổi chạy gần nhất</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chỉ thống kê các buổi chạy đang bật tính điểm vào Giải (tỷ lệ thực 1:1)
              </p>
            </div>
          </div>

          <div className="h-32 flex items-end justify-between gap-2 pt-4 px-1">
            {summaryStats.recentBars.map((bar) => {
              const maxBarKm = Math.max(...summaryStats.recentBars.map((b) => b.km), 12);
              const pct = Math.max(12, Math.round((bar.km / maxBarKm) * 100));
              const isCurrent = selectedActivity ? bar.id === selectedActivity.id : false;
              return (
                <div
                  key={bar.id}
                  onClick={() => onSelectActivity(bar.id)}
                  className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer"
                  title={`${bar.name}: ${bar.km} km`}
                >
                  <div className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                    {bar.km}k
                  </div>
                  <div className="w-full max-w-[28px] bg-slate-100 dark:bg-slate-800/80 rounded-t-md h-20 relative flex items-end overflow-hidden">
                    <div
                      className={`w-full rounded-t-md transition-all ${isCurrent ? 'bg-[#FC4C02]' : 'bg-emerald-500/80 group-hover:bg-[#FC4C02]'
                        }`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[44px]">
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. FILTER & SEARCH TOOLBAR
         ===================================================================== */}
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Owner Filter: Admin can switch between My Runs and All Club Runs; Runners can only see My Runs */}
          {isAdmin ? (
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOwnerFilter('mine')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${ownerFilter === 'mine'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <User className="w-3.5 h-3.5 text-[#FC4C02]" />
                <span>Hoạt động của tôi</span>
              </button>
              <button
                type="button"
                onClick={() => setOwnerFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${ownerFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Toàn CLB (Admin)</span>
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <User className="w-3.5 h-3.5 text-[#FC4C02]" />
              <span>Hoạt động cá nhân ({summaryStats.totalRuns})</span>
            </div>
          )}

          {/* Status Filter */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'valid', label: 'Đang tính giải' },
              { id: 'flagged', label: 'Có cắt km lỗi' },
              { id: 'hidden', label: `Đã ẩn (${hiddenCount})` },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${statusFilter === st.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên bài chạy, mã Strava, thiết bị..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#FC4C02]"
          />
        </div>
      </div>

      {/* =====================================================================
          3. MASTER–DETAIL TRACKLOG EXPLORER
         ===================================================================== */}
      {!selectedActivity || !analytics || filteredActivities.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#FC4C02]/10 text-[#FC4C02] flex items-center justify-center mx-auto">
            <Activity className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Chưa có tracklog hoạt động nào
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tài khoản này chưa có buổi chạy nào được ghi nhận. Hãy liên kết tài khoản Strava để đồng bộ tự động hoặc bấm nút &quot;Nhập file GPX&quot; ở trên để tải tracklog bài chạy của bạn.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onSyncStravaLive}
              disabled={isSyncingStrava}
              className="px-4 py-2.5 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStrava ? 'animate-spin' : ''}`} />
              <span>Đồng bộ Strava</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (4 COLS): ACTIVITY FEED LIST WITH MINI-MAPS & HIDE/DELETE ACTIONS */}
          <div className="lg:col-span-4 space-y-3 max-h-[1250px] overflow-y-auto pr-1">
            {filteredActivities.map((act) => {
              const isSelected = act.id === selectedActivity.id;
              const miniMap = polylineToSvgPath(act.polyline, 88, 56, 6);
              const countedKm = act.isHidden ? 0 : act.validDistanceKm;

              return (
                <div
                  key={act.id}
                  onClick={() => onSelectActivity(act.id)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all space-y-3 ${act.isHidden ? 'opacity-65 ' : ''
                    }${isSelected
                      ? 'bg-white dark:bg-[#0F1420] border-[#FC4C02] ring-1 ring-[#FC4C02]/30 shadow-md'
                      : 'bg-white/80 dark:bg-[#0F1420]/70 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-[#FC4C02]/10 text-[#FC4C02] font-bold text-[10px] shrink-0">
                        {act.source}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 truncate">
                        #{act.externalId}
                      </span>
                    </div>

                    {act.isHidden ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                        Đã ẩn • Không tính giải
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${act.validDistanceKm === 0
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            : act.antiCheatStatus === AntiCheatStatus.VALID
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          }`}
                      >
                        {act.validDistanceKm === 0
                          ? 'Môn bổ trợ (0 km)'
                          : act.antiCheatStatus === AntiCheatStatus.VALID
                            ? 'Đang tính vào giải'
                            : 'Đã lọc km lỗi'}
                      </span>
                    )}
                  </div>

                  {/* Title + Mini GPS Route Preview */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`font-bold text-sm leading-snug line-clamp-2 ${act.isHidden
                            ? 'line-through text-slate-500 dark:text-slate-400'
                            : 'text-slate-900 dark:text-white'
                          }`}
                      >
                        {act.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span className="truncate">{act.dateStr}</span>
                      </p>
                    </div>

                    {/* Mini SVG Route Thumbnail */}
                    <div className="w-20 h-14 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-center shrink-0 p-1">
                      <svg viewBox="0 0 88 56" className="w-full h-full">
                        {miniMap.pathData && (
                          <path
                            d={miniMap.pathData}
                            fill="none"
                            stroke={act.isHidden ? '#94A3B8' : '#FC4C02'}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </svg>
                    </div>
                  </div>

                  {/* Metrics + Quick Hide/Delete Actions */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <div>
                        <span className="text-[10px] font-sans text-slate-400 block">Tính giải</span>
                        <span
                          className={`font-bold ${countedKm > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                            }`}
                        >
                          {countedKm > 0 ? `+${countedKm} km` : '0 km'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-sans text-slate-400 block">Pace TB</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {act.avgPaceSecPerKm > 0 ? formatPace(act.avgPaceSecPerKm, false) : '--:--'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-sans text-slate-400 block">Nhịp tim</span>
                        <span className="font-semibold text-rose-500">
                          {act.avgHr ? `${Math.round(act.avgHr)}` : '--'}
                        </span>
                      </div>
                    </div>

                    {/* Quick Hide & Delete Buttons on Card (Owner or Admin only) */}
                    {(isAdmin || isMyActivity(act)) && (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleHideActivity(act.id)}
                          title={
                            act.isHidden
                              ? 'Hiện lại và tính hoạt động này vào Giải chạy'
                              : 'Ẩn hoạt động này (Không tính vào Giải chạy)'
                          }
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                        >
                          {act.isHidden ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-500" />
                              <span>Hiện</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-slate-400" />
                              <span>Ẩn</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteActivity(act.id)}
                          title="Xoá hoạt động này khỏi Nhật ký và trừ khỏi Giải chạy"
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT COLUMN (8 COLS): FULL TELEMETRY & INTERACTIVE MAP DETAIL VIEW */}
          <div className="lg:col-span-8 space-y-6">
            {/* 3.1. Activity Header & Interactive Map Card */}
            <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#FC4C02]/10 text-[#FC4C02] text-xs font-bold">
                      {selectedActivity.source}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Strava ID: #{selectedActivity.externalId}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {selectedActivity.dateStr}
                    </span>
                    {selectedActivity.isHidden && (
                      <span className="px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-bold">
                        Đã ẩn • Không tính vào Giải chạy (0 km)
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {selectedActivity.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Vận động viên:{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {selectedActivity.userName}
                    </strong>{' '}
                    ({selectedActivity.department}) • Thiết bị ghi nhận:{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {selectedActivity.deviceName}
                    </strong>
                  </p>
                </div>

                {/* Detail Action Buttons: Hide/Unhide, Delete, Share */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {(isAdmin || isMyActivity(selectedActivity)) && (
                    <>
                      <button
                        type="button"
                        onClick={() => onToggleHideActivity(selectedActivity.id)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${selectedActivity.isHidden
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                      >
                        {selectedActivity.isHidden ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Hiện lại &amp; Tính vào giải</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Ẩn khỏi giải</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteActivity(selectedActivity.id)}
                        className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xoá hoạt động</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={onOpenShareModal}
                    className="px-4 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Chia sẻ</span>
                  </button>
                </div>
              </div>

              {/* Anti-Cheat Split Filter Alert if applicable */}
              {selectedActivity.flagReasons.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Báo cáo kiểm duyệt tốc độ từng km (Split-Level Anti-Cheat)</span>
                  </div>
                  {selectedActivity.flagReasons.map((reason, idx) => (
                    <p key={idx} className="pl-6 leading-relaxed">
                      {reason}
                    </p>
                  ))}
                </div>
              )}

              {/* INTERACTIVE STREET / DARK / SATELLITE MAP */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 relative">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#FC4C02]" />
                    <span className="font-semibold text-white">
                      Bản đồ đường chạy GPS tương tác (Chấm tròn = Cột mốc từng Km)
                    </span>
                  </div>

                  <div className="inline-flex p-0.5 rounded-lg bg-slate-800 border border-slate-700">
                    {[
                      { id: 'dark', label: 'Bản đồ Tối' },
                      { id: 'street', label: 'Đường phố' },
                      { id: 'satellite', label: 'Vệ tinh' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setMapStyle(st.id as any)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${mapStyle === st.id
                            ? 'bg-[#FC4C02] text-white'
                            : 'text-slate-300 hover:text-white'
                          }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div ref={mapContainerRef} className="w-full h-80 z-10" />

                <div className="px-4 py-2.5 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-300">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Xuất phát
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0F172A] border border-[#FC4C02] inline-block" />
                      Cột mốc Km hợp lệ
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
                      Km vượt ngưỡng tốc độ
                    </span>
                  </div>

                  <div className="font-mono text-xs text-amber-400 font-semibold">
                    {hoveredSplitKm && hoveredSplitDetail
                      ? `Đang chọn Km ${hoveredSplitDetail.splitIndex}: Pace ${hoveredSplitDetail.formattedPace} • ${hoveredSplitDetail.hr} bpm`
                      : 'Di chuột vào các biểu đồ bên dưới để định vị từng Km trên bản đồ'}
                  </div>
                </div>
              </div>

              {/* 8 COMPREHENSIVE TELEMETRY STAT CARDS (NO x2 MULTIPLIER) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Quãng đường hợp lệ / Gốc
                  </div>
                  <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                    {selectedActivity.validDistanceKm}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {selectedActivity.rawDistanceKm} km
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Quãng đường tính vào Giải
                  </div>
                  <div
                    className={`text-base font-extrabold font-mono mt-1 ${selectedActivity.isHidden
                        ? 'text-slate-400 line-through'
                        : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                  >
                    {selectedActivity.isHidden ? '0 km (Đã ẩn)' : `+${selectedActivity.validDistanceKm} km`}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Pace trung bình</div>
                  <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                    {selectedActivity.avgPaceSecPerKm > 0
                      ? formatPace(selectedActivity.avgPaceSecPerKm)
                      : '--:--'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Km nhanh nhất (Best Split)
                  </div>
                  <div className="text-base font-extrabold font-mono text-[#FC4C02] mt-1">
                    {analytics.bestPaceSec > 0 ? formatPace(analytics.bestPaceSec) : '--:--'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Thời gian di chuyển
                  </div>
                  <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                    {formatDuration(selectedActivity.movingTimeSec)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Nhịp tim TB / Max
                  </div>
                  <div className="text-base font-extrabold font-mono text-rose-500 mt-1">
                    {Math.round(selectedActivity.avgHr || 0)}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {Math.round(selectedActivity.maxHr || (selectedActivity.avgHr || 140) + 16)} bpm
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Guồng chân (Cadence)
                  </div>
                  <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                    {Math.round(selectedActivity.avgCadence || 0)}{' '}
                    <span className="text-xs font-normal text-slate-400">spm</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Độ cao • Năng lượng
                  </div>
                  <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                    +{Math.round(selectedActivity.elevationGain || 0)}m{' '}
                    <span className="text-xs font-normal text-slate-400">
                      • {analytics.estimatedCalories} kcal
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================================
              3.2. CHART 2/4: BIỂU ĐỒ KẾT HỢP PACE & ĐỘ CAO ĐỊA HÌNH
             ================================================================= */}
            <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Mountain className="w-4 h-4 text-[#FC4C02]" />
                    <span>Biểu đồ Tốc độ (Pace) &amp; Độ cao địa hình (Elevation Profile)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Di chuột qua từng cột mốc Km để xem tương quan giữa độ dốc địa hình và tốc độ chạy
                  </p>
                </div>

                {hoveredSplitDetail && (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-mono flex items-center gap-3">
                    <span className="font-bold text-[#FC4C02]">Km {hoveredSplitDetail.splitIndex}</span>
                    <span className="text-slate-700 dark:text-slate-200">
                      Pace: <strong>{hoveredSplitDetail.formattedPace}</strong>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Độ cao: <strong>{hoveredSplitDetail.elevationMeters}m</strong> (
                      {hoveredSplitDetail.diff >= 0
                        ? `+${hoveredSplitDetail.diff}m`
                        : `${hoveredSplitDetail.diff}m`}
                      )
                    </span>
                  </div>
                )}
              </div>

              <div className="relative h-52 w-full rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 p-4">
                <svg viewBox="0 0 640 160" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="elevAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#64748B" stopOpacity="0.38" />
                      <stop offset="100%" stopColor="#64748B" stopOpacity="0.04" />
                    </linearGradient>
                  </defs>

                  {[30, 75, 120].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={y}
                      x2="640"
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  ))}

                  {(() => {
                    const pts = analytics.elevationProfile;
                    const count = Math.max(pts.length - 1, 1);
                    const coords = pts.map((p, idx) => {
                      const x = (idx / count) * 600 + 20;
                      const y =
                        135 -
                        ((p.elevationMeters - analytics.minElev) /
                          Math.max(analytics.maxElev - analytics.minElev, 10)) *
                        85;
                      return `${x},${y}`;
                    });
                    const areaPath = `M 20,140 L ${coords.join(' L ')} L 620,140 Z`;
                    return <path d={areaPath} fill="url(#elevAreaGrad)" />;
                  })()}

                  {(() => {
                    const pts = analytics.elevationProfile;
                    const count = Math.max(pts.length - 1, 1);
                    const paceCoords = pts.map((p, idx) => {
                      const x = (idx / count) * 600 + 20;
                      const normalized =
                        (analytics.maxPaceSec - p.paceSecPerKm) /
                        Math.max(analytics.maxPaceSec - analytics.minPaceSec, 60);
                      const y = 125 - Math.min(1, Math.max(0, normalized)) * 95;
                      return { x, y, pt: p };
                    });

                    const linePath = paceCoords
                      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x},${c.y}`)
                      .join(' ');

                    return (
                      <>
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#FC4C02"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {paceCoords.map((c) => {
                          const isHovered = hoveredSplitKm === c.pt.splitIndex;
                          return (
                            <g
                              key={c.pt.splitIndex}
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredSplitKm(c.pt.splitIndex)}
                              onMouseLeave={() => setHoveredSplitKm(null)}
                            >
                              {isHovered && (
                                <line
                                  x1={c.x}
                                  y1={10}
                                  x2={c.x}
                                  y2={140}
                                  stroke="#FC4C02"
                                  strokeWidth="1.5"
                                  strokeDasharray="3 3"
                                />
                              )}
                              <circle
                                cx={c.x}
                                cy={c.y}
                                r={isHovered ? 6.5 : 4}
                                fill={c.pt.isValid ? '#FC4C02' : '#E11D48'}
                                stroke="#ffffff"
                                strokeWidth="2"
                              />
                              <text
                                x={c.x}
                                y={154}
                                textAnchor="middle"
                                className="fill-slate-400 font-mono text-[9px]"
                              >
                                K{c.pt.splitIndex}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* =================================================================
              3.3. CHART 3/4: BIỂU ĐỒ NHỊP TIM THEO KM & PHÂN BỔ 5 VÙNG NHỊP TIM
             ================================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-7 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500" />
                      <span>Diễn biến Nhịp tim (BPM) theo từng Km</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Trung bình: <strong>{Math.round(selectedActivity.avgHr || 0)} bpm</strong> • Guồng chân TB:{' '}
                      <strong>{Math.round(selectedActivity.avgCadence || 0)} spm</strong>
                    </p>
                  </div>
                </div>

                <div className="h-44 flex items-end justify-between gap-1.5 pt-6 px-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 p-4">
                  {analytics.elevationProfile.map((pt) => {
                    const hrPct = Math.min(100, Math.max(25, Math.round(((pt.hr - 90) / 105) * 100)));
                    const isHovered = hoveredSplitKm === pt.splitIndex;
                    const barColor =
                      pt.hr >= 168
                        ? 'bg-rose-500'
                        : pt.hr >= 155
                          ? 'bg-orange-500'
                          : pt.hr >= 140
                            ? 'bg-amber-500'
                            : 'bg-emerald-500';
                    return (
                      <div
                        key={pt.splitIndex}
                        onMouseEnter={() => setHoveredSplitKm(pt.splitIndex)}
                        onMouseLeave={() => setHoveredSplitKm(null)}
                        className="flex-1 flex flex-col items-center justify-end h-full gap-1 cursor-pointer group"
                      >
                        <span
                          className={`text-[9px] font-mono font-bold transition ${isHovered
                              ? 'text-rose-500 opacity-100'
                              : 'text-slate-400 opacity-0 group-hover:opacity-100'
                            }`}
                        >
                          {pt.hr}
                        </span>
                        <div className="w-full max-w-[22px] h-28 bg-slate-200/70 dark:bg-slate-800 rounded-t-md flex items-end overflow-hidden">
                          <div
                            className={`w-full rounded-t-md transition-all ${barColor} ${isHovered ? 'ring-2 ring-rose-400' : ''
                              }`}
                            style={{ height: `${hrPct}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">K{pt.splitIndex}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-5 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-4 shadow-sm">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-[#FC4C02]" />
                    <span>Phân bổ 5 Vùng Nhịp Tim</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tỷ lệ thời gian vận động trong từng vùng cường độ
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {analytics.hrZones.map((z) => (
                    <div key={z.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {z.name}
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {z.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${z.color} transition-all duration-500`}
                          style={{ width: `${Math.max(z.percentage, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* =================================================================
              3.4. CHART 4/4: BẢNG & BIỂU ĐỒ CỘT NGANG TỐC ĐỘ TỪNG KM (SPLITS TABLE)
             ================================================================= */}
            <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Chi tiết tốc độ từng Km (Splits Breakdown &amp; Kiểm duyệt Anti-Cheat)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ngưỡng Pace hợp lệ của giải: <strong>03:00/km – 15:00/km</strong>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {analytics.splits.map((sp) => {
                  const isFastest =
                    sp.isValid && sp.paceSecPerKm === analytics.bestPaceSec;
                  const isHovered = hoveredSplitKm === sp.splitIndex;
                  const barWidthPct = Math.min(
                    100,
                    Math.max(22, Math.round((360 / Math.max(sp.paceSecPerKm, 90)) * 65))
                  );
                  const splitKm = Math.round(((sp.distanceMeters || 1000) / 1000) * 100) / 100;

                  return (
                    <div
                      key={sp.splitIndex}
                      onMouseEnter={() => setHoveredSplitKm(sp.splitIndex)}
                      onMouseLeave={() => setHoveredSplitKm(null)}
                      className={`p-2.5 rounded-xl border flex flex-wrap sm:flex-nowrap items-center gap-3 text-xs transition cursor-pointer ${isHovered
                          ? 'border-[#FC4C02] bg-[#FC4C02]/5 dark:bg-[#FC4C02]/10'
                          : sp.isValid
                            ? 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800'
                            : 'bg-rose-50/60 dark:bg-rose-950/25 border-rose-200 dark:border-rose-800/60'
                        }`}
                    >
                      <div className="w-16 font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <span>Km {sp.splitIndex}</span>
                      </div>

                      <div className="flex-1 min-w-[160px] bg-slate-200/70 dark:bg-slate-800 h-6 rounded-lg overflow-hidden relative flex items-center">
                        <div
                          className={`h-full rounded-lg transition-all ${!sp.isValid
                              ? 'bg-rose-500'
                              : isFastest
                                ? 'bg-[#FC4C02]'
                                : 'bg-emerald-500/80'
                            }`}
                          style={{ width: `${barWidthPct}%` }}
                        />
                        <span className="absolute left-3 font-mono font-bold text-[11px] text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{sp.formattedPace}</span>
                          {isFastest && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[9px] font-sans font-bold">
                              Nhanh nhất
                            </span>
                          )}
                        </span>
                      </div>

                      <span className="w-16 text-right font-mono text-slate-500 dark:text-slate-400">
                        {Math.round((sp.elevationDiffMeters || 0) * 10) / 10 >= 0
                          ? `+${Math.round((sp.elevationDiffMeters || 0) * 10) / 10}m`
                          : `${Math.round((sp.elevationDiffMeters || 0) * 10) / 10}m`}
                      </span>

                      <span className="w-20 text-right font-mono text-slate-600 dark:text-slate-300 flex items-center justify-end gap-1">
                        <Heart className="w-3 h-3 text-rose-500" />
                        {sp.averageHeartrate ? Math.round(sp.averageHeartrate) : '--'}
                      </span>

                      <span className="w-36 text-right font-semibold">
                        {sp.isValid ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{splitKm} km hợp lệ
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400">
                            Loại ({sp.invalidReason})
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
