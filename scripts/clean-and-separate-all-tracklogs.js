/**
 * TOPRunAssistant - Script Phân định & Phân tách Tuyệt đối Dữ liệu Tracklog
 * 
 * Mục tiêu:
 * 1. Dùng Token Strava của Nguyễn Huy Long để xác định chính xác danh sách bài chạy thuộc về Huy Long.
 * 2. Lưu / cập nhật bài chạy của Huy Long bằng SQL trực tiếp để tránh lỗi Prisma relation.
 * 3. Trả toàn bộ bài chạy còn lại (bài test, bài 16km Sala, bài 5.09km, bài seed của Admin) về cho Admin (Alan Nguyen).
 * 4. Tính toán lại tiến độ giải đấu và tổng quãng đường cho từng tài khoản độc lập.
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('./packages/database');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 [DataSeparation] Bắt đầu rà soát và phân tách dữ liệu bài chạy...');

  // 1. Tìm thông tin Admin và User Nguyễn Huy Long
  const adminUser = await prisma.user.findFirst({
    where: { OR: [{ email: { contains: 'admin@toprun.vn', mode: 'insensitive' } }, { role: 'ADMIN' }] },
    include: { stravaConnection: { include: { stravaApp: true } } },
  });

  const longUser = await prisma.user.findFirst({
    where: { email: { contains: 'longnguyen2508@gmail.com', mode: 'insensitive' } },
    include: { stravaConnection: { include: { stravaApp: true } } },
  });

  if (!adminUser) {
    console.error('❌ Không tìm thấy tài khoản Admin trong DB!');
    return;
  }
  if (!longUser) {
    console.error('❌ Không tìm thấy tài khoản Nguyễn Huy Long trong DB!');
    return;
  }

  console.log(`✅ Admin: ${adminUser.fullName} (${adminUser.email}) - ID: ${adminUser.id}`);
  console.log(`✅ VĐV Huy Long: ${longUser.fullName} (${longUser.email}) - ID: ${longUser.id}`);

  // 2. Lấy danh sách ID các bài chạy thực sự của Nguyễn Huy Long từ Strava API
  const longStravaExternalIds = new Set();
  if (longUser.stravaConnection) {
    console.log(`\n📡 [StravaAPI] Đang lấy danh sách bài chạy thật của VĐV Huy Long (Athlete #${longUser.stravaConnection.athleteId})...`);
    let clientId = longUser.stravaConnection.stravaApp?.clientId || '292007';
    let clientSecret = longUser.stravaConnection.stravaApp?.clientSecret || '';
    let accessToken = longUser.stravaConnection.accessToken;
    let refreshToken = longUser.stravaConnection.refreshToken;

    // Refresh token nếu có
    if (refreshToken && clientSecret) {
      try {
        const refreshRes = await fetch('https://www.strava.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });
        if (refreshRes.ok) {
          const refData = await refreshRes.json();
          accessToken = refData.access_token || accessToken;
        }
      } catch (err) {
        console.warn('⚠️ Lỗi refresh token Huy Long:', err.message);
      }
    }

    // Kéo 60 ngày gần nhất của Huy Long
    const afterTimestamp = Math.floor(Date.now() / 1000) - 60 * 86400;
    try {
      const actsRes = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${afterTimestamp}&per_page=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (actsRes.ok) {
        const stravaActs = await actsRes.json();
        console.log(`📥 Strava trả về ${stravaActs.length} hoạt động thực của Nguyễn Huy Long.`);

        for (const act of stravaActs) {
          const extId = String(act.id);
          longStravaExternalIds.add(extId);

          const distM = Number(act.distance || 0);
          const movingSec = Number(act.moving_time || act.elapsed_time || 0);
          const paceSec = distM > 0 ? Math.round(movingSec / (distM / 1000)) : 0;
          const validKm = Math.round((distM / 1000) * 100) / 100;

          // Lấy chi tiết Splits
          let splits = [];
          try {
            const detailRes = await fetch(`https://www.strava.com/api/v3/activities/${act.id}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (detailRes.ok) {
              const detail = await detailRes.json();
              if (Array.isArray(detail.splits_metric)) {
                splits = detail.splits_metric.map((sp, idx) => ({
                  splitIndex: sp.split || idx + 1,
                  distanceMeters: Math.round(Number(sp.distance || 1000) * 10) / 10,
                  movingTimeSec: Number(sp.moving_time || sp.elapsed_time || 300),
                  paceSecPerKm: Number(sp.distance || 1000) > 0 ? Math.round(Number(sp.moving_time || 300) / (Number(sp.distance || 1000) / 1000)) : 300,
                  elevationDiffMeters: Math.round(Number(sp.elevation_difference || 0) * 10) / 10,
                  averageHeartrate: sp.average_heartrate ? Math.round(Number(sp.average_heartrate)) : null,
                  isValid: true,
                  invalidReason: null,
                }));
              }
            }
          } catch (e) {}

          // Kiểm tra xem bài chạy đã có trong DB chưa
          const existingActs = await prisma.$queryRawUnsafe(
            `SELECT id FROM activities WHERE "externalId" = $1 AND source = 'STRAVA' LIMIT 1`,
            extId
          );

          let actId = `act_${extId}`;
          if (existingActs && existingActs.length > 0) {
            actId = existingActs[0].id;
            await prisma.$executeRawUnsafe(
              `UPDATE activities 
               SET "userId" = $1, name = $2, "sportType" = $3, "startDate" = $4,
                   "distanceMeters" = $5, "validDistanceKm" = $6, "movingTimeSec" = $7,
                   "elapsedTimeSec" = $8, "avgPaceSecPerKm" = $9, "totalElevationGain" = $10,
                   "mapPolyline" = $11, "updatedAt" = NOW()
               WHERE id = $12`,
              longUser.id,
              act.name || 'Strava Run',
              act.sport_type || act.type || 'Run',
              new Date(act.start_date || act.start_date_local || new Date()),
              distM,
              validKm,
              movingSec,
              Number(act.elapsed_time || movingSec),
              paceSec,
              Number(act.total_elevation_gain || 0),
              act.map?.summary_polyline || act.map?.polyline || null,
              actId
            );
          } else {
            await prisma.$executeRawUnsafe(
              `INSERT INTO activities (
                id, "userId", source, "externalId", name, "sportType", "startDate",
                "distanceMeters", "validDistanceKm", "movingTimeSec", "elapsedTimeSec",
                "avgPaceSecPerKm", "totalElevationGain", "mapPolyline", "antiCheatStatus",
                "isManual", "isHidden", "kudosCount", "commentCount", "createdAt", "updatedAt"
              ) VALUES (
                $1, $2, 'STRAVA', $3, $4, $5, $6,
                $7, $8, $9, $10,
                $11, $12, $13, 'VALID',
                false, false, 0, 0, NOW(), NOW()
              )`,
              actId,
              longUser.id,
              extId,
              act.name || 'Strava Run',
              act.sport_type || act.type || 'Run',
              new Date(act.start_date || act.start_date_local || new Date()),
              distM,
              validKm,
              movingSec,
              Number(act.elapsed_time || movingSec),
              paceSec,
              Number(act.total_elevation_gain || 0),
              act.map?.summary_polyline || act.map?.polyline || null
            );
          }

          // Cập nhật splits
          if (splits.length > 0) {
            await prisma.activitySplit.deleteMany({ where: { activityId: actId } }).catch(() => {});
            await prisma.activitySplit.createMany({
              data: splits.map((sp) => ({
                activityId: actId,
                splitIndex: sp.splitIndex,
                distanceMeters: sp.distanceMeters,
                movingTimeSec: sp.movingTimeSec,
                paceSecPerKm: sp.paceSecPerKm,
                elevationDiffMeters: sp.elevationDiffMeters,
                averageHeartrate: sp.averageHeartrate,
                isValid: true,
                invalidReason: null,
              })),
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Lỗi gọi Strava API cho Huy Long:', err.message);
    }
  }

  // 3. Phân tách: Trả tất cả bài chạy KHÔNG THUỘC về Huy Long về cho Admin
  console.log('\n🔍 [CleanActivities] Đang quét và phân loại lại toàn bộ hoạt động trong DB...');
  const allActivities = await prisma.activity.findMany();
  let returnedCount = 0;
  let longCount = 0;

  for (const act of allActivities) {
    const isActuallyLong = longStravaExternalIds.has(act.externalId);
    if (!isActuallyLong && act.userId === longUser.id) {
      // Bài này KHÔNG nằm trong Strava của Huy Long -> Trả lại cho Admin qua SQL!
      await prisma.$executeRawUnsafe(
        `UPDATE activities SET "userId" = $1 WHERE id = $2`,
        adminUser.id,
        act.id
      );
      returnedCount++;
      console.log(` ↩️ Trả về Admin: "${act.name}" (${act.validDistanceKm}km, id: ${act.id}, extId: ${act.externalId})`);
    } else if (isActuallyLong) {
      longCount++;
      console.log(` ✔️ Của Huy Long: "${act.name}" (${act.validDistanceKm}km, extId: ${act.externalId})`);
    }
  }
  console.log(`✅ Kết quả: Đã trả lại ${returnedCount} bài chạy về cho Admin. VĐV Huy Long có ${longCount} bài chạy.`);

  // 4. Tính toán lại tiến độ giải đấu cho cả 2 tài khoản
  console.log('\n🏆 [RecalculateEvents] Đang tính toán lại dữ liệu giải đấu...');
  const events = await prisma.event.findMany({ include: { categories: true } });

  for (const ev of events) {
    const evStart = new Date(ev.startDate).getTime();
    const evEnd = new Date(ev.endDate).getTime();
    const multiplier = (ev.ruleConfig && typeof ev.ruleConfig === 'object' && ev.ruleConfig.weekendMultiplier) || 1.0;

    // A. Tính cho Admin
    const adminActs = await prisma.activity.findMany({
      where: {
        userId: adminUser.id,
        antiCheatStatus: 'VALID',
        isHidden: false,
        startDate: { gte: new Date(ev.startDate), lte: new Date(ev.endDate) },
      },
    });

    let adminRawKm = 0;
    let adminMultipliedKm = 0;
    for (const a of adminActs) {
      const d = new Date(a.startDate).getUTCDay();
      const mult = (d === 0 || d === 6) && multiplier > 1 ? multiplier : 1.0;
      adminRawKm += a.validDistanceKm;
      adminMultipliedKm += Math.round(a.validDistanceKm * mult * 100) / 100;
    }
    adminRawKm = Math.round(adminRawKm * 100) / 100;
    adminMultipliedKm = Math.round(adminMultipliedKm * 100) / 100;

    const adminPart = await prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId: ev.id, userId: adminUser.id } },
      include: { category: true },
    });
    if (adminPart) {
      const targetKm = adminPart.category?.targetDistanceKm || 50;
      const pct = Math.min(100, Math.round((adminMultipliedKm / targetKm) * 100));
      await prisma.eventParticipation.update({
        where: { id: adminPart.id },
        data: {
          validRawDistanceKm: adminRawKm,
          validMultipliedDistanceKm: adminMultipliedKm,
          targetProgressPct: pct,
          isTargetCompleted: adminMultipliedKm >= targetKm,
        },
      });
      console.log(` - Giải "${ev.title}" (Admin): ${adminMultipliedKm} / ${targetKm} km (${pct}%)`);
    }

    // B. Tính cho Huy Long
    const longActs = await prisma.activity.findMany({
      where: {
        userId: longUser.id,
        antiCheatStatus: 'VALID',
        isHidden: false,
        startDate: { gte: new Date(ev.startDate), lte: new Date(ev.endDate) },
      },
    });

    let longRawKm = 0;
    let longMultipliedKm = 0;
    for (const a of longActs) {
      const d = new Date(a.startDate).getUTCDay();
      const mult = (d === 0 || d === 6) && multiplier > 1 ? multiplier : 1.0;
      longRawKm += a.validDistanceKm;
      longMultipliedKm += Math.round(a.validDistanceKm * mult * 100) / 100;
    }
    longRawKm = Math.round(longRawKm * 100) / 100;
    longMultipliedKm = Math.round(longMultipliedKm * 100) / 100;

    const longPart = await prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId: ev.id, userId: longUser.id } },
      include: { category: true },
    });
    if (longPart) {
      const targetKm = longPart.category?.targetDistanceKm || 50;
      const pct = Math.min(100, Math.round((longMultipliedKm / targetKm) * 100));
      await prisma.eventParticipation.update({
        where: { id: longPart.id },
        data: {
          validRawDistanceKm: longRawKm,
          validMultipliedDistanceKm: longMultipliedKm,
          targetProgressPct: pct,
          isTargetCompleted: longMultipliedKm >= targetKm,
        },
      });
      console.log(` - Giải "${ev.title}" (Huy Long): ${longMultipliedKm} / ${targetKm} km (${pct}%)`);
    }
  }

  // 5. Cập nhật tổng số km và số bài chạy trong bảng User
  const allAdminActs = await prisma.activity.findMany({ where: { userId: adminUser.id, isHidden: false } });
  const adminTotalKm = Math.round(allAdminActs.reduce((acc, a) => acc + a.validDistanceKm, 0) * 100) / 100;
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { totalDistanceKm: adminTotalKm, totalActivities: allAdminActs.length },
  });

  const allLongActs = await prisma.activity.findMany({ where: { userId: longUser.id, isHidden: false } });
  const longTotalKm = Math.round(allLongActs.reduce((acc, a) => acc + a.validDistanceKm, 0) * 100) / 100;
  await prisma.user.update({
    where: { id: longUser.id },
    data: { totalDistanceKm: longTotalKm, totalActivities: allLongActs.length },
  });

  console.log(`\n🎉 [Xong] Thống kê:`);
  console.log(` - Admin: ${allAdminActs.length} bài (${adminTotalKm} km)`);
  console.log(` - Huy Long: ${allLongActs.length} bài (${longTotalKm} km)`);

  // Xóa cache file cũ nếu có để force API nạp lại từ DB
  const cachePath = path.resolve('/app/toprun-engine-state.json');
  if (fs.existsSync(cachePath)) {
    try {
      fs.unlinkSync(cachePath);
      console.log('🧹 Đã xóa cache file toprun-engine-state.json.');
    } catch (e) {}
  }
}

main()
  .catch((e) => console.error('❌ Lỗi:', e))
  .finally(async () => await prisma.$disconnect());
