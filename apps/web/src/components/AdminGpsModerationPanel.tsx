'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  Trophy,
  Clock,
  Compass,
  AlertTriangle,
  CheckCircle2,
  X,
  Activity,
  Gauge,
  Zap,
  ArrowRight,
  Flame,
} from 'lucide-react';
import {
  AntiCheatStatus,
  formatPace,
  roundKm,
  isActivityInEventRange,
  toVietnamDateString,
  normalizeSportCategory,
} from '@toprun/shared';
import type { TracklogActivityItem } from './UserTracklogExplorer';
import AthleteAvatar, { AthleteHonorPill } from './AthleteAvatar';

export interface AdminGpsModerationPanelProps {
  activities: TracklogActivityItem[];
  eventsList: any[];
  onInspectFlaggedActivity: (activityId: string) => void;
  selectedEventId?: string;
  onSelectEventId?: (eventId: string) => void;
}

export default function AdminGpsModerationPanel({
  activities,
  eventsList,
  onInspectFlaggedActivity,
  selectedEventId: initialSelectedEventId,
  onSelectEventId,
}: AdminGpsModerationPanelProps) {
  // Bộ lọc
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(
    initialSelectedEventId && eventsList.some((e) => e.id === initialSelectedEventId)
      ? initialSelectedEventId
      : 'ALL'
  );
  const [runnerSearchQuery, setRunnerSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'FLAGGED_OR_REJECTED' | 'FLAGGED' | 'REJECTED' | 'ALL'>('FLAGGED_OR_REJECTED');
  const [sportFilter, setSportFilter] = useState<'ALL' | 'Run' | 'Ride' | 'Swim'>('ALL');

  // Thông tin giải đấu đang được chọn (nếu có)
  const currentSelectedEvent = useMemo(() => {
    if (selectedTournamentId === 'ALL') return null;
    return eventsList.find((e) => e.id === selectedTournamentId) || null;
  }, [eventsList, selectedTournamentId]);

  // Lọc danh sách hoạt động theo Giải đấu (khoảng thời gian giải), Tên VĐV và Trạng thái
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // 1. Lọc theo Giải đấu (khoảng thời gian diễn ra giải theo múi giờ VN UTC+7)
      if (currentSelectedEvent) {
        if (!act.startDateIso) return false;
        const inRange = isActivityInEventRange(
          act.startDateIso,
          currentSelectedEvent.startDateIso,
          currentSelectedEvent.endDateIso
        );
        if (!inRange) return false;
      }

      // 2. Lọc theo Tên vận động viên / Tên bài chạy / Mã externalId
      if (runnerSearchQuery.trim()) {
        const query = runnerSearchQuery.toLowerCase().trim();
        const matchName = (act.userName || '').toLowerCase().includes(query);
        const matchActName = (act.name || '').toLowerCase().includes(query);
        const matchExtId = (act.externalId || '').toLowerCase().includes(query);
        const matchDept = (act.department || '').toLowerCase().includes(query);
        if (!matchName && !matchActName && !matchExtId && !matchDept) return false;
      }

      // 3. Lọc theo trạng thái kiểm duyệt GPS
      if (statusFilter === 'FLAGGED_OR_REJECTED') {
        if (act.antiCheatStatus === AntiCheatStatus.VALID && (!act.flagReasons || act.flagReasons.length === 0)) {
          return false;
        }
      } else if (statusFilter === 'FLAGGED') {
        if (act.antiCheatStatus !== AntiCheatStatus.FLAGGED && act.antiCheatStatus !== AntiCheatStatus.PARTIAL_VALID) {
          return false;
        }
      } else if (statusFilter === 'REJECTED') {
        if (act.antiCheatStatus !== AntiCheatStatus.REJECTED) {
          return false;
        }
      }

      // 4. Lọc theo môn thể thao
      if (sportFilter !== 'ALL') {
        const cat = normalizeSportCategory(act.sportType);
        if (cat !== sportFilter) return false;
      }

      return true;
    });
  }, [activities, currentSelectedEvent, runnerSearchQuery, statusFilter, sportFilter]);

  // Thống kê nhanh trong phạm vi giải đấu đang chọn (hoặc toàn hệ thống)
  const stats = useMemo(() => {
    const scopeActs = activities.filter((act) => {
      if (!currentSelectedEvent) return true;
      if (!act.startDateIso) return false;
      return isActivityInEventRange(
        act.startDateIso,
        currentSelectedEvent.startDateIso,
        currentSelectedEvent.endDateIso
      );
    });

    const flagged = scopeActs.filter(
      (a) => a.antiCheatStatus === AntiCheatStatus.FLAGGED || a.antiCheatStatus === AntiCheatStatus.PARTIAL_VALID
    );
    const rejected = scopeActs.filter((a) => a.antiCheatStatus === AntiCheatStatus.REJECTED);
    const valid = scopeActs.filter((a) => a.antiCheatStatus === AntiCheatStatus.VALID);

    return {
      total: scopeActs.length,
      flaggedCount: flagged.length,
      rejectedCount: rejected.length,
      validCount: valid.length,
      cutDistanceKm: roundKm(
        flagged.reduce((acc, a) => acc + Math.max(0, (a.rawDistanceKm || 0) - (a.validDistanceKm || 0)), 0)
      ),
    };
  }, [activities, currentSelectedEvent]);

  // Format ngày giờ Việt Nam
  const formatVnDateTime = (isoString?: string) => {
    if (!isoString) return 'Chưa cập nhật';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 space-y-6 shadow-sm">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <span>Hàng Đợi Kiểm Duyệt GPS &amp; Chống Gian Lận Tốc Độ</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hệ thống tự động phát hiện, cắt đoạn tốc độ bất thường (Pace &lt; 03:00/km) và lưu vết vi phạm của vận động viên.
          </p>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>{filteredActivities.length} hoạt động nghi vấn</span>
          </span>
        </div>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tổng bài trong phạm vi</div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {stats.total}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {currentSelectedEvent ? 'Theo khoảng ngày giải' : 'Toàn hệ thống'}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
          <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Đã cắt km lỗi</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {stats.flaggedCount}
          </div>
          <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
            Cắt giảm: -{stats.cutDistanceKm} km ảo
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40">
          <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Bị từ chối (0 km)</span>
          </div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
            {stats.rejectedCount}
          </div>
          <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
            Vi phạm giới hạn quy chế
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Hợp lệ hoàn toàn</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.validCount}
          </div>
          <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
            {stats.total > 0 ? `${Math.round((stats.validCount / stats.total) * 100)}% đạt chuẩn` : '0%'}
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR: GIẢI ĐẤU + TÊN VẬN ĐỘNG VIÊN + TRẠNG THÁI */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Filter className="w-4 h-4 text-[#FC4C02]" />
          <span>Bộ lọc kiểm duyệt chuyên sâu:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Lọc theo Giải Đấu (hiện tracklog theo khoảng thời gian giải) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Giải đấu áp dụng:</span>
            </label>
            <select
              value={selectedTournamentId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTournamentId(val);
                if (onSelectEventId && val !== 'ALL') {
                  onSelectEventId(val);
                }
              }}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0E14] text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-[#FC4C02] transition"
            >
              <option value="ALL">🌐 Tất cả giải đấu (Toàn hệ thống)</option>
              {eventsList.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  🏆 {ev.title} ({ev.startDateIso ? toVietnamDateString(ev.startDateIso) : ''} →{' '}
                  {ev.endDateIso ? toVietnamDateString(ev.endDateIso) : ''})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Lọc theo Tên Vận Động Viên */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-[#FC4C02]" />
              <span>Tìm theo VĐV / Hoạt động:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={runnerSearchQuery}
                onChange={(e) => setRunnerSearchQuery(e.target.value)}
                placeholder="Nhập tên vận động viên..."
                className="w-full pl-8 pr-7 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0E14] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-[#FC4C02] transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {runnerSearchQuery && (
                <button
                  type="button"
                  onClick={() => setRunnerSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Lọc theo Phân Loại Kiểm Duyệt */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Trạng thái kiểm duyệt:</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0E14] text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-[#FC4C02] transition"
            >
              <option value="FLAGGED_OR_REJECTED">⚠️ Bất thường (Cắt km hoặc Bị từ chối)</option>
              <option value="FLAGGED">⚡ Chỉ bài đã cắt km (Pace &lt; 03:00/km)</option>
              <option value="REJECTED">🚫 Chỉ bài bị từ chối (REJECTED)</option>
              <option value="ALL">📋 Xem tất cả hoạt động (Kể cả hợp lệ)</option>
            </select>
          </div>

          {/* 4. Lọc theo Môn thể thao */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-sky-500" />
              <span>Bộ môn:</span>
            </label>
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0E14] text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-[#FC4C02] transition"
            >
              <option value="ALL">Tất cả môn (Chạy / Xe / Bơi)</option>
              <option value="Run">🏃 Chạy bộ (Run)</option>
              <option value="Ride">🚴 Đạp xe (Ride)</option>
              <option value="Swim">🏊 Bơi lội (Swim)</option>
            </select>
          </div>
        </div>

        {/* Selected Tournament Detail Banner (nếu đang lọc theo 1 giải) */}
        {currentSelectedEvent && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#FC4C02] flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>{currentSelectedEvent.title}</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="flex items-center gap-1 text-[11px]">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>
                  Khoảng thời gian giải: {formatVnDateTime(currentSelectedEvent.startDateIso)} →{' '}
                  {formatVnDateTime(currentSelectedEvent.endDateIso)} (Giờ VN UTC+7)
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTournamentId('ALL')}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer self-start sm:self-auto"
            >
              Xem toàn hệ thống
            </button>
          </div>
        )}
      </div>

      {/* DANH SÁCH HOẠT ĐỘNG KIỂM DUYỆT */}
      <div className="space-y-3">
        {filteredActivities.map((act) => {
          const isSplitFlagged =
            act.antiCheatStatus === AntiCheatStatus.FLAGGED || act.antiCheatStatus === AntiCheatStatus.PARTIAL_VALID;
          const isRejected = act.antiCheatStatus === AntiCheatStatus.REJECTED;
          const cutKm = roundKm(Math.max(0, (act.rawDistanceKm || 0) - (act.validDistanceKm || 0)));

          return (
            <div
              key={act.id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 hover:border-[#FC4C02]/40 dark:hover:border-[#FC4C02]/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
            >
              <div className="space-y-2 flex-1">
                {/* Header Row: Trạng thái badge + Tên VĐV + Tên Hoạt động */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Status Badge */}
                  {isSplitFlagged ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>Đã cắt km lỗi ({cutKm > 0 ? `-${cutKm} km` : 'Tách đoạn'})</span>
                    </span>
                  ) : isRejected ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      <span>Bị từ chối ghi nhận</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Hợp lệ hoàn toàn</span>
                    </span>
                  )}

                  {/* Athlete Info with Avatar Effects & Honor Badge */}
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 my-1">
                      <AthleteAvatar
                        user={{
                          id: act.userId || 'runner',
                          fullName: act.userName,
                          avatarUrl: (act as any).userAvatar,
                        }}
                        size="sm"
                        showBadge={true}
                        showWings={true}
                        showSharkCrown={true}
                      />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm hover:text-[#FC4C02] transition">
                      {act.userName}
                    </span>
                    <AthleteHonorPill user={{ id: act.userId, fullName: act.userName }} />
                  </div>

                  {/* Activity Name */}
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    • {act.name}
                  </span>
                </div>

                {/* Metrics & Reasoning Row */}
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatVnDateTime(act.startDateIso)}</span>
                  </span>

                  <span className="text-slate-300 dark:text-slate-700">•</span>

                  <span className="font-mono">
                    Gốc: <strong>{act.rawDistanceKm} km</strong> → Hợp lệ:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">{act.validDistanceKm} km</strong>
                  </span>

                  <span className="text-slate-300 dark:text-slate-700">•</span>

                  <span className="flex items-center gap-1 font-mono">
                    <Gauge className="w-3.5 h-3.5 text-slate-400" />
                    <span>{getSpeedSplitLabel(act.sportType)}: {formatSportSpeed(act.avgPaceSecPerKm, act.sportType)}</span>
                  </span>

                  {act.deviceName && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-[11px] text-slate-400">{act.deviceName}</span>
                    </>
                  )}
                </div>

                {/* Flag Reasons (Chi tiết cảnh báo) */}
                {act.flagReasons && act.flagReasons.length > 0 && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 space-y-0.5">
                    {act.flagReasons.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button: Xem Chi Tiết GPS & Splits */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => onInspectFlaggedActivity(act.id)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-[#FC4C02] dark:hover:bg-[#FC4C02] dark:hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Compass className="w-4 h-4 text-[#FC4C02] group-hover:text-white" />
                  <span>Xem Chi Tiết GPS</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredActivities.length === 0 && (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Không tìm thấy hoạt động nghi vấn nào phù hợp
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {currentSelectedEvent
                  ? `Trong khoảng thời gian giải đấu "${currentSelectedEvent.title}", các hoạt động đều đảm bảo quy chuẩn tốc độ và vị trí GPS hợp lệ.`
                  : 'Toàn bộ bài chạy trong hệ thống hiện tại đều tuân thủ đúng quy chuẩn chống gian lận.'}
              </p>
            </div>
            {(runnerSearchQuery || selectedTournamentId !== 'ALL' || statusFilter !== 'FLAGGED_OR_REJECTED' || sportFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTournamentId('ALL');
                  setRunnerSearchQuery('');
                  setStatusFilter('FLAGGED_OR_REJECTED');
                  setSportFilter('ALL');
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
