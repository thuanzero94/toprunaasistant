import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AntiCheatStatus,
  ChallengeConditionType,
  EventRuleConfigSchema,
  RawActivityInput,
  RunMode,
  SplitInvalidReason,
  SportType,
  calculateDualGoalProgress,
  decodePolyline,
  encodePolyline,
  evaluateActivitySplits,
  formatPace,
  formatSportSpeed,
  formatSportDistance,
  getSpeedMetricLabel,
  getSpeedSplitLabel,
  calculateSpeedKmh,
  formatSpeedKmh,
  formatSwimPace,
} from '../index';

describe('@toprun/shared - Split-Level Anti-Cheat & Dual-Goal Scoring Engine', () => {
  const defaultRules = EventRuleConfigSchema.parse({
    allowedSportTypes: [SportType.RUN, SportType.TRAIL_RUN],
    minPaceSecPerKm: 180, // 03:00 /km
    maxPaceSecPerKm: 900, // 15:00 /km
    minActivityDistanceKm: 1.0,
    requireHeartRate: false,
    allowSplitFiltering: true,
    weekendMultiplier: 2.0,
  });

  it('1. Cắt bỏ km đi xe máy (Split-level filtering) nhưng vẫn giữ lại các km chạy bộ hợp lệ và nhân x2 ngày cuối tuần', () => {
    // Giả lập buổi chạy sáng Chủ Nhật (2026-10-25 là Chủ Nhật):
    // 5km đầu chạy bộ pace 05:30/km (330s), km thứ 6 quên tắt Strava lên xe máy pace 01:40/km (100s)
    const sundayActivity = {
      externalId: 'strava_1001',
      name: 'Morning Run & Quên tắt đồng hồ',
      sportType: SportType.RUN,
      startDateIso: '2026-10-25T06:00:00.000Z', // Chủ Nhật
      distanceMeters: 6000,
      movingTimeSec: 330 * 5 + 100,
      elapsedTimeSec: 1800,
      totalElevationGainMeters: 45,
      averageHeartrate: 155,
      averageCadenceSpm: 172,
      isManual: false,
      splits: [
        { splitIndex: 1, distanceMeters: 1000, movingTimeSec: 330 },
        { splitIndex: 2, distanceMeters: 1000, movingTimeSec: 325 },
        { splitIndex: 3, distanceMeters: 1000, movingTimeSec: 335 },
        { splitIndex: 4, distanceMeters: 1000, movingTimeSec: 330 },
        { splitIndex: 5, distanceMeters: 1000, movingTimeSec: 330 },
        { splitIndex: 6, distanceMeters: 1000, movingTimeSec: 100 }, // 01:40/km -> Xe máy!
      ],
    };

    const result = evaluateActivitySplits(sundayActivity, defaultRules);

    assert.equal(result.antiCheatStatus, AntiCheatStatus.PARTIAL_VALID);
    assert.equal(result.rawDistanceKm, 6);
    assert.equal(result.validDistanceKm, 5); // Giữ lại đúng 5km hợp lệ
    assert.equal(result.invalidDistanceKm, 1); // Loại bỏ 1km xe máy
    assert.equal(result.appliedMultiplier, 2.0); // Chủ Nhật x2
    assert.equal(result.finalCountedDistanceKm, 10); // 5km * 2 = 10km tính vào giải
    assert.equal(result.evaluatedSplits[5].isValid, false);
    assert.equal(result.evaluatedSplits[5].invalidReason, SplitInvalidReason.PACE_TOO_FAST);
  });

  it('2. Từ chối hoàn toàn các hoạt động nhập tay (Manual Entry) trên Strava', () => {
    const manualAct = {
      externalId: 'strava_1002',
      name: 'Manual Run',
      sportType: SportType.RUN,
      startDateIso: '2026-10-26T06:00:00.000Z',
      distanceMeters: 10000,
      movingTimeSec: 3000,
      elapsedTimeSec: 3000,
      totalElevationGainMeters: 0,
      isManual: true,
      splits: [],
    };

    const result = evaluateActivitySplits(manualAct, defaultRules);
    assert.equal(result.antiCheatStatus, AntiCheatStatus.REJECTED);
    assert.equal(result.finalCountedDistanceKm, 0);
  });

  it('3. Tính toán chuẩn xác Tiến độ 2 Tầng: Mốc Target (Finisher) vs Mốc Challenge (Tiered Awards)', () => {
    const summary = calculateDualGoalProgress({
      runMode: RunMode.ACCUMULATIVE,
      targetCategory: {
        id: 'cat_50k',
        name: 'Hạng mục 50KM Finisher',
        targetDistanceKm: 50,
        bibPrefix: 'TOP50-',
      },
      challengeTiers: [
        {
          id: 'tier_100k',
          tierName: 'Chiến Binh Bạc 100KM',
          tierLevel: 'SILVER',
          conditionType: ChallengeConditionType.DISTANCE_OVERACHIEVE,
          thresholdValue: 100,
          awardBadgeUrl: '/badges/silver-100k.svg',
          rewardDescription: 'Huy hiệu Chiến Binh Bạc + Quà tặng',
        },
        {
          id: 'tier_streak3',
          tierName: 'Chuỗi 3 Ngày Liên Tiếp',
          tierLevel: 'GOLD',
          conditionType: ChallengeConditionType.STREAK_DAYS,
          thresholdValue: 3,
          minDailyDistanceKm: 5,
          awardBadgeUrl: '/badges/streak-3.svg',
          rewardDescription: 'Huy hiệu Kỷ Luật Thép',
        },
      ],
      activityLogs: [
        { activityDateIso: '2026-10-20T06:00:00Z', validRawDistanceKm: 15, finalMultipliedDistanceKm: 15, elevationGainMeters: 100 },
        { activityDateIso: '2026-10-21T06:00:00Z', validRawDistanceKm: 20, finalMultipliedDistanceKm: 20, elevationGainMeters: 120 },
        { activityDateIso: '2026-10-22T06:00:00Z', validRawDistanceKm: 25, finalMultipliedDistanceKm: 25, elevationGainMeters: 150 },
      ],
    });

    // Tổng km = 60km -> Đã vượt Target 50KM (100%, mở khóa E-Cert & Race-kit), và đạt 60% của Challenge 100KM
    assert.equal(summary.target.isCompleted, true);
    assert.equal(summary.target.eCertUnlocked, true);
    assert.equal(summary.target.progressPercentage, 100);

    // Challenge 1 (100KM): 60/100 = 60%
    assert.equal(summary.challenges[0].progressPercentage, 60);
    assert.equal(summary.challenges[0].isUnlocked, false);

    // Challenge 2 (Streak 3 ngày liên tiếp >= 5km): Đã hoàn thành!
    assert.equal(summary.challenges[1].currentValue, 3);
    assert.equal(summary.challenges[1].isUnlocked, true);
  });

  it('4. Mã hóa & Giải mã chuẩn Google Polyline và định dạng Pace', () => {
    assert.equal(formatPace(330), '05:30 /km');
    const coords = [
      { lat: 10.7769, lng: 106.7009 },
      { lat: 10.7801, lng: 106.7055 },
    ];
    const encoded = encodePolyline(coords);
    const decoded = decodePolyline(encoded);
    assert.equal(decoded.length, 2);
    assert.ok(Math.abs(decoded[0].lat - coords[0].lat) < 0.001);
  });
  it('5. Định dạng Tốc độ / Cự ly cho Đạp xe (km/h) và Bơi lội (phút/100m, mét)', () => {
    // Đạp xe: 67s/km -> 53.7 km/h, 106s/km -> 34.0 km/h
    assert.equal(formatSportSpeed(67, 'Ride'), '53.7 km/h');
    assert.equal(formatSportSpeed(106, 'Ride'), '34.0 km/h');
    assert.equal(getSpeedMetricLabel('Ride'), 'Tốc độ TB (km/h)');
    assert.equal(getSpeedSplitLabel('Ride'), 'Tốc độ');

    // Bơi lội: 2030s/km (33:50/km) -> 203s/100m -> 03:23 /100m
    assert.equal(formatSportSpeed(2030, 'Swim'), '03:23 /100m');
    assert.equal(getSpeedMetricLabel('Swim'), 'Pace TB (phút/100m)');
    assert.equal(getSpeedSplitLabel('Swim'), 'Pace');

    // Cự ly bơi < 10km hiển thị mét
    assert.equal(formatSportDistance(0.9, 'Swim'), '900 m');
    assert.equal(formatSportDistance(1.5, 'Swim'), '1.500 m');
    assert.equal(formatSportDistance(12.0, 'Swim'), '12 km');
    assert.equal(formatSportDistance(10.5, 'Ride'), '10.5 km');
  });

  it('6. Chống gian lận Đạp xe: Cho phép tốc độ lên tới 80 km/h (Pace 45s/km)', () => {
    const rideRules = EventRuleConfigSchema.parse({
      allowedSportTypes: [SportType.RIDE, SportType.RUN],
      enableCrossTrainingConversion: true,
      minActivityDistanceKm: 1.0,
      rideMinPaceSecPerKm: 45, // 80 km/h
    });

    const rideActivity: RawActivityInput = {
      externalId: 'strava_ride_80kmh',
      name: 'Thử thách đổ đèo xe đạp',
      sportType: SportType.RIDE,
      startDateIso: '2026-11-04T07:00:00.000Z',
      distanceMeters: 3000,
      movingTimeSec: 212,
      elapsedTimeSec: 220,
      totalElevationGainMeters: 50,
      averageHeartrate: 145,
      isManual: false,
      splits: [
        { splitIndex: 1, distanceMeters: 1000, movingTimeSec: 106 }, // ~34.0 km/h -> Hợp lệ
        { splitIndex: 2, distanceMeters: 1000, movingTimeSec: 67 },  // ~53.7 km/h -> Hợp lệ (trước đây bị PACE_TOO_FAST)
        { splitIndex: 3, distanceMeters: 1000, movingTimeSec: 39 },  // ~92.3 km/h > 80 km/h -> Bị LOẠI
      ],
    };

    const result = evaluateActivitySplits(rideActivity, rideRules);
    assert.equal(result.evaluatedSplits[0].isValid, true);
    assert.equal(result.evaluatedSplits[0].formattedPace, '34.0 km/h');

    // Km thứ 2 đạt 53.7 km/h: HỢP LỆ THEO LUẬT MỚI 80 KM/H!
    assert.equal(result.evaluatedSplits[1].isValid, true);
    assert.equal(result.evaluatedSplits[1].formattedPace, '53.7 km/h');

    // Km thứ 3 vượt 80 km/h (92.3 km/h): LOẠI PACE_TOO_FAST
    assert.equal(result.evaluatedSplits[2].isValid, false);
    assert.equal(result.evaluatedSplits[2].invalidReason, SplitInvalidReason.PACE_TOO_FAST);
    assert.equal(result.validDistanceKm, 2);
  });
});


