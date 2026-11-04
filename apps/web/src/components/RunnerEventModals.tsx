'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Trophy, X, CheckCircle2, ShieldCheck, Truck } from 'lucide-react';
import { formatPace } from '@toprun/shared';
import type { TracklogActivityItem } from './UserTracklogExplorer';

interface RunnerEventModalsProps {
  showShareModal: boolean;
  onCloseShareModal: () => void;
  selectedActivity: TracklogActivityItem | undefined;
  myBibNumber: string;
  svgPathData: string;
  showRegisterModal: boolean;
  onCloseRegisterModal: () => void;
  myTargetKm: number;
  onChangeTargetKm: (km: number) => void;
  myShirtSize: string;
  onChangeShirtSize: (size: string) => void;
  showCreateEventModal: boolean;
  onCloseCreateEventModal: () => void;
  newEventForm: any;
  onChangeNewEventForm: (form: any) => void;
  onSubmitCreateNewEvent: (e: React.FormEvent) => void;
  currentEvent?: any;
  clubsList?: any[];
  currentUser?: any;
  currentUserName?: string;
  onConfirmRegister?: (eventId: string, regData: any) => Promise<void>;
  showEditBibModal?: boolean;
  onCloseEditBibModal?: () => void;
  onSubmitEditBib?: (eventId: string, newBib: string) => Promise<void>;
  editBibInitialValue?: string;
  editBibEventId?: string;
  editBibEventTitle?: string;
}

