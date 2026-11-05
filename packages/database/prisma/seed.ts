import {
  AntiCheatStatus,
  ChallengeConditionType,
  EventStatus,
  EventType,
  FulfillmentStatus,
  Gender,
  PrismaClient,
  RunMode,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting TOPRunAssistant Database Seeding...');

  // 1. Tạo Users (Admin, Organizer, và các Runners)
  const adminUser = await prisma.user.upsert({
    where: { email: 'thuanzero94@gmail.com' },
    update: {},
    create: {
      id: 'usr_admin_01',
      email: 'thuanzero94@gmail.com',
      fullName: 'Alan Hoàng (System Admin)',
      departmentOrUnit: 'ASSA ABLOY Engineering',
      role: UserRole.ADMIN,
      gender: Gender.MALE,
      totalDistanceKm: 184.5,
      totalActivities: 18,
      pr5kSec: 1290,  // 21:30
      pr10kSec: 2740, // 45:40
      pr21kSec: 6120, // 1:42:00
      pr42kSec: 13500,// 3:45:00
    },
  });

  const runnerMinh = await prisma.user.upsert({
    where: { email: 'minh.nguyen@toprun.vn' },
    update: {},
    create: {
      id: 'usr_runner_02',
      email: 'minh.nguyen@toprun.vn',
      fullName: 'Nguyễn Tuấn Minh',
      departmentOrUnit: 'Product & R&D Team',
      role: UserRole.RUNNER,
      gender: Gender.MALE,
      totalDistanceKm: 245.8,
      totalActivities: 24,
      pr5kSec: 1180,
      pr10kSec: 2520,
      pr21kSec: 5640,
    },
  });

  const runnerLan = await prisma.user.upsert({
    where: { email: 'lan.tran@toprun.vn' },
    update: {},
    create: {
      id: 'usr_runner_03',
      email: 'lan.tran@toprun.vn',
      fullName: 'Trần Ngọc Lan',
      departmentOrUnit: 'Operations & Supply Chain',
      role: UserRole.RUNNER,
      gender: Gender.FEMALE,
      totalDistanceKm: 162.0,
      totalActivities: 16,
      pr5kSec: 1410,
      pr10kSec: 2950,
      pr21kSec: 6540,
    },
  });

  // 2. Tạo Liên kết Strava mẫu
  await prisma.stravaConnection.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      athleteId: '98812345',
      username: 'alan_hoang_run',
      accessToken: 'strava_sample_access_token',
      refreshToken: 'strava_sample_refresh_token',
      expiresAt: Math.floor(Date.now() / 1000) + 21600,
      isActive: true,
      lastSyncAt: new Date(),
    },
  });

  // 3. Tạo Câu lạc bộ (Club)
  const club = await prisma.club.upsert({
    where: { slug: 'assa-abloy-runners-vn' },
    update: {},
    create: {
      id: 'club_assa_01',
      slug: 'assa-abloy-runners-vn',
      name: 'ASSA ABLOY Vietnam Runners Club',
      description: 'Câu lạc bộ chạy bộ nội bộ kết nối đam mê, rèn luyện sức khỏe và bứt phá giới hạn.',
      isPrivate: false,
      inviteCode: 'TOPRUN2026',
      totalDistanceKm: 592.3,
      memberCount: 48,
    },
  });

  // 4. Tạo Giải chạy Ảo Chính Thức (VIRTUAL RACE) có Mô hình 2 Tầng: TARGET vs CHALLENGE TIERS
  const virtualRace = await prisma.event.upsert({
    where: { slug: 'toprun-autumn-virtual-race-2026' },
    update: {},
    create: {
      id: 'evt_vr_2026',
      slug: 'toprun-autumn-virtual-race-2026',
      title: 'TOPRUN AUTUMN VIRTUAL RACE 2026 — BỨT PHÁ GIỚI HẠN',
      subtitle: 'Giải chạy tích lũy đa nền tảng đồng bộ Strava • Nhân đôi km Cuối Tuần',
      description:
        'Giải chạy ảo chính thức với cơ chế Chấm điểm 2 Tầng độc quyền: Hoàn thành Mốc TARGET đăng ký để nhận Huy chương Finisher thật & Chứng nhận điện tử (E-Cert); đồng thời chinh phục các Mốc CHALLENGE mở rộng (100KM, 150KM, Chuỗi 7 ngày liên tiếp) để mở khóa Bộ Huy Hiệu Danh Giá.',
      eventType: EventType.VIRTUAL_RACE,
      runMode: RunMode.ACCUMULATIVE,
      status: EventStatus.ACTIVE,
      startDate: new Date('2026-10-01T00:00:00Z'),
      endDate: new Date('2026-11-30T23:59:59Z'),
      creatorId: adminUser.id,
      participantCount: 142,
      ruleConfig: {
        allowedSportTypes: ['Run', 'TrailRun', 'VirtualRun'],
        minPaceSecPerKm: 180, // 03:00 /km (nhanh hơn sẽ bị cắt Split xe máy)
        maxPaceSecPerKm: 900, // 15:00 /km
        minActivityDistanceKm: 1.0,
        minStepCadenceSpm: 120,
        requireHeartRate: false,
        allowSplitFiltering: true,
        weekendMultiplier: 2.0,
      },
    },
  });

  // 5. Tạo Tầng 1: Các hạng mục TARGET (Finisher Goal)
  const cat50k = await prisma.eventCategory.upsert({
    where: { id: 'cat_target_50k' },
    update: {},
    create: {
      id: 'cat_target_50k',
      eventId: virtualRace.id,
      name: 'Mốc Target 50KM (Finisher)',
      targetDistanceKm: 50,
      bibPrefix: 'TOP50-',
    },
  });

  const cat100k = await prisma.eventCategory.upsert({
    where: { id: 'cat_target_100k' },
    update: {},
    create: {
      id: 'cat_target_100k',
      eventId: virtualRace.id,
      name: 'Mốc Target 100KM (Pro Runner)',
      targetDistanceKm: 100,
      bibPrefix: 'TOP100-',
    },
  });

  // 6. Tạo Tầng 2: Các mốc CHALLENGE mở rộng (Nhận Award / Huy hiệu đặc biệt)
  const tierSilver = await prisma.eventChallengeTier.upsert({
    where: { id: 'tier_over_100k' },
    update: {},
    create: {
      id: 'tier_over_100k',
      eventId: virtualRace.id,
      tierName: 'Challenge Bạc: Vượt Ngưỡng 100KM',
      tierLevel: 'SILVER',
      conditionType: ChallengeConditionType.DISTANCE_OVERACHIEVE,
      thresholdValue: 100,
      awardBadgeUrl: '/badges/challenge-100k-silver.svg',
      rewardDescription: 'Huy hiệu Chiến Binh Bạc 100KM + Áo Finisher phiên bản giới hạn',
    },
  });

  const tierGold = await prisma.eventChallengeTier.upsert({
    where: { id: 'tier_over_150k' },
    update: {},
    create: {
      id: 'tier_over_150k',
      eventId: virtualRace.id,
      tierName: 'Challenge Vàng: Siêu Chiến Binh 150KM',
      tierLevel: 'GOLD',
      conditionType: ChallengeConditionType.DISTANCE_OVERACHIEVE,
      thresholdValue: 150,
      awardBadgeUrl: '/badges/challenge-150k-gold.svg',
      rewardDescription: 'Huy hiệu Siêu Chiến Binh Vàng 150KM + Khắc tên Vàng lên Kỷ niệm chương',
    },
  });

  const tierStreak = await prisma.eventChallengeTier.upsert({
    where: { id: 'tier_streak_7d' },
    update: {},
    create: {
      id: 'tier_streak_7d',
      eventId: virtualRace.id,
      tierName: 'Challenge Kỷ Luật Thép: Streak 7 Ngày Liên Tiếp',
      tierLevel: 'DIAMOND',
      conditionType: ChallengeConditionType.STREAK_DAYS,
      thresholdValue: 7,
      minDailyDistanceKm: 2.0,
      awardBadgeUrl: '/badges/streak-7d-diamond.svg',
      rewardDescription: 'Huy hiệu Kim Cương Kỷ Luật Thép (Chạy tối thiểu 2km mỗi ngày trong 7 ngày liên tục)',
    },
  });

  // 7. Tạo Đội thi đấu (Event Teams)
  const teamEngineering = await prisma.eventTeam.upsert({
    where: { id: 'team_eng_01' },
    update: {},
    create: {
      id: 'team_eng_01',
      eventId: virtualRace.id,
      clubId: club.id,
      name: 'Khối Công Nghệ & R&D (Engineering)',
      memberCount: 18,
      totalValidDistanceKm: 312.4,
      totalMultipliedDistanceKm: 418.6,
    },
  });

  // 8. Đăng ký tham gia giải (EventParticipation) + Đơn hàng Race-kit
  const participationAdmin = await prisma.eventParticipation.upsert({
    where: {
      eventId_userId: {
        eventId: virtualRace.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      id: 'part_admin_01',
      eventId: virtualRace.id,
      userId: adminUser.id,
      categoryId: cat50k.id,
      teamId: teamEngineering.id,
      bibNumber: 'TOP50-0018',
      validRawDistanceKm: 54.2,
      validMultipliedDistanceKm: 68.5, // Đã vượt mốc Target 50KM (100%), đang tiến tới mốc Challenge 100KM (68.5%)
      bestSingleRunKm: 16.4,
      bestSingleRunPaceSec: 312,
      targetProgressPct: 100,
      isTargetCompleted: true,
      targetCompletedAt: new Date('2026-10-25T08:30:00Z'),
      currentStreakDays: 5,
      maxStreakDays: 5,
      totalElevationGainMeters: 420,
      completedActivitiesCount: 7,
    },
  });

  await prisma.raceKitOrder.upsert({
    where: { participationId: participationAdmin.id },
    update: {},
    create: {
      participationId: participationAdmin.id,
      shirtSize: 'L',
      medalEngravingName: 'ALAN HOANG - FINISHER 50K',
      recipientName: 'Alan Hoàng',
      phone: '0909123456',
      shippingAddress: 'Tòa nhà ASSA ABLOY, Quận 7, TP. Hồ Chí Minh',
      cityProvince: 'TP. Hồ Chí Minh',
      fulfillmentStatus: FulfillmentStatus.QUALIFIED_FINISHER,
      shippingProvider: 'GHTK',
      trackingCode: 'GHTK-TOP2026-8891',
    },
  });

  console.log('✅ Seeding completed successfully!', {
    event: virtualRace.title,
    targetCategories: [cat50k.name, cat100k.name],
    challengeTiers: [tierSilver.tierName, tierGold.tierName, tierStreak.tierName],
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

