'use client';

import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Flame,
  Settings,
  ShieldCheck,
  Target,
  Truck,
} from 'lucide-react';
import { formatPace, roundKm } from '@toprun/shared';

interface TournamentHeroAndTier1CardProps {
  currentEventData: any;
  dualGoalProgress: any;
  myBibNumber: string;
  myTargetKm: number;
  myShirtSize: string;
  onOpenRegisterModal: () => void;
  onOpenEBibModal: () => void;
  onQuickChangeTargetCategory?: (categoryId: string, targetDistanceKm: number) => Promise<void> | void;
}

export default function TournamentHeroAndTier1Card({
  currentEventData,
  dualGoalProgress,
  myBibNumber,
  myTargetKm,
  myShirtSize,
  onOpenRegisterModal,
  onOpenEBibModal,
  onQuickChangeTargetCategory,
}: TournamentHeroAndTier1CardProps) {
  const [showRules, setShowRules] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [isSavingTarget, setIsSavingTarget] = useState(false);

  const target = dualGoalProgress?.target || {
    categoryName: `Mục tiêu ${myTargetKm}KM`,
    targetDistanceKm: myTargetKm,
    currentMultipliedDistanceKm: 0,
    currentRawDistanceKm: 0,
    progressPercentage: 0,
    remainingDistanceKm: myTargetKm,
    isCompleted: false,
    eCertUnlocked: false,
    raceKitQualified: false,
  };

  const sb = dualGoalProgress?.sportBreakdown || {
    runKm: target.currentMultipliedDistanceKm || 0,
    rideRawKm: 0,
    rideConvertedKm: 0,
    swimRawKm: 0,
    swimConvertedKm: 0,
  };

  const categories: Array<{ id: string; name: string; targetDistanceKm: number }> =
    Array.isArray(currentEventData?.categories) && currentEventData.categories.length > 0
      ? currentEventData.categories
      : [
          { id: 'cat_50', name: '50KM', targetDistanceKm: 50 },
          { id: 'cat_100', name: '100KM', targetDistanceKm: 100 },
          { id: 'cat_150', name: '150KM', targetDistanceKm: 150 },
        ];

  const handleSelectCategory = async (cat: { id: string; name: string; targetDistanceKm: number }) => {
    if (!onQuickChangeTargetCategory) {
      onOpenRegisterModal();
      return;
    }
    try {
      setIsSavingTarget(true);
      await onQuickChangeTargetCategory(cat.id, cat.targetDistanceKm);
      setIsEditingTarget(false);
    } finally {
      setIsSavingTarget(false);
    }
  };

  const startDateStr = currentEventData?.startDateIso
    ? new Date(currentEventData.startDateIso).toLocaleDateString('vi-VN')
    : '';
  const endDateStr = currentEventData?.endDateIso
    ? new Date(currentEventData.endDateIso).toLocaleDateString('vi-VN')
    : '';

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm space-y-4">
      {/* =====================================================================
          ROW 1: EVENT HEADER + 3 ACTION BUTTONS (ĐỔI CỰ LY/SIZE, XEM E-BIB, QUY TẮC)
         ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {currentEventData?.status === 'ACTIVE'
                ? 'Đang diễn ra'
                : currentEventData?.status === 'UPCOMING'
                ? 'Sắp diễn ra'
                : 'Bản nháp'}
            </span>

            {(startDateStr || endDateStr) && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-[#FC4C02]" />
                <span>
                  {startDateStr} – {endDateStr}
                </span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-[#FC4C02]">
              BIB: {myBibNumber}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
            {currentEventData?.title || 'TOPRun Virtual Race 2026'}
          </h2>
        </div>

        {/* 3 Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenRegisterModal}
            className="px-3.5 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Đổi cự ly / Size áo</span>
          </button>

          <button
            type="button"
            onClick={onOpenEBibModal}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 text-[#FC4C02]" />
            <span>Xem E-BIB ({myBibNumber})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRules((prev) => !prev)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              showRules
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#FC4C02]" />
            <span>Quy tắc</span>
            {showRules ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* =====================================================================
          COLLAPSIBLE RULES DRAWER (HIDDEN BY DEFAULT, TOGGLED BY "QUY TẮC")
         ===================================================================== */}
      {showRules && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FC4C02]/10 text-[#FC4C02]">
              <Flame className="w-3.5 h-3.5" />
              {(currentEventData?.ruleConfig?.weekendMultiplier || 1.0) > 1.0
                ? `Cuối tuần nhân hệ số x${currentEventData.ruleConfig.weekendMultiplier} 🔥`
                : 'Tính điểm 1:1 theo km thực tế'}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Pace hợp lệ: {formatPace(currentEventData?.ruleConfig?.minPaceSecPerKm ?? 180)} –{' '}
              {formatPace(currentEventData?.ruleConfig?.maxPaceSecPerKm ?? 900)} /km
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              Tối thiểu: {currentEventData?.ruleConfig?.minActivityDistanceKm ?? 1.0} km/bài
            </span>

            {currentEventData?.ruleConfig?.enableCrossTrainingConversion && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
                <span>🏊 1km bơi = {currentEventData.ruleConfig.swimToRunRatio ?? 5}km chạy</span>
                <span>•</span>
                <span>
                  🚴 {roundKm(1 / (currentEventData.ruleConfig.rideToRunRatio ?? 0.25))}km đạp = 1km chạy
                </span>
              </span>
            )}
          </div>

          {(currentEventData?.subtitle || currentEventData?.description) && (
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {currentEventData?.description || currentEventData?.subtitle}
            </p>
          )}
        </div>
      )}

      {/* =====================================================================
          ROW 2: COMPACT TIER 1 • MỤC TIÊU FINISHER (WITH CONVERTED KM & QUICK EDIT)
         ===================================================================== */}
      <div className="p-4 rounded-xl bg-slate-50/90 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Left: Tier 1 Title + Quick Target Switcher */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-7 h-7 rounded-lg bg-[#FC4C02]/10 text-[#FC4C02] flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FC4C02]">
                Tầng 1 • Mục tiêu Finisher:
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {target.categoryName || `${target.targetDistanceKm}KM`}
              </span>

              {/* Quick Edit Target Button */}
              <button
                type="button"
                onClick={() => setIsEditingTarget((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#FC4C02] hover:text-[#FC4C02] transition cursor-pointer"
                title="Đổi nhanh mức cự ly mục tiêu (Target)"
              >
                <Edit3 className="w-3 h-3" />
                <span>Sửa Target</span>
              </button>
            </div>
          </div>

          {/* Right: Main Progress Numbers */}
          <div className="flex items-baseline gap-2 sm:justify-end">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {target.currentMultipliedDistanceKm}
            </span>
            <span className="text-xs sm:text-sm font-mono text-slate-500 dark:text-slate-400">
              / {target.targetDistanceKm} km
            </span>
            <span className="ml-1 px-2 py-0.5 rounded-md text-xs font-extrabold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {target.progressPercentage}%
            </span>
          </div>
        </div>

        {/* Inline Quick Target Category Picker (when "Sửa Target" is clicked) */}
        {isEditingTarget && (
          <div className="p-3 rounded-xl bg-white dark:bg-[#0F1420] border border-[#FC4C02]/30 flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-150">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Chọn nhanh mốc Target Finisher mới:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => {
                const isCurrent = Number(cat.targetDistanceKm) === Number(target.targetDistanceKm);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    disabled={isSavingTarget}
                    onClick={() => handleSelectCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                      isCurrent
                        ? 'bg-[#FC4C02] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#FC4C02]/15 hover:text-[#FC4C02]'
                    }`}
                  >
                    {cat.name || `${cat.targetDistanceKm}KM`}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onOpenRegisterModal}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#FC4C02] hover:underline cursor-pointer"
              >
                Tuỳ chỉnh đầy đủ...
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              target.isCompleted ? 'bg-emerald-500' : 'bg-[#FC4C02]'
            }`}
            style={{ width: `${Math.min(100, target.progressPercentage || 0)}%` }}
          />
        </div>

        {/* Compact Single-Line Summary: Raw + Converted Breakdown + Remaining + Perks */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pt-0.5 text-xs">
          {/* Left: Breakdown of Raw & Converted KM */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 dark:text-slate-300">
            <span>
              Quãng đường gốc:{' '}
              <strong className="font-mono text-slate-900 dark:text-white">
                {target.currentRawDistanceKm} km
              </strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="font-mono text-[11px] flex flex-wrap items-center gap-2">
              <span>🏃 Chạy: <strong>{roundKm(sb.runKm || 0)}</strong> km</span>
              {(sb.rideConvertedKm > 0 || currentEventData?.ruleConfig?.enableCrossTrainingConversion) && (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  🚴 Đạp: +{roundKm(sb.rideConvertedKm || 0)} km quy đổi ({roundKm(sb.rideRawKm || 0)} km đạp)
                </span>
              )}
              {(sb.swimConvertedKm > 0 || currentEventData?.ruleConfig?.enableCrossTrainingConversion) && (
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                  🏊 Bơi: +{roundKm(sb.swimConvertedKm || 0)} km quy đổi ({roundKm(sb.swimRawKm || 0)} km bơi)
                </span>
              )}
            </span>
          </div>

          {/* Right: Remaining KM & Finisher Perks */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  target.eCertUnlocked ? 'text-emerald-500' : 'text-slate-400'
                }`}
              />
              <span>E-Cert</span>
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <Truck
                className={`w-3.5 h-3.5 ${
                  target.raceKitQualified ? 'text-emerald-500' : 'text-slate-400'
                }`}
              />
              <span>Áo Size {myShirtSize}</span>
            </span>

            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {target.isCompleted
                ? '🏆 Đã hoàn thành Finisher'
                : `Còn ${target.remainingDistanceKm} km`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
