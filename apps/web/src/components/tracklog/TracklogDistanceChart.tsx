'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calendar,
  Clock,
  Flame,
  Activity,
  Zap,
} from 'lucide-react';
import { formatDuration, formatPace, roundKm, normalizeSportCategory } from '@toprun/shared';
import type { TracklogActivityItem } from '../UserTracklogExplorer';

type SportTypeFilter = 'Run' | 'Ride' | 'Swim';
type PeriodFilter = 'week' | 'month' | 'year';

interface TracklogDistanceChartProps {
  activities: TracklogActivityItem[];
  onSelectActivity?: (id: string) => void;
  selectedActivityId?: string;
}

interface BucketData {
  index: number;
  label: string;
  subLabel?: string;
  distanceKm: number;
  movingTimeSec: number;
  activityCount: number;
  activities: TracklogActivityItem[];
}

export default function TracklogDistanceChart({
  activities,
  onSelectActivity,
  selectedActivityId,
}: TracklogDistanceChartProps) {
  const [sportFilter, setSportFilter] = useState<SportTypeFilter>('Run');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [offset, setOffset] = useState<number>(0);
  const [hoveredBucket, setHoveredBucket] = useState<BucketData | null>(null);

  // Helper to normalize sport type strictly
  const matchSport = (act: TracklogActivityItem, filter: SportTypeFilter) => {
    const cat = normalizeSportCategory(act.sportType);
    return cat === filter;
  };

  // Base date anchoring
  const targetDate = useMemo(() => {
    const d = new Date();
    if (periodFilter === 'week') {
      d.setDate(d.getDate() + offset * 7);
    } else if (periodFilter === 'month') {
      d.setMonth(d.getMonth() + offset);
    } else if (periodFilter === 'year') {
      d.setFullYear(d.getFullYear() + offset);
    }
    return d;
  }, [periodFilter, offset]);

  // Compute period range & title
  const { periodLabel, startDate, endDate, bucketCount, getBucketIndex, formatBucketLabel } =
    useMemo(() => {
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth(); // 0-indexed

      if (periodFilter === 'week') {
        const current = new Date(targetDate);
        const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday...
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(current);
        monday.setDate(current.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const startStr = `${monday.getDate()}/${monday.getMonth() + 1}`;
        const endStr = `${sunday.getDate()}/${sunday.getMonth() + 1}/${sunday.getFullYear()}`;
        const label = `Tuần ${startStr} - ${endStr}`;

        return {
          periodLabel: label,
          startDate: monday,
          endDate: sunday,
          bucketCount: 7,
          getBucketIndex: (date: Date) => {
            const day = date.getDay();
            return day === 0 ? 6 : day - 1; // 0=T2, 6=CN
          },
          formatBucketLabel: (idx: number) => {
            const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
            const cur = new Date(monday);
            cur.setDate(monday.getDate() + idx);
            return {
              title: days[idx],
              sub: `${cur.getDate()}/${cur.getMonth() + 1}`,
            };
          },
        };
      }

      if (periodFilter === 'month') {
        const firstDay = new Date(year, month, 1, 0, 0, 0, 0);
        const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);
        const totalDays = lastDay.getDate();

        const label = `Tháng ${month + 1}/${year}`;

        return {
          periodLabel: label,
          startDate: firstDay,
          endDate: lastDay,
          bucketCount: totalDays,
          getBucketIndex: (date: Date) => date.getDate() - 1, // 0 to totalDays-1
          formatBucketLabel: (idx: number) => ({
            title: `${idx + 1}`,
            sub: `${idx + 1}/${month + 1}`,
          }),
        };
      }

      // Year filter
      const firstDay = new Date(year, 0, 1, 0, 0, 0, 0);
      const lastDay = new Date(year, 11, 31, 23, 59, 59, 999);
      const label = `Năm ${year}`;

      return {
        periodLabel: label,
        startDate: firstDay,
        endDate: lastDay,
        bucketCount: 12,
        getBucketIndex: (date: Date) => date.getMonth(), // 0 to 11
        formatBucketLabel: (idx: number) => ({
          title: `T${idx + 1}`,
          sub: `Thg ${idx + 1}`,
        }),
      };
    }, [targetDate, periodFilter]);

  // Aggregate bucket data
  const { buckets, summary } = useMemo(() => {
    const list: BucketData[] = Array.from({ length: bucketCount }, (_, i) => {
      const { title, sub } = formatBucketLabel(i);
      return {
        index: i,
        label: title,
        subLabel: sub,
        distanceKm: 0,
        movingTimeSec: 0,
        activityCount: 0,
        activities: [],
      };
    });

    let totalDist = 0;
    let totalTime = 0;
    let totalCount = 0;

    const filtered = activities.filter((act) => {
      if (act.isHidden) return false;
      if (!matchSport(act, sportFilter)) return false;
      if (!act.startDateIso) return false;
      const d = new Date(act.startDateIso);
      return d >= startDate && d <= endDate;
    });

    for (const act of filtered) {
      const d = new Date(act.startDateIso!);
      const idx = getBucketIndex(d);
      if (idx >= 0 && idx < bucketCount) {
        list[idx].distanceKm += act.validDistanceKm;
        list[idx].movingTimeSec += act.movingTimeSec;
        list[idx].activityCount += 1;
        list[idx].activities.push(act);

        totalDist += act.validDistanceKm;
        totalTime += act.movingTimeSec;
        totalCount += 1;
      }
    }

    const avgPaceSec = totalDist > 0 ? Math.round(totalTime / totalDist) : 0;

    return {
      buckets: list.map((b) => ({
        ...b,
        distanceKm: roundKm(b.distanceKm),
      })),
      summary: {
        totalDistanceKm: roundKm(totalDist),
        totalMovingTimeSec: totalTime,
        activityCount: totalCount,
        avgPaceSec,
      },
    };
  }, [
    activities,
    sportFilter,
    startDate,
    endDate,
    bucketCount,
    getBucketIndex,
    formatBucketLabel,
  ]);

  const maxBucketDistance = useMemo(() => {
    const maxVal = Math.max(...buckets.map((b) => b.distanceKm), 0);
    return maxVal > 0 ? maxVal : 10;
  }, [buckets]);

  // Accent theme per sport
  const sportTheme = {
    Run: {
      accentColor: '#FC4C02',
      badgeBg: 'bg-[#FC4C02]/10 text-[#FC4C02] border-[#FC4C02]/30',
      barGrad: 'from-[#FC4C02] to-[#FF7A00]',
      hoverBar: 'hover:bg-[#FC4C02]',
      iconName: '🏃 Chạy bộ',
    },
    Ride: {
      accentColor: '#10B981',
      badgeBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
      barGrad: 'from-emerald-500 to-teal-400',
      hoverBar: 'hover:bg-emerald-500',
      iconName: '🚴 Đạp xe',
    },
    Swim: {
      accentColor: '#06B6D4',
      badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      barGrad: 'from-cyan-500 to-blue-400',
      hoverBar: 'hover:bg-cyan-500',
      iconName: '🏊 Bơi lội',
    },
  }[sportFilter];

  return (
    <div className="rounded-3xl bg-white dark:bg-[#0C101B] border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs space-y-6">
      {/* ===================================================================
          1. HEADER CONTROLS (SPORT + PERIOD + NAV)
         =================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        {/* Title & Period Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FC4C02]/10 dark:bg-[#FC4C02]/15 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-[#FC4C02]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Biểu Đồ Quãng Đường Tập Luyện
              </h3>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${sportTheme.badgeBg}`}
              >
                {sportTheme.iconName}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-bold text-slate-700 dark:text-slate-200">{periodLabel}</span>
            </p>
          </div>
        </div>

        {/* Action Controls Group */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Sport Filter Pills */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            {(['Run', 'Ride', 'Swim'] as SportTypeFilter[]).map((sport) => {
              const isActive = sportFilter === sport;
              const label = sport === 'Run' ? 'Chạy' : sport === 'Ride' ? 'Đạp' : 'Bơi';
              return (
                <button
                  key={sport}
                  type="button"
                  onClick={() => setSportFilter(sport)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Period Filter (Tuần, Tháng, Năm) */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            {(['week', 'month', 'year'] as PeriodFilter[]).map((p) => {
              const isActive = periodFilter === p;
              const label = p === 'week' ? 'Tuần' : p === 'month' ? 'Tháng' : 'Năm';
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPeriodFilter(p);
                    setOffset(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#1E293B] text-[#FC4C02] dark:text-[#FC4C02] shadow-xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Quick Prev / Current / Next Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOffset((prev) => prev - 1)}
              title="Kỳ trước"
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {offset !== 0 && (
              <button
                type="button"
                onClick={() => setOffset(0)}
                title="Về hiện tại"
                className="px-2.5 py-1.5 rounded-xl border border-[#FC4C02]/30 bg-[#FC4C02]/10 hover:bg-[#FC4C02]/20 text-[#FC4C02] text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Nay</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setOffset((prev) => prev + 1)}
              title="Kỳ sau"
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================
          2. SUMMARY MINI METRIC CARDS
         =================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <Activity className="w-3.5 h-3.5 text-[#FC4C02]" />
            <span>Tổng Quãng Đường</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono tracking-tight">
            {summary.totalDistanceKm}{' '}
            <span className="text-xs font-bold text-slate-400">km</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Thời Gian Di Chuyển</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono tracking-tight">
            {formatDuration(summary.totalMovingTimeSec)}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Pace Trung Bình</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono tracking-tight">
            {summary.avgPaceSec > 0 ? formatPace(summary.avgPaceSec) : '--:--'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Số Buổi Vận Động</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono tracking-tight">
            {summary.activityCount}{' '}
            <span className="text-xs font-bold text-slate-400">buổi</span>
          </div>
        </div>
      </div>

      {/* ===================================================================
          3. INTERACTIVE DISTANCE BAR CHART
         =================================================================== */}
      <div className="relative pt-6 pb-2">
        {/* Floating Tooltip when hovering over a bar */}
        {hoveredBucket && hoveredBucket.distanceKm > 0 && (
          <div className="absolute top-0 right-4 z-20 px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs shadow-xl border border-slate-700/50 pointer-events-none flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="font-bold border-r border-slate-700 dark:border-slate-300 pr-2.5">
              <div>{hoveredBucket.subLabel || hoveredBucket.label}</div>
              <div className="text-[10px] opacity-75">{hoveredBucket.activityCount} buổi</div>
            </div>
            <div className="space-y-0.5">
              <div className="font-mono font-black text-sm text-[#FC4C02]">
                {hoveredBucket.distanceKm} km
              </div>
              <div className="text-[11px] opacity-85 flex items-center gap-2">
                <span>⏱️ {formatDuration(hoveredBucket.movingTimeSec)}</span>
                {hoveredBucket.distanceKm > 0 && (
                  <span>
                    ⚡{' '}
                    {formatPace(
                      Math.round(hoveredBucket.movingTimeSec / hoveredBucket.distanceKm)
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state overlay */}
        {summary.totalDistanceKm === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
            <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Không có dữ liệu {sportTheme.iconName.toLowerCase()} trong {periodLabel.toLowerCase()}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Hãy dùng các nút chuyển kỳ (&lt; hoặc &gt;) hoặc tải file GPX / đồng bộ Strava để nạp thêm hoạt động.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Bars container */}
            <div className="h-56 flex items-end gap-1 sm:gap-2 px-1 pt-6 pb-2">
              {buckets.map((b) => {
                const heightPercent =
                  b.distanceKm > 0
                    ? Math.max(8, Math.round((b.distanceKm / maxBucketDistance) * 100))
                    : 2;

                const hasActivities = b.distanceKm > 0;
                const isHovered = hoveredBucket?.index === b.index;

                return (
                  <div
                    key={b.index}
                    onMouseEnter={() => setHoveredBucket(b)}
                    onMouseLeave={() => setHoveredBucket(null)}
                    onClick={() => {
                      if (b.activities.length > 0 && onSelectActivity) {
                        onSelectActivity(b.activities[0].id);
                      }
                    }}
                    className={`flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative ${
                      hasActivities ? 'cursor-pointer' : 'opacity-40'
                    }`}
                  >
                    {/* Value label on top of bar if space permits */}
                    {hasActivities && (
                      <span
                        className={`text-[10px] font-mono font-bold transition mb-1 hidden sm:block ${
                          isHovered
                            ? 'text-[#FC4C02] scale-110 font-black'
                            : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                        }`}
                      >
                        {b.distanceKm >= 10 ? Math.round(b.distanceKm) : b.distanceKm}
                      </span>
                    )}

                    {/* Bar Pill */}
                    <div className="w-full max-w-[32px] flex items-end justify-center h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          hasActivities
                            ? isHovered
                              ? 'bg-gradient-to-t from-[#FC4C02] to-amber-400 shadow-md shadow-[#FC4C02]/40 scale-x-105'
                              : 'bg-gradient-to-t from-[#FC4C02]/80 to-[#FC4C02] group-hover:from-[#FC4C02] group-hover:to-amber-400'
                            : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis Labels */}
            <div className="flex items-center gap-1 sm:gap-2 px-1 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
              {buckets.map((b) => (
                <div
                  key={b.index}
                  className="flex-1 text-center truncate"
                  title={b.subLabel}
                >
                  <span
                    className={`text-[10px] sm:text-xs font-semibold block transition ${
                      hoveredBucket?.index === b.index
                        ? 'text-[#FC4C02] font-black'
                        : b.distanceKm > 0
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

