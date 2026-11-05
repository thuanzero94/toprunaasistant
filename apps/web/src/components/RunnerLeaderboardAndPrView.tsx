'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  Trophy,
  Award,
  Zap,
  Clock,
  TrendingUp,
  Search,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles,
  Crown,
} from 'lucide-react';
import { roundKm } from '@toprun/shared';
import AthleteAvatar, { AthleteHonorPill } from './AthleteAvatar';

interface LeaderboardUser {
  id: string;
  fullName: string;
  avatarUrl?: string;
  email?: string;
  departmentOrUnit?: string;
  role?: string;
  honorBadge?: string | null;
  totalDistanceKm: number;
  totalActivities: number;
  pr5kSec?: number | null;
  pr10kSec?: number | null;
  pr21kSec?: number | null;
  pr42kSec?: number | null;
  prCertLink?: string | null;
  stravaConnected?: boolean;
  displayValue?: number;
  displaySub?: string;
  displayFormatted?: string;
  displayPace?: string;
}

interface RunnerLeaderboardAndPrViewProps {
  currentUser: any;
  activities: any[];
  onGoToAccountSettings?: () => void;
  onOpenEBibModal?: (eventId?: string) => void;
  onViewRunnerDetail?: (runnerData: any) => void;
}

type LeaderboardTimeRange = 'THIS_MONTH' | 'ALL_TIME';
type LeaderboardCategory = 'TOTAL_KM' | '5K' | '10K' | '21K' | '42K';

