import {
  ActivityEvaluationResult,
  AntiCheatStatus,
  ChallengeConditionType,
  ChallengeTierInfo,
  ConvertedSportBreakdown,
  DualGoalProgressSummary,
  EvaluatedSplitResult,
  EventRuleConfig,
  RawActivityInput,
  RunMode,
  SplitInvalidReason,
  TargetCategoryInfo,
  normalizeSportCategory,
  SportCategory,
} from './types';
import { calculatePaceSecPerKm, formatPace, roundKm } from './pace';
import { toVietnamDateString, isVietnamWeekend } from './date-utils';

/**
 * ============================================================================
 * BỘ MÁY CHẤM ĐIỂM & CHỐNG GIAN LẬN TỪNG KM (SPLIT-LEVEL ANTI-CHEAT ENGINE)
 * ============================================================================
 *
 * Đặc điểm nổi bật:
 * 1. Kiểm tra cấp độ Activity: Chặn nhập tay (manual entry), chặn sai loại hình thể thao,
 *    kiểm tra ngưỡng nhịp tim (Heart Rate) và guồng chân (Cadence) nếu giải yêu cầu.
 * 2. Kiểm tra cấp độ Từng Km (Split-level Filtering):
 *    - Nếu Runner chạy bộ 5km đầu hợp lệ nhưng quên tắt đồng hồ khi lên xe máy ở km thứ 6 (Pace < 3:00/km),
 *      hệ thống tự động LOẠI BỎ km thứ 6 (`PACE_TOO_FAST`), nhưng VẪN GIỮ LẠI 5km hợp lệ trước đó!
 *    - Nếu tỷ lệ km vi phạm quá cao (> 50% tổng quãng đường), gắn cờ `FLAGGED` để Admin kiểm duyệt.
 * 3. Nhân hệ số (Multiplier): Tự động nhân hệ số ngày cuối tuần (Thứ 7, Chủ Nhật) hoặc ngày lễ đặc biệt.
 */
