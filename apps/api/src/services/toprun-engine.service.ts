import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  ActivityEvaluationResult,
  ActivitySource,
  AntiCheatStatus,
  ChallengeConditionType,
  DualGoalProgressSummary,
  EBibConfig,
  EBibTheme,
  EventRuleConfigSchema,
  EventStatus,
   EventType,
  FulfillmentStatus,
  RawActivityInput,
  RunMode,
  SportType,
  UserRole,
  calculateDualGoalProgress,
  encodePolyline,
  evaluateActivitySplits,
  formatPace,
  parseGpxToActivityInput,
  roundKm,
} from '@toprun/shared';
import { generateEBibSvg, generateECertificateSvg } from './certificate.service';
import { prisma } from '@toprun/database';

// ============================================================================
// INTERFACES DỮ LIỆU ĐẦY ĐỦ TRONG HỆ THỐNG
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  departmentOrUnit: string;
  role: UserRole;
  totalDistanceKm: number;
  totalActivities: number;
  pr5kSec: number | null;
  pr10kSec: number | null;
  pr21kSec: number | null;
  pr42kSec: number | null;
  stravaConnected: boolean;
  stravaAthleteId: string | null;
  stravaUsername: string | null;
  lastStravaSyncAt: string | null;
}

export interface StoredActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userDepartment: string;
  source: ActivitySource;
  externalId: string;
  name: string;
  sportType: SportType | string;
  startDateIso: string;
  rawDistanceKm: number;
  validDistanceKm: number;
  invalidDistanceKm: number;
  movingTimeSec: number;
  elapsedTimeSec: number;
  avgPaceSecPerKm: number;
  formattedPace: string;
  totalElevationGainMeters: number;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  averageCadenceSpm: number | null;
  calories: number;
  mapPolyline: string;
  deviceName: string;
  isManual: boolean;
  isHidden?: boolean;
  antiCheatStatus: AntiCheatStatus;
  flagReasons: string[];
  adminReviewNote?: string | null;
  splits: Array<{
    splitIndex: number;
    distanceMeters: number;
    movingTimeSec: number;
    paceSecPerKm: number;
    formattedPace: string;
    elevationDiffMeters: number;
    averageHeartrate: number | null;
    isValid: boolean;
    invalidReason: string | null;
  }>;
  kudosCount: number;
  kudoedByUserIds: string[];
  comments: Array<{
    id: string;
    userId: string;
    userName: string;
    content: string;
    createdAtIso: string;
  }>;
  eventContributions: Array<{
    eventId: string;
    eventTitle: string;
    validDistanceKm: number;
    appliedMultiplier: number;
    multiplierReason: string | null;
    finalCountedDistanceKm: number;
  }>;
}

export interface StoredEvent {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  bannerUrl: string;
  eventType: EventType;
  runMode: RunMode;
  status: EventStatus;
  startDateIso: string;
  endDateIso: string;
  creatorId: string;
  participantCount: number;
  ruleConfig: ReturnType<typeof EventRuleConfigSchema.parse>;
  bibPrefix?: string;
  categories: Array<{
    id: string;
    name: string;
    targetDistanceKm: number;
    bibPrefix: string;
  }>;
  challengeTiers: Array<{
    id: string;
    tierName: string;
    tierLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'SPECIAL';
    conditionType: ChallengeConditionType;
    thresholdValue: number;
    targetSpeedDistanceKm?: number;
    minDailyDistanceKm?: number;
    awardBadgeUrl: string;
    rewardDescription: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
    memberCount: number;
    totalValidDistanceKm: number;
    totalMultipliedDistanceKm: number;
  }>;
  ebibConfig?: EBibConfig;
}

export interface StoredParticipation {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userDepartment: string;
  categoryId: string;
  categoryName: string;
  targetDistanceKm: number;
  teamId: string | null;
  teamName: string | null;
  bibNumber: string;
  selectedChallengeTierIds?: string[];
  joinedAtIso: string;
  dualGoalProgress: DualGoalProgressSummary;
  raceKitOrder: {
    id: string;
    shirtSize: string;
    medalEngravingName: string;
    recipientName: string;
    phone: string;
    shippingAddress: string;
    fulfillmentStatus: FulfillmentStatus;
    shippingProvider: string | null;
    trackingCode: string | null;
  };
}

export interface StoredClub {
  id: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  totalDistanceKm: number;
  inviteCode: string;
  members: Array<{
    userId: string;
    fullName: string;
    department: string;
    role: string;
    totalDistanceKm: number;
  }>;
}

// ============================================================================
// CORE ENGINE SERVICE
// ============================================================================

@Injectable()
export class TopRunEngineService implements OnModuleInit {
  private users: UserProfile[] = [];
  private activities: StoredActivity[] = [];
  private events: StoredEvent[] = [];
  private participations: StoredParticipation[] = [];
  private clubs: StoredClub[] = [];
  private notifications: Array<{
    id: string;
    userId: string;
    title: string;
    body: string;
    type: string;
    createdAtIso: string;
    isRead: boolean;
  }> = [];

  private stravaConfig = {
    clientId: process.env.STRAVA_CLIENT_ID || '292007',
    clientSecret: process.env.STRAVA_CLIENT_SECRET || '54eb7308f454c98fb5e452edb41f1108afb66b10',
    accessToken: process.env.STRAVA_ACCESS_TOKEN || 'ccba19beaffea3cb04a15793c809d5cc85fc3135',
    refreshToken: process.env.STRAVA_REFRESH_TOKEN || '79d8109794a6b4c3dfe0a330c5bbcee939f81b15',
    redirectUri: process.env.STRAVA_REDIRECT_URI || 'http://localhost:4000/api/v1/strava/callback',
  };

  private deletedExternalIds = new Set<string>();

