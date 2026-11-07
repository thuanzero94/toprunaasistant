'use client';

import React from 'react';
import {
  X,
  Trophy,
  Award,
  Calendar,
  Flame,
  Activity,
  CheckCircle2,
  ThumbsUp,
  MapPin,
  Clock,
  ExternalLink,
  Compass,
} from 'lucide-react';
import {
  formatPace,
  formatSportSpeed,
  formatSportDistance,
  getSpeedSplitLabel,
  roundKm,
  normalizeSportCategory,
} from '@toprun/shared';
import AthleteAvatar, { AthleteHonorPill } from './AthleteAvatar';

export interface ParticipantDetailData {
  userId: string;
  name: string;
  avatarUrl?: string;
  clubName?: string;
  bibNumber?: string;
  targetDistanceKm: number;
  totalValidKm: number;
  progressPercent: number;
  gender?: string;
  rank?: number;
  challengeTierAchieved?: string;
  role?: string;
  honorBadge?: string | null;
  activities?: any[];
  sportBreakdown?: {
    runKm: number;
    rideRawKm: number;
    rideConvertedKm: number;
    swimRawKm: number;
    swimConvertedKm: number;
  };
  challengeFilter?: {
    tierId: string;
    tierName: string;
    tierLevel?: string;
    conditionType?: string;
    thresholdValue?: number;
    targetSpeedDistanceKm?: number;
    currentValue?: number;
    isUnlocked?: boolean;
  };
}

interface TournamentParticipantModalProps {
  participant: ParticipantDetailData | null;
  onClose: () => void;
  onSelectActivity?: (activityId: string) => void;
  onViewFullUserTracklogs?: (userId: string, userName: string) => void;
}

