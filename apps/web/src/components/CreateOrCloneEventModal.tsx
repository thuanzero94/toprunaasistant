'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Copy,
  Sparkles,
  Calendar,
  Sliders,
  Layers,
  Award,
  CheckCircle2,
  X,
  ChevronDown,
  Info,
  Loader2,
  Flame,
  Route,
  RefreshCw,
} from 'lucide-react';
import { EventType, RunMode, EventStatus, ChallengeConditionType, formatPace, parsePaceToSeconds } from '@toprun/shared';

export interface CreateOrCloneEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventsList: any[];
  initialSourceEventId?: string | null;
  onSuccess: (createdEvent: any) => void;
}

export default function CreateOrCloneEventModal({
  isOpen,
  onClose,
  eventsList = [],
  initialSourceEventId = null,
  onSuccess,
}: CreateOrCloneEventModalProps) {
  // Form fields
  const [sourceEventId, setSourceEventId] = useState<string>('');
  const [sourceEventDetails, setSourceEventDetails] = useState<any | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState(false);

  // Modular clone toggles
  const [cloneOptions, setCloneOptions] = useState({
    includeRules: true,
    includeCategories: true,
    includeChallengeTiers: true,
    includeBanner: true,
  });

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [eventType, setEventType] = useState<EventType>(EventType.VIRTUAL_RACE);
  const [runMode, setRunMode] = useState<RunMode>(RunMode.ACCUMULATIVE);
  const [bibPrefix, setBibPrefix] = useState('PRO-');

  // Dates must be picked by organizer (clean slate)
  const [startDateIso, setStartDateIso] = useState('');
  const [endDateIso, setEndDateIso] = useState('');

  // Rules & Pace
  const [minPaceFormatted, setMinPaceFormatted] = useState('03:30');
  const [maxPaceFormatted, setMaxPaceFormatted] = useState('15:00');
  const [weekendMultiplier, setWeekendMultiplier] = useState<number>(1.0);
  const [allowSplitFiltering, setAllowSplitFiltering] = useState(true);

  // Categories & Challenge Tiers
  const [categories, setCategories] = useState<Array<{ name: string; targetDistanceKm: number; bibPrefix?: string }>>([
    { name: 'Mốc Target 21KM (Half Marathon)', targetDistanceKm: 21, bibPrefix: 'TOP21-' },
    { name: 'Mốc Target 42KM (Full Marathon)', targetDistanceKm: 42, bibPrefix: 'TOP42-' },
  ]);

  const [challengeTiers, setChallengeTiers] = useState<
    Array<{
      tierName: string;
      tierLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'SPECIAL';
      conditionType: ChallengeConditionType;
      thresholdValue: number;
      targetSpeedDistanceKm?: number;
      awardBadgeUrl: string;
      rewardDescription: string;
    }>
  >([
    {
      tierName: 'Chiến Binh Bứt Phá (50KM)',
      tierLevel: 'GOLD',
      conditionType: ChallengeConditionType.DISTANCE_OVERACHIEVE,
      thresholdValue: 50,
      awardBadgeUrl: '🏅',
      rewardDescription: 'Huy hiệu Chiến Binh Hoàn Thành Vượt Mốc 50KM',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset to clean default form
  const resetToBlank = () => {
    setSourceEventId('');
    setSourceEventDetails(null);
    setTitle('');
    setSubtitle('');
    setDescription('Giải chạy bộ phong trào trực tuyến trên nền tảng TOPRunAssistant.');
    setBannerUrl('https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?auto=format&fit=crop&w=1200&q=80');
    setEventType(EventType.VIRTUAL_RACE);
    setRunMode(RunMode.ACCUMULATIVE);
    setBibPrefix('PRO-');
    setStartDateIso('');
    setEndDateIso('');
    setMinPaceFormatted('03:30');
    setMaxPaceFormatted('15:00');
    setWeekendMultiplier(1.0);
    setAllowSplitFiltering(true);
    setCategories([
      { name: 'Mốc Target 21KM (Half Marathon)', targetDistanceKm: 21, bibPrefix: 'TOP21-' },
      { name: 'Mốc Target 42KM (Full Marathon)', targetDistanceKm: 42, bibPrefix: 'TOP42-' },
    ]);
    setChallengeTiers([
      {
        tierName: 'Chiến Binh Bứt Phá (50KM)',
        tierLevel: 'GOLD',
        conditionType: ChallengeConditionType.DISTANCE_OVERACHIEVE,
        thresholdValue: 50,
        awardBadgeUrl: '🏅',
        rewardDescription: 'Huy hiệu Chiến Binh Hoàn Thành Vượt Mốc 50KM',
      },
    ]);
    setErrorMessage(null);
  };

  // Load and apply template from source event
  const applySourceEvent = async (eventId: string) => {
    if (!eventId) {
      resetToBlank();
      return;
    }

    setSourceEventId(eventId);
    setIsLoadingSource(true);
    setErrorMessage(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/events/${encodeURIComponent(eventId)}`);
      if (!res.ok) {
        throw new Error('Không thể tải cấu hình giải mẫu');
      }
      const data = await res.json();
      setSourceEventDetails(data);

      // 1. Metadata
      setTitle(`${data.title || 'Giải chạy'} (Bản sao)`);
      setSubtitle(data.subtitle || '');
      setDescription(data.description || '');
      setBannerUrl(data.bannerUrl || 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?auto=format&fit=crop&w=1200&q=80');
      setEventType(data.eventType || EventType.VIRTUAL_RACE);
      setRunMode(data.runMode || RunMode.ACCUMULATIVE);
      setBibPrefix(data.bibPrefix || 'PRO-');

      // 2. Dates are kept blank to require input
      setStartDateIso('');
      setEndDateIso('');

      // 3. Rules & Pace
      const minPaceSec = data.ruleConfig?.minPaceSecPerKm ?? 210;
      const maxPaceSec = data.ruleConfig?.maxPaceSecPerKm ?? 900;
      setMinPaceFormatted(formatPace(minPaceSec, false));
      setMaxPaceFormatted(formatPace(maxPaceSec, false));
      setWeekendMultiplier(data.ruleConfig?.weekendMultiplier ?? 1.0);
      setAllowSplitFiltering(data.ruleConfig?.allowSplitFiltering ?? true);

      // 4. Categories (Tầng 1)
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        setCategories(
          data.categories.map((c: any) => ({
            name: c.name || `Cự ly ${c.targetDistanceKm}KM`,
            targetDistanceKm: Number(c.targetDistanceKm) || 21,
            bibPrefix: c.bibPrefix || data.bibPrefix || 'PRO-',
          }))
        );
      }

      // 5. Challenge Tiers (Tầng 2)
      if (Array.isArray(data.challengeTiers) && data.challengeTiers.length > 0) {
        setChallengeTiers(
          data.challengeTiers.map((t: any) => ({
            tierName: t.tierName || 'Thử thách đặc biệt',
            tierLevel: t.tierLevel || 'GOLD',
            conditionType: t.conditionType || ChallengeConditionType.DISTANCE_OVERACHIEVE,
            thresholdValue: Number(t.thresholdValue) || 50,
            targetSpeedDistanceKm: t.targetSpeedDistanceKm ? Number(t.targetSpeedDistanceKm) : undefined,
            awardBadgeUrl: t.awardBadgeUrl || '🏅',
            rewardDescription: t.rewardDescription || '',
          }))
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tải thông tin giải mẫu.');
    } finally {
      setIsLoadingSource(false);
    }
  };

  // Trigger load when modal opens or initialSourceEventId changes
  useEffect(() => {
    if (isOpen) {
      if (initialSourceEventId) {
        applySourceEvent(initialSourceEventId);
      } else {
        resetToBlank();
      }
    }
  }, [isOpen, initialSourceEventId]);

  if (!isOpen) return null;

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập Tên giải đấu.');
      return;
    }

    if (!startDateIso || !endDateIso) {
      setErrorMessage('Vui lòng chọn đầy đủ Ngày bắt đầu và Ngày kết thúc.');
      return;
    }

    if (new Date(endDateIso) < new Date(startDateIso)) {
      setErrorMessage('Ngày kết thúc phải diễn ra sau hoặc cùng ngày bắt đầu.');
      return;
    }

    setIsSubmitting(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;

      // Filter categories and tiers based on modular toggles
      const finalCategories = cloneOptions.includeCategories
        ? categories
        : [
            { name: 'Mốc Target 21KM (Half Marathon)', targetDistanceKm: 21, bibPrefix: 'TOP21-' },
            { name: 'Mốc Target 42KM (Marathon)', targetDistanceKm: 42, bibPrefix: 'TOP42-' },
          ];

      const finalChallengeTiers = cloneOptions.includeChallengeTiers
        ? challengeTiers
        : [
            {
              tierName: 'Chiến Binh Bứt Phá (50KM)',
              tierLevel: 'GOLD' as const,
              conditionType: ChallengeConditionType.DISTANCE_OVERACHIEVE,
              thresholdValue: 50,
              awardBadgeUrl: '🏅',
              rewardDescription: 'Huy hiệu Chiến Binh Hoàn Thành',
            },
          ];

      const minPaceSec = cloneOptions.includeRules ? parsePaceToSeconds(minPaceFormatted) || 210 : 210;
      const maxPaceSec = cloneOptions.includeRules ? parsePaceToSeconds(maxPaceFormatted) || 900 : 900;
      const finalWeekendMultiplier = cloneOptions.includeRules ? weekendMultiplier : 1.0;
      const finalAllowSplitFiltering = cloneOptions.includeRules ? allowSplitFiltering : true;

      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || title.trim(),
        bannerUrl: cloneOptions.includeBanner ? bannerUrl.trim() : undefined,
        eventType,
        runMode,
        status: EventStatus.UPCOMING,
        startDateIso,
        endDateIso,
        minPaceSecPerKm: minPaceSec,
        maxPaceSecPerKm: maxPaceSec,
        weekendMultiplier: finalWeekendMultiplier,
        allowSplitFiltering: finalAllowSplitFiltering,
        bibPrefix: cloneOptions.includeBanner ? bibPrefix.trim().toUpperCase() : 'PRO-',
        categories: finalCategories,
        challengeTiers: finalChallengeTiers,
      };

      const res = await fetch(`${apiBase}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Lỗi khi tạo giải đấu trên hệ thống.');
      }

      const created = await res.json();
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối khi gửi dữ liệu tạo giải.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-2xl w-full my-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1420] p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#FC4C02]">
              {sourceEventId ? <Copy className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {sourceEventId ? 'Nhân Bản Cấu Hình Giải Đấu' : 'Khởi Tạo Giải Chạy Ảo / Thử Thách Mới'}
                {sourceEventId && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    CLONE TEMPLATE
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {sourceEventId
                  ? 'Kế thừa toàn bộ quy chế, cự ly và mốc thưởng từ giải mẫu mà không sao chép dữ liệu VĐV cũ.'
                  : 'Thiết lập giải chạy phong trào với mô hình 2 tầng Target & Challenge.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Selector Section */}
        <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-50/50 dark:bg-orange-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#FC4C02]" />
              <span>Sao chép cấu hình từ giải mẫu (Clone Template)</span>
            </label>
            {sourceEventId && (
              <button
                type="button"
                onClick={resetToBlank}
                className="text-[11px] font-semibold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Hủy giải mẫu, tạo từ đầu</span>
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={sourceEventId}
              onChange={(e) => applySourceEvent(e.target.value)}
              disabled={isLoadingSource || isSubmitting}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FC4C02] appearance-none pr-9 cursor-pointer shadow-sm"
            >
              <option value="">-- Không sao chép (Tạo mới giải đấu từ đầu) --</option>
              {eventsList.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  🏆 {ev.title} ({ev.categories?.length || 0} cự ly • {ev.challengeTiers?.length || 0} thử thách)
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              {isLoadingSource ? <Loader2 className="w-4 h-4 animate-spin text-[#FC4C02]" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {/* Modular Clone Checkboxes when source is selected */}
          {sourceEventDetails && (
            <div className="pt-2 border-t border-orange-500/10 space-y-2">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-[#FC4C02]" />
                <span>Các thành phần cấu hình muốn sao chép:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cloneOptions.includeRules}
                    onChange={(e) => setCloneOptions({ ...cloneOptions, includeRules: e.target.checked })}
                    className="accent-[#FC4C02] rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Quy tắc Pace & Multiplier</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Pace {formatPace(sourceEventDetails.ruleConfig?.minPaceSecPerKm, false)} - {formatPace(sourceEventDetails.ruleConfig?.maxPaceSecPerKm, false)} • Cuối tuần x{sourceEventDetails.ruleConfig?.weekendMultiplier || 1.0}
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cloneOptions.includeCategories}
                    onChange={(e) => setCloneOptions({ ...cloneOptions, includeCategories: e.target.checked })}
                    className="accent-[#FC4C02] rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Hạng mục Target (Tầng 1)</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {sourceEventDetails.categories?.length || 0} cự ly ({sourceEventDetails.categories?.map((c: any) => `${c.targetDistanceKm}K`).join(', ')})
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cloneOptions.includeChallengeTiers}
                    onChange={(e) => setCloneOptions({ ...cloneOptions, includeChallengeTiers: e.target.checked })}
                    className="accent-[#FC4C02] rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Thử thách Tiers (Tầng 2)</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {sourceEventDetails.challengeTiers?.length || 0} mốc thưởng &amp; huy hiệu
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cloneOptions.includeBanner}
                    onChange={(e) => setCloneOptions({ ...cloneOptions, includeBanner: e.target.checked })}
                    className="accent-[#FC4C02] rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Banner &amp; Tiền tố BIB</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Prefix: &quot;{sourceEventDetails.bibPrefix || 'PRO-'}&quot; • Giữ nguyên ảnh bìa
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Tên giải & Phụ đề */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tên giải đấu mới *
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: TOPRUN SUMMER VIRTUAL CHALLENGE 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Thông điệp / Phụ đề
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Chạy bộ vì sức khỏe • Bứt phá giới hạn bản thân"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
              />
            </div>
          </div>

          {/* Dates: Forced blank so user chooses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#FC4C02]" />
                <span>Ngày bắt đầu *</span>
              </label>
              <input
                type="date"
                required
                value={startDateIso}
                onChange={(e) => setStartDateIso(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
              />
              <span className="text-[10px] text-slate-400">Bắt buộc chọn mốc thời gian mới</span>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#FC4C02]" />
                <span>Ngày kết thúc *</span>
              </label>
              <input
                type="date"
                required
                value={endDateIso}
                onChange={(e) => setEndDateIso(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
              />
              <span className="text-[10px] text-slate-400">Hệ thống tự động chốt kết quả vào 23:59:59</span>
            </div>
          </div>

          {/* Pace & Rules */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pace tối thiểu</label>
              <input
                type="text"
                value={minPaceFormatted}
                onChange={(e) => setMinPaceFormatted(e.target.value)}
                placeholder="03:30"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pace tối đa</label>
              <input
                type="text"
                value={maxPaceFormatted}
                onChange={(e) => setMaxPaceFormatted(e.target.value)}
                placeholder="15:00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Hệ số cuối tuần</label>
              <select
                value={weekendMultiplier}
                onChange={(e) => setWeekendMultiplier(parseFloat(e.target.value) || 1.0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
              >
                <option value={1.0}>1.0x (Không nhân)</option>
                <option value={1.5}>1.5x (Thứ 7 &amp; CN)</option>
                <option value={2.0}>2.0x (Cuối tuần x2)</option>
              </select>
            </div>
          </div>

          {/* Preview Categories & Challenge Tiers */}
          <div className="space-y-3 pt-2">
            {/* Tầng 1 */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5 text-blue-500" />
                  <span>Hạng mục Target (Tầng 1)</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {cloneOptions.includeCategories ? `${categories.length} cự ly` : 'Mặc định (2 cự ly)'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(cloneOptions.includeCategories ? categories : categories.slice(0, 2)).map((c, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px] font-semibold font-mono"
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-blue-500/20 font-bold">
                      {c.targetDistanceKm}KM
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* Tầng 2 */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>Thử thách Challenge Tiers (Tầng 2)</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {cloneOptions.includeChallengeTiers ? `${challengeTiers.length} mốc thử thách` : 'Mặc định (1 mốc)'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(cloneOptions.includeChallengeTiers ? challengeTiers : challengeTiers.slice(0, 1)).map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-semibold"
                  >
                    <span>{t.awardBadgeUrl || '🏅'}</span>
                    <span>{t.tierName}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 font-bold uppercase">
                      {t.tierLevel}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              * VĐV, dữ liệu tracklog và bảng xếp hạng sẽ hoàn toàn sạch (0 runners)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] disabled:opacity-50 text-white font-bold shadow-md shadow-[#FC4C02]/20 flex items-center gap-1.5 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tạo giải...</span>
                  </>
                ) : sourceEventId ? (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Xác Nhận Nhân Bản Giải</span>
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4" />
                    <span>Tạo Giải Mới</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
