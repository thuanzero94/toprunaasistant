'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  Heart,
  Zap,
  Mountain,
  Gauge,
  RotateCw,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  formatSportSpeed,
  formatSportDistance,
  getSpeedMetricLabel,
  getSpeedSplitLabel,
  getSpeedUnit,
  calculateSpeedKmh,
  normalizeSportCategory,
  roundKm,
} from '@toprun/shared';
import type { TracklogActivityItem, TracklogSplitItem } from '../UserTracklogExplorer';

interface Props {
  activity: TracklogActivityItem;
  splits: TracklogSplitItem[];
  hoveredSplitKm: number | null;
  onHoverSplitKm: (km: number | null) => void;
  theme: 'dark' | 'light';
}

type TabType = 'all' | 'hr' | 'speed' | 'elevation' | 'cadence' | 'power';

export default function TracklogTelemetryCharts({
  activity,
  splits,
  hoveredSplitKm,
  onHoverSplitKm,
  theme,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const sportCat = normalizeSportCategory(activity.sportType);

  // Check if cadence or power data is available
  const hasCadence = useMemo(() => {
    return Boolean(
      (activity.avgCadence && activity.avgCadence > 0) ||
        splits.some((s) => s.cadenceSpm && s.cadenceSpm > 0)
    );
  }, [activity.avgCadence, splits]);

  const hasPower = useMemo(() => {
    return Boolean(
      (activity.avgWatts && activity.avgWatts > 0) ||
        splits.some((s) => s.watts && s.watts > 0)
    );
  }, [activity.avgWatts, splits]);

  // Build telemetry points from splits
  const telemetryPoints = useMemo(() => {
    let cumElev = Math.max(10, Math.round(activity.elevationGain * 0.3));
    let cumDistM = 0;

    return splits.map((sp, idx) => {
      cumDistM += sp.distanceMeters || 1000;
      const diff = Math.round((sp.elevationDiffMeters || 0) * 10) / 10;
      cumElev = Math.round(Math.max(2, cumElev + diff) * 10) / 10;

      // Heart rate
      const hr = sp.averageHeartrate || (activity.avgHr ? Math.round(activity.avgHr) : 145);

      // Speed / Pace
      let rawSpeed = 0;
      if (sportCat === 'Ride') {
        rawSpeed = calculateSpeedKmh(sp.paceSecPerKm);
      } else if (sportCat === 'Swim') {
        rawSpeed = Math.round((sp.paceSecPerKm || 2000) / 10); // s/100m
      } else {
        rawSpeed = sp.paceSecPerKm || 330; // s/km
      }

      // Cadence
      const cad = sp.cadenceSpm || activity.avgCadence || (sportCat === 'Ride' ? 82 : 172);

      // Power
      const pwr = sp.watts || activity.avgWatts || (hasPower ? 180 : 0);

      return {
        splitIndex: sp.splitIndex,
        distKm: roundKm(cumDistM / 1000),
        elevation: cumElev,
        elevDiff: diff,
        hr,
        paceSecPerKm: sp.paceSecPerKm,
        speedValue: rawSpeed,
        speedFormatted: sp.formattedPace || formatSportSpeed(sp.paceSecPerKm, activity.sportType),
        cadence: Math.round(cad),
        power: Math.round(pwr),
        isValid: sp.isValid,
        invalidReason: sp.invalidReason,
      };
    });
  }, [splits, activity, sportCat, hasPower]);

  // Max / Min stats for metrics
  const stats = useMemo(() => {
    if (telemetryPoints.length === 0) {
      return {
        hr: { min: 120, max: 180, avg: 150 },
        elev: { min: 0, max: 100, gain: Math.round(activity.elevationGain) },
        speed: { min: 10, max: 50, avg: 25 },
        cadence: { min: 60, max: 100, avg: 85 },
        power: { min: 100, max: 300, avg: 200 },
      };
    }

    const hrs = telemetryPoints.map((p) => p.hr).filter((v) => v > 0);
    const elevs = telemetryPoints.map((p) => p.elevation);
    const speeds = telemetryPoints.map((p) => p.speedValue).filter((v) => v > 0);
    const cads = telemetryPoints.map((p) => p.cadence).filter((v) => v > 0);
    const pwrs = telemetryPoints.map((p) => p.power).filter((v) => v > 0);

    return {
      hr: {
        min: hrs.length ? Math.min(...hrs) : 120,
        max: hrs.length ? Math.max(...hrs) : 185,
        avg: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : Math.round(activity.avgHr || 150),
      },
      elev: {
        min: Math.min(...elevs, 0),
        max: Math.max(...elevs, 25),
        gain: Math.round(activity.elevationGain),
      },
      speed: {
        min: speeds.length ? Math.min(...speeds) : 10,
        max: speeds.length ? Math.max(...speeds) : 60,
        avg: speeds.length ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 25,
      },
      cadence: {
        min: cads.length ? Math.min(...cads) : 60,
        max: cads.length ? Math.max(...cads) : 190,
        avg: cads.length ? Math.round(cads.reduce((a, b) => a + b, 0) / cads.length) : Math.round(activity.avgCadence || 80),
      },
      power: {
        min: pwrs.length ? Math.min(...pwrs) : 100,
        max: pwrs.length ? Math.max(...pwrs) : 400,
        avg: pwrs.length ? Math.round(pwrs.reduce((a, b) => a + b, 0) / pwrs.length) : Math.round(activity.avgWatts || 180),
      },
    };
  }, [telemetryPoints, activity]);

  // Heart rate zone helper
  const getHrZoneBadge = (hr: number) => {
    if (hr >= 170) return { label: 'Zone 5 (Vô khí)', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' };
    if (hr >= 155) return { label: 'Zone 4 (Ngưỡng Lactic)', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' };
    if (hr >= 140) return { label: 'Zone 3 (Hiếu khí Tempo)', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' };
    if (hr >= 120) return { label: 'Zone 2 (Đốt mỡ Base)', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30' };
    return { label: 'Zone 1 (Phục hồi)', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
  };

  // Helper to render an SVG Sparkline / Area Chart
  const renderLineChart = (
    data: Array<{ x: number; y: number; splitIndex: number }>,
    minY: number,
    maxY: number,
    strokeColor: string,
    fillId: string,
    unit: string,
    formatValue: (v: number) => string
  ) => {
    const width = 600;
    const height = 140;
    const paddingX = 20;
    const paddingY = 20;

    const rangeY = Math.max(maxY - minY, 1);
    const rangeX = Math.max(data.length - 1, 1);

    const points = data.map((d, i) => {
      const x = paddingX + (i / rangeX) * (width - paddingX * 2);
      const y = height - paddingY - ((d.y - minY) / rangeY) * (height - paddingY * 2);
      return { ...d, x, y };
    });

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1]?.x || width} ${height - paddingY} L ${points[0]?.x || 0} ${height - paddingY} Z`;

    const hoveredPoint = points.find((p) => p.splitIndex === hoveredSplitKm);

    return (
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36 select-none overflow-visible">
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeDasharray="3 3"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeDasharray="3 3"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="currentColor"
            strokeOpacity="0.15"
          />

          {/* Area fill */}
          <path d={areaD} fill={`url(#${fillId})`} />

          {/* Stroke Line */}
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Hover Crosshair Line */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={paddingY}
              x2={hoveredPoint.x}
              y2={height - paddingY}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeDasharray="2 2"
              className="animate-pulse"
            />
          )}

          {/* Points */}
          {points.map((p) => {
            const isHovered = p.splitIndex === hoveredSplitKm;
            return (
              <g
                key={p.splitIndex}
                className="cursor-pointer"
                onMouseEnter={() => onHoverSplitKm(p.splitIndex)}
                onMouseLeave={() => onHoverSplitKm(null)}
              >
                {/* Transparent hit target */}
                <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5 : 3}
                  fill={isHovered ? strokeColor : theme === 'dark' ? '#0F1420' : '#ffffff'}
                  stroke={strokeColor}
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute top-1 pointer-events-none -translate-x-1/2 z-30 px-2.5 py-1 rounded-lg bg-slate-900/90 text-white border border-slate-700 shadow-xl text-xs font-mono flex items-center gap-1.5 backdrop-blur-md"
            style={{ left: `${(hoveredPoint.x / width) * 100}%` }}
          >
            <span className="font-bold text-amber-400">Km {hoveredPoint.splitIndex}:</span>
            <span className="font-extrabold">{formatValue(hoveredPoint.y)}</span>
            <span className="text-[10px] text-slate-400">{unit}</span>
          </div>
        )}
      </div>
    );
  };

  const hoveredData = useMemo(() => {
    if (!hoveredSplitKm) return null;
    return telemetryPoints.find((p) => p.splitIndex === hoveredSplitKm) || null;
  }, [telemetryPoints, hoveredSplitKm]);

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-5">
      {/* 1. Header & Metric Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FC4C02]/10 flex items-center justify-center text-[#FC4C02]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Biểu Đồ Telemetry Chi Tiết</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                Đồng bộ GPS
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Rê chuột trên biểu đồ để định vị vị trí và Km split trên đường chạy
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-semibold">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tất cả</span>
          </button>

          <button
            onClick={() => setActiveTab('hr')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'hr'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>Nhịp tim</span>
          </button>

          <button
            onClick={() => setActiveTab('speed')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'speed'
                ? 'bg-[#FC4C02] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-[#FC4C02]" />
            <span>{sportCat === 'Ride' ? 'Tốc độ (km/h)' : 'Nhịp độ (Pace)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('elevation')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'elevation'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Mountain className="w-3.5 h-3.5 text-emerald-500" />
            <span>Độ cao</span>
          </button>

          {hasCadence && (
            <button
              onClick={() => setActiveTab('cadence')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'cadence'
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5 text-indigo-500" />
              <span>{sportCat === 'Ride' ? 'Nhịp đạp (rpm)' : 'Guồng chân (spm)'}</span>
            </button>
          )}

          {hasPower && (
            <button
              onClick={() => setActiveTab('power')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'power'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Công suất (W)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Live Telemetry HUD Bar (when hovered) */}
      {hoveredData && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[#FC4C02] text-white font-mono font-bold flex items-center justify-center text-xs">
              {hoveredData.splitIndex}
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Mốc Km #{hoveredData.splitIndex} ({hoveredData.distKm} km)
            </span>
            {!hoveredData.isValid && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">
                Loại ({hoveredData.invalidReason})
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-5 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-slate-400">Tim:</span>
              <span className="font-bold text-slate-900 dark:text-white">{hoveredData.hr} bpm</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-[#FC4C02]" />
              <span className="text-slate-400">{getSpeedSplitLabel(activity.sportType)}:</span>
              <span className="font-bold text-[#FC4C02]">{hoveredData.speedFormatted}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Mountain className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-slate-400">Độ cao:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {hoveredData.elevation}m ({hoveredData.elevDiff >= 0 ? `+${hoveredData.elevDiff}m` : `${hoveredData.elevDiff}m`})
              </span>
            </div>

            {hasCadence && (
              <div className="flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-slate-400">Cadence:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {hoveredData.cadence} {sportCat === 'Ride' ? 'rpm' : 'spm'}
                </span>
              </div>
            )}

            {hasPower && (
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-slate-400">Power:</span>
                <span className="font-bold text-amber-500">{hoveredData.power} W</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Main Chart View Area */}
      <div className="space-y-6">
        {/* TAB: HR */}
        {(activeTab === 'all' || activeTab === 'hr') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Nhịp tim (Heart Rate)</span>
              </span>
              <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                <span>Min: {stats.hr.min} bpm</span>
                <span>•</span>
                <span className="font-bold text-rose-500">TB: {stats.hr.avg} bpm</span>
                <span>•</span>
                <span>Max: {stats.hr.max} bpm</span>
              </div>
            </div>

            {renderLineChart(
              telemetryPoints.map((p) => ({ x: p.distKm, y: p.hr, splitIndex: p.splitIndex })),
              Math.max(stats.hr.min - 15, 60),
              stats.hr.max + 10,
              '#F43F5E',
              'hrGradient',
              'bpm',
              (v) => `${Math.round(v)}`
            )}
          </div>
        )}

        {/* TAB: SPEED / PACE */}
        {(activeTab === 'all' || activeTab === 'speed') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-[#FC4C02]" />
                <span>
                  {sportCat === 'Ride'
                    ? 'Tốc độ xe đạp (Speed)'
                    : sportCat === 'Swim'
                    ? 'Nhịp độ bơi (Pace /100m)'
                    : 'Nhịp độ chạy (Pace /km)'}
                </span>
              </span>
              <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                <span className="font-bold text-[#FC4C02]">
                  TB: {formatSportSpeed(activity.avgPaceSecPerKm, activity.sportType)}
                </span>
                <span>•</span>
                <span>Đơn vị: {getSpeedUnit(activity.sportType)}</span>
              </div>
            </div>

            {renderLineChart(
              telemetryPoints.map((p) => ({ x: p.distKm, y: p.speedValue, splitIndex: p.splitIndex })),
              Math.max(0, stats.speed.min * 0.8),
              stats.speed.max * 1.15,
              '#FC4C02',
              'speedGradient',
              getSpeedUnit(activity.sportType),
              (v) => (sportCat === 'Ride' ? v.toFixed(1) : `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, '0')}`)
            )}
          </div>
        )}

        {/* TAB: ELEVATION */}
        {(activeTab === 'all' || activeTab === 'elevation') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-emerald-500" />
                <span>Sóng độ cao (Elevation Profile)</span>
              </span>
              <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                <span>Thấp nhất: {stats.elev.min}m</span>
                <span>•</span>
                <span>Cao nhất: {stats.elev.max}m</span>
                <span>•</span>
                <span className="font-bold text-emerald-500">+{stats.elev.gain}m leo dốc</span>
              </div>
            </div>

            {renderLineChart(
              telemetryPoints.map((p) => ({ x: p.distKm, y: p.elevation, splitIndex: p.splitIndex })),
              Math.max(0, stats.elev.min - 10),
              stats.elev.max + 10,
              '#10B981',
              'elevGradient',
              'm',
              (v) => `${Math.round(v)}`
            )}
          </div>
        )}

        {/* TAB: CADENCE (If present or selected) */}
        {hasCadence && (activeTab === 'all' || activeTab === 'cadence') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-indigo-500" />
                <span>{sportCat === 'Ride' ? 'Nhịp đạp bàn đạp (Cadence RPM)' : 'Guồng chân (Cadence SPM)'}</span>
              </span>
              <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                <span>Min: {stats.cadence.min}</span>
                <span>•</span>
                <span className="font-bold text-indigo-500">TB: {stats.cadence.avg}</span>
                <span>•</span>
                <span>Max: {stats.cadence.max}</span>
              </div>
            </div>

            {renderLineChart(
              telemetryPoints.map((p) => ({ x: p.distKm, y: p.cadence, splitIndex: p.splitIndex })),
              Math.max(40, stats.cadence.min - 10),
              stats.cadence.max + 10,
              '#6366F1',
              'cadenceGradient',
              sportCat === 'Ride' ? 'rpm' : 'spm',
              (v) => `${Math.round(v)}`
            )}
          </div>
        )}

        {/* TAB: POWER (If present) */}
        {hasPower && (activeTab === 'all' || activeTab === 'power') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Công suất đạp xe (Cycling Power)</span>
              </span>
              <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                <span>Min: {stats.power.min} W</span>
                <span>•</span>
                <span className="font-bold text-amber-500">TB: {stats.power.avg} W</span>
                <span>•</span>
                <span>Max: {stats.power.max} W</span>
              </div>
            </div>

            {renderLineChart(
              telemetryPoints.map((p) => ({ x: p.distKm, y: p.power, splitIndex: p.splitIndex })),
              Math.max(50, stats.power.min - 20),
              stats.power.max + 20,
              '#F59E0B',
              'powerGradient',
              'W',
              (v) => `${Math.round(v)}`
            )}
          </div>
        )}
      </div>
    </div>
  );
}
