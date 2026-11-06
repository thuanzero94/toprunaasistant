import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma } from '@toprun/database';
import * as crypto from 'node:crypto';
import {
  EvaluatedPoolQuota,
  StravaJobPriority,
  StravaPoolRateSnapshot,
  STRAVA_DEFAULT_OVERALL_LIMIT_15M,
  STRAVA_DEFAULT_OVERALL_LIMIT_DAILY,
  STRAVA_DEFAULT_READ_LIMIT_15M,
  STRAVA_DEFAULT_READ_LIMIT_DAILY,
  STRAVA_MANUAL_SYNC_COOLDOWN_SEC,
  evaluateStravaPoolQuota,
  getStravaWindowTiming,
  parseStravaRateLimitHeaders,
} from '@toprun/shared';

export interface PoolTrackedFetchOptions {
  stravaAppId: string;
  url: string;
  init?: RequestInit;
  isReadRequest: boolean; // true = tính vào cả Read (200/2000) & Overall (400/4000); false = chỉ tính vào Overall (VD: POST /oauth/token)
  priority?: StravaJobPriority;
}

export interface PoolCooldownCheckResult {
  allowed: boolean;
  remainingSec: number;
  lastSyncAtIso: string | null;
  message?: string;
}

@Injectable()
export class StravaPoolLimiterService implements OnModuleInit, OnModuleDestroy {
  // Cache in-memory tách biệt hoàn toàn theo từng stravaAppId (Write-through xuống PostgreSQL)
  private poolSnapshots = new Map<string, StravaPoolRateSnapshot>();
  // Cooldown bấm tay của từng User (userId -> epoch ms)
  private userManualSyncTimestamps = new Map<string, number>();
  private workerTimer: NodeJS.Timeout | null = null;
  private isProcessingQueues = false;
  private jobProcessorCallback: ((job: {
    id: string;
    stravaAppId: string;
    userId: string;
    jobType: string;
    activityExtId: string | null;
    windowDays: number;
  }) => Promise<any>) | null = null;

  async onModuleInit() {
    await this.ensureDatabaseSchema();
    await this.hydrateFromDatabase();
    // Worker định kỳ kiểm tra hàng đợi riêng của từng Pool mỗi 10 giây
    this.workerTimer = setInterval(() => {
      this.processAllPoolQueues().catch(() => {});
    }, 10_000);
  }

