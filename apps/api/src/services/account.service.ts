import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { prisma, Gender, UserRole } from '@toprun/database';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as cp from 'node:child_process';
import { MailService } from './mail.service';

/**
 * Dịch vụ Quản lý Tài khoản, Xác thực (Auth), Hồ sơ VĐV & Trạng thái Đồng bộ Strava
 * Lưu trữ 100% trong PostgreSQL (container `toprun-postgres` cổng 5433)
 */
@Injectable()
export class AccountService implements OnModuleInit {
  private readonly jwtSecret = process.env.JWT_SECRET || 'toprun_super_secret_jwt_key_2026';

  private readonly stravaClientId = process.env.STRAVA_CLIENT_ID || '292007';
  private readonly stravaClientSecret =
    process.env.STRAVA_CLIENT_SECRET || '54eb7308f454c98fb5e452edb41f1108afb66b10';
  private readonly defaultStravaAccessToken =
    process.env.STRAVA_ACCESS_TOKEN || 'ccba19beaffea3cb04a15793c809d5cc85fc3135';
  private readonly defaultStravaRefreshToken =
    process.env.STRAVA_REFRESH_TOKEN || '79d8109794a6b4c3dfe0a330c5bbcee939f81b15';
  private readonly stravaRedirectUri =
    process.env.STRAVA_REDIRECT_URI || 'http://localhost:4000/api/v1/strava/callback';
  private readonly frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3005';
  private readonly otpStore = new Map<string, { code: string; userId: string; email: string; expiresAt: number }>();

  constructor(@Inject(MailService) private readonly mailService: MailService) {}

  async onModuleInit() {
    await this.ensureDefaultAccountsInPostgres();
  }

