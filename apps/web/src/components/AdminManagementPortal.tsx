'use client';

import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Download,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  Trophy,
  Truck,
  Users,
} from 'lucide-react';
import { AntiCheatStatus } from '@toprun/shared';
import type { TracklogActivityItem } from './UserTracklogExplorer';

export interface AdminEventFormState {
  title: string;
  subtitle: string;
  status: string;
  startDateIso: string;
  endDateIso: string;
  minPaceFormatted: string;
  maxPaceFormatted: string;
  minActivityDistanceKm: number;
  weekendMultiplier: number;
}

interface AdminManagementPortalProps {
  currentUserId: string;
  adminSubTab: 'users' | 'races' | 'moderation' | 'fulfillment';
  onChangeSubTab: (tab: 'users' | 'races' | 'moderation' | 'fulfillment') => void;
  adminUsers: any[];
  isAdminUsersLoading: boolean;
  adminUserSearch: string;
  onChangeUserSearch: (q: string) => void;
  adminUserActionMsg: string | null;
  onRefreshUsers: () => void;
  onUpdateUserRole: (userId: string, newRole: string) => void;
  onDeleteUser: (userId: string, userName: string) => void;
  adminEventSaveMsg: string | null;
  eventsList: any[];
  selectedEventId: string;
  onSelectEventId: (eventId: string) => void;
  onOpenCreateEventModal: () => void;
  eventForm: AdminEventFormState;
  onChangeEventForm: (form: AdminEventFormState) => void;
  onSaveEventRules: (e: React.FormEvent) => void;
  challengeTiers: any[];
  activities: TracklogActivityItem[];
  onInspectFlaggedActivity: (activityId: string) => void;
  raceKitOrders: any[];
  onExportRaceKitCsv: () => void;
}

