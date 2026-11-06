import { z } from 'zod';

// ============================================================================
// 1. ENUMS & CONSTANTS
// ============================================================================

export enum UserRole {
  RUNNER = 'RUNNER',
  ORGANIZER = 'ORGANIZER',
  ADMIN = 'ADMIN',
}

export enum HonorBadge {
  ANGEL_INVESTOR = 'ANGEL_INVESTOR', // 🦈 Nhà đầu tư thiên thần (Shark VIP Backer)
  FOUNDER = 'FOUNDER',               // 🚀 Nhà sáng lập & Cố vấn
  VIP_PATRON = 'VIP_PATRON',         // ⭐ Nhà tài trợ VIP
  ELITE_ATHLETE = 'ELITE_ATHLETE',   // ⚡ Vận động viên đỉnh cao (Sub-20 5K, Sub-4 42K)
}

export enum ActivitySource {
  STRAVA = 'STRAVA',
  GPX_UPLOAD = 'GPX_UPLOAD',
  MANUAL_ADMIN = 'MANUAL_ADMIN',
}

export enum SportType {
  RUN = 'Run',
  TRAIL_RUN = 'TrailRun',
  VIRTUAL_RUN = 'VirtualRun',
  WALK = 'Walk',
  HIKE = 'Hike',
  RIDE = 'Ride',
  SWIM = 'Swim',
  OTHER = 'Other',
}

export type SportCategory = 'Run' | 'Ride' | 'Swim' | 'Other';

/**
 * Chuẩn hóa loại hình thể thao thành 4 nhóm chính: Chạy (Run), Đạp (Ride), Bơi (Swim), Khác (Other)
 */
export function normalizeSportCategory(sportType?: string | null): SportCategory {
  if (!sportType) return 'Run';
  const s = String(sportType).trim().toLowerCase();

  // 1. Chạy bộ & Đi bộ
  if (
    s === 'run' ||
    s === 'trailrun' ||
    s === 'virtualrun' ||
    s === 'walk' ||
    s === 'hike' ||
    s === 'treadmill' ||
    s.includes('running')
  ) {
    return 'Run';
  }

  // 2. Đạp xe
  if (
    s === 'ride' ||
    s === 'cycling' ||
    s === 'virtualride' ||
    s === 'mountainbikeride' ||
    s === 'gravelride' ||
    s === 'ebikeride' ||
    s === 'handcycle' ||
    s.includes('bike') ||
    s.includes('cycle')
  ) {
    return 'Ride';
  }

  // 3. Bơi lội
  if (s === 'swim' || s === 'openwaterswim' || s === 'poolswim' || s.includes('swimming')) {
    return 'Swim';
  }

  // 4. Các môn khác (Pickleball, Tennis, Badminton, Gym, Yoga, Golf...)
  return 'Other';
}

export enum AntiCheatStatus {
  VALID = 'VALID',
  PARTIAL_VALID = 'PARTIAL_VALID', // Có một số km (splits) bị cắt do quá tốc độ nhưng các km khác vẫn hợp lệ
  FLAGGED = 'FLAGGED',             // Nghi vấn gian lận cao, chờ Admin duyệt
  REJECTED = 'REJECTED',           // Bị hủy toàn bộ (Manual entry, sai môn, hoặc Admin từ chối)
}

export enum SplitInvalidReason {
  PACE_TOO_FAST = 'PACE_TOO_FAST',       // Nghi vấn đi xe máy / phương tiện cơ giới
  PACE_TOO_SLOW = 'PACE_TOO_SLOW',       // Đi bộ quá chậm vượt ngưỡng quy định
  HEART_RATE_MISSING = 'HEART_RATE_MISSING',
  CADENCE_TOO_LOW = 'CADENCE_TOO_LOW',
  GPS_SPIKE = 'GPS_SPIKE',
}

export enum EventType {
  VIRTUAL_RACE = 'VIRTUAL_RACE',     // Giải chạy chính thức (Admin/Organizer tạo, có BIB, E-Cert, Race-kit Medal/Áo)
  MINI_CHALLENGE = 'MINI_CHALLENGE', // Thử thách cộng đồng/nhóm (User tạo miễn phí, nhận Badge)
}

