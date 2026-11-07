'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  EyeOff,
  Flame,
  Footprints,
  Heart,
  MapPin,
  MessageSquare,
  Send,
  ShieldAlert,
  ThumbsUp,
  Trash2,
  Trophy,
  Watch,
} from 'lucide-react';
import {
  AntiCheatStatus,
  formatDuration,
  formatPace,
  formatSportSpeed,
  formatSportDistance,
  getSpeedMetricLabel,
  getSpeedSplitLabel,
  getSpeedUnit,
  polylineToSvgPath,
  roundKm,
  normalizeSportCategory,
} from '@toprun/shared';
import type { TracklogActivityItem } from '../UserTracklogExplorer';
import AthleteAvatar, { AthleteHonorPill } from '../AthleteAvatar';

export interface ActivityKudoUser {
  userId: string;
  userName: string;
  userAvatar?: string;
}

export interface ActivityCommentItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAtIso: string;
}

interface TracklogActivityCardProps {
  activity: TracklogActivityItem;
  isSelected?: boolean;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  onClick: () => void;
  onToggleHide?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onToggleKudo?: (activityId: string) => Promise<void> | void;
  onAddComment?: (activityId: string, content: string) => Promise<any> | void;
  onDeleteComment?: (activityId: string, commentId: string) => Promise<void> | void;
  isAdmin?: boolean;
}