export default function AdminManagementPortal({
  currentUserId,
  adminSubTab,
  onChangeSubTab,
  adminUsers,
  isAdminUsersLoading,
  adminUserSearch,
  onChangeUserSearch,
  adminUserActionMsg,
  onRefreshUsers,
  onUpdateUserRole,
  onDeleteUser,
  adminEventSaveMsg,
  eventsList,
  selectedEventId,
  onSelectEventId,
  onOpenCreateEventModal,
  eventForm,
  onChangeEventForm,
  onSaveEventRules,
  challengeTiers,
  activities,
  onInspectFlaggedActivity,
  raceKitOrders,
  onExportRaceKitCsv,
}: AdminManagementPortalProps) {
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<string | null>(null);
  const flaggedActivities = activities.filter((a) => a.antiCheatStatus !== AntiCheatStatus.VALID);

  return (
    <div className="space-y-6">
      {/* Admin Navigation Pills */}
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'users' as const, label: 'Quản lý VĐV & Phân quyền', icon: Users, count: adminUsers.length },
            { id: 'races' as const, label: 'Quản lý Giải & Thử thách', icon: Trophy },
            {
              id: 'moderation' as const,
              label: 'Kiểm duyệt GPS & Gian lận',
              icon: ShieldAlert,
              count: flaggedActivities.length,
            },
            { id: 'fulfillment' as const, label: 'Giao hàng Race-Kit', icon: Truck, count: raceKitOrders.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = adminSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeSubTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  isActive
                    ? 'bg-[#FC4C02] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Quản trị viên tối cao (SuperAdmin)
          </span>
        </div>
      </div>

      {/* Action Banner Message */}
      {adminUserActionMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{adminUserActionMsg}</span>
        </div>
      )}

      {/* SUB-VIEW 1: QUẢN LÝ VẬN ĐỘNG VIÊN & PHÂN QUYỀN */}
      {adminSubTab === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400">Tổng Vận Động Viên</div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {adminUsers.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Lưu trữ PostgreSQL</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400">Quản trị viên (ADMIN)</div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-500 mt-1">
                {adminUsers.filter((u) => u.role === 'ADMIN').length}
              </div>
              <div className="text-[11px] text-amber-500/80 mt-1">Toàn quyền hệ thống</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400">Ban tổ chức (ORGANIZER)</div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-blue-500 mt-1">
                {adminUsers.filter((u) => u.role === 'ORGANIZER').length}
              </div>
              <div className="text-[11px] text-blue-500/80 mt-1">Quản lý giải &amp; Kiểm duyệt</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400">VĐV Thi đấu (RUNNER)</div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-500 mt-1">
                {adminUsers.filter((u) => u.role === 'RUNNER' || !u.role).length}
              </div>
              <div className="text-[11px] text-emerald-500/80 mt-1">Tham gia thi đấu &amp; Đua top</div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#FC4C02]" />
                  <span>Danh sách tài khoản &amp; Phân quyền người dùng</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Quản lý phân quyền vai trò (Admin / Organizer / Runner) và xem thông tin cá nhân
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={adminUserSearch}
                    onChange={(e) => onChangeUserSearch(e.target.value)}
                    placeholder="Tìm tên, email, SĐT, đơn vị..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02] w-64"
                  />
                </div>
                <button
                  type="button"
                  onClick={onRefreshUsers}
                  disabled={isAdminUsersLoading}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  title="Làm mới danh sách"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAdminUsersLoading ? 'animate-spin text-[#FC4C02]' : ''}`} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/70 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-400">
                    <th className="py-3 px-3">Vận động viên</th>
                    <th className="py-3 px-3">Email &amp; SĐT</th>
                    <th className="py-3 px-3">Phòng ban</th>
                    <th className="py-3 px-3">Size áo / Địa chỉ</th>
                    <th className="py-3 px-3">Vai trò hệ thống</th>
                    <th className="py-3 px-3">Ngày tạo</th>
                    <th className="py-3 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {adminUsers
                    .filter((u) => {
                      if (!adminUserSearch.trim()) return true;
                      const q = adminUserSearch.toLowerCase();
                      return (
                        (u.fullName || '').toLowerCase().includes(q) ||
                        (u.email || '').toLowerCase().includes(q) ||
                        (u.phone || '').toLowerCase().includes(q) ||
                        (u.departmentOrUnit || '').toLowerCase().includes(q)
                      );
                    })
                    .map((u) => {
                      const isCurrentAdmin = u.id === currentUserId;
                      const isConfirmingDelete = pendingDeleteUserId === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FC4C02] to-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {(u.fullName || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{u.fullName || 'Chưa cập nhật tên'}</span>
                                  {isCurrentAdmin && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                      Bạn
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400">ID: {u.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono text-xs text-slate-800 dark:text-slate-200">{u.email}</div>
                            <div className="text-xs text-slate-500">{u.phone || '—'}</div>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
                            {u.departmentOrUnit || 'ASSA ABLOY Vietnam'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {u.defaultShirtSize || 'L'}
                            </span>
                            <div className="text-[11px] text-slate-400 truncate max-w-[140px] mt-0.5">
                              {u.defaultShippingAddress || 'Chưa có địa chỉ'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <select
                              value={u.role || 'RUNNER'}
                              onChange={(e) => onUpdateUserRole(u.id, e.target.value)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                u.role === 'ADMIN'
                                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                                  : u.role === 'ORGANIZER'
                                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <option value="ADMIN">ADMIN (Quản trị viên)</option>
                              <option value="ORGANIZER">ORGANIZER (Ban tổ chức)</option>
                              <option value="RUNNER">RUNNER (Vận động viên)</option>
                            </select>
                          </td>
                          <td className="py-3 px-3 text-xs font-mono tabular-nums text-slate-500">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isConfirmingDelete ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPendingDeleteUserId(null);
                                    onDeleteUser(u.id, u.fullName || u.email);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Xác nhận xoá
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteUserId(null)}
                                  className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] cursor-pointer"
                                >
                                  Huỷ
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={isCurrentAdmin}
                                onClick={() => setPendingDeleteUserId(u.id)}
                                title={isCurrentAdmin ? 'Không thể tự xoá tài khoản đang đăng nhập' : 'Xoá người dùng'}
                                className={`p-1.5 rounded-lg border transition ${
                                  isCurrentAdmin
                                    ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                                    : 'border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 cursor-pointer'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: QUẢN LÝ GIẢI CHẠY & THỬ THÁCH */}
      {adminSubTab === 'races' && (
        <div className="space-y-6">
          {adminEventSaveMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{adminEventSaveMsg}</span>
            </div>
          )}

          <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#FC4C02]" />
                  <span>Cấu hình Quy chế Giải Chạy &amp; Thử thách ảo (Virtual Race)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tùy chỉnh pace hợp lệ, cự ly tối thiểu, thời gian thi đấu và các mốc Challenge nhận huy hiệu
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Giải:</span>
                  <select
                    value={selectedEventId}
                    onChange={(e) => onSelectEventId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    {eventsList.map((ev) => (
                      <option key={ev.id} value={ev.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={onOpenCreateEventModal}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <span>+ Tạo Giải Mới</span>
                </button>

                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#FC4C02]/10 text-[#FC4C02] border border-[#FC4C02]/20">
                  {selectedEventId}
                </span>
              </div>
            </div>

            <form onSubmit={onSaveEventRules} className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  1. Thông tin giải &amp; Trạng thái
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tên Giải Chạy</label>
                    <input
                      type="text"
                      value={eventForm.title}
                      onChange={(e) => onChangeEventForm({ ...eventForm, title: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Trạng Thái</label>
                    <select
                      value={eventForm.status}
                      onChange={(e) => onChangeEventForm({ ...eventForm, status: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02] font-semibold"
                    >
                      <option value="ACTIVE">ACTIVE (Đang diễn ra)</option>
                      <option value="UPCOMING">UPCOMING (Sắp diễn ra)</option>
                      <option value="DRAFT">DRAFT (Bản nháp)</option>
                      <option value="CLOSED">CLOSED (Đã kết thúc)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Phụ đề &amp; Thông điệp giải
                  </label>
                  <input
                    type="text"
                    value={eventForm.subtitle}
                    onChange={(e) => onChangeEventForm({ ...eventForm, subtitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  2. Thời gian thi đấu &amp; Ngưỡng Pace hợp lệ
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ngày Bắt Đầu</label>
                    <input
                      type="date"
                      value={eventForm.startDateIso}
                      onChange={(e) => onChangeEventForm({ ...eventForm, startDateIso: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ngày Kết Thúc</label>
                    <input
                      type="date"
                      value={eventForm.endDateIso}
                      onChange={(e) => onChangeEventForm({ ...eventForm, endDateIso: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Pace Tối Thiểu (Min Pace)
                    </label>
                    <input
                      type="text"
                      value={eventForm.minPaceFormatted}
                      onChange={(e) => onChangeEventForm({ ...eventForm, minPaceFormatted: e.target.value })}
                      placeholder="03:00"
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                    />
                    <span className="text-[10px] text-slate-400">Nhanh hơn ngưỡng này bị cắt đoạn</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Pace Tối Đa (Max Pace)
                    </label>
                    <input
                      type="text"
                      value={eventForm.maxPaceFormatted}
                      onChange={(e) => onChangeEventForm({ ...eventForm, maxPaceFormatted: e.target.value })}
                      placeholder="15:00"
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                    />
                    <span className="text-[10px] text-slate-400">Chậm hơn ngưỡng này bị loại</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Cự ly tối thiểu mỗi buổi chạy (KM)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={eventForm.minActivityDistanceKm}
                      onChange={(e) =>
                        onChangeEventForm({ ...eventForm, minActivityDistanceKm: parseFloat(e.target.value) || 1.0 })
                      }
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Hệ số nhân cuối tuần (Thứ 7 &amp; Chủ Nhật)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="2.0"
                      value={eventForm.weekendMultiplier}
                      onChange={(e) =>
                        onChangeEventForm({ ...eventForm, weekendMultiplier: parseFloat(e.target.value) || 1.0 })
                      }
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>3. Các Mốc Thử Thách Mở Rộng (Challenge Tiers)</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {challengeTiers.length} mốc thử thách đang kích hoạt
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {challengeTiers.map((tier: any) => (
                    <div
                      key={tier.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#FC4C02]/15 text-[#FC4C02] font-bold text-xs flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{tier.tierName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{tier.rewardDescription}</div>
                        <div className="text-[10px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
                          Điều kiện: {tier.conditionType} ({tier.thresholdValue}
                          {tier.conditionType === 'STREAK_DAYS' ? ' ngày' : ' km'})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu &amp; Cập nhật Quy Chế Giải Chạy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: HÀNG ĐỢI KIỂM DUYỆT TỐC ĐỘ & GIAN LẬN GPS */}
      {adminSubTab === 'moderation' && (
        <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-4 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Danh sách hoạt động có cắt đoạn tốc độ bất thường</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Các buổi chạy có km vượt ngưỡng 03:00/km đã được hệ thống tự động tách phần lỗi
            </p>
          </div>

          <div className="space-y-3">
            {flaggedActivities.map((flaggedAct) => (
              <div
                key={flaggedAct.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                      Đã cắt km lỗi
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{flaggedAct.userName}</span>
                    <span className="text-xs text-slate-400">• {flaggedAct.name}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{flaggedAct.flagReasons[0]}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onInspectFlaggedActivity(flaggedAct.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            ))}
            {flaggedActivities.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">
                Không có hoạt động nào bị gắn cờ bất thường trong hệ thống.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: QUẢN LÝ GIAO HÀNG RACE-KIT */}
      {adminSubTab === 'fulfillment' && (
        <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#FC4C02]" />
                <span>Danh sách cấp phát Áo &amp; Huy chương Finisher</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Xuất danh sách vận động viên hoàn thành mục tiêu để gửi đơn vị vận chuyển
              </p>
            </div>

            <button
              type="button"
              onClick={onExportRaceKitCsv}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất file CSV giao hàng</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/70 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-400">
                  <th className="py-3 px-3">Mã BIB</th>
                  <th className="py-3 px-3">Vận động viên</th>
                  <th className="py-3 px-3">Mục tiêu</th>
                  <th className="py-3 px-3">Size áo</th>
                  <th className="py-3 px-3">Khắc tên huy chương</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3">Mã vận đơn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {raceKitOrders.map((ord) => (
                  <tr key={ord.id}>
                    <td className="py-3 px-3 font-mono tabular-nums text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {ord.bibNumber}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{ord.runnerName}</div>
                      <div className="text-xs text-slate-500">{ord.department}</div>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono tabular-nums">
                      <div>{ord.targetName}</div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold">{ord.currentKm} km</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">{ord.shirtSize}</td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-300">{ord.engraving}</td>
                    <td className="py-3 px-3 text-xs font-semibold">{ord.status}</td>
                    <td className="py-3 px-3 font-mono tabular-nums text-xs text-slate-500">
                      {ord.carrier !== '-' ? `${ord.carrier}: ${ord.trackingCode}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

