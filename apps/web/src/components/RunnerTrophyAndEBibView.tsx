'use client';

import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Download,
  Edit3,
  Copy,
  Check,
  Compass,
  Flame,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { roundKm } from '@toprun/shared';
import type { MyEventItem } from './RunnerMyEvents';

export interface TrophyCaseItem {
  participationId: string;
  eventId: string;
  eventTitle: string;
  bibNumber: string;
  eBibSvg?: string;
  isTargetCompleted: boolean;
  eCertSvg?: string | null;
  unlockedChallengeBadges?: any[];
  raceKitOrder?: any;
}

interface RunnerTrophyAndEBibViewProps {
  myEvents: MyEventItem[];
  trophyCase?: TrophyCaseItem[];
  user: any;
  currentEventData?: any;
  onOpenEditBib: (eventId: string, currentBib: string, eventTitle: string) => void;
  onGoToExplore: () => void;
}

export default function RunnerTrophyAndEBibView({
  myEvents,
  trophyCase = [],
  user,
  currentEventData,
  onOpenEditBib,
  onGoToExplore,
}: RunnerTrophyAndEBibViewProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    return myEvents[0]?.id || trophyCase[0]?.eventId || '';
  });
  const [isCopiedBib, setIsCopiedBib] = useState(false);

  // Sync selected event if list updates
  React.useEffect(() => {
    if (!selectedEventId && myEvents.length > 0) {
      setSelectedEventId(myEvents[0].id);
    }
  }, [myEvents, selectedEventId]);

  // Selected event meta
  const activeMyEvent = useMemo(() => {
    return myEvents.find((e) => e.id === selectedEventId) || myEvents[0];
  }, [myEvents, selectedEventId]);

  const activeTrophyItem = useMemo(() => {
    return trophyCase.find((t) => t.eventId === (activeMyEvent?.id || selectedEventId));
  }, [trophyCase, activeMyEvent, selectedEventId]);

  const handleCopyBib = () => {
    const bib = activeMyEvent?.myBibNumber || activeTrophyItem?.bibNumber;
    if (!bib) return;
    navigator.clipboard?.writeText(bib);
    setIsCopiedBib(true);
    setTimeout(() => setIsCopiedBib(false), 2000);
  };

  const handleDownloadSvg = (svgContent: string, filename: string) => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (myEvents.length === 0 && trophyCase.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-8 sm:p-12 text-center shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#FC4C02]/10 text-[#FC4C02] mx-auto flex items-center justify-center">
          <Award className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Bạn chưa có E-BIB hoặc Chứng nhận nào
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Số báo danh điện tử (E-BIB) độc bản và Giấy chứng nhận hoàn thành (E-Certificate) sẽ được phát hành tự động cho từng giải đấu bạn tham gia.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToExplore}
          className="px-5 py-2.5 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
        >
          <Compass className="w-4 h-4" />
          <span>Khám phá các giải đang mở để nhận E-BIB</span>
        </button>
      </div>
    );
  }

  const currentBibNumber = activeMyEvent?.myBibNumber || activeTrophyItem?.bibNumber || 'TOP-2026';
  const currentTargetKm = activeMyEvent?.myTargetKm || 50;
  const currentTotalValidKm = activeMyEvent?.myTotalValidKm || 0;
  const isCompleted = activeTrophyItem?.isTargetCompleted || currentTotalValidKm >= currentTargetKm;
  const rawSvg = activeTrophyItem?.eBibSvg;

  return (
    <div className="space-y-6">
      {/* Race Selector Header (when user has multiple events) */}
      {myEvents.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Trophy className="w-4 h-4 text-[#FC4C02]" />
            <span>Chọn giải đấu để xem E-BIB:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {myEvents.map((ev) => {
              const isSelected = (activeMyEvent?.id || selectedEventId) === ev.id;
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setSelectedEventId(ev.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#FC4C02] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="max-w-[140px] truncate">{ev.title}</span>
                  <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/20">
                    {ev.myBibNumber}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: E-BIB & E-Certificate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Modern E-BIB Card */}
        <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#FC4C02]" />
                <span>Số Báo Danh Điện Tử (E-BIB)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                {activeMyEvent?.title || activeTrophyItem?.eventTitle || 'Giải chạy chính thức'}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onOpenEditBib(
                    activeMyEvent?.id || selectedEventId,
                    currentBibNumber,
                    activeMyEvent?.title || 'Giải đấu'
                  )
                }
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition cursor-pointer"
                title="Đổi số BIB của bạn"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#FC4C02]" />
                <span>Đổi số BIB</span>
              </button>
            </div>
          </div>

          {/* E-BIB Graphic Visual */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#0A0E17] shadow-lg relative group">
            {rawSvg ? (
              <div
                className="w-full aspect-[840/520] select-none"
                dangerouslySetInnerHTML={{ __html: rawSvg }}
              />
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="bg-gradient-to-r from-[#FC4C02] to-amber-500 py-2.5 px-4 rounded-xl shadow-md">
                  <div className="text-[11px] font-black tracking-widest text-white uppercase">
                    {activeMyEvent?.title || 'TOPRUN VIRTUAL RACE 2026'}
                  </div>
                  <div className="text-[10px] font-bold text-white/90">
                    HẠNG MỤC MỤC TIÊU {currentTargetKm}KM
                  </div>
                </div>

                <div className="py-4">
                  <div className="text-5xl sm:text-6xl font-black tracking-widest text-white font-mono drop-shadow-md">
                    {currentBibNumber}
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-700 pt-3">
                  <div className="text-lg font-black text-cyan-400 tracking-wider">
                    {user?.fullName?.toUpperCase() || 'VẬN ĐỘNG VIÊN'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {user?.departmentOrUnit?.toUpperCase() || 'TOPRUN ATHLETE • STRAVA VERIFIED'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions Toolbar for E-BIB */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyBib}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {isCopiedBib ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedBib ? 'Đã chép số BIB' : 'Chép số BIB'}</span>
              </button>
            </div>

            {rawSvg && (
              <button
                type="button"
                onClick={() =>
                  handleDownloadSvg(
                    rawSvg,
                    `EBIB-${currentBibNumber}-${activeMyEvent?.id || 'race'}.svg`
                  )
                }
                className="px-4 py-1.5 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải E-BIB (SVG sắc nét)</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Finisher E-Certificate Card */}
        <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Chứng Nhận Hoàn Thành (E-Certificate)</span>
            </h2>

            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                isCompleted
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
              }`}
            >
              {isCompleted ? `Đã hoàn thành ${currentTargetKm}KM` : 'Đang tích lũy'}
            </span>
          </div>

          {activeTrophyItem?.eCertSvg ? (
            <div className="space-y-4">
              <div
                className="w-full aspect-[840/594] rounded-2xl overflow-hidden border border-amber-500/30 shadow-lg select-none"
                dangerouslySetInnerHTML={{ __html: activeTrophyItem.eCertSvg }}
              />
              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadSvg(
                      activeTrophyItem.eCertSvg!,
                      `ECertificate-${currentBibNumber}.svg`
                    )
                  }
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Chứng Nhận (SVG)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#0C101B] p-6 text-center space-y-5">
              <div className="text-[11px] font-bold tracking-[0.2em] text-amber-400 uppercase">
                OFFICIAL FINISHER CERTIFICATE
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                {activeMyEvent?.title || 'TOPRUN VIRTUAL RACE'}
              </h3>
              <p className="text-xs text-slate-400">
                Chứng nhận VĐV mang số BIB <strong className="text-white font-mono">{currentBibNumber}</strong>
              </p>
              <div className="text-xl sm:text-2xl font-black text-amber-400">
                {user?.fullName?.toUpperCase() || 'VẬN ĐỘNG VIÊN'}
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Cự ly mục tiêu</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">{currentTargetKm} KM</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Đã tích lũy</div>
                  <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                    {roundKm(currentTotalValidKm)} KM ({Math.min(100, Math.round((currentTotalValidKm / currentTargetKm) * 100))}%)
                  </div>
                </div>
              </div>

              {!isCompleted && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                  <div className="font-bold">⚡ Tiếp tục chạy để mở khóa Chứng nhận!</div>
                  <div className="text-[11px] text-slate-400">
                    Cần thêm {roundKm(Math.max(0, currentTargetKm - currentTotalValidKm))} km để hoàn thành mục tiêu và mở khóa bản tải chứng nhận chính thức.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

