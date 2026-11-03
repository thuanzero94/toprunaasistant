'use client';

import React from 'react';
import {
  Trophy,
  Award,
  Calendar,
  Flame,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Users,
} from 'lucide-react';
import { EventStatus, formatPace, roundKm } from '@toprun/shared';

export interface MyEventItem {
  id: string;
  title: string;
  status: string;
  startDateIso: string;
  endDateIso: string;
  myBibNumber?: string;
  myTargetKm: number;
  myTotalValidKm: number;
  myProgressPercent: number;
  myRank?: number;
  myChallengeTier?: string;
  ruleConfig?: any;
  totalParticipants?: number;
}

interface RunnerMyEventsProps {
  myEvents: MyEventItem[];
  onSelectEvent: (eventId: string) => void;
  onGoToExplore: () => void;
  onOpenEBib?: (eventId: string) => void;
}

export default function RunnerMyEvents({
  myEvents,
  onSelectEvent,
  onGoToExplore,
  onOpenEBib,
}: RunnerMyEventsProps) {
  const [subTab, setSubTab] = React.useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');

  const activeMyEvents = React.useMemo(() => {
    return myEvents.filter((e) => e.status !== EventStatus.COMPLETED);
  }, [myEvents]);

  const completedMyEvents = React.useMemo(() => {
    return myEvents.filter((e) => e.status === EventStatus.COMPLETED);
  }, [myEvents]);

  const displayedEvents = subTab === 'ACTIVE' ? activeMyEvents : completedMyEvents;

  if (myEvents.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-8 sm:p-12 text-center shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#FC4C02]/10 text-[#FC4C02] mx-auto flex items-center justify-center">
          <Compass className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Bạn chưa đăng ký tham gia giải đấu nào
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hãy khám phá các giải chạy ảo và thử thách cộng đồng đang mở để đăng ký, nhận số BIB cá nhân độc bản và bắt đầu tích lũy km!
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToExplore}
          className="px-5 py-2.5 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
        >
          <Compass className="w-4 h-4" />
          <span>Khám phá các giải đang mở ngay</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#FC4C02]" />
            <span>Giải Đấu Của Tôi ({myEvents.length})</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Theo dõi tiến độ tích luỹ km, mốc huy hiệu và thứ hạng của bạn trong các giải đang tham gia
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tabs for My Events: Active vs Past */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSubTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'ACTIVE'
                  ? 'bg-white dark:bg-[#0F1420] text-[#FC4C02] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Đang tham gia ({activeMyEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'COMPLETED'
                  ? 'bg-white dark:bg-[#0F1420] text-[#FC4C02] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Lịch sử giải đấu ({completedMyEvents.length})
            </button>
          </div>

          <button
            type="button"
            onClick={onGoToExplore}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#FC4C02]" />
            <span className="hidden sm:inline">Tìm thêm giải</span>
          </button>
        </div>
      </div>

      {displayedEvents.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-8 text-center text-slate-400 space-y-2">
          <Trophy className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-semibold">
            {subTab === 'ACTIVE'
              ? 'Hiện không có giải nào đang trong thời gian thi đấu.'
              : 'Bạn chưa có giải nào trong danh mục đã kết thúc.'}
          </p>
          {subTab === 'ACTIVE' && (
            <button
              type="button"
              onClick={onGoToExplore}
              className="mt-2 px-4 py-2 rounded-xl bg-[#FC4C02] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Đăng ký giải mới ngay</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedEvents.map((ev) => {
            const isFinisher = ev.myTotalValidKm >= ev.myTargetKm;
            const percent = Math.min(
              100,
              Math.round((ev.myTotalValidKm / (ev.myTargetKm || 1)) * 100)
            );

            return (
              <div
                key={ev.id}
                className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm hover:border-[#FC4C02]/50 transition space-y-4"
              >
                {/* Card Top: Title, BIB & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {ev.status === EventStatus.ACTIVE
                          ? 'Đang diễn ra'
                          : ev.status === EventStatus.UPCOMING
                          ? 'Sắp diễn ra'
                          : 'Đã hoàn thành'}
                      </span>
                      {ev.ruleConfig?.weekendMultiplier > 1 && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FC4C02]/10 text-[#FC4C02]">
                          <Flame className="w-3 h-3" />
                          x{ev.ruleConfig.weekendMultiplier} cuối tuần
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {ev.title}
                    </h4>
                  </div>

                  {ev.myBibNumber && (
                    <button
                      type="button"
                      onClick={() => onOpenEBib && onOpenEBib(ev.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#FC4C02]/10 text-[#FC4C02] border border-[#FC4C02]/20 hover:bg-[#FC4C02]/20 shrink-0 transition cursor-pointer"
                      title="Bấm để xem E-BIB và tuỳ chỉnh số BIB"
                    >
                      BIB {ev.myBibNumber}
                    </button>
                  )}
                </div>

                {/* Progress & Target */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-semibold text-slate-600 dark:text-slate-300">
                      Tiến độ:{' '}
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {roundKm(ev.myTotalValidKm)}
                      </span>{' '}
                      / {ev.myTargetKm} km
                    </div>
                    <div className="font-bold text-[#FC4C02] tabular-nums">
                      {percent}% {isFinisher ? '🎉 Finisher' : ''}
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFinisher
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-[#FC4C02] to-amber-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Metric Footers */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Thứ hạng</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {ev.myRank ? `#${ev.myRank}` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Huy hiệu</span>
                    <span className="font-bold text-amber-500 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      <span>{ev.myChallengeTier || 'Chưa đạt'}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Quy mô</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      {ev.totalParticipants || 0} VĐV
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectEvent(ev.id)}
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <span>Vào chi tiết giải</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenEBib && onOpenEBib(ev.id)}
                    className="py-2 px-3 rounded-xl bg-[#FC4C02]/10 hover:bg-[#FC4C02] text-[#FC4C02] hover:text-white border border-[#FC4C02]/20 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <span>Xem E-BIB</span>
                    <Trophy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

