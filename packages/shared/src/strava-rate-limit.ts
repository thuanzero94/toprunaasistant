/**
 * @toprun/shared — Strava Per-Pool Rate Limit Domain Logic
 *
 * Kiểm soát độc lập 2 cặp thông số giới hạn của Strava API cho từng Pool (StravaApp):
 * 1. Giới hạn Tổng thể (Overall): 400 mỗi 15 phút, 4000 mỗi ngày
 * 2. Giới hạn Đọc (Read):        200 mỗi 15 phút, 2000 mỗi ngày
 *
 * Nguyên tắc:
 * - Tách biệt hoàn toàn giữa các Pool (User ở Pool nào chỉ tiêu thụ và kiểm tra quota ở Pool đó).
 * - Ngưỡng an toàn 85%: Khi chạm 85% (170/200 Read hoặc 340/400 Overall), tạm hoãn NORMAL/LOW
 *   sang cửa sổ 15 phút kế tiếp để bảo vệ 15% ngân sách cho HIGH (Real-time Webhook).
 * - Ngưỡng критический 95%: Tạm hoãn toàn bộ hàng đợi của Pool đến mốc 15 phút kế tiếp (:00, :15, :30, :45 UTC).
 */

export const STRAVA_DEFAULT_OVERALL_LIMIT_15M = 400;
export const STRAVA_DEFAULT_OVERALL_LIMIT_DAILY = 4000;
export const STRAVA_DEFAULT_READ_LIMIT_15M = 200;
export const STRAVA_DEFAULT_READ_LIMIT_DAILY = 2000;

export const STRAVA_WARNING_RATIO = 0.7;
export const STRAVA_SAFETY_THRESHOLD_RATIO = 0.85;
export const STRAVA_CRITICAL_THRESHOLD_RATIO = 0.95;

export const STRAVA_MANUAL_SYNC_COOLDOWN_SEC = 15 * 60; // 15 phút / VĐV

export type StravaJobPriority = 1 | 2 | 3; // 1 = HIGH (Webhook), 2 = NORMAL (Manual Sync), 3 = LOW (Backfill)

export type StravaPoolQuotaHealth = 'HEALTHY' | 'ELEVATED' | 'THROTTLED_85' | 'PAUSED_95';

export interface StravaPoolRateSnapshot {
  overallLimit15m: number;
  overallLimitDaily: number;
  overallUsage15m: number;
  overallUsageDaily: number;
  readLimit15m: number;
  readLimitDaily: number;
  readUsage15m: number;
  readUsageDaily: number;
  window15mKey?: string | null;
  windowDailyKey?: string | null;
}

export interface StravaWindowTiming {
  window15mKey: string;
  windowDailyKey: string;
  next15mResetAtIso: string;
  secondsUntilNext15mReset: number;
  nextDailyResetAtIso: string;
  secondsUntilDailyReset: number;
}

export interface EvaluatedPoolQuota
  extends Omit<StravaPoolRateSnapshot, 'window15mKey' | 'windowDailyKey'>,
    StravaWindowTiming {
  overall15mPct: number;
  overallDailyPct: number;
  read15mPct: number;
  readDailyPct: number;
  peak15mPct: number;
  peakDailyPct: number;
  peakPct: number;
  health: StravaPoolQuotaHealth;
  canRunHighPriority: boolean;
  canRunNormalOrLowPriority: boolean;
  remainingRead15m: number;
  remainingReadDaily: number;
  remainingOverall15m: number;
  remainingOverallDaily: number;
  safetyThresholdRead15m: number;
  safetyThresholdOverall15m: number;
}

/**
 * Tính toán mốc cửa sổ 15 phút (:00, :15, :30, :45 UTC) và cửa sổ ngày (00:00 UTC) chuẩn của Strava
 */