export default function TracklogActivityCard({
  activity,
  isSelected,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onClick,
  onToggleKudo,
  onAddComment,
  onDeleteComment,
  isAdmin,
}: TracklogActivityCardProps) {
  // Local optimistic social states
  const [liked, setLiked] = useState<boolean>(Boolean(activity.liked));
  const [kudosCount, setKudosCount] = useState<number>(Number(activity.kudos || 0));
  const [kudoUsers, setKudoUsers] = useState<ActivityKudoUser[]>(
    Array.isArray((activity as any).kudoUsers) ? (activity as any).kudoUsers : []
  );
  const [comments, setComments] = useState<ActivityCommentItem[]>(
    Array.isArray((activity as any).comments) ? (activity as any).comments : []
  );
  const [showComments, setShowComments] = useState<boolean>(false);
  const [commentInput, setCommentInput] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);

  // Sync with prop updates when parent refreshes activities
  React.useEffect(() => {
    setLiked(Boolean(activity.liked));
    setKudosCount(Number(activity.kudos || 0));
    if (Array.isArray((activity as any).kudoUsers)) {
      setKudoUsers((activity as any).kudoUsers);
    }
    if (Array.isArray((activity as any).comments)) {
      setComments((activity as any).comments);
    }
  }, [activity]);

  const routeSvg = useMemo(
    () => polylineToSvgPath(activity.polyline, 640, 260, 28),
    [activity.polyline]
  );

  // Parse start & end coordinates from pathData ("M x1 y1 L x2 y2 ...")
  const routeEndpoints = useMemo(() => {
    if (!routeSvg.pathData) return null;
    const nums = routeSvg.pathData
      .replace(/[ML]/g, ' ')
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    if (nums.length < 4) return null;
    return {
      startX: nums[0],
      startY: nums[1],
      endX: nums[nums.length - 2],
      endY: nums[nums.length - 1],
      midX: nums[Math.floor(nums.length / 4) * 2] || nums[0],
      midY: nums[Math.floor(nums.length / 4) * 2 + 1] || nums[1],
    };
  }, [routeSvg.pathData]);

  const countedKm = activity.isHidden ? 0 : roundKm(activity.validDistanceKm);
  const sportCategory = normalizeSportCategory(activity.sportType);

  // Best 1km split effort & achievement count
  const achievementSummary = useMemo(() => {
    const validSplits = (activity.splits || []).filter((s) => s.isValid && s.paceSecPerKm > 120);
    let fastestSplit: { index: number; paceFormatted: string; paceSec: number } | null = null;
    for (const sp of validSplits) {
      if (!fastestSplit || sp.paceSecPerKm < fastestSplit.paceSec) {
        fastestSplit = {
          index: sp.splitIndex,
          paceFormatted: sp.formattedPace || formatSportSpeed(sp.paceSecPerKm, activity.sportType),
          paceSec: sp.paceSecPerKm,
        };
      }
    }
    let badgeCount = 0;
    if (countedKm >= 5) badgeCount++;
    if (countedKm >= 10) badgeCount++;
    if (countedKm >= 21) badgeCount++;
    if (fastestSplit && fastestSplit.paceSec <= 300) badgeCount++;
    if (activity.appliedMultiplier > 1) badgeCount++;
    if (badgeCount === 0 && countedKm > 0) badgeCount = 1;

    return { fastestSplit, badgeCount };
  }, [activity.splits, countedKm, activity.appliedMultiplier]);

  // Smart Pacer / Telemetry note (similar to Strava description)
  const evaluationNote = useMemo(() => {
    const hr = activity.avgHr || 0;
    const zoneText =
      hr >= 170
        ? 'Cường độ hôm nay rơi vào vùng nhịp tim cao (Zone 4 - Zone 5), nỗ lực bứt tốc mạnh mẽ.'
        : hr >= 145
        ? 'Buổi tập duy trì ở vùng nhịp tim Tempo/Aerobic (Zone 3 - Zone 4), tối ưu sức bền tốc độ.'
        : 'Nhịp tim ổn định ở vùng Easy/Aerobic (Zone 2), rất tốt để tích lũy nền tảng thể lực.';
    const splitText =
      activity.invalidDistanceKm > 0
        ? `Hệ thống Anti-Cheat đã tự động lọc bỏ ${roundKm(activity.invalidDistanceKm)} km vượt ngưỡng tốc độ và công nhận ${countedKm} km hợp lệ.`
        : `Toàn bộ ${countedKm} km đều đạt chuẩn tốc độ GPS hợp lệ 100% với guồng chân trung bình ${activity.avgCadence || 172} spm.`;
    return `${zoneText} ${splitText}`;
  }, [activity.avgHr, activity.invalidDistanceKm, countedKm, activity.avgCadence]);

  const handleKudoClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLiked = !liked;
    setLiked(nextLiked);
    setKudosCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));
    if (currentUserId) {
      if (nextLiked) {
        setKudoUsers((prev) => [
          ...prev.filter((u) => u.userId !== currentUserId),
          {
            userId: currentUserId,
            userName: currentUserName || 'Bạn',
            userAvatar: currentUserAvatar,
          },
        ]);
      } else {
        setKudoUsers((prev) => prev.filter((u) => u.userId !== currentUserId));
      }
    }

    if (onToggleKudo) {
      await onToggleKudo(activity.id);
    } else {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
        const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
        await fetch(`${apiBase}/activities/${encodeURIComponent(activity.id)}/kudos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ userId: currentUserId }),
        });
      } catch {}
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = commentInput.trim();
    if (!text || isSubmittingComment) return;

    setIsSubmittingComment(true);
    setCommentInput('');

    const optimisticComment: ActivityCommentItem = {
      id: `cmt_temp_${Date.now()}`,
      userId: currentUserId || '',
      userName: currentUserName || 'Bạn',
      userAvatar: currentUserAvatar || '',
      content: text,
      createdAtIso: new Date().toISOString(),
    };
    setComments((prev) => [...prev, optimisticComment]);

    try {
      if (onAddComment) {
        const created = await onAddComment(activity.id, text);
        if (created && created.id) {
          setComments((prev) =>
            prev.map((c) => (c.id === optimisticComment.id ? created : c))
          );
        }
      } else {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
        const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
        const res = await fetch(`${apiBase}/activities/${encodeURIComponent(activity.id)}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ userId: currentUserId, content: text }),
        });
        if (res.ok) {
          const created = await res.json();
          setComments((prev) =>
            prev.map((c) => (c.id === optimisticComment.id ? created : c))
          );
        }
      }
    } catch {
      // Keep optimistic comment
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteCommentClick = async (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation();
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    if (onDeleteComment) {
      await onDeleteComment(activity.id, commentId);
    } else {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
        const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
        await fetch(
          `${apiBase}/activities/${encodeURIComponent(activity.id)}/comments/${encodeURIComponent(commentId)}`,
          {
            method: 'DELETE',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
      } catch {}
    }
  };

  return (
    <article
      className={`rounded-2xl border bg-white dark:bg-[#0F1420] shadow-xs transition-all duration-200 overflow-hidden ${
        activity.isHidden
          ? 'opacity-65 border-dashed border-slate-300 dark:border-slate-700'
          : isSelected
          ? 'border-[#FC4C02] ring-2 ring-[#FC4C02]/20'
          : 'border-slate-200/85 dark:border-slate-800/85 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* =====================================================================
          1. STRAVA FEED HEADER: AVATAR + RUNNER NAME + TIMESTAMP & DEVICE
         ===================================================================== */}
      <div className="p-4 sm:px-6 sm:pt-5 sm:pb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 cursor-pointer" onClick={onClick}>
            <AthleteAvatar
              user={{
                id: activity.userId,
                fullName: activity.userName,
                avatarUrl: (activity as any).userAvatar,
              }}
              size="md"
              showBadge={true}
              showWings={true}
              showSharkCrown={true}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={onClick}
                className="font-bold text-sm sm:text-[15px] text-slate-900 dark:text-white hover:text-[#FC4C02] transition truncate cursor-pointer"
              >
                {activity.userName}
              </button>
              <AthleteHonorPill user={{ id: activity.userId, fullName: activity.userName }} />
            </div>

            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-snug">
              <span>{activity.dateStr}</span>
              {activity.deviceName && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                    <Watch className="w-3 h-3 text-slate-400" />
                    {activity.deviceName}
                  </span>
                </>
              )}
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-[#FC4C02] shrink-0" />
              <span className="truncate">{activity.locationName || activity.department || 'Vietnam'}</span>
            </div>
          </div>
        </div>

        {/* Right Status & Detail Button */}
        <div className="flex items-center gap-2 shrink-0">
          {activity.isHidden ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
              <EyeOff className="w-3 h-3" />
              <span>Đã ẩn</span>
            </span>
          ) : activity.antiCheatStatus === AntiCheatStatus.VALID ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3 h-3" />
              <span>Hợp lệ</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <ShieldAlert className="w-3 h-3" />
              <span>Cắt {roundKm(activity.invalidDistanceKm)} km</span>
            </span>
          )}

          <button
            type="button"
            onClick={onClick}
            title="Xem chi tiết GPS & Splits"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. ACTIVITY TITLE, SPORT ICON & EVALUATION NOTE
         ===================================================================== */}
      <div className="px-4 sm:px-6 pb-3 space-y-2">
        <div
          onClick={onClick}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <span
            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800/90 flex items-center justify-center text-sm shrink-0"
            title={activity.sportType || 'Run'}
          >
            {sportCategory === 'Ride'
              ? '🚴'
              : sportCategory === 'Swim'
              ? '🏊'
              : sportCategory === 'Other'
              ? '🎾'
              : '👟'}
          </span>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-[#FC4C02] transition tracking-tight">
            {activity.name}
          </h3>
          {activity.appliedMultiplier > 1 && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-0.5">
              <Flame className="w-3 h-3" />
              x{activity.appliedMultiplier}
            </span>
          )}
        </div>

        {/* Evaluation Note with Read More */}
        <div className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
          <p className={isDescExpanded ? '' : 'line-clamp-2'}>
            📌 <span className="font-semibold text-slate-800 dark:text-slate-200">Đánh giá chi tiết:</span>{' '}
            {evaluationNote}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDescExpanded((prev) => !prev);
            }}
            className="text-[11px] font-semibold text-slate-400 hover:text-[#FC4C02] mt-0.5 cursor-pointer"
          >
            {isDescExpanded ? 'Thu gọn' : 'Đọc thêm...'}
          </button>
        </div>

        {/* ===================================================================
            3. STRAVA 4-COLUMN CORE METRICS (QUÃNG ĐƯỜNG • NHỊP ĐỘ • THỜI GIAN • THÀNH TÍCH)
           =================================================================== */}
        <div
          onClick={onClick}
          className="pt-2 pb-1 grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-6 cursor-pointer border-t border-slate-100 dark:border-slate-800/60"
        >
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Quãng đường</span>
            <span className="text-base sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
              {formatSportDistance(countedKm, activity.sportType)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{getSpeedMetricLabel(activity.sportType)}</span>
            <span className="text-base sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
              {formatSportSpeed(activity.avgPaceSecPerKm, activity.sportType)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Thời gian</span>
            <span className="text-base sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
              {formatDuration(activity.movingTimeSec)}
            </span>
          </div>

          <div className="hidden sm:block text-right">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Thành tích</span>
            <span className="text-base sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white inline-flex items-center justify-end gap-1">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>{achievementSummary.badgeCount}</span>
            </span>
          </div>
        </div>

        {/* Best Effort / PR Callout Banner (like Strava's "Your fastest mile ever!" / "Nhận kudos...") */}
        {achievementSummary.fastestSplit && (
          <div
            onClick={onClick}
            className="mt-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 cursor-pointer hover:border-[#FC4C02]/40 transition"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 font-black text-[10px]">
                PR
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {getSpeedSplitLabel(activity.sportType)} tốt nhất: Mốc #{achievementSummary.fastestSplit.index} ({' '}
                <span className="font-mono text-[#FC4C02]">
                  {achievementSummary.fastestSplit.paceFormatted}
                </span>
                )
                {activity.avgHr > 0 && (
                  <span className="text-slate-400 font-normal ml-2 hidden sm:inline">
                    • ❤️ TB {Math.round(activity.avgHr)} bpm
                  </span>
                )}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#FC4C02] text-white text-[11px] font-bold shrink-0">
              Xem Splits
            </span>
          </div>
        )}
      </div>

      {/* =====================================================================
          4. STRAVA-STYLE FULL-WIDTH GPS ROUTE MAP PREVIEW
         ===================================================================== */}
      <div
        onClick={onClick}
        className="mx-4 sm:mx-6 mb-3 h-48 sm:h-60 rounded-xl bg-[#EEF2F6] dark:bg-[#131B2E] border border-slate-200/80 dark:border-slate-800 relative overflow-hidden cursor-pointer group"
      >
        {/* Subtle Street & Park Map Background Layer */}
        <svg
          viewBox="0 0 640 260"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none opacity-75 dark:opacity-30"
        >
          {/* Park green zones */}
          <rect x="460" y="10" width="160" height="95" rx="12" fill="#CBE6A3" />
          <rect x="20" y="160" width="140" height="85" rx="14" fill="#CBE6A3" />
          <rect x="490" y="140" width="90" height="110" rx="8" fill="#CBE6A3" />
          {/* Water stream */}
          <path
            d="M 0 210 Q 90 160 150 0"
            fill="none"
            stroke="#90CCF4"
            strokeWidth="10"
          />
          {/* Street grid lines */}
          <line x1="0" y1="65" x2="640" y2="95" stroke="#FFFFFF" strokeWidth="6" />
          <line x1="0" y1="155" x2="640" y2="135" stroke="#FFFFFF" strokeWidth="5" />
          <line x1="180" y1="0" x2="140" y2="260" stroke="#FFFFFF" strokeWidth="6" />
          <line x1="455" y1="0" x2="425" y2="260" stroke="#FFFFFF" strokeWidth="10" />
          <line x1="310" y1="0" x2="290" y2="260" stroke="#FFFFFF" strokeWidth="4" />
        </svg>

        {/* Top-left Map Pill (like Strava's "Start and end hidden" / GPS badge) */}
        <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs shadow-xs text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>GPS Tracklog • +{activity.elevationGain || 0}m độ cao</span>
        </div>

        {/* Route Polyline SVG */}
        {routeSvg.pathData ? (
          <svg viewBox="0 0 640 260" className="relative z-10 w-full h-full p-3 sm:p-4">
            {/* Outer subtle shadow stroke */}
            <path
              d={routeSvg.pathData}
              fill="none"
              stroke="rgba(252, 76, 2, 0.22)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Main Strava Orange Polyline */}
            <path
              d={routeSvg.pathData}
              fill="none"
              stroke="#FC4C02"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="group-hover:stroke-[5] transition-all"
            />
            {/* Start & Finish Dots */}
            {routeEndpoints && (
              <>
                <circle
                  cx={routeEndpoints.startX}
                  cy={routeEndpoints.startY}
                  r="5.5"
                  fill="#22C55E"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <circle
                  cx={routeEndpoints.endX}
                  cy={routeEndpoints.endY}
                  r="6"
                  fill="#0F172A"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              </>
            )}
          </svg>
        ) : (
          <div className="relative z-10 w-full h-full flex items-center justify-center text-slate-400 text-xs">
            <Activity className="w-6 h-6 mr-2 text-[#FC4C02]" />
            <span>Nhấn để xem chi tiết biểu đồ Splits</span>
          </div>
        )}

        {/* Bottom-right hover hint */}
        <div className="absolute bottom-2.5 right-3 z-10 px-2.5 py-1 rounded-lg bg-slate-900/75 text-white text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
          <span>Phóng to Bản đồ &amp; Splits từng km</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* =====================================================================
          5. STRAVA SOCIAL FOOTER: KUDOS AVATARS + LIKE 👍 & COMMENT 💬 BUTTONS
         ===================================================================== */}
      <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
        {/* Left: Kudos Avatars + Counts */}
        <div className="flex items-center gap-2.5 min-w-0">
          {kudoUsers.length > 0 && (
            <div className="flex -space-x-2 overflow-hidden shrink-0">
              {kudoUsers.slice(0, 3).map((ku) => (
                <div
                  key={ku.userId}
                  title={ku.userName}
                  className="inline-block rounded-full ring-2 ring-white dark:ring-[#0F1420]"
                >
                  <AthleteAvatar
                    user={{ id: ku.userId, fullName: ku.userName, avatarUrl: ku.userAvatar }}
                    size="xs"
                    showBadge={false}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleKudoClick}
              className="hover:text-[#FC4C02] transition cursor-pointer font-semibold"
            >
              {kudosCount} kudos
            </button>
            {comments.length > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowComments((prev) => !prev);
                  }}
                  className="hover:text-[#FC4C02] transition cursor-pointer font-semibold"
                >
                  {comments.length} bình luận
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Strava-Style Kudos 👍 & Comment 💬 Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleKudoClick}
            title={liked ? 'Bỏ Kudos' : 'Thả Kudos động viên'}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              liked
                ? 'bg-[#FC4C02]/15 border-[#FC4C02]/40 text-[#FC4C02]'
                : 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-[#FC4C02] text-[#FC4C02]' : ''}`} />
            <span className="hidden xs:inline">{liked ? 'Đã Kudos' : 'Kudos'}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowComments((prev) => !prev);
            }}
            title="Viết bình luận"
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              showComments
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white'
                : 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden xs:inline">Bình luận</span>
            {comments.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
                {comments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* =====================================================================
          6. EXPANDABLE COMMENTS DRAWER & INPUT BOX
         ===================================================================== */}
      {showComments && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="px-4 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 space-y-3 animate-in fade-in duration-150"
        >
          {/* Existing Comments List */}
          {comments.length > 0 ? (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {comments.map((cmt) => {
                const canDelete =
                  isAdmin ||
                  (currentUserId &&
                    (cmt.userId === currentUserId || activity.userId === currentUserId));
                return (
                  <div
                    key={cmt.id}
                    className="flex items-start justify-between gap-2.5 p-2.5 rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200/60 dark:border-slate-800/80 text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="shrink-0 mt-0.5">
                        <AthleteAvatar
                          user={{
                            id: cmt.userId,
                            fullName: cmt.userName,
                            avatarUrl: cmt.userAvatar,
                          }}
                          size="xs"
                          showBadge={false}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {cmt.userName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {cmt.createdAtIso
                              ? new Date(cmt.createdAtIso).toLocaleString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                })
                              : 'Vừa xong'}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5 break-words">
                          {cmt.content}
                        </p>
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCommentClick(e, cmt.id)}
                        title="Xoá bình luận"
                        className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Chưa có bình luận nào. Hãy để lại lời động viên đầu tiên cho {activity.userName}!
            </p>
          )}

          {/* Add Comment Input Form */}
          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder={`Viết bình luận cho buổi chạy của ${activity.userName}...`}
              className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#FC4C02]"
            />
            <button
              type="submit"
              disabled={!commentInput.trim() || isSubmittingComment}
              className="px-3.5 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi</span>
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
