'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Compass,
  Download,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  Trophy,
  Truck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { AntiCheatStatus } from '@toprun/shared';
import type { TracklogActivityItem } from './UserTracklogExplorer';
import AdminTournamentsTable from './AdminTournamentsTable';
import AdminStravaPoolManagement from './AdminStravaPoolManagement';
import AthleteAvatar, { AthleteHonorPill } from './AthleteAvatar';

export interface AdminCategoryItem {
  id?: string;
  name: string;
  targetDistanceKm: number;
  bibPrefix?: string;
}

export interface AdminChallengeTierItem {
  id?: string;
  tierCode?: string;
  tierName: string;
  tierLevel: string;
  conditionType: string;
  thresholdValue: number;
  targetSpeedDistanceKm?: number;
  targetSpeedPaceFormatted?: string;
  rewardDescription: string;
}

export interface AdminEventFormState {
  title: string;
  subtitle: string;
  status: string;
  description?: string;
  bibPrefix?: string;
  startDateIso: string;
  endDateIso: string;
  minPaceFormatted: string;
  maxPaceFormatted: string;
  minActivityDistanceKm: number;
  weekendMultiplier: number;
  enableCrossTrainingConversion?: boolean;
  rideToRunRatio?: number;
  swimToRunRatio?: number;
  allowSplitFiltering?: boolean;
  categories?: AdminCategoryItem[];
  challengeTiers?: AdminChallengeTierItem[];
}

