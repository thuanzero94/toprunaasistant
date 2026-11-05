'use client';

import React from 'react';
import {
  Activity,
  Calendar,
  Clock,
  Gauge,
  Heart,
  ShieldAlert,
  ArrowRight,
  EyeOff,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import {
  AntiCheatStatus,
  formatDuration,
  formatPace,
  polylineToSvgPath,
  roundKm,
  normalizeSportCategory,
} from '@toprun/shared';
import type { TracklogActivityItem } from '../UserTracklogExplorer';
import AthleteAvatar, { AthleteHonorPill } from '../AthleteAvatar';

interface TracklogActivityCardProps {
  activity: TracklogActivityItem;
  isSelected?: boolean;
  onClick: () => void;
  onToggleHide?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  isAdmin?: boolean;
}

export default function TracklogActivityCard({
  activity,
  isSelected,
  onClick,
  onToggleHide,
  onDelete,
  isAdmin,
}: TracklogActivityCardProps) {
  const miniMap = polylineToSvgPath(activity.polyline, 96, 64, 6);
  const countedKm = activity.isHidden ? 0 : roundKm(activity.validDistanceKm);
  const isCut = activity.invalidDistanceKm > 0;

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-2xl border p-4 sm:p-5 transition-all duration-200 space-y-3.5 bg-white dark:bg-[#0F1420] shadow-sm hover:shadow-md ${
        activity.isHidden
          ? 'opacity-60 border-dashed border-slate-300 dark:border-slate-700'
          : isSelected
          ? 'border-[#FC4C02] ring-2 ring-[#FC4C02]/20'
          : 'border-slate-200/80 dark:border-slate-800/80 hover:border-[#FC4C02]/40'
      }`}
    >
      {/* Header Row: Title, Date & Source Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{activity.dateStr}</span>
            </span>

            {/* Sport Category Badge */}
            {normalizeSportCategory(activity.sportType) === 'Other' ? (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                🎾 {activity.sportType || 'Môn khác'}
              </span>
            ) : normalizeSportCategory(activity.sportType) === 'Ride' ? (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                🚴 Đạp xe
              </span>
            ) : normalizeSportCategory(activity.sportType) === 'Swim' ? (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                🏊 Bơi lội
              </span>
            ) : null}

            {activity.source === 'STRAVA' && (
              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-[#FC4C02]/10 text-[#FC4C02] border border-[#FC4C02]/20">
                Strava
              </span>
            )}

            {activity.appliedMultiplier > 1 && (
              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5" />
                x{activity.appliedMultiplier}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="shrink-0 my-0.5">
              <AthleteAvatar
                user={{
                  id: activity.userId,
                  fullName: activity.userName,
                  avatarUrl: (activity as any).userAvatar,
                }}
                size="xs"
                showBadge={true}
                showWings={true}
                showSharkCrown={true}
              />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate group-hover:text-[#FC4C02] transition">
              {activity.name}
            </h3>
            <AthleteHonorPill user={{ id: activity.userId, fullName: activity.userName }} />
          </div>
        </div>

        {/* Anti-cheat status pill */}
        <div className="shrink-0">
          {activity.antiCheatStatus === AntiCheatStatus.VALID ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3 h-3" />
              <span>Hợp lệ</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <ShieldAlert className="w-3 h-3" />
              <span>Cắt {roundKm(activity.invalidDistanceKm)} km</span>
            </span>
          )}
        </div>
      </div>

      {/* Middle Row: Mini GPS SVG Route + 4 Core Metrics */}
      <div className="flex items-center gap-4">
        {/* Mini Polyline Map */}
        <div className="w-24 h-16 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative">
          {miniMap.pathData ? (
            <svg viewBox="0 0 96 64" className="w-full h-full p-2">
              <path
                d={miniMap.pathData}
                fill="none"
                stroke="#FC4C02"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <Activity className="w-5 h-5 text-slate-300 dark:text-slate-600" />
          )}
          {activity.deviceName && (
            <div className="absolute bottom-0.5 right-1 text-[8px] font-mono text-slate-400 truncate max-w-[80px]">
              {activity.deviceName.split(' ')[0]}
            </div>
          )}
        </div>

        {/* 4 Metrics Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 flex-1 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">Quãng đường</span>
            <span className="font-black font-mono text-slate-900 dark:text-white tabular-nums text-sm">
              {countedKm} <span className="text-[10px] font-normal text-slate-400">km</span>
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block">Pace TB</span>
            <span className="font-bold font-mono text-[#FC4C02] tabular-nums text-sm">
              {formatPace(activity.avgPaceSecPerKm)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block">Thời gian</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 tabular-nums">
              {formatDuration(activity.movingTimeSec)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block">Nhịp tim</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 tabular-nums flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500/20" />
              <span>{activity.avgHr ? `${Math.round(activity.avgHr)} bpm` : '—'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer: Detail Link & Quick Actions */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-[#FC4C02] font-semibold text-xs flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
          <span>Xem chi tiết tracklog GPS & Splits</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>

        {activity.isHidden && (
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
            <EyeOff className="w-3 h-3" />
            <span>Đã ẩn khỏi giải</span>
          </span>
        )}
      </div>
    </div>
  );
}