  private getDataFilePath(): string {
    if (process.env.DATA_DIR) {
      try {
        if (!fs.existsSync(process.env.DATA_DIR)) {
          fs.mkdirSync(process.env.DATA_DIR, { recursive: true });
        }
      } catch {}
      return path.resolve(process.env.DATA_DIR, 'toprun-engine-state.json');
    }
    const candidates = [
      path.resolve(process.cwd(), 'data'),
      path.resolve(process.cwd(), '../../data'),
      path.resolve(process.cwd(), '../data'),
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) {
        return path.resolve(dir, 'toprun-engine-state.json');
      }
    }
    const fallbackDir = path.resolve(process.cwd(), 'data');
    try {
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
    } catch {}
    return path.resolve(fallbackDir, 'toprun-engine-state.json');
  }

  private getCacheFilePath(): string {
    const p1 = path.resolve(process.cwd(), '.strava-activities-cache.json');
    if (fs.existsSync(p1)) return p1;
    const p2 = path.resolve(process.cwd(), 'apps/api/.strava-activities-cache.json');
    if (fs.existsSync(p2)) return p2;
    return p1;
  }

  private saveActivitiesCache() {
    try {
      const targetPath = this.getCacheFilePath();
      fs.writeFileSync(targetPath, JSON.stringify(this.activities, null, 2), 'utf8');
    } catch {
      // Ignore write error
    }
  }

  public saveEngineState() {
    try {
      const filePath = this.getDataFilePath();
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        version: 1,
        lastSavedAt: new Date().toISOString(),
        events: this.events,
        participations: this.participations,
        activities: this.activities,
        deletedExternalIds: Array.from(this.deletedExternalIds),
        users: this.users,
        clubs: this.clubs,
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      this.saveActivitiesCache();
    } catch (err) {
      console.error('[TopRunEngine] Error saving persistent state:', err);
    }
  }

  private loadPersistentState() {
    try {
      const filePath = this.getDataFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const state = JSON.parse(raw);
        if (Array.isArray(state.events) && state.events.length > 0) {
          this.events = state.events;
        }
        if (Array.isArray(state.participations) && state.participations.length > 0) {
          this.participations = state.participations;
        }
        if (Array.isArray(state.activities) && state.activities.length > 0) {
          this.activities = state.activities;
        }
        if (Array.isArray(state.deletedExternalIds)) {
          this.deletedExternalIds = new Set(state.deletedExternalIds);
        }
        if (Array.isArray(state.users) && state.users.length > 0) {
          this.users = state.users;
        }
        if (Array.isArray(state.clubs) && state.clubs.length > 0) {
          this.clubs = state.clubs;
        }
        console.log(
          `[TopRunEngine] Đã nạp dữ liệu bền vững từ: ${filePath} (${this.events.length} giải đấu, ${this.participations.length} lượt tham gia, ${this.activities.length} tracklogs).`
        );
      } else {
        // Lần chạy đầu tiên: Lưu dữ liệu seed mẫu ra đĩa để vĩnh viễn không bị mất dữ liệu
        this.saveEngineState();
      }
    } catch (err) {
      console.error('[TopRunEngine] Lỗi nạp dữ liệu persistent state:', err);
    }
  }

  constructor() {
    this.seedInitialData();
    this.loadCachedStravaActivities();
    this.loadPersistentState();
  }

  async onModuleInit() {
    await this.syncAndHydrateWithDatabase();
  }

  /**
   * Đồng bộ hai chiều giữa In-Memory Cache và PostgreSQL (Prisma).
   * Đảm bảo tính toàn vẹn dữ liệu, hỗ trợ đa session và không mất dữ liệu khi restart.
   */
  async syncAndHydrateWithDatabase() {
    try {
      console.log('🔄 [TopRunEngine] Đang đồng bộ và hydrate dữ liệu với PostgreSQL...');

      // 1. Đồng bộ bảng Users
      await this.syncUsersWithDatabase();

      // 2. Đồng bộ bảng Events, Categories, ChallengeTiers, Teams
      await this.syncEventsWithDatabase();

      // 3. Đồng bộ bảng Participations & RaceKitOrders
      await this.syncParticipationsWithDatabase();

      // 4. Đồng bộ bảng Activities & Splits
      await this.syncActivitiesWithDatabase();

      // 5. Đồng bộ bảng Clubs
      await this.syncClubsWithDatabase();

      console.log(
        `✅ [TopRunEngine] Đồng bộ PostgreSQL hoàn tất! (${this.events.length} giải đấu, ${this.participations.length} lượt tham gia, ${this.activities.length} tracklogs, ${this.users.length} vận động viên).`
      );
    } catch (err) {
      console.error('❌ [TopRunEngine] Lỗi đồng bộ PostgreSQL:', err);
    }
  }

  private async syncUsersWithDatabase() {
    try {
      for (const u of this.users) {
        try {
          await prisma.user.upsert({
            where: { id: u.id },
            update: {
              fullName: u.fullName,
              avatarUrl: u.avatarUrl,
              departmentOrUnit: u.departmentOrUnit,
              totalDistanceKm: u.totalDistanceKm,
              totalActivities: u.totalActivities,
            },
            create: {
              id: u.id,
              email: u.email || `${u.id}@toprun.vn`,
              fullName: u.fullName,
              avatarUrl: u.avatarUrl,
              departmentOrUnit: u.departmentOrUnit,
              role: u.role,
              totalDistanceKm: u.totalDistanceKm,
              totalActivities: u.totalActivities,
            },
          });
        } catch {}
      }

      const dbUsers = await prisma.user.findMany();
      if (dbUsers.length > 0) {
        const dbConns = await prisma.stravaConnection.findMany().catch(() => []);
        this.users = dbUsers.map((dbU) => {
          const conn = dbConns.find((c) => c.userId === dbU.id);
          return {
            id: dbU.id,
            email: dbU.email,
            fullName: dbU.fullName,
            avatarUrl:
              dbU.avatarUrl ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(dbU.email)}`,
            gender: (dbU.gender as any) || 'MALE',
            departmentOrUnit: dbU.departmentOrUnit || 'Runner Community',
            role: dbU.role as any as UserRole,
            totalDistanceKm: dbU.totalDistanceKm,
            totalActivities: dbU.totalActivities,
            pr5kSec: dbU.pr5kSec,
            pr10kSec: dbU.pr10kSec,
            pr21kSec: dbU.pr21kSec,
            pr42kSec: dbU.pr42kSec,
            stravaConnected: Boolean(conn?.isActive),
            stravaAthleteId: conn?.athleteId || null,
            stravaUsername: conn?.username || null,
            lastStravaSyncAt: conn?.lastSyncAt ? conn.lastSyncAt.toISOString() : null,
          };
        });
      }
    } catch (err) {
      console.warn('[TopRunEngine] Lỗi đồng bộ users với DB:', err);
    }
  }

  private async syncEventsWithDatabase() {
    try {
      const dbCount = await prisma.event.count();
      if (dbCount === 0 || dbCount < this.events.length) {
        for (const ev of this.events) {
          await this.persistEventToDb(ev);
        }
      }

      const dbEvents = await prisma.event.findMany({
        include: {
          categories: true,
          challengeTiers: true,
          teams: true,
        },
      });

      if (dbEvents.length > 0) {
        this.events = dbEvents.map((e) => ({
          id: e.id,
          slug: e.slug,
          title: e.title,
          subtitle: e.subtitle || '',
          description: e.description,
          bannerUrl: e.bannerUrl || '',
          eventType: e.eventType as any,
          runMode: e.runMode as any,
          status: e.status as any,
          startDateIso: e.startDate.toISOString(),
          endDateIso: e.endDate.toISOString(),
          creatorId: e.creatorId,
          participantCount: e.participantCount,
          ruleConfig: e.ruleConfig as any,
          ebibConfig: (e.ebibConfig as any) || undefined,
          bibPrefix: (e as any).bibPrefix || 'PRO-',
          categories: e.categories.map((c) => ({
            id: c.id,
            name: c.name,
            targetDistanceKm: c.targetDistanceKm,
            bibPrefix: (e as any).bibPrefix || c.bibPrefix || 'PRO-',
          })),
          challengeTiers: e.challengeTiers.map((t) => ({
            id: t.id,
            tierName: t.tierName,
            tierLevel: t.tierLevel as any,
            conditionType: t.conditionType as any,
            thresholdValue: t.thresholdValue,
            targetSpeedDistanceKm: (t as any).targetSpeedDistanceKm ?? undefined,
            minDailyDistanceKm: t.minDailyDistanceKm ?? 2.0,
            awardBadgeUrl: t.awardBadgeUrl,
            rewardDescription: t.rewardDescription,
          })),
          teams: e.teams.map((tm) => ({
            id: tm.id,
            name: tm.name,
            memberCount: tm.memberCount,
            totalValidDistanceKm: tm.totalValidDistanceKm,
            totalMultipliedDistanceKm: tm.totalMultipliedDistanceKm,
          })),
        }));
      }
    } catch (err) {
      console.warn('[TopRunEngine] Lỗi đồng bộ events với DB:', err);
    }
  }

  async persistEventToDb(ev: StoredEvent) {
    try {
      const creatorId = this.users.some((u) => u.id === ev.creatorId)
        ? ev.creatorId
        : this.users[0]?.id || 'usr_admin_01';

      await prisma.event.upsert({
        where: { id: ev.id },
        update: {
          title: ev.title,
          subtitle: ev.subtitle,
          description: ev.description,
          bannerUrl: ev.bannerUrl,
          eventType: ev.eventType as any,
          runMode: ev.runMode as any,
          status: ev.status as any,
          startDate: new Date(ev.startDateIso),
          endDate: new Date(ev.endDateIso),
          ruleConfig: ev.ruleConfig as any,
          ebibConfig: (ev.ebibConfig as any) || null,
          bibPrefix: (ev as any).bibPrefix || 'PRO-',
          participantCount: ev.participantCount,
        },
        create: {
          id: ev.id,
          slug: ev.slug,
          title: ev.title,
          subtitle: ev.subtitle,
          description: ev.description,
          bannerUrl: ev.bannerUrl,
          eventType: ev.eventType as any,
          runMode: ev.runMode as any,
          status: ev.status as any,
          startDate: new Date(ev.startDateIso),
          endDate: new Date(ev.endDateIso),
          ruleConfig: ev.ruleConfig as any,
          ebibConfig: (ev.ebibConfig as any) || null,
          bibPrefix: (ev as any).bibPrefix || 'PRO-',
          creatorId,
          participantCount: ev.participantCount,
        },
      });

      for (const cat of ev.categories) {
        await prisma.eventCategory.upsert({
          where: { id: cat.id },
          update: {
            name: cat.name,
            targetDistanceKm: cat.targetDistanceKm,
            bibPrefix: cat.bibPrefix,
          },
          create: {
            id: cat.id,
            eventId: ev.id,
            name: cat.name,
            targetDistanceKm: cat.targetDistanceKm,
            bibPrefix: cat.bibPrefix,
          },
        });
      }

      for (const tier of ev.challengeTiers) {
        await prisma.eventChallengeTier.upsert({
          where: { id: tier.id },
          update: {
            tierName: tier.tierName,
            tierLevel: tier.tierLevel,
            conditionType: tier.conditionType as any,
            thresholdValue: tier.thresholdValue,
            targetSpeedDistanceKm: tier.targetSpeedDistanceKm ? Number(tier.targetSpeedDistanceKm) : null,
            minDailyDistanceKm: tier.minDailyDistanceKm ?? 2.0,
            awardBadgeUrl: tier.awardBadgeUrl,
            rewardDescription: tier.rewardDescription,
          },
          create: {
            id: tier.id,
            eventId: ev.id,
            tierName: tier.tierName,
            tierLevel: tier.tierLevel,
            conditionType: tier.conditionType as any,
            thresholdValue: tier.thresholdValue,
            targetSpeedDistanceKm: tier.targetSpeedDistanceKm ? Number(tier.targetSpeedDistanceKm) : null,
            minDailyDistanceKm: tier.minDailyDistanceKm ?? 2.0,
            awardBadgeUrl: tier.awardBadgeUrl,
            rewardDescription: tier.rewardDescription,
          },
        });
      }

      for (const tm of ev.teams) {
        await prisma.eventTeam.upsert({
          where: { id: tm.id },
          update: {
            name: tm.name,
            memberCount: tm.memberCount,
            totalValidDistanceKm: tm.totalValidDistanceKm,
            totalMultipliedDistanceKm: tm.totalMultipliedDistanceKm,
          },
          create: {
            id: tm.id,
            eventId: ev.id,
            name: tm.name,
            memberCount: tm.memberCount,
            totalValidDistanceKm: tm.totalValidDistanceKm,
            totalMultipliedDistanceKm: tm.totalMultipliedDistanceKm,
          },
        });
      }
    } catch (err) {
      console.warn(`[TopRunEngine] Lỗi lưu Event ${ev.id} vào DB:`, err);
    }
  }

  private async syncParticipationsWithDatabase() {
    try {
      const dbCount = await prisma.eventParticipation.count();
      if (dbCount === 0 || dbCount < this.participations.length) {
        for (const p of this.participations) {
          await this.persistParticipationToDb(p);
        }
      }

      const dbParts = await prisma.eventParticipation.findMany({
        include: {
          raceKitOrder: true,
          awardsUnlocked: true,
          category: true,
          team: true,
          user: true,
          event: true,
        },
      });

      if (dbParts.length > 0) {
        this.participations = dbParts.map((dp) => {
          const ev = this.events.find((e) => e.id === dp.eventId);
          const cat = ev?.categories.find((c) => c.id === dp.categoryId);

          return {
            id: dp.id,
            eventId: dp.eventId,
            userId: dp.userId,
            userName: dp.user.fullName,
            userAvatar: dp.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dp.userId}`,
            userDepartment: dp.user.departmentOrUnit || 'Runner Community',
            categoryId: dp.categoryId,
            categoryName: dp.category?.name || cat?.name || 'Mục tiêu Finisher',
            targetDistanceKm: dp.category?.targetDistanceKm || cat?.targetDistanceKm || 50,
            teamId: dp.teamId,
            teamName: dp.team?.name || null,
            bibNumber: dp.bibNumber,
            selectedChallengeTierIds: Array.isArray(dp.selectedChallengeTierIds)
              ? (dp.selectedChallengeTierIds as string[])
              : [],
            joinedAtIso: dp.joinedAt.toISOString(),
            dualGoalProgress: calculateDualGoalProgress({
              runMode: (ev?.runMode as any) || RunMode.ACCUMULATIVE,
              targetCategory: {
                id: dp.categoryId,
                name: dp.category?.name || 'Target',
                targetDistanceKm: dp.category?.targetDistanceKm || 50,
                bibPrefix: dp.bibNumber.split('-')[0] + '-' || 'TOP-',
              },
              challengeTiers: ev?.challengeTiers || [],
              activityLogs: [],
              previouslyCompletedTargetAtIso: dp.targetCompletedAt ? dp.targetCompletedAt.toISOString() : undefined,
            }),
            raceKitOrder: {
              id: dp.raceKitOrder?.id || `ord_${dp.id}`,
              shirtSize: dp.raceKitOrder?.shirtSize || 'L',
              medalEngravingName: dp.raceKitOrder?.medalEngravingName || dp.user.fullName,
              recipientName: dp.raceKitOrder?.recipientName || dp.user.fullName,
              phone: dp.raceKitOrder?.phone || '0909123456',
              shippingAddress: dp.raceKitOrder?.shippingAddress || 'Chưa cập nhật',
              fulfillmentStatus: (dp.raceKitOrder?.fulfillmentStatus as any) || FulfillmentStatus.PENDING_TARGET,
              shippingProvider: dp.raceKitOrder?.shippingProvider || null,
              trackingCode: dp.raceKitOrder?.trackingCode || null,
            },
          };
        });
      }
    } catch (err) {
      console.warn('[TopRunEngine] Lỗi đồng bộ participations với DB:', err);
    }
  }

  async persistParticipationToDb(p: StoredParticipation) {
    try {
      const evExists = await prisma.event.findUnique({ where: { id: p.eventId } });
      const userExists = await prisma.user.findUnique({ where: { id: p.userId } });
      if (!evExists || !userExists) return;

      const catExists = await prisma.eventCategory.findUnique({ where: { id: p.categoryId } });
      if (!catExists) {
        await prisma.eventCategory.create({
          data: {
            id: p.categoryId,
            eventId: p.eventId,
            name: p.categoryName || 'Mục tiêu Finisher',
            targetDistanceKm: p.targetDistanceKm || 50,
            bibPrefix: p.bibNumber.split('-')[0] + '-' || 'TOP-',
          },
        });
      }

      await prisma.eventParticipation.upsert({
        where: {
          eventId_userId: {
            eventId: p.eventId,
            userId: p.userId,
          },
        },
        update: {
          bibNumber: p.bibNumber,
          categoryId: p.categoryId,
          teamId: p.teamId || null,
          selectedChallengeTierIds: (p.selectedChallengeTierIds || []) as any,
          validRawDistanceKm: p.dualGoalProgress.target.currentRawDistanceKm,
          validMultipliedDistanceKm: p.dualGoalProgress.target.currentMultipliedDistanceKm,
          targetProgressPct: p.dualGoalProgress.target.progressPercentage,
          isTargetCompleted: p.dualGoalProgress.target.isCompleted,
          targetCompletedAt: p.dualGoalProgress.target.completedAtIso
            ? new Date(p.dualGoalProgress.target.completedAtIso)
            : null,
        },
        create: {
          id: p.id,
          eventId: p.eventId,
          userId: p.userId,
          categoryId: p.categoryId,
          teamId: p.teamId || null,
          bibNumber: p.bibNumber,
          selectedChallengeTierIds: (p.selectedChallengeTierIds || []) as any,
          validRawDistanceKm: p.dualGoalProgress.target.currentRawDistanceKm,
          validMultipliedDistanceKm: p.dualGoalProgress.target.currentMultipliedDistanceKm,
          targetProgressPct: p.dualGoalProgress.target.progressPercentage,
          isTargetCompleted: p.dualGoalProgress.target.isCompleted,
          targetCompletedAt: p.dualGoalProgress.target.completedAtIso
            ? new Date(p.dualGoalProgress.target.completedAtIso)
            : null,
          joinedAt: new Date(p.joinedAtIso),
        },
      });

      if (p.raceKitOrder) {
        await prisma.raceKitOrder.upsert({
          where: { participationId: p.id },
          update: {
            shirtSize: p.raceKitOrder.shirtSize,
            medalEngravingName: p.raceKitOrder.medalEngravingName,
            recipientName: p.raceKitOrder.recipientName,
            phone: p.raceKitOrder.phone,
            shippingAddress: p.raceKitOrder.shippingAddress,
            fulfillmentStatus: p.raceKitOrder.fulfillmentStatus as any,
            shippingProvider: p.raceKitOrder.shippingProvider,
            trackingCode: p.raceKitOrder.trackingCode,
          },
          create: {
            id: p.raceKitOrder.id || `ord_${p.id}`,
            participationId: p.id,
            shirtSize: p.raceKitOrder.shirtSize,
            medalEngravingName: p.raceKitOrder.medalEngravingName,
            recipientName: p.raceKitOrder.recipientName,
            phone: p.raceKitOrder.phone,
            shippingAddress: p.raceKitOrder.shippingAddress,
            fulfillmentStatus: p.raceKitOrder.fulfillmentStatus as any,
            shippingProvider: p.raceKitOrder.shippingProvider,
            trackingCode: p.raceKitOrder.trackingCode,
          },
        });
      }
    } catch (err) {
      console.warn(`[TopRunEngine] Lỗi lưu Participation ${p.id} vào DB:`, err);
    }
  }

  private async syncActivitiesWithDatabase() {
    try {
      const dbCount = await prisma.activity.count();
      if (dbCount === 0 || dbCount < this.activities.length) {
        for (const act of this.activities) {
          await this.persistActivityToDb(act);
        }
      }

      const dbActivities = await prisma.activity.findMany({
        include: {
          splits: { orderBy: { splitIndex: 'asc' } },
          kudos: true,
          comments: true,
          user: true,
        },
        orderBy: { startDate: 'desc' },
      });

      if (dbActivities.length > 0) {
        this.activities = dbActivities.map((da) => ({
          id: da.id,
          userId: da.userId,
          userName: da.user.fullName,
          userAvatar: da.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${da.userId}`,
          userDepartment: da.user.departmentOrUnit || 'Runner Community',
          source: da.source as any,
          externalId: da.externalId,
          name: da.name,
          sportType: da.sportType,
          startDateIso: da.startDate.toISOString(),
          rawDistanceKm: roundKm(da.distanceMeters / 1000),
          validDistanceKm: da.validDistanceKm,
          invalidDistanceKm: roundKm(Math.max(0, da.distanceMeters / 1000 - da.validDistanceKm)),
          movingTimeSec: da.movingTimeSec,
          elapsedTimeSec: da.elapsedTimeSec,
          avgPaceSecPerKm: da.avgPaceSecPerKm,
          formattedPace: formatPace(da.avgPaceSecPerKm),
          totalElevationGainMeters: da.totalElevationGain,
          averageHeartrate: da.avgHeartrate,
          maxHeartrate: da.maxHeartrate,
          averageCadenceSpm: da.avgCadenceSpm,
          calories: da.calories || Math.round(da.validDistanceKm * 68),
          mapPolyline: da.mapPolyline || '',
          deviceName: da.deviceName || 'Strava Sync',
          isManual: da.isManual,
          isHidden: da.isHidden,
          antiCheatStatus: da.antiCheatStatus as any,
          flagReasons: Array.isArray(da.flagReasons) ? (da.flagReasons as string[]) : [],
          adminReviewNote: da.adminReviewNote,
          splits: da.splits.map((sp) => ({
            splitIndex: sp.splitIndex,
            distanceMeters: sp.distanceMeters,
            movingTimeSec: sp.movingTimeSec,
            paceSecPerKm: sp.paceSecPerKm,
            formattedPace: formatPace(sp.paceSecPerKm),
            elevationDiffMeters: sp.elevationDiffMeters,
            averageHeartrate: sp.avgHeartrate,
            isValid: sp.isValid,
            invalidReason: sp.invalidReason,
          })),
          kudosCount: da.kudosCount || da.kudos.length,
          kudoedByUserIds: da.kudos.map((k) => k.userId),
          comments: da.comments.map((cm) => ({
            id: cm.id,
            userId: cm.userId,
            userName: this.users.find((u) => u.id === cm.userId)?.fullName || 'Runner',
            content: cm.content,
            createdAtIso: cm.createdAt.toISOString(),
          })),
          eventContributions: [],
        }));
      }
    } catch (err) {
      console.warn('[TopRunEngine] Lỗi đồng bộ activities với DB:', err);
    }
  }

  async persistActivityToDb(act: StoredActivity) {
    try {
      const userExists = await prisma.user.findUnique({ where: { id: act.userId } });
      if (!userExists) return;

      const savedAct = await prisma.activity.upsert({
        where: {
          source_externalId: {
            source: act.source as any,
            externalId: act.externalId,
          },
        },
        update: {
          name: act.name,
          sportType: String(act.sportType),
          validDistanceKm: act.validDistanceKm,
          movingTimeSec: act.movingTimeSec,
          elapsedTimeSec: act.elapsedTimeSec,
          avgPaceSecPerKm: act.avgPaceSecPerKm,
          totalElevationGain: act.totalElevationGainMeters,
          avgHeartrate: act.averageHeartrate,
          maxHeartrate: act.maxHeartrate,
          avgCadenceSpm: act.averageCadenceSpm,
          calories: act.calories,
          mapPolyline: act.mapPolyline,
          deviceName: act.deviceName,
          isManual: act.isManual,
          isHidden: act.isHidden ?? false,
          antiCheatStatus: act.antiCheatStatus as any,
          flagReasons: (act.flagReasons || []) as any,
          adminReviewNote: act.adminReviewNote,
        },
        create: {
          id: act.id,
          userId: act.userId,
          source: act.source as any,
          externalId: act.externalId,
          name: act.name,
          sportType: String(act.sportType),
          startDate: new Date(act.startDateIso),
          distanceMeters: act.rawDistanceKm * 1000,
          validDistanceKm: act.validDistanceKm,
          movingTimeSec: act.movingTimeSec,
          elapsedTimeSec: act.elapsedTimeSec,
          avgPaceSecPerKm: act.avgPaceSecPerKm,
          totalElevationGain: act.totalElevationGainMeters,
          avgHeartrate: act.averageHeartrate,
          maxHeartrate: act.maxHeartrate,
          avgCadenceSpm: act.averageCadenceSpm,
          calories: act.calories,
          mapPolyline: act.mapPolyline,
          deviceName: act.deviceName,
          isManual: act.isManual,
          isHidden: act.isHidden ?? false,
          antiCheatStatus: act.antiCheatStatus as any,
          flagReasons: (act.flagReasons || []) as any,
          adminReviewNote: act.adminReviewNote,
        },
      });

      if (act.splits && act.splits.length > 0) {
        await prisma.activitySplit.deleteMany({ where: { activityId: savedAct.id } });
        await prisma.activitySplit.createMany({
          data: act.splits.map((sp) => ({
            activityId: savedAct.id,
            splitIndex: sp.splitIndex,
            distanceMeters: sp.distanceMeters,
            movingTimeSec: sp.movingTimeSec,
            paceSecPerKm: sp.paceSecPerKm,
            elevationDiffMeters: sp.elevationDiffMeters || 0,
            avgHeartrate: sp.averageHeartrate,
            isValid: sp.isValid,
            invalidReason: sp.invalidReason,
          })),
        });
      }
    } catch (err) {
      console.warn(`[TopRunEngine] Lỗi lưu Activity ${act.id} vào DB:`, err);
    }
  }

  async deleteActivityFromDb(actId: string) {
    try {
      await prisma.activity.delete({ where: { id: actId } }).catch(() => {});
    } catch {}
  }

  async deleteEventFromDb(eventId: string) {
    try {
      await prisma.event.delete({ where: { id: eventId } }).catch(() => {});
    } catch {}
  }

  private async syncClubsWithDatabase() {
    try {
      const dbClubs = await prisma.club.findMany({
        include: { members: { include: { user: true } } },
      });
      if (dbClubs.length === 0 && this.clubs.length > 0) {
        for (const cl of this.clubs) {
          await prisma.club.upsert({
            where: { slug: cl.slug },
            update: {
              name: cl.name,
              description: cl.description,
              totalDistanceKm: cl.totalDistanceKm,
              memberCount: cl.memberCount,
            },
            create: {
              id: cl.id,
              slug: cl.slug,
              name: cl.name,
              description: cl.description,
              totalDistanceKm: cl.totalDistanceKm,
              memberCount: cl.memberCount,
              inviteCode: cl.inviteCode,
            },
          }).catch(() => {});
        }
      }
    } catch {}
  }

  private loadCachedStravaActivities() {
    try {
      const targetPath = this.getCacheFilePath();
      if (fs.existsSync(targetPath)) {
        const cached: StoredActivity[] = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
        if (Array.isArray(cached) && cached.length > 0) {
          this.activities = cached;
          this.recalculateUserParticipation('usr_admin_01');
        }
      }
    } catch {
      // Fallback to seeded data
    }
  }

  getStravaConfig() {
    return {
      clientId: this.stravaConfig.clientId,
      redirectUri: this.stravaConfig.redirectUri,
      hasAccessToken: Boolean(this.stravaConfig.accessToken),
    };
  }

  /**
   * Đổi OAuth2 `code` từ Strava Callback sang Access Token & Refresh Token có đầy đủ quyền `activity:read_all`
   */
  async exchangeStravaCode(code: string, userId = 'usr_admin_01') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.stravaConfig.clientId,
        client_secret: this.stravaConfig.clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new BadRequestException(`Lỗi xác thực Strava OAuth2: ${errText}`);
    }

    const tokenData: any = await response.json();
    this.stravaConfig.accessToken = tokenData.access_token;
    this.stravaConfig.refreshToken = tokenData.refresh_token;

    const user = this.users.find((u) => u.id === userId) || this.users[0];
    if (tokenData.athlete) {
      user.stravaConnected = true;
      user.stravaAthleteId = String(tokenData.athlete.id);
      user.stravaUsername = tokenData.athlete.username || `${tokenData.athlete.firstname || ''} ${tokenData.athlete.lastname || ''}`.trim();
    }

    // Tự động đồng bộ ngay các hoạt động gần nhất sau khi cấp quyền thành công
    const syncRes = await this.syncLiveStravaActivities(user.id);
    return {
      athlete: tokenData.athlete,
      syncedCount: syncRes.syncedActivities.length,
      syncedActivities: syncRes.syncedActivities,
    };
  }

  /**
   * Gọi trực tiếp Strava API v3 (`GET /api/v3/athlete/activities` & `/api/v3/activities/:id`)
   * bằng Client ID 292007 và Token của bạn để kéo Tracklog thật về hệ thống
   */
  async syncLiveStravaActivities(userId = 'usr_admin_01') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    // 0. Đọc Token & Strava App được gán của User từ bảng strava_connections trong PostgreSQL
    let clientId = this.stravaConfig.clientId;
    let clientSecret = this.stravaConfig.clientSecret;

    try {
      const dbConn = await prisma.stravaConnection.findUnique({
        where: { userId },
        include: { stravaApp: true },
      });
      if (dbConn?.accessToken) {
        this.stravaConfig.accessToken = dbConn.accessToken;
      }
      if (dbConn?.refreshToken) {
        this.stravaConfig.refreshToken = dbConn.refreshToken;
      }
      if (dbConn?.stravaApp) {
        clientId = dbConn.stravaApp.clientId;
        clientSecret = dbConn.stravaApp.clientSecret;
      }
    } catch {
      // Fallback sang token cấu hình sẵn
    }

    // 1. Làm mới Access Token bằng Refresh Token với đúng App credentials đã phân bổ
    try {
      const refreshRes = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: this.stravaConfig.refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      if (refreshRes.ok) {
        const refreshed: any = await refreshRes.json();
        if (refreshed.access_token) this.stravaConfig.accessToken = refreshed.access_token;
        if (refreshed.refresh_token) this.stravaConfig.refreshToken = refreshed.refresh_token;

        await prisma.stravaConnection
          .update({
            where: { userId },
            data: {
              accessToken: refreshed.access_token,
              refreshToken: refreshed.refresh_token || undefined,
              expiresAt: Number(refreshed.expires_at || Math.floor(Date.now() / 1000) + 21600),
            },
          })
          .catch(() => {});
      }
    } catch {
      // Giữ nguyên accessToken hiện tại nếu refresh lỗi
    }

    // 2. Lấy thông tin Athlete thật từ Strava
    const athleteRes = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${this.stravaConfig.accessToken}` },
    });
    const athleteData: any = athleteRes.ok ? await athleteRes.json() : null;

    if (athleteData?.id) {
      const user = this.users.find((u) => u.id === userId) || this.users[0];
      user.stravaConnected = true;
      user.stravaAthleteId = String(athleteData.id);
      user.stravaUsername =
        athleteData.username || `${athleteData.firstname || ''} ${athleteData.lastname || ''}`.trim();
    }

    // 3. Lấy danh sách Activities từ Strava (yêu cầu scope activity:read hoặc activity:read_all)
    const actsRes = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=10', {
      headers: { Authorization: `Bearer ${this.stravaConfig.accessToken}` },
    });

    if (!actsRes.ok) {
      const errBody = await actsRes.text();
      return {
        status: 'REQUIRE_ACTIVITY_SCOPE',
        athlete: athleteData,
        message:
          'Token mặc định trên trang cài đặt Strava chỉ có phạm vi "read" (chỉ đọc hồ sơ). Hãy nhấn vào đường dẫn authorizeUrl bên dưới (1 click) để cấp quyền "activity:read_all" đọc toàn bộ Tracklog chạy bộ!',
        authorizeUrl: `https://www.strava.com/oauth/authorize?client_id=${this.stravaConfig.clientId}&response_type=code&redirect_uri=${encodeURIComponent(this.stravaConfig.redirectUri)}&approval_prompt=force&scope=read,activity:read_all&state=${userId}`,
        stravaError: errBody,
        syncedActivities: [],
      };
    }

    const stravaList: any[] = await actsRes.json();
    const syncedActivities: StoredActivity[] = [];

    for (const summaryAct of stravaList) {
      const extId = String(summaryAct.id);
      if (this.deletedExternalIds.has(extId) || this.activities.some((a) => a.externalId === extId)) {
        continue;
      }

      // Gọi chi tiết Activity để lấy splits_metric (từng km)
      let detailAct = summaryAct;
      try {
        const detailRes = await fetch(`https://www.strava.com/api/v3/activities/${summaryAct.id}`, {
          headers: { Authorization: `Bearer ${this.stravaConfig.accessToken}` },
        });
        if (detailRes.ok) {
          detailAct = await detailRes.json();
        }
      } catch {
        // Dùng summaryAct nếu không lấy được detail
      }

      const rawSplits = Array.isArray(detailAct.splits_metric)
        ? detailAct.splits_metric.map((sp: any, idx: number) => ({
            splitIndex: sp.split || idx + 1,
            distanceMeters: Math.round(Number(sp.distance || 1000) * 10) / 10,
            movingTimeSec: Number(sp.moving_time || sp.elapsed_time || 300),
            elevationDiffMeters: Math.round(Number(sp.elevation_difference || 0) * 10) / 10,
            averageHeartrate: sp.average_heartrate ? Math.round(Number(sp.average_heartrate)) : null,
          }))
        : [];

      const rawInput: RawActivityInput = {
        externalId: extId,
        name: detailAct.name || 'Strava Run',
        sportType: detailAct.sport_type || detailAct.type || SportType.RUN,
        startDateIso: detailAct.start_date || new Date().toISOString(),
        distanceMeters: Number(detailAct.distance || 0),
        movingTimeSec: Number(detailAct.moving_time || 0),
        elapsedTimeSec: Number(detailAct.elapsed_time || 0),
        totalElevationGainMeters: Number(detailAct.total_elevation_gain || 0),
        averageHeartrate: detailAct.average_heartrate ? Math.round(Number(detailAct.average_heartrate)) : null,
        maxHeartrate: detailAct.max_heartrate ? Math.round(Number(detailAct.max_heartrate)) : null,
        averageCadenceSpm: detailAct.average_cadence ? Math.round(Number(detailAct.average_cadence) * 2) : null,
        isManual: Boolean(detailAct.manual),
        mapPolyline: detailAct.map?.polyline || detailAct.map?.summary_polyline || null,
        splits: rawSplits,
      };

      const ingested = this.ingestAndScoreActivity(userId, rawInput, ActivitySource.STRAVA);
      syncedActivities.push(ingested.activity);
    }

    this.activities.sort((a, b) => new Date(b.startDateIso).getTime() - new Date(a.startDateIso).getTime());
    this.recalculateUserParticipation(userId);
    this.saveActivitiesCache();

    return {
      status: 'SUCCESS',
      athlete: athleteData,
      totalFetchedFromStrava: stravaList.length,
      newlySyncedCount: syncedActivities.length,
      syncedActivities,
      allActivities: this.activities,
    };
  }

  // --------------------------------------------------------------------------
  // 1. KHỞI TẠO DỮ LIỆU MẪU PHONG PHÚ (SẴN SÀNG DEMO NGAY LẬP TỨC)
  // --------------------------------------------------------------------------
  private seedInitialData() {
    // 1.1. Users
    this.users = [
      {
        id: 'usr_admin_01',
        email: 'admin@toprun.vn',
        fullName: 'Alan Hoàng (Admin & Runner)',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlanHoang',
        gender: 'MALE',
        departmentOrUnit: 'ASSA ABLOY Engineering',
        role: UserRole.ADMIN,
        totalDistanceKm: 184.5,
        totalActivities: 18,
        pr5kSec: 1290,  // 21:30
        pr10kSec: 2740, // 45:40
        pr21kSec: 6120, // 1:42:00
        pr42kSec: 13500,// 3:45:00
        stravaConnected: true,
        stravaAthleteId: '98812345',
        stravaUsername: 'alan_hoang_run',
        lastStravaSyncAt: '2026-10-29T06:30:00.000Z',
      },
      {
        id: 'usr_runner_02',
        email: 'minh.nguyen@toprun.vn',
        fullName: 'Nguyễn Tuấn Minh',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TuanMinh',
        gender: 'MALE',
        departmentOrUnit: 'Product & R&D Team',
        role: UserRole.RUNNER,
        totalDistanceKm: 245.8,
        totalActivities: 24,
        pr5kSec: 1180,
        pr10kSec: 2520,
        pr21kSec: 5640,
        pr42kSec: 12400,
        stravaConnected: true,
        stravaAthleteId: '98854321',
        stravaUsername: 'minh_marathoner',
        lastStravaSyncAt: '2026-10-29T05:45:00.000Z',
      },
      {
        id: 'usr_runner_03',
        email: 'lan.tran@toprun.vn',
        fullName: 'Trần Ngọc Lan',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NgocLan',
        gender: 'FEMALE',
        departmentOrUnit: 'Operations & Supply Chain',
        role: UserRole.RUNNER,
        totalDistanceKm: 162.0,
        totalActivities: 16,
        pr5kSec: 1410,
        pr10kSec: 2950,
        pr21kSec: 6540,
        pr42kSec: null,
        stravaConnected: true,
        stravaAthleteId: '98899999',
        stravaUsername: 'lan_runner_sg',
        lastStravaSyncAt: '2026-10-28T18:10:00.000Z',
      },
      {
        id: 'usr_runner_04',
        email: 'hung.le@toprun.vn',
        fullName: 'Lê Quốc Hùng',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=QuocHung',
        gender: 'MALE',
        departmentOrUnit: 'Sales & Commercial',
        role: UserRole.RUNNER,
        totalDistanceKm: 98.4,
        totalActivities: 11,
        pr5kSec: 1520,
        pr10kSec: 3180,
        pr21kSec: null,
        pr42kSec: null,
        stravaConnected: true,
        stravaAthleteId: '98877777',
        stravaUsername: 'hung_le_sales',
        lastStravaSyncAt: '2026-10-28T17:00:00.000Z',
      },
    ];

    // 1.2. Đường chạy Polyline mẫu quanh Hồ Xuân Hương / Sala Thủ Thiêm
    const samplePolylineSala = encodePolyline([
      { lat: 10.7721, lng: 106.7215 },
      { lat: 10.7755, lng: 106.7232 },
      { lat: 10.7789, lng: 106.7261 },
      { lat: 10.7812, lng: 106.7240 },
      { lat: 10.7798, lng: 106.7195 },
      { lat: 10.7760, lng: 106.7182 },
      { lat: 10.7725, lng: 106.7198 },
      { lat: 10.7721, lng: 106.7215 },
    ]);

    const samplePolylineWestLake = encodePolyline([
      { lat: 21.0431, lng: 105.8362 },
      { lat: 21.0512, lng: 105.8291 },
      { lat: 21.0625, lng: 105.8210 },
      { lat: 21.0710, lng: 105.8185 },
      { lat: 21.0680, lng: 105.8110 },
      { lat: 21.0550, lng: 105.8140 },
      { lat: 21.0450, lng: 105.8250 },
      { lat: 21.0431, lng: 105.8362 },
    ]);

    // 1.3. Events (Giải chạy Ảo Virtual Race & Thử thách Mini Challenge)
    this.events = [
      {
        id: 'evt_vr_2026',
        slug: 'toprun-autumn-virtual-race-2026',
        title: 'TOPRUN AUTUMN VIRTUAL RACE 2026 — BỨT PHÁ GIỚI HẠN',
        subtitle: 'Giải chạy tích lũy đa nền tảng đồng bộ Strava • Nhân đôi km Cuối Tuần (x2)',
        description:
          'Giải chạy ảo chính thức với cơ chế Chấm điểm 2 Tầng độc quyền: Hoàn thành Mốc TARGET đăng ký để nhận Huy chương Finisher thật & Chứng nhận điện tử (E-Cert); đồng thời chinh phục các Mốc CHALLENGE mở rộng (100KM, 150KM, Chuỗi 7 ngày liên tiếp) để mở khóa Bộ Huy Hiệu Danh Giá.',
        bannerUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=80',
        eventType: EventType.VIRTUAL_RACE,
        runMode: RunMode.ACCUMULATIVE,
        status: EventStatus.ACTIVE,
        startDateIso: '2026-10-01T00:00:00.000Z',
        endDateIso: '2026-11-30T23:59:59.000Z',
        creatorId: 'usr_admin_01',
        participantCount: 142,
        ruleConfig: EventRuleConfigSchema.parse({
          allowedSportTypes: [SportType.RUN, SportType.TRAIL_RUN, SportType.VIRTUAL_RUN],
          minPaceSecPerKm: 180, // 03:00 /km (Chặn xe máy)
          maxPaceSecPerKm: 900, // 15:00 /km
          minActivityDistanceKm: 1.0,
          minStepCadenceSpm: 120,
          requireHeartRate: false,
          allowSplitFiltering: true,
          weekendMultiplier: 1.0,
        }),
        categories: [
          { id: 'cat_target_30k', name: 'Mốc Target 30KM (Starter)', targetDistanceKm: 30, bibPrefix: 'TOP30-' },
          { id: 'cat_target_50k', name: 'Mốc Target 50KM (Finisher)', targetDistanceKm: 50, bibPrefix: 'TOP50-' },
          { id: 'cat_target_100k', name: 'Mốc Target 100KM (Pro Runner)', targetDistanceKm: 100, bibPrefix: 'TOP100-' },
        ],
        challengeTiers: [
          {
            id: 'tier_over_100k',
            tierName: 'Challenge Bạc: Vượt Ngưỡng 100KM',
            tierLevel: 'SILVER',
            conditionType: ChallengeConditionType.DISTANCE_OVERACHIEVE,
            thresholdValue: 100,
            awardBadgeUrl: '🥈',
            rewardDescription: 'Huy hiệu Chiến Binh Bạc 100KM + Áo Finisher phiên bản giới hạn',
          },
          {
            id: 'tier_over_150k',
            tierName: 'Challenge Vàng: Siêu Chiến Binh 150KM',
            tierLevel: 'GOLD',
            conditionType: ChallengeConditionType.DISTANCE_OVERACHIEVE,
            thresholdValue: 150,
            awardBadgeUrl: '🥇',
            rewardDescription: 'Huy hiệu Siêu Chiến Binh Vàng 150KM + Khắc tên Vàng lên Kỷ niệm chương',
          },
          {
            id: 'tier_streak_5d',
            tierName: 'Challenge Kỷ Luật Thép: Streak 5 Ngày Liên Tiếp',
            tierLevel: 'DIAMOND',
            conditionType: ChallengeConditionType.STREAK_DAYS,
            thresholdValue: 5,
            minDailyDistanceKm: 2.0,
            awardBadgeUrl: '💎',
            rewardDescription: 'Huy hiệu Kim Cương Kỷ Luật Thép (Chạy tối thiểu 2km mỗi ngày trong 5 ngày liên tục)',
          },
          {
            id: 'tier_longrun_15k',
            tierName: 'Challenge Bền Bỉ: Single Long Run >= 15KM',
            tierLevel: 'SPECIAL',
            conditionType: ChallengeConditionType.SINGLE_LONG_RUN,
            thresholdValue: 15,
            awardBadgeUrl: '🔥',
            rewardDescription: 'Huy hiệu Chinh Phục Long Run 15KM trong 1 buổi chạy duy nhất',
          },
        ],
        teams: [
          {
            id: 'team_eng_01',
            name: 'Khối Công Nghệ & R&D (Engineering)',
            memberCount: 18,
            totalValidDistanceKm: 312.4,
            totalMultipliedDistanceKm: 418.6,
          },
          {
            id: 'team_ops_02',
            name: 'Khối Vận Hành & Chuỗi Cung Ứng (Operations)',
            memberCount: 22,
            totalValidDistanceKm: 289.0,
            totalMultipliedDistanceKm: 375.2,
          },
          {
            id: 'team_sales_03',
            name: 'Khối Kinh Doanh & Thương Mại (Commercial)',
            memberCount: 16,
            totalValidDistanceKm: 215.5,
            totalMultipliedDistanceKm: 290.8,
          },
        ],
        ebibConfig: {
          theme: EBibTheme.MODERN_TITANIUM,
          primaryColor: '#FC4C02',
          slogan: 'BỨT PHÁ GIỚI HẠN • RUN TO CONQUER',
        },
      },
      {
        id: 'evt_mini_half_2026',
        slug: 'sunday-half-marathon-challenge',
        title: 'THỬ THÁCH CHỦ NHẬT: CHINH PHỤC 21KM SINGLE RUN',
        subtitle: 'Hoàn thành 21.1KM trong 1 buổi chạy duy nhất • Pace tối đa 08:30/km',
        description:
          'Thử thách Mini Challenge do CLB tạo cho các thành viên muốn kiểm tra thể lực Half Marathon cuối tuần.',
        bannerUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
        eventType: EventType.MINI_CHALLENGE,
        runMode: RunMode.SINGLE_RUN,
        status: EventStatus.ACTIVE,
        startDateIso: '2026-10-15T00:00:00.000Z',
        endDateIso: '2026-11-15T23:59:59.000Z',
        creatorId: 'usr_runner_02',
        participantCount: 38,
        ruleConfig: EventRuleConfigSchema.parse({
          allowedSportTypes: [SportType.RUN],
          minPaceSecPerKm: 180,
          maxPaceSecPerKm: 510, // 08:30 /km
          minActivityDistanceKm: 5.0,
          requireHeartRate: true,
          allowSplitFiltering: true,
          weekendMultiplier: 1.0,
        }),
        categories: [
          { id: 'cat_hm_21k', name: 'Mốc Target Half Marathon 21.1KM (1 Lần chạy)', targetDistanceKm: 21.1, bibPrefix: 'HM21-' },
        ],
        challengeTiers: [
          {
            id: 'tier_sub2',
            tierName: 'Challenge Sub-2h: Long Run >= 21.1KM',
            tierLevel: 'GOLD',
            conditionType: ChallengeConditionType.SINGLE_LONG_RUN,
            thresholdValue: 21.1,
            awardBadgeUrl: '⚡',
            rewardDescription: 'Huy hiệu Tốc Độ Half Marathon Finisher',
          },
        ],
        teams: [],
        ebibConfig: {
          theme: EBibTheme.NEON_CYBER,
          primaryColor: '#06B6D4',
          slogan: 'CYBER HALF MARATHON • SPEED UNLEASHED',
        },
      },
      {
        id: 'evt_winter_challenge_2026',
        slug: 'toprun-winter-trail-speed-2026',
        title: 'TOPRUN WINTER TRAIL & SPEED CHALLENGE 2026',
        subtitle: 'Thử thách sức bền mùa đông • Đăng ký tự do • Cuối tuần x1.5',
        description:
          'Giải chạy mùa đông tích lũy với đường chạy mở rộng, cự ly tối thiểu 2.0 km mỗi bài và áp dụng nhân hệ số cuối tuần x1.5.',
        bannerUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=80',
        eventType: EventType.VIRTUAL_RACE,
        runMode: RunMode.ACCUMULATIVE,
        status: EventStatus.ACTIVE,
        startDateIso: '2026-10-15T00:00:00.000Z',
        endDateIso: '2026-12-31T23:59:59.000Z',
        creatorId: 'usr_admin_01',
        participantCount: 86,
        ruleConfig: EventRuleConfigSchema.parse({
          allowedSportTypes: [SportType.RUN, SportType.TRAIL_RUN],
          minPaceSecPerKm: 210, // 03:30 /km
          maxPaceSecPerKm: 1200, // 20:00 /km
          minActivityDistanceKm: 2.0,
          requireHeartRate: false,
          allowSplitFiltering: true,
          weekendMultiplier: 1.5,
        }),
        categories: [
          { id: 'cat_wt_21k', name: 'Mốc Target 21KM Mùa Đông', targetDistanceKm: 21, bibPrefix: 'WT21-' },
          { id: 'cat_wt_42k', name: 'Mốc Target 42KM Marathoner', targetDistanceKm: 42, bibPrefix: 'WT42-' },
          { id: 'cat_wt_84k', name: 'Mốc Target 84KM Ultra Master', targetDistanceKm: 84, bibPrefix: 'WT84-' },
        ],
        challengeTiers: [
          {
            id: 'tier_wt_streak7',
            tierName: 'Challenge Mùa Đông Băng Giá: Streak 7 Ngày',
            tierLevel: 'DIAMOND',
            conditionType: ChallengeConditionType.STREAK_DAYS,
            thresholdValue: 7,
            minDailyDistanceKm: 3.0,
            awardBadgeUrl: '❄️',
            rewardDescription: 'Huy hiệu Băng Giá Chinh Phục 7 ngày liên tiếp trong mùa đông',
          },
        ],
        teams: [],
        ebibConfig: {
          theme: EBibTheme.MINIMAL_CLEAN,
          primaryColor: '#2563EB',
          slogan: 'WINTER TRAIL RUNNER • BĂNG QUA THỬ THÁCH',
        },
      },
      {
        id: 'evt_summer_2026_completed',
        slug: 'toprun-summer-sprint-2026',
        title: 'TOPRUN SUMMER SPRINT 2026 — RỰC LỬA ĐAM MÊ',
        subtitle: 'Giải chạy mùa hè đã kết thúc thành công rực rỡ • Xem lại Bảng vinh danh & Chứng nhận',
        description:
          'Giải đấu mùa hè 2026 đã khép lại với hơn 200 VĐV hoàn thành mục tiêu. Runner có thể tra cứu lại thành tích, tải E-BIB và E-Certificate kỷ niệm tại đây.',
        bannerUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1200&q=80',
        eventType: EventType.VIRTUAL_RACE,
        runMode: RunMode.ACCUMULATIVE,
        status: EventStatus.COMPLETED,
        startDateIso: '2026-06-01T00:00:00.000Z',
        endDateIso: '2026-08-31T23:59:59.000Z',
        creatorId: 'usr_admin_01',
        participantCount: 215,
        ruleConfig: EventRuleConfigSchema.parse({
          allowedSportTypes: [SportType.RUN, SportType.TRAIL_RUN],
          minPaceSecPerKm: 180,
          maxPaceSecPerKm: 900,
          minActivityDistanceKm: 1.0,
          requireHeartRate: false,
          allowSplitFiltering: true,
          weekendMultiplier: 1.0,
        }),
        categories: [
          { id: 'cat_sm_42k', name: 'Mốc Target 42KM Summer Finisher', targetDistanceKm: 42, bibPrefix: 'SUM42-' },
          { id: 'cat_sm_100k', name: 'Mốc Target 100KM Summer Hero', targetDistanceKm: 100, bibPrefix: 'SUM100-' },
        ],
        challengeTiers: [],
        teams: [],
        ebibConfig: {
          theme: EBibTheme.SUNSET_CRIMSON,
          primaryColor: '#EF4444',
          slogan: 'SUMMER HEAT • RỰC LỬA ĐAM MÊ',
        },
      },
      {
        id: 'evt_spring_2027_upcoming',
        slug: 'toprun-spring-marathon-2027',
        title: 'TOPRUN SPRING MARATHON 2027 — KHỞI ĐẦU NĂM MỚI',
        subtitle: 'Sắp mở đăng ký • Khởi động năm mới với những bước chạy bứt phá',
        description:
          'Giải chạy mùa xuân chào năm mới 2027. Đang trong giai đoạn chuẩn bị mở cổng đăng ký chính thức, giữ chỗ số BIB đẹp ngay hôm nay!',
        bannerUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1200&q=80',
        eventType: EventType.VIRTUAL_RACE,
        runMode: RunMode.ACCUMULATIVE,
        status: EventStatus.UPCOMING,
        startDateIso: '2027-01-01T00:00:00.000Z',
        endDateIso: '2027-02-28T23:59:59.000Z',
        creatorId: 'usr_admin_01',
        participantCount: 45,
        ruleConfig: EventRuleConfigSchema.parse({
          allowedSportTypes: [SportType.RUN, SportType.TRAIL_RUN],
          minPaceSecPerKm: 180,
          maxPaceSecPerKm: 900,
          minActivityDistanceKm: 1.0,
          requireHeartRate: false,
          allowSplitFiltering: true,
          weekendMultiplier: 1.0,
        }),
        categories: [
          { id: 'cat_sp_50k', name: 'Mốc Target 50KM Spring Start', targetDistanceKm: 50, bibPrefix: 'SPR50-' },
          { id: 'cat_sp_100k', name: 'Mốc Target 100KM Spring Master', targetDistanceKm: 100, bibPrefix: 'SPR100-' },
        ],
        challengeTiers: [],
        teams: [],
        ebibConfig: {
          theme: EBibTheme.MODERN_TITANIUM,
          primaryColor: '#FC4C02',
          slogan: 'NEW YEAR • NEW RUNNING GOALS',
        },
      },
    ];

    // 1.4. Activities (Bao gồm cả Tracklog chuẩn VÀ Tracklog có 1km cuối quên tắt đồng hồ đi xe máy để demo Split-Level Anti-Cheat!)
    this.activities = [
      {
        id: 'act_strava_01',
        userId: 'usr_admin_01',
        userName: 'Alan Hoàng (Admin & Runner)',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlanHoang',
        userDepartment: 'ASSA ABLOY Engineering',
        source: ActivitySource.STRAVA,
        externalId: '1298000101',
        name: 'Chạy sáng Chủ Nhật Sala Thủ Thiêm (Weekend x2 🔥)',
        sportType: SportType.RUN,
        startDateIso: '2026-10-25T05:30:00.000Z', // Chủ Nhật
        rawDistanceKm: 16.0,
        validDistanceKm: 16.0,
        invalidDistanceKm: 0,
        movingTimeSec: 4992, // Pace 05:12/km
        elapsedTimeSec: 5120,
        avgPaceSecPerKm: 312,
        formattedPace: '05:12 /km',
        totalElevationGainMeters: 85,
        averageHeartrate: 158,
        maxHeartrate: 179,
        averageCadenceSpm: 176,
        calories: 1120,
        mapPolyline: samplePolylineSala,
        deviceName: 'Garmin Forerunner 965',
        isManual: false,
        antiCheatStatus: AntiCheatStatus.VALID,
        flagReasons: [],
        splits: Array.from({ length: 16 }, (_, idx) => ({
          splitIndex: idx + 1,
          distanceMeters: 1000,
          movingTimeSec: 308 + (idx % 3) * 4,
          paceSecPerKm: 308 + (idx % 3) * 4,
          formattedPace: formatPace(308 + (idx % 3) * 4),
          elevationDiffMeters: idx % 2 === 0 ? 5 : -3,
          averageHeartrate: 150 + idx,
          isValid: true,
          invalidReason: null,
        })),
        kudosCount: 24,
        kudoedByUserIds: ['usr_runner_02', 'usr_runner_03'],
        comments: [
          {
            id: 'cmt_01',
            userId: 'usr_runner_02',
            userName: 'Nguyễn Tuấn Minh',
            content: 'Pace đều tăm tắp luôn anh ơi! Chủ nhật nhân đôi được 32km ấm quá 🔥',
            createdAtIso: '2026-10-25T07:40:00.000Z',
          },
        ],
        eventContributions: [
          {
            eventId: 'evt_vr_2026',
            eventTitle: 'TOPRUN AUTUMN VIRTUAL RACE 2026',
            validDistanceKm: 16.0,
            appliedMultiplier: 2.0,
            multiplierReason: 'Ngày cuối tuần x2',
            finalCountedDistanceKm: 32.0,
          },
        ],
      },
      {
        id: 'act_strava_02_partial',
        userId: 'usr_runner_04',
        userName: 'Lê Quốc Hùng',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=QuocHung',
        userDepartment: 'Sales & Commercial',
        source: ActivitySource.STRAVA,
        externalId: '1298000202',
        name: 'Chạy chiều Hồ Tây + Quên tắt Strava lúc lên xe máy về nhà',
        sportType: SportType.RUN,
        startDateIso: '2026-10-28T17:15:00.000Z',
        rawDistanceKm: 7.0,
        validDistanceKm: 5.0,
        invalidDistanceKm: 2.0,
        movingTimeSec: 1715, // 5km chạy bộ (343s/km) + 2km xe máy (95s/km)
        elapsedTimeSec: 1950,
        avgPaceSecPerKm: 343,
        formattedPace: '05:43 /km',
        totalElevationGainMeters: 32,
        averageHeartrate: 152,
        maxHeartrate: 171,
        averageCadenceSpm: 166,
        calories: 440,
        mapPolyline: samplePolylineWestLake,
        deviceName: 'Coros Pace 3',
        isManual: false,
        antiCheatStatus: AntiCheatStatus.PARTIAL_VALID,
        flagReasons: [
          'Đã tự động cắt bỏ 2 km cuối (Km 6 & Km 7) có tốc độ nhanh bất thường (Pace 01:35/km < ngưỡng 03:00/km). Giữ lại 5.0 km hợp lệ.',
        ],
        splits: [
          { splitIndex: 1, distanceMeters: 1000, movingTimeSec: 345, paceSecPerKm: 345, formattedPace: '05:45 /km', elevationDiffMeters: 4, averageHeartrate: 146, isValid: true, invalidReason: null },
          { splitIndex: 2, distanceMeters: 1000, movingTimeSec: 340, paceSecPerKm: 340, formattedPace: '05:40 /km', elevationDiffMeters: 6, averageHeartrate: 151, isValid: true, invalidReason: null },
          { splitIndex: 3, distanceMeters: 1000, movingTimeSec: 342, paceSecPerKm: 342, formattedPace: '05:42 /km', elevationDiffMeters: -2, averageHeartrate: 154, isValid: true, invalidReason: null },
          { splitIndex: 4, distanceMeters: 1000, movingTimeSec: 348, paceSecPerKm: 348, formattedPace: '05:48 /km', elevationDiffMeters: 5, averageHeartrate: 156, isValid: true, invalidReason: null },
          { splitIndex: 5, distanceMeters: 1000, movingTimeSec: 340, paceSecPerKm: 340, formattedPace: '05:40 /km', elevationDiffMeters: 3, averageHeartrate: 155, isValid: true, invalidReason: null },
          { splitIndex: 6, distanceMeters: 1000, movingTimeSec: 95, paceSecPerKm: 95, formattedPace: '01:35 /km', elevationDiffMeters: 0, averageHeartrate: 120, isValid: false, invalidReason: 'PACE_TOO_FAST' },
          { splitIndex: 7, distanceMeters: 1000, movingTimeSec: 90, paceSecPerKm: 90, formattedPace: '01:30 /km', elevationDiffMeters: 0, averageHeartrate: 112, isValid: false, invalidReason: 'PACE_TOO_FAST' },
        ],
        kudosCount: 9,
        kudoedByUserIds: ['usr_admin_01'],
        comments: [
          {
            id: 'cmt_02',
            userId: 'usr_admin_01',
            userName: 'Alan Hoàng (Admin & Runner)',
            content: 'Hệ thống Anti-Cheat của TOPRun đã tự động cắt 2km xe máy cuối và vẫn bảo toàn 5km chạy bộ cho bạn nhé!',
            createdAtIso: '2026-10-28T18:30:00.000Z',
          },
        ],
        eventContributions: [
          {
            eventId: 'evt_vr_2026',
            eventTitle: 'TOPRUN AUTUMN VIRTUAL RACE 2026',
            validDistanceKm: 5.0,
            appliedMultiplier: 1.0,
            multiplierReason: null,
            finalCountedDistanceKm: 5.0,
          },
        ],
      },
      {
        id: 'act_strava_03_flagged',
        userId: 'usr_runner_02',
        userName: 'Nguyễn Tuấn Minh',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TuanMinh',
        userDepartment: 'Product & R&D Team',
        source: ActivitySource.STRAVA,
        externalId: '1298000303',
        name: 'Tempo Run 12KM Sân vận động',
        sportType: SportType.RUN,
        startDateIso: '2026-10-27T06:00:00.000Z',
        rawDistanceKm: 12.0,
        validDistanceKm: 12.0,
        invalidDistanceKm: 0,
        movingTimeSec: 3240, // 04:30/km
        elapsedTimeSec: 3300,
        avgPaceSecPerKm: 270,
        formattedPace: '04:30 /km',
        totalElevationGainMeters: 18,
        averageHeartrate: 168,
        maxHeartrate: 186,
        averageCadenceSpm: 184,
        calories: 820,
        mapPolyline: samplePolylineSala,
        deviceName: 'Garmin Epix Pro',
        isManual: false,
        antiCheatStatus: AntiCheatStatus.VALID,
        flagReasons: [],
        splits: Array.from({ length: 12 }, (_, idx) => ({
          splitIndex: idx + 1,
          distanceMeters: 1000,
          movingTimeSec: 270,
          paceSecPerKm: 270,
          formattedPace: '04:30 /km',
          elevationDiffMeters: 1,
          averageHeartrate: 165 + (idx % 5),
          isValid: true,
          invalidReason: null,
        })),
        kudosCount: 31,
        kudoedByUserIds: ['usr_admin_01', 'usr_runner_03'],
        comments: [],
        eventContributions: [
          {
            eventId: 'evt_vr_2026',
            eventTitle: 'TOPRUN AUTUMN VIRTUAL RACE 2026',
            validDistanceKm: 12.0,
            appliedMultiplier: 1.0,
            multiplierReason: null,
            finalCountedDistanceKm: 12.0,
          },
        ],
      },
    ];

    // 1.5. Participations (Bao gồm Tiến độ 2 Tầng: Mốc TARGET Finisher & Mốc CHALLENGE Awards)
    const eventVr = this.events[0];

    this.participations = [
      {
        id: 'part_admin_01',
        eventId: eventVr.id,
        userId: 'usr_admin_01',
        userName: 'Alan Hoàng (Admin & Runner)',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlanHoang',
        userDepartment: 'ASSA ABLOY Engineering',
        categoryId: 'cat_target_50k',
        categoryName: 'Mốc Target 50KM (Finisher)',
        targetDistanceKm: 50,
        teamId: 'team_eng_01',
        teamName: 'Khối Công Nghệ & R&D (Engineering)',
        bibNumber: 'TOP50-0018',
        joinedAtIso: '2026-10-01T08:00:00.000Z',
        dualGoalProgress: calculateDualGoalProgress({
          runMode: RunMode.ACCUMULATIVE,
          targetCategory: eventVr.categories[1], // 50KM Target
          challengeTiers: eventVr.challengeTiers,
          activityLogs: [
            { activityDateIso: '2026-10-21T06:00:00Z', validRawDistanceKm: 8.5, finalMultipliedDistanceKm: 8.5, elevationGainMeters: 40 },
            { activityDateIso: '2026-10-22T06:00:00Z', validRawDistanceKm: 10.2, finalMultipliedDistanceKm: 10.2, elevationGainMeters: 55 },
            { activityDateIso: '2026-10-23T06:00:00Z', validRawDistanceKm: 7.0, finalMultipliedDistanceKm: 7.0, elevationGainMeters: 30 },
            { activityDateIso: '2026-10-24T06:00:00Z', validRawDistanceKm: 12.5, finalMultipliedDistanceKm: 25.0, elevationGainMeters: 90 },
            { activityDateIso: '2026-10-25T06:00:00Z', validRawDistanceKm: 16.0, finalMultipliedDistanceKm: 32.0, elevationGainMeters: 85 },
          ],
          previouslyCompletedTargetAtIso: '2026-10-25T07:15:00.000Z',
        }),
        raceKitOrder: {
          id: 'ord_01',
          shirtSize: 'L',
          medalEngravingName: 'ALAN HOANG - FINISHER 50K',
          recipientName: 'Alan Hoàng',
          phone: '0909123456',
          shippingAddress: 'Tòa nhà ASSA ABLOY, Quận 7, TP. Hồ Chí Minh',
          fulfillmentStatus: FulfillmentStatus.QUALIFIED_FINISHER,
          shippingProvider: 'GHTK',
          trackingCode: 'GHTK-TOP2026-8891',
        },
      },
      {
        id: 'part_minh_02',
        eventId: eventVr.id,
        userId: 'usr_runner_02',
        userName: 'Nguyễn Tuấn Minh',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TuanMinh',
        userDepartment: 'Product & R&D Team',
        categoryId: 'cat_target_100k',
        categoryName: 'Mốc Target 100KM (Pro Runner)',
        targetDistanceKm: 100,
        teamId: 'team_eng_01',
        teamName: 'Khối Công Nghệ & R&D (Engineering)',
        bibNumber: 'TOP100-0005',
        joinedAtIso: '2026-10-01T08:15:00.000Z',
        dualGoalProgress: calculateDualGoalProgress({
          runMode: RunMode.ACCUMULATIVE,
          targetCategory: eventVr.categories[2], // 100KM Target
          challengeTiers: eventVr.challengeTiers,
          activityLogs: [
            { activityDateIso: '2026-10-18T06:00:00Z', validRawDistanceKm: 22.0, finalMultipliedDistanceKm: 44.0, elevationGainMeters: 120 },
            { activityDateIso: '2026-10-21T06:00:00Z', validRawDistanceKm: 18.0, finalMultipliedDistanceKm: 18.0, elevationGainMeters: 80 },
            { activityDateIso: '2026-10-24T06:00:00Z', validRawDistanceKm: 20.0, finalMultipliedDistanceKm: 40.0, elevationGainMeters: 110 },
            { activityDateIso: '2026-10-25T06:00:00Z', validRawDistanceKm: 21.5, finalMultipliedDistanceKm: 43.0, elevationGainMeters: 140 },
            { activityDateIso: '2026-10-27T06:00:00Z', validRawDistanceKm: 12.0, finalMultipliedDistanceKm: 12.0, elevationGainMeters: 18 },
          ],
          previouslyCompletedTargetAtIso: '2026-10-24T08:00:00.000Z',
        }),
        raceKitOrder: {
          id: 'ord_02',
          shirtSize: 'M',
          medalEngravingName: 'NGUYEN TUAN MINH - 150K GOLD',
          recipientName: 'Nguyễn Tuấn Minh',
          phone: '0912345678',
          shippingAddress: 'Khu đô thị Sala, TP. Thủ Đức, TP.HCM',
          fulfillmentStatus: FulfillmentStatus.SHIPPED,
          shippingProvider: 'GHN',
          trackingCode: 'GHN-VN-992014',
        },
      },
      {
        id: 'part_lan_03',
        eventId: eventVr.id,
        userId: 'usr_runner_03',
        userName: 'Trần Ngọc Lan',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NgocLan',
        userDepartment: 'Operations & Supply Chain',
        categoryId: 'cat_target_50k',
        categoryName: 'Mốc Target 50KM (Finisher)',
        targetDistanceKm: 50,
        teamId: 'team_ops_02',
        teamName: 'Khối Vận Hành & Chuỗi Cung Ứng (Operations)',
        bibNumber: 'TOP50-0042',
        joinedAtIso: '2026-10-02T09:00:00.000Z',
        dualGoalProgress: calculateDualGoalProgress({
          runMode: RunMode.ACCUMULATIVE,
          targetCategory: eventVr.categories[1],
          challengeTiers: eventVr.challengeTiers,
          activityLogs: [
            { activityDateIso: '2026-10-20T06:00:00Z', validRawDistanceKm: 10.5, finalMultipliedDistanceKm: 10.5, elevationGainMeters: 45 },
            { activityDateIso: '2026-10-24T06:00:00Z', validRawDistanceKm: 12.0, finalMultipliedDistanceKm: 24.0, elevationGainMeters: 60 },
            { activityDateIso: '2026-10-28T06:00:00Z', validRawDistanceKm: 8.5, finalMultipliedDistanceKm: 8.5, elevationGainMeters: 30 },
          ],
        }),
        raceKitOrder: {
          id: 'ord_03',
          shirtSize: 'S',
          medalEngravingName: 'TRAN NGOC LAN',
          recipientName: 'Trần Ngọc Lan',
          phone: '0988776655',
          shippingAddress: 'Quận Cầu Giấy, Hà Nội',
          fulfillmentStatus: FulfillmentStatus.PENDING_TARGET,
          shippingProvider: null,
          trackingCode: null,
        },
      },
      {
        id: 'part_hung_04',
        eventId: eventVr.id,
        userId: 'usr_runner_04',
        userName: 'Lê Quốc Hùng',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=QuocHung',
        userDepartment: 'Sales & Commercial',
        categoryId: 'cat_target_30k',
        categoryName: 'Mốc Target 30KM (Starter)',
        targetDistanceKm: 30,
        teamId: 'team_sales_03',
        teamName: 'Khối Kinh Doanh & Thương Mại (Commercial)',
        bibNumber: 'TOP30-0089',
        joinedAtIso: '2026-10-03T10:00:00.000Z',
        dualGoalProgress: calculateDualGoalProgress({
          runMode: RunMode.ACCUMULATIVE,
          targetCategory: eventVr.categories[0],
          challengeTiers: eventVr.challengeTiers,
          activityLogs: [
            { activityDateIso: '2026-10-22T06:00:00Z', validRawDistanceKm: 14.0, finalMultipliedDistanceKm: 14.0, elevationGainMeters: 50 },
            { activityDateIso: '2026-10-28T17:15:00Z', validRawDistanceKm: 5.0, finalMultipliedDistanceKm: 5.0, elevationGainMeters: 32 },
          ],
        }),
        raceKitOrder: {
          id: 'ord_04',
          shirtSize: 'XL',
          medalEngravingName: 'LE QUOC HUNG',
          recipientName: 'Lê Quốc Hùng',
          phone: '0933445566',
          shippingAddress: 'Quận Hải Châu, Đà Nẵng',
          fulfillmentStatus: FulfillmentStatus.PENDING_TARGET,
          shippingProvider: null,
          trackingCode: null,
        },
      },
      {
        id: 'part_admin_winter',
        eventId: 'evt_winter_challenge_2026',
        userId: 'usr_admin_01',
        userName: 'Alan Hoàng (Admin & Runner)',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlanHoang',
        userDepartment: 'ASSA ABLOY Engineering',
        categoryId: 'cat_wt_42k',
        categoryName: 'Mốc Target 42KM Marathoner',
        targetDistanceKm: 42,
        teamId: null,
        teamName: null,
        bibNumber: 'WT42-0008',
        joinedAtIso: '2026-10-15T09:00:00.000Z',
        dualGoalProgress: calculateDualGoalProgress({
          runMode: RunMode.ACCUMULATIVE,
          targetCategory: {
            id: 'cat_wt_42k',
            name: 'Mốc Target 42KM Marathoner',
            targetDistanceKm: 42,
            bibPrefix: 'WT42-',
          },
          challengeTiers: [
            {
              id: 'tier_wt_streak7',
              tierName: 'Challenge Mùa Đông Băng Giá: Streak 7 Ngày',
              tierLevel: 'DIAMOND',
              conditionType: ChallengeConditionType.STREAK_DAYS,
              thresholdValue: 7,
              minDailyDistanceKm: 3.0,
              awardBadgeUrl: '❄️',
              rewardDescription: 'Huy hiệu Băng Giá Chinh Phục 7 ngày liên tiếp trong mùa đông',
            },
          ],
          activityLogs: [
            { activityDateIso: '2026-10-21T06:00:00Z', validRawDistanceKm: 8.5, finalMultipliedDistanceKm: 8.5, elevationGainMeters: 40 },
            { activityDateIso: '2026-10-22T06:00:00Z', validRawDistanceKm: 10.2, finalMultipliedDistanceKm: 10.2, elevationGainMeters: 55 },
            { activityDateIso: '2026-10-25T06:00:00Z', validRawDistanceKm: 16.0, finalMultipliedDistanceKm: 24.0, elevationGainMeters: 85 }, // Weekend x1.5
          ],
        }),
        raceKitOrder: {
          id: 'ord_wt_01',
          shirtSize: 'L',
          medalEngravingName: 'ALAN HOANG - WINTER 42K',
          recipientName: 'Alan Hoàng',
          phone: '0909123456',
          shippingAddress: 'Tòa nhà ASSA ABLOY, Quận 7, TP. Hồ Chí Minh',
          fulfillmentStatus: FulfillmentStatus.PENDING_TARGET,
          shippingProvider: null,
          trackingCode: null,
        },
      },
    ];

    // 1.6. Clubs
    this.clubs = [
      {
        id: 'club_assa_01',
        slug: 'assa-abloy-runners-vn',
        name: 'ASSA ABLOY Vietnam Runners Club',
        description: 'Câu lạc bộ chạy bộ kết nối các phòng ban, rèn luyện thể lực và chinh phục các giải chạy lớn.',
        memberCount: 48,
        totalDistanceKm: 1284.6,
        inviteCode: 'TOPRUN2026',
        members: this.users.map((u, idx) => ({
          userId: u.id,
          fullName: u.fullName,
          department: u.departmentOrUnit,
          role: idx === 0 ? 'ADMIN' : 'MEMBER',
          totalDistanceKm: u.totalDistanceKm,
        })),
      },
    ];

    // 1.7. Notifications
    this.notifications = [
      {
        id: 'notif_01',
        userId: 'usr_admin_01',
        title: '🟠 Đồng bộ Strava thành công (+32.0 km)',
        body: 'Buổi chạy "Chạy sáng Chủ Nhật Sala Thủ Thiêm" (16.0km x2 Cuối tuần = 32.0km) đã được cộng vào giải TOPRUN AUTUMN VIRTUAL RACE 2026!',
        type: 'STRAVA_SYNC',
        createdAtIso: '2026-10-25T07:15:00.000Z',
        isRead: false,
      },
      {
        id: 'notif_02',
        userId: 'usr_admin_01',
        title: '🎯 Chúc mừng hoàn thành Mốc TARGET 50KM (Finisher)!',
        body: 'Bạn đã vượt mốc Target 50KM (hiện đạt 82.7km). E-Certificate và đơn hàng Huy chương Finisher đã được mở khóa!',
        type: 'TARGET_COMPLETED',
        createdAtIso: '2026-10-25T07:16:00.000Z',
        isRead: false,
      },
      {
        id: 'notif_03',
        userId: 'usr_admin_01',
        title: '💎 Mở khóa Challenge Award: Kỷ Luật Thép (Streak 5 Ngày) & Long Run 15KM!',
        body: 'Tuyệt vời! Bạn vừa nhận được 2 Huy hiệu Challenge mở rộng trong Tủ Huy Chương.',
        type: 'CHALLENGE_AWARD',
        createdAtIso: '2026-10-25T07:16:30.000Z',
        isRead: false,
      },
    ];
  }

  // --------------------------------------------------------------------------
  // 2. TRUY VẤN DASHBOARD, USERS & TROPHY CASE
  // --------------------------------------------------------------------------

  getSystemOverview() {
    const totalValidKm = roundKm(this.activities.reduce((sum, a) => sum + a.validDistanceKm, 0));
    const flaggedCount = this.activities.filter(
      (a) => a.antiCheatStatus === AntiCheatStatus.PARTIAL_VALID || a.antiCheatStatus === AntiCheatStatus.FLAGGED
    ).length;

    return {
      totalUsers: this.users.length,
      activeEventsCount: this.events.filter((e) => e.status === EventStatus.ACTIVE).length,
      totalActivitiesSynced: this.activities.length,
      totalValidDistanceKm: totalValidKm,
      antiCheatInterceptedCount: flaggedCount,
      qualifiedFinishersCount: this.participations.filter((p) => p.dualGoalProgress.target.isCompleted).length,
    };
  }

  getUsers() {
    return this.users;
  }

  updateUserProfile(
    userId: string,
    data: {
      fullName?: string;
      avatarUrl?: string;
      departmentOrUnit?: string;
    }
  ) {
    let user = this.users.find((u) => u.id === userId);
    if (user) {
      if (data.fullName !== undefined) user.fullName = data.fullName.trim();
      if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
      if (data.departmentOrUnit !== undefined) user.departmentOrUnit = data.departmentOrUnit;
    } else if (data.fullName) {
      const newUser: UserProfile = {
        id: userId,
        email: '',
        fullName: data.fullName.trim(),
        avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
        gender: 'OTHER',
        departmentOrUnit: data.departmentOrUnit || 'Runner Community',
        role: UserRole.RUNNER,
        totalDistanceKm: 0,
        totalActivities: 0,
        pr5kSec: null,
        pr10kSec: null,
        pr21kSec: null,
        pr42kSec: null,
        stravaConnected: false,
        stravaAthleteId: null,
        stravaUsername: null,
        lastStravaSyncAt: null,
      };
      this.users.push(newUser);
      user = newUser;
    }

    const newName = data.fullName?.trim();
    const newAvatar = data.avatarUrl;
    const newDept = data.departmentOrUnit;

    // Cascade update to all participations in tournaments
    for (const p of this.participations) {
      if (p.userId === userId) {
        if (newName) p.userName = newName;
        if (newAvatar) p.userAvatar = newAvatar;
        if (newDept !== undefined) p.userDepartment = newDept;
      }
    }

    // Cascade update to all tracklog activities
    for (const a of this.activities) {
      if (a.userId === userId) {
        if (newName) a.userName = newName;
        if (newAvatar) a.userAvatar = newAvatar;
        if (newDept !== undefined) a.userDepartment = newDept;
      }
    }

    this.saveEngineState();
    return user;
  }

  getUserProfileAndTrophyCase(userId: string) {
    const user = this.users.find((u) => u.id === userId) || this.users[0];
    const userParticipations = this.participations.filter((p) => p.userId === user.id);
    const userActivities = this.activities.filter((a) => a.userId === user.id);
    const userNotifications = this.notifications.filter((n) => n.userId === user.id);

    // Tổng hợp Tủ Huy Chương (E-BIB, E-Certificate & Challenge Badges)
    const trophyCase = userParticipations.map((part) => {
      const ev = this.events.find((e) => e.id === part.eventId) || this.events[0];
      const eBibSvg = generateEBibSvg({
        eventTitle: ev.title,
        categoryName: part.categoryName,
        bibNumber: part.bibNumber,
        runnerName: user.fullName,
        teamName: part.teamName || undefined,
        config: ev.ebibConfig,
        eventDate: ev.startDateIso,
      });

      const unlockedBadges = part.dualGoalProgress.challenges.filter((c) => c.isUnlocked);

      const eCertSvg = part.dualGoalProgress.target.isCompleted
        ? generateECertificateSvg({
            eventTitle: ev.title,
            runnerName: user.fullName,
            bibNumber: part.bibNumber,
            targetCategoryName: part.categoryName,
            completedDistanceKm: part.dualGoalProgress.target.currentMultipliedDistanceKm,
            rawDistanceKm: part.dualGoalProgress.target.currentRawDistanceKm,
            avgPaceFormatted: '05:18 /km',
            completedDateStr: (part.dualGoalProgress.target.completedAtIso || new Date().toISOString()).slice(0, 10),
            unlockedChallengeBadges: unlockedBadges.map((b) => `${b.awardBadgeUrl} ${b.tierName}`),
          })
        : null;

      return {
        participationId: part.id,
        eventId: ev.id,
        eventTitle: ev.title,
        bibNumber: part.bibNumber,
        eBibSvg,
        isTargetCompleted: part.dualGoalProgress.target.isCompleted,
        eCertSvg,
        unlockedChallengeBadges: unlockedBadges,
        raceKitOrder: part.raceKitOrder,
      };
    });

    return {
      user,
      participations: userParticipations,
      recentActivities: userActivities,
      trophyCase,
      notifications: userNotifications,
    };
  }

  // --------------------------------------------------------------------------
  // 3. QUẢN LÝ GIẢI ĐẤU (VIRTUAL RACE & MINI CHALLENGE) & BẢNG XẾP HẠNG
  // --------------------------------------------------------------------------

  getEvents() {
    return this.events.map((e) => {
      const parts = this.participations.filter((p) => p.eventId === e.id);
      return {
        ...e,
        participantsCount: parts.length,
        participants: parts.map((p) => ({
          userId: p.userId,
          bibNumber: p.bibNumber,
          targetDistanceKm: p.targetDistanceKm,
          totalValidKm: p.dualGoalProgress?.target?.currentMultipliedDistanceKm || 0,
          rank: 0,
          challengeTier: p.dualGoalProgress?.challenges?.find((c) => c.isUnlocked)?.tierName,
        })),
      };
    });
  }

  getEventBySlugOrId(idOrSlug: string) {
    const event = this.events.find((e) => e.id === idOrSlug || e.slug === idOrSlug);
    if (!event) throw new NotFoundException(`Không tìm thấy giải đấu "${idOrSlug}"`);

    const eventParticipations = this.participations
      .filter((p) => p.eventId === event.id)
      .sort(
        (a, b) =>
          b.dualGoalProgress.target.currentMultipliedDistanceKm -
          a.dualGoalProgress.target.currentMultipliedDistanceKm
      );

    const individualLeaderboard = eventParticipations.map((p, idx) => {
      const u = this.users.find((user) => user.id === p.userId);
      return {
        rank: idx + 1,
        participationId: p.id,
        userId: p.userId,
        userName: u?.fullName || p.userName,
        userAvatar: u?.avatarUrl || p.userAvatar,
        department: u?.departmentOrUnit || p.userDepartment,
        bibNumber: p.bibNumber,
        teamName: p.teamName,
        targetCategoryName: p.categoryName,
        targetDistanceKm: p.targetDistanceKm,
        rawDistanceKm: p.dualGoalProgress.target.currentRawDistanceKm,
        multipliedDistanceKm: p.dualGoalProgress.target.currentMultipliedDistanceKm,
        targetProgressPct: p.dualGoalProgress.target.progressPercentage,
        isTargetCompleted: p.dualGoalProgress.target.isCompleted,
        unlockedChallengesCount: p.dualGoalProgress.challenges.filter((c) => c.isUnlocked).length,
        unlockedChallengeBadges: p.dualGoalProgress.challenges
          .filter((c) => c.isUnlocked)
          .map((c) => ({ tierName: c.tierName, badge: c.awardBadgeUrl })),
      };
    });

    const teamLeaderboard = [...event.teams]
      .sort((a, b) => b.totalMultipliedDistanceKm - a.totalMultipliedDistanceKm)
      .map((t, idx) => ({
        rank: idx + 1,
        ...t,
        avgDistancePerMemberKm: t.memberCount > 0 ? roundKm(t.totalMultipliedDistanceKm / t.memberCount) : 0,
      }));

    return {
      ...event,
      individualLeaderboard,
      teamLeaderboard,
    };
  }

  createEvent(payload: {
    title: string;
    subtitle?: string;
    description: string;
    eventType: EventType;
    runMode: RunMode;
    startDateIso: string;
    endDateIso: string;
    creatorId?: string;
    minPaceSecPerKm?: number;
    maxPaceSecPerKm?: number;
    weekendMultiplier?: number;
    allowSplitFiltering?: boolean;
    bibPrefix?: string;
    categories: Array<{ name: string; targetDistanceKm: number; bibPrefix?: string }>;
    challengeTiers: Array<{
      tierName: string;
      tierLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'SPECIAL';
      conditionType: ChallengeConditionType;
      thresholdValue: number;
      targetSpeedDistanceKm?: number;
      awardBadgeUrl: string;
      rewardDescription: string;
    }>;
  }) {
    const slug = payload.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const eventBibPrefix = payload.bibPrefix?.trim().toUpperCase() || 'PRO-';

    const newEvent: StoredEvent = {
      id: `evt_${Date.now()}`,
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      title: payload.title,
      subtitle: payload.subtitle || 'Giải chạy đồng bộ Strava API • Chấm điểm 2 tầng Target & Challenge',
      description: payload.description,
      bannerUrl: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?auto=format&fit=crop&w=1200&q=80',
      eventType: payload.eventType || EventType.MINI_CHALLENGE,
      runMode: payload.runMode || RunMode.ACCUMULATIVE,
      status: EventStatus.ACTIVE,
      startDateIso: payload.startDateIso,
      endDateIso: payload.endDateIso,
      creatorId: payload.creatorId || 'usr_admin_01',
      participantCount: 1,
      bibPrefix: eventBibPrefix,
      ruleConfig: EventRuleConfigSchema.parse({
        allowedSportTypes: [SportType.RUN, SportType.TRAIL_RUN, SportType.VIRTUAL_RUN],
        minPaceSecPerKm: payload.minPaceSecPerKm ?? 180,
        maxPaceSecPerKm: payload.maxPaceSecPerKm ?? 900,
        allowSplitFiltering: payload.allowSplitFiltering ?? true,
        weekendMultiplier: payload.weekendMultiplier ?? 1.0,
      }),
      categories: payload.categories.map((c, idx) => ({
        id: `cat_${Date.now()}_${idx}`,
        name: c.name,
        targetDistanceKm: Number(c.targetDistanceKm),
        bibPrefix: eventBibPrefix,
      })),
      challengeTiers: payload.challengeTiers.map((t, idx) => ({
        id: `tier_${Date.now()}_${idx}`,
        tierName: t.tierName,
        tierLevel: t.tierLevel || 'GOLD',
        conditionType: t.conditionType,
        thresholdValue: Number(t.thresholdValue),
        targetSpeedDistanceKm: t.targetSpeedDistanceKm ? Number(t.targetSpeedDistanceKm) : undefined,
        awardBadgeUrl: t.awardBadgeUrl || '🏅',
        rewardDescription: t.rewardDescription,
      })),
      teams: [],
    };

    this.events.unshift(newEvent);
    this.saveEngineState();
    this.persistEventToDb(newEvent).catch(() => {});
    return newEvent;
  }

  checkBibAvailability(eventId: string, bibNumber: string, currentUserId?: string) {
    const bibClean = (bibNumber || '').trim().toUpperCase();
    if (!bibClean) {
      return { available: false, reason: 'Số BIB không được để trống.' };
    }
    const event = this.events.find((e) => e.id === eventId || e.slug === eventId);
    if (!event) return { available: false, reason: 'Không tìm thấy giải đấu.' };

    const duplicate = this.participations.find(
      (p) =>
        p.eventId === event.id &&
        p.bibNumber.toUpperCase() === bibClean &&
        (!currentUserId || p.userId !== currentUserId)
    );

    if (duplicate) {
      // Suggest alternate
      const numPart = bibClean.match(/\d+/);
      const nextNum = numPart ? parseInt(numPart[0], 10) + 1 : 101;
      const prefix = bibClean.replace(/\d+$/, '');
      const suggested = `${prefix || 'TOP-'}${nextNum}`;
      return {
        available: false,
        reason: `Số BIB "${bibClean}" đã có người đăng ký.`,
        suggestedBib: suggested,
      };
    }

    return { available: true };
  }

  updateParticipationBib(eventId: string, userId: string, newBibNumber: string) {
    const bibClean = (newBibNumber || '').trim().toUpperCase();
    if (!bibClean || bibClean.length < 2) {
      throw new BadRequestException('Số BIB không hợp lệ (tối thiểu 2 ký tự).');
    }

    const event = this.events.find((e) => e.id === eventId || e.slug === eventId);
    if (!event) throw new NotFoundException('Không tìm thấy giải đấu');

    const part = this.participations.find((p) => p.eventId === event.id && p.userId === userId);
    if (!part) throw new NotFoundException('Vận động viên chưa đăng ký giải đấu này.');

    const duplicate = this.participations.find(
      (p) => p.eventId === event.id && p.userId !== userId && p.bibNumber.toUpperCase() === bibClean
    );
    if (duplicate) {
      throw new BadRequestException(`Số BIB "${bibClean}" đã có vận động viên khác trong giải sử dụng.`);
    }

    part.bibNumber = bibClean;
    this.saveEngineState();
    prisma.eventParticipation
      .update({
        where: { eventId_userId: { eventId: event.id, userId } },
        data: { bibNumber: bibClean },
      })
      .catch(() => {});
    return {
      success: true,
      bibNumber: part.bibNumber,
      participation: part,
    };
  }

  registerForEvent(
    eventId: string,
    payload: {
      userId: string;
      categoryId: string;
      teamId?: string;
      bibNumber?: string;
      selectedChallengeTierIds?: string[];
      shirtSize: string;
      medalEngravingName?: string;
      recipientName: string;
      phone: string;
      shippingAddress: string;
    }
  ) {
    const event = this.events.find((e) => e.id === eventId || e.slug === eventId);
    if (!event) throw new NotFoundException('Không tìm thấy giải đấu');

    const user = this.users.find((u) => u.id === payload.userId) || this.users[0];
    const category = event.categories.find((c) => c.id === payload.categoryId) || event.categories[0];
    const team = event.teams.find((t) => t.id === payload.teamId) || null;

    const existing = this.participations.find((p) => p.eventId === event.id && p.userId === user.id);
    if (existing) {
      return existing;
    }

    let finalBib = (payload.bibNumber || '').trim().toUpperCase();
    if (finalBib) {
      const isDuplicate = this.participations.some(
        (p) => p.eventId === event.id && p.bibNumber.toUpperCase() === finalBib
      );
      if (isDuplicate) {
        throw new BadRequestException(`Số BIB "${finalBib}" đã có người đăng ký trong giải. Vui lòng chọn số khác.`);
      }
    } else {
      let count = this.participations.filter((p) => p.eventId === event.id).length + 101;
      const prefix = (event as any).bibPrefix || category.bibPrefix || 'PRO-';
      let candidate = `${prefix}${String(count).padStart(4, '0')}`;
      while (this.participations.some((p) => p.eventId === event.id && p.bibNumber.toUpperCase() === candidate.toUpperCase())) {
        count++;
        candidate = `${prefix}${String(count).padStart(4, '0')}`;
      }
      finalBib = candidate;
    }

    const newPart: StoredParticipation = {
      id: `part_${Date.now()}`,
      eventId: event.id,
      userId: user.id,
      userName: user.fullName,
      userAvatar: user.avatarUrl,
      userDepartment: user.departmentOrUnit,
      categoryId: category.id,
      categoryName: category.name,
      targetDistanceKm: category.targetDistanceKm,
      teamId: team?.id || null,
      teamName: team?.name || null,
      bibNumber: finalBib,
      selectedChallengeTierIds: payload.selectedChallengeTierIds || [],
      joinedAtIso: new Date().toISOString(),
      dualGoalProgress: calculateDualGoalProgress({
        runMode: event.runMode,
        targetCategory: category,
        challengeTiers: event.challengeTiers,
        activityLogs: [],
      }),
      raceKitOrder: {
        id: `ord_${Date.now()}`,
        shirtSize: payload.shirtSize || 'L',
        medalEngravingName: payload.medalEngravingName || user.fullName.toUpperCase(),
        recipientName: payload.recipientName || user.fullName,
        phone: payload.phone || '0909123456',
        shippingAddress: payload.shippingAddress || 'Văn phòng Công ty',
        fulfillmentStatus: FulfillmentStatus.PENDING_TARGET,
        shippingProvider: null,
        trackingCode: null,
      },
    };

    this.participations.push(newPart);
    event.participantCount += 1;
    this.recalculateUserParticipation(user.id);
    this.saveEngineState();
    this.persistParticipationToDb(newPart).catch(() => {});
    prisma.event
      .update({
        where: { id: event.id },
        data: { participantCount: event.participantCount },
      })
      .catch(() => {});
    return newPart;
  }

  updateEvent(eventId: string, payload: any) {
    const event = this.events.find((e) => e.id === eventId || e.slug === eventId);
    if (!event) throw new NotFoundException('Không tìm thấy giải đấu');
    if (payload.title !== undefined) event.title = payload.title;
    if (payload.subtitle !== undefined) event.subtitle = payload.subtitle;
    if (payload.description !== undefined) event.description = payload.description;
    if (payload.status !== undefined) event.status = payload.status;
    if (payload.startDateIso !== undefined) event.startDateIso = payload.startDateIso;
    if (payload.endDateIso !== undefined) event.endDateIso = payload.endDateIso;
    if (payload.bibPrefix !== undefined) event.bibPrefix = payload.bibPrefix;
    if (payload.ruleConfig !== undefined) {
      event.ruleConfig = {
        ...event.ruleConfig,
        ...payload.ruleConfig,
      };
    }
    if (payload.categories !== undefined) {
      event.categories = payload.categories;
    }
    if (payload.challengeTiers !== undefined) {
      event.challengeTiers = payload.challengeTiers;
    }
    this.saveEngineState();
    this.persistEventToDb(event).catch(() => {});
    return event;
  }

  deleteEvent(eventId: string) {
    const index = this.events.findIndex((e) => e.id === eventId || e.slug === eventId);
    if (index === -1) {
      throw new NotFoundException('Không tìm thấy giải đấu');
    }
    const event = this.events[index];
    const participantCount = this.participations.filter((p) => p.eventId === event.id).length;
    if (participantCount > 0) {
      throw new BadRequestException(
        `Không thể xoá giải đấu "${event.title}" vì đã có ${participantCount} VĐV đăng ký tham gia. Vui lòng chuyển trạng thái sang CANCELLED hoặc COMPLETED.`
      );
    }
    this.events.splice(index, 1);
    this.saveEngineState();
    this.deleteEventFromDb(event.id).catch(() => {});
    return { success: true, message: `Đã xoá giải đấu "${event.title}" thành công.` };
  }

  // --------------------------------------------------------------------------
  // 4. ĐỒNG BỘ TRACKLOG TỪ STRAVA API / WEBHOOK / GPX & CHẤM ĐIỂM TỰ ĐỘNG
  // --------------------------------------------------------------------------

  getActivities(userId?: string, role?: string) {
    let list: StoredActivity[] = [];
    if (role === 'ADMIN') {
      list = userId ? this.activities.filter((a) => a.userId === userId) : this.activities;
    } else if (userId) {
      list = this.activities.filter((a) => a.userId === userId);
    } else {
      return [];
    }

    return list.map((a) => {
      const u = this.users.find((user) => user.id === a.userId);
      return {
        ...a,
        userName: u?.fullName || a.userName,
        userAvatar: u?.avatarUrl || a.userAvatar,
        userDepartment: u?.departmentOrUnit || a.userDepartment,
      };
    });
  }

  getActivityById(id: string) {
    const act = this.activities.find((a) => a.id === id);
    if (!act) throw new NotFoundException(`Không tìm thấy Tracklog ID "${id}"`);
    return act;
  }

  /**
   * Tính toán lại tiến độ giải đấu (Dual-Goal Progress) & thống kê cá nhân của User
   * Chỉ tính các hoạt động hợp lệ và KHÔNG bị ẩn (`!a.isHidden`)
   */
  recalculateUserParticipation(userId: string) {
    const activeRuns = this.activities.filter(
      (a) => a.userId === userId && !a.isHidden && a.validDistanceKm > 0
    );

    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.totalDistanceKm = roundKm(activeRuns.reduce((sum, a) => sum + a.validDistanceKm, 0));
      user.totalActivities = activeRuns.length;
    }

    const userParts = this.participations.filter((p) => p.userId === userId);
    for (const part of userParts) {
      const ev = this.events.find((e) => e.id === part.eventId);
      if (!ev) continue;

      const evStart = new Date(ev.startDateIso).getTime();
      const evEnd = new Date(ev.endDateIso).getTime();

      // Chỉ lọc các bài chạy diễn ra trong thời gian của giải đấu này
      const eventRuns = activeRuns.filter((a) => {
        const actTime = new Date(a.startDateIso).getTime();
        return actTime >= evStart && actTime <= evEnd;
      });

      const logs = eventRuns
        .slice()
        .reverse()
        .map((a) => {
          let mult = 1.0;
          const actD = new Date(a.startDateIso);
          const day = actD.getUTCDay();
          if ((day === 0 || day === 6) && (ev.ruleConfig.weekendMultiplier || 1.0) > 1.0) {
            mult = ev.ruleConfig.weekendMultiplier;
          }
          const multipliedKm = roundKm(a.validDistanceKm * mult);
          return {
            activityDateIso: a.startDateIso,
            validRawDistanceKm: a.validDistanceKm,
            finalMultipliedDistanceKm: multipliedKm,
            elevationGainMeters: a.totalElevationGainMeters || 0,
            movingTimeSec: a.movingTimeSec || 0,
            validAvgPaceSecPerKm: a.avgPaceSecPerKm || 0,
          };
        });

      part.dualGoalProgress = calculateDualGoalProgress({
        runMode: ev.runMode,
        targetCategory: {
          id: part.categoryId,
          name: part.categoryName,
          targetDistanceKm: part.targetDistanceKm,
          bibPrefix: part.bibNumber.split('-')[0] + '-' || 'TOP-',
        },
        challengeTiers: ev.challengeTiers,
        activityLogs: logs,
      });

      if (
        part.dualGoalProgress.target.isCompleted &&
        part.raceKitOrder.fulfillmentStatus === FulfillmentStatus.PENDING_TARGET
      ) {
        part.raceKitOrder.fulfillmentStatus = FulfillmentStatus.QUALIFIED_FINISHER;
      }
    }
  }

  /**
   * Ẩn hoặc hiện lại một hoạt động (Khi ẩn: không tính km vào Giải chạy & Bảng xếp hạng)
   */
  toggleActivityVisibility(activityId: string, isHidden?: boolean) {
    const act = this.getActivityById(activityId);
    act.isHidden = isHidden !== undefined ? Boolean(isHidden) : !act.isHidden;
    this.recalculateUserParticipation(act.userId);
    this.saveEngineState();
    prisma.activity
      .update({
        where: { id: act.id },
        data: { isHidden: act.isHidden },
      })
      .catch(() => {});
    return {
      activity: act,
      allActivities: this.activities,
      message: act.isHidden
        ? `Đã ẩn hoạt động "${act.name}" (${act.validDistanceKm} km sẽ không tính vào Giải chạy).`
        : `Đã hiện lại hoạt động "${act.name}" (+${act.validDistanceKm} km được tính vào Giải chạy).`,
    };
  }

  /**
   * Xoá vĩnh viễn một hoạt động khỏi Nhật ký & không tính vào Giải chạy
   */
  deleteActivity(activityId: string) {
    const idx = this.activities.findIndex((a) => a.id === activityId);
    if (idx === -1) {
      throw new NotFoundException(`Không tìm thấy hoạt động ID "${activityId}"`);
    }
    const [removed] = this.activities.splice(idx, 1);
    if (removed.externalId) {
      this.deletedExternalIds.add(removed.externalId);
    }
    this.recalculateUserParticipation(removed.userId);
    this.saveEngineState();
    this.deleteActivityFromDb(removed.id).catch(() => {});
    return {
      removedId: activityId,
      removedName: removed.name,
      allActivities: this.activities,
      message: `Đã xoá hoạt động "${removed.name}" và trừ ${removed.validDistanceKm} km khỏi kết quả Giải chạy.`,
    };
  }

  /**
   * Xử lý một buổi chạy mới từ Strava Webhook / Manual Sync / Upload GPX:
   * 1. Chạy qua bộ lọc Split-Level Anti-Cheat cho từng giải đấu mà VĐV đang tham gia
   * 2. Cập nhật tiến độ Mốc TARGET (Finisher) và Mốc CHALLENGE TIERS (Awards)
   * 3. Tự động mở khóa E-Certificate & chuyển trạng thái đơn hàng Race-kit khi đạt Target
   */
  ingestAndScoreActivity(
    userId: string,
    rawInput: RawActivityInput,
    source: ActivitySource = ActivitySource.STRAVA
  ): {
    activity: StoredActivity;
    evaluation: ActivityEvaluationResult;
    updatedParticipations: StoredParticipation[];
  } {
    const user = this.users.find((u) => u.id === userId) || this.users[0];

    // Tìm tất cả giải đấu mà user đang tham gia
    const userParts = this.participations.filter((p) => p.userId === user.id);
    const primaryEvent =
      userParts.length > 0
        ? this.events.find((e) => e.id === userParts[0].eventId) || this.events[0]
        : this.events[0];

    // Chạy bộ máy chấm điểm & chống gian lận từng km (Split-Level Anti-Cheat)
    const evaluation = evaluateActivitySplits(rawInput, primaryEvent.ruleConfig);

    const eventContributions: StoredActivity['eventContributions'] = [];
    const updatedParticipations: StoredParticipation[] = [];

    for (const part of userParts) {
      const ev = this.events.find((e) => e.id === part.eventId);
      if (!ev) continue;

      const actTime = new Date(rawInput.startDateIso).getTime();
      const evStart = new Date(ev.startDateIso).getTime();
      const evEnd = new Date(ev.endDateIso).getTime();
      if (actTime < evStart || actTime > evEnd) {
        // Bài chạy không nằm trong khoảng thời gian diễn ra giải này -> Bỏ qua
        continue;
      }

      const evEval = evaluateActivitySplits(rawInput, ev.ruleConfig);
      if (evEval.antiCheatStatus !== AntiCheatStatus.REJECTED && evEval.finalCountedDistanceKm > 0) {
        eventContributions.push({
          eventId: ev.id,
          eventTitle: ev.title,
          validDistanceKm: evEval.validDistanceKm,
          appliedMultiplier: evEval.appliedMultiplier,
          multiplierReason: evEval.multiplierReason,
          finalCountedDistanceKm: evEval.finalCountedDistanceKm,
        });

        // Cập nhật tiến độ Dual-Goal (Target + Challenge Tiers)
        const prevTargetKm = part.dualGoalProgress.target.currentMultipliedDistanceKm;
        const prevRawKm = part.dualGoalProgress.target.currentRawDistanceKm;

        const updatedProgress = calculateDualGoalProgress({
          runMode: ev.runMode,
          targetCategory: {
            id: part.categoryId,
            name: part.categoryName,
            targetDistanceKm: part.targetDistanceKm,
            bibPrefix: 'TOP-',
          },
          challengeTiers: ev.challengeTiers,
          activityLogs: [
            {
              activityDateIso: rawInput.startDateIso,
              validRawDistanceKm: roundKm(prevRawKm + evEval.validDistanceKm),
              finalMultipliedDistanceKm: roundKm(prevTargetKm + evEval.finalCountedDistanceKm),
              elevationGainMeters: rawInput.totalElevationGainMeters,
            },
          ],
          previouslyCompletedTargetAtIso: part.dualGoalProgress.target.completedAtIso,
        });

        part.dualGoalProgress = updatedProgress;

        if (
          updatedProgress.target.isCompleted &&
          part.raceKitOrder.fulfillmentStatus === FulfillmentStatus.PENDING_TARGET
        ) {
          part.raceKitOrder.fulfillmentStatus = FulfillmentStatus.QUALIFIED_FINISHER;
        }

        // Cộng km vào Đội/Phòng ban
        if (part.teamId) {
          const team = ev.teams.find((t) => t.id === part.teamId);
          if (team) {
            team.totalValidDistanceKm = roundKm(team.totalValidDistanceKm + evEval.validDistanceKm);
            team.totalMultipliedDistanceKm = roundKm(team.totalMultipliedDistanceKm + evEval.finalCountedDistanceKm);
          }
        }

        updatedParticipations.push(part);
      }
    }

    const storedAct: StoredActivity = {
      id: `act_${Date.now()}`,
      userId: user.id,
      userName: user.fullName,
      userAvatar: user.avatarUrl,
      userDepartment: user.departmentOrUnit,
      source,
      externalId: rawInput.externalId,
      name: rawInput.name,
      sportType: rawInput.sportType,
      startDateIso: rawInput.startDateIso,
      rawDistanceKm: evaluation.rawDistanceKm,
      validDistanceKm: evaluation.validDistanceKm,
      invalidDistanceKm: evaluation.invalidDistanceKm,
      movingTimeSec: rawInput.movingTimeSec,
      elapsedTimeSec: rawInput.elapsedTimeSec,
      avgPaceSecPerKm: evaluation.validAvgPaceSecPerKm,
      formattedPace: formatPace(evaluation.validAvgPaceSecPerKm),
      totalElevationGainMeters: rawInput.totalElevationGainMeters,
      averageHeartrate: rawInput.averageHeartrate ?? null,
      maxHeartrate: rawInput.maxHeartrate ?? null,
      averageCadenceSpm: rawInput.averageCadenceSpm ?? null,
      calories: Math.round(evaluation.validDistanceKm * 68),
      mapPolyline:
        rawInput.mapPolyline ||
        this.activities[0]?.mapPolyline ||
        '',
      deviceName: source === ActivitySource.GPX_UPLOAD ? 'GPX File Upload' : 'Strava Webhook Sync (Garmin/Coros)',
      isManual: rawInput.isManual,
      antiCheatStatus: evaluation.antiCheatStatus,
      flagReasons: evaluation.flagReasons,
      splits: evaluation.evaluatedSplits,
      kudosCount: 1,
      kudoedByUserIds: [user.id],
      comments: [],
      eventContributions,
    };

    this.activities.unshift(storedAct);

    // Cập nhật thống kê User
    user.totalDistanceKm = roundKm(user.totalDistanceKm + evaluation.validDistanceKm);
    user.totalActivities += 1;
    user.lastStravaSyncAt = new Date().toISOString();

    // Tạo thông báo Push Notification
    this.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: user.id,
      title: `🟠 Đồng bộ ${source === ActivitySource.STRAVA ? 'Strava' : 'GPX'} hoàn tất: ${storedAct.name}`,
      body:
        evaluation.invalidDistanceKm > 0
          ? `Hệ thống ghi nhận ${evaluation.validDistanceKm} km hợp lệ (đã lọc bỏ ${evaluation.invalidDistanceKm} km vi phạm tốc độ) -> Cộng ${evaluation.finalCountedDistanceKm} km vào giải đấu!`
          : `Chúc mừng! Bạn vừa được cộng ${evaluation.finalCountedDistanceKm} km (Hệ số x${evaluation.appliedMultiplier}) vào bảng xếp hạng.`,
      type: 'STRAVA_SYNC',
      createdAtIso: new Date().toISOString(),
      isRead: false,
    });

    this.saveEngineState();
    this.persistActivityToDb(storedAct).catch(() => {});
    for (const p of updatedParticipations) {
      this.persistParticipationToDb(p).catch(() => {});
    }
    prisma.user
      .update({
        where: { id: user.id },
        data: {
          totalDistanceKm: user.totalDistanceKm,
          totalActivities: user.totalActivities,
        },
      })
      .catch(() => {});

    return {
      activity: storedAct,
      evaluation,
      updatedParticipations,
    };
  }

  /**
   * Giả lập nhận sự kiện từ Strava Webhook (hoặc bấm nút "Simulate Strava Sync" trên UI để test trực tiếp)
   * Hỗ trợ 2 chế độ:
   * - `clean_run`: Buổi chạy chuẩn 10km (hoặc cuối tuần x2 = 20km)
   * - `mixed_motorbike_cheat`: Buổi chạy 6km trong đó 5km đầu chạy bộ chuẩn, km thứ 6 quên tắt đồng hồ khi đi xe máy (01:35/km)
   */
  simulateStravaSync(params: {
    userId?: string;
    scenario?: 'clean_run' | 'weekend_double' | 'mixed_motorbike_cheat';
  }) {
    const userId = params.userId || 'usr_admin_01';
    const scenario = params.scenario || 'clean_run';

    if (scenario === 'mixed_motorbike_cheat') {
      const rawInput: RawActivityInput = {
        externalId: `strava_sim_${Date.now()}`,
        name: 'Chạy bộ Công viên + Quên tắt Strava khi lên xe máy ở Km cuối',
        sportType: SportType.RUN,
        startDateIso: new Date().toISOString(),
        distanceMeters: 6000,
        movingTimeSec: 325 * 5 + 95,
        elapsedTimeSec: 1850,
        totalElevationGainMeters: 38,
        averageHeartrate: 154,
        maxHeartrate: 175,
        averageCadenceSpm: 170,
        isManual: false,
        splits: [
          { splitIndex: 1, distanceMeters: 1000, movingTimeSec: 328, elevationDiffMeters: 5, averageHeartrate: 148 },
          { splitIndex: 2, distanceMeters: 1000, movingTimeSec: 324, elevationDiffMeters: 8, averageHeartrate: 153 },
          { splitIndex: 3, distanceMeters: 1000, movingTimeSec: 322, elevationDiffMeters: -3, averageHeartrate: 157 },
          { splitIndex: 4, distanceMeters: 1000, movingTimeSec: 326, elevationDiffMeters: 6, averageHeartrate: 159 },
          { splitIndex: 5, distanceMeters: 1000, movingTimeSec: 325, elevationDiffMeters: 4, averageHeartrate: 160 },
          { splitIndex: 6, distanceMeters: 1000, movingTimeSec: 95, elevationDiffMeters: 0, averageHeartrate: 118 }, // 01:35/km -> Xe máy!
        ],
      };
      return this.ingestAndScoreActivity(userId, rawInput, ActivitySource.STRAVA);
    }

    const isWeekend = scenario === 'weekend_double';
    const distanceKm = isWeekend ? 12 : 8;
    const dateIso = isWeekend ? '2026-10-25T23:10:00.000Z' : new Date().toISOString(); // 2026-10-25 là Chủ Nhật

    const rawInput: RawActivityInput = {
      externalId: `strava_sim_${Date.now()}`,
      name: isWeekend
        ? 'Long Run Cuối Tuần — Săn Hệ Số Nhân x2 🔥'
        : 'Morning Easy Run — Đồng bộ Strava API',
      sportType: SportType.RUN,
      startDateIso: dateIso,
      distanceMeters: distanceKm * 1000,
      movingTimeSec: distanceKm * 315, // Pace 05:15/km
      elapsedTimeSec: distanceKm * 322,
      totalElevationGainMeters: distanceKm * 6,
      averageHeartrate: 156,
      maxHeartrate: 174,
      averageCadenceSpm: 175,
      isManual: false,
      splits: Array.from({ length: distanceKm }, (_, i) => ({
        splitIndex: i + 1,
        distanceMeters: 1000,
        movingTimeSec: 312 + (i % 4) * 3,
        elevationDiffMeters: i % 2 === 0 ? 6 : -2,
        averageHeartrate: 150 + i,
      })),
    };

    return this.ingestAndScoreActivity(userId, rawInput, ActivitySource.STRAVA);
  }

  uploadGpxXml(userId: string, gpxXml: string, fileName?: string) {
    if (!gpxXml || !gpxXml.includes('<trkpt')) {
      throw new BadRequestException('Nội dung file GPX không hợp lệ (thiếu thẻ <trkpt>).');
    }
    const rawInput = parseGpxToActivityInput(gpxXml, fileName);
    return this.ingestAndScoreActivity(userId, rawInput, ActivitySource.GPX_UPLOAD);
  }

  // --------------------------------------------------------------------------
  // 5. TƯƠNG TÁC MẠNG XÃ HỘI (KUDOS, COMMENTS) & CÂU LẠC BỘ
  // --------------------------------------------------------------------------

  toggleKudo(activityId: string, userId: string) {
    const act = this.getActivityById(activityId);
    const idx = act.kudoedByUserIds.indexOf(userId);
    if (idx >= 0) {
      act.kudoedByUserIds.splice(idx, 1);
      act.kudosCount = Math.max(0, act.kudosCount - 1);
    } else {
      act.kudoedByUserIds.push(userId);
      act.kudosCount += 1;
    }
    this.saveEngineState();
    return act;
  }

  addComment(activityId: string, userId: string, content: string) {
    const act = this.getActivityById(activityId);
    const user = this.users.find((u) => u.id === userId) || this.users[0];
    const cmt = {
      id: `cmt_${Date.now()}`,
      userId: user.id,
      userName: user.fullName,
      content,
      createdAtIso: new Date().toISOString(),
    };
    act.comments.push(cmt);
    this.saveEngineState();
    return cmt;
  }

  getClubs() {
    return this.clubs;
  }

  // --------------------------------------------------------------------------
  // 6. CỔNG QUẢN TRỊ ADMIN (MODERATION QUEUE & RACE-KIT FULFILLMENT)
  // --------------------------------------------------------------------------

  getModerationQueue(eventId?: string) {
    return this.activities.filter((a) => {
      const isSuspicious =
        a.antiCheatStatus === AntiCheatStatus.PARTIAL_VALID ||
        a.antiCheatStatus === AntiCheatStatus.FLAGGED ||
        a.antiCheatStatus === AntiCheatStatus.REJECTED;
      if (!isSuspicious) return false;
      if (eventId) {
        return a.eventContributions?.some((c) => c.eventId === eventId);
      }
      return true;
    });
  }

  moderateActivity(
    activityId: string,
    payload: {
      action: 'APPROVE_VALID' | 'ADJUST_DISTANCE' | 'REJECT_ALL';
      adjustedValidDistanceKm?: number;
      adminNote?: string;
    }
  ) {
    const act = this.getActivityById(activityId);
    if (payload.action === 'APPROVE_VALID') {
      act.antiCheatStatus = AntiCheatStatus.VALID;
      act.adminReviewNote = payload.adminNote || 'Admin đã kiểm tra GPS và xác nhận hợp lệ.';
    } else if (payload.action === 'ADJUST_DISTANCE' && payload.adjustedValidDistanceKm !== undefined) {
      act.validDistanceKm = roundKm(Number(payload.adjustedValidDistanceKm));
      act.antiCheatStatus = AntiCheatStatus.PARTIAL_VALID;
      act.adminReviewNote = payload.adminNote || `Admin đã điều chỉnh số km hợp lệ thành ${act.validDistanceKm} km.`;
    } else if (payload.action === 'REJECT_ALL') {
      act.validDistanceKm = 0;
      act.antiCheatStatus = AntiCheatStatus.REJECTED;
      act.adminReviewNote = payload.adminNote || 'Admin đã từ chối buổi chạy do vi phạm quy chế chống gian lận.';
    }
    this.recalculateUserParticipation(act.userId);
    this.saveEngineState();
    this.persistActivityToDb(act).catch(() => {});
    return act;
  }

  getRaceKitOrders(eventId?: string) {
    let list = this.participations;
    if (eventId) {
      list = list.filter((p) => p.eventId === eventId);
    }
    return list.map((p) => ({
      participationId: p.id,
      eventId: p.eventId,
      bibNumber: p.bibNumber,
      runnerName: p.userName,
      department: p.userDepartment,
      targetCategory: p.categoryName,
      isTargetCompleted: p.dualGoalProgress.target.isCompleted,
      targetProgressPct: p.dualGoalProgress.target.progressPercentage,
      unlockedChallengeCount: p.dualGoalProgress.challenges.filter((c) => c.isUnlocked).length,
      ...p.raceKitOrder,
    }));
  }

  updateRaceKitOrder(
    participationId: string,
    payload: {
      fulfillmentStatus: FulfillmentStatus;
      shippingProvider?: string;
      trackingCode?: string;
    }
  ) {
    const part = this.participations.find((p) => p.id === participationId);
    if (!part) throw new NotFoundException('Không tìm thấy đơn hàng Race-kit');

    part.raceKitOrder.fulfillmentStatus = payload.fulfillmentStatus;
    if (payload.shippingProvider !== undefined) {
      part.raceKitOrder.shippingProvider = payload.shippingProvider;
    }
    if (payload.trackingCode !== undefined) {
      part.raceKitOrder.trackingCode = payload.trackingCode;
    }
    this.saveEngineState();
    prisma.raceKitOrder
      .update({
        where: { participationId },
        data: {
          fulfillmentStatus: payload.fulfillmentStatus as any,
          shippingProvider: payload.shippingProvider,
          trackingCode: payload.trackingCode,
        },
      })
      .catch(() => {});
    return part.raceKitOrder;
  }
}

