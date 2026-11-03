'use client';

import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Search,
  Calendar,
  Users,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Check,
  Award,
} from 'lucide-react';
import { EventStatus, EventType, formatPace } from '@toprun/shared';

export interface ExploreEventItem {
  id: string;
  title: string;
  description: string;
  status: string;
  eventType: string;
  startDateIso: string;
  endDateIso: string;
  categories?: Array<{ name: string; targetDistanceKm: number; bibPrefix: string }>;
  challengeTiers?: Array<{ tierName: string; requiredValue: number }>;
  ruleConfig?: any;
  participantsCount?: number;
  participants?: any[];
}

interface RunnerExploreEventsProps {
  eventsList: ExploreEventItem[];
  joinedEventIds: Set<string>;
  onSelectEvent: (eventId: string) => void;
  onOpenRegister: (event: ExploreEventItem) => void;
}

export default function RunnerExploreEvents({
  eventsList,
  joinedEventIds,
  onSelectEvent,
  onOpenRegister,
}: RunnerExploreEventsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING'>('ALL');

  const filteredEvents = useMemo(() => {
    return eventsList.filter((ev) => {
      // Don't show drafts or cancelled in runner discovery
      if (ev.status === EventStatus.DRAFT || ev.status === EventStatus.CANCELLED) {
        return false;
      }
      const matchSearch =
        ev.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || ev.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [eventsList, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#FC4C02]" />
            <span>Khám Phá Các Giải Chạy Ảo &amp; Thử Thách</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tìm kiếm giải đấu phù hợp với cự ly mục tiêu của bạn, đăng ký nhận BIB và thi đua cùng cộng đồng runner
          </p>
        </div>

        {/* Filter & Search Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm giải chạy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1420] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
            />
          </div>

          <div className="flex items-center gap-1 bg-white dark:bg-[#0F1420] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {(['ALL', 'ACTIVE', 'UPCOMING'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#FC4C02] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'Tất cả' : st === 'ACTIVE' ? 'Đang diễn ra' : 'Sắp diễn ra'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Events */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-12 text-center text-slate-400 space-y-2">
          <Trophy className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-semibold">Không tìm thấy giải đấu phù hợp.</p>
          <p className="text-xs">Vui lòng thử tìm kiếm với từ khóa khác.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((ev) => {
            const isJoined = joinedEventIds.has(ev.id);
            const partCount = ev.participantsCount || (ev.participants ? ev.participants.length : 0);

            return (
              <div
                key={ev.id}
                className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-[#FC4C02]/40 transition flex flex-col justify-between overflow-hidden group"
              >
                {/* Visual Banner */}
                <div className="relative h-32 bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 p-4 flex flex-col justify-between text-white overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-15 translate-x-4 translate-y-4 group-hover:scale-110 transition duration-500 pointer-events-none">
                    <Trophy className="w-36 h-36" />
                  </div>

                  <div className="flex items-center justify-between z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-xs text-white">
                      {ev.eventType === EventType.VIRTUAL_RACE ? 'Giải chạy chính thức' : 'Thử thách ảo'}
                    </span>

                    {ev.status === EventStatus.ACTIVE ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Đang mở
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-white">
                        <Clock className="w-3 h-3" />
                        Sắp mở
                      </span>
                    )}
                  </div>

                  <div className="z-10">
                    <h4 className="font-black text-sm text-white line-clamp-1 group-hover:text-amber-300 transition">
                      {ev.title}
                    </h4>
                    <div className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>
                        {ev.startDateIso ? new Date(ev.startDateIso).toLocaleDateString('vi-VN') : ''} -{' '}
                        {ev.endDateIso ? new Date(ev.endDateIso).toLocaleDateString('vi-VN') : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {ev.description || 'Giải chạy tích luỹ km trực tuyến mở cho tất cả runner đam mê.'}
                    </p>

                    {/* Rule highlights */}
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {ev.ruleConfig?.weekendMultiplier > 1 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-[#FC4C02]/10 text-[#FC4C02]">
                          <Flame className="w-3 h-3" />
                          x{ev.ruleConfig.weekendMultiplier} Cuối tuần
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Pace {ev.ruleConfig?.minPaceSecPerKm ? formatPace(ev.ruleConfig.minPaceSecPerKm) : '03:00'} - {ev.ruleConfig?.maxPaceSecPerKm ? formatPace(ev.ruleConfig.maxPaceSecPerKm) : '15:00'}
                      </span>
                    </div>

                    {/* Target Categories */}
                    {ev.categories && ev.categories.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Các cự ly đăng ký:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {ev.categories.map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-mono"
                            >
                              {c.targetDistanceKm}km
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Meta & Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                          {partCount}
                        </span>{' '}
                        VĐV tham gia
                      </span>

                      {isJoined && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Đã đăng ký
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectEvent(ev.id)}
                        className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition text-center cursor-pointer"
                      >
                        Chi tiết giải
                      </button>

                      {isJoined ? (
                        <button
                          type="button"
                          onClick={() => onSelectEvent(ev.id)}
                          className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Xem BXH</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenRegister(ev)}
                          className="py-2 px-3 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                        >
                          <span>Đăng ký</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