export function evaluateActivitySplits(
  activity: RawActivityInput,
  rules: EventRuleConfig
): ActivityEvaluationResult {
  const rawDistanceKm = roundKm(activity.distanceMeters / 1000);
  const flagReasons: string[] = [];

  // 1. Kiểm tra hoạt động nhập tay (Manual Entry trên Strava không có GPS)
  if (activity.isManual) {
    return {
      antiCheatStatus: AntiCheatStatus.REJECTED,
      rejectionReason: 'Hoạt động nhập tay (Manual Entry) không có dữ liệu GPS không được chấp nhận.',
      rawDistanceKm,
      validDistanceKm: 0,
      invalidDistanceKm: rawDistanceKm,
      validMovingTimeSec: 0,
      validAvgPaceSecPerKm: 0,
      appliedMultiplier: 1,
      multiplierReason: null,
      finalCountedDistanceKm: 0,
      evaluatedSplits: [],
      flagReasons: ['MANUAL_ACTIVITY'],
    };
  }

  // 2. Phân loại và kiểm tra loại hình thể thao hợp lệ (Run, Ride, Swim, Other)
  const sportCat = normalizeSportCategory(activity.sportType);
  const isCrossTrainingAllowed = Boolean(rules.enableCrossTrainingConversion);

  // Môn khác (Pickleball, Tennis, Golf, Gym...) -> Không tính KM giải chạy
  if (sportCat === 'Other') {
    return {
      antiCheatStatus: AntiCheatStatus.REJECTED,
      rejectionReason: `Bộ môn "${activity.sportType}" không nằm trong danh mục tính giải chạy.`,
      rawDistanceKm,
      validDistanceKm: 0,
      invalidDistanceKm: rawDistanceKm,
      validMovingTimeSec: 0,
      validAvgPaceSecPerKm: 0,
      appliedMultiplier: 1,
      multiplierReason: null,
      finalCountedDistanceKm: 0,
      evaluatedSplits: [],
      flagReasons: ['OTHER_SPORT'],
    };
  }

  // Đạp xe hoặc Bơi lội: Nếu giải không cho phép quy đổi chéo bộ môn
  if ((sportCat === 'Ride' || sportCat === 'Swim') && !isCrossTrainingAllowed) {
    const allowedTypes = rules.allowedSportTypes.map((t) => t.toLowerCase());
    if (!allowedTypes.includes(String(activity.sportType).toLowerCase())) {
      return {
        antiCheatStatus: AntiCheatStatus.REJECTED,
        rejectionReason: `Giải đấu không bật tính năng quy đổi cho bộ môn "${activity.sportType}".`,
        rawDistanceKm,
        validDistanceKm: 0,
        invalidDistanceKm: rawDistanceKm,
        validMovingTimeSec: 0,
        validAvgPaceSecPerKm: 0,
        appliedMultiplier: 1,
        multiplierReason: null,
        finalCountedDistanceKm: 0,
        evaluatedSplits: [],
        flagReasons: ['SPORT_CONVERSION_DISABLED'],
      };
    }
  }

  // 3. Kiểm tra yêu cầu bắt buộc có Nhịp tim (Heart Rate) nếu giải đấu cấu hình
  if (rules.requireHeartRate && (!activity.averageHeartrate || activity.averageHeartrate < 60)) {
    return {
      antiCheatStatus: AntiCheatStatus.REJECTED,
      rejectionReason: 'Giải đấu yêu cầu bắt buộc phải có dữ liệu Nhịp tim (Heart Rate >= 60 bpm) từ thiết bị đeo.',
      rawDistanceKm,
      validDistanceKm: 0,
      invalidDistanceKm: rawDistanceKm,
      validMovingTimeSec: 0,
      validAvgPaceSecPerKm: 0,
      appliedMultiplier: 1,
      multiplierReason: null,
      finalCountedDistanceKm: 0,
      evaluatedSplits: [],
      flagReasons: ['MISSING_HEARTRATE'],
    };
  }

  // 4. Kiểm tra ngưỡng Cadence trung bình nếu giải đấu yêu cầu
  if (
    rules.minStepCadenceSpm &&
    activity.averageCadenceSpm &&
    activity.averageCadenceSpm < rules.minStepCadenceSpm
  ) {
    flagReasons.push(
      `Guồng chân trung bình (${activity.averageCadenceSpm} spm) thấp hơn ngưỡng quy định (${rules.minStepCadenceSpm} spm).`
    );
  }

  // 5. Nếu Activity không có mảng splits chi tiết, tự tạo 1 split tổng từ thông số chung
  const sourceSplits =
    activity.splits && activity.splits.length > 0
      ? activity.splits
      : [
          {
            splitIndex: 1,
            distanceMeters: activity.distanceMeters,
            movingTimeSec: activity.movingTimeSec,
            elevationDiffMeters: activity.totalElevationGainMeters,
            averageHeartrate: activity.averageHeartrate ?? null,
            averageCadenceSpm: activity.averageCadenceSpm ?? null,
          },
        ];

  // 6. Duyệt từng Split (từng km) để lọc Pace hợp lệ theo từng môn
  let effectiveMinPace = rules.minPaceSecPerKm;
  let effectiveMaxPace = rules.maxPaceSecPerKm;
  if (sportCat === 'Ride') {
    effectiveMinPace = 80;  // 45 km/h
    effectiveMaxPace = 360; // 10 km/h
  } else if (sportCat === 'Swim') {
    effectiveMinPace = 700;  // ~1:10 /100m
    effectiveMaxPace = 2400; // ~4:00 /100m
  }

  const evaluatedSplits: EvaluatedSplitResult[] = [];
  let validDistanceMeters = 0;
  let invalidDistanceMeters = 0;
  let validMovingTimeSec = 0;
  let fastSplitCount = 0;

  for (const split of sourceSplits) {
    const paceSecPerKm = calculatePaceSecPerKm(split.distanceMeters, split.movingTimeSec);
    let isValid = true;
    let invalidReason: SplitInvalidReason | null = null;

    // Chỉ kiểm tra chặt các split có độ dài >= 200m (tránh sai số GPS ở vài chục mét lẻ cuối cùng)
    if (split.distanceMeters >= 200) {
      if (paceSecPerKm < effectiveMinPace) {
        isValid = false;
        invalidReason = SplitInvalidReason.PACE_TOO_FAST;
        fastSplitCount++;
      } else if (paceSecPerKm > effectiveMaxPace) {
        isValid = false;
        invalidReason = SplitInvalidReason.PACE_TOO_SLOW;
      }
    }

    evaluatedSplits.push({
      splitIndex: split.splitIndex,
      distanceMeters: split.distanceMeters,
      movingTimeSec: split.movingTimeSec,
      paceSecPerKm,
      formattedPace: formatPace(paceSecPerKm),
      elevationDiffMeters: split.elevationDiffMeters ?? 0,
      averageHeartrate: split.averageHeartrate ?? null,
      isValid,
      invalidReason,
    });

    if (isValid) {
      validDistanceMeters += split.distanceMeters;
      validMovingTimeSec += split.movingTimeSec;
    } else {
      invalidDistanceMeters += split.distanceMeters;
    }
  }

  // 7. Nếu giải đấu KHÔNG cho phép lọc từng km (`allowSplitFiltering == false`) mà có km quá tốc độ -> Hủy cả buổi chạy
  if (!rules.allowSplitFiltering && fastSplitCount > 0) {
    return {
      antiCheatStatus: AntiCheatStatus.REJECTED,
      rejectionReason: `Phát hiện ${fastSplitCount} km vi phạm tốc độ tối đa cho phép (${formatPace(rules.minPaceSecPerKm)}).`,
      rawDistanceKm,
      validDistanceKm: 0,
      invalidDistanceKm: rawDistanceKm,
      validMovingTimeSec: 0,
      validAvgPaceSecPerKm: 0,
      appliedMultiplier: 1,
      multiplierReason: null,
      finalCountedDistanceKm: 0,
      evaluatedSplits,
      flagReasons: ['FAST_SPLIT_STRICT_REJECT'],
    };
  }

  const validDistanceKm = roundKm(validDistanceMeters / 1000);
  const invalidDistanceKm = roundKm(invalidDistanceMeters / 1000);

  // 8. Kiểm tra quãng đường hợp lệ tối thiểu sau khi đã cắt bỏ các km vi phạm
  if (validDistanceKm < rules.minActivityDistanceKm) {
    return {
      antiCheatStatus: AntiCheatStatus.REJECTED,
      rejectionReason: `Quãng đường hợp lệ (${validDistanceKm} km) nhỏ hơn mức tối thiểu mỗi buổi chạy (${rules.minActivityDistanceKm} km).`,
      rawDistanceKm,
      validDistanceKm: 0,
      invalidDistanceKm: rawDistanceKm,
      validMovingTimeSec: 0,
      validAvgPaceSecPerKm: 0,
      appliedMultiplier: 1,
      multiplierReason: null,
      finalCountedDistanceKm: 0,
      evaluatedSplits,
      flagReasons: ['BELOW_MIN_DISTANCE'],
    };
  }

  // 9. Xác định trạng thái Anti-Cheat (VALID, PARTIAL_VALID, hoặc FLAGGED)
  let antiCheatStatus = AntiCheatStatus.VALID;
  if (fastSplitCount > 0) {
    flagReasons.push(
      `Đã tự động cắt bỏ ${fastSplitCount} km có tốc độ nhanh bất thường (< ${formatPace(rules.minPaceSecPerKm)}).`
    );
    // Nếu hơn 40% số km bị quá tốc độ -> Đưa vào diện FLAGGED để Admin chú ý
    if (invalidDistanceKm / rawDistanceKm > 0.4) {
      antiCheatStatus = AntiCheatStatus.FLAGGED;
    } else {
      antiCheatStatus = AntiCheatStatus.PARTIAL_VALID;
    }
  } else if (invalidDistanceMeters > 0) {
    antiCheatStatus = AntiCheatStatus.PARTIAL_VALID;
  }

  if (flagReasons.length > 0 && antiCheatStatus === AntiCheatStatus.VALID) {
    antiCheatStatus = AntiCheatStatus.FLAGGED;
  }

  // 10. Tính hệ số nhân (Cross-training ratio + Cuối tuần / Sự kiện đặc biệt)
  let sportRatio = 1.0;
  let sportRatioReason = '';
  if (isCrossTrainingAllowed) {
    if (sportCat === 'Ride') {
      sportRatio = rules.rideToRunRatio ?? 0.25;
      sportRatioReason = `Quy đổi Đạp xe (x${sportRatio})`;
    } else if (sportCat === 'Swim') {
      sportRatio = rules.swimToRunRatio ?? 5.0;
      sportRatioReason = `Quy đổi Bơi lội (x${sportRatio})`;
    }
  }

  let appliedMultiplier = sportRatio;
  let multiplierReason: string | null = sportRatioReason || null;

  const dateStr = toVietnamDateString(activity.startDateIso); // YYYY-MM-DD theo giờ Việt Nam (+7)
  const isWeekend = isVietnamWeekend(activity.startDateIso); // Thứ 7 hoặc Chủ Nhật theo giờ Việt Nam (+7)

  const specialDay = rules.specialMultiplierDates?.find((d) => d.date === dateStr);
  if (specialDay && specialDay.multiplier > 1) {
    appliedMultiplier *= specialDay.multiplier;
    multiplierReason = multiplierReason
      ? `${multiplierReason} • ${specialDay.label} (x${specialDay.multiplier})`
      : `${specialDay.label} (x${specialDay.multiplier})`;
  } else if (isWeekend && rules.weekendMultiplier > 1) {
    appliedMultiplier *= rules.weekendMultiplier;
    multiplierReason = multiplierReason
      ? `${multiplierReason} • Cuối tuần x${rules.weekendMultiplier}`
      : `Ngày cuối tuần x${rules.weekendMultiplier}`;
  }

  const finalCountedDistanceKm = roundKm(validDistanceKm * appliedMultiplier);
  const validAvgPaceSecPerKm = calculatePaceSecPerKm(validDistanceMeters, validMovingTimeSec);

  return {
    antiCheatStatus,
    rejectionReason: null,
    rawDistanceKm,
    validDistanceKm,
    invalidDistanceKm,
    validMovingTimeSec,
    validAvgPaceSecPerKm,
    appliedMultiplier,
    multiplierReason,
    finalCountedDistanceKm,
    evaluatedSplits,
    flagReasons,
  };
}

