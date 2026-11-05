/**
 * TOPRunAssistant - Script Phục hồi và Tách biệt Dữ liệu Admin & VĐV Nguyễn Huy Long
 *
 * Chức năng:
 * 1. Liệt kê toàn bộ các bài chạy hiện có trong PostgreSQL để kiểm tra.
 * 2. Phục hồi bài chạy 5.09 km (và các bài chạy của Admin) về đúng tài khoản Admin (Alan Nguyen).
 * 3. Dùng token Strava đã kết nối của VĐV Nguyễn Huy Long (Athlete #68541399) để kéo 10 bài chạy thật
 *    về tài khoản Nguyễn Huy Long kèm theo GPS Tracklog & Splits từng km.
 * 4. Tính toán lại quãng đường hợp lệ, tiến độ giải đấu cho cả Admin và Nguyễn Huy Long.
 * 5. Khởi động lại hoặc xóa state cache để API hydrate chuẩn xác từ Database.
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('./packages/database');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 [RestoreScript] Bắt đầu rà soát dữ liệu...');

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
  console.log(`✅ VĐV: ${longUser.fullName} (${longUser.email}) - ID: ${longUser.id}`);

  // 2. Kiểm tra tất cả activities hiện có
  const existingActivities = await prisma.activity.findMany({
    orderBy: { startDate: 'desc' },
  });
  console.log(`\n📊 Tổng số activities trong DB: ${existingActivities.length}`);
  for (const act of existingActivities) {
    console.log(` - [${act.id}] extId=${act.externalId} | userId=${act.userId} | "${act.name}" | ${act.validDistanceKm}km | date=${act.startDate.toISOString()}`);
  }

  // 3. Phục hồi bài chạy 5.09 km về cho Admin
  // Tìm các bài chạy có cự ly ~ 5.09km hoặc tên liên quan Admin đang bị gán nhầm cho Long
  for (const act of existingActivities) {
    const is5k = Math.abs(act.validDistanceKm - 5.09) < 0.2 || (act.distanceMeters >= 4900 && act.distanceMeters <= 5300);
    if (is5k && act.userId === longUser.id) {
      console.log(`🔄 Đang trả bài chạy "${act.name}" (${act.validDistanceKm}km, id: ${act.id}) về cho Admin...`);
      await prisma.activity.update({
        where: { id: act.id },
        data: {
          userId: adminUser.id,
          userName: adminUser.fullName,
          userAvatar: adminUser.avatarUrl,
          userDepartment: adminUser.departmentOrUnit || 'ASSA ABLOY Engineering',
        },
      });
      console.log(`✅ Đã trả bài chạy ${act.id} về cho Admin (${adminUser.fullName}).`);
    }
  }

  // 4. Đồng bộ chính xác các bài chạy từ Strava của Nguyễn Huy Long (Athlete #68541399)
  if (longUser.stravaConnection) {
    console.log(`\n🔄 Đang lấy dữ liệu từ Strava cho VĐV Nguyễn Huy Long (Athlete #${longUser.stravaConnection.athleteId})...`);
    let clientId = longUser.stravaConnection.stravaApp?.clientId || '292007';
    let clientSecret = longUser.stravaConnection.stravaApp?.clientSecret || '';
    let accessToken = longUser.stravaConnection.accessToken;
    let refreshToken = longUser.stravaConnection.refreshToken;

    // Refresh token
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
          console.log('✅ Đã refresh Strava Access Token mới thành công.');
        }
      } catch (err) {
        console.warn('⚠️ Lỗi refresh token:', err.message);
      }
    }

    // Kéo 30 ngày gần nhất của Huy Long
    const afterTimestamp = Math.floor(Date.now() / 1000) - 30 * 86400;
    try {
      const actsRes = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${afterTimestamp}&per_page=50`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (actsRes.ok) {
        const stravaActs = await actsRes.json();
        console.log(`📥 Strava trả về ${stravaActs.length} hoạt động thuộc về Nguyễn Huy Long.`);

        for (const act of stravaActs) {
          const extId = String(act.id);
          const distM = Number(act.distance || 0);
          const movingSec = Number(act.moving_time || act.elapsed_time || 0);
          const paceSec = distM > 0 ? Math.round(movingSec / (distM / 1000)) : 0;
          const validKm = Math.round((distM / 1000) * 100) / 100;

          // Lấy chi tiết Splits km
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
          } catch (e) {
            // bỏ qua
          }

          const upserted = await prisma.activity.upsert({
            where: { externalId: extId },
            update: {
              userId: longUser.id,
              userName: longUser.fullName,
              userAvatar: longUser.avatarUrl,
              userDepartment: longUser.departmentOrUnit || 'Chưa cập nhật',
              name: act.name || 'Strava Run',
              sportType: act.sport_type || act.type || 'Run',
              startDate: new Date(act.start_date || act.start_date_local || new Date()),
              distanceMeters: distM,
              validDistanceKm: validKm,
              movingTimeSec: movingSec,
              elapsedTimeSec: Number(act.elapsed_time || movingSec),
              avgPaceSecPerKm: paceSec,
              totalElevationGain: Number(act.total_elevation_gain || 0),
              avgHeartrate: act.average_heartrate ? Math.round(Number(act.average_heartrate)) : null,
              maxHeartrate: act.max_heartrate ? Math.round(Number(act.max_heartrate)) : null,
              mapPolyline: act.map?.summary_polyline || act.map?.polyline || null,
              antiCheatStatus: 'VALID',
            },
            create: {
              id: `act_${extId}`,
              userId: longUser.id,
              userName: longUser.fullName,
              userAvatar: longUser.avatarUrl,
              userDepartment: longUser.departmentOrUnit || 'Chưa cập nhật',
              source: 'STRAVA',
              externalId: extId,
              name: act.name || 'Strava Run',
              sportType: act.sport_type || act.type || 'Run',
              startDate: new Date(act.start_date || act.start_date_local || new Date()),
              distanceMeters: distM,
              validDistanceKm: validKm,
              movingTimeSec: movingSec,
              elapsedTimeSec: Number(act.elapsed_time || movingSec),
              avgPaceSecPerKm: paceSec,
              totalElevationGain: Number(act.total_elevation_gain || 0),
              avgHeartrate: act.average_heartrate ? Math.round(Number(act.average_heartrate)) : null,
              maxHeartrate: act.max_heartrate ? Math.round(Number(act.max_heartrate)) : null,
              mapPolyline: act.map?.summary_polyline || act.map?.polyline || null,
              antiCheatStatus: 'VALID',
            },
          });

          if (splits.length > 0) {
            await prisma.activitySplit.deleteMany({ where: { activityId: upserted.id } });
            await prisma.activitySplit.createMany({
              data: splits.map((sp) => ({
                activityId: upserted.id,
                splitIndex: sp.splitIndex,
                distanceMeters: sp.distanceMeters,
                movingTimeSec: sp.movingTimeSec,
                paceSecPerKm: sp.paceSecPerKm,
                elevationDiffMeters: sp.elevationDiffMeters,
                averageHeartrate: sp.averageHeartrate,
                isValid: true,
                invalidReason: null,
              })),
            });
          }
          console.log(`  + Đã nạp bài: "${act.name}" (${validKm} km) ngày ${act.start_date}`);
        }
      } else {
        console.warn(`⚠️ Strava API returned error: ${actsRes.status}`);
      }
    } catch (err) {
      console.warn('⚠️ Lỗi kết nối Strava:', err.message);
    }
  }

  // 5. Cập nhật giải đấu và tính toán lại tiến độ giải đấu cho cả hai tài khoản
  const events = await prisma.event.findMany({
    include: { categories: true },
  });

  for (const ev of events) {
    const evStart = new Date(ev.startDate).getTime();
    const evEnd = new Date(ev.endDate).getTime();
    const multiplier = (ev.ruleConfig && typeof ev.ruleConfig === 'object' && ev.ruleConfig.weekendMultiplier) || 1.0;

    // Tính cho Admin
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
      console.log(`✅ Cập nhật giải "${ev.title}" cho Admin: ${adminMultipliedKm} / ${targetKm} km (${pct}%)`);
    }

    // Tính cho Nguyễn Huy Long
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
      console.log(`✅ Cập nhật giải "${ev.title}" cho Nguyễn Huy Long: ${longMultipliedKm} / ${targetKm} km (${pct}%)`);
    }
  }

  // 6. Cập nhật totalDistanceKm cho users
  const allAdmin = await prisma.activity.findMany({ where: { userId: adminUser.id, isHidden: false } });
  const adminTotal = Math.round(allAdmin.reduce((s, a) => s + a.validDistanceKm, 0) * 100) / 100;
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { totalDistanceKm: adminTotal, totalActivities: allAdmin.length },
  });

  const allLong = await prisma.activity.findMany({ where: { userId: longUser.id, isHidden: false } });
  const longTotal = Math.round(allLong.reduce((s, a) => s + a.validDistanceKm, 0) * 100) / 100;
  await prisma.user.update({
    where: { id: longUser.id },
    data: { totalDistanceKm: longTotal, totalActivities: allLong.length },
  });

  console.log(`\n🎉 Hoàn tất! Admin có ${allAdmin.length} bài (${adminTotal} km) | Huy Long có ${allLong.length} bài (${longTotal} km).`);

  // Xóa cache file cũ nếu có
  const cachePath = path.resolve('/app/toprun-engine-state.json');
  if (fs.existsSync(cachePath)) {
    try {
      fs.unlinkSync(cachePath);
      console.log('🧹 Đã dọn dẹp toprun-engine-state.json.');
    } catch (e) {}
  }
}

main()
  .catch((e) => console.error('Lỗi thực thi:', e))
  .finally(async () => await prisma.$disconnect());