function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPaceFromSecAndDist(seconds?: number | null, distanceKm?: number): string {
  if (!seconds || !distanceKm || distanceKm <= 0) return '—';
  const paceSec = Math.round(seconds / distanceKm);
  const mins = Math.floor(paceSec / 60);
  const secs = paceSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

export default function RunnerLeaderboardAndPrView({
  currentUser,
  activities = [],
  onGoToAccountSettings,
  onOpenEBibModal,
  onViewRunnerDetail,
}: RunnerLeaderboardAndPrViewProps) {
  const [usersList, setUsersList] = useState<LeaderboardUser[]>([]);
  const [monthlyLeaderboardData, setMonthlyLeaderboardData] = useState<Array<{
    userId: string;
    fullName: string;
    avatarUrl?: string;
    departmentOrUnit?: string;
    monthlyDistanceKm: number;
    monthlyRunCount: number;
    monthlyAvgPaceSec: number;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<LeaderboardTimeRange>('THIS_MONTH');
  const [category, setCategory] = useState<LeaderboardCategory>('TOTAL_KM');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all users for global leaderboard
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
        const [resUsers, resMonthly] = await Promise.all([
          fetch(`${apiBase}/users`),
          fetch(`${apiBase}/leaderboard/monthly`),
        ]);

        if (resUsers.ok) {
          const data = await resUsers.json();
          if (isMounted && Array.isArray(data)) {
            setUsersList(data);
          }
        }
        if (resMonthly.ok) {
          const resJson = await resMonthly.json();
          const items = Array.isArray(resJson) ? resJson : (resJson?.leaderboard || []);
          if (isMounted) {
            setMonthlyLeaderboardData(
              items.map((r: any) => ({
                userId: r.userId || r.id,
                fullName: r.fullName,
                avatarUrl: r.avatarUrl,
                departmentOrUnit: r.departmentOrUnit,
                monthlyDistanceKm: Number(r.monthlyDistanceKm || 0),
                monthlyRunCount: Number(r.monthlyRunCount || 0),
                monthlyAvgPaceSec: Number(r.monthlyAvgPaceSec || 0),
              }))
            );
          }
        }
      } catch {
        // Fallback to current user if network error
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Ensure current user is in the list
  const allAthletes = useMemo(() => {
    const list = [...usersList];
    if (currentUser?.id && !list.some((u) => u.id === currentUser.id)) {
      list.push({
        id: currentUser.id,
        fullName: currentUser.fullName || 'Vận động viên',
        avatarUrl: currentUser.avatarUrl,
        email: currentUser.email,
        departmentOrUnit: currentUser.departmentOrUnit || 'Runner Community',
        role: currentUser.role,
        honorBadge: currentUser.honorBadge,
        totalDistanceKm: currentUser.totalDistanceKm || 0,
        totalActivities: currentUser.totalActivities || 0,
        pr5kSec: currentUser.pr5kSec,
        pr10kSec: currentUser.pr10kSec,
        pr21kSec: currentUser.pr21kSec,
        pr42kSec: currentUser.pr42kSec,
        prCertLink: currentUser.prCertLink,
        stravaConnected: currentUser.stravaConnected,
      });
    }
    return list;
  }, [usersList, currentUser]);

  // Current Month calculations: Tổng hợp từ API /leaderboard/monthly (PostgreSQL SSOT)
  const currentMonthStatsByUser = useMemo(() => {
    const statsMap: Record<string, { totalKm: number; runCount: number }> = {};

    // 1. Nạp từ Monthly Leaderboard API (toàn bộ VĐV trong hệ thống từ PostgreSQL SSOT)
    if (monthlyLeaderboardData.length > 0) {
      monthlyLeaderboardData.forEach((row) => {
        statsMap[row.userId] = {
          totalKm: roundKm(row.monthlyDistanceKm || 0),
          runCount: row.monthlyRunCount || 0,
        };
      });
    } else {
      // 2. Dự phòng ngoại tuyến / realtime từ activities nếu API chưa trả về
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth();

      activities.forEach((act) => {
        if (act.isHidden || act.validDistanceKm <= 0) return;
        const d = act.startDateIso ? new Date(act.startDateIso) : new Date();
        if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
          if (!statsMap[act.userId]) {
            statsMap[act.userId] = { totalKm: 0, runCount: 0 };
          }
          statsMap[act.userId].totalKm = roundKm(statsMap[act.userId].totalKm + act.validDistanceKm);
          statsMap[act.userId].runCount += 1;
        }
      });
    }

    return statsMap;
  }, [monthlyLeaderboardData, activities]);

  // Filtered and Sorted Leaderboard
  const sortedAthletes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let filtered = allAthletes.filter((a) => {
      if (!q) return true;
      return (
        a.fullName.toLowerCase().includes(q) ||
        (a.departmentOrUnit && a.departmentOrUnit.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
      );
    });

    if (category === 'TOTAL_KM') {
      if (timeRange === 'THIS_MONTH') {
        filtered = filtered.map((a) => {
          const monthStats = currentMonthStatsByUser[a.id];
          return {
            ...a,
            displayValue: monthStats ? roundKm(monthStats.totalKm) : 0,
            displaySub: `${monthStats ? monthStats.runCount : 0} buổi`,
          };
        });
      } else {
        filtered = filtered.map((a) => ({
          ...a,
          displayValue: roundKm(a.totalDistanceKm || 0),
          displaySub: `${a.totalActivities || 0} buổi`,
        }));
      }
      return filtered.sort((a, b) => (b.displayValue ?? 0) - (a.displayValue ?? 0));
    }

    // Distance PR categories
    if (category === '5K') {
      filtered = filtered
        .filter((a) => a.pr5kSec && a.pr5kSec > 0)
        .map((a) => ({
          ...a,
          displayValue: a.pr5kSec!,
          displayFormatted: formatDuration(a.pr5kSec),
          displayPace: formatPaceFromSecAndDist(a.pr5kSec, 5),
        }))
        .sort((a, b) => (a.displayValue ?? 0) - (b.displayValue ?? 0));
    } else if (category === '10K') {
      filtered = filtered
        .filter((a) => a.pr10kSec && a.pr10kSec > 0)
        .map((a) => ({
          ...a,
          displayValue: a.pr10kSec!,
          displayFormatted: formatDuration(a.pr10kSec),
          displayPace: formatPaceFromSecAndDist(a.pr10kSec, 10),
        }))
        .sort((a, b) => (a.displayValue ?? 0) - (b.displayValue ?? 0));
    } else if (category === '21K') {
      filtered = filtered
        .filter((a) => a.pr21kSec && a.pr21kSec > 0)
        .map((a) => ({
          ...a,
          displayValue: a.pr21kSec!,
          displayFormatted: formatDuration(a.pr21kSec),
          displayPace: formatPaceFromSecAndDist(a.pr21kSec, 21.0975),
        }))
        .sort((a, b) => (a.displayValue ?? 0) - (b.displayValue ?? 0));
    } else if (category === '42K') {
      filtered = filtered
        .filter((a) => a.pr42kSec && a.pr42kSec > 0)
        .map((a) => ({
          ...a,
          displayValue: a.pr42kSec!,
          displayFormatted: formatDuration(a.pr42kSec),
          displayPace: formatPaceFromSecAndDist(a.pr42kSec, 42.195),
        }))
        .sort((a, b) => (a.displayValue ?? 0) - (b.displayValue ?? 0));
    }

    return filtered;
  }, [allAthletes, category, timeRange, currentMonthStatsByUser, searchQuery]);

  // Current user's standing
  const myRank = useMemo(() => {
    if (!currentUser?.id) return null;
    const idx = sortedAthletes.findIndex((a) => a.id === currentUser.id);
    return idx >= 0 ? idx + 1 : null;
  }, [sortedAthletes, currentUser?.id]);

  // Current month label
  const monthName = useMemo(() => {
    const d = new Date();
    return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
  }, []);

  return (
    <div className="space-y-6">
      {/* =====================================================================
          PHẦN 1: KỶ LỤC CÁ NHÂN (PERSONAL RECORDS - PR) CỦA RUNNER ĐANG ĐĂNG NHẬP
         ===================================================================== */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-[#131B2E] to-slate-900 border border-slate-800 text-white p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#FC4C02]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FC4C02] to-amber-500 flex items-center justify-center text-white shadow-lg shadow-[#FC4C02]/20">
                <Flame className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-white">
                    Bảng Vàng PR & Kỷ Lục Cá Nhân
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FC4C02]/20 text-[#FC4C02] border border-[#FC4C02]/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Chạy bộ
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Thành tích chạy bộ tốt nhất của bạn theo chuẩn các cự ly quốc tế
                </p>
              </div>
            </div>

            {onGoToAccountSettings && (
              <button
                type="button"
                onClick={onGoToAccountSettings}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
              >
                <span>Cập nhật kỷ lục PR</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 4 PR Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* PR 5KM */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 sm:p-4 hover:border-[#FC4C02]/50 transition space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  5 KM (Sprint)
                </span>
                <span className="text-[10px] font-mono text-slate-400">Pace tb</span>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <div className="text-xl sm:text-2xl font-black font-mono text-white tabular-nums">
                  {formatDuration(currentUser?.pr5kSec)}
                </div>
                <div className="text-xs font-mono font-bold text-amber-400">
                  {formatPaceFromSecAndDist(currentUser?.pr5kSec, 5)}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-white/5">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Thời gian nhanh nhất</span>
              </div>
            </div>

            {/* PR 10KM */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 sm:p-4 hover:border-[#FC4C02]/50 transition space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  10 KM (Endurance)
                </span>
                <span className="text-[10px] font-mono text-slate-400">Pace tb</span>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <div className="text-xl sm:text-2xl font-black font-mono text-white tabular-nums">
                  {formatDuration(currentUser?.pr10kSec)}
                </div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  {formatPaceFromSecAndDist(currentUser?.pr10kSec, 10)}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-white/5">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Thời gian nhanh nhất</span>
              </div>
            </div>

            {/* PR 21.1KM */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 sm:p-4 hover:border-[#FC4C02]/50 transition space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-sky-400 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  21.1 KM (Half Marathon)
                </span>
                <span className="text-[10px] font-mono text-slate-400">Pace tb</span>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <div className="text-xl sm:text-2xl font-black font-mono text-white tabular-nums">
                  {formatDuration(currentUser?.pr21kSec)}
                </div>
                <div className="text-xs font-mono font-bold text-sky-400">
                  {formatPaceFromSecAndDist(currentUser?.pr21kSec, 21.0975)}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-white/5">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Thời gian nhanh nhất</span>
              </div>
            </div>

            {/* PR 42.2KM */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 sm:p-4 hover:border-[#FC4C02]/50 transition space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-purple-400 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" />
                  42.2 KM (Full Marathon)
                </span>
                <span className="text-[10px] font-mono text-slate-400">Pace tb</span>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <div className="text-xl sm:text-2xl font-black font-mono text-white tabular-nums">
                  {formatDuration(currentUser?.pr42kSec)}
                </div>
                <div className="text-xs font-mono font-bold text-purple-400">
                  {formatPaceFromSecAndDist(currentUser?.pr42kSec, 42.195)}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-white/5">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Thời gian nhanh nhất</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          PHẦN 2: BẢNG XẾP HẠNG TOÀN HỆ THỐNG (GLOBAL ATHLETE LEADERBOARD)
         ===================================================================== */}
      <section className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm space-y-5">
        {/* Controls & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#FC4C02]" />
              <span>Bảng Xếp Hạng Vận Động Viên TOPRun</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Xếp hạng cống hiến quãng đường và thành tích tốc độ trên toàn hệ thống
            </p>
          </div>

          {/* Time Range Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setTimeRange('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${timeRange === 'THIS_MONTH'
                ? 'bg-white dark:bg-[#0F1420] text-[#FC4C02] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{monthName}</span>
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('ALL_TIME')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${timeRange === 'ALL_TIME'
                ? 'bg-white dark:bg-[#0F1420] text-[#FC4C02] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Toàn thời gian</span>
            </button>
          </div>
        </div>

        {/* Category Pills & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Distance Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setCategory('TOTAL_KM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${category === 'TOTAL_KM'
                ? 'bg-[#FC4C02] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              🏃 Tổng Quãng Đường (KM)
            </button>
            <button
              type="button"
              onClick={() => setCategory('5K')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${category === '5K'
                ? 'bg-[#FC4C02] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              ⚡ PR 5KM
            </button>
            <button
              type="button"
              onClick={() => setCategory('10K')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${category === '10K'
                ? 'bg-[#FC4C02] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              🎖️ PR 10KM
            </button>
            <button
              type="button"
              onClick={() => setCategory('21K')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${category === '21K'
                ? 'bg-[#FC4C02] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              🏆 PR 21.1KM
            </button>
            <button
              type="button"
              onClick={() => setCategory('42K')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${category === '42K'
                ? 'bg-[#FC4C02] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              👑 PR 42.2KM
            </button>
          </div>

          {/* Search Athlete */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên VĐV..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#FC4C02]"
            />
          </div>
        </div>

        {/* Current User Standout Alert if ranked */}
        {myRank && (
          <div className="rounded-xl bg-[#FC4C02]/5 border border-[#FC4C02]/20 p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#FC4C02] text-white font-black font-mono flex items-center justify-center text-xs">
                #{myRank}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Thứ hạng hiện tại của bạn: <span className="font-bold text-[#FC4C02]">Hạng #{myRank}</span> trên {sortedAthletes.length} VĐV
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              {category === 'TOTAL_KM' ? (timeRange === 'THIS_MONTH' ? monthName : 'Toàn thời gian') : category}
            </span>
          </div>
        )}

        {/* Athletes List */}
        {sortedAthletes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 space-y-2">
            <Award className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-semibold">
              Chưa có dữ liệu thành tích cho hạng mục này
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {sortedAthletes.map((athlete, idx) => {
              const rank = idx + 1;
              const isMe = athlete.id === currentUser?.id;
              const isGold = rank === 1;
              const isSilver = rank === 2;
              const isBronze = rank === 3;

              return (
                <div
                  key={athlete.id}
                  onClick={() => {
                    if (onViewRunnerDetail) {
                      const userActs = activities.filter(
                        (a) => a.userId === athlete.id && !a.isHidden && a.validDistanceKm > 0
                      );
                      const monthStats = currentMonthStatsByUser[athlete.id];
                      const isThisMonth = category === 'TOTAL_KM' && timeRange === 'THIS_MONTH';
                      const totalKm = isThisMonth ? (monthStats?.totalKm || 0) : (athlete.totalDistanceKm || 0);
                      onViewRunnerDetail({
                        userId: athlete.id,
                        name: athlete.fullName,
                        avatarUrl: athlete.avatarUrl,
                        clubName: athlete.departmentOrUnit || 'ASSA ABLOY Engineering',
                        bibNumber: (athlete as any).bibNumber || `TOP-${athlete.id.slice(-4).toUpperCase()}`,
                        targetDistanceKm: isThisMonth ? 100 : (athlete.totalDistanceKm || 100),
                        totalValidKm: totalKm,
                        progressPercent: Math.min(100, Math.round((totalKm / 100) * 100)),
                        rank: rank,
                        role: athlete.role,
                        honorBadge: athlete.honorBadge,
                        activities: userActs,
                      });
                    }
                  }}
                  className={`flex items-center justify-between py-3 px-2 sm:px-3 rounded-xl transition cursor-pointer group ${
                    isMe
                      ? 'bg-[#FC4C02]/10 border border-[#FC4C02]/30 shadow-xs hover:bg-[#FC4C02]/15'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                  title="Nhấn để xem chi tiết hoạt động của VĐV này"
                >
                  {/* Left: Rank + Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div className="w-8 text-center shrink-0">
                      {isGold ? (
                        <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black font-mono text-xs flex items-center justify-center shadow-md shadow-amber-400/20 mx-auto">
                          1
                        </span>
                      ) : isSilver ? (
                        <span className="w-7 h-7 rounded-xl bg-slate-300 text-slate-900 font-black font-mono text-xs flex items-center justify-center shadow-xs mx-auto">
                          2
                        </span>
                      ) : isBronze ? (
                        <span className="w-7 h-7 rounded-xl bg-amber-700 text-white font-black font-mono text-xs flex items-center justify-center shadow-xs mx-auto">
                          3
                        </span>
                      ) : (
                        <span className="text-xs font-bold font-mono text-slate-400">
                          #{rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar Cá Nhân Hoá với Cánh Thiên Thần, Đầu Cá Mập và Huy Hiệu */}
                    <div className="shrink-0 my-1">
                      <AthleteAvatar
                        user={athlete}
                        rank={rank}
                        size="md"
                        showBadge={true}
                        showWings={true}
                        showSharkCrown={true}
                      />
                    </div>

                    {/* Name & Department */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {athlete.fullName}
                        </span>
                        <AthleteHonorPill user={athlete} rank={rank} />
                        {isMe && (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-[#FC4C02] text-white">
                            BẠN
                          </span>
                        )}
                        {athlete.stravaConnected && (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-[#FC4C02]/10 text-[#FC4C02] border border-[#FC4C02]/20">
                            Strava
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {athlete.departmentOrUnit || 'Runner'}
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics & Arrow */}
                  <div className="flex items-center gap-2 pl-2 shrink-0">
                    <div className="text-right">
                      {category === 'TOTAL_KM' ? (
                        <div>
                          <div className="text-base font-black font-mono text-slate-900 dark:text-white tabular-nums">
                            {(athlete as any).displayValue} <span className="text-xs font-normal text-slate-400">km</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {(athlete as any).displaySub}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-base font-black font-mono text-[#FC4C02] tabular-nums">
                            {(athlete as any).displayFormatted}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {(athlete as any).displayPace}
                          </div>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#FC4C02] group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