/**
 * ============================================================================
 * BỘ MÁY TÍNH TOÁN TIẾN ĐỘ 2 TẦNG: TARGET (FINISHER) VS CHALLENGE TIERS (AWARDS)
 * ============================================================================
 */
export interface ActivityLogForProgress {
  activityDateIso: string;
  validRawDistanceKm: number;
  finalMultipliedDistanceKm: number;
  elevationGainMeters: number;
  movingTimeSec?: number;
  validAvgPaceSecPerKm?: number;
  sportType?: string;
}

export function calculateDualGoalProgress(params: {
  runMode: RunMode;
  targetCategory: TargetCategoryInfo;
  challengeTiers: ChallengeTierInfo[];
  activityLogs: ActivityLogForProgress[];
  currentRank?: number | null;
  previouslyCompletedTargetAtIso?: string | null;
  previouslyUnlockedTierMap?: Record<string, string>; // tierId -> unlockedAtIso
}): DualGoalProgressSummary {
  const {
    runMode,
    targetCategory,
    challengeTiers,
    activityLogs,
    currentRank,
    previouslyCompletedTargetAtIso,
    previouslyUnlockedTierMap = {},
  } = params;

  const nowIso = new Date().toISOString();

  // 1. Tính tổng quãng đường tích lũy và buổi chạy dài nhất
  let totalRawKm = 0;
  let totalMultipliedKm = 0;
  let maxSingleRunMultipliedKm = 0;
  let maxSingleRunRawKm = 0;
  let totalElevationGain = 0;

  let runKm = 0;
  let rideRawKm = 0;
  let rideConvertedKm = 0;
  let swimRawKm = 0;
  let swimConvertedKm = 0;

  // Map lưu tổng km theo từng ngày (YYYY-MM-DD) để tính chuỗi ngày chạy liên tục (Streak)
  const dailyDistanceMap = new Map<string, number>();

  for (const log of activityLogs) {
    const cat = normalizeSportCategory(log.sportType);
    if (cat === 'Ride') {
      rideRawKm += log.validRawDistanceKm;
      rideConvertedKm += log.finalMultipliedDistanceKm;
    } else if (cat === 'Swim') {
      swimRawKm += log.validRawDistanceKm;
      swimConvertedKm += log.finalMultipliedDistanceKm;
    } else {
      runKm += log.finalMultipliedDistanceKm;
    }

    totalRawKm += log.validRawDistanceKm;
    totalMultipliedKm += log.finalMultipliedDistanceKm;
    totalElevationGain += log.elevationGainMeters || 0;

    if (log.finalMultipliedDistanceKm > maxSingleRunMultipliedKm) {
      maxSingleRunMultipliedKm = log.finalMultipliedDistanceKm;
    }
    if (log.validRawDistanceKm > maxSingleRunRawKm) {
      maxSingleRunRawKm = log.validRawDistanceKm;
    }

    const dayKey = log.activityDateIso.slice(0, 10);
    dailyDistanceMap.set(dayKey, (dailyDistanceMap.get(dayKey) || 0) + log.validRawDistanceKm);
  }

  totalRawKm = roundKm(totalRawKm);
  totalMultipliedKm = roundKm(totalMultipliedKm);
  maxSingleRunMultipliedKm = roundKm(maxSingleRunMultipliedKm);
  maxSingleRunRawKm = roundKm(maxSingleRunRawKm);

  // 2. Đánh giá Tầng TARGET (Mục tiêu Cơ bản - Finisher Medal & E-Certificate)
  const effectiveDistanceForTarget =
    runMode === RunMode.SINGLE_RUN ? maxSingleRunMultipliedKm : totalMultipliedKm;

  const targetPct = Math.min(
    100,
    roundKm((effectiveDistanceForTarget / targetCategory.targetDistanceKm) * 100)
  );
  const isTargetCompleted = effectiveDistanceForTarget >= targetCategory.targetDistanceKm;
  const remainingTargetKm = Math.max(
    0,
    roundKm(targetCategory.targetDistanceKm - effectiveDistanceForTarget)
  );

  // 3. Hàm phụ tính chuỗi ngày chạy liên tiếp dài nhất (Max Streak Days)
  const computeMaxStreakDays = (minDailyKm = 1.0): number => {
    const validDays = Array.from(dailyDistanceMap.entries())
      .filter(([, km]) => km >= minDailyKm)
      .map(([day]) => day)
      .sort();

    if (validDays.length === 0) return 0;

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < validDays.length; i++) {
      const prevDate = new Date(validDays[i - 1] + 'T00:00:00Z');
      const currDate = new Date(validDays[i] + 'T00:00:00Z');
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }
    return maxStreak;
  };

  // 4. Đánh giá Tầng CHALLENGE TIERS (Các mốc nhận Award / Huy hiệu mở rộng)
  const evaluatedChallenges = challengeTiers.map((tier) => {
    let currentValue = 0;
    let isUnlocked = false;

    switch (tier.conditionType) {
      case ChallengeConditionType.DISTANCE_OVERACHIEVE:
        currentValue = totalMultipliedKm;
        isUnlocked = currentValue >= tier.thresholdValue;
        break;

      case ChallengeConditionType.SINGLE_LONG_RUN:
        currentValue = maxSingleRunRawKm;
        isUnlocked = currentValue >= tier.thresholdValue;
        break;

      case ChallengeConditionType.STREAK_DAYS:
        currentValue = computeMaxStreakDays(tier.minDailyDistanceKm ?? 2.0);
        isUnlocked = currentValue >= tier.thresholdValue;
        break;

      case ChallengeConditionType.ELEVATION_GAIN:
        currentValue = Math.round(totalElevationGain);
        isUnlocked = currentValue >= tier.thresholdValue;
        break;

      case ChallengeConditionType.TOP_RANK:
        currentValue = currentRank ?? 0;
        isUnlocked = currentRank !== null && currentRank !== undefined && currentRank > 0 && currentRank <= tier.thresholdValue;
        break;

      case ChallengeConditionType.SPEED_TARGET_TIME: {
        const requiredKm = tier.targetSpeedDistanceKm || 5.0;
        const maxTimeSec = tier.thresholdValue * 60;
        const targetPaceSec = requiredKm > 0 ? maxTimeSec / requiredKm : maxTimeSec;

        // Tìm bài chạy hợp lệ có cự ly >= requiredKm đạt chuẩn tốc độ (Pace <= targetPaceSec hoặc Thời gian <= maxTimeSec)
        const qualifyingRuns = activityLogs.filter((log) => {
          if ((log.validRawDistanceKm || 0) < requiredKm) return false;
          const paceSec =
            log.validAvgPaceSecPerKm ||
            (log.movingTimeSec && log.validRawDistanceKm > 0
              ? log.movingTimeSec / log.validRawDistanceKm
              : 0);
          const timeForReqDistSec = paceSec > 0 ? paceSec * requiredKm : log.movingTimeSec || 0;

          const meetsPace = paceSec > 0 && paceSec <= targetPaceSec + 1; // Margin 1s do làm tròn
          const meetsTime = (log.movingTimeSec || 0) > 0 && (log.movingTimeSec || 0) <= maxTimeSec;
          const meetsReqDistTime = timeForReqDistSec > 0 && timeForReqDistSec <= maxTimeSec + 2;

          return meetsPace || meetsTime || meetsReqDistTime;
        });

        isUnlocked = qualifyingRuns.length > 0;
        if (isUnlocked) {
          const bestRun = qualifyingRuns.reduce((best, cur) => {
            const curPace =
              cur.validAvgPaceSecPerKm ||
              (cur.movingTimeSec && cur.validRawDistanceKm > 0
                ? cur.movingTimeSec / cur.validRawDistanceKm
                : 99999);
            const bestPace =
              best.validAvgPaceSecPerKm ||
              (best.movingTimeSec && best.validRawDistanceKm > 0
                ? best.movingTimeSec / best.validRawDistanceKm
                : 99999);
            return curPace < bestPace ? cur : best;
          });
          const bestPace =
            bestRun.validAvgPaceSecPerKm ||
            (bestRun.movingTimeSec && bestRun.validRawDistanceKm > 0
              ? bestRun.movingTimeSec / bestRun.validRawDistanceKm
              : 0);
          const bestTimeMinutes =
            bestPace > 0
              ? (bestPace * requiredKm) / 60
              : (bestRun.movingTimeSec || 0) / 60;
          currentValue = Math.round(bestTimeMinutes * 10) / 10;
        } else {
          // Nếu chưa đạt, hiển thị thời gian của bài chạy cự ly >= requiredKm có tốc độ tốt nhất
          const candidates = activityLogs.filter((log) => (log.validRawDistanceKm || 0) >= requiredKm);
          if (candidates.length > 0) {
            const bestCandidate = candidates.reduce((best, cur) => {
              const curPace =
                cur.validAvgPaceSecPerKm ||
                (cur.movingTimeSec && cur.validRawDistanceKm > 0
                  ? cur.movingTimeSec / cur.validRawDistanceKm
                  : 99999);
              const bestPace =
                best.validAvgPaceSecPerKm ||
                (best.movingTimeSec && best.validRawDistanceKm > 0
                  ? best.movingTimeSec / best.validRawDistanceKm
                  : 99999);
              return curPace < bestPace ? cur : best;
            });
            const bestPace =
              bestCandidate.validAvgPaceSecPerKm ||
              (bestCandidate.movingTimeSec && bestCandidate.validRawDistanceKm > 0
                ? bestCandidate.movingTimeSec / bestCandidate.validRawDistanceKm
                : 0);
            const candTimeMinutes =
              bestPace > 0
                ? (bestPace * requiredKm) / 60
                : (bestCandidate.movingTimeSec || 0) / 60;
            currentValue = Math.round(candTimeMinutes * 10) / 10;
          } else {
            currentValue = 0;
          }
        }
        break;
      }
    }

    const progressPercentage =
      tier.conditionType === ChallengeConditionType.TOP_RANK ||
      tier.conditionType === ChallengeConditionType.SPEED_TARGET_TIME
        ? isUnlocked
          ? 100
          : 0
        : Math.min(100, roundKm((currentValue / tier.thresholdValue) * 100));

    return {
      tierId: tier.id,
      tierName: tier.tierName,
      tierLevel: tier.tierLevel,
      conditionType: tier.conditionType,
      thresholdValue: tier.thresholdValue,
      targetSpeedDistanceKm: tier.targetSpeedDistanceKm,
      currentValue,
      progressPercentage,
      isUnlocked,
      unlockedAtIso: isUnlocked ? previouslyUnlockedTierMap[tier.id] || nowIso : null,
      awardBadgeUrl: tier.awardBadgeUrl,
      rewardDescription: tier.rewardDescription,
    };
  });

  return {
    sportBreakdown: {
      runKm: roundKm(runKm),
      rideRawKm: roundKm(rideRawKm),
      rideConvertedKm: roundKm(rideConvertedKm),
      swimRawKm: roundKm(swimRawKm),
      swimConvertedKm: roundKm(swimConvertedKm),
    },
    target: {
      categoryName: targetCategory.name,
      targetDistanceKm: targetCategory.targetDistanceKm,
      currentRawDistanceKm: totalRawKm,
      currentMultipliedDistanceKm: totalMultipliedKm,
      progressPercentage: targetPct,
      remainingDistanceKm: remainingTargetKm,
      isCompleted: isTargetCompleted,
      completedAtIso: isTargetCompleted ? previouslyCompletedTargetAtIso || nowIso : null,
      eCertUnlocked: isTargetCompleted,
      raceKitQualified: isTargetCompleted,
    },
    challenges: evaluatedChallenges,
  };
}

