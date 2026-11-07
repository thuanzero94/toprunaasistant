'use client';

import React, { useMemo } from 'react';
import { Award, CheckCircle2 } from 'lucide-react';
import { normalizeSportCategory, roundKm } from '@toprun/shared';
import AthleteAvatar, { AthleteHonorPill } from '../AthleteAvatar';
import type { TracklogActivityItem } from '../UserTracklogExplorer';

interface TournamentLeaderboardSectionProps {
  currentEventData: any;
  user?: any;
  activities: TracklogActivityItem[];
  leaderboardMode: 'individual' | 'team';
  onChangeLeaderboardMode: (mode: 'individual' | 'team') => void;
  onOpenParticipantDetail: (participant: any) => void;
}

export default function TournamentLeaderboardSection({
  currentEventData,
  user,
  activities,
  leaderboardMode,
  onChangeLeaderboardMode,
  onOpenParticipantDetail,
}: TournamentLeaderboardSectionProps) {
  const sortedParticipants = useMemo(() => {
    if (!Array.isArray(currentEventData?.individualLeaderboard)) return [];
    return currentEventData.individualLeaderboard
      .slice()
      .sort((a: any, b: any) => (b.multipliedDistanceKm ?? 0) - (a.multipliedDistanceKm ?? 0));
  }, [currentEventData?.individualLeaderboard]);

  const computeSportBreakdown = (p: any) => {
    const sb = p.sportBreakdown;
    if (sb && (sb.rideConvertedKm > 0 || sb.swimConvertedKm > 0)) {
      return {
        runKm: roundKm(sb.runKm || 0),
        rideRawKm: roundKm(sb.rideRawKm || 0),
        rideConvKm: roundKm(sb.rideConvertedKm || 0),
        swimRawKm: roundKm(sb.swimRawKm || 0),
        swimConvKm: roundKm(sb.swimConvertedKm || 0),
      };
    }
    const userActs = activities.filter(
      (a) => a.userId === p.userId && !a.isHidden && a.validDistanceKm > 0
    );
    const runDist = userActs
      .filter((a) => normalizeSportCategory(a.sportType) === 'Run')
      .reduce((s, a) => s + (a.finalCountedDistanceKm || a.validDistanceKm), 0);
    const rideRaw = userActs
      .filter((a) => normalizeSportCategory(a.sportType) === 'Ride')
      .reduce((s, a) => s + a.validDistanceKm, 0);
    const rideConv = userActs
      .filter((a) => normalizeSportCategory(a.sportType) === 'Ride')
      .reduce((s, a) => s + (a.finalCountedDistanceKm || a.validDistanceKm), 0);
    const swimRaw = userActs
      .filter((a) => normalizeSportCategory(a.sportType) === 'Swim')
      .reduce((s, a) => s + a.validDistanceKm, 0);
    const swimConv = userActs
      .filter((a) => normalizeSportCategory(a.sportType) === 'Swim')
      .reduce((s, a) => s + (a.finalCountedDistanceKm || a.validDistanceKm), 0);

    return {
      runKm: roundKm(runDist),
      rideRawKm: roundKm(rideRaw),
      rideConvKm: roundKm(rideConv),
      swimRawKm: roundKm(swimRaw),
      swimConvKm: roundKm(swimConv),
    };
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-sm">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Bảng xếp hạng giải đấu ({sortedParticipants.length} VĐV)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cập nhật theo thời gian thực sau khi kiểm duyệt tốc độ từng km
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onChangeLeaderboardMode('individual')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              leaderboardMode === 'individual'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Cá nhân
          </button>
          <button
            type="button"
            onClick={() => onChangeLeaderboardMode('team')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              leaderboardMode === 'team'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Đội nhóm / Phòng ban
          </button>
        </div>
      </div>

      {leaderboardMode === 'individual' ? (
        sortedParticipants.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <Award className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <div className="text-xs font-semibold">
              Chưa có vận động viên nào tham gia giải đấu này
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Hãy là người đầu tiên đăng ký chinh phục mục tiêu!
            </div>
          </div>
        ) : (
          <>
            {/* ===============================================================
                MOBILE VIEW (< md): 100%-WIDTH CARDS (ZERO HORIZONTAL SCROLL)
               =============================================================== */}
            <div className="md:hidden space-y-2.5">
              {sortedParticipants.map((p: any, index: number) => {
                const rank = index + 1;
                const isGold = rank === 1;
                const isSilver = rank === 2;
                const isBronze = rank === 3;
                const isMe = user?.id ? p.userId === user.id : false;
                const targetKm = Number(p.targetDistanceKm || 50);
                const rawKm = Number(p.rawDistanceKm || 0);
                const multipliedKm = Number(p.multipliedDistanceKm || 0);
                const pct =
                  targetKm > 0 ? Math.min(100, Math.round((multipliedKm / targetKm) * 100)) : 0;
                const isFinisher = Boolean(p.isTargetCompleted || pct >= 100);
                const breakdown = computeSportBreakdown(p);

                return (
                  <div
                    key={p.participationId || p.bibNumber || index}
                    onClick={() => onOpenParticipantDetail({ ...p, rank })}
                    className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2.5 ${
                      isMe
                        ? 'bg-[#FC4C02]/10 dark:bg-[#FC4C02]/15 border-[#FC4C02]/40'
                        : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 active:bg-slate-100 dark:active:bg-slate-800/70'
                    }`}
                  >
                    {/* Top Row: Rank + Avatar + Name/Honor/Dept + BIB Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Medal */}
                        <div className="shrink-0">
                          {isGold ? (
                            <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black font-mono text-xs flex items-center justify-center shadow-xs">
                              1
                            </span>
                          ) : isSilver ? (
                            <span className="w-7 h-7 rounded-xl bg-slate-300 text-slate-900 font-black font-mono text-xs flex items-center justify-center shadow-xs">
                              2
                            </span>
                          ) : isBronze ? (
                            <span className="w-7 h-7 rounded-xl bg-amber-700 text-white font-black font-mono text-xs flex items-center justify-center shadow-xs">
                              3
                            </span>
                          ) : (
                            <span className="w-7 h-7 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold font-mono text-xs flex items-center justify-center">
                              #{rank}
                            </span>
                          )}
                        </div>

                        {/* Avatar */}
                        <div className="shrink-0">
                          <AthleteAvatar
                            user={{
                              id: p.userId,
                              fullName: p.userName,
                              avatarUrl: p.userAvatar,
                              departmentOrUnit: p.department,
                              role: p.role,
                              honorBadge: p.honorBadge,
                            }}
                            rank={rank}
                            size="sm"
                            showBadge={true}
                            showWings={true}
                            showSharkCrown={true}
                          />
                        </div>

                        {/* Name & Honor Pill */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {p.userName}
                            </span>
                            {isMe && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#FC4C02] text-white">
                                BẠN
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <AthleteHonorPill
                              user={{
                                id: p.userId,
                                fullName: p.userName,
                                avatarUrl: p.userAvatar,
                                departmentOrUnit: p.department,
                                role: p.role,
                                honorBadge: p.honorBadge,
                              }}
                              rank={rank}
                            />
                            <span className="text-[11px] text-slate-400 truncate">
                              {p.department || 'Runner'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Single-line BIB Badge & Finisher Status */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-[#FC4C02] border border-slate-200/80 dark:border-slate-700 whitespace-nowrap">
                          {p.bibNumber}
                        </span>
                        {isFinisher ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Finisher 🏆</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                            Còn {Math.max(0, roundKm(targetKm - multipliedKm))} km
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Full-width Progress Bar + KM Numbers + Converted Breakdown */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1.5">
                      <div className="flex items-baseline justify-between text-xs">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                            {multipliedKm}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            / {targetKm} km mục tiêu
                          </span>
                          {rawKm !== multipliedKm && (
                            <span className="text-[10px] font-mono text-slate-400">
                              (gốc {rawKm}km)
                            </span>
                          )}
                        </div>
                        <span
                          className={`font-mono font-extrabold text-xs ${
                            isFinisher
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-[#FC4C02]'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isFinisher ? 'bg-emerald-500' : 'bg-[#FC4C02]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {(breakdown.rideConvKm > 0 || breakdown.swimConvKm > 0) && (
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-0.5">
                          {breakdown.runKm > 0 && <span>🏃 Chạy {breakdown.runKm}km</span>}
                          {breakdown.rideConvKm > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              🚴 +{breakdown.rideConvKm}km ({breakdown.rideRawKm}km đạp)
                            </span>
                          )}
                          {breakdown.swimConvKm > 0 && (
                            <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                              🏊 +{breakdown.swimConvKm}km ({breakdown.swimRawKm}km bơi)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ===============================================================
                DESKTOP VIEW (md+): FULL 8-COLUMN LEADERBOARD TABLE
               =============================================================== */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/70 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-400">
                    <th className="py-3 px-3 text-center w-12">Hạng</th>
                    <th className="py-3 px-3">Vận động viên</th>
                    <th className="py-3 px-3">Mã BIB</th>
                    <th className="py-3 px-3">Mục tiêu</th>
                    <th className="py-3 px-3">Thực chạy</th>
                    <th className="py-3 px-3">Điểm tính giải</th>
                    <th className="py-3 px-3">Tiến độ</th>
                    <th className="py-3 px-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {sortedParticipants.map((p: any, index: number) => {
                    const rank = index + 1;
                    const isGold = rank === 1;
                    const isSilver = rank === 2;
                    const isBronze = rank === 3;
                    const isMe = user?.id ? p.userId === user.id : false;
                    const targetKm = Number(p.targetDistanceKm || 50);
                    const rawKm = Number(p.rawDistanceKm || 0);
                    const multipliedKm = Number(p.multipliedDistanceKm || 0);
                    const pct =
                      targetKm > 0 ? Math.min(100, Math.round((multipliedKm / targetKm) * 100)) : 0;
                    const isFinisher = Boolean(p.isTargetCompleted || pct >= 100);
                    const breakdown = computeSportBreakdown(p);

                    return (
                      <tr
                        key={p.participationId || p.bibNumber || index}
                        onClick={() => onOpenParticipantDetail({ ...p, rank })}
                        className={`transition cursor-pointer ${
                          isMe
                            ? 'bg-[#FC4C02]/10 dark:bg-[#FC4C02]/15 hover:bg-[#FC4C02]/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Rank Medal */}
                        <td className="py-3 px-3 text-center font-mono font-bold">
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
                        </td>

                        {/* Runner Info */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0 my-1">
                              <AthleteAvatar
                                user={{
                                  id: p.userId,
                                  fullName: p.userName,
                                  avatarUrl: p.userAvatar,
                                  departmentOrUnit: p.department,
                                  role: p.role,
                                  honorBadge: p.honorBadge,
                                }}
                                rank={rank}
                                size="sm"
                                showBadge={true}
                                showWings={true}
                                showSharkCrown={true}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {p.userName}
                                </span>
                                <AthleteHonorPill
                                  user={{
                                    id: p.userId,
                                    fullName: p.userName,
                                    avatarUrl: p.userAvatar,
                                    departmentOrUnit: p.department,
                                    role: p.role,
                                    honorBadge: p.honorBadge,
                                  }}
                                  rank={rank}
                                />
                                {isMe && (
                                  <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-[#FC4C02] text-white">
                                    BẠN
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {p.department || 'Runner Community'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* BIB */}
                        <td className="py-3 px-3">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#FC4C02] border border-slate-200/60 dark:border-slate-700/60 whitespace-nowrap">
                            {p.bibNumber}
                          </span>
                        </td>

                        {/* Target */}
                        <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {targetKm} KM
                        </td>

                        {/* Raw Km */}
                        <td className="py-3 px-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {rawKm} km
                        </td>

                        {/* Multiplied Km */}
                        <td className="py-3 px-3">
                          <div className="font-mono font-black text-slate-900 dark:text-white text-sm">
                            {multipliedKm}{' '}
                            <span className="text-[11px] font-normal text-slate-400">km</span>
                          </div>
                          {(breakdown.rideConvKm > 0 || breakdown.swimConvKm > 0) && (
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {breakdown.runKm > 0 && <span>🏃 {breakdown.runKm}km</span>}
                              {breakdown.rideConvKm > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                  🚴 +{breakdown.rideConvKm}km{' '}
                                  <span className="opacity-75">({breakdown.rideRawKm}km đạp)</span>
                                </span>
                              )}
                              {breakdown.swimConvKm > 0 && (
                                <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                                  🏊 +{breakdown.swimConvKm}km{' '}
                                  <span className="opacity-75">({breakdown.swimRawKm}km bơi)</span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Progress Bar */}
                        <td className="py-3 px-3 min-w-[150px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {multipliedKm}/{targetKm}km
                              </span>
                              <span className="font-bold text-[#FC4C02]">{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isFinisher ? 'bg-emerald-500' : 'bg-[#FC4C02]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isFinisher ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                              <CheckCircle2 className="w-3 h-3" />
                              Finisher 🏆
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              Còn {Math.max(0, roundKm(targetKm - multipliedKm))} km
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              rank: 1,
              name: 'Khối Công Nghệ & R&D (Engineering)',
              members: 18,
              totalKm: 418.6,
            },
            {
              rank: 2,
              name: 'Khối Vận Hành & Chuỗi Cung Ứng (Operations)',
              members: 22,
              totalKm: 375.2,
            },
            {
              rank: 3,
              name: 'Khối Kinh Doanh & Thương Mại (Commercial)',
              members: 16,
              totalKm: 290.8,
            },
          ].map((team) => (
            <div
              key={team.name}
              className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-[#FC4C02]">
                  Hạng #{team.rank}
                </span>
                <span className="text-xs text-slate-500">{team.members} thành viên</span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">{team.name}</h4>
              <div className="flex items-baseline justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800">
                <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                  {team.totalKm} km
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  TB: {roundKm(team.totalKm / team.members)} km/người
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
