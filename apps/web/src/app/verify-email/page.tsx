'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Mail,
  ShieldCheck,
  KeyRound,
  Send,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { verifyEmailToken, verifyOtp, resendActivation } = useAuth();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // State form OTP
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');

  // Tự động kiểm tra token từ URL nếu có
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const emailParam = params.get('email') || '';
    if (emailParam) setEmailInput(emailParam);

    if (token) {
      setLoading(true);
      verifyEmailToken(token).then((res) => {
        setLoading(false);
        if (res.success) {
          setSuccess(true);
          setMessage(res.message || 'Tài khoản của bạn đã được kích hoạt thành công!');
        } else {
          setErrorMessage(res.error || 'Liên kết kích hoạt không hợp lệ hoặc đã hết hạn.');
        }
      });
    }
  }, [verifyEmailToken]);

  // Bộ đếm ngược thời gian gửi lại mã
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }
    if (!otpInput.trim() || otpInput.trim().length !== 6) {
      setErrorMessage('Vui lòng nhập đúng 6 chữ số mã OTP.');
      return;
    }

    setIsSubmittingOtp(true);
    setErrorMessage('');
    const res = await verifyOtp(emailInput.trim(), otpInput.trim());
    setIsSubmittingOtp(false);

    if (res.success) {
      setSuccess(true);
      setMessage(res.message || 'Xác thực OTP thành công!');
    } else {
      setErrorMessage(res.error || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    }
  };

  const handleResendOtp = async () => {
    if (!emailInput.trim()) {
      setErrorMessage('Vui lòng nhập email để nhận lại mã OTP.');
      return;
    }
    if (resendCooldown > 0) return;

    setResendMessage('Đang gửi lại mã...');
    setErrorMessage('');
    const res = await resendActivation(emailInput.trim());
    if (res.success) {
      setResendMessage('✅ Đã gửi lại mã OTP vào hộp thư của bạn.');
      setResendCooldown(60);
    } else {
      setErrorMessage(res.error || 'Gửi lại mã không thành công.');
      setResendMessage('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100">
      <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800 shadow-xl text-center space-y-6">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FC4C02] flex items-center justify-center text-white font-extrabold text-sm">
            TR
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
            TOPRun Assistant
          </span>
        </div>

        {loading ? (
          <div className="py-10 space-y-3">
            <RefreshCw className="w-10 h-10 text-[#FC4C02] animate-spin mx-auto" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Đang xác thực liên kết kích hoạt tài khoản...
            </p>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Kích hoạt tài khoản thành công!
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {message}
              </p>
              {emailInput && (
                <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  {emailInput}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-left space-y-1">
              <div className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#FC4C02]" />
                <span>Trạng thái tài khoản:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Tài khoản đã sẵn sàng ghi nhận hoạt động chạy bộ từ Strava, tham gia các giải chạy và nhận Race-kit Finisher.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full py-3 px-4 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-[#FC4C02]/20 transition cursor-pointer"
              >
                <span>Vào Bảng điều khiển thi đấu</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 text-left">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-[#FC4C02] flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Xác Thực Kích Hoạt Tài Khoản
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhập mã OTP 6 số đã gửi về hộp thư hoặc bấm link trực tiếp trong email.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {resendMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-600 dark:text-emerald-400">
                {resendMessage}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Email đã đăng ký
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="ban@congty.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FC4C02]/20 focus:border-[#FC4C02]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Mã OTP 6 chữ số (từ Email)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ví dụ: 582910"
                  required
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center font-mono text-xl tracking-[0.5em] font-extrabold text-[#FC4C02] focus:outline-none focus:ring-2 focus:ring-[#FC4C02]/20 focus:border-[#FC4C02]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingOtp}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-[#FC4C02]/20 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingOtp ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Xác Nhận Kích Hoạt</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                className="text-[#FC4C02] hover:underline font-semibold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>
                  {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại mã OTP'}
                </span>
              </button>

              <Link
                href="/login"
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-[11px]"
              >
                Về trang đăng nhập
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
