'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Award,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  HeartPulse,
  Image as ImageIcon,
  KeyRound,
  Link2,
  Lock,
  LogOut,
  MapPin,
  RefreshCw,
  Save,
  ShieldCheck,
  Shirt,
  Timer,
  Unlink,
  Upload,
  User,
} from 'lucide-react';
import { formatPace, parsePaceToSeconds } from '@toprun/shared';
import { useAuth } from '../context/AuthContext';
import AthleteAvatar, { AthleteHonorPill } from './AthleteAvatar';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

type SubTab = 'profile' | 'strava' | 'security';

export default function AccountAndStravaPanel({
  onActivitiesSynced,
  onProfileUpdated,
  initialSubTab = 'profile',
  initialUserId,
}: {
  onActivitiesSynced?: (msg: string) => void;
  onProfileUpdated?: (user: any) => void;
  initialSubTab?: SubTab;
  initialUserId?: string;
}) {
  const { user: authUser, updateUserSession, logout } = useAuth();
  const currentUserId = authUser?.id || initialUserId || '';
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const [subTab, setSubTab] = useState<SubTab>(initialSubTab);
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const [accountData, setAccountData] = useState<any>(null);

  // Profile form states
  const [fullName, setFullName] = useState(authUser?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(authUser?.avatarUrl || '');
  const [phone, setPhone] = useState(authUser?.phone || '');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>((authUser?.gender as any) || 'MALE');
  const [departmentOrUnit, setDepartmentOrUnit] = useState(authUser?.departmentOrUnit || 'Runner Community');
  const [bio, setBio] = useState((authUser as any)?.bio || 'Vận động viên đam mê chạy bộ');
  const [weightKg, setWeightKg] = useState<number>(authUser?.weightKg ?? 65);
  const [heightCm, setHeightCm] = useState<number>(authUser?.heightCm ?? 170);
  const [maxHeartRate, setMaxHeartRate] = useState<number>(authUser?.maxHeartRate ?? 190);
  const [defaultShirtSize, setDefaultShirtSize] = useState<string>(authUser?.defaultShirtSize || 'L');
  const [defaultShippingAddress, setDefaultShippingAddress] = useState<string>(
    authUser?.defaultShippingAddress || ''
  );
  const [pr5kInput, setPr5kInput] = useState('');
  const [pr10kInput, setPr10kInput] = useState('');
  const [pr21kInput, setPr21kInput] = useState('');
  const [pr42kInput, setPr42kInput] = useState('');
  const [prCertLink, setPrCertLink] = useState('');

  // Password form state
  const [newPassword, setNewPassword] = useState('');

  const fetchAccountFromBackend = async (uid = currentUserId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/account/${uid}`);
      if (!res.ok) return;
      const data = await res.json();
      setAccountData(data);

      const u = data.user;
      if (u) {
        setFullName(u.fullName || '');
        if (u.avatarUrl) setAvatarUrl(u.avatarUrl);
        setPhone(u.phone || '');
        setGender(u.gender || 'MALE');
        setDepartmentOrUnit(u.departmentOrUnit || '');
        setBio(u.bio || '');
        setWeightKg(u.weightKg ?? 68);
        setHeightCm(u.heightCm ?? 173);
        setMaxHeartRate(u.maxHeartRate ?? 192);
        setDefaultShirtSize(u.defaultShirtSize || 'L');
        setDefaultShippingAddress(u.defaultShippingAddress || '');
        if (u.pr5kSec) setPr5kInput(formatPace(u.pr5kSec, false));
        if (u.pr10kSec) setPr10kInput(formatPace(u.pr10kSec, false));
        if (u.pr21kSec) setPr21kInput(formatPace(u.pr21kSec, false));
        if (u.pr42kSec) setPr42kInput(formatPace(u.pr42kSec, false));
        setPrCertLink(u.prCertLink || '');
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountFromBackend(currentUserId);
  }, [currentUserId]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setNotification({ type: 'error', text: 'Kích thước ảnh tối đa là 5MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        setNotification({
          type: 'success',
          text: 'Đã chọn ảnh đại diện mới. Hãy bấm "Lưu thay đổi hồ sơ" để lưu lại.',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseStravaAvatar = () => {
    const stravaPic =
      stravaStatus?.profilePicUrl ||
      accountData?.stravaStatus?.profilePicUrl ||
      accountData?.user?.stravaConnection?.profilePicUrl;
    if (stravaPic) {
      setAvatarUrl(stravaPic);
      setNotification({
        type: 'success',
        text: 'Đã chọn ảnh đại diện từ Strava! Hãy bấm "Lưu thay đổi hồ sơ" để cập nhật.',
      });
    } else {
      setNotification({
        type: 'warning',
        text: 'Chưa có ảnh hồ sơ Strava. Vui lòng kết nối tài khoản Strava trước.',
      });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/account/${currentUserId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          fullName,
          avatarUrl: avatarUrl || undefined,
          phone,
          gender,
          departmentOrUnit,
          bio,
          weightKg: Number(weightKg),
          heightCm: Number(heightCm),
          maxHeartRate: Number(maxHeartRate),
          defaultShirtSize,
          defaultShippingAddress,
          pr5kSec: parsePaceToSeconds(pr5kInput) || 1290,
          pr10kSec: parsePaceToSeconds(pr10kInput) || 2740,
          pr21kSec: parsePaceToSeconds(pr21kInput) || 6120,
          pr42kSec: parsePaceToSeconds(pr42kInput) || 13500,
          prCertLink,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lưu hồ sơ');

      // Cập nhật ngay Session người dùng và bộ nhớ cục bộ
      if (data.user) {
        updateUserSession(data.user);
        onProfileUpdated?.(data.user);
      }

      setNotification({
        type: 'success',
        text: 'Đã lưu thông tin hồ sơ và chỉ số cá nhân thành công vào cơ sở dữ liệu.',
      });
      await fetchAccountFromBackend(currentUserId);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setNotification({
        type: 'error',
        text: 'Mật khẩu mới phải có tối thiểu 6 ký tự.',
      });
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/account/${currentUserId}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      setNewPassword('');
      setNotification({
        type: 'success',
        text: data.message || 'Đã cập nhật mật khẩu bảo mật thành công.',
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncLiveStrava = async (windowDays: 7 | 30) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/strava/sync-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ userId: currentUserId, windowDays }),
      });
      const data = await res.json();
      if (data.accountDetails) {
        setAccountData(data.accountDetails);
      } else {
        await fetchAccountFromBackend(currentUserId);
      }

      if (data.status === 'SUCCESS') {
        const msg = `Đồng bộ Strava (${windowDays} ngày) hoàn tất: tìm thấy ${data.totalFetchedFromStrava} hoạt động, thêm mới ${data.newlySyncedCount} bài chạy.`;
        setNotification({ type: 'success', text: msg });
        if (onActivitiesSynced) onActivitiesSynced(msg);
      } else {
        setNotification({ type: 'warning', text: data.message });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: `Không thể kết nối máy chủ đồng bộ Strava: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/strava/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi làm mới phiên kết nối');
      setAccountData(data);
      setNotification({
        type: 'success',
        text: 'Đã làm mới phiên kết nối Strava và cập nhật trạng thái mới nhất.',
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectStrava = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/strava/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();
      setAccountData(data);
      setNotification({
        type: 'warning',
        text: 'Đã ngắt liên kết tài khoản Strava khỏi hồ sơ của bạn.',
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const stravaStatus = accountData?.stravaStatus || {
    isConnected: true,
    syncStatus: 'REQUIRE_ACTIVITY_SCOPE',
    statusBadgeText: 'Cần cấp quyền đọc hoạt động (activity:read_all)',
    clientId: '292007',
    athleteId: '126278000',
    athleteName: 'Thuận Nguyễn Hữu',
    city: 'Hà Nội',
    country: 'Vietnam',
    profilePicUrl:
      'https://dgalywyr863hv.cloudfront.net/pictures/athletes/126278000/57450920/1/large.jpg',
    scopes: ['read'],
    hasActivityReadScope: false,
    expiresAtIso: new Date(Date.now() + 21600 * 1000).toISOString(),
    lastSyncAtIso: new Date().toISOString(),
    authorizeUrl: `https://www.strava.com/oauth/authorize?client_id=292007&response_type=code&redirect_uri=${encodeURIComponent(
      'http://localhost:4000/api/v1/strava/callback'
    )}&approval_prompt=force&scope=read,activity:read_all&state=${currentUserId}`,
  };

  const syncLogs: any[] = accountData?.syncLogs || [];

  const inputClass =
    'w-full rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FC4C02]/40 focus:border-[#FC4C02] transition';

  const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5';

  return (
    <div className="space-y-6">
      {/* PROFILE SUMMARY HEADER + CONTEXTUAL SUB-NAVIGATION */}
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0 my-1">
              <AthleteAvatar
                user={{
                  ...authUser,
                  ...(accountData?.user || {}),
                  avatarUrl: avatarUrl || stravaStatus.profilePicUrl || accountData?.user?.avatarUrl || authUser?.avatarUrl,
                }}
                size="lg"
                showBadge={true}
                showWings={true}
                showSharkCrown={true}
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {accountData?.user?.fullName || fullName}
                </h2>
                <AthleteHonorPill user={accountData?.user || authUser} />
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#FC4C02]/10 text-[#FC4C02] border border-[#FC4C02]/20">
                  {accountData?.user?.role === 'ADMIN' ? 'Ban Tổ Chức' : 'Vận Động Viên'}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{accountData?.user?.email || authUser?.email || 'thuanzero94@gmail.com'}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {departmentOrUnit}
                </span>
              </p>
            </div>
          </div>

          {/* 3 Clean Contextual Sub-Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setSubTab('profile')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                subTab === 'profile'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#FC4C02]" />
              <span>Hồ sơ cá nhân</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('strava')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                subTab === 'strava'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#FC4C02]" />
              <span>Kết nối Strava</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  stravaStatus.hasActivityReadScope
                    ? 'bg-emerald-500'
                    : stravaStatus.isConnected
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setSubTab('security')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                subTab === 'security'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#FC4C02]" />
              <span>Bảo mật &amp; Tài khoản</span>
            </button>
          </div>
        </div>
      </div>

      {/* CLEAN FEEDBACK BANNER */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-sm font-medium ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200'
              : notification.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs font-semibold underline opacity-75 hover:opacity-100 cursor-pointer shrink-0"
          >
            Đóng
          </button>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 1: HỒ SƠ CÁ NHÂN, THỂ CHẤT & KỶ LỤC PR
         ===================================================================== */}
      {subTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cột trái: Thông tin định danh & Liên hệ */}
            <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FC4C02]/10 flex items-center justify-center text-[#FC4C02]">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Thông tin cá nhân &amp; Đơn vị
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Hiển thị trên Bảng xếp hạng, E-BIB và Giấy chứng nhận Finisher
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ẢNH ĐẠI DIỆN (AVATAR) */}
                <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Ảnh đại diện hồ sơ (Avatar)
                  </label>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="relative shrink-0">
                      <img
                        src={
                          avatarUrl ||
                          stravaStatus.profilePicUrl ||
                          accountData?.user?.avatarUrl ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authUser?.email || 'Runner')}`
                        }
                        alt="Avatar preview"
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#FC4C02] shadow-sm bg-slate-100 dark:bg-slate-800"
                      />
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={avatarFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => avatarFileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#e04402] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Tải ảnh từ máy</span>
                        </button>

                        {(stravaStatus.profilePicUrl || accountData?.stravaStatus?.profilePicUrl) && (
                          <button
                            type="button"
                            onClick={handleUseStravaAvatar}
                            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Activity className="w-3.5 h-3.5 text-[#FC4C02]" />
                            <span>Dùng ảnh từ Strava</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="Hoặc dán URL ảnh trực tiếp (https://...)"
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Họ và tên vận động viên</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                    placeholder="Nhập họ và tên đầy đủ có dấu..."
                  />
                </div>

                <div>
                  <label className={labelClass}>Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    placeholder="09xxxxxxxx"
                  />
                </div>

                <div>
                  <label className={labelClass}>Giới tính thi đấu</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className={inputClass}
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Phòng ban / Đơn vị / Câu lạc bộ</label>
                  <input
                    type="text"
                    value={departmentOrUnit}
                    onChange={(e) => setDepartmentOrUnit(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Địa chỉ nhận Huy chương &amp; Race-Kit</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={defaultShippingAddress}
                      onChange={(e) => setDefaultShippingAddress(e.target.value)}
                      className={inputClass}
                      placeholder="Nhập địa chỉ nhận vật phẩm giải chạy..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Chỉ số thể chất & Kỷ lục cá nhân */}
            <div className="lg:col-span-5 space-y-6">
              {/* Khối Chỉ số thể chất & Size áo */}
              <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5 shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Chỉ số thể chất &amp; Cỡ áo
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Dùng để đối chiếu nhịp tim và cấp phát áo Finisher
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className={labelClass}>Cân nặng (kg)</label>
                    <input
                      type="number"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Chiều cao (cm)</label>
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Nhịp tim tối đa</label>
                    <input
                      type="number"
                      value={maxHeartRate}
                      onChange={(e) => setMaxHeartRate(Number(e.target.value))}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Size áo</label>
                    <select
                      value={defaultShirtSize}
                      onChange={(e) => setDefaultShirtSize(e.target.value)}
                      className={`${inputClass} font-semibold`}
                    >
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => (
                        <option key={s} value={s}>
                          Size {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Khối Kỷ lục cá nhân (Personal Records) */}
              <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5 shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Timer className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Kỷ lục cá nhân (Personal Records)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Định dạng Phút:Giây (VD: 21:30 cho cự ly 5KM)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className={labelClass}>Cự ly 5K</label>
                    <input
                      type="text"
                      value={pr5kInput}
                      onChange={(e) => setPr5kInput(e.target.value)}
                      className={`${inputClass} font-mono text-center`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Cự ly 10K</label>
                    <input
                      type="text"
                      value={pr10kInput}
                      onChange={(e) => setPr10kInput(e.target.value)}
                      className={`${inputClass} font-mono text-center`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>21K (Half)</label>
                    <input
                      type="text"
                      value={pr21kInput}
                      onChange={(e) => setPr21kInput(e.target.value)}
                      className={`${inputClass} font-mono text-center`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>42K (Full)</label>
                    <input
                      type="text"
                      value={pr42kInput}
                      onChange={(e) => setPr42kInput(e.target.value)}
                      className={`${inputClass} font-mono text-center`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Thanh lưu cố định gọn gàng */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Đang lưu...' : 'Lưu thông tin hồ sơ'}</span>
            </button>
          </div>
        </form>
      )}

      {/* =====================================================================
          SUB-TAB 2: KẾT NỐI & ĐỒNG BỘ STRAVA
         ===================================================================== */}
      {subTab === 'strava' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Trạng thái liên kết & Điều khiển đồng bộ */}
          <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FC4C02]/10 flex items-center justify-center text-[#FC4C02]">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Liên kết tài khoản Strava
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tự động đồng bộ bài chạy, bản đồ GPS và tốc độ từng km
                  </p>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                  stravaStatus.hasActivityReadScope
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : stravaStatus.isConnected
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    stravaStatus.hasActivityReadScope
                      ? 'bg-emerald-500'
                      : stravaStatus.isConnected
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
                <span>{stravaStatus.statusBadgeText}</span>
              </span>
            </div>

            {/* Thẻ Vận động viên Strava đang kết nối */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3.5">
                {stravaStatus.profilePicUrl ? (
                  <img
                    src={stravaStatus.profilePicUrl}
                    alt="Strava Athlete"
                    className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Tài khoản Strava</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {stravaStatus.athleteName || 'Chưa kết nối'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    ID: {stravaStatus.athleteId || '—'}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-center">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Quyền đọc hoạt động:</span>
                  <span
                    className={`font-semibold ${
                      stravaStatus.hasActivityReadScope
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {stravaStatus.hasActivityReadScope ? 'Đã cấp đủ quyền' : 'Cần cấp thêm quyền'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Phạm vi hiện tại:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {Array.isArray(stravaStatus.scopes) && stravaStatus.scopes.length > 0
                      ? stravaStatus.scopes.join(', ')
                      : 'Chưa có'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Đồng bộ gần nhất:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {stravaStatus.lastSyncAtIso
                      ? new Date(stravaStatus.lastSyncAtIso).toLocaleString('vi-VN')
                      : 'Chưa đồng bộ'}
                  </span>
                </div>
              </div>
            </div>

            {/* Hướng dẫn cấp quyền nếu thiếu activity:read_all */}
            {!stravaStatus.hasActivityReadScope && (
              <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Cần cấp quyền đọc danh sách bài chạy (activity:read_all)</span>
                </div>
                <p className="leading-relaxed text-amber-800/90 dark:text-amber-200/80">
                  Phiên kết nối hiện tại chỉ mới có quyền đọc thông tin hồ sơ cơ bản (<code className="font-mono">read</code>). Hãy nhấn nút{' '}
                  <strong>Cấp quyền đọc bài chạy Strava</strong> bên dưới và xác nhận <strong>Authorize</strong> trên trang Strava để hệ thống tự động tải các buổi chạy của bạn về.
                </p>
              </div>
            )}

            {/* Các nút thao tác đồng bộ */}
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={stravaStatus.authorizeUrl}
                className="px-4 py-2.5 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Link2 className="w-4 h-4" />
                <span>
                  {stravaStatus.hasActivityReadScope
                    ? 'Kết nối lại Strava'
                    : 'Cấp quyền đọc bài chạy Strava'}
                </span>
              </a>

              <button
                type="button"
                onClick={() => handleSyncLiveStrava(7)}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Đồng bộ 7 ngày qua</span>
              </button>

              <button
                type="button"
                onClick={() => handleSyncLiveStrava(30)}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Đồng bộ 30 ngày qua</span>
              </button>

              <button
                type="button"
                onClick={handleRefreshToken}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Làm mới phiên</span>
              </button>

              {stravaStatus.isConnected && (
                <button
                  type="button"
                  onClick={handleDisconnectStrava}
                  disabled={loading}
                  className="px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ml-auto"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Ngắt kết nối</span>
                </button>
              )}
            </div>
          </div>

          {/* Cột phải: Lịch sử đồng bộ gần đây */}
          <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Lịch sử đồng bộ gần đây
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">{syncLogs.length} bản ghi</span>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {syncLogs.length > 0 ? (
                syncLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {log.triggerType}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {log.summaryMessage}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] font-semibold">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{log.newlySyncedCount} bài chạy mới
                      </span>
                      {log.flaggedOrCutCount > 0 && (
                        <span className="text-amber-600 dark:text-amber-400">
                          {log.flaggedOrCutCount} bài cắt đoạn lỗi
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Chưa có lịch sử đồng bộ nào.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: BẢO MẬT & CHUYỂN ĐỔI TÀI KHOẢN
         ===================================================================== */}
      {subTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Đổi mật khẩu */}
          <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5 shadow-sm self-start">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Đổi mật khẩu bảo mật
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cập nhật mật khẩu đăng nhập cho tài khoản hiện tại
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Mật khẩu mới (tối thiểu 6 ký tự)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition cursor-pointer"
              >
                Cập nhật mật khẩu
              </button>
            </div>
          </div>

          {/* Thông tin phiên đăng nhập & Trạng thái tài khoản */}
          <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5 shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Thông tin phiên &amp; Trạng thái tài khoản
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quản lý quyền truy cập và chứng thực bảo mật tài khoản Runner
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">
                  Email đăng nhập
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {accountData?.user?.email || authUser?.email || 'thuanzero94@gmail.com'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">
                  Phân quyền hệ thống
                </div>
                <div className="text-sm font-bold text-[#FC4C02] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {accountData?.user?.role === 'ADMIN'
                      ? 'Quản trị viên (ADMIN)'
                      : accountData?.user?.role === 'ORGANIZER'
                      ? 'Ban tổ chức (ORGANIZER)'
                      : 'Vận động viên (RUNNER)'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">
                  Đồng bộ Strava
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {stravaStatus.isConnected
                    ? `Athlete: ${stravaStatus.athleteName || 'Đã liên kết'}`
                    : 'Chưa liên kết'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">
                  Mã số Runner ID
                </div>
                <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {currentUserId}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Khuyến nghị bảo mật:</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-200/80 leading-relaxed">
                Để đăng xuất khỏi thiết bị công cộng, bạn có thể bấm nút <strong>Đăng xuất</strong> ở thanh menu bên trái. Không chia sẻ mật khẩu hoặc Strava Token cho người khác.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KHU VỰC ĐĂNG XUẤT TÀI KHOẢN (ĐẶC BIỆT THUẬN TIỆN TRÊN MOBILE) */}
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-rose-200/80 dark:border-rose-900/40 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Đăng xuất khỏi thiết bị này</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kết thúc phiên làm việc của tài khoản ({accountData?.user?.email || authUser?.email || 'Runner'}).
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất tài khoản</span>
        </button>
      </div>
    </div>
  );
}