export default function TournamentParticipantModal({
  participant,
  onClose,
  onSelectActivity,
  onViewFullUserTracklogs,
}: TournamentParticipantModalProps) {
  if (!participant) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-xl w-full rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Profile */}
        <div className="relative p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="shrink-0 my-1">
              <AthleteAvatar
                user={{
                  id: participant.userId,
                  fullName: participant.name,
                  avatarUrl: participant.avatarUrl,
                  role: participant.role,
                  honorBadge: participant.honorBadge,
                }}
                rank={participant.rank}
                size="lg"
                showBadge={true}
                showWings={true}
                showSharkCrown={true}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold">{participant.name}</h3>
                <AthleteHonorPill
                  user={{ role: participant.role, honorBadge: participant.honorBadge }}
                  rank={participant.rank}
                />
                {participant.bibNumber && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#FC4C02] text-white">
                    BIB {participant.bibNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2">
                <span>{participant.clubName || 'VĐV Tự Do'}</span>
                {participant.gender && (
                  <span>• {participant.gender === 'M' ? 'Nam' : 'Nữ'}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Highlight Grid */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Đã tích luỹ</span>
              <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                {roundKm(participant.totalValidKm)} <span className="text-xs font-normal">km</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Mục tiêu Target</span>
              <div className="text-lg font-black text-[#FC4C02] tabular-nums mt-0.5">
                {participant.targetDistanceKm} <span className="text-xs font-normal">km</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Huy hiệu</span>
              <div className="text-xs font-bold text-amber-500 mt-1 flex items-center justify-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>{participant.challengeTierAchieved || 'Đang thi đua'}</span>
              </div>
            </div>
          </div>

          {/* Target Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-300">Tiến độ hoàn thành Target</span>
              <span className="text-[#FC4C02] tabular-nums">
                {Math.round(participant.progressPercent || (participant.totalValidKm / (participant.targetDistanceKm || 1)) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FC4C02] to-amber-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(participant.progressPercent || (participant.totalValidKm / (participant.targetDistanceKm || 1)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Cross-training converted breakdown if any */}
          {(() => {
            const sb = participant.sportBreakdown;
            const acts = participant.activities || [];
            const runKm = sb ? sb.runKm : roundKm(acts.filter((a) => normalizeSportCategory(a.sportType) === 'Run').reduce((s, a) => s + (a.finalCountedDistanceKm || a.validDistanceKm), 0));
            const rideRaw = sb ? sb.rideRawKm : roundKm(acts.filter((a) => normalizeSportCategory(a.sportType) === 'Ride').reduce((s, a) => s + a.validDistanceKm, 0));
            const rideConv = sb ? sb.rideConvertedKm : roundKm(acts.filter((a) => normalizeSportCategory(a.sportType) === 'Ride').reduce((s, a) => s + (a.finalCountedDistanceKm || a.validDistanceKm), 0));
            const swimRaw = sb ? sb.swimRawKm : roundKm(acts.filter((a) => normalizeSportCategory(a.sportType) === 'Swim').reduce((s, a) => s + a.validDistanceKm, 0));
            const swimConv = sb ? sb.swimConvertedKm : roundKm(acts.filter((a) => normalizeSportCategory(a.sportType) === 'Swim').reduce((s, a) => s + (a.finalCountedDistanceKm || a.validDistanceKm), 0));

            if (rideConv === 0 && swimConv === 0) return null;

            return (
              <div className="p-3.5 rounded-2xl bg-orange-50/80 dark:bg-[#FC4C02]/10 border border-orange-200/80 dark:border-[#FC4C02]/25 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Quy đổi chéo bộ môn sang Target:</span>
                  </span>
                  <span className="text-[11px] font-mono font-black text-[#FC4C02]">
                    Tổng {roundKm(participant.totalValidKm)} km
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
                  {runKm > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold shadow-2xs">
                      🏃 Chạy {runKm}KM
                    </span>
                  )}
                  {rideConv > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs">
                      🚴 +{rideConv}KM <span className="font-normal text-[11px] text-emerald-600 dark:text-emerald-400">({rideRaw}km đạp xe)</span>
                    </span>
                  )}
                  {swimConv > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 font-bold shadow-2xs">
                      🏊 +{swimConv}KM <span className="font-normal text-[11px] text-cyan-600 dark:text-cyan-400">({swimRaw}km bơi)</span>
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-orange-200/60 dark:border-[#FC4C02]/15">
                  <span className="text-slate-400">Công thức: </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                    Chạy {runKm}KM {rideConv > 0 ? `+ ${rideConv}KM (đạp xe)` : ''} {swimConv > 0 ? `+ ${swimConv}KM (bơi)` : ''} = {roundKm(participant.totalValidKm)}KM
                  </span>
                  {rideConv > 0 && (
                    <span className="text-[10px] text-slate-400 ml-1.5 font-normal">
                      (${rideRaw}km đạp xe ~ ${rideConv}KM target)
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Challenge Filter Banner (when inspecting from a Special Challenge leaderboard) */}
          {participant.challengeFilter && (
            <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  <span>Kiểm tra Tracklog Thử Thách Mở Rộng</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {participant.challengeFilter.tierName}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                  {participant.challengeFilter.conditionType === 'SPEED_TARGET_TIME'
                    ? `Yêu cầu: ${participant.challengeFilter.targetSpeedDistanceKm || 5}KM ≤ ${participant.challengeFilter.thresholdValue} phút • Đạt: ${participant.challengeFilter.currentValue || 0} phút`
                    : `Mục tiêu: ${participant.challengeFilter.thresholdValue} • Đạt: ${participant.challengeFilter.currentValue || 0}`}
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                  participant.challengeFilter.isUnlocked
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {participant.challengeFilter.isUnlocked ? '✓ Đã hoàn thành' : 'Đang thử thách'}
              </span>
            </div>
          )}

          {/* Activities List contributed to this race */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#FC4C02]" />
                <span>
                  {participant.challengeFilter
                    ? `Tracklog hợp lệ cho thử thách "${participant.challengeFilter.tierName}" (${participant.activities?.length || 0})`
                    : `Nhật ký bài chạy trong giải (${participant.activities?.length || 0})`}
                </span>
              </h4>
            </div>

            {participant.activities && participant.activities.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {participant.activities.map((act) => {
                  const sportCat = normalizeSportCategory(act.sportType);
                  const sportIcon = sportCat === 'Ride' ? '🚴' : sportCat === 'Swim' ? '🏊' : '🏃';
                  const countedKm = roundKm(act.finalCountedDistanceKm || act.validDistanceKm || 0);
                  const rawKm = roundKm(act.validDistanceKm || act.rawDistanceKm || 0);
                  const hasConversion = sportCat !== 'Run' && countedKm > 0 && countedKm !== rawKm;

                  return (
                    <div
                      key={act.id}
                      onClick={() => {
                        if (onSelectActivity) {
                          onSelectActivity(act.id);
                        }
                      }}
                      className="p-3 bg-white dark:bg-slate-900/60 hover:bg-orange-50/50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-3 text-xs transition cursor-pointer group"
                      title="Nhấn để xem chi tiết Tracklog GPS bản đồ vệ tinh & Splits"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{sportIcon}</span>
                          <span>{act.title || act.name || 'Hoạt động trong giải'}</span>
                          {hasConversion && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300">
                              Quy đổi
                            </span>
                          )}
                          {act.isChallengeQualifying && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              🏅 Đạt chuẩn {act.challengeMetricNote ? `(${act.challengeMetricNote})` : ''}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>
                            {act.startDateIso
                              ? new Date(act.startDateIso).toLocaleDateString('vi-VN')
                              : act.dateStr || '—'}
                          </span>
                          <span>• {getSpeedSplitLabel(act.sportType)}: {formatSportSpeed(act.avgPaceSecPerKm, act.sportType)}</span>
                          {act.elevationGain || act.elevationGainM ? <span>• +{act.elevationGain || act.elevationGainM}m</span> : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-bold text-[#FC4C02] font-mono text-sm tabular-nums">
                            +{countedKm} km
                          </div>
                          {hasConversion ? (
                            <div className="text-[10px] text-slate-400 font-mono">
                              ({rawKm} km gốc)
                            </div>
                          ) : act.kudosCount ? (
                            <div className="text-[10px] text-slate-400 flex items-center justify-end gap-0.5">
                              <ThumbsUp className="w-2.5 h-2.5 text-[#FC4C02]" />
                              <span>{act.kudosCount}</span>
                            </div>
                          ) : null}
                        </div>

                        {onSelectActivity && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectActivity(act.id);
                            }}
                            title="Xem chi tiết Tracklog GPS"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                Chưa có bài chạy hợp lệ nào được đồng bộ trong thời gian giải.
              </div>
            )}

            {/* Nút Xem thêm đầy đủ tracklog của User */}
            {onViewFullUserTracklogs && participant.userId && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onViewFullUserTracklogs) {
                      onViewFullUserTracklogs(participant.userId, participant.name);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-[#FC4C02]/10 dark:hover:bg-[#FC4C02]/15 text-slate-700 dark:text-slate-200 hover:text-[#FC4C02] text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Compass className="w-4 h-4 text-[#FC4C02]" />
                  <span>Xem thêm đầy đủ Tracklog của {participant.name} →</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

