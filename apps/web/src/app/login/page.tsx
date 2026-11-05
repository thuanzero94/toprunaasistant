'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Lock,
  Mail,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import TopRunLogo from '../../components/TopRunLogo';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, requestPasswordResetOtp, resetPasswordWithOtp, isLoading, user, token } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Quên mật khẩu Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Tự động chuyển hướng về trang chủ nếu đã đăng nhập thành công
  React.useEffect(() => {
    if (!isLoading && (user || token)) {
      router.replace('/');
    }
  }, [user, token, isLoading, router]);

  // Đồng bộ theme Sáng / Tối với giao diện chính
  React.useEffect(() => {
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
    setSubmitting(true);

    const res = await login(email, password);
    setSubmitting(false);

    if (res.success) {
      router.push('/');
    } else {
      setErrorMsg(res.error || 'Đăng nhập không thành công.');
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSubmitting(true);

    const res = await loginWithGoogle();
    setSubmitting(false);

    if (res.success) {
      router.push('/');
    } else {
      setErrorMsg(res.error || 'Đăng nhập Google thất bại.');
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Vui lòng nhập địa chỉ email tài khoản.');
      return;
    }
    setForgotError(null);
    setForgotLoading(true);

    const res = await requestPasswordResetOtp(forgotEmail);
    setForgotLoading(false);

    if (res.success) {
      setForgotSuccess(res.message || 'Mã OTP đã được gửi đến email của bạn.');
      setForgotStep(2);
    } else {
      setForgotError(res.error || 'Không thể gửi mã OTP. Vui lòng thử lại.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError('Mã OTP gồm 6 chữ số.');
      return;
    }
    if (!forgotNewPass || forgotNewPass.length < 6) {
      setForgotError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError('Xác nhận mật khẩu không khớp.');
      return;
    }

    setForgotError(null);
    setForgotLoading(true);

    const res = await resetPasswordWithOtp({
      email: forgotEmail,
      otp: forgotOtp.trim(),
      newPassword: forgotNewPass,
    });
    setForgotLoading(false);

    if (res.success) {
      setForgotSuccess('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.');
      setEmail(forgotEmail);
      setPassword(forgotNewPass);
      setTimeout(() => {
        setShowForgotModal(false);
      }, 1500);
    } else {
      setForgotError(res.error || 'Đặt lại mật khẩu thất bại.');
    }
  };

  if (!isLoading && (user || token)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#090D16]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#FC4C02] animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Đang chuyển hướng về trang chủ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* =====================================================================
          LEFT COLUMN: AUTH FORM
         ===================================================================== */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16">
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

        {/* Center Content: Login Form */}
        <div className="max-w-md w-full mx-auto my-auto py-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Đăng nhập tài khoản Runner
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Tiếp tục hành trình tích lũy km, đồng bộ Strava tự động và chinh phục huy chương giải chạy.
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <div className="leading-snug">{errorMsg}</div>
            </div>
          )}

          {/* GOOGLE SIGN IN */}
          <div>
            <button
              type="button"
              disabled={submitting || isLoading}
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F1420] hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-white text-sm font-semibold flex items-center justify-center gap-3 transition shadow-sm cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Đăng nhập nhanh bằng Google</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            <span className="absolute bg-[#F8FAFC] dark:bg-[#090D16] px-3 text-xs text-slate-400 font-medium">
              hoặc đăng nhập bằng Email
            </span>
          </div>

          {/* EMAIL & PASSWORD FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Địa chỉ Email Runner
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="runner@toprun.vn"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FC4C02]/50 font-medium transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotStep(1);
                    setForgotError(null);
                    setForgotSuccess(null);
                    setForgotEmail(email || '');
                  }}
                  className="text-xs text-[#FC4C02] hover:underline cursor-pointer font-medium"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-[#FC4C02] focus:ring-[#FC4C02]"
                />
                <span>Ghi nhớ phiên đăng nhập trên thiết bị này</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#FC4C02]/20 transition cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập vào TOPRun</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Register */}
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
            Chưa có tài khoản Runner?{' '}
            <Link
              href="/register"
              className="font-bold text-[#FC4C02] hover:underline cursor-pointer"
            >
              Tạo tài khoản mới ngay
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-500">
          © 2026 TOPRunAssistant • Kết nối Strava Webhook API &amp; Chống gian lận GPS
        </div>
      </div>

      {/* =====================================================================
          RIGHT COLUMN: VISUAL RUNNER SHOWCASE & INSPIRATION (DESKTOP)
         ===================================================================== */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0C101B] via-[#090D16] to-[#141B2D] border-l border-slate-800 p-12 lg:p-16 flex-col justify-between relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#FC4C02]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Top Badges */}
        <div className="flex items-center gap-2 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FC4C02]/15 text-[#FC4C02] border border-[#FC4C02]/30">
            <Flame className="w-3.5 h-3.5" />
            TOPRun Autumn Virtual Race 2026
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Đồng bộ 1:1 Strava API
          </span>
        </div>

        {/* Center Inspiration Card */}
        <div className="space-y-6 my-auto z-10 max-w-lg">
          <div className="space-y-3">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
              Mỗi bước chạy là một lần bứt phá giới hạn.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Nền tảng quản lý chạy bộ trực tuyến với cơ chế tích lũy kép: chinh phục{' '}
              <strong className="text-white">Mục tiêu cự ly Finisher</strong> và mở khóa các{' '}
              <strong className="text-amber-400">Thử thách đặc biệt</strong> cùng đồng đội.
            </p>
          </div>

          {/* Stat Pillars */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Quãng đường</div>
              <div className="text-xl font-extrabold font-mono text-white mt-1">12,480+ km</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Tích lũy thực tế</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Vận động viên</div>
              <div className="text-xl font-extrabold font-mono text-white mt-1">48+ Runners</div>
              <div className="text-[10px] text-sky-400 mt-0.5">ASSA ABLOY Vietnam</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Kiểm duyệt</div>
              <div className="text-xl font-extrabold font-mono text-amber-400 mt-1">100% Split</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Chống gian lận GPS</div>
            </div>
          </div>

          {/* Testimonial / Athlete Banner */}
          <div className="p-4 rounded-2xl bg-[#090D16]/80 border border-slate-800 flex items-center gap-4">
            <img
              src="https://dgalywyr863hv.cloudfront.net/pictures/athletes/126278000/57450920/1/large.jpg"
              alt="Nguyễn Hữu Thuận"
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-[#FC4C02]"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                Nguyễn Hữu Thuận (Alan Hoàng)
              </div>
              <div className="text-[11px] text-slate-400">
                ASSA ABLOY Engineering • Bib TOP50-0018
              </div>
              <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                Đã hoàn thành 50KM Finisher
              </div>
            </div>
            <Award className="w-6 h-6 text-amber-400 shrink-0" />
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-6 z-10">
          <span className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            Huy chương thật &amp; Áo Finisher
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Bảo mật PostgreSQL &amp; JWT
          </span>
          <span className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#FC4C02]" />
            Strava Live Webhook
          </span>
        </div>
      </div>

      {/* =====================================================================
          MODAL: QUÊN MẬT KHẨU (XÁC THỰC MÃ OTP EMAIL)
         ===================================================================== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl relative space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FC4C02]/10 border border-[#FC4C02]/20 flex items-center justify-center text-[#FC4C02]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {forgotStep === 1 ? 'Khôi phục Mật khẩu' : 'Nhập mã OTP Email'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {forgotStep === 1
                      ? 'Nhận mã OTP bảo mật gồm 6 chữ số gửi qua Email'
                      : `Mã xác thực đã gửi đến: ${forgotEmail}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error or Success feedback */}
            {forgotError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}
            {forgotSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {/* STEP 1: Gửi OTP */}
            {forgotStep === 1 ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email tài khoản của bạn
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="runner@toprun.vn"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FC4C02]/50 font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#FC4C02] hover:bg-[#e04300] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#FC4C02]/20 disabled:opacity-60 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    <span>Gửi mã OTP qua Email</span>
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: Nhập OTP & Đặt mật khẩu mới */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mã xác thực OTP (6 chữ số)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="VD: 839201"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FC4C02]/50 font-mono tracking-widest text-center font-bold"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>Mã có hiệu lực trong 15 phút</span>
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-[#FC4C02] hover:underline cursor-pointer"
                    >
                      Đổi email khác
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      placeholder="Ít nhất 6 ký tự"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FC4C02]/50 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      value={forgotConfirmPass}
                      onChange={(e) => setForgotConfirmPass(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FC4C02]/50 font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#FC4C02] hover:bg-[#e04300] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#FC4C02]/20 disabled:opacity-60 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Xác nhận Đặt lại Mật khẩu</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

