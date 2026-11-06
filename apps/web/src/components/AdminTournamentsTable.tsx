'use client';

import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Search,
  Filter,
  Plus,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Download,
  Calendar,
  Users,
  Route,
  Flame,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Compass,
} from 'lucide-react';
import { EventStatus, EventType, RunMode, formatPace } from '@toprun/shared';

export interface AdminTournamentsTableProps {
  eventsList: any[];
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  onEditEvent: (eventId: string) => void;
  onCloneEvent?: (eventId: string) => void;
  onDeleteEvent: (eventId: string, title: string, participantCount: number) => void;
  onOpenCreateModal: () => void;
  onViewRunnerDetail?: (eventId: string) => void;
}

export default function AdminTournamentsTable({
  eventsList,
  selectedEventId,
  onSelectEvent,
  onEditEvent,
  onCloneEvent,
  onDeleteEvent,
  onOpenCreateModal,
  onViewRunnerDetail,
}: AdminTournamentsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [inspectEvent, setInspectEvent] = useState<any | null>(null);

  // Stats calculation
  const stats = useMemo(() => {
    const total = eventsList.length;
    const active = eventsList.filter((e) => e.status === EventStatus.ACTIVE).length;
    const upcoming = eventsList.filter((e) => e.status === EventStatus.UPCOMING).length;
    const completed = eventsList.filter((e) => e.status === EventStatus.COMPLETED).length;
    return { total, active, upcoming, completed };
  }, [eventsList]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return eventsList.filter((ev) => {
      const matchSearch =
        ev.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || ev.status === statusFilter;
      const matchType = typeFilter === 'ALL' || ev.eventType === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [eventsList, searchQuery, statusFilter, typeFilter]);

  // Export Events CSV
  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Tên giải đấu',
      'Loại hình',
      'Thể thức',
      'Trạng thái',
      'Ngày bắt đầu',
      'Ngày kết thúc',
      'Pace tối thiểu (s/km)',
      'Pace tối đa (s/km)',
      'Hệ số cuối tuần',
      'Số VĐV đăng ký',
    ];

    const rows = filteredEvents.map((e) => [
      `"${e.id || ''}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${e.eventType || ''}"`,
      `"${e.runMode || ''}"`,
      `"${e.status || ''}"`,
      `"${e.startDateIso ? new Date(e.startDateIso).toLocaleDateString('vi-VN') : ''}"`,
      `"${e.endDateIso ? new Date(e.endDateIso).toLocaleDateString('vi-VN') : ''}"`,
      `"${e.ruleConfig?.minPaceSecPerKm ? formatPace(e.ruleConfig.minPaceSecPerKm) : ''}"`,
      `"${e.ruleConfig?.maxPaceSecPerKm ? formatPace(e.ruleConfig.maxPaceSecPerKm) : ''}"`,
      `"${e.ruleConfig?.weekendMultiplier || 1.0}"`,
      `"${e.participantsCount || e.participants?.length || 0}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TOPRun_DanhSachGiaiDau_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case EventStatus.ACTIVE:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Đang diễn ra
          </span>
        );
      case EventStatus.UPCOMING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            Sắp diễn ra
          </span>
        );
      case EventStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <CheckCircle2 className="w-3 h-3" />
            Đã kết thúc
          </span>
        );
      case EventStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3 h-3" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            Bản nháp
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng giải đấu</span>
            <Trophy className="w-4 h-4 text-[#FC4C02]" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {stats.total}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Đang diễn ra</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {stats.active}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Sắp diễn ra</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {stats.upcoming}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Đã kết thúc</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
            {stats.completed}
          </div>
        </div>
      </div>

      {/* 2. Control Bar: Search, Filters, Actions */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm giải theo tên, mã hoặc slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
          />
        </div>

        {/* Filters & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#FC4C02] cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value={EventStatus.ACTIVE}>Đang diễn ra</option>
            <option value={EventStatus.UPCOMING}>Sắp diễn ra</option>
            <option value={EventStatus.COMPLETED}>Đã kết thúc</option>
            <option value={EventStatus.CANCELLED}>Đã hủy</option>
            <option value={EventStatus.DRAFT}>Bản nháp</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#FC4C02] cursor-pointer"
          >
            <option value="ALL">Tất cả loại hình</option>
            <option value={EventType.VIRTUAL_RACE}>Virtual Race (Chính thức)</option>
            <option value={EventType.MINI_CHALLENGE}>Mini Challenge</option>
          </select>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            title="Xuất dữ liệu giải đấu ra file CSV"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#FC4C02]" />
            <span className="hidden md:inline">Xuất CSV</span>
          </button>

          {/* Create Button */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Giải Mới</span>
          </button>
        </div>
      </div>

      {/* 3. Master Tournament Table */}
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Giải đấu</th>
                <th className="py-3 px-4">Loại hình &amp; Thể thức</th>
                <th className="py-3 px-4">Thời gian thi đấu</th>
                <th className="py-3 px-4 text-center">VĐV tham gia</th>
                <th className="py-3 px-4">Quy chế Pace</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Trophy className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    Không tìm thấy giải đấu nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => {
                  const partCount = ev.participantsCount || (ev.participants ? ev.participants.length : 0);
                  const isSelected = selectedEventId === ev.id;

                  return (
                    <tr
                      key={ev.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-orange-50/30 dark:bg-orange-950/20' : ''
                      }`}
                    >
                      {/* Name & Banner */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FC4C02] to-amber-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                            <Trophy className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white hover:text-[#FC4C02] transition cursor-pointer" onClick={() => setInspectEvent(ev)}>
                              {ev.title}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>Mã: {ev.id}</span>
                              {ev.ruleConfig?.weekendMultiplier > 1 && (
                                <span className="text-[#FC4C02] font-semibold flex items-center gap-0.5">
                                  <Flame className="w-3 h-3" />
                                  x{ev.ruleConfig.weekendMultiplier}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type & Run Mode */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 dark:text-slate-200 font-semibold">
                          {ev.eventType === EventType.VIRTUAL_RACE ? 'Giải chạy ảo' : 'Mini Challenge'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {ev.runMode === RunMode.SINGLE_RUN ? '1 buổi duy nhất' : 'Chạy tích luỹ km'}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {ev.startDateIso ? new Date(ev.startDateIso).toLocaleDateString('vi-VN') : '—'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          đến {ev.endDateIso ? new Date(ev.endDateIso).toLocaleDateString('vi-VN') : '—'}
                        </div>
                      </td>

                      {/* Participants */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className="tabular-nums">{partCount}</span>
                        </div>
                      </td>

                      {/* Rules */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {ev.ruleConfig?.minPaceSecPerKm ? formatPace(ev.ruleConfig.minPaceSecPerKm) : '03:00'}
                          {' - '}
                          {ev.ruleConfig?.maxPaceSecPerKm ? formatPace(ev.ruleConfig.maxPaceSecPerKm) : '15:00'}
                          {' /km'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Min: {ev.ruleConfig?.minActivityDistanceKm || 1.0} km/buổi
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(ev.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Live Runner View (Giống từ Giải của tôi) */}
                          {onViewRunnerDetail && (
                            <button
                              type="button"
                              onClick={() => onViewRunnerDetail(ev.id)}
                              title="Xem view chi tiết giải đấu (Runner Dashboard, BXH & Thống kê)"
                              className="px-2 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <Compass className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">Xem view giải</span>
                            </button>
                          )}

                          {/* View Detail Snapshot */}
                          <button
                            type="button"
                            onClick={() => setInspectEvent(ev)}
                            title="Xem chi tiết tổng quan"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Config */}
                          <button
                            type="button"
                            onClick={() => {
                              onSelectEvent(ev.id);
                              onEditEvent(ev.id);
                            }}
                            title="Chỉnh sửa cấu hình quy chế"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-[#FC4C02] transition cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Clone / Duplicate */}
                          {onCloneEvent && (
                            <button
                              type="button"
                              onClick={() => onCloneEvent(ev.id)}
                              title="Nhân bản cấu hình sang giải mới"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => onDeleteEvent(ev.id, ev.title, partCount)}
                            title={
                              partCount > 0
                                ? 'Không thể xoá giải đã có VĐV đăng ký'
                                : 'Xoá giải đấu'
                            }
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              partCount > 0
                                ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:text-rose-500'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal Snapshot: Xem chi tiết giải đấu */}
      {inspectEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FC4C02]/10 text-[#FC4C02] flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {inspectEvent.title}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Mã giải: {inspectEvent.id}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectEvent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Description */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Mô tả giải đấu
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {inspectEvent.description || 'Chưa có mô tả chi tiết.'}
                </p>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Trạng thái</span>
                  <div className="mt-1">{getStatusBadge(inspectEvent.status)}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">VĐV đăng ký</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                    {inspectEvent.participantsCount || inspectEvent.participants?.length || 0} VĐV
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Pace hợp lệ</span>
                  <div className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-1">
                    {inspectEvent.ruleConfig?.minPaceSecPerKm ? formatPace(inspectEvent.ruleConfig.minPaceSecPerKm) : '03:00'} - {inspectEvent.ruleConfig?.maxPaceSecPerKm ? formatPace(inspectEvent.ruleConfig.maxPaceSecPerKm) : '15:00'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Nhân cuối tuần</span>
                  <div className="text-sm font-bold text-[#FC4C02] mt-1 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    x{inspectEvent.ruleConfig?.weekendMultiplier || 1.0}
                  </div>
                </div>
              </div>

              {/* Categories & Challenge Tiers */}
              {inspectEvent.categories && inspectEvent.categories.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Cự ly mục tiêu Target
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {inspectEvent.categories.map((c: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-[#FC4C02]/10 text-[#FC4C02] border border-[#FC4C02]/20"
                      >
                        {c.name} ({c.targetDistanceKm} km)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {inspectEvent.challengeTiers && inspectEvent.challengeTiers.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Huy hiệu Thử thách Challenge Tiers
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {inspectEvent.challengeTiers.map((tier: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      >
                        <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          <span>{tier.tierName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Yêu cầu: &gt;= {tier.requiredValue} {tier.unit || 'km'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {onViewRunnerDetail && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = inspectEvent.id;
                      setInspectEvent(null);
                      onViewRunnerDetail(id);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Xem view chi tiết giải đấu</span>
                  </button>
                )}

                {onCloneEvent && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = inspectEvent.id;
                      setInspectEvent(null);
                      onCloneEvent(id);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Nhân Bản Giải Này</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setInspectEvent(null);
                    onSelectEvent(inspectEvent.id);
                    onEditEvent(inspectEvent.id);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Mở Form Cấu Hình Giải</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setInspectEvent(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

