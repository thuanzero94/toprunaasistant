/**
 * Script kiểm tra chi tiết dữ liệu người dùng, bài chạy và đăng ký giải trên VPS
 */
const { PrismaClient } = require('./packages/database');
const prisma = new PrismaClient();

async function main() {
  console.log('=== 1. DANH SÁCH USERS TRONG POSTGRESQL ===');
  const users = await prisma.user.findMany({
    include: { stravaConnection: true },
  });
  for (const u of users) {
    console.log(`- ID: ${u.id} | Email: ${u.email} | Name: ${u.fullName} | Role: ${u.role}`);
    if (u.stravaConnection) {
      console.log(`  Strava Conn: athleteId=${u.stravaConnection.athleteId}, athleteName=${u.stravaConnection.athleteName}`);
    } else {
      console.log(`  Strava Conn: None`);
    }
  }

  console.log('\n=== 2. DANH SÁCH ACTIVITIES TRONG POSTGRESQL ===');
  const activities = await prisma.activity.findMany({
    orderBy: { startDate: 'desc' },
  });
  console.log(`Tổng số activities: ${activities.length}`);
  for (const a of activities) {
    console.log(`- [${a.id}] extId=${a.externalId} | userId=${a.userId} | name="${a.name}" | dist=${a.distanceMeters}m (${a.validDistanceKm}km) | date=${a.startDate?.toISOString?.() || a.startDate} | status=${a.antiCheatStatus}`);
  }

  console.log('\n=== 3. DANH SÁCH PARTICIPATIONS TRONG POSTGRESQL ===');
  const participations = await prisma.eventParticipation.findMany({
    include: { category: true, raceKitOrder: true, user: true },
  });
  for (const p of participations) {
    console.log(`- [${p.id}] eventId=${p.eventId} | userId=${p.userId} (${p.user?.fullName}) | bib=${p.bibNumber} | cat=${p.category?.name} (${p.category?.targetDistanceKm}km) | validKm=${p.validRawDistanceKm}`);
  }
}

main()
  .catch((e) => {
    console.error('Lỗi kiểm tra:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