export default function RunnerEventModals({
  showShareModal,
  onCloseShareModal,
  selectedActivity,
  myBibNumber,
  svgPathData,
  showRegisterModal,
  onCloseRegisterModal,
  myTargetKm,
  onChangeTargetKm,
  myShirtSize,
  onChangeShirtSize,
  showCreateEventModal,
  onCloseCreateEventModal,
  newEventForm,
  onChangeNewEventForm,
  onSubmitCreateNewEvent,
  currentEvent,
  clubsList = [],
  currentUser,
  currentUserName = '',
  onConfirmRegister,
  showEditBibModal = false,
  onCloseEditBibModal,
  onSubmitEditBib,
  editBibInitialValue = '',
  editBibEventId = '',
  editBibEventTitle = '',
}: RunnerEventModalsProps) {
  const [regCategoryId, setRegCategoryId] = useState<string>('');
  const [regBibNumber, setRegBibNumber] = useState<string>('');
  const [selectedChallengeIds, setSelectedChallengeIds] = useState<string[]>([]);
  const [regTeamId, setRegTeamId] = useState<string>('');
  const [regShirtSize, setRegShirtSize] = useState<string>(currentUser?.defaultShirtSize || myShirtSize || 'L');
  const [regEngraving, setRegEngraving] = useState<string>(currentUser?.fullName?.toUpperCase() || currentUserName?.toUpperCase() || '');
  const [regRecipient, setRegRecipient] = useState<string>(currentUser?.fullName || currentUserName || '');
  const [regPhone, setRegPhone] = useState<string>(currentUser?.phone || '0909123456');
  const [regAddress, setRegAddress] = useState<string>(currentUser?.defaultShippingAddress || 'Văn phòng Công ty ASSA ABLOY');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  // Edit BIB states
  const [editBibInput, setEditBibInput] = useState<string>('');
  const [isSubmittingBib, setIsSubmittingBib] = useState(false);
  const [editBibError, setEditBibError] = useState<string | null>(null);

  useEffect(() => {
    if (editBibInitialValue) {
      setEditBibInput(editBibInitialValue);
      setEditBibError(null);
    }
  }, [editBibInitialValue, showEditBibModal]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.fullName) {
        setRegRecipient(currentUser.fullName);
        setRegEngraving(currentUser.fullName.toUpperCase());
      }
      if (currentUser.phone) {
        setRegPhone(currentUser.phone);
      }
      if (currentUser.defaultShippingAddress) {
        setRegAddress(currentUser.defaultShippingAddress);
      }
      if (currentUser.defaultShirtSize) {
        setRegShirtSize(currentUser.defaultShirtSize);
      }
    } else if (currentUserName) {
      setRegEngraving(currentUserName.toUpperCase());
      setRegRecipient(currentUserName);
    }
  }, [currentUser, currentUserName, showRegisterModal]);

  useEffect(() => {
    if (currentEvent?.categories && currentEvent.categories.length > 0) {
      const firstCat = currentEvent.categories[0];
      setRegCategoryId(firstCat.id || firstCat.name);
      const prefix = currentEvent.bibPrefix || firstCat.bibPrefix || 'PRO-';
      const count = (currentEvent.participantsCount || (currentEvent.participants ? currentEvent.participants.length : 0)) + 101;
      setRegBibNumber(`${prefix}${String(count).padStart(4, '0')}`);
    }
  }, [currentEvent]);

  const handleGenerateRandomBib = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const cat = currentEvent?.categories?.find((c: any) => (c.id || c.name) === regCategoryId);
    const prefix = currentEvent?.bibPrefix || cat?.bibPrefix || 'PRO-';
    setRegBibNumber(`${prefix}${randomNum}`);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent) return;
    setIsSubmittingReg(true);
    try {
      if (onConfirmRegister) {
        await onConfirmRegister(currentEvent.id, {
          categoryId: regCategoryId,
          bibNumber: regBibNumber.trim().toUpperCase() || undefined,
          selectedChallengeTierIds: selectedChallengeIds,
          teamId: regTeamId || undefined,
          shirtSize: regShirtSize,
          medalEngravingName: regEngraving || currentUserName,
          recipientName: regRecipient || currentUserName,
          phone: regPhone,
          shippingAddress: regAddress,
        });
      }
      onCloseRegisterModal();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đăng ký giải đấu.');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const handleEditBibSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBib = editBibInput.trim().toUpperCase();
    if (!cleanBib || cleanBib.length < 2) {
      setEditBibError('Vui lòng nhập số BIB hợp lệ (tối thiểu 2 ký tự).');
      return;
    }
    setIsSubmittingBib(true);
    setEditBibError(null);
    try {
      if (onSubmitEditBib && editBibEventId) {
        await onSubmitEditBib(editBibEventId, cleanBib);
      }
      if (onCloseEditBibModal) {
        onCloseEditBibModal();
      }
    } catch (err: any) {
      setEditBibError(err.message || 'Lỗi khi cập nhật số BIB.');
    } finally {
      setIsSubmittingBib(false);
    }
  };
  return (
    <>
      {/* MODAL 1: SHARE CARD */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1420] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#FC4C02]" />
                <span>Thẻ chia sẻ thành tích chạy bộ</span>
              </h3>
              <button
                type="button"
                onClick={onCloseShareModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#090D16] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#FC4C02]">
                    TOPRUN VIRTUAL RACE 2026
                  </span>
                  <h4 className="text-base font-bold text-white mt-0.5">
                    {selectedActivity?.name || 'Chưa chọn hoạt động'}
                  </h4>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-white/10 text-xs font-mono tabular-nums font-bold text-white">
                  {myBibNumber}
                </span>
              </div>

              <div className="h-44 flex items-center justify-center bg-slate-950 rounded-xl border border-slate-800 p-3">
                <svg viewBox="0 0 520 260" className="w-full h-full">
                  {svgPathData && (
                    <path
                      d={svgPathData}
                      fill="none"
                      stroke="#FC4C02"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Quãng đường</div>
                  <div className="text-xl font-extrabold font-mono tabular-nums text-white mt-0.5">
                    {selectedActivity?.validDistanceKm ?? 0} km
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Pace TB</div>
                  <div className="text-xl font-extrabold font-mono tabular-nums text-white mt-0.5">
                    {formatPace(selectedActivity?.avgPaceSecPerKm ?? 360, false)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Điểm giải</div>
                  <div className="text-xl font-extrabold font-mono tabular-nums text-emerald-400 mt-0.5">
                    +{selectedActivity?.finalCountedDistanceKm ?? 0} km
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onCloseShareModal}
                className="px-4 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ĐĂNG KÝ THAM GIA GIẢI ĐẤU & NHẬN SỐ E-BIB */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-lg w-full my-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1420] p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FC4C02]/10 text-[#FC4C02] flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Đăng Ký Tham Gia Giải Đấu
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                    {currentEvent?.title || 'TOPRun Virtual Race'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onCloseRegisterModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              {/* Target distance choice */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Chọn cự ly mục tiêu (Target Finisher) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    currentEvent?.categories && currentEvent.categories.length > 0
                      ? currentEvent.categories
                      : [
                          { id: 'cat_21', name: 'Mục tiêu 21KM', targetDistanceKm: 21 },
                          { id: 'cat_42', name: 'Mục tiêu 42KM', targetDistanceKm: 42 },
                          { id: 'cat_50', name: 'Mục tiêu 50KM', targetDistanceKm: 50 },
                        ]
                  ).map((cat: any) => {
                    const isSelected = regCategoryId === (cat.id || cat.name);

                    return (
                      <div
                        key={cat.id || cat.name}
                        onClick={() => {
                          setRegCategoryId(cat.id || cat.name);
                          onChangeTargetKm(cat.targetDistanceKm);
                        }}
                        className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                          isSelected
                            ? 'border-[#FC4C02] bg-[#FC4C02]/10 text-[#FC4C02] font-bold shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-sm font-black font-mono">{cat.targetDistanceKm} KM</div>
                        <div className="text-[10px] mt-0.5 truncate">{cat.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BIB Number Field */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Số BIB tham gia (Tự động / Tùy chọn) *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomBib}
                    className="text-[11px] font-bold text-[#FC4C02] hover:underline cursor-pointer"
                  >
                    Gợi ý số khác
                  </button>
                </div>
                <input
                  type="text"
                  value={regBibNumber}
                  onChange={(e) => setRegBibNumber(e.target.value.toUpperCase())}
                  placeholder="VD: TOP50-8888 hoặc 8888"
                  className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1420] text-slate-900 dark:text-white uppercase focus:ring-1 focus:ring-[#FC4C02]"
                  required
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Gợi ý tự động theo cự ly. Bạn có thể sửa thành số may mắn, ngày sinh... (hệ thống kiểm tra không trùng lặp).
                </p>
              </div>

              {/* Special Challenges Opt-in */}
              {currentEvent?.challengeTiers && currentEvent.challengeTiers.length > 0 && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      Chọn Thử Thách Mở Rộng (Special Challenges)
                    </label>
                    <span className="text-[10px] text-amber-500 font-bold px-1.5 py-0.5 rounded bg-amber-500/10">Tùy chọn thêm</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Chinh phục thêm các mốc huy hiệu danh giá, thử thách tốc độ (speed), streak hoặc single long run:
                  </p>
                  <div className="space-y-1.5 pt-0.5">
                    {currentEvent.challengeTiers.map((tier: any) => {
                      const isChecked = selectedChallengeIds.includes(tier.id);
                      return (
                        <div
                          key={tier.id}
                          onClick={() => {
                            setSelectedChallengeIds((prev) =>
                              prev.includes(tier.id) ? prev.filter((id) => id !== tier.id) : [...prev, tier.id]
                            );
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer select-none ${
                            isChecked
                              ? 'border-amber-500/80 bg-amber-500/10 text-slate-900 dark:text-white font-medium'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{tier.awardBadgeUrl || '🏆'}</span>
                            <div>
                              <div className="font-bold text-xs">{tier.tierName}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {tier.rewardDescription}
                              </div>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="w-4 h-4 rounded accent-[#FC4C02] pointer-events-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Club / Department */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Đại diện Câu lạc bộ / Đội nhóm
                </label>
                <select
                  value={regTeamId}
                  onChange={(e) => setRegTeamId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                >
                  <option value="">VĐV Tự Do (Không thuộc CLB)</option>
                  {clubsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="club_assa">ASSA ABLOY Vietnam Runners</option>
                  <option value="club_rnd">Khối Công Nghệ &amp; R&amp;D</option>
                </select>
              </div>

              {/* Shirt size & Engraving */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Size áo Finisher
                  </label>
                  <select
                    value={regShirtSize}
                    onChange={(e) => {
                      setRegShirtSize(e.target.value);
                      onChangeShirtSize(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  >
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => (
                      <option key={s} value={s}>
                        Size {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Tên khắc lên Huy chương
                  </label>
                  <input
                    type="text"
                    value={regEngraving}
                    onChange={(e) => setRegEngraving(e.target.value)}
                    placeholder="VD: NGUYEN VAN A"
                    className="w-full px-3 py-2 text-xs uppercase font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  />
                </div>
              </div>

              {/* Shipping info */}
              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-[#FC4C02]" />
                  <span>Địa chỉ giao nhận Race-Kit &amp; Huy chương</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold">Người nhận</label>
                    <input
                      type="text"
                      value={regRecipient}
                      onChange={(e) => setRegRecipient(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold">Số điện thoại</label>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-semibold">Địa chỉ giao hàng</label>
                  <input
                    type="text"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    required
                    placeholder="Số nhà, đường, phường, quận, tỉnh/TP"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onCloseRegisterModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingReg}
                  className="px-5 py-2.5 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingReg ? 'Đang cấp E-BIB...' : 'Xác nhận đăng ký & Nhận E-BIB'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TẠO GIẢI ĐẤU MỚI (CREATE EVENT MODAL) */}
      {showCreateEventModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full my-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1420] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#FC4C02]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Khởi Tạo Giải Chạy Ảo / Thử Thách Mới
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseCreateEventModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSubmitCreateNewEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên giải đấu *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: TOPRUN SPRING HALF MARATHON 2026"
                  value={newEventForm.title}
                  onChange={(e) => onChangeNewEventForm({ ...newEventForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Thông điệp / Phụ đề
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giải chạy đón xuân • Chạy bộ vì sức khỏe doanh nghiệp"
                  value={newEventForm.subtitle}
                  onChange={(e) => onChangeNewEventForm({ ...newEventForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    required
                    value={newEventForm.startDateIso}
                    onChange={(e) => onChangeNewEventForm({ ...newEventForm, startDateIso: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ngày kết thúc *</label>
                  <input
                    type="date"
                    required
                    value={newEventForm.endDateIso}
                    onChange={(e) => onChangeNewEventForm({ ...newEventForm, endDateIso: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pace tối thiểu</label>
                  <input
                    type="text"
                    value={newEventForm.minPaceFormatted}
                    onChange={(e) => onChangeNewEventForm({ ...newEventForm, minPaceFormatted: e.target.value })}
                    placeholder="03:30"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pace tối đa</label>
                  <input
                    type="text"
                    value={newEventForm.maxPaceFormatted}
                    onChange={(e) => onChangeNewEventForm({ ...newEventForm, maxPaceFormatted: e.target.value })}
                    placeholder="15:00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nhân hệ số cuối tuần
                  </label>
                  <select
                    value={newEventForm.weekendMultiplier}
                    onChange={(e) =>
                      onChangeNewEventForm({ ...newEventForm, weekendMultiplier: parseFloat(e.target.value) || 1.0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  >
                    <option value={1.0}>1.0x (Không nhân)</option>
                    <option value={1.5}>1.5x (Thứ 7 &amp; CN)</option>
                    <option value={2.0}>2.0x (Cuối tuần x2)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCloseCreateEventModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white font-bold shadow-md shadow-[#FC4C02]/20 transition cursor-pointer"
                >
                  Tạo Giải Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 4: ĐỔI SỐ BIB CÁ NHÂN */}
      {showEditBibModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1420] p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FC4C02]/10 text-[#FC4C02] flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Đổi Số BIB Cá Nhân
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                    {editBibEventTitle || 'Giải đấu đang tham gia'}
                  </p>
                </div>
              </div>

              {onCloseEditBibModal && (
                <button
                  type="button"
                  onClick={onCloseEditBibModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <form onSubmit={handleEditBibSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Nhập số BIB mong muốn *
                </label>
                <input
                  type="text"
                  value={editBibInput}
                  onChange={(e) => {
                    setEditBibInput(e.target.value.toUpperCase());
                    setEditBibError(null);
                  }}
                  placeholder="VD: 8888, ALAN99, TOP50-1234"
                  className="w-full px-3 py-2.5 text-base font-mono font-black uppercase rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0C101B] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FC4C02]"
                  required
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Số BIB có thể bao gồm chữ và số. Hệ thống sẽ kiểm tra đảm bảo tính độc bản (không trùng với VĐV khác trong giải).
                </p>
              </div>

              {editBibError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  ⚠️ {editBibError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {onCloseEditBibModal && (
                  <button
                    type="button"
                    onClick={onCloseEditBibModal}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmittingBib}
                  className="px-5 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingBib ? 'Đang kiểm tra & Lưu...' : 'Xác Nhận Đổi BIB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