export enum RunMode {
  ACCUMULATIVE = 'ACCUMULATIVE', // Cộng dồn nhiều buổi chạy trong thời gian diễn ra giải
  SINGLE_RUN = 'SINGLE_RUN',     // Hoàn thành cự ly Target chỉ trong 1 buổi chạy duy nhất
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ChallengeConditionType {
  DISTANCE_OVERACHIEVE = 'DISTANCE_OVERACHIEVE', // Vượt mốc km mở rộng (VD: Target 50km, nhưng đạt Challenge Bạc 100km, Vàng 150km)
  STREAK_DAYS = 'STREAK_DAYS',                   // Chạy liên tục N ngày (mỗi ngày tối thiểu X km)
  SINGLE_LONG_RUN = 'SINGLE_LONG_RUN',           // Có ít nhất 1 buổi chạy dài >= X km
  ELEVATION_GAIN = 'ELEVATION_GAIN',             // Tích lũy độ cao leo núi (gain >= X mét)
  TOP_RANK = 'TOP_RANK',                         // Đạt Top N Bảng xếp hạng chung cuộc
  SPEED_TARGET_TIME = 'SPEED_TARGET_TIME',       // Giải tốc độ: đạt được khớp số KM với thời gian quy định (VD: 5KM <= 25 phút)
}

export enum FulfillmentStatus {
  PENDING_TARGET = 'PENDING_TARGET',           // Đang chạy, chưa hoàn thành mốc Target
  QUALIFIED_FINISHER = 'QUALIFIED_FINISHER',   // Đã đạt Target, đủ điều kiện nhận Huy chương / Race-kit
  PACKING = 'PACKING',                         // Ban tổ chức đang đóng gói & khắc tên huy chương
  SHIPPED = 'SHIPPED',                         // Đã bàn giao đơn vị vận chuyển (GHTK/GHN/ViettelPost)
  DELIVERED = 'DELIVERED',                     // VĐV đã nhận hàng thành công
}

export enum EBibTheme {
  MODERN_TITANIUM = 'MODERN_TITANIUM',
  NEON_CYBER = 'NEON_CYBER',
  SUNSET_CRIMSON = 'SUNSET_CRIMSON',
  MINIMAL_CLEAN = 'MINIMAL_CLEAN',
}

export interface EBibConfig {
  theme?: EBibTheme | string;
  primaryColor?: string;
  accentColor?: string;
  slogan?: string;
  backgroundImageUrl?: string;
}

// ============================================================================
// 2. ZOD SCHEMAS & INTERFACES CHO RULE ENGINE
// ============================================================================

export const EventRuleConfigSchema = z.object({
  allowedSportTypes: z.array(z.nativeEnum(SportType)).default([
    SportType.RUN,
    SportType.TRAIL_RUN,
    SportType.VIRTUAL_RUN,
  ]),
  minPaceSecPerKm: z.number().min(120).default(180), // Mặc định 03:00 /km (180s) -> Nhanh hơn bị coi là xe máy
  maxPaceSecPerKm: z.number().max(2400).default(900), // Mặc định 15:00 /km (900s) -> Chậm hơn không tính
  minActivityDistanceKm: z.number().min(0).default(1.0), // Quãng đường tối thiểu mỗi buổi chạy (VD: >= 1km)
  minStepCadenceSpm: z.number().optional().nullable(),   // Ngưỡng guồng chân tối thiểu (VD: 110 spm)
  requireHeartRate: z.boolean().default(false),          // Bắt buộc có nhịp tim từ đồng hồ
  allowSplitFiltering: z.boolean().default(true),        // True: Cắt bỏ km vi phạm, giữ lại km hợp lệ. False: Hủy cả bài chạy.
  weekendMultiplier: z.number().min(1).max(5).default(1.0), // Hệ số nhân ngày Thứ 7 & Chủ Nhật (VD: x2)
  enableCrossTrainingConversion: z.boolean().default(false), // Cho phép quy đổi Đạp xe / Bơi lội sang KM Target chạy bộ
  rideToRunRatio: z.number().min(0.01).max(10).default(0.25), // Tỷ lệ quy đổi Đạp xe -> Chạy (mặc định 4km đạp = 1km chạy: 0.25)
  swimToRunRatio: z.number().min(0.1).max(50).default(5.0),   // Tỷ lệ quy đổi Bơi lội -> Chạy (mặc định 1km bơi = 5km chạy: 5.0)
  specialMultiplierDates: z
    .array(
      z.object({
        date: z.string(), // YYYY-MM-DD
        multiplier: z.number().min(1).max(5),
        label: z.string(),
      })
    )
    .optional()
    .default([]),
});

export type EventRuleConfig = z.infer<typeof EventRuleConfigSchema>;

export interface RawActivitySplitInput {
  splitIndex: number;       // Km thứ 1, 2, 3...
  distanceMeters: number;   // Thường là 1000m (hoặc phần lẻ ở km cuối)
  movingTimeSec: number;    // Thời gian di chuyển của split này
  elapsedTimeSec?: number;
  elevationDiffMeters?: number;
  averageHeartrate?: number | null;
  averageCadenceSpm?: number | null; // Bước chân / phút (2 chân)
}

export interface RawActivityInput {
  externalId: string;
  name: string;
  sportType: SportType | string;
  startDateIso: string;
  distanceMeters: number;
  movingTimeSec: number;
  elapsedTimeSec: number;
  totalElevationGainMeters: number;
  averageHeartrate?: number | null;
  maxHeartrate?: number | null;
  averageCadenceSpm?: number | null;
  isManual: boolean;
  mapPolyline?: string | null;
  splits: RawActivitySplitInput[];
}

export interface EvaluatedSplitResult {
  splitIndex: number;
  distanceMeters: number;
  movingTimeSec: number;
  paceSecPerKm: number;
  formattedPace: string;
  elevationDiffMeters: number;
  averageHeartrate: number | null;
  isValid: boolean;
  invalidReason: SplitInvalidReason | null;
}

export interface ActivityEvaluationResult {
  antiCheatStatus: AntiCheatStatus;
  rejectionReason: string | null;
  rawDistanceKm: number;
  validDistanceKm: number;
  invalidDistanceKm: number;
  validMovingTimeSec: number;
  validAvgPaceSecPerKm: number;
  appliedMultiplier: number;
  multiplierReason: string | null;
  finalCountedDistanceKm: number; // Quãng đường cuối cùng sau khi lọc Split & nhân hệ số
  evaluatedSplits: EvaluatedSplitResult[];
  flagReasons: string[];
}

// ============================================================================
// 3. DUAL-GOAL (TARGET VS CHALLENGE TIERS) INTERFACES
// ============================================================================

export interface TargetCategoryInfo {
  id: string;
  name: string;               // VD: "Finisher 50KM", "Half Marathon 21.1KM"
  targetDistanceKm: number;   // 50, 21.1, 100...
  bibPrefix: string;          // "TOP50-"
}

export interface ChallengeTierInfo {
  id: string;
  tierName: string;           // VD: "Chiến Binh Bạc (100KM)", "Thợ Săn Bình Minh (Streak 7 Ngày)", "Tia Chớp 5K"
  tierLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'SPECIAL';
  conditionType: ChallengeConditionType;
  sportCategory?: SportCategory; // Bộ môn áp dụng cho thử thách (Mặc định: 'Run', không tính quy đổi chéo)
  thresholdValue: number;     // VD: 100 (km), 7 (ngày liên tiếp), 25 (phút)
  targetSpeedDistanceKm?: number; // Dùng cho SPEED_TARGET_TIME (VD: 5km, 10km, 21km)
  minDailyDistanceKm?: number;// Dùng cho STREAK_DAYS (VD: mỗi ngày >= 2km)
  awardBadgeUrl: string;
  rewardDescription: string;
}

export interface ConvertedSportBreakdown {
  runKm: number;
  rideRawKm: number;
  rideConvertedKm: number;
  swimRawKm: number;
  swimConvertedKm: number;
}

export interface DualGoalProgressSummary {
  sportBreakdown?: ConvertedSportBreakdown;
  // 1. Tầng TARGET (Mục tiêu cơ bản nhận Finisher Medal & E-Cert)
  target: {
    categoryName: string;
    targetDistanceKm: number;
    currentRawDistanceKm: number;
    currentMultipliedDistanceKm: number;
    progressPercentage: number; // 0 -> 100%
    remainingDistanceKm: number;
    isCompleted: boolean;
    completedAtIso: string | null;
    eCertUnlocked: boolean;
    raceKitQualified: boolean;
  };
  // 2. Tầng CHALLENGE (Các mốc Award mở rộng vượt ngưỡng / Streak / Long Run)
  challenges: Array<{
    tierId: string;
    tierName: string;
    tierLevel: string;
    conditionType: ChallengeConditionType;
    sportCategory?: SportCategory;
    thresholdValue: number;
    targetSpeedDistanceKm?: number;
    currentValue: number;
    progressPercentage: number;
    isUnlocked: boolean;
    unlockedAtIso: string | null;
    awardBadgeUrl: string;
    rewardDescription: string;
  }>;
}

