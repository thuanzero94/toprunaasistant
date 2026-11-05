'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  Lock,
  Mail,
  Moon,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sun,
  Trophy,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import TopRunLogo from '../../components/TopRunLogo';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, user, token } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState<boolean>(false);
  const [emailDeliveryInfo, setEmailDeliveryInfo] = useState<any>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Tự động chuyển hướng về trang chủ nếu đã đăng nhập và chưa bấm đăng ký mới
  useEffect(() => {
    if (!isLoading && (user || token) && !registeredSuccess) {
      router.replace('/');
    }
  }, [user, token, isLoading, registeredSuccess, router]);

  // Đồng bộ theme Sáng / Tối với giao diện chính
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('toprun_theme') : null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    if (typeof window !== 'undefined') {
      localStorage.setItem('toprun_theme', next);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu bảo mật phải có tối thiểu 6 ký tự.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Vui lòng nhập số điện thoại liên hệ.');
      return;
    }

    setSubmitting(true);
    const res = await register({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      phone: phone.trim(),
      departmentOrUnit: 'Chưa cập nhật',
      defaultShirtSize: 'L',
    });
    setSubmitting(false);

    if (res.success) {
      setEmailDeliveryInfo(res.emailDelivery);
      setRegisteredSuccess(true);
    } else {
      setErrorMsg(res.error || 'Đăng ký không thành công.');
    }
  };


  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* =====================================================================
          LEFT COLUMN: REGISTER FORM
         ===================================================================== */}
      <div className="w-full lg:w-7/12 flex flex-col justify-between p-6 sm:p-12 lg:p-16 overflow-y-auto">
        {/* Top bar with Logo & Theme Switcher */}
        <div className="flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition">
            <TopRunLogo variant="full" size="md" />
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Đổi giao diện Sáng / Tối"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>

        {/* Center Content: Register Form or Success Screen */}
        <div className="max-w-xl w-full mx-auto my-auto py-8 space-y-6">
          {registeredSuccess ? (
            /* SUCCESS CONFIRMATION VIEW */
            <div className="p-8 rounded-2xl bg-white dark:bg-[#0F1420] border border-emerald-200 dark:border-emerald-800/80 shadow-lg text-center space-y-5 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  Đăng ký tài khoản thành công!
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Tài khoản của bạn đã được khởi tạo trong hệ thống với email:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{email}</strong>.
                </p>
              </div>

              {/* Email Delivery Status Banner */}
              {emailDeliveryInfo?.sent ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 text-left space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-emerald-600" />
                    <span>Email kích hoạt đã được gửi thành công!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Vui lòng mở hộp thư của bạn (hoặc kiểm tra thêm thư mục Spam/Quảng cáo) và nhấn vào nút <strong>"Kích hoạt tài khoản ngay"</strong> để hoàn tất.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 text-left space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Thông báo gửi Email (Chế độ máy chủ cục bộ - Dev):</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    Do ứng dụng hiện đang chạy thử nghiệm ở máy local và chưa cấu hình tài khoản gửi thư (SMTP_USER/SMTP_PASS) trong file <code className="font-mono bg-amber-100/60 dark:bg-amber-900/60 px-1 py-0.5 rounded">.env</code>, hệ thống đã tạo sẵn liên kết kích hoạt trực tiếp:
                  </p>
                  <div className="pt-1">
                    <Link
                      href={emailDeliveryInfo?.activationUrl || `/verify-email?email=${encodeURIComponent(email)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Nhấn vào đây để Kích hoạt tài khoản ngay</span>
                    </Link>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-left space-y-2">
                <div className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#FC4C02]" />
                  <span>Bước tiếp theo dành cho Runner:</span>
                </div>
                <p className="leading-relaxed">
                  Bạn có thể cập nhật <strong>Phòng ban thi đua</strong>, <strong>Cỡ áo Finisher</strong> và kết nối tài khoản <strong>Strava</strong> bất kỳ lúc nào tại mục <em>Thông tin cá nhân &amp; Hồ sơ</em>.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Link
                  href={`/verify-email?email=${encodeURIComponent(email)}`}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-[#FC4C02]/20 transition cursor-pointer"
                >
                  <span>Nhập Mã OTP Xác Thực</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  <span>Vào Bảng điều khiển</span>
                </button>
              </div>
            </div>
          ) : (
            /* BASIC REGISTRATION FORM */
            <>
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Tạo tài khoản Runner mới
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Chỉ cần thông tin cơ bản để tham gia. Hệ thống sẽ gửi thông tin kích hoạt qua email của bạn.
                </p>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                  <div className="leading-snug">{errorMsg}</div>
                </div>
              )}



              {/* BASIC FORM: Full name, Email, Password, Phone */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Họ và Tên Runner <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FC4C02]/50 font-medium transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Địa chỉ Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="runner@company.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FC4C02]/50 font-medium transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Số điện thoại liên hệ <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0988 123 456"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FC4C02]/50 font-medium transition"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mật khẩu bảo mật <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FC4C02]/50 font-medium transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* EMAIL ACTIVATION NOTICE */}
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    Sau khi đăng ký, hệ thống sẽ tự động gửi thông tin kích hoạt tài khoản và hướng dẫn nhận số BIB về hòm thư Email của bạn.
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting || isLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#FC4C02]/20 transition cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang xử lý đăng ký...</span>
                      </>
                    ) : (
                      <>
                        <span>Đăng ký &amp; Nhận thông tin kích hoạt</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Switch to Login */}
              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                Đã có tài khoản Runner?{' '}
                <Link
                  href="/login"
                  className="font-bold text-[#FC4C02] hover:underline cursor-pointer"
                >
                  Đăng nhập ngay
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-500">
          © 2026 TOPRunAssistant • Hệ thống cơ sở dữ liệu PostgreSQL
        </div>
      </div>

      {/* =====================================================================
          RIGHT COLUMN: VISUAL RUNNER SHOWCASE (DESKTOP)
         ===================================================================== */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-[#0C101B] via-[#090D16] to-[#141B2D] border-l border-slate-800 p-12 lg:p-16 flex-col justify-between relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#FC4C02]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Top Tag */}
        <div className="flex items-center gap-2 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FC4C02]/15 text-[#FC4C02] border border-[#FC4C02]/30">
            <Flame className="w-3.5 h-3.5" />
            Tham gia Giải chạy Nội bộ
          </span>
        </div>

        {/* Core Perks */}
        <div className="space-y-6 my-auto z-10 max-w-md">
          <div className="space-y-2">
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight tracking-tight">
              Gia nhập TOPRun chỉ với 3 bước đơn giản
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Các thông tin nâng cao như Phòng ban thi đua, Cỡ áo Finisher và Chỉ số PR có thể cập nhật sau tại mục Hồ sơ cá nhân.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                step: '01',
                title: 'Đăng ký tài khoản nhanh',
                desc: 'Điền Email, Mật khẩu và Số điện thoại liên hệ.',
              },
              {
                step: '02',
                title: 'Nhận thông tin kích hoạt',
                desc: 'Hệ thống gửi xác nhận và mã BIB điện tử qua hòm thư Email.',
              },
              {
                step: '03',
                title: 'Cập nhật phòng ban & Chạy',
                desc: 'Bổ sung đơn vị thi đua, size áo và bắt đầu đồng bộ bài chạy Strava.',
              },
            ].map((p, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-3.5"
              >
                <div className="w-9 h-9 rounded-lg bg-[#FC4C02]/15 text-[#FC4C02] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {p.step}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{p.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-6 z-10">
          <span>Cam kết bảo mật dữ liệu VĐV</span>
          <span className="font-mono text-[#FC4C02]">TOPRun v1.0</span>
        </div>
      </div>
    </div>
  );
}