function formatPaceMinSec(sec: number): string {
  if (!sec || isNaN(sec) || sec <= 0) return '05:00';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parsePaceMinSec(str: string): number {
  if (!str) return 300;
  if (str.includes(':')) {
    const parts = str.split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }
  const val = parseFloat(str) || 5;
  return Math.round(val * 60);
}

interface AdminManagementPortalProps {
  currentUserId: string;
  adminSubTab: 'users' | 'races' | 'moderation' | 'fulfillment' | 'strava-pool';
  onChangeSubTab: (tab: 'users' | 'races' | 'moderation' | 'fulfillment' | 'strava-pool') => void;
  adminUsers: any[];
  isAdminUsersLoading: boolean;
  adminUserSearch: string;
  onChangeUserSearch: (q: string) => void;
  adminUserActionMsg: string | null;
  onRefreshUsers: () => void;
  onUpdateUserRole: (userId: string, newRole: string) => void;
  onUpdateUserHonorBadge?: (userId: string, honorBadge: string | null) => void;
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
  onDeleteEvent?: (eventId: string, title: string) => Promise<boolean | void> | void;
  onViewRunnerDetail?: (eventId: string) => void;
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
  onUpdateUserHonorBadge,
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
  onDeleteEvent,
  onViewRunnerDetail,
}: AdminManagementPortalProps) {
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<string | null>(null);
  const [raceViewMode, setRaceViewMode] = useState<'list' | 'edit'>('list');
  const [deleteNoticeModal, setDeleteNoticeModal] = useState<{ title: string; count: number } | null>(null);
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<{ id: string; title: string } | null>(null);
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
            { id: 'strava-pool' as const, label: 'Strava API Pool', icon: Layers },
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
                    <th className="py-3 px-3">Danh hiệu VIP</th>
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
                            <div className="flex items-center gap-3">
                              <div className="shrink-0 my-1">
                                <AthleteAvatar
                                  user={u}
                                  size="sm"
                                  showBadge={true}
                                  showWings={true}
                                  showSharkCrown={true}
                                />
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                  <span>{u.fullName || 'Chưa cập nhật tên'}</span>
                                  <AthleteHonorPill user={u} />
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
                          <td className="py-3 px-3">
                            <select
                              value={u.honorBadge || ''}
                              onChange={(e) => onUpdateUserHonorBadge && onUpdateUserHonorBadge(u.id, e.target.value || null)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                u.honorBadge === 'ANGEL_INVESTOR'
                                  ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 font-black shadow-xs shadow-cyan-500/20'
                                  : u.honorBadge === 'FOUNDER'
                                  ? 'bg-amber-950/60 border-amber-400 text-amber-300 font-black'
                                  : u.honorBadge === 'ELITE_ATHLETE'
                                  ? 'bg-rose-950/60 border-rose-400 text-rose-300 font-bold'
                                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <option value="">-- Mặc định --</option>
                              <option value="ANGEL_INVESTOR">🦈 Shark Angel Investor 💎</option>
                              <option value="FOUNDER">🚀 Founder &amp; Architect</option>
                              <option value="VIP_PATRON">⭐ Nhà tài trợ VIP</option>
                              <option value="ELITE_ATHLETE">⚡ VĐV Đỉnh cao (Elite)</option>
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

          {raceViewMode === 'list' ? (
            <AdminTournamentsTable
              eventsList={eventsList}
              selectedEventId={selectedEventId}
              onSelectEvent={onSelectEventId}
              onEditEvent={(eventId) => {
                onSelectEventId(eventId);
                setRaceViewMode('edit');
              }}
              onDeleteEvent={(eventId, title, count) => {
                if (count > 0) {
                  setDeleteNoticeModal({ title, count });
                } else {
                  setPendingDeleteEvent({ id: eventId, title });
                }
              }}
              onOpenCreateModal={onOpenCreateEventModal}
              onViewRunnerDetail={onViewRunnerDetail}
            />
          ) : (
            <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setRaceViewMode('list')}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition cursor-pointer mb-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Quay lại Danh Sách Tất Cả Giải</span>
                  </button>

                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#FC4C02]" />
                    <span>Cấu hình Quy chế Giải Chạy &amp; Thử thách ảo (Virtual Race)</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1">
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

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tiền tố số BIB của giải
                    </label>
                    <input
                      type="text"
                      value={eventForm.bibPrefix || 'PRO-'}
                      onChange={(e) =>
                        onChangeEventForm({ ...eventForm, bibPrefix: e.target.value.toUpperCase() })
                      }
                      placeholder="PRO-"
                      className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[#FC4C02] focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                    />
                  </div>
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

                {/* 2B. CẤU HÌNH QUY ĐỔI CHÉO BỘ MÔN (ĐẠP XE / BƠI -> CHẠY) */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>Quy đổi chéo bộ môn (Đạp xe / Bơi lội sang KM Chạy)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                          Tuỳ chọn giải
                        </span>
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Cho phép vận động viên đạp xe hoặc bơi lội quy đổi sang cự ly Target của giải chạy.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(eventForm.enableCrossTrainingConversion)}
                        onChange={(e) =>
                          onChangeEventForm({
                            ...eventForm,
                            enableCrossTrainingConversion: e.target.checked,
                            rideToRunRatio: eventForm.rideToRunRatio ?? 0.25,
                            swimToRunRatio: eventForm.swimToRunRatio ?? 5.0,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FC4C02]" />
                    </label>
                  </div>

                  {eventForm.enableCrossTrainingConversion && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-800/40 animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          🚴 Hệ số Đạp xe sang Chạy (Mặc định: 0.25)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="2.0"
                          value={eventForm.rideToRunRatio ?? 0.25}
                          onChange={(e) =>
                            onChangeEventForm({
                              ...eventForm,
                              rideToRunRatio: parseFloat(e.target.value) || 0.25,
                            })
                          }
                          className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                        />
                        <span className="text-[10px] text-slate-400 block">
                          Tỷ lệ: 1 km đạp = {eventForm.rideToRunRatio ?? 0.25} km chạy (hoặc {(1 / (eventForm.rideToRunRatio || 0.25)).toFixed(0)} km đạp = 1 km chạy)
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          🏊 Hệ số Bơi lội sang Chạy (Mặc định: 5.0)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="20.0"
                          value={eventForm.swimToRunRatio ?? 5.0}
                          onChange={(e) =>
                            onChangeEventForm({
                              ...eventForm,
                              swimToRunRatio: parseFloat(e.target.value) || 5.0,
                            })
                          }
                          className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                        />
                        <span className="text-[10px] text-slate-400 block">
                          Tỷ lệ: 1 km bơi = {eventForm.swimToRunRatio ?? 5.0} km chạy
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. CẤU HÌNH CÁC CỰ LY MỤC TIÊU TARGET */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      3. Cấu hình Các Tuỳ Chọn Cự Ly Mục Tiêu (Target Categories)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      VĐV khi đăng ký tham gia sẽ được chọn 1 trong các mốc cự ly này để hoàn thành nhận E-BIB &amp; Finisher Medal
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const cats = eventForm.categories || [
                        { name: 'Mốc Target 21KM', targetDistanceKm: 21 },
                        { name: 'Mốc Target 42KM', targetDistanceKm: 42 },
                      ];
                      const nextKm = cats.length > 0 ? cats[cats.length - 1].targetDistanceKm + 10 : 21;
                      onChangeEventForm({
                        ...eventForm,
                        categories: [
                          ...cats,
                          {
                            name: `Mốc Target ${nextKm}KM`,
                            targetDistanceKm: nextKm,
                          },
                        ],
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl border border-dashed border-[#FC4C02] text-[#FC4C02] hover:bg-[#FC4C02]/10 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm cự ly Target</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {(
                    eventForm.categories || [
                      { name: 'Mốc Target 21KM (Starter)', targetDistanceKm: 21 },
                      { name: 'Mốc Target 42KM (Marathoner)', targetDistanceKm: 42 },
                      { name: 'Mốc Target 50KM (Ultra)', targetDistanceKm: 50 },
                    ]
                  ).map((cat, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Tên hạng mục</label>
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => {
                              const cats = [...(eventForm.categories || [])];
                              cats[idx] = { ...cats[idx], name: e.target.value };
                              onChangeEventForm({ ...eventForm, categories: cats });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Cự ly Target (km)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={cat.targetDistanceKm}
                            onChange={(e) => {
                              const cats = [...(eventForm.categories || [])];
                              cats[idx] = { ...cats[idx], targetDistanceKm: parseFloat(e.target.value) || 0 };
                              onChangeEventForm({ ...eventForm, categories: cats });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const cats = (eventForm.categories || []).filter((_, i) => i !== idx);
                          onChangeEventForm({ ...eventForm, categories: cats });
                        }}
                        title="Xoá cự ly"
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer self-end sm:self-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. CẤU HÌNH CÁC MỐC THỬ THÁCH VÀ SPECIAL CHALLENGE */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      4. Cấu hình Thử Thách Mở Rộng &amp; Giải Tốc Độ (Challenge Tiers)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Tùy biến mốc vượt ngưỡng km, chuỗi ngày liên tục hoặc thử thách tốc độ khớp cự ly theo thời gian
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const tiers = eventForm.challengeTiers || challengeTiers;
                        const newTier: AdminChallengeTierItem = {
                          tierCode: `SPEED_${Date.now()}`,
                          tierName: '⚡ Thử thách Tốc độ 5KM',
                          tierLevel: 'SPECIAL',
                          conditionType: 'SPEED_TARGET_TIME',
                          targetSpeedDistanceKm: 5,
                          thresholdValue: 25,
                          rewardDescription: 'Khớp số 5KM trong thời gian <= 25 phút',
                        };
                        onChangeEventForm({ ...eventForm, challengeTiers: [...tiers, newTier] });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-300/60 dark:border-amber-700/60 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>+ Thêm Giải Tốc Độ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const tiers = eventForm.challengeTiers || challengeTiers;
                        const newTier: AdminChallengeTierItem = {
                          tierCode: `TIER_${Date.now()}`,
                          tierName: 'Mốc Thử Thách Mới',
                          tierLevel: 'SILVER',
                          conditionType: 'DISTANCE_OVERACHIEVE',
                          thresholdValue: 100,
                          rewardDescription: 'Vượt mốc tích luỹ km',
                        };
                        onChangeEventForm({ ...eventForm, challengeTiers: [...tiers, newTier] });
                      }}
                      className="px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Thêm Thử Thách</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {(eventForm.challengeTiers || challengeTiers).map((tier: any, idx: number) => {
                    const isSpeed = tier.conditionType === 'SPEED_TARGET_TIME';

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition ${
                          isSpeed
                            ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${isSpeed ? 'bg-amber-500/20 text-amber-500' : 'bg-[#FC4C02]/10 text-[#FC4C02]'}`}>
                              {isSpeed ? <Zap className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                            </div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {isSpeed ? '⚡ Giải Tốc Độ (Speed Challenge)' : `Thử thách #${idx + 1}`}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const tiers = (eventForm.challengeTiers || challengeTiers).filter((_: any, i: number) => i !== idx);
                              onChangeEventForm({ ...eventForm, challengeTiers: tiers });
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Tên Huy Hiệu</label>
                            <input
                              type="text"
                              value={tier.tierName}
                              onChange={(e) => {
                                const tiers = [...(eventForm.challengeTiers || challengeTiers)];
                                tiers[idx] = { ...tiers[idx], tierName: e.target.value };
                                onChangeEventForm({ ...eventForm, challengeTiers: tiers });
                              }}
                              className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Loại điều kiện</label>
                            <select
                              value={tier.conditionType}
                              onChange={(e) => {
                                const tiers = [...(eventForm.challengeTiers || challengeTiers)];
                                tiers[idx] = { ...tiers[idx], conditionType: e.target.value };
                                onChangeEventForm({ ...eventForm, challengeTiers: tiers });
                              }}
                              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                            >
                              <option value="DISTANCE_OVERACHIEVE">Vượt mốc km mở rộng</option>
                              <option value="STREAK_DAYS">Chạy liên tục N ngày</option>
                              <option value="SINGLE_LONG_RUN">1 buổi chạy dài</option>
                              <option value="ELEVATION_GAIN">Độ cao leo núi (gain m)</option>
                              <option value="TOP_RANK">Top N BXH</option>
                              <option value="SPEED_TARGET_TIME">⚡ Giải Tốc Độ (Khớp km &amp; thời gian)</option>
                            </select>
                          </div>

                          {isSpeed ? (
                            <>
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">
                                  Khớp cự ly (km)
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0.5"
                                  value={tier.targetSpeedDistanceKm || 5}
                                  onChange={(e) => {
                                    const dist = parseFloat(e.target.value) || 1;
                                    const tiers = [...(eventForm.challengeTiers || challengeTiers)];
                                    const currentPaceStr =
                                      tier.targetSpeedPaceFormatted ||
                                      (tier.thresholdValue && tier.targetSpeedDistanceKm
                                        ? formatPaceMinSec(Math.round((tier.thresholdValue * 60) / tier.targetSpeedDistanceKm))
                                        : '05:00');
                                    const paceSec = parsePaceMinSec(currentPaceStr);
                                    const totalTimeSec = Math.round(paceSec * dist);
                                    const totalTimeMin = Math.round((totalTimeSec / 60) * 100) / 100;
                                    const autoDesc = `Chạy cự ly ${dist}km đạt Pace ≤ ${currentPaceStr}/km (Thời gian ≤ ${formatPaceMinSec(totalTimeSec)})`;
                                    tiers[idx] = {
                                      ...tiers[idx],
                                      targetSpeedDistanceKm: dist,
                                      targetSpeedPaceFormatted: currentPaceStr,
                                      thresholdValue: totalTimeMin,
                                      rewardDescription: autoDesc,
                                    };
                                    onChangeEventForm({ ...eventForm, challengeTiers: tiers });
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">
                                  Pace target (phút/km)
                                </label>
                                <input
                                  type="text"
                                  placeholder="04:35"
                                  value={
                                    tier.targetSpeedPaceFormatted ||
                                    (tier.thresholdValue && tier.targetSpeedDistanceKm
                                      ? formatPaceMinSec(Math.round((tier.thresholdValue * 60) / tier.targetSpeedDistanceKm))
                                      : '05:00')
                                  }
                                  onChange={(e) => {
                                    const newPaceStr = e.target.value;
                                    const tiers = [...(eventForm.challengeTiers || challengeTiers)];
                                    const dist = tier.targetSpeedDistanceKm || 5;
                                    const paceSec = parsePaceMinSec(newPaceStr);
                                    const totalTimeSec = Math.round(paceSec * dist);
                                    const totalTimeMin = Math.round((totalTimeSec / 60) * 100) / 100;
                                    const autoDesc = `Chạy cự ly ${dist}km đạt Pace ≤ ${newPaceStr}/km (Thời gian ≤ ${formatPaceMinSec(totalTimeSec)})`;
                                    tiers[idx] = {
                                      ...tiers[idx],
                                      targetSpeedPaceFormatted: newPaceStr,
                                      thresholdValue: totalTimeMin,
                                      rewardDescription: autoDesc,
                                    };
                                    onChangeEventForm({ ...eventForm, challengeTiers: tiers });
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">
                                  Thời gian tối đa (phút)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={tier.thresholdValue}
                                  onChange={(e) => {
                                    const totalTimeMin = parseFloat(e.target.value) || 0;
                                    const tiers = [...(eventForm.challengeTiers || challengeTiers)];
                                    const dist = tier.targetSpeedDistanceKm || 5;
                                    const totalTimeSec = Math.round(totalTimeMin * 60);
                                    const paceSec = dist > 0 ? Math.round(totalTimeSec / dist) : 0;
                                    const newPaceStr = formatPaceMinSec(paceSec);
                                    const autoDesc = `Chạy cự ly ${dist}km đạt Pace ≤ ${newPaceStr}/km (Thời gian ≤ ${formatPaceMinSec(totalTimeSec)})`;
                                    tiers[idx] = {
                                      ...tiers[idx],
                                      thresholdValue: totalTimeMin,
                                      targetSpeedPaceFormatted: newPaceStr,
                                      rewardDescription: autoDesc,
                                    };
                                    onChangeEventForm({ ...eventForm, challengeTiers: tiers });
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase">
                                  Giá trị ngưỡng ({tier.conditionType === 'STREAK_DAYS' ? 'ngày' : 'km'})
                                </label>
                                <input
                                  type="number"
                                  step="1"
                                  value={tier.thresholdValue}
                                  onChange={(e) => {
                                    const tiers = [...(eventForm.challengeTiers || challengeTiers)];
                                    tiers[idx] = { ...tiers[idx], thresholdValue: parseFloat(e.target.value) || 0 };
                                    onChangeEventForm({ ...eventForm, challengeTiers: tiers });
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase">Cấp độ Tier</label>
                                <select
                                  value={tier.tierLevel || 'SILVER'}
                                  onChange={(e) => {
                                    const tiers = [...(eventForm.challengeTiers || challengeTiers)];
                                    tiers[idx] = { ...tiers[idx], tierLevel: e.target.value };
                                    onChangeEventForm({ ...eventForm, challengeTiers: tiers });
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                >
                                  <option value="BRONZE">BRONZE (Đồng)</option>
                                  <option value="SILVER">SILVER (Bạc)</option>
                                  <option value="GOLD">GOLD (Vàng)</option>
                                  <option value="DIAMOND">DIAMOND (Kim Cương)</option>
                                  <option value="SPECIAL">SPECIAL (Đặc Biệt)</option>
                                </select>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="pt-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">
                              Mô tả thử thách &amp; Phần thưởng
                            </label>
                            {isSpeed && (
                              <button
                                type="button"
                                onClick={() => {
                                  const tiers = [...(eventForm.challengeTiers || challengeTiers)];
                                  const dist = tier.targetSpeedDistanceKm || 5;
                                  const totalTimeSec = Math.round(tier.thresholdValue * 60);
                                  const paceFormatted =
                                    tier.targetSpeedPaceFormatted ||
                                    (dist > 0 ? formatPaceMinSec(Math.round(totalTimeSec / dist)) : '05:00');
                                  const autoDesc = `Chạy cự ly ${dist}km đạt Pace ≤ ${paceFormatted}/km (Thời gian ≤ ${formatPaceMinSec(totalTimeSec)})`;
                                  tiers[idx] = { ...tiers[idx], rewardDescription: autoDesc };
                                  onChangeEventForm({ ...eventForm, challengeTiers: tiers });
                                }}
                                className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Tạo lại mô tả tự động</span>
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={tier.rewardDescription}
                            onChange={(e) => {
                              const tiers = [...(eventForm.challengeTiers || challengeTiers)];
                              tiers[idx] = { ...tiers[idx], rewardDescription: e.target.value };
                              onChangeEventForm({ ...eventForm, challengeTiers: tiers });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 mt-1"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRaceViewMode('list')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Hủy &amp; Quay lại danh sách
                </button>

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
        )}

        {/* Dialog Cảnh báo: Chặn xoá giải đã có VĐV */}
        {deleteNoticeModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#0F1420] border border-rose-200 dark:border-rose-900/60 p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Không thể xoá giải đấu!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Giải đấu <span className="font-bold text-slate-900 dark:text-white">"{deleteNoticeModal.title}"</span> hiện đã có <span className="font-bold text-rose-500">{deleteNoticeModal.count} VĐV</span> đăng ký tham gia và có thể đã phát sinh bài chạy tích luỹ.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Để bảo toàn lịch sử thành tích thi đấu, hệ thống không cho phép xoá hoàn toàn. Bạn có thể bấm <span className="font-semibold text-slate-700 dark:text-slate-200">Sửa</span> và chuyển trạng thái giải sang <span className="font-bold text-rose-500">CANCELLED (Đã hủy)</span> hoặc <span className="font-bold text-blue-500">COMPLETED (Đã kết thúc)</span>.
                </p>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteNoticeModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition cursor-pointer"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dialog Xác nhận xoá giải 0 VĐV */}
        {pendingDeleteEvent && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Xác nhận xoá giải đấu vĩnh viễn?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bạn có chắc chắn muốn xoá giải <span className="font-bold text-slate-900 dark:text-white">"{pendingDeleteEvent.title}"</span>? Giải này chưa có VĐV nào đăng ký. Hành động này không thể hoàn tác.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingDeleteEvent(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (onDeleteEvent) {
                      await onDeleteEvent(pendingDeleteEvent.id, pendingDeleteEvent.title);
                    }
                    setPendingDeleteEvent(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Xác nhận xoá
                </button>
              </div>
            </div>
          </div>
        )}
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

      {/* SUB-VIEW 5: QUẢN LÝ STRAVA API POOL & PHÂN BỔ TẢI */}
      {adminSubTab === 'strava-pool' && <AdminStravaPoolManagement />}
    </div>
  );
}

