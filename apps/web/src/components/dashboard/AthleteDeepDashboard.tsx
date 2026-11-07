'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Activity,
  Flame,
  Zap,
  Award,
  Heart,
  Compass,
  Trophy,
  Calendar,
  Clock,
  Mountain,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Timer,
  Footprints,
} from 'lucide-react';
import { formatDuration, formatPace, roundKm, normalizeSportCategory } from '@toprun/shared';
import type { TracklogActivityItem } from '../UserTracklogExplorer';
import AthleteAvatar from '../AthleteAvatar';
import DashboardFilterToolbar, {
  type DashboardPeriodMode,
  type DashboardSportFilter,
  type SportCountSummary,
} from './DashboardFilterToolbar';

interface Props {
  activities: TracklogActivityItem[];
  user?: any;
  eventsCount?: number;
  onNavigateToTracklogs?: () => void;
  onNavigateToTournaments?: () => void;
  onSelectActivity?: (id: string) => void;
}

export default function AthleteDeepDashboard({
  activities,
  user,
  eventsCount = 0,
  onNavigateToTracklogs,
  onNavigateToTournaments,
  onSelectActivity,
}: Props) {
  // Default to monthly view ('month') as requested
  const [periodMode, setPeriodMode] = useState<DashboardPeriodMode>('month');
  const [periodOffset, setPeriodOffset] = useState<number>(0);
  const [sportFilter, setSportFilter] = useState<DashboardSportFilter>('Run');

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const firstOfMonthIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, []);
  const [customStartDate, setCustomStartDate] = useState<string>(firstOfMonthIso);
  const [customEndDate, setCustomEndDate] = useState<string>(todayIso);

  // 0. Strictly isolate personal activities for the logged-in athlete
  const myValidActivities = useMemo(() => {
    return activities.filter(
      (a) => !a.isHidden && a.validDistanceKm > 0 && (!user?.id || a.userId === user.id),
    );
  }, [activities, user?.id]);

  // Active period window & previous period window for comparison
  const periodWindow = useMemo(() => {
    const now = new Date();
    if (periodMode === 'week') {
      // Monday-based week with offset
      const dayOfWeek = now.getDay(); // 0 (Sun) .. 6 (Sat)
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday + periodOffset * 7, 0, 0, 0, 0);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
      const prevStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7, 0, 0, 0, 0);
      const prevEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1, 23, 59, 59, 999);
      const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const periodLabel =
        periodOffset === 0
          ? `Tuần này (${fmt(start)} - ${fmt(end)})`
          : `Tuần ${fmt(start)} - ${fmt(end)}/${end.getFullYear()}`;
      return {
        startMs: start.getTime(),
        endMs: end.getTime(),
        prevStartMs: prevStart.getTime(),
        prevEndMs: prevEnd.getTime(),
        periodLabel,
        comparisonLabel: 'vs tuần trước',
      };
    }

    if (periodMode === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth() + periodOffset, 1, 0, 0, 0, 0);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1, 0, 0, 0, 0);
      const prevEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);
      const m = start.getMonth() + 1;
      const y = start.getFullYear();
      const periodLabel =
        periodOffset === 0 ? `Tháng này (Tháng ${m}/${y})` : `Tháng ${String(m).padStart(2, '0')}/${y}`;
      return {
        startMs: start.getTime(),
        endMs: end.getTime(),
        prevStartMs: prevStart.getTime(),
        prevEndMs: prevEnd.getTime(),
        periodLabel,
        comparisonLabel: 'vs tháng trước',
      };
    }

    if (periodMode === 'year') {
      const targetYear = now.getFullYear() + periodOffset;
      const start = new Date(targetYear, 0, 1, 0, 0, 0, 0);
      const end = new Date(targetYear, 11, 31, 23, 59, 59, 999);
      const prevStart = new Date(targetYear - 1, 0, 1, 0, 0, 0, 0);
      const prevEnd = new Date(targetYear - 1, 11, 31, 23, 59, 59, 999);
      const periodLabel = periodOffset === 0 ? `Năm nay (${targetYear})` : `Năm ${targetYear}`;
      return {
        startMs: start.getTime(),
        endMs: end.getTime(),
        prevStartMs: prevStart.getTime(),
        prevEndMs: prevEnd.getTime(),
        periodLabel,
        comparisonLabel: 'vs năm trước',
      };
    }

    if (periodMode === 'custom') {
      const s = customStartDate ? new Date(`${customStartDate}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1);
      const e = customEndDate ? new Date(`${customEndDate}T23:59:59.999`) : new Date();
      const startMs = Math.min(s.getTime(), e.getTime());
      const endMs = Math.max(s.getTime(), e.getTime());
      const spanMs = Math.max(endMs - startMs, 24 * 60 * 60 * 1000);
      return {
        startMs,
        endMs,
        prevStartMs: startMs - spanMs,
        prevEndMs: startMs - 1,
        periodLabel: `${customStartDate || '...'} → ${customEndDate || '...'}`,
        comparisonLabel: 'vs kỳ liền trước',
      };
    }

    // 'all' mode: compare last 30 days vs previous 30 days
    const nowMs = now.getTime();
    const last30 = nowMs - 30 * 24 * 60 * 60 * 1000;
    const prev30 = nowMs - 60 * 24 * 60 * 60 * 1000;
    return {
      startMs: 0,
      endMs: Number.MAX_SAFE_INTEGER,
      prevStartMs: prev30,
      prevEndMs: last30,
      periodLabel: 'Toàn thời gian',
      comparisonLabel: 'vs 30 ngày trước',
    };
  }, [periodMode, periodOffset, customStartDate, customEndDate]);

  // Activities within the active time window (across all sports, for sport pill counts)
  const timeFilteredAllSports = useMemo(() => {
    if (periodMode === 'all') return myValidActivities;
    return myValidActivities.filter((a) => {
      if (!a.startDateIso) return false;
      const t = new Date(a.startDateIso).getTime();
      return t >= periodWindow.startMs && t <= periodWindow.endMs;
    });
  }, [myValidActivities, periodMode, periodWindow]);

  // Counts per sport within the selected time window
  const sportCounts: SportCountSummary = useMemo(() => {
    const counts: SportCountSummary = { all: 0, Run: 0, Ride: 0, Swim: 0, Other: 0 };
    for (const a of timeFilteredAllSports) {
      counts.all++;
      const cat = normalizeSportCategory(a.sportType);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [timeFilteredAllSports]);

  // Filter valid user activities by selected sport (used for all-time streak/PRs/prev-period comparison)
  const userActivities = useMemo(() => {
    if (sportFilter === 'all') return myValidActivities;
    return myValidActivities.filter((a) => normalizeSportCategory(a.sportType) === sportFilter);
  }, [myValidActivities, sportFilter]);

  // Date + Sport filtered activities for current period KPIs & charts
  const filteredActivities = useMemo(() => {
    if (sportFilter === 'all') return timeFilteredAllSports;
    return timeFilteredAllSports.filter((a) => normalizeSportCategory(a.sportType) === sportFilter);
  }, [timeFilteredAllSports, sportFilter]);

  // 1. HERO KPIS & PREVIOUS PERIOD GROWTH
  const stats = useMemo(() => {
    const totalDist = filteredActivities.reduce((sum, a) => sum + a.validDistanceKm, 0);
    const totalTime = filteredActivities.reduce((sum, a) => sum + a.movingTimeSec, 0);
    const totalCalories = filteredActivities.reduce((sum, a) => sum + (a.calories || 0), 0);
    const totalElevation = filteredActivities.reduce((sum, a) => sum + (a.elevationGain || 0), 0);
    const totalRuns = filteredActivities.length;
    const avgPaceSec = totalDist > 0 ? Math.round(totalTime / totalDist) : 0;

    // Compare current period vs previous period
    const currentDistForGrowth =
      periodMode === 'all'
        ? userActivities
            .filter((a) => {
              if (!a.startDateIso) return false;
              const t = new Date(a.startDateIso).getTime();
              return t >= periodWindow.prevEndMs;
            })
            .reduce((sum, a) => sum + a.validDistanceKm, 0)
        : totalDist;

    const prevDist = userActivities
      .filter((a) => {
        if (!a.startDateIso) return false;
        const t = new Date(a.startDateIso).getTime();
        return t >= periodWindow.prevStartMs && t <= periodWindow.prevEndMs;
      })
      .reduce((sum, a) => sum + a.validDistanceKm, 0);

    const growthPercent =
      prevDist > 0
        ? Math.round(((currentDistForGrowth - prevDist) / prevDist) * 100)
        : currentDistForGrowth > 0
        ? 100
        : 0;

    return {
      totalDistanceKm: roundKm(totalDist),
      totalMovingTimeSec: totalTime,
      totalCalories,
      totalElevationMeters: totalElevation,
      totalRuns,
      avgPaceSec,
      growthPercent,
      comparisonLabel: periodWindow.comparisonLabel,
    };
  }, [filteredActivities, userActivities, periodMode, periodWindow]);

  // 2. STREAK & CONSISTENCY HEATMAP (Last 20 Weeks)
  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const daysCount = 20 * 7; // 140 days
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysCount + 1);
    startDate.setHours(0, 0, 0, 0);

    const dayMap = new Map<string, number>();
    for (const act of userActivities) {
      if (!act.startDateIso) continue;
      const key = act.startDateIso.slice(0, 10);
      dayMap.set(key, (dayMap.get(key) || 0) + act.validDistanceKm);
    }

    const cells: { dateStr: string; km: number; level: number; isToday: boolean }[] = [];
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const km = roundKm(dayMap.get(key) || 0);

      let level = 0;
      if (km > 0 && km < 5) level = 1;
      else if (km >= 5 && km < 10) level = 2;
      else if (km >= 10 && km < 20) level = 3;
      else if (km >= 20) level = 4;

      const isToday = key === today.toISOString().slice(0, 10);
      cells.push({ dateStr: key, km, level, isToday });

      if (km > 0) {
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    // Calculate current streak backwards from today
    for (let i = cells.length - 1; i >= 0; i--) {
      if (cells[i].km > 0) {
        currentStreak++;
      } else if (i === cells.length - 1) {
        // Today might not have a run yet, check yesterday
        continue;
      } else {
        break;
      }
    }

    return { cells, currentStreak, maxStreak, activeDays: dayMap.size };
  }, [userActivities]);

  // 3. HEART RATE ZONES & CADENCE ANALYSIS
  const hrAndCadence = useMemo(() => {
    const zones = [
      { id: 'Z1', name: 'Z1 Phục hồi (<130)', min: 0, max: 130, color: 'bg-sky-500', barColor: '#0EA5E9', count: 0, sec: 0 },
      { id: 'Z2', name: 'Z2 Hiếu khí (130-145)', min: 130, max: 145, color: 'bg-emerald-500', barColor: '#10B981', count: 0, sec: 0 },
      { id: 'Z3', name: 'Z3 Tempo (145-160)', min: 145, max: 160, color: 'bg-amber-500', barColor: '#F59E0B', count: 0, sec: 0 },
      { id: 'Z4', name: 'Z4 Ngưỡng (160-175)', min: 160, max: 175, color: 'bg-[#FC4C02]', barColor: '#FC4C02', count: 0, sec: 0 },
      { id: 'Z5', name: 'Z5 Cực đại (>175)', min: 175, max: 999, color: 'bg-rose-500', barColor: '#F43F5E', count: 0, sec: 0 },
    ];

    let totalCadenceWeight = 0;
    let totalCadenceTime = 0;
    let actsWithHr = 0;

    for (const act of filteredActivities) {
      const hr = act.avgHr;
      if (hr && hr > 50) {
        actsWithHr++;
        const targetZone = zones.find((z) => hr >= z.min && hr < z.max) || zones[zones.length - 1];
        targetZone.count++;
        targetZone.sec += act.movingTimeSec;
      }

      const cad = act.avgCadence;
      if (cad && cad > 100) {
        totalCadenceWeight += cad * act.movingTimeSec;
        totalCadenceTime += act.movingTimeSec;
      }
    }

    const totalZoneSec = zones.reduce((s, z) => s + z.sec, 0);
    const avgCadence = totalCadenceTime > 0 ? Math.round(totalCadenceWeight / totalCadenceTime) : 172;

    return {
      zones: zones.map((z) => ({
        ...z,
        percent: totalZoneSec > 0 ? Math.round((z.sec / totalZoneSec) * 100) : 0,
      })),
      avgCadence,
      actsWithHr,
    };
  }, [filteredActivities]);

  // 4. PACE PROGRESSION TRENDLINE (Recent 12 runs)
  const paceTrend = useMemo(() => {
    const runs = [...filteredActivities]
      .filter((a) => a.avgPaceSecPerKm && a.avgPaceSecPerKm > 150 && a.avgPaceSecPerKm < 900)
      .sort((a, b) => {
        const tA = a.startDateIso ? new Date(a.startDateIso).getTime() : 0;
        const tB = b.startDateIso ? new Date(b.startDateIso).getTime() : 0;
        return tA - tB;
      })
      .slice(-12);

    if (runs.length === 0) return null;

    const paces = runs.map((r) => r.avgPaceSecPerKm);
    const minPace = Math.min(...paces);
    const maxPace = Math.max(...paces);
    const range = Math.max(maxPace - minPace, 30);

    const pts = runs.map((r, idx) => {
      const x = runs.length === 1 ? 160 : Math.round(20 + (idx / (runs.length - 1)) * 360);
      const y = Math.round(15 + ((r.avgPaceSecPerKm - minPace) / range) * 80);
      return {
        x,
        y,
        id: r.id,
        name: r.name,
        date: r.startDateIso ? r.startDateIso.slice(5, 10) : 'Run',
        paceFormatted: formatPace(r.avgPaceSecPerKm),
        pace: r.avgPaceSecPerKm,
        km: r.validDistanceKm,
      };
    });

    const pathD = pts.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    return {
      pts,
      pathD,
      bestPace: formatPace(minPace),
      avgPace: formatPace(Math.round(paces.reduce((a, b) => a + b, 0) / paces.length)),
    };
  }, [filteredActivities]);

  // 5. PR MILESTONES HALL OF FAME
  const prMilestones = useMemo(() => {
    let best1k = Infinity;
    let best5k = user?.pr5kSec || Infinity;
    let best10k = Infinity;
    let best21k = Infinity;
    let best42k = user?.pr42kSec || Infinity;

    for (const act of userActivities) {
      const d = act.validDistanceKm;
      const t = act.movingTimeSec;
      if (d <= 0 || t <= 0) continue;

      const pace = t / d;

      if (d >= 1) best1k = Math.min(best1k, Math.round(pace * 1));
      if (d >= 5) best5k = Math.min(best5k, Math.round(pace * 5));
      if (d >= 10) best10k = Math.min(best10k, Math.round(pace * 10));
      if (d >= 21) best21k = Math.min(best21k, Math.round(pace * 21.0975));
      if (d >= 42) best42k = Math.min(best42k, Math.round(pace * 42.195));
    }

    return [
      { name: '1 KM Fast Mile', timeSec: best1k, icon: Zap, color: 'text-amber-500' },
      { name: '5 KM Speed Run', timeSec: best5k, icon: Flame, color: 'text-[#FC4C02]' },
      { name: '10 KM Endurance', timeSec: best10k, icon: Activity, color: 'text-emerald-500' },
      { name: '21.1 KM Half Marathon', timeSec: best21k, icon: Trophy, color: 'text-cyan-400' },
      { name: '42.2 KM Full Marathon', timeSec: best42k, icon: Award, color: 'text-purple-400' },
    ];
  }, [userActivities, user]);

  // 6. RACE TIME PREDICTOR (VO2max Riegel model from best 5K or average pace)
  const predictedTimes = useMemo(() => {
    let base5kSec = user?.pr5kSec || 1500; // 25 mins fallback
    const runsWith5k = userActivities.filter((a) => a.validDistanceKm >= 5);
    if (runsWith5k.length > 0) {
      const minPace = Math.min(...runsWith5k.map((r) => r.avgPaceSecPerKm));
      base5kSec = Math.min(base5kSec, minPace * 5);
    }

    // Riegel formula: T2 = T1 * (D2 / D1)^1.06
    const riegel = (d2Km: number) => Math.round(base5kSec * Math.pow(d2Km / 5, 1.06));

    return [
      { distance: '5 KM', predictedSec: base5kSec, targetPace: formatPace(Math.round(base5kSec / 5)) },
      { distance: '10 KM', predictedSec: riegel(10), targetPace: formatPace(Math.round(riegel(10) / 10)) },
      { distance: '21.1 KM (HM)', predictedSec: riegel(21.0975), targetPace: formatPace(Math.round(riegel(21.0975) / 21.0975)) },
      { distance: '42.2 KM (FM)', predictedSec: riegel(42.195), targetPace: formatPace(Math.round(riegel(42.195) / 42.195)) },
    ];
  }, [userActivities, user]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* =====================================================================
          HEADER HERO BANNER
         ===================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#101726] to-[#0A0E18] text-white p-6 sm:p-8 border border-slate-800/80 shadow-xl">
        {/* Glow decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FC4C02]/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <AthleteAvatar user={user} size="xl" showBadge={true} showWings={true} showSharkCrown={true} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Trung Tâm Phân Tích Thể Lực & Phong Độ
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>ATHLETE PRO</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                Xin chào <strong className="text-white">{user?.fullName || 'Runner'}</strong>! Phân tích chi tiết thể lực, vùng nhịp tim, guồng chân và dự báo thành tích dựa trên tracklog thực tế.
              </p>
            </div>
          </div>

          {/* Period Badge in Top Right */}
          <div className="flex items-center self-start md:self-center px-3.5 py-2 rounded-2xl bg-slate-800/80 border border-slate-700/80 backdrop-blur-md text-xs font-bold text-amber-300">
            <Calendar className="w-3.5 h-3.5 mr-2 text-[#FC4C02]" />
            <span>{periodWindow.periodLabel}</span>
          </div>
        </div>

        {/* Multi-Sport & Period Filter Toolbar */}
        <DashboardFilterToolbar
          periodMode={periodMode}
          onPeriodModeChange={(mode) => {
            setPeriodMode(mode);
            setPeriodOffset(0);
          }}
          periodOffset={periodOffset}
          onPeriodOffsetChange={setPeriodOffset}
          periodLabel={periodWindow.periodLabel}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomStartDateChange={setCustomStartDate}
          onCustomEndDateChange={setCustomEndDate}
          sportFilter={sportFilter}
          onSportFilterChange={setSportFilter}
          sportCounts={sportCounts}
        />
      </div>

      {/* =====================================================================
          1. HERO METRIC CARDS WITH GROWTH RATE
         ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Distance */}
        <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#0C101B] border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tổng Cự Ly</span>
            <div className="w-8 h-8 rounded-xl bg-[#FC4C02]/10 flex items-center justify-center text-[#FC4C02]">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono mt-2 tracking-tight">
            {stats.totalDistanceKm} <span className="text-xs font-bold text-slate-400">km</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold">
            {stats.growthPercent >= 0 ? (
              <span className="text-emerald-500 flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{stats.growthPercent}%
              </span>
            ) : (
              <span className="text-rose-500 flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5" /> {stats.growthPercent}%
              </span>
            )}
            <span className="text-slate-400 truncate">{stats.comparisonLabel}</span>
          </div>
        </div>

        {/* Total Moving Time */}
        <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#0C101B] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tổng Thời Gian</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono mt-2 tracking-tight">
            {formatDuration(stats.totalMovingTimeSec)}
          </div>
          <p className="mt-2.5 text-[11px] text-slate-400 font-medium truncate">
            {stats.totalRuns} buổi vận động
          </p>
        </div>

        {/* Avg Pace */}
        <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#0C101B] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Pace Trung Bình</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono mt-2 tracking-tight">
            {stats.avgPaceSec > 0 ? formatPace(stats.avgPaceSec) : '--:--'}{' '}
            <span className="text-xs font-bold text-slate-400">/km</span>
          </div>
          <p className="mt-2.5 text-[11px] text-slate-400 font-medium truncate">Tốc độ tiêu chuẩn</p>
        </div>

        {/* Total Calories */}
        <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#0C101B] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Năng Lượng Tiêu Thụ</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono mt-2 tracking-tight">
            {stats.totalCalories.toLocaleString()} <span className="text-xs font-bold text-slate-400">kcal</span>
          </div>
          <p className="mt-2.5 text-[11px] text-slate-400 font-medium truncate">Đốt cháy hiệu quả</p>
        </div>

        {/* Elevation Gain */}
        <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#0C101B] border border-slate-200/80 dark:border-slate-800/80 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Độ Dốc Leo Núi</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Mountain className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono mt-2 tracking-tight">
            {stats.totalElevationMeters.toLocaleString()}{' '}
            <span className="text-xs font-bold text-slate-400">m</span>
          </div>
          <p className="mt-2.5 text-[11px] text-slate-400 font-medium truncate">Elevation Gain</p>
        </div>
      </div>

      {/* =====================================================================
          2. HEATMAP LỊCH TẬP LUYỆN (CONSISTENCY MATRIX / STREAK)
         ===================================================================== */}
      <div className="rounded-3xl bg-white dark:bg-[#0C101B] border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#FC4C02]" />
              <span>Ma Trận Bền Bỉ & Chuỗi Ngày Tập Luyện (Consistency Matrix)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Đo lường tính đều đặn trong 20 tuần gần nhất. Màu đậm thể hiện cự ly lớn hơn.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-[#FC4C02]/10 border border-[#FC4C02]/20 text-[#FC4C02]">
              <Flame className="w-3.5 h-3.5" />
              <span>Chuỗi hiện tại: {heatmapData.currentStreak} ngày</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Trophy className="w-3.5 h-3.5" />
              <span>Kỷ lục: {heatmapData.maxStreak} ngày</span>
            </div>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="inline-grid grid-rows-7 grid-flow-col gap-1.5 min-w-[680px]">
            {heatmapData.cells.map((cell, idx) => {
              const bgClass =
                cell.level === 0
                  ? 'bg-slate-100 dark:bg-slate-800/60'
                  : cell.level === 1
                  ? 'bg-[#FC4C02]/30 text-white'
                  : cell.level === 2
                  ? 'bg-[#FC4C02]/60 text-white'
                  : cell.level === 3
                  ? 'bg-[#FC4C02]/85 text-white'
                  : 'bg-[#FC4C02] text-white shadow-xs shadow-[#FC4C02]/50';

              return (
                <div
                  key={idx}
                  title={`${cell.dateStr}: ${cell.km > 0 ? `${cell.km} km` : 'Nghỉ ngơi'}`}
                  className={`w-3.5 h-3.5 rounded-sm transition-transform hover:scale-125 cursor-pointer ${bgClass} ${
                    cell.isToday ? 'ring-2 ring-amber-400' : ''
                  }`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <span>20 tuần trước</span>
            <div className="flex items-center gap-1.5">
              <span>Ít</span>
              <span className="w-3 h-3 rounded-xs bg-slate-100 dark:bg-slate-800/60" />
              <span className="w-3 h-3 rounded-xs bg-[#FC4C02]/30" />
              <span className="w-3 h-3 rounded-xs bg-[#FC4C02]/60" />
              <span className="w-3 h-3 rounded-xs bg-[#FC4C02]" />
              <span>Nhiều (20+ km)</span>
            </div>
            <span>Hôm nay</span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. & 4. DUAL COLUMN: HR ZONES & CADENCE + PACE PROGRESSION
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 3: Heart Rate Zones & Cadence */}
        <div className="rounded-3xl bg-white dark:bg-[#0C101B] border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>5 Vùng Nhịp Tim & Guồng Chân</span>
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500">
              {hrAndCadence.actsWithHr} buổi có đo HR
            </span>
          </div>

          {/* HR Bars */}
          <div className="space-y-3 pt-1">
            {hrAndCadence.zones.map((z) => (
              <div key={z.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{z.name}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {z.percent}% <span className="text-slate-400 font-normal">({z.count} buổi)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${z.percent}%`, backgroundColor: z.barColor }}
                    className="h-full rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Cadence Metric Callout */}
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Footprints className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Guồng Chân Trung Bình (Cadence)
                </div>
                <div className="text-[11px] text-slate-400">
                  {hrAndCadence.avgCadence >= 170 && hrAndCadence.avgCadence <= 185
                    ? '🎯 Dải tối ưu vàng (170-185 spm) giảm phản lực xương khớp'
                    : '💡 Khuyến nghị nâng dần guồng chân lên mức 175-180 spm'}
                </div>
              </div>
            </div>
            <div className="text-lg font-black font-mono text-purple-500">
              {hrAndCadence.avgCadence} <span className="text-xs font-bold">spm</span>
            </div>
          </div>
        </div>

        {/* Module 4: Pace Progression Trendline */}
        <div className="rounded-3xl bg-white dark:bg-[#0C101B] border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#FC4C02]" />
              <span>Tiến Trình Pace 12 Buổi Gần Nhất</span>
            </h3>
            {paceTrend && (
              <span className="text-xs font-bold text-emerald-500">
                Đỉnh cao: {paceTrend.bestPace}/km
              </span>
            )}
          </div>

          {paceTrend ? (
            <div className="space-y-3">
              {/* SVG Curve */}
              <div className="relative h-44 w-full pt-4">
                <svg viewBox="0 0 400 110" className="w-full h-full overflow-visible">
                  {/* Grid Lines */}
                  <line x1="10" y1="20" x2="390" y2="20" stroke="#94A3B8" strokeOpacity="0.15" strokeDasharray="3 3" />
                  <line x1="10" y1="55" x2="390" y2="55" stroke="#94A3B8" strokeOpacity="0.15" strokeDasharray="3 3" />
                  <line x1="10" y1="95" x2="390" y2="95" stroke="#94A3B8" strokeOpacity="0.15" strokeDasharray="3 3" />

                  {/* Gradient Area */}
                  <defs>
                    <linearGradient id="paceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FC4C02" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#FC4C02" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Line */}
                  <path
                    d={paceTrend.pathD}
                    fill="none"
                    stroke="#FC4C02"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Points */}
                  {paceTrend.pts.map((p, idx) => (
                    <g key={idx} className="cursor-pointer group">
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="4"
                        fill="#FFFFFF"
                        stroke="#FC4C02"
                        strokeWidth="2"
                        className="transition group-hover:scale-150"
                      />
                    </g>
                  ))}
                </svg>
              </div>

              {/* Labels below */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <span>{paceTrend.pts[0]?.date}</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Pace trung bình: {paceTrend.avgPace} /km
                </span>
                <span>{paceTrend.pts[paceTrend.pts.length - 1]?.date}</span>
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
              Chưa đủ dữ liệu tracklog để vẽ tiến trình pace.
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          5. & 6. PR HALL OF FAME & RACE TIME PREDICTOR
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 5: PR Milestones Hall of Fame */}
        <div className="rounded-3xl bg-white dark:bg-[#0C101B] border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Bảng Vinh Danh Kỷ Lục Cá Nhân (PR Milestones)</span>
            </h3>
            <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              HALL OF FAME
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prMilestones.map((m, idx) => {
              const Icon = m.icon;
              const hasRecord = m.timeSec < Infinity;
              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    hasRecord
                      ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800 hover:border-[#FC4C02]/40'
                      : 'bg-slate-50/40 dark:bg-slate-900/20 border-dashed border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center ${m.color} shadow-xs`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{m.name}</div>
                      <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5">
                        {hasRecord ? formatDuration(m.timeSec) : 'Chưa thiết lập'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Module 6: Race Time Predictor */}
        <div className="rounded-3xl bg-white dark:bg-[#0C101B] border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Timer className="w-4 h-4 text-cyan-400" />
              <span>Dự Báo Thành Tích Giải Chạy (Race Predictor)</span>
            </h3>
            <span className="text-[11px] font-bold text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded-full border border-cyan-400/20">
              RIEGL MODEL
            </span>
          </div>

          <div className="space-y-2.5">
            {predictedTimes.map((pred, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs font-mono">
                    {pred.distance.slice(0, 3)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{pred.distance}</div>
                    <div className="text-[11px] text-slate-400">Pace dự kiến: {pred.targetPace}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
                    {formatDuration(pred.predictedSec)}
                  </div>
                  <div className="text-[10px] text-emerald-500 font-semibold flex items-center justify-end gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Khả thi</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =====================================================================
          FOOTER CALLOUT: GO TO TOURNAMENT OR TRACKLOGS
         ===================================================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-slate-900 dark:via-[#131926] dark:to-slate-900 border border-orange-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FC4C02] text-white flex items-center justify-center shadow-lg shadow-[#FC4C02]/30 shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Sẵn Sàng Cho Giải Đấu Sắp Tới?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hệ thống hiện có {eventsCount} giải chạy đang diễn ra. Tham gia để nhận BIB và áo Race-kit độc quyền!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          {onNavigateToTracklogs && (
            <button
              type="button"
              onClick={onNavigateToTracklogs}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              Xem Chi Tiết Tracklog
            </button>
          )}

          {onNavigateToTournaments && (
            <button
              type="button"
              onClick={onNavigateToTournaments}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#FC4C02] hover:bg-[#e04302] text-white text-xs font-bold shadow-md shadow-[#FC4C02]/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Vào Giải Đấu</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

