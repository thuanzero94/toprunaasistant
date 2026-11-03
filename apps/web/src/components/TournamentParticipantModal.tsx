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
import { formatPace, roundKm } from '@toprun/shared';

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
            <div className="relative">
              {participant.avatarUrl ? (
                <img
                  src={participant.avatarUrl}
                  alt={participant.name}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#FC4C02]"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#FC4C02] text-white font-black text-xl flex items-center justify-center shadow-lg">
                  {participant.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              {participant.rank && participant.rank <= 3 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                  #{participant.rank}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{participant.name}</h3>
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
                    className="p-3 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center justify-between gap-3 text-xs transition"
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

