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
} from 'lucide-react';
import { formatPace, roundKm, normalizeSportCategory } from '@toprun/shared';
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
}

interface TournamentParticipantModalProps {
  participant: ParticipantDetailData | null;
  onClose: () => void;
  onSelectActivity?: (activityId: string) => void;
}

export default function TournamentParticipantModal({
  participant,
  onClose,
  onSelectActivity,
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
            const acts = participant.activities || [];
            const runKm = roundKm(acts.filter((a) => normalizeSportCategory(a.sportType) === 'Run').reduce((s, a) => s + (a.finalCountedDistanceKm || a.validDistanceKm), 0));
            const rideRaw = roundKm(acts.filter((a) => normalizeSportCategory(a.sportType) === 'Ride').reduce((s, a) => s + a.validDistanceKm, 0));
            const rideConv = roundKm(acts.filter((a) => normalizeSportCategory(a.sportType) === 'Ride').reduce((s, a) => s + (a.finalCountedDistanceKm || a.validDistanceKm), 0));
            const swimRaw = roundKm(acts.filter((a) => normalizeSportCategory(a.sportType) === 'Swim').reduce((s, a) => s + a.validDistanceKm, 0));
            const swimConv = roundKm(acts.filter((a) => normalizeSportCategory(a.sportType) === 'Swim').reduce((s, a) => s + (a.finalCountedDistanceKm || a.validDistanceKm), 0));

            if (rideConv === 0 && swimConv === 0) return null;

            return (
              <div className="p-3.5 rounded-2xl bg-orange-50/80 dark:bg-[#FC4C02]/10 border border-orange-200/80 dark:border-[#FC4C02]/25 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Quy đổi cự ly chéo bộ môn:
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#FC4C02]">
                    Tổng {roundKm(participant.totalValidKm)} km
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                  {runKm > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                      🏃 {runKm} km chạy
                    </span>
                  )}
                  {rideConv > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold">
                      🚴 +{rideConv} km <span className="font-normal text-[10px]">({rideRaw} km đạp)</span>
                    </span>
                  )}
                  {swimConv > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 font-bold">
                      🏊 +{swimConv} km <span className="font-normal text-[10px]">({swimRaw} km bơi)</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Activities List contributed to this race */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#FC4C02]" />
                <span>Nhật ký bài chạy trong giải ({participant.activities?.length || 0})</span>
              </h4>
            </div>

            {participant.activities && participant.activities.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {participant.activities.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => {
                      if (onSelectActivity) {
                        onSelectActivity(act.id);
                        onClose();
                      }
                    }}
                    className="p-3 bg-white dark:bg-slate-900/60 hover:bg-orange-50/50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-3 text-xs transition cursor-pointer group"
                    title="Nhấn để xem chi tiết Tracklog GPS bản đồ vệ tinh & Splits"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{act.title || act.name || 'Buổi chạy tích luỹ'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>
                          {act.startDateIso
                            ? new Date(act.startDateIso).toLocaleDateString('vi-VN')
                            : act.dateStr || '—'}
                        </span>
                        <span>• Pace: {formatPace(act.avgPaceSecPerKm)}</span>
                        {act.elevationGainM ? <span>• +{act.elevationGainM}m</span> : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-[#FC4C02] font-mono text-sm tabular-nums">
                          +{roundKm(act.validDistanceKm)} km
                        </div>
                        {act.kudosCount ? (
                          <div className="text-[10px] text-slate-400 flex items-center justify-end gap-0.5">
                            <ThumbsUp className="w-2.5 h-2.5 text-[#FC4C02]" />
                            <span>{act.kudosCount}</span>
                          </div>
                        ) : null}
                      </div>

                      {onSelectActivity && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectActivity(act.id);
                            onClose();
                          }}
                          title="Xem chi tiết Tracklog GPS"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                Chưa có bài chạy hợp lệ nào được đồng bộ trong thời gian giải.
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

