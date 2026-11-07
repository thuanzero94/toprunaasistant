'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Medal,
  Plus,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import { ChallengeConditionType } from '@toprun/shared';

interface TournamentChallengeTableProps {
  challenges: any[];
  challengeLeaderboards?: any[];
  user?: any;
  myBibNumber: string;
  onOpenChallengeLeaderboard: (challengeInfo: any) => void;
  onToggleChallengeRegistration: (tierId: string, nextRegistered: boolean) => Promise<void> | void;
}

type ChallengeViewFilter = 'all' | 'registered' | 'unlocked';

export default function TournamentChallengeTable({
  challenges = [],
  challengeLeaderboards = [],
  user,
  myBibNumber,
  onOpenChallengeLeaderboard,
  onToggleChallengeRegistration,
}: TournamentChallengeTableProps) {
  const [filter, setFilter] = useState<ChallengeViewFilter>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [togglingTierId, setTogglingTierId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const total = challenges.length;
    const registered = challenges.filter((c) => Boolean(c.isRegistered)).length;
    const unlocked = challenges.filter((c) => Boolean(c.isUnlocked)).length;
    return { total, registered, unlocked };
  }, [challenges]);

  const filteredChallenges = useMemo(() => {
    if (filter === 'registered') {
      return challenges.filter((c) => Boolean(c.isRegistered));
    }
    if (filter === 'unlocked') {
      return challenges.filter((c) => Boolean(c.isUnlocked));
    }
    return challenges;
  }, [challenges, filter]);

  const handleToggleRegister = async (chal: any) => {
    if (togglingTierId) return;
    try {
      setTogglingTierId(chal.tierId);
      await onToggleChallengeRegistration(chal.tierId, !chal.isRegistered);
    } finally {
      setTogglingTierId(null);
    }
  };

  const handleViewChallengeLeaderboard = (chal: any) => {
    const chInfo = challengeLeaderboards?.find((cl: any) => cl.tierId === chal.tierId) || {
      tierId: chal.tierId,
      tierName: chal.tierName,
      tierLevel: chal.tierLevel,
      conditionType: chal.conditionType,
      targetSpeedDistanceKm: chal.targetSpeedDistanceKm,
      awardBadgeUrl: chal.awardBadgeUrl,
      thresholdValue: chal.thresholdValue,
      totalParticipants: chal.isRegistered ? 1 : 0,
      completedCount: chal.isUnlocked ? 1 : 0,
      completedLeaderboard: chal.isUnlocked
        ? [
            {
              rank: 1,
              userId: user?.id,
              userName: user?.fullName || 'Bạn',
              userAvatar: user?.avatarUrl,
              department: user?.departmentOrUnit || 'Runner',
              bibNumber: myBibNumber,
              isUnlocked: true,
              currentValue: chal.currentValue,
              thresholdValue: chal.thresholdValue,
            },
          ]
        : [],
      allParticipants: chal.isRegistered
        ? [
            {
              userId: user?.id,
              userName: user?.fullName || 'Bạn',
              userAvatar: user?.avatarUrl,
              department: user?.departmentOrUnit || 'Runner',
              bibNumber: myBibNumber,
              isUnlocked: chal.isUnlocked,
              currentValue: chal.currentValue,
              thresholdValue: chal.thresholdValue,
            },
          ]
        : [],
    };
    onOpenChallengeLeaderboard(chInfo);
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 space-y-4 shadow-sm">
      {/* =====================================================================
          HEADER: TITLE + QUICK FILTERS + COLLAPSE BUTTON
         ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Tầng 2 • Thử thách mở rộng
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400">
                Đã đạt {counts.unlocked}/{counts.total} • Đã đăng ký {counts.registered}/{counts.total}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Bảng Thử Thách &amp; Huy Hiệu Đặc Biệt (Challenge Awards)
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tất cả ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setFilter('registered')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filter === 'registered'
                  ? 'bg-white dark:bg-slate-800 text-[#FC4C02] shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Đã đăng ký ({counts.registered})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unlocked')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filter === 'unlocked'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Đã đạt ({counts.unlocked})
            </button>
          </div>

          {/* Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 transition cursor-pointer"
          >
            <span>{isCollapsed ? 'Mở rộng' : 'Thu gọn'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* =====================================================================
          COMPACT TABLE BODY
         ===================================================================== */}
      {!isCollapsed && (
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto rounded-xl border border-slate-200/70 dark:border-slate-800/80">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800">
              <tr className="text-[11px] font-bold uppercase text-slate-400">
                <th className="py-2.5 px-3.5">Thử thách &amp; Hạng</th>
                <th className="py-2.5 px-3.5">Bộ môn &amp; Điều kiện</th>
                <th className="py-2.5 px-3.5 min-w-[170px]">Tiến độ của bạn</th>
                <th className="py-2.5 px-3.5 text-center">BXH &amp; VĐV</th>
                <th className="py-2.5 px-3.5 text-right">Đăng ký nhanh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredChallenges.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Không có thử thách nào trong bộ lọc này.
                  </td>
                </tr>
              ) : (
                filteredChallenges.map((chal) => {
                  const isRegistered = Boolean(chal.isRegistered);
                  const isUnlocked = Boolean(chal.isUnlocked);
                  const isToggling = togglingTierId === chal.tierId;
                  const lbEntry = challengeLeaderboards?.find((cl: any) => cl.tierId === chal.tierId);
                  const totalParticipants = lbEntry?.totalParticipants ?? (isRegistered ? 1 : 0);
                  const completedCount = lbEntry?.completedCount ?? (isUnlocked ? 1 : 0);

                  const sportLabel =
                    chal.sportCategory === 'Ride'
                      ? '🚴 Đạp xe'
                      : chal.sportCategory === 'Swim'
                      ? '🏊 Bơi lội'
                      : '🏃 Chạy bộ';

                  const unitLabel =
                    chal.conditionType === ChallengeConditionType.STREAK_DAYS
                      ? 'ngày'
                      : chal.conditionType === ChallengeConditionType.ELEVATION_GAIN
                      ? 'm'
                      : 'km';

                  const pct =
                    chal.conditionType === ChallengeConditionType.SPEED_TARGET_TIME
                      ? isUnlocked
                        ? 100
                        : 0
                      : Math.min(100, Number(chal.progressPercentage || 0));

                  return (
                    <tr
                      key={chal.tierId}
                      className={`transition ${
                        isUnlocked
                          ? 'bg-amber-50/40 dark:bg-amber-950/15 hover:bg-amber-50/70 dark:hover:bg-amber-950/25'
                          : isRegistered
                          ? 'bg-[#FC4C02]/[0.03] dark:bg-[#FC4C02]/[0.05] hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* 1. Challenge Name & Tier Badge */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                              isUnlocked
                                ? 'bg-amber-500/20 text-amber-500 ring-1 ring-amber-400/50'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {chal.awardBadgeUrl || <Medal className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                              <span>{chal.tierName}</span>
                              <span
                                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  isUnlocked
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {isUnlocked ? 'ĐÃ ĐẠT' : chal.tierLevel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Sport & Condition Description */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-0.5 max-w-xs">
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {sportLabel}
                          </span>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {chal.rewardDescription}
                          </div>
                        </div>
                      </td>

                      {/* 3. Progress Bar */}
                      <td className="py-3 px-3.5">
                        {!isRegistered ? (
                          <span className="text-[11px] text-slate-400 italic">
                            Chưa đăng ký tham gia
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              {chal.conditionType === ChallengeConditionType.SPEED_TARGET_TIME ? (
                                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                  {isUnlocked
                                    ? `Đạt chuẩn (${chal.currentValue > 0 ? `${chal.currentValue}p` : 'OK'})`
                                    : `${chal.targetSpeedDistanceKm || 5}km ≤ ${chal.thresholdValue}p`}
                                </span>
                              ) : (
                                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                  {chal.currentValue} / {chal.thresholdValue} {unitLabel}
                                </span>
                              )}
                              <span
                                className={`font-bold ${
                                  isUnlocked
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-[#FC4C02]'
                                }`}
                              >
                                {isUnlocked ? '100%' : `${pct}%`}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isUnlocked ? 'bg-emerald-500' : 'bg-[#FC4C02]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 4. Leaderboard Button */}
                      <td className="py-3 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleViewChallengeLeaderboard(chal)}
                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] transition cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-[#FC4C02]" />
                          <span>
                            BXH ({completedCount}/{totalParticipants})
                          </span>
                        </button>
                      </td>

                      {/* 5. Quick 1-Click Register / Unregister Action */}
                      <td className="py-3 px-3.5 text-right">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleRegister(chal)}
                          className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            isRegistered
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-300'
                              : 'bg-[#FC4C02] hover:bg-[#E34402] text-white shadow-xs'
                          }`}
                          title={
                            isRegistered
                              ? 'Nhấn để huỷ đăng ký thử thách này'
                              : 'Nhấn để đăng ký tham gia thử thách này ngay lập tức'
                          }
                        >
                          {isToggling ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang lưu...</span>
                            </>
                          ) : isRegistered ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Đã ĐK • Huỷ</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Đăng ký</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
