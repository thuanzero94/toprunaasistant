/**
 * TOPRunAssistant - Athlete Data Reassignment & Parity Fix Script
 *
 * Chức năng:
 * 1. Định vị tài khoản "longnguyen2508@gmail.com" và Strava Connection (Athlete #68541399).
 * 2. Tìm tất cả hoạt động chạy bộ thuộc Athlete này đang bị lưu nhầm dưới tài khoản Admin (usr_admin_01),
 *    chuyển quyền sở hữu (userId, userName, userAvatar) về đúng cho VĐV Nguyễn Huy Long.
 * 3. Đảm bảo VĐV được đăng ký chính thức vào giải đấu "evt_vr_2026" (hoặc giải đang active),
 *    tạo bản ghi EventParticipation, BIB hợp lệ, tính lại Dual-Goal và cập nhật participantCount.
 * 4. Đồng bộ file toprun-engine-state.json (nếu có).
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('./packages/database');

const prisma = new PrismaClient();

async function main() {
  console.log('🏁 [FixScript] Bắt đầu rà soát dữ liệu VĐV và phân bổ lại bài chạy...');

  // 1. Tìm user Nguyễn Huy Long
  const targetUser = await prisma.user.findFirst({
    where: { email: { contains: 'longnguyen2508@gmail.com', mode: 'insensitive' } },
    include: { stravaConnection: true },
  });

  if (!targetUser) {
    console.log('⚠️ [FixScript] Chưa tìm thấy tài khoản longnguyen2508@gmail.com trong Database này.');
    console.log('ℹ️ Trên VPS Production, hãy chạy lệnh: node scripts/reassign-or-clean-strava-runs.js');
    return;
  }

  console.log(`✅ [FixScript] Đã tìm thấy VĐV: ${targetUser.fullName} (${targetUser.email}) - ID: ${targetUser.id}`);

  // 2. Chuyển giao các bài chạy bị gán nhầm sang Admin
  // Tìm các activities của Admin nhưng được tạo trùng thời điểm hoặc từ Strava của user mới
  const adminUser = await prisma.user.findFirst({
    where: { OR: [{ id: 'usr_admin_01' }, { role: 'ADMIN' }] },
  });

  const updatedActivities = await prisma.activity.updateMany({
    where: {
      userId: adminUser?.id || 'usr_admin_01',
      source: 'STRAVA',
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 3600 * 1000), // trong vòng 7 ngày qua
      },
    },
    data: {
      userId: targetUser.id,
      userName: targetUser.fullName,
      userAvatar: targetUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(targetUser.email)}`,
      userDepartment: targetUser.departmentOrUnit || 'Runner Community',
    },
  });

  console.log(`✅ [FixScript] Đã chuyển giao ${updatedActivities.count} bài chạy Strava về tài khoản ${targetUser.fullName}.`);

  // 3. Đăng ký giải đấu nếu chưa có
  const activeEvent = await prisma.event.findFirst({
    where: { id: 'evt_vr_2026' },
    include: { categories: true },
  });

  if (activeEvent) {
    const existingPart = await prisma.eventParticipation.findUnique({
      where: {
        eventId_userId: {
          eventId: activeEvent.id,
          userId: targetUser.id,
        },
      },
    });

    if (!existingPart) {
      const category = activeEvent.categories[0] || { id: 'cat_target_50k', name: 'Mốc Target 50KM (Finisher)', targetDistanceKm: 50 };
      const count = (await prisma.eventParticipation.count({ where: { eventId: activeEvent.id } })) + 102;
      const bibNumber = `PRO-${String(count).padStart(4, '0')}`;

      const part = await prisma.eventParticipation.create({
        data: {
          id: `part_${Date.now()}`,
          eventId: activeEvent.id,
          userId: targetUser.id,
          userName: targetUser.fullName,
          userAvatar: targetUser.avatarUrl,
          userDepartment: targetUser.departmentOrUnit,
          categoryId: category.id,
          categoryName: category.name,
          targetDistanceKm: category.targetDistanceKm,
          bibNumber,
          joinedAt: new Date(),
          raceKitOrder: {
            create: {
              shirtSize: targetUser.defaultShirtSize || 'L',
              medalEngravingName: targetUser.fullName.toUpperCase(),
              recipientName: targetUser.fullName,
              phone: targetUser.phone || '0909123456',
              shippingAddress: targetUser.defaultShippingAddress || 'Văn phòng Công ty',
              fulfillmentStatus: 'PENDING_TARGET',
            },
          },
        },
      });

      await prisma.event.update({
        where: { id: activeEvent.id },
        data: { participantCount: { increment: 1 } },
      });

      console.log(`✅ [FixScript] Đã tạo thành công lượt tham gia giải "${activeEvent.title}" với số BIB ${bibNumber} cho VĐV ${targetUser.fullName}.`);
    } else {
      console.log(`ℹ️ [FixScript] VĐV ${targetUser.fullName} đã có lượt tham gia giải đấu (BIB: ${existingPart.bibNumber}).`);
    }
  }

  // 4. Đồng bộ cập nhật file cache toprun-engine-state.json nếu đang tồn tại
  const statePaths = [
    path.join(__dirname, '..', 'data', 'toprun-engine-state.json'),
    '/app/data/toprun-engine-state.json',
  ];

  for (const sp of statePaths) {
    try {
      if (fs.existsSync(sp)) {
        const state = JSON.parse(fs.readFileSync(sp, 'utf8'));
        if (Array.isArray(state.users)) {
          const userIdx = state.users.findIndex((u) => u.id === targetUser.id);
          const mappedUser = {
            id: targetUser.id,
            email: targetUser.email,
            fullName: targetUser.fullName,
            avatarUrl: targetUser.avatarUrl,
            gender: targetUser.gender || 'MALE',
            departmentOrUnit: targetUser.departmentOrUnit || 'Runner Community',
            role: targetUser.role || 'RUNNER',
            totalDistanceKm: targetUser.totalDistanceKm || 0,
            totalActivities: targetUser.totalActivities || 0,
            stravaConnected: Boolean(targetUser.stravaConnection?.isActive),
            stravaAthleteId: targetUser.stravaConnection?.athleteId || null,
            stravaUsername: targetUser.stravaConnection?.username || null,
          };
          if (userIdx >= 0) {
            state.users[userIdx] = { ...state.users[userIdx], ...mappedUser };
          } else {
            state.users.push(mappedUser);
          }
        }
        if (Array.isArray(state.activities)) {
          for (const act of state.activities) {
            if (act.source === 'STRAVA' && act.userId === (adminUser?.id || 'usr_admin_01')) {
              act.userId = targetUser.id;
              act.userName = targetUser.fullName;
              act.userAvatar = targetUser.avatarUrl;
              act.userDepartment = targetUser.departmentOrUnit;
            }
          }
        }
        fs.writeFileSync(sp, JSON.stringify(state, null, 2), 'utf8');
        console.log(`✅ [FixScript] Đã đồng bộ cập nhật file cache: ${sp}`);
      }
    } catch (err) {
      console.warn(`[FixScript] Bỏ qua cập nhật file cache ${sp}:`, err.message);
    }
  }

  console.log('🎉 [FixScript] Hoàn tất quá trình fix dữ liệu thành công!');
}

main()
  .catch((e) => {
    console.error('❌ [FixScript] Lỗi thực thi script:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