  // --------------------------------------------------------------------------
  // 1. MÃ HÓA MẬT KHẨU (SCRYPT) & JWT TOKEN
  // --------------------------------------------------------------------------

  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derived}`;
  }

  verifyPassword(password: string, storedHash: string | null | undefined): boolean {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, key] = storedHash.split(':');
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
  }

  signJwt(payload: Record<string, any>, expiresInSec = 7 * 24 * 3600): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(
      JSON.stringify({
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + expiresInSec,
      })
    ).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${header}.${body}`)
      .digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  verifyJwt(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, body, sig] = parts;
      const expectedSig = crypto
        .createHmac('sha256', this.jwtSecret)
        .update(`${header}.${body}`)
        .digest('base64url');
      if (sig !== expectedSig) return null;
      const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
      return decoded;
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // 2. KHỞI TẠO TÀI KHOẢN MẶC ĐỊNH & STRAVA CONNECTION TRONG POSTGRESQL
  // --------------------------------------------------------------------------

  private async ensureDefaultAccountsInPostgres() {
    try {
      const defaultPwdHash = this.hashPassword('TopRun@2026');

      const adminUser = await prisma.user.upsert({
        where: { email: 'admin@toprun.vn' },
        update: {
          role: UserRole.ADMIN,
        },
        create: {
          id: 'usr_admin_01',
          email: 'admin@toprun.vn',
          passwordHash: defaultPwdHash,
          fullName: 'Nguyễn Hữu Thuận (Alan Hoàng)',
          avatarUrl:
            'https://dgalywyr863hv.cloudfront.net/pictures/athletes/126278000/57450920/1/large.jpg',
          gender: Gender.MALE,
          phone: '0909123456',
          departmentOrUnit: 'ASSA ABLOY Engineering',
          bio: 'Runner & System Architect • Chinh phục mọi giới hạn cùng TOPRunAssistant',
          role: UserRole.ADMIN,
          weightKg: 68,
          heightCm: 173,
          maxHeartRate: 192,
          defaultShirtSize: 'L',
          defaultShippingAddress: 'Tòa nhà ASSA ABLOY Vietnam, Hà Nội',
          totalDistanceKm: 184.5,
          totalActivities: 18,
          pr5kSec: 1290,  // 21:30
          pr10kSec: 2740, // 45:40
          pr21kSec: 6120, // 1:42:00
          pr42kSec: 13500,// 3:45:00
          prCertLink: 'https://www.strava.com/athletes/126278000',
        },
      });

      // Khởi tạo Strava App #1 (Primary) từ cấu hình mặc định (292007)
      const defaultApp = await prisma.stravaApp.upsert({
        where: { clientId: this.stravaClientId },
        update: {
          name: 'Strava App #1 (Primary)',
          clientSecret: this.stravaClientSecret,
          maxAthletes: 10,
          isActive: true,
          priority: 1,
        },
        create: {
          id: 'strava_app_01',
          name: 'Strava App #1 (Primary)',
          clientId: this.stravaClientId,
          clientSecret: this.stravaClientSecret,
          maxAthletes: 10,
          isActive: true,
          priority: 1,
        },
      });

      // Liên kết Strava App #1 với Athlete #126278000 (Nguyễn Hữu Thuận)
      await prisma.stravaConnection.upsert({
        where: { userId: adminUser.id },
        update: {
          athleteId: '126278000',
          firstname: 'Thuận',
          lastname: 'Nguyễn Hữu',
          city: 'Hà Nội',
          country: 'Vietnam',
          profilePicUrl:
            'https://dgalywyr863hv.cloudfront.net/pictures/athletes/126278000/57450920/1/large.jpg',
          accessToken: this.defaultStravaAccessToken,
          refreshToken: this.defaultStravaRefreshToken,
          stravaAppId: defaultApp.id,
        },
        create: {
          userId: adminUser.id,
          athleteId: '126278000',
          username: 'thuan_nguyen_huu',
          firstname: 'Thuận',
          lastname: 'Nguyễn Hữu',
          city: 'Hà Nội',
          country: 'Vietnam',
          profilePicUrl:
            'https://dgalywyr863hv.cloudfront.net/pictures/athletes/126278000/57450920/1/large.jpg',
          accessToken: this.defaultStravaAccessToken,
          refreshToken: this.defaultStravaRefreshToken,
          expiresAt: Math.floor(Date.now() / 1000) + 21600,
          scopes: 'read',
          syncStatus: 'REQUIRE_ACTIVITY_SCOPE',
          isActive: true,
          stravaAppId: defaultApp.id,
          lastSyncAt: new Date(),
          lastErrorMsg:
            'Token mặc định trên trang cài đặt Strava chỉ có quyền "read". Nhấn "Cấp Quyền Đọc Tracklog (activity:read_all)" để đồng bộ toàn bộ bài chạy.',
        },
      });

      await prisma.stravaConnection.updateMany({
        where: { stravaAppId: null },
        data: { stravaAppId: defaultApp.id },
      });

      // Thêm 1 bản ghi lịch sử đồng bộ mẫu nếu chưa có
      const logCount = await prisma.stravaSyncLog.count({ where: { userId: adminUser.id } });
      if (logCount === 0) {
        await prisma.stravaSyncLog.create({
          data: {
            userId: adminUser.id,
            triggerType: 'INITIAL_CHECK',
            windowDays: 30,
            status: 'REQUIRE_SCOPE',
            fetchedCount: 0,
            newlySyncedCount: 0,
            validCount: 0,
            flaggedOrCutCount: 0,
            summaryMessage:
              'Đã xác thực thành công Strava Athlete #126278000 (Nguyễn Hữu Thuận - Hà Nội). Đang chờ cấp quyền scope "activity:read_all" qua OAuth2.',
          },
        });
      }
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
        console.log('🔄 [AccountService] Phát hiện bảng cơ sở dữ liệu chưa được khởi tạo. Đang tự động chạy prisma db push...');
        try {
          const candidates = [
            path.resolve(process.cwd(), 'packages/database/prisma/schema.prisma'),
            path.resolve(process.cwd(), 'prisma/schema.prisma'),
            path.resolve(__dirname, '../../packages/database/prisma/schema.prisma'),
            path.resolve(__dirname, '../../../packages/database/prisma/schema.prisma'),
          ];
          const schemaPath = candidates.find((p) => fs.existsSync(p)) || candidates[0];
          cp.execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate --accept-data-loss`, {
            stdio: 'inherit',
            env: process.env,
          });
          console.log('✅ [AccountService] Đồng bộ bảng thành công! Đang hoàn tất khởi tạo tài khoản Admin...');
          const defaultPwdHash = this.hashPassword('TopRun@2026');
          await prisma.user.upsert({
            where: { email: 'admin@toprun.vn' },
            update: { role: UserRole.ADMIN },
            create: {
              id: 'usr_admin_01',
              email: 'admin@toprun.vn',
              passwordHash: defaultPwdHash,
              fullName: 'Nguyễn Hữu Thuận (Alan Hoàng)',
              avatarUrl: 'https://dgalywyr863hv.cloudfront.net/pictures/athletes/126278000/57450920/1/large.jpg',
              gender: Gender.MALE,
              phone: '0909123456',
              departmentOrUnit: 'ASSA ABLOY Engineering',
              bio: 'Runner & System Architect • Chinh phục mọi giới hạn cùng TOPRunAssistant',
              role: UserRole.ADMIN,
              weightKg: 68,
              heightCm: 173,
              maxHeartRate: 192,
              defaultShirtSize: 'L',
              defaultShippingAddress: 'Tòa nhà ASSA ABLOY Vietnam, Hà Nội',
              totalDistanceKm: 184.5,
              totalActivities: 18,
              pr5kSec: 1290,
              pr10kSec: 2740,
              pr21kSec: 6120,
              pr42kSec: 13500,
              prCertLink: 'https://www.strava.com/athletes/126278000',
            },
          });
          console.log('✅ [AccountService] Khởi tạo tài khoản Admin mặc định admin@toprun.vn thành công!');
          return;
        } catch (pushErr) {
          console.error('❌ [AccountService] Lỗi tự động đồng bộ bảng PostgreSQL:', pushErr);
        }
      }
      console.warn('⚠️ Không thể khởi tạo dữ liệu mặc định vào PostgreSQL:', err);
    }
  }

  // --------------------------------------------------------------------------
  // 3. ĐĂNG KÝ (REGISTER), ĐĂNG NHẬP (LOGIN) & ĐỔI MẬT KHẨU
  // --------------------------------------------------------------------------

  async register(payload: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    departmentOrUnit?: string;
    defaultShirtSize?: string;
  }) {
    const emailClean = payload.email.trim().toLowerCase();
    if (!emailClean || !payload.password || payload.password.length < 6) {
      throw new BadRequestException('Email hợp lệ và mật khẩu tối thiểu 6 ký tự là bắt buộc.');
    }

    const existing = await prisma.user.findUnique({ where: { email: emailClean } });
    if (existing) {
      throw new ConflictException(`Email "${emailClean}" đã được đăng ký trên hệ thống.`);
    }

    const user = await prisma.user.create({
      data: {
        email: emailClean,
        passwordHash: this.hashPassword(payload.password),
        fullName: payload.fullName.trim(),
        phone: payload.phone || null,
        gender: (payload.gender as Gender) || Gender.MALE,
        departmentOrUnit: payload.departmentOrUnit || 'Runner Community',
        defaultShirtSize: payload.defaultShirtSize || 'L',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(emailClean)}`,
        role: UserRole.RUNNER,
      },
      include: {
        stravaConnection: true,
        stravaSyncLogs: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    const token = this.signJwt({ userId: user.id, email: user.email, role: user.role });
    const activationToken = this.signJwt(
      { userId: user.id, email: user.email, type: 'EMAIL_VERIFICATION' },
      24 * 3600
    );

    // Tạo mã OTP 6 số ngẫu nhiên có hiệu lực 24 giờ
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    this.otpStore.set(user.email.toLowerCase(), {
      code: otp,
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + 24 * 3600 * 1000,
    });

    // Gửi email kích hoạt tài khoản kèm cả Token URL và mã OTP 6 số
    const emailDelivery = await this.mailService.sendActivationEmail({
      to: user.email,
      fullName: user.fullName,
      token: activationToken,
      otp,
    });

    return {
      accessToken: token,
      user: this.sanitizeUser(user),
      emailDelivery,
    };
  }

  async verifyEmail(token: string) {
    const decoded = this.verifyJwt(token);
    if (!decoded || !decoded.userId) {
      throw new BadRequestException('Liên kết kích hoạt tài khoản không hợp lệ hoặc đã hết hạn (24 giờ).');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        stravaConnection: true,
        stravaSyncLogs: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) {
      throw new NotFoundException('Tài khoản người dùng không tồn tại.');
    }

    // Xóa OTP tương ứng sau khi kích hoạt thành công
    this.otpStore.delete(user.email.toLowerCase());

    const authToken = this.signJwt({ userId: user.id, email: user.email, role: user.role });
    return {
      success: true,
      message: `Tài khoản ${user.email} đã được kích hoạt thành công!`,
      accessToken: authToken,
      user: this.sanitizeUser(user),
    };
  }

  async verifyOtp(payload: { email: string; otp: string }) {
    const emailClean = (payload.email || '').trim().toLowerCase();
    const otpInput = (payload.otp || '').trim();

    if (!emailClean || !otpInput) {
      throw new BadRequestException('Vui lòng cung cấp đầy đủ email và mã OTP 6 chữ số.');
    }

    const record = this.otpStore.get(emailClean);
    if (!record) {
      throw new BadRequestException('Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu gửi lại mã.');
    }

    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(emailClean);
      throw new BadRequestException('Mã OTP đã hết hạn (24 giờ). Vui lòng yêu cầu gửi lại mã mới.');
    }

    if (record.code !== otpInput) {
      throw new BadRequestException('Mã OTP không chính xác. Vui lòng kiểm tra lại trong email của bạn.');
    }

    const user = await prisma.user.findUnique({
      where: { email: emailClean },
      include: {
        stravaConnection: true,
        stravaSyncLogs: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy tài khoản với email "${emailClean}".`);
    }

    // Xóa OTP sau khi dùng thành công
    this.otpStore.delete(emailClean);

    const authToken = this.signJwt({ userId: user.id, email: user.email, role: user.role });
    return {
      success: true,
      message: `Xác thực mã OTP thành công! Chào mừng ${user.fullName}.`,
      accessToken: authToken,
      user: this.sanitizeUser(user),
    };
  }

  async resendActivationEmail(email: string) {
    const emailClean = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: emailClean } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy tài khoản với email "${emailClean}".`);
    }

    const activationToken = this.signJwt(
      { userId: user.id, email: user.email, type: 'EMAIL_VERIFICATION' },
      24 * 3600
    );

    // Tạo mã OTP 6 số mới
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    this.otpStore.set(user.email.toLowerCase(), {
      code: otp,
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + 24 * 3600 * 1000,
    });

    const emailDelivery = await this.mailService.sendActivationEmail({
      to: user.email,
      fullName: user.fullName,
      token: activationToken,
      otp,
    });

    return {
      success: true,
      message: `Đã gửi lại email kích hoạt và mã OTP cho ${user.email}.`,
      emailDelivery,
    };
  }

  async login(payload: { email: string; password: string }) {
    const emailClean = payload.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: emailClean },
      include: {
        stravaConnection: true,
        stravaSyncLogs: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    // Cho phép mật khẩu chuẩn hoặc mật khẩu mặc định Demo "TopRun@2026"
    const isValid =
      this.verifyPassword(payload.password, user.passwordHash) ||
      payload.password === 'TopRun@2026';

    if (!isValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    const token = this.signJwt({ userId: user.id, email: user.email, role: user.role });
    return {
      accessToken: token,
      user: this.sanitizeUser(user),
    };
  }

  async loginWithGoogle(payload: {
    email: string;
    fullName?: string;
    avatarUrl?: string;
    googleId?: string;
  }) {
    const emailClean = payload.email.trim().toLowerCase();
    if (!emailClean) {
      throw new BadRequestException('Email không hợp lệ.');
    }

    let user = await prisma.user.findUnique({
      where: { email: emailClean },
      include: {
        stravaConnection: true,
        stravaSyncLogs: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) {
      // Tự động kích hoạt tài khoản ngay bằng thông tin Google (chuẩn Blueprint đã chốt)
      const defaultFullName = payload.fullName?.trim() || 'Google Runner';
      const defaultAvatar =
        payload.avatarUrl ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(emailClean)}`;

      user = await prisma.user.create({
        data: {
          email: emailClean,
          passwordHash: this.hashPassword(crypto.randomBytes(16).toString('hex')),
          fullName: defaultFullName,
          avatarUrl: defaultAvatar,
          departmentOrUnit: 'ASSA ABLOY Vietnam',
          defaultShirtSize: 'L',
          role: UserRole.RUNNER,
        },
        include: {
          stravaConnection: true,
          stravaSyncLogs: { take: 10, orderBy: { createdAt: 'desc' } },
        },
      });
    }

    const token = this.signJwt({ userId: user.id, email: user.email, role: user.role });
    return {
      accessToken: token,
      user: this.sanitizeUser(user),
    };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stravaConnection: true,
        stravaSyncLogs: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    }
    return {
      user: this.sanitizeUser(user),
    };
  }

  async getAccountDetails(userId = 'usr_admin_01') {
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stravaConnection: true,
        stravaSyncLogs: { take: 15, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        include: {
          stravaConnection: true,
          stravaSyncLogs: { take: 15, orderBy: { createdAt: 'desc' } },
        },
      });
    }

    if (!user) throw new NotFoundException('Không tìm thấy tài khoản người dùng.');

    const authorizeUrl = `https://www.strava.com/oauth/authorize?client_id=${this.stravaClientId}&response_type=code&redirect_uri=${encodeURIComponent(this.stravaRedirectUri)}&approval_prompt=force&scope=read,activity:read_all&state=${user.id}`;

    return {
      user: this.sanitizeUser(user),
      stravaStatus: this.formatStravaStatus(user.stravaConnection, authorizeUrl),
      syncLogs: user.stravaSyncLogs,
    };
  }

  // --------------------------------------------------------------------------
  // 3B. QUẢN TRỊ NGƯỜI DÙNG & PHÂN QUYỀN (ADMIN USER MANAGEMENT & ROLES)
  // --------------------------------------------------------------------------

  async getAllUsers(search?: string) {
    const where: any = {};
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { departmentOrUnit: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        stravaConnection: {
          select: {
            athleteId: true,
            syncStatus: true,
            isActive: true,
            lastSyncAt: true,
          },
        },
      },
    });

    return users.map((u: any) => this.sanitizeUser(u));
  }

  async updateUserRole(targetUserId: string, newRole: 'RUNNER' | 'ORGANIZER' | 'ADMIN') {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản để phân quyền.');

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole as UserRole },
    });

    return {
      message: `Đã cập nhật vai trò của "${updated.fullName}" thành ${newRole}.`,
      user: this.sanitizeUser(updated),
    };
  }

  async updateUserHonorBadge(targetUserId: string, honorBadge: string | null) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản để cập nhật danh hiệu.');

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { honorBadge: honorBadge || null },
    });

    return {
      message: `Đã cập nhật danh hiệu của "${updated.fullName}" thành ${honorBadge || 'Mặc định'}.`,
      user: this.sanitizeUser(updated),
    };
  }

  async deleteUser(targetUserId: string) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản để xoá.');
    if (user.email === 'admin@toprun.vn') {
      throw new BadRequestException('Không thể xoá tài khoản Quản trị viên tối cao.');
    }

    // Tự động chuyển giao quyền sở hữu giải đấu (creatorId) sang tài khoản Admin khác nếu có
    const adminUser = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN, id: { not: targetUserId } },
    });
    if (adminUser) {
      await prisma.event.updateMany({
        where: { creatorId: targetUserId },
        data: { creatorId: adminUser.id },
      });
    }

    await prisma.user.delete({ where: { id: targetUserId } });
    return {
      message: `Đã xoá tài khoản "${user.fullName}" (${user.email}) khỏi hệ thống.`,
    };
  }

  // --------------------------------------------------------------------------
  // 4. CẬP NHẬT HỒ SƠ CÁ NHÂN, THÔNG SỐ THỂ CHẤT, RACE-KIT MẶC ĐỊNH & PRs
  // --------------------------------------------------------------------------

  async updateProfile(
    userId: string,
    payload: {
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
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(payload.fullName !== undefined && { fullName: payload.fullName.trim() }),
        ...(payload.phone !== undefined && { phone: payload.phone }),
        ...(payload.gender !== undefined && { gender: payload.gender as Gender }),
        ...(payload.dateOfBirth !== undefined && {
          dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
        }),
        ...(payload.departmentOrUnit !== undefined && { departmentOrUnit: payload.departmentOrUnit }),
        ...(payload.bio !== undefined && { bio: payload.bio }),
        ...(payload.avatarUrl !== undefined && { avatarUrl: payload.avatarUrl }),
        ...(payload.weightKg !== undefined && { weightKg: Number(payload.weightKg) }),
        ...(payload.heightCm !== undefined && { heightCm: Number(payload.heightCm) }),
        ...(payload.maxHeartRate !== undefined && { maxHeartRate: Number(payload.maxHeartRate) }),
        ...(payload.defaultShirtSize !== undefined && { defaultShirtSize: payload.defaultShirtSize }),
        ...(payload.defaultShippingAddress !== undefined && {
          defaultShippingAddress: payload.defaultShippingAddress,
        }),
        ...(payload.pr5kSec !== undefined && { pr5kSec: payload.pr5kSec ? Number(payload.pr5kSec) : null }),
        ...(payload.pr10kSec !== undefined && { pr10kSec: payload.pr10kSec ? Number(payload.pr10kSec) : null }),
        ...(payload.pr21kSec !== undefined && { pr21kSec: payload.pr21kSec ? Number(payload.pr21kSec) : null }),
        ...(payload.pr42kSec !== undefined && { pr42kSec: payload.pr42kSec ? Number(payload.pr42kSec) : null }),
        ...(payload.prCertLink !== undefined && { prCertLink: payload.prCertLink }),
      },
      include: {
        stravaConnection: true,
        stravaSyncLogs: { take: 15, orderBy: { createdAt: 'desc' } },
      },
    });

    return {
      message: 'Đã lưu thông tin hồ sơ & cấu hình Runner vào PostgreSQL thành công!',
      user: this.sanitizeUser(updated),
    };
  }

  async changePassword(userId: string, payload: { currentPassword?: string; newPassword: string }) {
    if (!payload.newPassword || payload.newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: this.hashPassword(payload.newPassword) },
    });

    return { message: 'Đổi mật khẩu thành công!' };
  }

  // --------------------------------------------------------------------------
  // 5. QUẢN LÝ ĐA STRAVA API POOL & LOAD BALANCING (FILL-FIRST)
  // --------------------------------------------------------------------------

  /**
   * Lấy Strava API App khả dụng theo chiến lược Fill-First (Điền đầy lần lượt):
   * Quét các App đang active, sắp xếp theo priority ASC, createdAt ASC.
   * Chọn App đầu tiên có số lượng VĐV đang kết nối < maxAthletes.
   */
  async getNextAvailableStravaApp(excludeFull = true) {
    const apps = await prisma.stravaApp.findMany({
      where: { isActive: true },
      include: {
        connections: {
          where: { isActive: true },
          select: { id: true, userId: true },
        },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    if (apps.length === 0) {
      await this.ensureDefaultAccountsInPostgres();
      const rechecked = await prisma.stravaApp.findMany({
        where: { isActive: true },
        include: {
          connections: {
            where: { isActive: true },
            select: { id: true, userId: true },
          },
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      });
      if (rechecked.length === 0) return null;
      for (const app of rechecked) {
        const activeCount = app.connections.length;
        if (!excludeFull || activeCount < app.maxAthletes) {
          return {
            app,
            activeCount,
            availableSlots: Math.max(0, app.maxAthletes - activeCount),
            isFull: activeCount >= app.maxAthletes,
          };
        }
      }
      return null;
    }

    for (const app of apps) {
      const activeCount = app.connections.length;
      if (!excludeFull || activeCount < app.maxAthletes) {
        return {
          app,
          activeCount,
          availableSlots: Math.max(0, app.maxAthletes - activeCount),
          isFull: activeCount >= app.maxAthletes,
        };
      }
    }

    return null;
  }

  /**
   * Tạo đường dẫn OAuth2 kết nối Strava tự động chọn App còn slot trống theo chiến lược Fill-First.
   * Tham số state mang dạng: `${userId}:${appId}`
   */
  async getStravaAuthUrl(userId = 'usr_admin_01') {
    const existingConn = await prisma.stravaConnection.findUnique({
      where: { userId },
      include: { stravaApp: true },
    });

    let targetApp: any = null;
    if (existingConn?.stravaApp && existingConn.stravaApp.isActive) {
      targetApp = existingConn.stravaApp;
    } else {
      const allocated = await this.getNextAvailableStravaApp(true);
      if (!allocated) {
        const totalApps = await prisma.stravaApp.count();
        throw new BadRequestException(
          `Hệ thống hiện đã sử dụng hết toàn bộ dung lượng kết nối Strava trên ${totalApps} API App khả dụng (10 VĐV/App). Vui lòng liên hệ Quản trị viên (Admin) để bổ sung Strava API App mới.`
        );
      }
      targetApp = allocated.app;
    }

    const redirectUri = encodeURIComponent(this.stravaRedirectUri);
    const state = `${userId}:${targetApp.id}`;
    const oauthUrl = `https://www.strava.com/oauth/authorize?client_id=${targetApp.clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=read,activity:read_all&state=${state}`;

    return {
      appId: targetApp.id,
      appName: targetApp.name,
      clientId: targetApp.clientId,
      oauthUrl,
      scopes: ['read', 'activity:read_all'],
      note: 'Người dùng nhấn vào oauthUrl để cấp quyền đọc Tracklog từ Strava.',
    };
  }

  /**
   * Xử lý khi người dùng bấm "Ủy quyền (Authorize)" trên Strava và được chuyển về `/api/v1/strava/callback`
   */
  async handleStravaOAuthCallbackAndSync(code: string, state = 'usr_admin_01') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    let userId = state;
    let appId: string | null = null;
    if (state.includes(':')) {
      const parts = state.split(':');
      userId = parts[0];
      appId = parts[1];
    }

    let stravaApp: any = null;
    if (appId) {
      stravaApp = await prisma.stravaApp.findUnique({ where: { id: appId } });
    }
    if (!stravaApp) {
      const allocated = await this.getNextAvailableStravaApp(false);
      stravaApp = allocated?.app;
    }
    if (!stravaApp) {
      stravaApp = {
        id: 'strava_app_01',
        clientId: this.stravaClientId,
        clientSecret: this.stravaClientSecret,
      };
    }

    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: stravaApp.clientId,
        client_secret: stravaApp.clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new BadRequestException(`Strava OAuth2 Token Exchange Failed: ${errText}`);
    }

    const tokenData: any = await tokenRes.json();
    const athlete = tokenData.athlete || {};
    const athleteIdStr = String(athlete.id || '126278000');
    const fullName = `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim() || 'Strava Runner';

    let user =
      userId && userId !== 'login_with_strava'
        ? await prisma.user.findUnique({ where: { id: userId } })
        : null;

    if (!user) {
      const existingConn = await prisma.stravaConnection.findUnique({
        where: { athleteId: athleteIdStr },
        include: { user: true },
      });
      user = existingConn?.user || null;
    }

    if (!user) {
      user = await prisma.user.findFirst({ where: { email: 'admin@toprun.vn' } });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `strava_${athleteIdStr}@toprun.vn`,
          passwordHash: this.hashPassword('TopRun@2026'),
          fullName,
          avatarUrl: athlete.profile || athlete.profile_medium || null,
          gender: athlete.sex === 'F' ? Gender.FEMALE : Gender.MALE,
          departmentOrUnit: athlete.city || 'Strava Runner',
          role: UserRole.RUNNER,
        },
      });
    }

    await prisma.stravaConnection.upsert({
      where: { userId: user.id },
      update: {
        athleteId: athleteIdStr,
        username: athlete.username || null,
        firstname: athlete.firstname || null,
        lastname: athlete.lastname || null,
        city: athlete.city || null,
        country: athlete.country || null,
        profilePicUrl: athlete.profile || athlete.profile_medium || null,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Number(tokenData.expires_at || Math.floor(Date.now() / 1000) + 21600),
        scopes: 'read,activity:read_all',
        syncStatus: 'CONNECTED',
        isActive: true,
        stravaAppId: stravaApp.id,
        lastSyncAt: new Date(),
        lastErrorMsg: null,
      },
      create: {
        userId: user.id,
        athleteId: athleteIdStr,
        username: athlete.username || null,
        firstname: athlete.firstname || null,
        lastname: athlete.lastname || null,
        city: athlete.city || null,
        country: athlete.country || null,
        profilePicUrl: athlete.profile || athlete.profile_medium || null,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Number(tokenData.expires_at || Math.floor(Date.now() / 1000) + 21600),
        scopes: 'read,activity:read_all',
        syncStatus: 'CONNECTED',
        isActive: true,
        stravaAppId: stravaApp.id,
        lastSyncAt: new Date(),
        lastErrorMsg: null,
      },
    });

    const stravaAvatar = athlete.profile || athlete.profile_medium || null;
    if (stravaAvatar) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: stravaAvatar },
      });
    }

    return {
      userId: user.id,
      athlete,
      stravaApp: {
        id: stravaApp.id,
        name: stravaApp.name,
        clientId: stravaApp.clientId,
      },
      redirectUrl: `${this.frontendUrl}/?tab=account&strava=connected&userId=${user.id}`,
    };
  }

  /**
   * Làm mới Access Token chủ động (Refresh Token) dùng đúng Strava App credentials đã gán
   */
  async refreshStravaTokenAndVerify(userId = 'usr_admin_01') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const conn = await prisma.stravaConnection.findUnique({
      where: { userId },
      include: { stravaApp: true },
    });
    if (!conn || !conn.isActive) {
      throw new BadRequestException('Tài khoản chưa liên kết với Strava.');
    }

    const clientId = conn.stravaApp?.clientId || this.stravaClientId;
    const clientSecret = conn.stravaApp?.clientSecret || this.stravaClientSecret;

    const refreshRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: conn.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshRes.ok) {
      const errText = await refreshRes.text();
      await prisma.stravaConnection.update({
        where: { userId },
        data: {
          syncStatus: 'TOKEN_EXPIRED',
          lastErrorMsg: `Làm mới token thất bại: ${errText}`,
        },
      });
      throw new BadRequestException(`Không thể làm mới Strava Token: ${errText}`);
    }

    const refreshed: any = await refreshRes.json();

    const athleteRes = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${refreshed.access_token}` },
    });
    const athlete: any = athleteRes.ok ? await athleteRes.json() : null;

    const actsCheck = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=1', {
      headers: { Authorization: `Bearer ${refreshed.access_token}` },
    });

    const hasActivityScope = actsCheck.ok;
    const syncStatus = hasActivityScope ? 'CONNECTED' : 'REQUIRE_ACTIVITY_SCOPE';
    const scopes = hasActivityScope ? 'read,activity:read_all' : 'read';

    const updatedConn = await prisma.stravaConnection.update({
      where: { userId },
      data: {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token || conn.refreshToken,
        expiresAt: Number(refreshed.expires_at || Math.floor(Date.now() / 1000) + 21600),
        firstname: athlete?.firstname || conn.firstname,
        lastname: athlete?.lastname || conn.lastname,
        city: athlete?.city || conn.city,
        profilePicUrl: athlete?.profile || conn.profilePicUrl,
        scopes,
        syncStatus,
        lastSyncAt: new Date(),
        lastErrorMsg: hasActivityScope
          ? null
          : 'Token đã làm mới thành công nhưng chỉ có quyền "read". Hãy bấm "Cấp Quyền Đọc Tracklog (activity:read_all)" để đọc danh sách bài chạy.',
      },
    });

    await prisma.stravaSyncLog.create({
      data: {
        userId,
        triggerType: 'TOKEN_REFRESH',
        windowDays: 0,
        status: hasActivityScope ? 'SUCCESS' : 'REQUIRE_SCOPE',
        summaryMessage: hasActivityScope
          ? `Đã làm mới Access Token thành công (Hết hạn lúc ${new Date(updatedConn.expiresAt * 1000).toLocaleTimeString('vi-VN')}). Quyền activity:read_all sẵn sàng!`
          : `Đã làm mới Access Token cho Athlete #${updatedConn.athleteId} (${updatedConn.firstname || ''} ${updatedConn.lastname || ''}), nhưng cần cấp thêm quyền activity:read_all.`,
      },
    });

    return this.getAccountDetails(userId);
  }

  // --------------------------------------------------------------------------
  // 5B. CRUD STRAVA API POOL CHO QUẢN TRỊ VIÊN (ADMIN)
  // --------------------------------------------------------------------------

  async getAllStravaApps() {
    const apps = await prisma.stravaApp.findMany({
      include: {
        connections: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                departmentOrUnit: true,
              },
            },
          },
        },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    const totalCapacity = apps.reduce((sum, a) => sum + (a.isActive ? a.maxAthletes : 0), 0);
    const totalConnected = apps.reduce((sum, a) => sum + a.connections.length, 0);

    return {
      summary: {
        totalApps: apps.length,
        activeApps: apps.filter((a) => a.isActive).length,
        totalCapacity,
        totalConnected,
        availableSlots: Math.max(0, totalCapacity - totalConnected),
        usagePercentage: totalCapacity > 0 ? Math.round((totalConnected / totalCapacity) * 100) : 0,
      },
      apps: apps.map((a) => {
        const masked =
          a.clientSecret.length > 8
            ? `${a.clientSecret.slice(0, 4)}••••••••${a.clientSecret.slice(-4)}`
            : '••••••••';
        return {
          id: a.id,
          name: a.name,
          clientId: a.clientId,
          clientSecretMasked: masked,
          maxAthletes: a.maxAthletes,
          isActive: a.isActive,
          priority: a.priority,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          connectedCount: a.connections.length,
          availableSlots: Math.max(0, a.maxAthletes - a.connections.length),
          isFull: a.connections.length >= a.maxAthletes,
          athletes: a.connections.map((c) => ({
            userId: c.userId,
            fullName: c.user.fullName,
            email: c.user.email,
            avatarUrl: c.user.avatarUrl,
            departmentOrUnit: c.user.departmentOrUnit,
            stravaAthleteId: c.athleteId,
            stravaUsername: c.username,
            connectedAt: c.createdAt,
            lastSyncAt: c.lastSyncAt,
            syncStatus: c.syncStatus,
          })),
        };
      }),
    };
  }

  async createStravaApp(payload: {
    name: string;
    clientId: string;
    clientSecret: string;
    maxAthletes?: number;
    priority?: number;
  }) {
    const cleanId = payload.clientId.trim();
    const existing = await prisma.stravaApp.findUnique({
      where: { clientId: cleanId },
    });
    if (existing) {
      throw new BadRequestException(`Strava App với Client ID "${cleanId}" đã tồn tại trên hệ thống.`);
    }

    const app = await prisma.stravaApp.create({
      data: {
        name: payload.name.trim(),
        clientId: cleanId,
        clientSecret: payload.clientSecret.trim(),
        maxAthletes: Number(payload.maxAthletes) || 10,
        priority: Number(payload.priority) || 1,
        isActive: true,
      },
    });

    return app;
  }

  async updateStravaApp(
    id: string,
    payload: {
      name?: string;
      clientSecret?: string;
      maxAthletes?: number;
      isActive?: boolean;
      priority?: number;
    }
  ) {
    const app = await prisma.stravaApp.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Không tìm thấy Strava App.');

    const updated = await prisma.stravaApp.update({
      where: { id },
      data: {
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.clientSecret ? { clientSecret: payload.clientSecret.trim() } : {}),
        ...(payload.maxAthletes !== undefined ? { maxAthletes: Number(payload.maxAthletes) } : {}),
        ...(payload.isActive !== undefined ? { isActive: Boolean(payload.isActive) } : {}),
        ...(payload.priority !== undefined ? { priority: Number(payload.priority) } : {}),
      },
    });

    return updated;
  }

  async deleteStravaApp(id: string) {
    const app = await prisma.stravaApp.findUnique({
      where: { id },
      include: { connections: { where: { isActive: true } } },
    });
    if (!app) throw new NotFoundException('Không tìm thấy Strava App.');

    if (app.connections.length > 0) {
      throw new BadRequestException(
        `Không thể xoá App "${app.name}" vì đang có ${app.connections.length} VĐV đang kết nối. Hãy ngắt kết nối VĐV hoặc chuyển trạng thái sang Tạm dừng.`
      );
    }

    await prisma.stravaApp.delete({ where: { id } });
    return { success: true, message: `Đã xoá Strava App "${app.name}" thành công.` };
  }

  async getStravaAppAthletes(id: string) {
    const app = await prisma.stravaApp.findUnique({
      where: { id },
      include: {
        connections: {
          include: { user: true },
        },
      },
    });
    if (!app) throw new NotFoundException('Không tìm thấy Strava App.');
    return {
      appId: app.id,
      appName: app.name,
      clientId: app.clientId,
      athletes: app.connections.map((c) => ({
        userId: c.userId,
        fullName: c.user.fullName,
        email: c.user.email,
        avatarUrl: c.user.avatarUrl,
        departmentOrUnit: c.user.departmentOrUnit,
        stravaAthleteId: c.athleteId,
        stravaUsername: c.username,
        isActive: c.isActive,
        syncStatus: c.syncStatus,
        lastSyncAt: c.lastSyncAt,
      })),
    };
  }

  /**
   * Ngắt kết nối tài khoản Strava (Disconnect)
   */
  async disconnectStrava(userId = 'usr_admin_01') {
    const conn = await prisma.stravaConnection.findUnique({ where: { userId } });
    if (conn) {
      await prisma.stravaConnection.update({
        where: { userId },
        data: {
          isActive: false,
          syncStatus: 'DISCONNECTED',
          lastErrorMsg: 'Người dùng đã chủ động ngắt kết nối Strava.',
        },
      });

      await prisma.stravaSyncLog.create({
        data: {
          userId,
          triggerType: 'DISCONNECT',
          windowDays: 0,
          status: 'WARNING',
          summaryMessage: `Đã ngắt liên kết với tài khoản Strava Athlete #${conn.athleteId}.`,
        },
      });
    }
    return this.getAccountDetails(userId);
  }

  /**
   * Ghi nhận lịch sử đồng bộ Strava vào bảng `strava_sync_logs`
   */
  async recordSyncLog(params: {
    userId: string;
    triggerType: string;
    windowDays: number;
    status: string;
    fetchedCount: number;
    newlySyncedCount: number;
    validCount: number;
    flaggedOrCutCount: number;
    summaryMessage: string;
  }) {
    await prisma.stravaSyncLog.create({
      data: params,
    });
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }

  private formatStravaStatus(conn: any, authorizeUrl: string) {
    if (!conn || !conn.isActive || conn.syncStatus === 'DISCONNECTED') {
      return {
        isConnected: false,
        syncStatus: 'DISCONNECTED',
        statusBadgeText: 'Chưa kết nối Strava',
        clientId: this.stravaClientId,
        athleteId: null,
        athleteName: null,
        city: null,
        profilePicUrl: null,
        scopes: [],
        hasActivityReadScope: false,
        expiresAtIso: null,
        isTokenExpired: true,
        lastSyncAtIso: null,
        lastErrorMsg: null,
        authorizeUrl,
      };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const isTokenExpired = conn.expiresAt < nowSec;
    const scopesArr = (conn.scopes || 'read').split(',').map((s: string) => s.trim());
    const hasActivityReadScope =
      scopesArr.includes('activity:read') || scopesArr.includes('activity:read_all');

    let statusBadgeText = 'Đã kết nối & Sẵn sàng đồng bộ';
    if (!hasActivityReadScope) {
      statusBadgeText = 'Đã kết nối Hồ sơ • Cần cấp quyền đọc Tracklog (activity:read_all)';
    } else if (isTokenExpired) {
      statusBadgeText = 'Access Token hết hạn (Sẽ tự động Refresh khi đồng bộ)';
    }

    return {
      isConnected: true,
      syncStatus: conn.syncStatus,
      statusBadgeText,
      clientId: this.stravaClientId,
      athleteId: conn.athleteId,
      athleteName: `${conn.firstname || ''} ${conn.lastname || ''}`.trim() || conn.username || 'Strava Athlete',
      username: conn.username,
      city: conn.city,
      country: conn.country,
      profilePicUrl: conn.profilePicUrl,
      scopes: scopesArr,
      hasActivityReadScope,
      expiresAtIso: new Date(conn.expiresAt * 1000).toISOString(),
      isTokenExpired,
      lastSyncAtIso: conn.lastSyncAt ? new Date(conn.lastSyncAt).toISOString() : null,
      lastErrorMsg: conn.lastErrorMsg,
      authorizeUrl,
    };
  }
}
