import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { TopRunEngineService } from '../services/toprun-engine.service';
import { AccountService } from '../services/account.service';
import { AntiCheatStatus, ChallengeConditionType, EventStatus, EventType, FulfillmentStatus, RunMode } from '@toprun/shared';

@ApiTags('TOPRunAssistant API v1')
@Controller('api/v1')
export class ApiController {
  constructor(
    @Inject(TopRunEngineService) private readonly engine: TopRunEngineService,
    @Inject(AccountService) private readonly accountService: AccountService
  ) { }

  // ==========================================================================
  // 1. HEALTH & SYSTEM OVERVIEW
  // ==========================================================================

  @Get('overview')
  @ApiOperation({ summary: 'Lấy thống kê tổng quan toàn hệ thống TOPRunAssistant' })
  getOverview() {
    return this.engine.getSystemOverview();
  }

  // ==========================================================================
  // 1B. AUTHENTICATION, ACCOUNT MANAGEMENT & STRAVA SYNC STATUS (POSTGRESQL)
  // ==========================================================================

  @Post('auth/register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới (Lưu trực tiếp vào PostgreSQL + cấp JWT Token & gửi Email kích hoạt)' })
  async registerAccount(
    @Body()
    body: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      gender?: 'MALE' | 'FEMALE' | 'OTHER';
      departmentOrUnit?: string;
      defaultShirtSize?: string;
    }
  ) {
    const res = await this.accountService.register(body);
    if (res?.user?.id) {
      await this.engine.ensureUser(res.user.id).catch(() => {});
    }
    return res;
  }

  @Get('auth/verify-email')
  @ApiOperation({ summary: 'Xác thực kích hoạt tài khoản qua link trong Email' })
  async verifyEmail(@Query('token') token: string) {
    return this.accountService.verifyEmail(token);
  }

  @Post('auth/verify-otp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Xác thực kích hoạt tài khoản bằng mã OTP 6 số gửi qua Email' })
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.accountService.verifyOtp(body);
  }

  @Post('auth/resend-activation')
  @HttpCode(200)
  @ApiOperation({ summary: 'Gửi lại email kích hoạt tài khoản' })
  async resendActivation(@Body() body: { email: string }) {
    return this.accountService.resendActivationEmail(body.email);
  }

  @Post('auth/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đăng nhập bằng Email & Mật khẩu (nhận JWT Token & Trạng thái Strava)' })
  async loginAccount(@Body() body: { email: string; password: string }) {
    const res = await this.accountService.login(body);
    if (res?.user?.id) {
      await this.engine.ensureUser(res.user.id).catch(() => {});
    }
    return res;
  }

  @Post('auth/google')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đăng nhập nhanh bằng tài khoản Google (OAuth2 / Google Sign-In)' })
  async loginWithGoogle(
    @Body()
    body: {
      email: string;
      fullName?: string;
      avatarUrl?: string;
      googleId?: string;
    }
  ) {
    const res = await this.accountService.loginWithGoogle(body);
    if (res?.user?.id) {
      await this.engine.ensureUser(res.user.id).catch(() => {});
    }
    return res;
  }

  @Post('auth/forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Yêu cầu mã OTP qua Email để đặt lại mật khẩu' })
  async requestForgotPassword(@Body() body: { email: string }) {
    if (!body?.email) {
      throw new BadRequestException('Vui lòng cung cấp địa chỉ email.');
    }
    return await this.accountService.requestPasswordResetOtp(body.email);
  }

  @Post('auth/reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Xác thực mã OTP và đặt lại mật khẩu mới' })
  async resetPasswordWithOtp(@Body() body: { email: string; otp: string; newPassword: string }) {
    if (!body?.email || !body?.otp || !body?.newPassword) {
      throw new BadRequestException('Vui lòng cung cấp đầy đủ email, mã OTP và mật khẩu mới.');
    }
    return await this.accountService.resetPasswordWithOtp(body);
  }

  @Get('auth/me')
  @ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại từ JWT Token' })
  async getMe(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu token xác thực.');
    }
    const token = authHeader.slice(7);
    const decoded = this.accountService.verifyJwt(token);
    if (!decoded) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn hoặc không hợp lệ.');
    }
    return this.accountService.getMe(decoded.userId);
  }

  // ==========================================================================
  // 1C. ADMIN USER MANAGEMENT & ROLE ASSIGNMENT
  // ==========================================================================

  @Get('admin/users')
  @ApiOperation({ summary: 'Lấy danh sách người dùng cho Quản trị viên (Admin)' })
  async getAdminUsers(
    @Query('search') search?: string,
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền truy cập.');
      }
    }
    return this.accountService.getAllUsers(search);
  }

  @Patch('admin/users/:id/role')
  @ApiOperation({ summary: 'Cập nhật phân quyền vai trò người dùng (ADMIN, ORGANIZER, RUNNER)' })
  async updateAdminUserRole(
    @Param('id') targetUserId: string,
    @Body() body: { role: 'RUNNER' | 'ORGANIZER' | 'ADMIN' },
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền phân quyền.');
      }
    }
    return this.accountService.updateUserRole(targetUserId, body.role);
  }

  @Patch('admin/users/:id/honor-badge')
  @ApiOperation({ summary: 'Cập nhật danh hiệu danh dự đặc biệt (ANGEL_INVESTOR, FOUNDER, VIP_PATRON, ELITE_ATHLETE)' })
  async updateAdminUserHonorBadge(
    @Param('id') targetUserId: string,
    @Body() body: { honorBadge: string | null },
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền phân bổ danh hiệu danh dự.');
      }
    }
    const result = await this.accountService.updateUserHonorBadge(targetUserId, body.honorBadge);
    this.engine.updateUserHonorBadge(targetUserId, body.honorBadge);
    return result;
  }

  @Patch('admin/users/:id/deep-sync-permission')
  @ApiOperation({ summary: 'Cập nhật quyền đồng bộ Strava chuyên sâu (khoảng thời gian dài hoặc tùy chọn ngày)' })
  async updateAdminUserDeepSyncPermission(
    @Param('id') targetUserId: string,
    @Body() body: { canDeepSync: boolean },
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền cấp quyền đồng bộ sâu.');
      }
    }
    const result = await this.accountService.updateUserDeepSyncPermission(targetUserId, body.canDeepSync);
    this.engine.updateUserDeepSyncPermission(targetUserId, body.canDeepSync);
    return result;
  }

  @Post('admin/users/:id/sync-strava')
  @ApiOperation({ summary: 'Quản trị viên kích hoạt đồng bộ Strava trực tiếp cho một vận động viên bất kỳ' })
  async adminTriggerUserStravaSync(
    @Param('id') targetUserId: string,
    @Body() body: { windowDays?: number; startDate?: string; endDate?: string; isAllTime?: boolean },
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền đồng bộ hộ người dùng khác.');
      }
    }
    const windowDays = body?.windowDays || 30;
    const syncRes = await this.engine.syncLiveStravaActivities(targetUserId, windowDays, {
      triggerType: 'DEEP_SYNC',
      startDate: body?.startDate,
      endDate: body?.endDate,
      isAllTime: body?.isAllTime,
    });
    return syncRes;
  }

  @Delete('admin/users/:id')
  @ApiOperation({ summary: 'Xoá tài khoản người dùng (Admin only)' })
  async deleteAdminUser(
    @Param('id') targetUserId: string,
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền xoá người dùng.');
      }
    }
    const res = await this.accountService.deleteUser(targetUserId);
    this.engine.deleteUser(targetUserId);
    return res;
  }

  // ==========================================================================
  // 1D. ADMIN STRAVA API POOL MANAGEMENT & LOAD BALANCING
  // ==========================================================================

  @Get('admin/strava-apps')
  @ApiOperation({ summary: '[Admin] Lấy danh sách Strava API App kèm thống kê slot và danh sách VĐV đã phân bổ' })
  async getAdminStravaApps(@Headers('authorization') authHeader?: string) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền truy cập Strava API Pool.');
      }
    }
    return this.accountService.getAllStravaApps();
  }

  @Post('admin/strava-apps')
  @ApiOperation({ summary: '[Admin] Thêm Strava API App mới vào hệ thống' })
  async createAdminStravaApp(
    @Body()
    body: {
      name: string;
      clientId: string;
      clientSecret: string;
      maxAthletes?: number;
      priority?: number;
    },
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền thêm Strava API App.');
      }
    }
    return this.accountService.createStravaApp(body);
  }

  @Patch('admin/strava-apps/:id')
  @ApiOperation({ summary: '[Admin] Cập nhật thông tin Strava API App (Bật/Tắt, đổi Secret, đổi Max VĐV)' })
  async updateAdminStravaApp(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      clientSecret?: string;
      maxAthletes?: number;
      isActive?: boolean;
      priority?: number;
    },
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền cập nhật Strava API App.');
      }
    }
    return this.accountService.updateStravaApp(id, body);
  }

  @Delete('admin/strava-apps/:id')
  @ApiOperation({ summary: '[Admin] Xoá Strava API App (khi không còn VĐV kết nối)' })
  async deleteAdminStravaApp(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền xoá Strava API App.');
      }
    }
    return this.accountService.deleteStravaApp(id);
  }

  @Get('admin/strava-apps/:id/athletes')
  @ApiOperation({ summary: '[Admin] Xem chi tiết danh sách VĐV đã gán vào một Strava API App cụ thể' })
  async getAdminStravaAppAthletes(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền xem VĐV Strava API App.');
      }
    }
    return this.accountService.getStravaAppAthletes(id);
  }

  @Post('admin/strava-apps/move-athlete')
  @HttpCode(200)
  @ApiOperation({
    summary:
      '[Admin] Di chuyển thủ công 1 VĐV sang Pool Strava khác (Tách biệt Pool, yêu cầu 1-click Re-auth, giữ nguyên lịch sử chạy)',
  })
  async moveAdminStravaAthletePool(
    @Body() body: { userId: string; targetAppId: string },
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền di chuyển VĐV giữa các Pool.');
      }
    }
    return this.accountService.moveAthleteToStravaPool(body.userId, body.targetAppId);
  }

  @Post('admin/strava-apps/:id/evacuate')
  @HttpCode(200)
  @ApiOperation({
    summary:
      '[Admin] Di tản toàn bộ VĐV khỏi 1 Pool hết hạn / ngừng hoạt động sang Pool khác và tạm dừng Pool cũ',
  })
  async evacuateAdminStravaApp(
    @Param('id') id: string,
    @Body() body: { targetAppId?: string },
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền di tản Pool Strava.');
      }
    }
    return this.accountService.evacuateStravaPool(id, body?.targetAppId);
  }

  @Patch('admin/strava-apps/:id/rate-limits')
  @ApiOperation({
    summary:
      '[Admin] Cấu hình giới hạn Rate Limit (Overall 400/15p & 4000/ngày, Read 200/15p & 2000/ngày) hoặc Reset bộ đếm 15 phút của 1 Pool độc lập',
  })
  async updateAdminStravaPoolRateLimits(
    @Param('id') id: string,
    @Body()
    body: {
      overallLimit15m?: number;
      overallLimitDaily?: number;
      readLimit15m?: number;
      readLimitDaily?: number;
      resetCurrent15mUsage?: boolean;
    },
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền cấu hình Rate Limit Pool.');
      }
    }
    return this.accountService.updateStravaPoolRateLimits(id, body);
  }

  @Get('account/:userId')
  @ApiOperation({
    summary:
      'Lấy toàn bộ Thông tin Tài khoản, Thông số Thể chất, Cấu hình Race-kit, Kỷ lục PR & Trạng thái Đồng bộ Strava từ PostgreSQL',
  })
  async getAccountDetails(@Param('userId') userId: string) {
    return this.accountService.getAccountDetails(userId);
  }

  @Patch('account/:userId/profile')
  @ApiOperation({
    summary:
      'Cập nhật Hồ sơ Cá nhân, Thông số Thể chất (Cân nặng, Chiều cao, Max HR), Cỡ áo Race-kit mặc định & Kỷ lục PR',
  })
  async updateAccountProfile(
    @Param('userId') userId: string,
    @Body()
    body: {
      fullName?: string;
      phone?: string;
      gender?: 'MALE' | 'FEMALE' | 'OTHER';
      dateOfBirth?: string;
      departmentOrUnit?: string;
      bio?: string;
      avatarUrl?: string;
      weightKg?: number;
      heightCm?: number;
      maxHeartRate?: number;
      defaultShirtSize?: string;
      defaultShippingAddress?: string;
      pr5kSec?: number | null;
      pr10kSec?: number | null;
      pr21kSec?: number | null;
      pr42kSec?: number | null;
      prCertLink?: string;
    }
  ) {
    const res = await this.accountService.updateProfile(userId, body);
    if (res?.user) {
      this.engine.updateUserProfile(userId, {
        fullName: res.user.fullName,
        avatarUrl: res.user.avatarUrl,
        departmentOrUnit: res.user.departmentOrUnit,
      });
    }
    return res;
  }

  @Post('account/:userId/change-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đổi mật khẩu tài khoản' })
  async changePassword(
    @Param('userId') userId: string,
    @Body() body: { currentPassword?: string; newPassword: string }
  ) {
    return this.accountService.changePassword(userId, body);
  }

  @Post('strava/refresh-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Làm mới chủ động Strava Access Token (Refresh Token) & Kiểm tra quyền đọc Tracklog' })
  async refreshStravaToken(@Body() body: { userId?: string }) {
    return this.accountService.refreshStravaTokenAndVerify(body?.userId || 'usr_admin_01');
  }

  @Post('strava/disconnect')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ngắt liên kết tài khoản Strava (Disconnect)' })
  async disconnectStrava(@Body() body: { userId?: string }) {
    return this.accountService.disconnectStrava(body?.userId || 'usr_admin_01');
  }

  // ==========================================================================
  // 2. USERS, PROFILE & TROPHY CASE (TỦ HUY CHƯƠNG, E-BIB, E-CERT, PRs)
  // ==========================================================================

  @Get('users')
  @ApiOperation({ summary: 'Danh sách vận động viên trong hệ thống' })
  getUsers() {
    return this.engine.getUsers();
  }

  @Get('users/:userId/profile')
  @ApiOperation({
    summary: 'Hồ sơ chi tiết VĐV + Tủ Huy Chương (E-BIB, E-Certificate, Challenge Badges, PRs, Đơn hàng Race-kit)',
  })
  async getUserProfile(@Param('userId') userId: string) {
    return await this.engine.getUserProfileAndTrophyCase(userId);
  }

  // ==========================================================================
  // 3. STRAVA OAUTH2 & REAL-TIME WEBHOOK RECEIVER
  // ==========================================================================

  @Get('strava/connect')
  @ApiOperation({
    summary:
      'Tạo đường dẫn OAuth2 liên kết tài khoản Strava với thuật toán tự động phân bổ App còn slot (Fill-First)',
  })
  async getStravaAuthUrl(@Query('userId') userId = 'usr_admin_01') {
    return this.accountService.getStravaAuthUrl(userId);
  }

  @Get('strava/callback')
  @ApiOperation({
    summary:
      'Nhận OAuth2 Callback từ Strava, lưu Token vào PostgreSQL, tự động đồng bộ 30 ngày gần nhất và Redirect về giao diện Web',
  })
  async handleStravaOAuthCallback(
    @Query('code') code: string,
    @Query('state') state = 'usr_admin_01',
    @Res() res: Response
  ) {
    if (!code) {
      throw new BadRequestException('Thiếu tham số code từ Strava OAuth2 Callback');
    }
    const callbackData = await this.accountService.handleStravaOAuthCallbackAndSync(code, state);
    const stravaAvatar = callbackData.athlete?.profile || callbackData.athlete?.profile_medium;
    if (stravaAvatar) {
      await this.engine.updateUserProfile(callbackData.userId, { avatarUrl: stravaAvatar });
    }
    const syncRes = await this.engine.syncLiveStravaActivities(callbackData.userId, 30).catch(() => ({
      syncedActivities: [],
      totalFetchedFromStrava: 0,
      status: 'ERROR',
    }));
    const syncedCount = (syncRes as any).syncedActivities?.length || 0;
    const validCount = (syncRes as any).syncedActivities?.filter((a: any) => a.antiCheatStatus === 'VALID')?.length || syncedCount;

    await this.accountService.recordSyncLog({
      userId: callbackData.userId,
      triggerType: 'OAUTH_CALLBACK_30D',
      windowDays: 30,
      status: 'SUCCESS',
      fetchedCount: (syncRes as any).totalFetchedFromStrava || syncedCount,
      newlySyncedCount: syncedCount,
      validCount,
      flaggedOrCutCount: syncedCount - validCount,
      summaryMessage: `Liên kết OAuth2 Strava (scope: read,activity:read_all) thành công! Đã tự động đồng bộ ${syncedCount} hoạt động chạy bộ trong 30 ngày gần nhất.`,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3005';
    return res.redirect(
      `${frontendUrl}/?tab=account&strava=connected&synced=${syncedCount}&userId=${callbackData.userId}`
    );
  }

  @Post('strava/sync-live')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Đồng bộ trực tiếp các buổi chạy thật từ tài khoản Strava đã kết nối (Hỗ trợ 7, 30 ngày hoặc khoảng thời gian mở rộng nếu được cấp quyền)',
  })
  async syncLiveStrava(@Body() body: {
    userId?: string;
    windowDays?: number;
    startDate?: string;
    endDate?: string;
    isAllTime?: boolean;
  }) {
    const userId = body?.userId || 'usr_admin_01';
    const windowDays = body?.windowDays || 30;
    const isDeep = windowDays > 30 || Boolean(body?.startDate) || Boolean(body?.isAllTime);

    const syncRes = await this.engine.syncLiveStravaActivities(userId, windowDays, {
      triggerType: isDeep ? 'DEEP_SYNC' : 'MANUAL_SYNC',
      startDate: body?.startDate,
      endDate: body?.endDate,
      isAllTime: body?.isAllTime,
    });

    const validCount = Array.isArray(syncRes.syncedActivities)
      ? syncRes.syncedActivities.filter((a: any) => a.antiCheatStatus === AntiCheatStatus.VALID).length
      : 0;
    const flaggedCount = Array.isArray(syncRes.syncedActivities) ? syncRes.syncedActivities.length - validCount : 0;

    let triggerDescription = `${windowDays}D`;
    if (body?.isAllTime) triggerDescription = 'ALL_TIME';
    else if (body?.startDate) triggerDescription = `CUSTOM_${body.startDate}_${body.endDate || 'NOW'}`;

    await this.accountService.recordSyncLog({
      userId,
      triggerType: isDeep ? `DEEP_SYNC_${triggerDescription}` : `MANUAL_SYNC_${windowDays}D`,
      windowDays,
      status:
        syncRes.status === 'SUCCESS' || syncRes.status === 'PARTIAL_QUEUED'
          ? 'SUCCESS'
          : syncRes.status === 'QUEUED_IN_POOL' || syncRes.status === 'COOLDOWN_ACTIVE'
            ? 'PARTIAL_WARNING'
            : syncRes.status === 'FORBIDDEN_DEEP_SYNC'
              ? 'FORBIDDEN'
              : 'REQUIRE_SCOPE',
      fetchedCount: (syncRes as any).totalFetchedFromStrava || 0,
      newlySyncedCount: Array.isArray(syncRes.syncedActivities) ? syncRes.syncedActivities.length : 0,
      validCount,
      flaggedOrCutCount: flaggedCount,
      summaryMessage:
        syncRes.status === 'SUCCESS'
          ? `Đồng bộ Strava (${isDeep ? 'Chuyên sâu ' + triggerDescription : windowDays + ' ngày'}) hoàn tất: Tải về ${(syncRes as any).totalFetchedFromStrava || 0} hoạt động từ Strava, ghi nhận ${syncRes.syncedActivities.length} bài chạy mới (${validCount} hợp lệ, ${flaggedCount} cắt Split).`
          : syncRes.message || 'Cần cấp quyền activity:read_all trên Strava.',
    });

    const accountDetails = await this.accountService.getAccountDetails(userId);
    return {
      ...syncRes,
      accountDetails,
    };
  }

  @Get('webhooks/strava')
  @ApiOperation({ summary: 'Xác thực Strava Webhook Subscription (hub.challenge)' })
  verifyStravaWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string
  ) {
    const expectedToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || 'TOPRUN_STRAVA_VERIFY_TOKEN_2026';
    if (mode === 'subscribe' && token === expectedToken) {
      return { 'hub.challenge': challenge };
    }
    throw new BadRequestException('Invalid Strava Webhook verification token');
  }

  @Post('webhooks/strava')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Nhận sự kiện Real-time từ Strava Webhook (aspect_type: create | update | delete)',
  })
  async handleStravaWebhookEvent(
    @Body()
    eventPayload: {
      object_type: 'activity' | 'athlete';
      object_id: number;
      aspect_type: 'create' | 'update' | 'delete';
      owner_id: number;
      subscription_id?: number;
      event_time?: number;
    }
  ) {
    // Định tuyến sự kiện Webhook theo đúng VĐV (owner_id) và Pool cố định của VĐV đó
    if (eventPayload && eventPayload.object_type) {
      return this.engine.handleRealStravaWebhookEvent(eventPayload);
    }
    if (eventPayload.object_type === 'activity' && eventPayload.aspect_type === 'create') {
      const syncResult = await this.engine.simulateStravaSync({
        userId: 'usr_admin_01',
        scenario: 'clean_run',
      });
      return {
        status: 'EVENT_RECEIVED_AND_SCORED',
        activityId: syncResult.activity.id,
        validDistanceKm: syncResult.evaluation.validDistanceKm,
        finalCountedDistanceKm: syncResult.evaluation.finalCountedDistanceKm,
      };
    }
    return { status: 'EVENT_ACKNOWLEDGED' };
  }

  @Post('strava/simulate-sync')
  @ApiOperation({
    summary:
      'Giả lập đồng bộ Tracklog từ Strava (1. Buổi chạy chuẩn, 2. Cuối tuần nhân đôi x2, 3. Quên tắt Strava khi đi xe máy ở km cuối để kiểm chứng Split-Level Anti-Cheat)',
  })
  async simulateStravaSync(
    @Body()
    body: {
      userId?: string;
      scenario?: 'clean_run' | 'weekend_double' | 'mixed_motorbike_cheat';
    }
  ) {
    return await this.engine.simulateStravaSync(body);
  }

  // ==========================================================================
  // 4. ACTIVITIES (TRACKLOG, SPLITS CHART, GPX UPLOAD, KUDOS & COMMENTS)
  // ==========================================================================

  @Get('activities')
  @ApiOperation({ summary: 'Lấy Bảng tin Hoạt động (Activity Feed) kèm trạng thái Anti-Cheat và Splits' })
  getActivities(
    @Query('userId') queryUserId?: string,
    @Headers('authorization') authHeader?: string
  ) {
    let viewerUserId: string | undefined = undefined;
    let viewerRole = 'RUNNER';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (decoded) {
        viewerRole = decoded.role;
        viewerUserId = decoded.userId;
      }
    }
    const targetUserId = queryUserId;
    return this.engine.getActivities(targetUserId, viewerRole, viewerUserId);
  }

  @Post('admin/activities/deduplicate')
  @HttpCode(200)
  @ApiOperation({ summary: '[Admin] Quét và xoá toàn bộ Tracklog bị trùng lặp (RAM + PostgreSQL), tính lại KM chuẩn cho mọi VĐV' })
  async deduplicateActivities() {
    return this.engine.deduplicateActivitiesAndRecalculate();
  }

  @Get('activities/:id')
  @ApiOperation({ summary: 'Xem chi tiết 1 buổi chạy (Polyline, Splits từng km xanh/đỏ, HR, Elevation)' })
  getActivityById(@Param('id') id: string) {
    return this.engine.getActivityById(id);
  }

  @Patch('activities/:id/visibility')
  @ApiOperation({ summary: 'Ẩn hoặc hiện lại một hoạt động (Khi ẩn sẽ không được tính vào Giải chạy)' })
  toggleActivityVisibility(@Param('id') id: string, @Body() body: { isHidden?: boolean }) {
    return this.engine.toggleActivityVisibility(id, body?.isHidden);
  }

  @Delete('activities/:id')
  @ApiOperation({ summary: 'Xoá hoạt động khỏi Nhật ký và trừ km khỏi Giải chạy' })
  deleteActivity(@Param('id') id: string) {
    return this.engine.deleteActivity(id);
  }

  @Post('activities/upload-gpx')
  @ApiOperation({ summary: 'Tải lên file GPX XML để tự động phân tích tọa độ, chia Splits từng km và chấm điểm' })
  async uploadGpx(@Body() body: { userId?: string; fileName?: string; gpxXmlContent: string }) {
    return await this.engine.uploadGpxXml(body.userId || 'usr_admin_01', body.gpxXmlContent, body.fileName);
  }

  @Post('activities/:id/kudos')
  @ApiOperation({ summary: 'Thả tim (Kudos) cho buổi chạy' })
  async toggleKudo(
    @Param('id') id: string,
    @Body() body: { userId?: string },
    @Headers('authorization') authHeader?: string
  ) {
    let uid = body?.userId;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (decoded?.userId) uid = decoded.userId;
    }
    return await this.engine.toggleKudo(id, uid || '');
  }

  @Post('activities/:id/comments')
  @ApiOperation({ summary: 'Bình luận vào buổi chạy' })
  async addComment(
    @Param('id') id: string,
    @Body() body: { userId?: string; content: string },
    @Headers('authorization') authHeader?: string
  ) {
    let uid = body?.userId;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (decoded?.userId) uid = decoded.userId;
    }
    return await this.engine.addComment(id, uid || '', body.content);
  }

  @Delete('activities/:id/comments/:commentId')
  @ApiOperation({ summary: 'Xoá bình luận trên buổi chạy (Chủ bình luận, Chủ bài viết, hoặc Admin)' })
  async deleteComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Query('userId') queryUserId?: string,
    @Headers('authorization') authHeader?: string
  ) {
    let uid = queryUserId || '';
    let role = 'RUNNER';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (decoded?.userId) uid = decoded.userId;
      if (decoded?.role) role = decoded.role;
    }
    return await this.engine.deleteComment(id, commentId, uid, role);
  }

  // ==========================================================================
  // 5. EVENTS (VIRTUAL RACE & MINI CHALLENGE) — MÔ HÌNH 2 TẦNG TARGET & CHALLENGE
  // ==========================================================================

  @Get('events')
  @ApiOperation({ summary: 'Danh sách các Giải chạy ảo (Virtual Race) & Thử thách (Mini Challenge)' })
  getEvents() {
    return this.engine.getEvents();
  }

  @Get('leaderboard/monthly')
  @ApiOperation({ summary: 'Bảng xếp hạng tổng hợp KM và số buổi chạy trong tháng của toàn bộ VĐV' })
  async getMonthlyLeaderboard(
    @Query('month') monthStr?: string,
    @Query('year') yearStr?: string
  ) {
    const month = monthStr ? parseInt(monthStr, 10) - 1 : undefined;
    const year = yearStr ? parseInt(yearStr, 10) : undefined;
    return await this.engine.getGlobalMonthlyLeaderboard(month, year);
  }

  @Get('events/:idOrSlug')
  @ApiOperation({
    summary:
      'Chi tiết Giải đấu + Bảng xếp hạng Cá nhân & Đội/Phòng ban + Cấu hình 2 Tầng (Mốc Target & Mốc Challenge Awards)',
  })
  getEventDetail(@Param('idOrSlug') idOrSlug: string) {
    return this.engine.getEventBySlugOrId(idOrSlug);
  }

  @Patch('events/:id')
  @ApiOperation({ summary: 'Cập nhật cấu hình Giải chạy ảo hoặc Thử thách (Admin/Organizer)' })
  updateEvent(
    @Param('id') id: string,
    @Body() body: any,
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || (decoded.role !== 'ADMIN' && decoded.role !== 'ORGANIZER')) {
        throw new UnauthorizedException('Chỉ Ban tổ chức (ORGANIZER) hoặc Admin mới có quyền cập nhật giải đấu.');
      }
    }
    return this.engine.updateEvent(id, body);
  }

  @Delete('events/:id')
  @ApiOperation({ summary: 'Xoá Giải chạy ảo (chỉ áp dụng khi chưa có VĐV đăng ký)' })
  deleteEvent(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string
  ) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = this.accountService.verifyJwt(authHeader.slice(7));
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new UnauthorizedException('Chỉ Quản trị viên (ADMIN) mới có quyền xoá giải đấu.');
      }
    }
    return this.engine.deleteEvent(id);
  }

  @Post('events')
  @ApiOperation({ summary: 'Tạo mới Giải chạy Ảo (Admin/Organizer) hoặc Mini Challenge (User)' })
  async createEvent(
    @Body()
    body: {
      title: string;
      subtitle?: string;
      description: string;
      bannerUrl?: string;
      status?: EventStatus;
      ebibConfig?: any;
      eventType: EventType;
      runMode: RunMode;
      startDateIso: string;
      endDateIso: string;
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
    }
  ) {
    return await this.engine.createEvent(body);
  }

  @Post('events/:id/register')
  @ApiOperation({
    summary: 'Đăng ký tham gia giải: Chọn Mốc Target, chọn Đội, đặt size áo Race-kit & Nhận số E-BIB ngay lập tức',
  })
  async registerEvent(
    @Param('id') eventId: string,
    @Body()
    body: {
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
    return await this.engine.registerForEvent(eventId, body);
  }

  @Patch('events/:id/bib')
  @ApiOperation({
    summary: 'Cập nhật số BIB cá nhân trong giải (kiểm tra chống trùng lặp)',
  })
  updateEventBib(
    @Param('id') eventId: string,
    @Body() body: { userId: string; bibNumber: string }
  ) {
    return this.engine.updateParticipationBib(eventId, body.userId, body.bibNumber);
  }

  @Get('events/:id/check-bib')
  @ApiOperation({
    summary: 'Kiểm tra tính khả dụng của số BIB trong giải',
  })
  checkBib(
    @Param('id') eventId: string,
    @Query('bib') bib: string,
    @Query('userId') userId?: string
  ) {
    return this.engine.checkBibAvailability(eventId, bib, userId);
  }

  // ==========================================================================
  // 6. CLUBS / TEAMS & ADMIN PORTAL (MODERATION + RACE-KIT FULFILLMENT)
  // ==========================================================================

  @Get('clubs')
  @ApiOperation({ summary: 'Danh sách Câu lạc bộ / Đội nhóm / Phòng ban' })
  getClubs() {
    return this.engine.getClubs();
  }

  @Get('admin/moderation-queue')
  @ApiOperation({ summary: '[Admin] Danh sách các Tracklog bị cắt Split quá tốc độ hoặc nghi vấn gian lận' })
  getModerationQueue(@Query('eventId') eventId?: string) {
    return this.engine.getModerationQueue(eventId);
  }

  @Patch('admin/activities/:id/moderate')
  @ApiOperation({ summary: '[Admin] Phê duyệt, điều chỉnh số km hợp lệ, hoặc từ chối Tracklog nghi vấn' })
  moderateActivity(
    @Param('id') id: string,
    @Body()
    body: {
      action: 'APPROVE_VALID' | 'ADJUST_DISTANCE' | 'REJECT_ALL';
      adjustedValidDistanceKm?: number;
      adminNote?: string;
    }
  ) {
    return this.engine.moderateActivity(id, body);
  }

  @Get('admin/race-kit-orders')
  @ApiOperation({ summary: '[Admin] Quản lý đơn hàng Race-kit (Áo, Huy chương khắc tên, mã vận đơn GHTK/GHN)' })
  getRaceKitOrders(@Query('eventId') eventId?: string) {
    return this.engine.getRaceKitOrders(eventId);
  }

  @Patch('admin/race-kit-orders/:participationId')
  @ApiOperation({ summary: '[Admin] Cập nhật trạng thái đóng gói & mã vận đơn giao Huy chương / Áo' })
  updateRaceKitOrder(
    @Param('participationId') participationId: string,
    @Body()
    body: {
      fulfillmentStatus: FulfillmentStatus;
      shippingProvider?: string;
      trackingCode?: string;
    }
  ) {
    return this.engine.updateRaceKitOrder(participationId, body);
  }
}
