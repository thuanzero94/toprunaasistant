'use client';

import React from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Filter,
} from 'lucide-react';

export type DashboardPeriodMode = 'week' | 'month' | 'year' | 'custom' | 'all';
export type DashboardSportFilter = 'all' | 'Run' | 'Ride' | 'Swim' | 'Other';

export interface SportCountSummary {
  all: number;
  Run: number;
  Ride: number;
  Swim: number;
  Other: number;
}

interface DashboardFilterToolbarProps {
  periodMode: DashboardPeriodMode;
  onPeriodModeChange: (mode: DashboardPeriodMode) => void;
  periodOffset: number;
  onPeriodOffsetChange: (nextOffset: number) => void;
  periodLabel: string;
  customStartDate: string;
  customEndDate: string;
  onCustomStartDateChange: (val: string) => void;
  onCustomEndDateChange: (val: string) => void;
  sportFilter: DashboardSportFilter;
  onSportFilterChange: (sport: DashboardSportFilter) => void;
  sportCounts: SportCountSummary;
}

export default function DashboardFilterToolbar({
  periodMode,
  onPeriodModeChange,
  periodOffset,
  onPeriodOffsetChange,
  periodLabel,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
  sportFilter,
  onSportFilterChange,
  sportCounts,
}: DashboardFilterToolbarProps) {
  const sportOptions: Array<{
    id: DashboardSportFilter;
    label: string;
    icon: string;
    count: number;
  }> = [
    { id: 'all', label: 'Tất cả môn', icon: '⚡', count: sportCounts.all },
    { id: 'Run', label: 'Chạy bộ', icon: '🏃', count: sportCounts.Run },
    { id: 'Ride', label: 'Đạp xe', icon: '🚴', count: sportCounts.Ride },
    { id: 'Swim', label: 'Bơi lội', icon: '🏊', count: sportCounts.Swim },
    { id: 'Other', label: 'Các môn còn lại', icon: '🎾', count: sportCounts.Other },
  ];

  const periodOptions: Array<{ id: DashboardPeriodMode; label: string }> = [
    { id: 'week', label: 'Tuần' },
    { id: 'month', label: 'Tháng' },
    { id: 'year', label: 'Năm' },
    { id: 'custom', label: 'Khoảng ngày' },
    { id: 'all', label: 'Toàn bộ' },
  ];

  const navUnitLabel =
    periodMode === 'week' ? 'tuần' : periodMode === 'month' ? 'tháng' : 'năm';

  return (
    <div className="rounded-2xl bg-slate-900/75 border border-slate-800/90 p-3.5 sm:p-4 backdrop-blur-md space-y-3">
      {/* Row 1: Sport Filter Pills (3 bộ môn chính Chạy, Đạp xe, Bơi + Các môn còn lại + Tất cả) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#FC4C02]" />
            <span>Bộ môn:</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {sportOptions.map((sp) => {
              const isActive = sportFilter === sp.id;
              return (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => onSportFilterChange(sp.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
                    isActive
                      ? 'bg-[#FC4C02] text-white font-bold shadow-md shadow-[#FC4C02]/25'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <span>{sp.icon}</span>
                  <span>{sp.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-700/80 text-slate-400'
                    }`}
                  >
                    {sp.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Period Mode Selector Pills */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold">
          {periodOptions.map((p) => {
            const isActive = periodMode === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onPeriodModeChange(p.id);
                  onPeriodOffsetChange(0);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  isActive
                    ? 'bg-[#FC4C02] text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Period Navigator (< Kỳ trước | Nhãn kỳ hiện tại | Kỳ sau >) OR Custom Date Range Inputs */}
      {(periodMode === 'week' || periodMode === 'month' || periodMode === 'year') && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-[#FC4C02]" />
            <span>Kỳ phân tích đang chọn:</span>
            <span className="px-2.5 py-1 rounded-lg bg-[#FC4C02]/15 border border-[#FC4C02]/30 text-[#FC4C02] font-bold font-mono">
              {periodLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPeriodOffsetChange(periodOffset - 1)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
              title={`Chuyển sang ${navUnitLabel} trước`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="capitalize">{navUnitLabel} trước</span>
            </button>

            {periodOffset !== 0 && (
              <button
                type="button"
                onClick={() => onPeriodOffsetChange(0)}
                className="px-2.5 py-1.5 rounded-xl bg-[#FC4C02]/20 hover:bg-[#FC4C02]/30 border border-[#FC4C02]/40 text-[#FC4C02] text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                title={`Quay về ${navUnitLabel} hiện tại`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Hiện tại</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onPeriodOffsetChange(periodOffset + 1)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
              title={`Chuyển sang ${navUnitLabel} sau`}
            >
              <span className="capitalize">{navUnitLabel} sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {periodMode === 'custom' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#FC4C02]" />
              <span>Khoảng ngày cụ thể:</span>
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => onCustomStartDateChange(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-hidden focus:border-[#FC4C02]"
              />
              <span className="text-slate-400">đến</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => onCustomEndDateChange(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-hidden focus:border-[#FC4C02]"
              />
            </div>
          </div>

          <span className="text-[11px] font-mono text-[#FC4C02] font-semibold">
            {periodLabel}
          </span>
        </div>
      )}
    </div>
  );
}