export function getStravaWindowTiming(now: Date = new Date()): StravaWindowTiming {
  const utcYear = now.getUTCFullYear();
  const utcMonth = String(now.getUTCMonth() + 1).padStart(2, '0');
  const utcDate = String(now.getUTCDate()).padStart(2, '0');
  const utcHours = String(now.getUTCHours()).padStart(2, '0');
  const quarterMin = Math.floor(now.getUTCMinutes() / 15) * 15;
  const utcQuarter = String(quarterMin).padStart(2, '0');

  const windowDailyKey = `${utcYear}-${utcMonth}-${utcDate}`;
  const window15mKey = `${windowDailyKey}T${utcHours}:${utcQuarter}`;

  const intervalMs = 15 * 60 * 1000;
  const next15mMs = (Math.floor(now.getTime() / intervalMs) + 1) * intervalMs;
  const next15mDate = new Date(next15mMs);
  const secondsUntilNext15mReset = Math.max(1, Math.ceil((next15mMs - now.getTime()) / 1000));

  const nextDailyDate = new Date(Date.UTC(utcYear, now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const secondsUntilDailyReset = Math.max(1, Math.ceil((nextDailyDate.getTime() - now.getTime()) / 1000));

  return {
    window15mKey,
    windowDailyKey,
    next15mResetAtIso: next15mDate.toISOString(),
    secondsUntilNext15mReset,
    nextDailyResetAtIso: nextDailyDate.toISOString(),
    secondsUntilDailyReset,
  };
}

/**
 * Đánh giá trạng thái Quota của 1 Pool độc lập (tự động reset bộ đếm nếu đã bước sang khung 15 phút hoặc ngày mới)
 */
export function evaluateStravaPoolQuota(
  snapshot: Partial<StravaPoolRateSnapshot>,
  now: Date = new Date()
): EvaluatedPoolQuota {
  const timing = getStravaWindowTiming(now);

  const overallLimit15m = Math.max(1, snapshot.overallLimit15m || STRAVA_DEFAULT_OVERALL_LIMIT_15M);
  const overallLimitDaily = Math.max(1, snapshot.overallLimitDaily || STRAVA_DEFAULT_OVERALL_LIMIT_DAILY);
  const readLimit15m = Math.max(1, snapshot.readLimit15m || STRAVA_DEFAULT_READ_LIMIT_15M);
  const readLimitDaily = Math.max(1, snapshot.readLimitDaily || STRAVA_DEFAULT_READ_LIMIT_DAILY);

  const isSame15m = snapshot.window15mKey === timing.window15mKey;
  const isSameDay = snapshot.windowDailyKey === timing.windowDailyKey;

  const overallUsage15m = isSame15m ? Math.max(0, snapshot.overallUsage15m || 0) : 0;
  const readUsage15m = isSame15m ? Math.max(0, snapshot.readUsage15m || 0) : 0;
  const overallUsageDaily = isSameDay ? Math.max(0, snapshot.overallUsageDaily || 0) : 0;
  const readUsageDaily = isSameDay ? Math.max(0, snapshot.readUsageDaily || 0) : 0;

  const overall15mRatio = overallUsage15m / overallLimit15m;
  const overallDailyRatio = overallUsageDaily / overallLimitDaily;
  const read15mRatio = readUsage15m / readLimit15m;
  const readDailyRatio = readUsageDaily / readLimitDaily;

  const overall15mPct = Math.min(100, Math.round(overall15mRatio * 1000) / 10);
  const overallDailyPct = Math.min(100, Math.round(overallDailyRatio * 1000) / 10);
  const read15mPct = Math.min(100, Math.round(read15mRatio * 1000) / 10);
  const readDailyPct = Math.min(100, Math.round(readDailyRatio * 1000) / 10);

  const maxRatio = Math.max(overall15mRatio, overallDailyRatio, read15mRatio, readDailyRatio);
  const peak15mPct = Math.max(overall15mPct, read15mPct);
  const peakDailyPct = Math.max(overallDailyPct, readDailyPct);
  const peakPct = Math.max(peak15mPct, peakDailyPct);

  let health: StravaPoolQuotaHealth = 'HEALTHY';
  if (maxRatio >= STRAVA_CRITICAL_THRESHOLD_RATIO) {
    health = 'PAUSED_95';
  } else if (maxRatio >= STRAVA_SAFETY_THRESHOLD_RATIO) {
    health = 'THROTTLED_85';
  } else if (maxRatio >= STRAVA_WARNING_RATIO) {
    health = 'ELEVATED';
  }

  const canRunHighPriority = maxRatio < STRAVA_CRITICAL_THRESHOLD_RATIO;
  const canRunNormalOrLowPriority = maxRatio < STRAVA_SAFETY_THRESHOLD_RATIO;

  return {
    overallLimit15m,
    overallLimitDaily,
    overallUsage15m,
    overallUsageDaily,
    readLimit15m,
    readLimitDaily,
    readUsage15m,
    readUsageDaily,
    ...timing,
    overall15mPct,
    overallDailyPct,
    read15mPct,
    readDailyPct,
    peak15mPct,
    peakDailyPct,
    peakPct,
    health,
    canRunHighPriority,
    canRunNormalOrLowPriority,
    remainingRead15m: Math.max(0, readLimit15m - readUsage15m),
    remainingReadDaily: Math.max(0, readLimitDaily - readUsageDaily),
    remainingOverall15m: Math.max(0, overallLimit15m - overallUsage15m),
    remainingOverallDaily: Math.max(0, overallLimitDaily - overallUsageDaily),
    safetyThresholdRead15m: Math.floor(readLimit15m * STRAVA_SAFETY_THRESHOLD_RATIO),
    safetyThresholdOverall15m: Math.floor(overallLimit15m * STRAVA_SAFETY_THRESHOLD_RATIO),
  };
}

/**
 * Parse Response Headers thực tế từ Strava (X-RateLimit-Limit, X-RateLimit-Usage, X-ReadRateLimit-Limit, X-ReadRateLimit-Usage)
 */
export function parseStravaRateLimitHeaders(headers: { get?: (name: string) => string | null } | Record<string, string | undefined>) {
  const getHeader = (key: string): string | null => {
    if (typeof (headers as any).get === 'function') {
      return (headers as any).get(key) || (headers as any).get(key.toLowerCase());
    }
    const rec = headers as Record<string, string | undefined>;
    return rec[key] || rec[key.toLowerCase()] || null;
  };

  const parsePair = (raw: string | null): [number, number] | null => {
    if (!raw) return null;
    const parts = raw.split(',').map((s) => parseInt(s.trim(), 10));
    if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      return [parts[0], parts[1]];
    }
    return null;
  };

  const overallLimit = parsePair(getHeader('x-ratelimit-limit'));
  const overallUsage = parsePair(getHeader('x-ratelimit-usage'));
  const readLimit = parsePair(getHeader('x-readratelimit-limit'));
  const readUsage = parsePair(getHeader('x-readratelimit-usage'));

  return {
    hasHeaders: Boolean(overallLimit || overallUsage || readLimit || readUsage),
    overallLimit15m: overallLimit ? overallLimit[0] : undefined,
    overallLimitDaily: overallLimit ? overallLimit[1] : undefined,
    overallUsage15m: overallUsage ? overallUsage[0] : undefined,
    overallUsageDaily: overallUsage ? overallUsage[1] : undefined,
    readLimit15m: readLimit ? readLimit[0] : undefined,
    readLimitDaily: readLimit ? readLimit[1] : undefined,
    readUsage15m: readUsage ? readUsage[0] : undefined,
    readUsageDaily: readUsage ? readUsage[1] : undefined,
  };
}
