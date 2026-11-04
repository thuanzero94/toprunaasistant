'use client';

import React, { useMemo } from 'react';
import {
  TrendingUp,
  Activity,
  Heart,
  Compass,
  Zap,
  Flame,
  Award,
} from 'lucide-react';
import { formatPace, roundKm } from '@toprun/shared';
import type { TracklogActivityItem } from '../UserTracklogExplorer';

interface TracklogChartsOverviewProps {
  activities: TracklogActivityItem[];
  onSelectActivity?: (id: string) => void;
  selectedActivityId?: string;
}

export default function TracklogChartsOverview({
  activities,
  onSelectActivity,
  selectedActivityId,
}: TracklogChartsOverviewProps) {
  const validActivities = useMemo(() => {
    return activities.filter((a) => !a.isHidden && a.validDistanceKm > 0);
  }, [activities]);

  // CHART 1: Mileage Volume (Recent 8 runs)
  const volumeData = useMemo(() => {
    const runs = [...validActivities]
      .sort((a, b) => {
        const tA = a.startDateIso ? new Date(a.startDateIso).getTime() : 0;
        const tB = b.startDateIso ? new Date(b.startDateIso).getTime() : 0;
        return tA - tB;
      })
      .slice(-8);

    const maxKm = Math.max(...runs.map((r) => r.validDistanceKm), 10);

    return {
      runs: runs.map((r) => ({
        id: r.id,
        name: r.name,
        date: r.dateStr.split('•')[0]?.trim().slice(0, 5) || 'Buổi',
        km: roundKm(r.validDistanceKm),
        percent: Math.max(12, Math.round((r.validDistanceKm / maxKm) * 100)),
      })),
      maxKm,
    };
  }, [validActivities]);

  // CHART 2: Pace Progression Trendline (Recent 8 runs)
  const paceTrendData = useMemo(() => {
    const runs = [...validActivities]
      .sort((a, b) => {
        const tA = a.startDateIso ? new Date(a.startDateIso).getTime() : 0;
        const tB = b.startDateIso ? new Date(b.startDateIso).getTime() : 0;
        return tA - tB;
      })
      .slice(-8);

    if (runs.length === 0) return null;

    const paces = runs.map((r) => r.avgPaceSecPerKm || 330);
    const minPace = Math.min(...paces);
    const maxPace = Math.max(...paces);
    const range = Math.max(maxPace - minPace, 30);

    // Build SVG points (width: 320, height: 100)
    const pts = runs.map((r, idx) => {
      const x = runs.length === 1 ? 160 : Math.round(15 + (idx / (runs.length - 1)) * 290);
      // Faster pace (lower number) should be higher up on chart (smaller y)
      const pace = r.avgPaceSecPerKm || 330;
      const y = Math.round(15 + ((pace - minPace) / range) * 70);
      return { x, y, pace, label: r.dateStr.split('•')[0]?.trim().slice(0, 5), id: r.id };
    });

    const pathD = pts.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    return {
      pts,
      pathD,
      bestPaceFormatted: formatPace(minPace),
      avgPaceFormatted: formatPace(Math.round(paces.reduce((a, b) => a + b, 0) / paces.length)),
    };
  }, [validActivities]);

  // CHART 3: Heart Rate 5 Zones Distribution
  const hrZonesData = useMemo(() => {
    const zones = [
      { id: 'Z1', name: 'Z1 Phục hồi (<130 bpm)', minHr: 0, maxHr: 130, color: 'bg-sky-500', barColor: '#0EA5E9', count: 0 },
      { id: 'Z2', name: 'Z2 Hiếu khí (130-145)', minHr: 130, maxHr: 145, color: 'bg-emerald-500', barColor: '#10B981', count: 0 },
      { id: 'Z3', name: 'Z3 Tempo (145-160)', minHr: 145, maxHr: 160, color: 'bg-amber-500', barColor: '#F59E0B', count: 0 },
      { id: 'Z4', name: 'Z4 Ngưỡng (160-175)', minHr: 160, maxHr: 175, color: 'bg-[#FC4C02]', barColor: '#FC4C02', count: 0 },
      { id: 'Z5', name: 'Z5 Cực đại (>175 bpm)', minHr: 175, maxHr: 999, color: 'bg-rose-500', barColor: '#F43F5E', count: 0 },
    ];

    validActivities.forEach((act) => {
      const hr = act.avgHr || 142;
      const targetZone = zones.find((z) => hr >= z.minHr && hr < z.maxHr) || zones[2];
      targetZone.count += 1;
    });

    const totalCount = Math.max(validActivities.length, 1);
    return zones.map((z) => ({
      ...z,
      percentage: Math.round((z.count / totalCount) * 100),
    }));
  }, [validActivities]);

  // CHART 4: Distance Category Breakdown
  const distanceCategories = useMemo(() => {
    const buckets = [
      { label: '< 5 KM', desc: 'Khởi động / Phục hồi', count: 0, totalKm: 0, color: 'from-sky-400 to-blue-500' },
      { label: '5 - 10 KM', desc: 'Tiêu chuẩn thường ngày', count: 0, totalKm: 0, color: 'from-emerald-400 to-teal-500' },
      { label: '10 - 21 KM', desc: 'Long Run cuối tuần', count: 0, totalKm: 0, color: 'from-amber-400 to-orange-500' },
      { label: '≥ 21 KM', desc: 'Bán / Full Marathon', count: 0, totalKm: 0, color: 'from-purple-500 to-rose-500' },
    ];

    validActivities.forEach((act) => {
      const km = act.validDistanceKm;
      if (km < 5) {
        buckets[0].count++;
        buckets[0].totalKm += km;
      } else if (km < 10) {
        buckets[1].count++;
        buckets[1].totalKm += km;
      } else if (km < 21) {
        buckets[2].count++;
        buckets[2].totalKm += km;
      } else {
        buckets[3].count++;
        buckets[3].totalKm += km;
      }
    });

    const grandTotalKm = Math.max(validActivities.reduce((a, b) => a + b.validDistanceKm, 0), 1);
    return buckets.map((b) => ({
      ...b,
      totalKm: roundKm(b.totalKm),
      percentage: Math.round((b.totalKm / grandTotalKm) * 100),
    }));
  }, [validActivities]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. BIỂU ĐỒ CỘT SẢN LƯỢNG KM (MILEAGE VOLUME) */}
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FC4C02]/10 text-[#FC4C02] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Sản Lượng Quãng Đường
              </h4>
              <p className="text-[10px] text-slate-400">8 bài chạy gần nhất</p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-[#FC4C02]">
            Max: {roundKm(volumeData.maxKm)} km
          </span>
        </div>

        {/* Bar Chart Container */}
        <div className="h-28 flex items-end gap-1.5 pt-2">
          {volumeData.runs.length === 0 ? (
            <div className="w-full text-center text-xs text-slate-400 my-auto">
              Chưa có dữ liệu
            </div>
          ) : (
            volumeData.runs.map((r) => {
              const isSelected = r.id === selectedActivityId;
              return (
                <div
                  key={r.id}
                  onClick={() => onSelectActivity && onSelectActivity(r.id)}
                  className="flex-1 flex flex-col items-center justify-end h-full gap-1 group cursor-pointer"
                  title={`${r.name}: ${r.km} km (${r.date})`}
                >
                  <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition">
                    {r.km}
                  </span>
                  <div className="w-full rounded-t-md bg-slate-100 dark:bg-slate-800 h-full flex items-end overflow-hidden p-0.5">
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        isSelected
                          ? 'bg-[#FC4C02] shadow-sm shadow-[#FC4C02]/50'
                          : 'bg-gradient-to-t from-[#FC4C02]/60 to-[#FC4C02] group-hover:from-[#FC4C02] group-hover:to-amber-500'
                      }`}
                      style={{ height: `${r.percent}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 truncate max-w-full">
                    {r.date}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. BIỂU ĐỒ TIẾN TRÌNH PACE (PACE PROGRESSION TRENDLINE) */}
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Tiến Trình Tốc Độ (Pace)
              </h4>
              <p className="text-[10px] text-slate-400">Xu hướng nhanh dần</p>
            </div>
          </div>
          {paceTrendData && (
            <span className="text-[11px] font-mono font-bold text-emerald-500">
              Best: {paceTrendData.bestPaceFormatted}
            </span>
          )}
        </div>

        {/* SVG Trendline */}
        <div className="h-28 relative flex items-center justify-center">
          {!paceTrendData || paceTrendData.pts.length === 0 ? (
            <div className="text-xs text-slate-400">Chưa đủ dữ liệu bài chạy</div>
          ) : (
            <svg viewBox="0 0 320 100" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="paceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Reference Grid Line */}
              <line x1="10" y1="50" x2="310" y2="50" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" />
              {/* Path */}
              <path
                d={paceTrendData.pathD}
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data Points */}
              {paceTrendData.pts.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={pt.id === selectedActivityId ? 5 : 3.5}
                  className="fill-white dark:fill-[#0F1420] stroke-emerald-500 stroke-2 cursor-pointer hover:scale-125 transition"
                  onClick={() => onSelectActivity && onSelectActivity(pt.id)}
                />
              ))}
            </svg>
          )}
        </div>
      </div>

      {/* 3. PHÂN BỔ VÙNG NHỊP TIM 5 ZONES (HEART RATE DISTRIBUTION) */}
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Vùng Nhịp Tim (5 Zones)
              </h4>
              <p className="text-[10px] text-slate-400">Phân bố tim toàn bộ bài chạy</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {validActivities.length} bài
          </span>
        </div>

        {/* 5 Zones Bars */}
        <div className="space-y-1.5 h-28 flex flex-col justify-center">
          {hrZonesData.map((z) => (
            <div key={z.id} className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {z.name}
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {z.percentage}% ({z.count})
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${z.color}`}
                  style={{ width: `${z.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. PHÂN BỔ CỰ LY BÀI CHẠY (DISTANCE CATEGORIES) */}
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Phân Bổ Cự Ly Chạy
              </h4>
              <p className="text-[10px] text-slate-400">Theo cự ly hoàn thành</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-amber-500">
            {roundKm(validActivities.reduce((a, b) => a + b.validDistanceKm, 0))} km
          </span>
        </div>

        {/* Distance Buckets */}
        <div className="space-y-1.5 h-28 flex flex-col justify-center">
          {distanceCategories.map((b, i) => (
            <div key={i} className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {b.label} <span className="text-slate-400 font-normal">({b.desc})</span>
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {b.totalKm} km ({b.count} buổi)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${b.color} transition-all duration-500`}
                  style={{ width: `${b.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

