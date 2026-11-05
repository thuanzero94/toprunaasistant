import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendActivationEmailOptions {
  to: string;
  fullName: string;
  token: string;
  otp?: string;
}

export interface SendActivationEmailResult {
  sent: boolean;
  isSimulated?: boolean;
  reason?: string;
  recipient: string;
  activationUrl: string;
  otp?: string;
  error?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendActivationEmail(options: SendActivationEmailOptions): Promise<SendActivationEmailResult> {
    const { to, fullName, token, otp } = options;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3005';
    const activationUrl = `${frontendUrl}/verify-email?token=${token}&email=${encodeURIComponent(to)}`;

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || `"TOPRun Assistant" <${smtpUser || 'no-reply@toprun.vn'}>`;

    const otpHtml = otp
      ? `
        <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 2px dashed #f97316; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
          <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #9a3412; text-transform: uppercase; letter-spacing: 1px;">Mã OTP Kích Hoạt (Hiệu lực 24 giờ)</p>
          <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ea580c; font-family: monospace;">${otp}</div>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #c2410c;">Bạn có thể nhập mã OTP này trên trang xác thực hoặc nhấn nút kích hoạt bên dưới.</p>
        </div>
      `
      : '';

    // Nếu đã cấu hình SMTP trong .env -> Gửi mail thật qua SMTP Server
    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        const htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #FC4C02 0%, #ff7a45 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">TOPRun Assistant</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">Giải Chạy Ảo Doanh Nghiệp &amp; Đồng Bộ Strava</p>
            </div>
            
            <div style="padding: 32px 24px; color: #1e293b;">
              <h2 style="font-size: 20px; font-weight: 700; margin-top: 0; color: #0f172a;">Chào mừng ${fullName}!</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                Cảm ơn bạn đã đăng ký tài khoản tham gia hệ thống giải chạy bộ <strong>TOPRun Virtual Race 2026</strong>. 
                Bạn có thể kích hoạt tài khoản bằng mã OTP 6 số hoặc bấm nút liên kết bên dưới.
              </p>

              ${otpHtml}
              
              <div style="text-align: center; margin: 28px 0;">
                <a href="${activationUrl}" style="display: inline-block; background-color: #FC4C02; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(252, 76, 2, 0.35);">
                  KÍCH HOẠT TÀI KHOẢN NGAY
                </a>
              </div>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 24px; font-size: 12px; color: #64748b;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #334155;">Nếu nút bấm trên không hoạt động, bạn có thể sao chép và mở liên kết này trong trình duyệt:</p>
                <p style="margin: 0; word-break: break-all; color: #FC4C02; font-family: monospace;">${activationUrl}</p>
              </div>

              <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; margin-bottom: 0;">
                Mã OTP và liên kết kích hoạt có hiệu lực trong 24 giờ. Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email.
              </p>
            </div>
            
            <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              &copy; 2026 TOPRun Assistant. Hệ thống giải chạy ảo &amp; Kiểm duyệt GPS.
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: smtpFrom,
          to,
          subject: '[TOPRun Assistant] Mã OTP xác thực & Kích hoạt tài khoản',
          html: htmlContent,
        });

        this.logger.log(`✅ Đã gửi email kích hoạt tài khoản (OTP + Link) tới: ${to} qua máy chủ SMTP ${smtpHost}`);
        return {
          sent: true,
          recipient: to,
          activationUrl,
          otp,
        };
      } catch (err: any) {
        this.logger.error(`❌ Lỗi gửi email qua SMTP: ${err.message}`);
        return {
          sent: false,
          recipient: to,
          activationUrl,
          otp,
          error: err.message,
          reason: `Lỗi kết nối SMTP: ${err.message}`,
        };
      }
    }

    // Nếu chưa cấu hình SMTP trong .env -> Chế độ Giả lập (Dev mode)
    this.logger.warn(`--------------------------------------------------------------------------------`);
    this.logger.warn(`⚠️ [MailService] SMTP chưa được cấu hình (Cần thêm SMTP_USER & SMTP_PASS vào .env).`);
    this.logger.warn(`📧 Đang kích hoạt chế độ GIẢ LẬP GỬI EMAIL cho: ${to}`);
    if (otp) {
      this.logger.warn(`🔑 MÃ OTP XÁC THỰC: [ ${otp} ] (Hiệu lực 24 giờ)`);
    }
    this.logger.warn(`🔗 Link kích hoạt tài khoản trực tiếp:`);
    this.logger.warn(`   👉 ${activationUrl}`);
    this.logger.warn(`--------------------------------------------------------------------------------`);

    return {
      sent: false,
      isSimulated: true,
      reason: 'Chưa cấu hình máy chủ gửi thư SMTP trong .env (Cần SMTP_USER & SMTP_PASS để gửi email thực tế đến hộp thư)',
      recipient: to,
      activationUrl,
      otp,
    };
  }

  async sendPasswordResetOtpEmail(to: string, fullName: string, otp: string) {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || `"TOPRun Assistant" <${smtpUser || 'no-reply@toprun.vn'}>`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">TOPRUN ASSISTANT</h1>
          <p style="color: #ffedd5; margin: 8px 0 0 0; font-size: 14px;">Yêu cầu Đặt lại Mật khẩu</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">Xin chào <strong>${fullName}</strong>,</p>
          <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
            Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản TOPRun của bạn. Vui lòng sử dụng mã xác thực OTP bên dưới để hoàn tất việc tạo mật khẩu mới.
          </p>
          <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 2px dashed #f97316; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #9a3412; text-transform: uppercase; letter-spacing: 1px;">Mã OTP Đặt Lại Mật Khẩu (Hiệu lực 15 phút)</p>
            <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ea580c; font-family: monospace;">${otp}</div>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #c2410c;">Mã có hiệu lực trong 15 phút. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
          </div>
          <p style="margin: 20px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ Ban quản trị để bảo mật tài khoản.</p>
        </div>
        <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
          © 2026 TOPRun Assistant • Hệ sinh thái Chạy bộ & Giải chạy ảo
        </div>
      </div>
    `;

    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: false },
        });
        await transporter.sendMail({
          from: smtpFrom,
          to,
          subject: '[TOPRun Assistant] Mã OTP đặt lại mật khẩu của bạn',
          html: htmlContent,
        });
        this.logger.log(`✅ Đã gửi OTP đặt lại mật khẩu tới ${to}`);
        return { sent: true, recipient: to, otp };
      } catch (err: any) {
        this.logger.error(`❌ Lỗi gửi OTP reset mật khẩu: ${err.message}`);
        return { sent: false, recipient: to, otp, error: err.message };
      }
    }

    this.logger.warn(`--------------------------------------------------------------------------------`);
    this.logger.warn(`🔑 [MailService Simulated] MÃ OTP ĐẶT LẠI MẬT KHẨU cho ${to}: [ ${otp} ] (Hiệu lực 15 phút)`);
    this.logger.warn(`--------------------------------------------------------------------------------`);
    return { sent: false, isSimulated: true, recipient: to, otp };
  }
}

