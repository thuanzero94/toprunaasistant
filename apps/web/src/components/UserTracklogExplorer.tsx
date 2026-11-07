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
import AthleteAvatar, { AthleteHonorPill } from './AthleteAvatar';

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
  userAvatar?: string;
  kudoUsers?: any[];
  comments?: any[];
  splits: TracklogSplitItem[];
}

interface Props {
  activities: TracklogActivityItem[];
  selectedActivityId: string;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  currentUserRole?: string;
  viewMode?: 'list' | 'detail';
  onViewModeChange?: (mode: 'list' | 'detail') => void;
  onSelectActivity: (id: string) => void;
  onToggleHideActivity: (id: string) => Promise<void> | void;
  onDeleteActivity: (id: string) => Promise<void> | void;
  onOpenShareModal: () => void;
  theme: 'dark' | 'light';
  viewingUser?: { id: string; name: string } | null;
  onClearViewingUser?: () => void;
  onBackToTournament?: () => void;
  onGoToAccountSettings?: () => void;
}

export default function UserTracklogExplorer({
  activities,
  selectedActivityId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserRole,
  viewMode: controlledViewMode,
  onViewModeChange,
  onSelectActivity,
  onToggleHideActivity,
  onDeleteActivity,
  onOpenShareModal,
  theme,
  viewingUser,
  onClearViewingUser,
  onBackToTournament,
  onGoToAccountSettings,
}: Props) {
  const isAdmin = currentUserRole === 'ADMIN';
  const [internalViewMode, setInternalViewMode] = useState<'list' | 'detail'>('list');
  const viewMode = controlledViewMode ?? internalViewMode;

  const setViewMode = (mode: 'list' | 'detail') => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };
  const [ownerFilter, setOwnerFilter] = useState<'mine' | 'all'>('mine');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'flagged' | 'hidden'>('all');
  const [sportListFilter, setSportListFilter] = useState<'all' | 'Run' | 'Ride' | 'Swim' | 'Other'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to determine if an activity belongs to current user
  const isMyActivity = (act: TracklogActivityItem) => {
    if (currentUserId && act.userId === currentUserId) return true;
    return false;
  };

  // Danh sách các VĐV có bài chạy để lọc nhanh trong chế độ "Toàn bộ VĐV" (ưu tiên chính mình lên đầu)
  const availableAthletes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; totalKm: number; isMe: boolean }>();
    for (const act of activities) {
      if (!act.userId) continue;
      if (act.isHidden && !isAdmin && !isMyActivity(act)) continue;
      const existing = map.get(act.userId);
      if (existing) {
        existing.count += 1;
        existing.totalKm = roundKm(existing.totalKm + (act.validDistanceKm || 0));
      } else {
        map.set(act.userId, {
          id: act.userId,
          name: act.userName || 'Vận động viên',
          count: 1,
          totalKm: roundKm(act.validDistanceKm || 0),
          isMe: Boolean(currentUserId && act.userId === currentUserId),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.isMe && !b.isMe) return -1;
      if (!a.isMe && b.isMe) return 1;
      return b.totalKm - a.totalKm;
    });
  }, [activities, currentUserId, isAdmin]);

  const hiddenCount = useMemo(
    () =>
      activities.filter((a) => {
        if (!a.isHidden) return false;
        if (ownerFilter === 'mine') return isMyActivity(a);
        return isAdmin || isMyActivity(a);
      }).length,
    [activities, ownerFilter, isAdmin, currentUserId]
  );

  // Filter activities (Mặc định ưu tiên bài chạy của chính mình)
  const filteredActivities = useMemo(() => {
    const list = activities.filter((act) => {
      if (viewingUser) {
        if (act.userId !== viewingUser.id) return false;
        if (act.isHidden && !isAdmin && !isMyActivity(act)) return false;
      } else if (ownerFilter === 'mine') {
        if (!isMyActivity(act)) return false;
      } else {
        // ownerFilter === 'all': xem toàn bộ VĐV (Cộng đồng) + lọc theo VĐV cụ thể nếu chọn
        if (act.isHidden && !isAdmin && !isMyActivity(act)) return false;
        if (selectedAthleteId !== 'all' && act.userId !== selectedAthleteId) return false;
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

    // Khi xem "Toàn bộ VĐV" mà chưa lọc riêng 1 VĐV khác, mặc định ưu tiên đẩy bài chạy của chính mình lên đầu
    if (!viewingUser && ownerFilter === 'all' && selectedAthleteId === 'all' && currentUserId) {
      return [...list].sort((a, b) => {
        const aMine = a.userId === currentUserId ? 1 : 0;
        const bMine = b.userId === currentUserId ? 1 : 0;
        if (aMine !== bMine) return bMine - aMine;
        const tA = a.startDateIso ? new Date(a.startDateIso).getTime() : 0;
        const tB = b.startDateIso ? new Date(b.startDateIso).getTime() : 0;
        return tB - tA;
      });
    }

    return list;
  }, [
    activities,
    viewingUser,
    ownerFilter,
    selectedAthleteId,
    statusFilter,
    sportListFilter,
    searchQuery,
    isAdmin,
    currentUserId,
  ]);

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
      if (viewingUser) {
        return act.userId === viewingUser.id && (!act.isHidden || isAdmin || isMyActivity(act));
      }
      if (ownerFilter === 'mine') {
        return isMyActivity(act);
      }
      return !act.isHidden || isAdmin || isMyActivity(act);
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
          onBackToTournament={onBackToTournament}
          onOpenShareModal={onOpenShareModal}
          onToggleHideActivity={onToggleHideActivity}
          onDeleteActivity={onDeleteActivity}
          isAdmin={isAdmin}
          isOwner={isMyActivity(selectedActivity)}
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
          1. BIỂU ĐỒ QUÃNG ĐƯỜNG TẬP LUYỆN TƯƠNG TÁC THEO TUẦN / THÁNG / NĂM
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
          2. FILTER & SEARCH TOOLBAR (KÈM LỌC USER TRONG CHẾ ĐỘ TOÀN BỘ VĐV)
         ===================================================================== */}
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Owner Filter (Mặc định ưu tiên hiện Tracklog của chính mình) */}
          {viewingUser ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FC4C02]/10 border border-[#FC4C02]/30 text-xs font-bold text-[#FC4C02]">
              <div className="shrink-0 my-0.5">
                <AthleteAvatar
                  user={{ id: viewingUser.id, fullName: viewingUser.name }}
                  size="xs"
                  showBadge={true}
                  showWings={true}
                  showSharkCrown={true}
                />
              </div>
              <span>VĐV: {viewingUser.name}</span>
              <AthleteHonorPill user={{ id: viewingUser.id, fullName: viewingUser.name }} />
              {onClearViewingUser && (
                <button
                  type="button"
                  onClick={onClearViewingUser}
                  className="ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  title="Quay lại bài chạy của tôi"
                >
                  ✕
                </button>
              )}
            </div>
          ) : (
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setOwnerFilter('mine');
                  setSelectedAthleteId('all');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  ownerFilter === 'mine'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5 text-[#FC4C02]" />
                <span>Bài của tôi</span>
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
                <span>Toàn bộ VĐV</span>
              </button>
            </div>
          )}

          {/* Bộ lọc chọn VĐV muốn xem khi ở tab "Toàn bộ VĐV" */}
          {!viewingUser && ownerFilter === 'all' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50/80 dark:bg-[#FC4C02]/10 border border-orange-200/80 dark:border-[#FC4C02]/30">
              <Users className="w-3.5 h-3.5 text-[#FC4C02] shrink-0" />
              <span className="text-[11px] font-bold text-[#FC4C02] shrink-0">Lọc VĐV:</span>
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[190px] sm:max-w-[240px] truncate focus:outline-hidden cursor-pointer"
              >
                <option value="all" className="bg-white dark:bg-[#0F1420] text-slate-900 dark:text-white">
                  Tất cả VĐV (Ưu tiên bài của tôi)
                </option>
                {availableAthletes.map((ath) => (
                  <option
                    key={ath.id}
                    value={ath.id}
                    className="bg-white dark:bg-[#0F1420] text-slate-900 dark:text-white"
                  >
                    {ath.isMe ? `⭐ ${ath.name} (Tôi)` : ath.name} • {ath.count} bài ({ath.totalKm} km)
                  </option>
                ))}
              </select>
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
        <div className="flex items-center gap-2 flex-1 justify-end min-w-[200px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm bài chạy, VĐV, thiết bị..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-[#FC4C02]"
            />
          </div>
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
              Hãy vào tab &quot;Cá nhân&quot; để kết nối Strava đồng bộ tự động hoặc tải lên file GPX bài chạy của bạn.
            </p>
          </div>
          {onGoToAccountSettings && (
            <button
              type="button"
              onClick={onGoToAccountSettings}
              className="px-4 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Vào Cài Đặt Cá Nhân &amp; Strava</span>
            </button>
          )}
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-5">
          {filteredActivities.map((act) => (
            <TracklogActivityCard
              key={act.id}
              activity={act}
              isSelected={act.id === selectedActivityId}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
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
