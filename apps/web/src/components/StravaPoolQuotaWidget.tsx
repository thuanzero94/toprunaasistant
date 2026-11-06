'use client';

import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Clock,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export interface PoolQuotaData {
  overallLimit15m: number;
  overallLimitDaily: number;
  overallUsage15m: number;
  overallUsageDaily: number;
  readLimit15m: number;
  readLimitDaily: number;
  readUsage15m: number;
  readUsageDaily: number;
  overall15mPct: number;
  overallDailyPct: number;
  read15mPct: number;
  readDailyPct: number;
  peakPct: number;
  health: 'HEALTHY' | 'ELEVATED' | 'THROTTLED_85' | 'PAUSED_95';
  secondsUntilNext15mReset: number;
  safetyThresholdRead15m: number;
  safetyThresholdOverall15m: number;
}

export interface PoolQueueStatsData {
  queuedCount: number;
  delayedCount: number;
  processingCount: number;
}

function getBarColor(pct: number) {
  if (pct >= 85) return 'bg-rose-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getTextColor(pct: number) {
  if (pct >= 85) return 'text-rose-500 dark:text-rose-400';
  if (pct >= 70) return 'text-amber-500 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

export function StravaPoolQuotaCard({
  appId,
  appName,
  connectedCount,
  rateLimit,
  queueStats,
  otherApps,
  onRefresh,
  onNotify,
}: {
  appId: string;
  appName: string;
  connectedCount: number;
  rateLimit?: PoolQuotaData | null;
  queueStats?: PoolQueueStatsData | null;
  otherApps: Array<{ id: string; name: string; isActive: boolean; connectedCount: number; maxAthletes: number }>;
  onRefresh: () => void;
  onNotify: (msg: { type: 'success' | 'error'; text: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showEvacuate, setShowEvacuate] = useState(false);
  const [targetPoolId, setTargetPoolId] = useState<string>('');
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const rl: PoolQuotaData = rateLimit || {
    overallLimit15m: 400,
    overallLimitDaily: 4000,
    overallUsage15m: 0,
    overallUsageDaily: 0,
    readLimit15m: 200,
    readLimitDaily: 2000,
    readUsage15m: 0,
    readUsageDaily: 0,
    overall15mPct: 0,
    overallDailyPct: 0,
    read15mPct: 0,
    readDailyPct: 0,
    peakPct: 0,
    health: 'HEALTHY',
    secondsUntilNext15mReset: 900,
    safetyThresholdRead15m: 170,
    safetyThresholdOverall15m: 340,
  };

  const resetMins = Math.ceil((rl.secondsUntilNext15mReset || 60) / 60);
  const pendingJobs = (queueStats?.queuedCount || 0) + (queueStats?.delayedCount || 0);

  const handleReset15m = async () => {
    try {
      setBusy(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_token') : null;
      const res = await fetch(`${apiBase}/admin/strava-apps/${appId}/rate-limits`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ resetCurrent15mUsage: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onNotify({ type: 'success', text: data.message || `Đã đặt lại bộ đếm 15 phút của ${appName}.` });
        onRefresh();
      } else {
        onNotify({ type: 'error', text: data.message || 'Không thể đặt lại bộ đếm.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleEvacuatePool = async () => {
    try {
      setBusy(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_token') : null;
      const res = await fetch(`${apiBase}/admin/strava-apps/${appId}/evacuate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ targetAppId: targetPoolId || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onNotify({ type: 'success', text: data.message || `Đã di tản toàn bộ VĐV khỏi ${appName}.` });
        setShowEvacuate(false);
        onRefresh();
      } else {
        onNotify({ type: 'error', text: data.message || 'Không thể di tản Pool.' });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3.5 p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-3">
      {/* Header: Health Status & Reset Timer */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
          <Activity className="w-3.5 h-3.5 text-[#FC4C02]" />
          <span>Kiểm soát Rate Limit Độc Lập (Tách biệt Pool)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <Clock className="w-3 h-3 text-sky-500" />
            <span>Reset 15p sau ~{resetMins}p</span>
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={handleReset15m}
            title="Reset bộ đếm 15 phút của riêng Pool này"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#FC4C02] hover:text-[#FC4C02] cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset 15p</span>
          </button>
        </div>
      </div>

      {/* 1. GIỚI HẠN ĐỌC (READ LIMIT: 200 / 15m, 2000 / Day) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            1. Giới hạn Đọc (Read):{' '}
            <span className="text-[10px] font-normal text-slate-400">(Ngưỡng an toàn 85%: {rl.safetyThresholdRead15m}/15p)</span>
          </span>
          <span className={`font-mono font-bold ${getTextColor(Math.max(rl.read15mPct, rl.readDailyPct))}`}>
            15p: {rl.readUsage15m}/{rl.readLimit15m} ({rl.read15mPct}%) • Ngày: {rl.readUsageDaily}/{rl.readLimitDaily}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getBarColor(rl.read15mPct)}`}
                style={{ width: `${Math.min(100, rl.read15mPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 font-mono">
              <span>15 phút (Max {rl.readLimit15m})</span>
              <span>Còn {Math.max(0, rl.readLimit15m - rl.readUsage15m)}</span>
            </div>
          </div>
          <div>
            <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getBarColor(rl.readDailyPct)}`}
                style={{ width: `${Math.min(100, rl.readDailyPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 font-mono">
              <span>Mỗi ngày (Max {rl.readLimitDaily})</span>
              <span>Còn {Math.max(0, rl.readLimitDaily - rl.readUsageDaily)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GIỚI HẠN TỔNG THỂ (OVERALL LIMIT: 400 / 15m, 4000 / Day) */}
      <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            2. Giới hạn Tổng thể (Overall):{' '}
            <span className="text-[10px] font-normal text-slate-400">(Gồm cả OAuth + Read)</span>
          </span>
          <span className={`font-mono font-bold ${getTextColor(Math.max(rl.overall15mPct, rl.overallDailyPct))}`}>
            15p: {rl.overallUsage15m}/{rl.overallLimit15m} ({rl.overall15mPct}%) • Ngày: {rl.overallUsageDaily}/{rl.overallLimitDaily}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getBarColor(rl.overall15mPct)}`}
                style={{ width: `${Math.min(100, rl.overall15mPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 font-mono">
              <span>15 phút (Max {rl.overallLimit15m})</span>
              <span>Còn {Math.max(0, rl.overallLimit15m - rl.overallUsage15m)}</span>
            </div>
          </div>
          <div>
            <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getBarColor(rl.overallDailyPct)}`}
                style={{ width: `${Math.min(100, rl.overallDailyPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 font-mono">
              <span>Mỗi ngày (Max {rl.overallLimitDaily})</span>
              <span>Còn {Math.max(0, rl.overallLimitDaily - rl.overallUsageDaily)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Status & Evacuate Pool Action */}
      <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-[11px]">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] ${
              rl.health === 'PAUSED_95'
                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
                : rl.health === 'THROTTLED_85'
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>
              {rl.health === 'PAUSED_95'
                ? 'Đang chờ mở khóa 15p (>95%)'
                : rl.health === 'THROTTLED_85'
                  ? 'Bảo vệ Webhook (>85%)'
                  : 'Quota An Toàn (<85%)'}
            </span>
          </span>
          {pendingJobs > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-mono text-[10px] font-bold">
              Hàng đợi Pool: {pendingJobs} job
            </span>
          )}
        </div>

        {connectedCount > 0 && otherApps.length > 0 && (
          <button
            type="button"
            onClick={() => setShowEvacuate((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
          >
            <ArrowRightLeft className="w-3 h-3" />
            <span>Di tản VĐV sang Pool khác</span>
          </button>
        )}
      </div>

      {showEvacuate && (
        <div className="p-2.5 rounded-lg bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 space-y-2 text-[11px]">
          <div className="font-semibold text-amber-800 dark:text-amber-300">
            Chuyển toàn bộ {connectedCount} VĐV khỏi Pool này (khi Pool hết hạn / ngừng dùng):
          </div>
          <div className="flex items-center gap-2">
            <select
              value={targetPoolId}
              onChange={(e) => setTargetPoolId(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="">-- Tự động điền đầy lần lượt (Fill-First) các Pool còn lại --</option>
              {otherApps.map((oa) => (
                <option key={oa.id} value={oa.id}>
                  {oa.name} ({oa.connectedCount}/{oa.maxAthletes} VĐV)
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={handleEvacuatePool}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Đang chuyển...' : 'Xác nhận di tản'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StravaAthletePoolMoveSelect({
  userId,
  currentAppId,
  allApps,
  onMoved,
  onNotify,
}: {
  userId: string;
  currentAppId: string;
  allApps: Array<{ id: string; name: string; connectedCount: number; maxAthletes: number }>;
  onMoved: () => void;
  onNotify: (msg: { type: 'success' | 'error'; text: string }) => void;
}) {
  const [targetId, setTargetId] = useState('');
  const [moving, setMoving] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const candidates = allApps.filter((a) => a.id !== currentAppId);
  if (candidates.length === 0) return null;

  const handleMove = async () => {
    if (!targetId) return;
    try {
      setMoving(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_token') : null;
      const res = await fetch(`${apiBase}/admin/strava-apps/move-athlete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, targetAppId: targetId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onNotify({ type: 'success', text: data.message || 'Đã chuyển VĐV sang Pool mới.' });
        setTargetId('');
        onMoved();
      } else {
        onNotify({ type: 'error', text: data.message || 'Không thể chuyển Pool cho VĐV.' });
      }
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 mt-1.5 justify-end">
      <select
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-200"
      >
        <option value="">Đổi sang Pool khác...</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.connectedCount}/{c.maxAthletes})
          </option>
        ))}
      </select>
      {targetId && (
        <button
          type="button"
          disabled={moving}
          onClick={handleMove}
          className="px-2 py-1 rounded-lg bg-[#FC4C02] hover:bg-[#E34402] text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
        >
          {moving ? '...' : 'Chuyển'}
        </button>
      )}
    </div>
  );
}

export function AthleteStravaPoolStatusBanner({
  stravaStatus,
}: {
  stravaStatus?: {
    isConnected?: boolean;
    syncStatus?: string;
    poolName?: string;
    poolClientId?: string;
    poolQuota?: PoolQuotaData | null;
    cooldown?: { allowed: boolean; remainingSec: number; message?: string } | null;
    authorizeUrl?: string;
    lastErrorMsg?: string | null;
  } | null;
}) {
  if (!stravaStatus || !stravaStatus.isConnected) return null;

  const isReauthRequired = stravaStatus.syncStatus === 'REAUTH_REQUIRED';
  const pq = stravaStatus.poolQuota;
  const cd = stravaStatus.cooldown;

  return (
    <div className="space-y-2.5 my-3">
      {isReauthRequired && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Cần xác nhận lại kết nối Strava trên Pool mới (1-Click)</div>
              <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                {stravaStatus.lastErrorMsg ||
                  `Tài khoản của bạn đã được chuyển sang ${stravaStatus.poolName || 'Pool mới'}. Nhấn nút bên cạnh để cấp quyền OAuth cho Pool mới (toàn bộ bài chạy cũ được giữ nguyên).`}
              </div>
            </div>
          </div>
          {stravaStatus.authorizeUrl && (
            <a
              href={stravaStatus.authorizeUrl}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold shadow-xs transition"
            >
              <span>Xác nhận lại kết nối (1-Click)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {pq && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#FC4C02]" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Pool cố định: {stravaStatus.poolName || 'Strava Pool #1'}
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              (Client #{stravaStatus.poolClientId})
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-slate-600 dark:text-slate-300">
            <span>
              Đọc 15p: <strong>{pq.readUsage15m}/{pq.readLimit15m}</strong>
            </span>
            <span>
              Đọc ngày: <strong>{pq.readUsageDaily}/{pq.readLimitDaily}</strong>
            </span>
            <span>
              Tổng 15p: <strong>{pq.overallUsage15m}/{pq.overallLimit15m}</strong>
            </span>
            {cd && !cd.allowed && (
              <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold">
                Cooldown: {Math.ceil(cd.remainingSec / 60)}p
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
