'use client';

import React from 'react';
import { Share2, Trophy, X } from 'lucide-react';
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
}: RunnerEventModalsProps) {
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

      {/* MODAL 2: ĐỔI HẠNG MỤC MỤC TIÊU & SIZE ÁO */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1420] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Đổi cự ly mục tiêu &amp; Size áo Finisher
              </h3>
              <button
                type="button"
                onClick={onCloseRegisterModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Chọn cự ly mục tiêu (Target Finisher):
                </label>
                <select
                  value={myTargetKm}
                  onChange={(e) => onChangeTargetKm(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-semibold"
                >
                  <option value={30}>Cự ly 30KM (Starter)</option>
                  <option value={50}>Cự ly 50KM (Finisher)</option>
                  <option value={100}>Cự ly 100KM (Pro Runner)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Chọn Size áo Finisher:
                </label>
                <select
                  value={myShirtSize}
                  onChange={(e) => onChangeShirtSize(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-semibold"
                >
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => (
                    <option key={s} value={s}>
                      Size {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onCloseRegisterModal}
                className="px-4 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-semibold cursor-pointer"
              >
                Lưu thay đổi
              </button>
            </div>
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
    </>
  );
}