  onModuleDestroy() {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }
  }

  registerJobProcessor(
    fn: (job: {
      id: string;
      stravaAppId: string;
      userId: string;
      jobType: string;
      activityExtId: string | null;
      windowDays: number;
    }) => Promise<any>
  ) {
    this.jobProcessorCallback = fn;
  }

  /**
   * Tự động đảm bảo các cột Rate Limit độc lập của từng Pool và bảng hàng đợi strava_pool_jobs tồn tại trong PostgreSQL
   */
  async ensureDatabaseSchema() {
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "strava_apps"
        ADD COLUMN IF NOT EXISTS "overallLimit15m" INTEGER NOT NULL DEFAULT 400,
        ADD COLUMN IF NOT EXISTS "overallLimitDaily" INTEGER NOT NULL DEFAULT 4000,
        ADD COLUMN IF NOT EXISTS "overallUsage15m" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "overallUsageDaily" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "readLimit15m" INTEGER NOT NULL DEFAULT 200,
        ADD COLUMN IF NOT EXISTS "readLimitDaily" INTEGER NOT NULL DEFAULT 2000,
        ADD COLUMN IF NOT EXISTS "readUsage15m" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "readUsageDaily" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "window15mKey" TEXT,
        ADD COLUMN IF NOT EXISTS "windowDailyKey" TEXT,
        ADD COLUMN IF NOT EXISTS "lastRateLimitUpdatedAt" TIMESTAMP(3);
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "strava_pool_jobs" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "stravaAppId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "athleteId" TEXT,
          "jobType" TEXT NOT NULL DEFAULT 'MANUAL_SYNC',
          "priority" INTEGER NOT NULL DEFAULT 2,
          "status" TEXT NOT NULL DEFAULT 'QUEUED',
          "activityExtId" TEXT,
          "windowDays" INTEGER NOT NULL DEFAULT 30,
          "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "attempts" INTEGER NOT NULL DEFAULT 0,
          "statusMessage" TEXT,
          "resultJson" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "completedAt" TIMESTAMP(3),
          CONSTRAINT "strava_pool_jobs_stravaAppId_fkey"
            FOREIGN KEY ("stravaAppId") REFERENCES "strava_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "strava_pool_jobs_pool_status_idx"
        ON "strava_pool_jobs"("stravaAppId", "status", "priority", "scheduledFor");
      `);
    } catch {
      // Bỏ qua nếu bảng strava_apps chưa khởi tạo xong ở mili-giây đầu
    }
  }

  async hydrateFromDatabase() {
    try {
      await this.ensureDatabaseSchema();
      const rows: any[] = await prisma.$queryRawUnsafe(`
        SELECT
          "id",
          "overallLimit15m",
          "overallLimitDaily",
          "overallUsage15m",
          "overallUsageDaily",
          "readLimit15m",
          "readLimitDaily",
          "readUsage15m",
          "readUsageDaily",
          "window15mKey",
          "windowDailyKey"
        FROM "strava_apps"
      `);
      const now = new Date();
      for (const app of rows) {
        const evaluated = evaluateStravaPoolQuota(
          {
            overallLimit15m: Number(app.overallLimit15m ?? STRAVA_DEFAULT_OVERALL_LIMIT_15M),
            overallLimitDaily: Number(app.overallLimitDaily ?? STRAVA_DEFAULT_OVERALL_LIMIT_DAILY),
            overallUsage15m: Number(app.overallUsage15m ?? 0),
            overallUsageDaily: Number(app.overallUsageDaily ?? 0),
            readLimit15m: Number(app.readLimit15m ?? STRAVA_DEFAULT_READ_LIMIT_15M),
            readLimitDaily: Number(app.readLimitDaily ?? STRAVA_DEFAULT_READ_LIMIT_DAILY),
            readUsage15m: Number(app.readUsage15m ?? 0),
            readUsageDaily: Number(app.readUsageDaily ?? 0),
            window15mKey: app.window15mKey ?? null,
            windowDailyKey: app.windowDailyKey ?? null,
          },
          now
        );
        this.poolSnapshots.set(app.id, {
          overallLimit15m: evaluated.overallLimit15m,
          overallLimitDaily: evaluated.overallLimitDaily,
          overallUsage15m: evaluated.overallUsage15m,
          overallUsageDaily: evaluated.overallUsageDaily,
          readLimit15m: evaluated.readLimit15m,
          readLimitDaily: evaluated.readLimitDaily,
          readUsage15m: evaluated.readUsage15m,
          readUsageDaily: evaluated.readUsageDaily,
          window15mKey: evaluated.window15mKey,
          windowDailyKey: evaluated.windowDailyKey,
        });
      }
    } catch {
      // Bỏ qua nếu DB đang khởi tạo
    }
  }

  /**
   * Lấy thông số Quota thực tế của 1 Pool độc lập (tự động reset nếu sang khung 15p hoặc ngày mới)
   */
  getPoolQuota(stravaAppId: string, now: Date = new Date()): EvaluatedPoolQuota {
    const existing = this.poolSnapshots.get(stravaAppId) || {
      overallLimit15m: STRAVA_DEFAULT_OVERALL_LIMIT_15M,
      overallLimitDaily: STRAVA_DEFAULT_OVERALL_LIMIT_DAILY,
      overallUsage15m: 0,
      overallUsageDaily: 0,
      readLimit15m: STRAVA_DEFAULT_READ_LIMIT_15M,
      readLimitDaily: STRAVA_DEFAULT_READ_LIMIT_DAILY,
      readUsage15m: 0,
      readUsageDaily: 0,
      window15mKey: null,
      windowDailyKey: null,
    };

    const evaluated = evaluateStravaPoolQuota(existing, now);
    if (
      existing.window15mKey !== evaluated.window15mKey ||
      existing.windowDailyKey !== evaluated.windowDailyKey
    ) {
      const resetSnapshot: StravaPoolRateSnapshot = {
        overallLimit15m: evaluated.overallLimit15m,
        overallLimitDaily: evaluated.overallLimitDaily,
        overallUsage15m: evaluated.overallUsage15m,
        overallUsageDaily: evaluated.overallUsageDaily,
        readLimit15m: evaluated.readLimit15m,
        readLimitDaily: evaluated.readLimitDaily,
        readUsage15m: evaluated.readUsage15m,
        readUsageDaily: evaluated.readUsageDaily,
        window15mKey: evaluated.window15mKey,
        windowDailyKey: evaluated.windowDailyKey,
      };
      this.poolSnapshots.set(stravaAppId, resetSnapshot);
      this.persistSnapshotToDb(stravaAppId, resetSnapshot).catch(() => {});
    }
    return evaluated;
  }

  private async persistSnapshotToDb(stravaAppId: string, snap: StravaPoolRateSnapshot) {
    try {
      await prisma.$executeRaw`
        UPDATE "strava_apps"
        SET
          "overallLimit15m" = ${snap.overallLimit15m},
          "overallLimitDaily" = ${snap.overallLimitDaily},
          "overallUsage15m" = ${snap.overallUsage15m},
          "overallUsageDaily" = ${snap.overallUsageDaily},
          "readLimit15m" = ${snap.readLimit15m},
          "readLimitDaily" = ${snap.readLimitDaily},
          "readUsage15m" = ${snap.readUsage15m},
          "readUsageDaily" = ${snap.readUsageDaily},
          "window15mKey" = ${snap.window15mKey || null},
          "windowDailyKey" = ${snap.windowDailyKey || null},
          "lastRateLimitUpdatedAt" = NOW()
        WHERE "id" = ${stravaAppId}
      `;
    } catch {
      // Ignore transient DB write error
    }
  }

  /**
   * Kiểm tra xem Pool của User có đủ ngân sách cho mức ưu tiên yêu cầu hay không
   */
  canPoolExecute(stravaAppId: string, priority: StravaJobPriority = 2, estimatedReads = 1): {
    allowed: boolean;
    quota: EvaluatedPoolQuota;
    reason?: string;
  } {
    const quota = this.getPoolQuota(stravaAppId);

    if (priority === 1) {
      if (!quota.canRunHighPriority || quota.remainingRead15m < 1 || quota.remainingOverall15m < 1) {
        return {
          allowed: false,
          quota,
          reason: `Pool hiện đã chạm ngưỡng bảo vệ 95% (${quota.readUsage15m}/${quota.readLimit15m} Read, ${quota.overallUsage15m}/${quota.overallLimit15m} Overall). Tự động xếp hàng chờ ${quota.secondsUntilNext15mReset}s tới khung 15 phút kế tiếp.`,
        };
      }
      return { allowed: true, quota };
    }

    // Priority 2 (Manual) hoặc 3 (Backfill): Dừng khi chạm 85% để chừa 15% (30 Read / 60 Overall) cho Webhook
    const projectedRead15m = quota.readUsage15m + estimatedReads;
    const projectedOverall15m = quota.overallUsage15m + estimatedReads;
    if (
      !quota.canRunNormalOrLowPriority ||
      projectedRead15m > quota.safetyThresholdRead15m ||
      projectedOverall15m > quota.safetyThresholdOverall15m
    ) {
      return {
        allowed: false,
        quota,
        reason: `Pool đang bảo lưu 15% ngân sách cho Real-time Webhook (Hiện tại: ${quota.readUsage15m}/${quota.readLimit15m} Read 15p, ngưỡng an toàn 85% = ${quota.safetyThresholdRead15m}). Yêu cầu của bạn đã được xếp vào hàng đợi riêng của Pool và sẽ tự động chạy sau ${Math.ceil(quota.secondsUntilNext15mReset / 60)} phút.`,
      };
    }

    return { allowed: true, quota };
  }

  /**
   * Kiểm tra Cooldown 15 phút khi VĐV bấm "Đồng bộ thủ công" trong Pool
   */
  checkUserManualSyncCooldown(userId: string, bypassCooldown = false): PoolCooldownCheckResult {
    if (bypassCooldown) {
      return { allowed: true, remainingSec: 0, lastSyncAtIso: null };
    }
    const lastMs = this.userManualSyncTimestamps.get(userId);
    if (!lastMs) {
      return { allowed: true, remainingSec: 0, lastSyncAtIso: null };
    }
    const elapsedSec = Math.floor((Date.now() - lastMs) / 1000);
    if (elapsedSec < STRAVA_MANUAL_SYNC_COOLDOWN_SEC) {
      const remainingSec = STRAVA_MANUAL_SYNC_COOLDOWN_SEC - elapsedSec;
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      return {
        allowed: false,
        remainingSec,
        lastSyncAtIso: new Date(lastMs).toISOString(),
        message: `Để bảo vệ hạn mức Đọc (200 req/15 phút) cho Pool của bạn, mỗi VĐV chỉ đồng bộ thủ công tối đa 1 lần mỗi 15 phút. Vui lòng thử lại sau ${mins > 0 ? `${mins} phút ` : ''}${secs} giây (các bài chạy mới qua Webhook vẫn tự động cập nhật tức thì).`,
      };
    }
    return { allowed: true, remainingSec: 0, lastSyncAtIso: new Date(lastMs).toISOString() };
  }

  markUserManualSynced(userId: string) {
    this.userManualSyncTimestamps.set(userId, Date.now());
  }

  /**
   * Thực thi HTTP request tới Strava API thông qua bộ đếm độc lập của đúng Pool đó.
   */
  async trackedStravaFetch(options: PoolTrackedFetchOptions): Promise<Response> {
    const { stravaAppId, url, init, isReadRequest } = options;
    const response = await fetch(url, init);
    await this.recordResponseUsage(stravaAppId, response, isReadRequest);
    return response;
  }

  async recordResponseUsage(stravaAppId: string, response: Response, isReadRequest: boolean) {
    const now = new Date();
    const current = this.getPoolQuota(stravaAppId, now);
    const parsed = parseStravaRateLimitHeaders(response.headers);

    // Tự tăng bộ đếm cục bộ của riêng Pool này
    let nextOverall15m = current.overallUsage15m + 1;
    let nextOverallDaily = current.overallUsageDaily + 1;
    let nextRead15m = current.readUsage15m + (isReadRequest ? 1 : 0);
    let nextReadDaily = current.readUsageDaily + (isReadRequest ? 1 : 0);

    const overallLimit15m = current.overallLimit15m;
    const overallLimitDaily = current.overallLimitDaily;
    const readLimit15m = current.readLimit15m;
    const readLimitDaily = current.readLimitDaily;

    // Đồng bộ với Header X-RateLimit / X-ReadRateLimit thực tế trả về từ Strava
    if (parsed.overallUsage15m !== undefined) {
      nextOverall15m = Math.max(nextOverall15m, parsed.overallUsage15m);
    }
    if (parsed.overallUsageDaily !== undefined) {
      nextOverallDaily = Math.max(nextOverallDaily, parsed.overallUsageDaily);
    }
    if (parsed.readUsage15m !== undefined) {
      nextRead15m = Math.max(nextRead15m, parsed.readUsage15m);
    } else if (isReadRequest && parsed.overallUsage15m !== undefined && parsed.readLimit15m === undefined) {
      if (parsed.overallLimit15m && parsed.overallLimit15m <= 200) {
        nextRead15m = Math.max(nextRead15m, parsed.overallUsage15m);
      }
    }
    if (parsed.readUsageDaily !== undefined) {
      nextReadDaily = Math.max(nextReadDaily, parsed.readUsageDaily);
    }

    if (response.status === 429) {
      nextRead15m = readLimit15m;
      nextOverall15m = overallLimit15m;
    }

    const updatedSnapshot: StravaPoolRateSnapshot = {
      overallLimit15m,
      overallLimitDaily,
      overallUsage15m: nextOverall15m,
      overallUsageDaily: nextOverallDaily,
      readLimit15m,
      readLimitDaily,
      readUsage15m: nextRead15m,
      readUsageDaily: nextReadDaily,
      window15mKey: current.window15mKey,
      windowDailyKey: current.windowDailyKey,
    };

    this.poolSnapshots.set(stravaAppId, updatedSnapshot);
    await this.persistSnapshotToDb(stravaAppId, updatedSnapshot);
  }

  /**
   * Cho phép Admin cấu hình lại trần giới hạn hoặc reset bộ đếm của 1 Pool độc lập
   */
  async updatePoolRateLimitConfig(
    stravaAppId: string,
    payload: {
      overallLimit15m?: number;
      overallLimitDaily?: number;
      readLimit15m?: number;
      readLimitDaily?: number;
      resetCurrent15mUsage?: boolean;
    }
  ) {
    const current = this.getPoolQuota(stravaAppId);
    const updatedSnapshot: StravaPoolRateSnapshot = {
      overallLimit15m: payload.overallLimit15m !== undefined ? Math.max(10, Number(payload.overallLimit15m)) : current.overallLimit15m,
      overallLimitDaily: payload.overallLimitDaily !== undefined ? Math.max(100, Number(payload.overallLimitDaily)) : current.overallLimitDaily,
      readLimit15m: payload.readLimit15m !== undefined ? Math.max(10, Number(payload.readLimit15m)) : current.readLimit15m,
      readLimitDaily: payload.readLimitDaily !== undefined ? Math.max(100, Number(payload.readLimitDaily)) : current.readLimitDaily,
      overallUsage15m: payload.resetCurrent15mUsage ? 0 : current.overallUsage15m,
      overallUsageDaily: current.overallUsageDaily,
      readUsage15m: payload.resetCurrent15mUsage ? 0 : current.readUsage15m,
      readUsageDaily: current.readUsageDaily,
      window15mKey: current.window15mKey,
      windowDailyKey: current.windowDailyKey,
    };
    this.poolSnapshots.set(stravaAppId, updatedSnapshot);
    await this.persistSnapshotToDb(stravaAppId, updatedSnapshot);
    return this.getPoolQuota(stravaAppId);
  }

  /**
   * Đẩy 1 yêu cầu đồng bộ vào Hàng đợi riêng của Pool (khi Pool đang chạm ngưỡng 85% hoặc 95%)
   */
  async enqueuePoolJob(params: {
    stravaAppId: string;
    userId: string;
    athleteId?: string | null;
    jobType: 'WEBHOOK_ACTIVITY' | 'MANUAL_SYNC' | 'BACKFILL_SYNC';
    priority: StravaJobPriority;
    activityExtId?: string | null;
    windowDays?: number;
    delayUntilNextWindow?: boolean;
  }) {
    await this.ensureDatabaseSchema();
    const timing = getStravaWindowTiming();
    const scheduledFor = params.delayUntilNextWindow
      ? new Date(timing.next15mResetAtIso)
      : new Date();

    const existingRows: any[] = await prisma.$queryRaw`
      SELECT * FROM "strava_pool_jobs"
      WHERE "stravaAppId" = ${params.stravaAppId}
        AND "userId" = ${params.userId}
        AND "jobType" = ${params.jobType}
        AND "status" IN ('QUEUED', 'DELAYED')
      LIMIT 1
    `;

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      const schedDate = new Date(existing.scheduledFor);
      return {
        job: existing,
        isDuplicate: true,
        scheduledForIso: schedDate.toISOString(),
        secondsUntilExecution: Math.max(1, Math.ceil((schedDate.getTime() - Date.now()) / 1000)),
      };
    }

    const id = `spj_${crypto.randomBytes(8).toString('hex')}`;
    const status = params.delayUntilNextWindow ? 'DELAYED' : 'QUEUED';
    const statusMessage = params.delayUntilNextWindow
      ? `Đang chờ chu kỳ 15 phút kế tiếp của Pool (${timing.next15mResetAtIso})`
      : 'Đang xếp hàng chờ xử lý trong Pool';

    await prisma.$executeRaw`
      INSERT INTO "strava_pool_jobs" (
        "id", "stravaAppId", "userId", "athleteId", "jobType", "priority",
        "status", "activityExtId", "windowDays", "scheduledFor", "statusMessage", "updatedAt"
      ) VALUES (
        ${id}, ${params.stravaAppId}, ${params.userId}, ${params.athleteId || null},
        ${params.jobType}, ${params.priority}, ${status}, ${params.activityExtId || null},
        ${params.windowDays ?? 30}, ${scheduledFor}, ${statusMessage}, NOW()
      )
    `;

    return {
      job: {
        id,
        stravaAppId: params.stravaAppId,
        userId: params.userId,
        jobType: params.jobType,
        priority: params.priority,
        status,
        scheduledFor,
        statusMessage,
      },
      isDuplicate: false,
      scheduledForIso: scheduledFor.toISOString(),
      secondsUntilExecution: Math.max(1, Math.ceil((scheduledFor.getTime() - Date.now()) / 1000)),
    };
  }

  /**
   * Lấy thống kê hàng đợi của 1 Pool độc lập hoặc tất cả các Pool
   */
  async getPoolQueueStats(stravaAppId?: string) {
    try {
      const jobs: any[] = stravaAppId
        ? await prisma.$queryRaw`
            SELECT * FROM "strava_pool_jobs"
            WHERE "stravaAppId" = ${stravaAppId}
              AND "status" IN ('QUEUED', 'DELAYED', 'PROCESSING')
            ORDER BY "priority" ASC, "scheduledFor" ASC
            LIMIT 50
          `
        : await prisma.$queryRaw`
            SELECT * FROM "strava_pool_jobs"
            WHERE "status" IN ('QUEUED', 'DELAYED', 'PROCESSING')
            ORDER BY "priority" ASC, "scheduledFor" ASC
            LIMIT 100
          `;

      return {
        queuedCount: jobs.filter((j: any) => j.status === 'QUEUED').length,
        delayedCount: jobs.filter((j: any) => j.status === 'DELAYED').length,
        processingCount: jobs.filter((j: any) => j.status === 'PROCESSING').length,
        activeJobs: jobs,
      };
    } catch {
      return { queuedCount: 0, delayedCount: 0, processingCount: 0, activeJobs: [] };
    }
  }

  /**
   * Worker chạy ngầm: Duyệt độc lập từng Pool (không bao giờ trộn job giữa các Pool)
   */
  async processAllPoolQueues() {
    if (this.isProcessingQueues || !this.jobProcessorCallback) return;
    this.isProcessingQueues = true;
    try {
      const pendingJobs: any[] = await prisma.$queryRaw`
        SELECT * FROM "strava_pool_jobs"
        WHERE "status" IN ('QUEUED', 'DELAYED')
          AND "scheduledFor" <= NOW()
        ORDER BY "priority" ASC, "createdAt" ASC
        LIMIT 20
      `;

      for (const job of pendingJobs) {
        const check = this.canPoolExecute(job.stravaAppId, Number(job.priority) as StravaJobPriority, 2);
        if (!check.allowed) {
          const nextSched = new Date(check.quota.next15mResetAtIso);
          await prisma.$executeRaw`
            UPDATE "strava_pool_jobs"
            SET "status" = 'DELAYED', "scheduledFor" = ${nextSched}, "statusMessage" = ${check.reason || null}, "updatedAt" = NOW()
            WHERE "id" = ${job.id}
          `;
          continue;
        }

        await prisma.$executeRaw`
          UPDATE "strava_pool_jobs"
          SET "status" = 'PROCESSING', "attempts" = "attempts" + 1, "updatedAt" = NOW()
          WHERE "id" = ${job.id}
        `;

        try {
          await this.jobProcessorCallback({
            id: job.id,
            stravaAppId: job.stravaAppId,
            userId: job.userId,
            jobType: job.jobType,
            activityExtId: job.activityExtId,
            windowDays: Number(job.windowDays || 30),
          });
          await prisma.$executeRaw`
            UPDATE "strava_pool_jobs"
            SET "status" = 'COMPLETED', "completedAt" = NOW(), "statusMessage" = 'Đồng bộ hoàn tất từ hàng đợi Pool', "updatedAt" = NOW()
            WHERE "id" = ${job.id}
          `;
        } catch (err: any) {
          const nextStatus = Number(job.attempts) >= 3 ? 'FAILED' : 'DELAYED';
          const retryAt = new Date(Date.now() + 60_000);
          const msg = err?.message || 'Lỗi khi thực thi job trong Pool';
          await prisma.$executeRaw`
            UPDATE "strava_pool_jobs"
            SET "status" = ${nextStatus}, "scheduledFor" = ${retryAt}, "statusMessage" = ${msg}, "updatedAt" = NOW()
            WHERE "id" = ${job.id}
          `;
        }
      }
    } catch {
      // Bỏ qua lỗi tạm thời
    } finally {
      this.isProcessingQueues = false;
    }
  }
}
