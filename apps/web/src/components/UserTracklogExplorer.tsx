'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  EyeOff,
  FileUp,
  Gauge,
  Heart,
  Mountain,
  RefreshCw,
  Search,
  TrendingUp,
  User,
  Users,
  Compass,
} from 'lucide-react';
import {
  AntiCheatStatus,
  formatDuration,
  formatPace,
  roundKm,
  normalizeSportCategory,
} from '@toprun/shared';
import TracklogDistanceChart from './tracklog/TracklogDistanceChart';
import TracklogActivityCard from './tracklog/TracklogActivityCard';
import TracklogDetailView from './tracklog/TracklogDetailView';

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
  viewMode?: 'list' | 'detail';
  onViewModeChange?: (mode: 'list' | 'detail') => void;
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
  viewMode: controlledViewMode,
  onViewModeChange,
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
  const [internalViewMode, setInternalViewMode] = useState<'list' | 'detail'>('list');
  const viewMode = controlledViewMode ?? internalViewMode;

  const setViewMode = (mode: 'list' | 'detail') => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };
  const [ownerFilter, setOwnerFilter] = useState<'mine' | 'all'>('mine');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'flagged' | 'hidden'>('all');
  const [sportListFilter, setSportListFilter] = useState<'all' | 'Run' | 'Ride' | 'Swim' | 'Other'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to determine if an activity belongs to current user
  const isMyActivity = (act: TracklogActivityItem) => {
    if (currentUserId && act.userId === currentUserId) return true;
    return false;
  };

  const hiddenCount = useMemo(
    () => activities.filter((a) => Boolean(a.isHidden)).length,
    [activities]
  );

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
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
      if (sportListFilter !== 'all') {
        const cat = normalizeSportCategory(act.sportType);
        if (cat !== sportListFilter) return false;
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
  }, [activities, ownerFilter, statusFilter, sportListFilter, searchQuery, isAdmin, currentUserId]);

  const selectedActivity = useMemo(() => {
    // 1. Ưu tiên tìm chính xác theo selectedActivityId trong toàn bộ activities (kể cả bài chạy VĐV khác vừa click từ BXH)
    if (selectedActivityId) {
      const direct = activities.find((a) => a.id === selectedActivityId);
      if (direct) return direct;
    }
    // 2. Dự phòng tìm trong danh sách lọc
    if (filteredActivities.length === 0) return null;
    return filteredActivities[0];
  }, [activities, filteredActivities, selectedActivityId]);

  // Overall KPI statistics
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

    return {
      totalRuns: scopeActs.length,
      activeRunsCount: activeActs.length,
      hiddenRunsCount: scopeActs.filter((a) => a.isHidden).length,
      totalValidKm: roundKm(totalValidKm),
      totalElevation: Math.round(totalElevation),
      avgPaceFormatted: formatPace(avgPace),
      totalCalories: Math.round(totalValidKm * 65),
    };
  }, [activities, ownerFilter, isAdmin, currentUserId]);

  // If in Detail Mode, render Full Detail View
  if (viewMode === 'detail') {
    if (selectedActivity) {
      return (
        <TracklogDetailView
          activity={selectedActivity}
          onBackToList={() => setViewMode('list')}
          onOpenShareModal={onOpenShareModal}
          onToggleHideActivity={onToggleHideActivity}
          onDeleteActivity={onDeleteActivity}
          isAdmin={isAdmin}
          theme={theme}
        />
      );
    }
    return (
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-12 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-[#FC4C02]/10 text-[#FC4C02] flex items-center justify-center mx-auto">
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Đang tải dữ liệu chi tiết GPS Tracklog...
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hệ thống đang chuẩn bị bản đồ vệ tinh và bảng Splits từng km.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  // Otherwise render Overview List Mode
  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. TOP SUMMARY BAR: KPIS + QUICK ACTIONS
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 7 cols: KPI Cards */}
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FC4C02]/10 text-[#FC4C02] text-xs font-semibold">
                <Activity className="w-3.5 h-3.5" />
                <span>Nhật Ký & Thống Kê Tracklog</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                Tổng Quan Hoạt Động Chạy Bộ
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <label className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 transition cursor-pointer">
                <FileUp className="w-3.5 h-3.5 text-[#FC4C02]" />
                <span>Nhập GPX</span>
                <input
                  type="file"
                  accept=".gpx,.fit,.tcx"
                  onChange={onGpxUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={onSyncStravaLive}
                disabled={isSyncingStrava}
                className="px-3.5 py-1.5 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStrava ? 'animate-spin' : ''}`} />
                <span>{isSyncingStrava ? 'Đang đồng bộ...' : 'Đồng bộ Strava'}</span>
              </button>
            </div>
          </div>

          {/* 4 Quick Stat Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold block">Tổng KM Hợp Lệ</span>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
                {summaryStats.totalValidKm} <span className="text-xs font-normal text-slate-400">km</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold block">Số Buổi Chạy</span>
              <div className="text-xl font-black font-mono text-[#FC4C02] tabular-nums">
                {summaryStats.activeRunsCount} <span className="text-xs font-normal text-slate-400">buổi</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold block">Pace TB Chung</span>
              <div className="text-xl font-black font-mono text-emerald-500 tabular-nums">
                {summaryStats.avgPaceFormatted}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold block">Năng Lượng Tiêu Thụ</span>
              <div className="text-xl font-black font-mono text-purple-500 tabular-nums">
                {summaryStats.totalCalories} <span className="text-xs font-normal text-slate-400">kcal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Anti-cheat info card */}
        <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-slate-900 to-[#131B2E] border border-slate-800 text-white p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                AI Chống Gian Lận Tự Động
              </span>
              <span className="text-xs text-slate-400">Lọc từng KM</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
              Kiểm Duyệt Tốc Độ & Cắt Đoạn Bất Thường
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mỗi bài chạy được phân tách thành từng km độc lập. Nếu phát hiện km có tốc độ phi lý (xe máy / ô tô &lt;2:30/km) hoặc đi bộ quá chậm, hệ thống sẽ tự động cắt riêng km đó và giữ lại các km hợp lệ để tính điểm công bằng.
            </p>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-white/10">
            <span>Dữ liệu gốc từ Strava & GPX</span>
            <span className="text-emerald-400 font-semibold">Tự động tính giải</span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. BIỂU ĐỒ QUÃNG ĐƯỜNG TẬP LUYỆN TƯƠNG TÁC THEO TUẦN / THÁNG / NĂM
         ===================================================================== */}
      <TracklogDistanceChart
        activities={filteredActivities}
        selectedActivityId={selectedActivityId}
        onSelectActivity={(id) => {
          onSelectActivity(id);
          setViewMode('detail');
        }}
      />

      {/* =====================================================================
          3. FILTER & SEARCH TOOLBAR
         ===================================================================== */}
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Owner Filter */}
          {isAdmin ? (
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOwnerFilter('mine')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  ownerFilter === 'mine'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5 text-[#FC4C02]" />
                <span>Hoạt động của tôi</span>
              </button>
              <button
                type="button"
                onClick={() => setOwnerFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  ownerFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Sport List Filter */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
            {[
              { id: 'all', label: 'Tất cả môn' },
              { id: 'Run', label: '🏃 Chạy' },
              { id: 'Ride', label: '🚴 Đạp' },
              { id: 'Swim', label: '🏊 Bơi' },
              { id: 'Other', label: '🎾 Môn khác' },
            ].map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => setSportListFilter(sp.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  sportListFilter === sp.id
                    ? 'bg-white dark:bg-slate-800 text-[#FC4C02] font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên bài chạy, thiết bị..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-[#FC4C02]"
          />
        </div>
      </div>

      {/* =====================================================================
          4. DANH SÁCH OVERVIEW TRACKLOG CARDS
         ===================================================================== */}
      {filteredActivities.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#FC4C02]/10 text-[#FC4C02] flex items-center justify-center mx-auto">
            <Activity className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Chưa có bài chạy nào trong danh sách
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hãy liên kết Strava để đồng bộ hoặc nhập file GPX bài chạy của bạn.
            </p>
          </div>
          <button
            type="button"
            onClick={onSyncStravaLive}
            disabled={isSyncingStrava}
            className="px-4 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStrava ? 'animate-spin' : ''}`} />
            <span>Đồng bộ Strava ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActivities.map((act) => (
            <TracklogActivityCard
              key={act.id}
              activity={act}
              isSelected={act.id === selectedActivityId}
              onClick={() => {
                onSelectActivity(act.id);
                setViewMode('detail');
              }}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
