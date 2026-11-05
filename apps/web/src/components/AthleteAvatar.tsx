'use client';

import React from 'react';
import {
  ShieldCheck,
  Zap,
  Award,
  Crown,
  Sparkles,
} from 'lucide-react';
import { getAthleteBadgeConfig, AthleteBadgeConfig, UserRole, HonorBadge } from '@toprun/shared';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AthleteAvatarProps {
  user?: {
    id?: string;
    fullName?: string;
    avatarUrl?: string | null;
    departmentOrUnit?: string | null;
    role?: UserRole | string;
    honorBadge?: string | null;
    pr5kSec?: number | null;
    pr42kSec?: number | null;
  } | null;
  rank?: number;
  size?: AvatarSize;
  showBadge?: boolean;
  showWings?: boolean;
  showSharkCrown?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeConfig: Record<
  AvatarSize,
  {
    boxSize: string;
    avatarPx: number;
    badgeSize: string;
    badgeIconPx: number;
    wingsScale: number;
    sharkWidth: number;
    sharkHeight: number;
    sharkTopOffset: string;
  }
> = {
  xs: {
    boxSize: 'w-6 h-6',
    avatarPx: 24,
    badgeSize: 'w-3 h-3',
    badgeIconPx: 8,
    wingsScale: 0.45,
    sharkWidth: 16,
    sharkHeight: 10,
    sharkTopOffset: '-top-2',
  },
  sm: {
    boxSize: 'w-8 h-8',
    avatarPx: 32,
    badgeSize: 'w-3.5 h-3.5',
    badgeIconPx: 10,
    wingsScale: 0.6,
    sharkWidth: 22,
    sharkHeight: 14,
    sharkTopOffset: '-top-2.5',
  },
  md: {
    boxSize: 'w-10 h-10',
    avatarPx: 40,
    badgeSize: 'w-4 h-4',
    badgeIconPx: 11,
    wingsScale: 0.85,
    sharkWidth: 28,
    sharkHeight: 18,
    sharkTopOffset: '-top-3',
  },
  lg: {
    boxSize: 'w-14 h-14',
    avatarPx: 56,
    badgeSize: 'w-5 h-5',
    badgeIconPx: 13,
    wingsScale: 1.15,
    sharkWidth: 38,
    sharkHeight: 24,
    sharkTopOffset: '-top-4',
  },
  xl: {
    boxSize: 'w-20 h-20',
    avatarPx: 80,
    badgeSize: 'w-6 h-6',
    badgeIconPx: 15,
    wingsScale: 1.5,
    sharkWidth: 52,
    sharkHeight: 32,
    sharkTopOffset: '-top-5',
  },
  '2xl': {
    boxSize: 'w-24 h-24',
    avatarPx: 96,
    badgeSize: 'w-7 h-7',
    badgeIconPx: 18,
    wingsScale: 1.85,
    sharkWidth: 64,
    sharkHeight: 40,
    sharkTopOffset: '-top-6',
  },
};

/**
 * SVG ĐÔI CÁNH THIÊN THẦN (ANGEL WINGS) PHÁT SÁNG CHO VIP SHARK ANGEL INVESTOR
 */
function AngelWings({ scale = 1 }: { scale: number }) {
  const width = Math.round(110 * scale);
  const height = Math.round(52 * scale);

  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 transition-transform duration-300 group-hover:scale-105"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <svg
        viewBox="0 0 160 76"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]"
      >
        <defs>
          <linearGradient id="angelGoldCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="angelGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Cánh Trái (Left Wing) */}
        <g className="animate-[pulse_3s_ease-in-out_infinite]">
          <path
            d="M 54 44 C 42 36, 26 28, 6 12 C 16 28, 28 42, 46 54 C 34 50, 18 38, 12 28 C 22 42, 34 56, 52 62 C 40 60, 26 50, 20 42 C 28 54, 40 66, 56 68 Z"
            fill="url(#angelGoldCyan)"
            stroke="url(#angelGlow)"
            strokeWidth="1.2"
          />
          {/* Lông vũ phụ phát sáng */}
          <path
            d="M 48 38 C 36 28, 24 16, 14 6 C 24 18, 38 32, 50 42 Z"
            fill="url(#angelGlow)"
            opacity="0.8"
          />
        </g>

        {/* Cánh Phải (Right Wing) */}
        <g className="animate-[pulse_3s_ease-in-out_infinite]">
          <path
            d="M 106 44 C 118 36, 134 28, 154 12 C 144 28, 132 42, 114 54 C 126 50, 142 38, 148 28 C 138 42, 126 56, 108 62 C 120 60, 134 50, 140 42 C 132 54, 120 66, 104 68 Z"
            fill="url(#angelGoldCyan)"
            stroke="url(#angelGlow)"
            strokeWidth="1.2"
          />
          {/* Lông vũ phụ phát sáng */}
          <path
            d="M 112 38 C 124 28, 136 16, 146 6 C 136 18, 122 32, 110 42 Z"
            fill="url(#angelGlow)"
            opacity="0.8"
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * SVG ĐẦU CÁ MẬP SHARK HOÀNG GIA (METALLIC SHARK CROWN)
 */
function SharkCrown({ width, height }: { width: number; height: number }) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-transform duration-300 group-hover:-translate-y-0.5"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <svg
        viewBox="0 0 64 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="sharkBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="60%" stopColor="#0369A1" />
            <stop offset="100%" stopColor="#082F49" />
          </linearGradient>
          <linearGradient id="sharkFinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>

        {/* Vây cá mập đỉnh (Dorsal Fin Crown) */}
        <path
          d="M 32 2 C 34 8, 38 14, 44 18 L 32 18 Z"
          fill="url(#sharkFinGrad)"
          stroke="#E0F2FE"
          strokeWidth="0.8"
        />

        {/* Đầu cá mập & Mõm săn mồi (Shark Head Profile) */}
        <path
          d="M 12 36 C 14 26, 22 18, 32 16 C 42 18, 50 26, 52 36 C 48 38, 40 40, 32 40 C 24 40, 16 38, 12 36 Z"
          fill="url(#sharkBodyGrad)"
          stroke="#38BDF8"
          strokeWidth="1.2"
        />

        {/* Răng cá mập sắc bén (Shark Sharp Teeth) */}
        <polygon points="20,36 23,32 26,36" fill="#FFFFFF" />
        <polygon points="26,36 29,31 32,36" fill="#FFFFFF" />
        <polygon points="32,36 35,31 38,36" fill="#FFFFFF" />
        <polygon points="38,36 41,32 44,36" fill="#FFFFFF" />

        {/* Mắt cá mập ánh vàng săn mồi (Predator Gold Eyes) */}
        <circle cx="23" cy="24" r="2.2" fill="#F59E0B" />
        <circle cx="23.5" cy="23.5" r="0.8" fill="#FFFFFF" />
        <circle cx="41" cy="24" r="2.2" fill="#F59E0B" />
        <circle cx="41.5" cy="23.5" r="0.8" fill="#FFFFFF" />

        {/* Mang cá mập (Gills) */}
        <line x1="16" y1="28" x2="18" y2="33" stroke="#38BDF8" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="48" y1="28" x2="46" y2="33" stroke="#38BDF8" strokeWidth="0.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * SVG VƯƠNG MIỆN HOÀNG ĐẾ KIẾN TRÚC SƯ ĐỘC BẢN CHO FOUNDER (ROYAL ARCHITECT CROWN)
 */
function FounderCrown({ width, height }: { width: number; height: number }) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-[0_0_10px_rgba(245,158,11,0.9)] transition-transform duration-300 group-hover:-translate-y-0.5"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <svg
        viewBox="0 0 64 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="founderGoldBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="35%" stopColor="#F59E0B" />
            <stop offset="70%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
          <linearGradient id="founderPeakGold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="50%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <radialGradient id="rubyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FCA5A5" />
            <stop offset="40%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#991B1B" />
          </radialGradient>
        </defs>

        {/* Hào quang tia sáng đỉnh trung tâm */}
        <circle cx="32" cy="10" r="10" fill="#F59E0B" opacity="0.25" filter="blur(2px)" />

        {/* Thân vương miện hoàng gia 5 đỉnh chạm khắc */}
        <path
          d="M 12 34 
             L 16 16 
             L 24 24 
             L 32 4 
             L 40 24 
             L 48 16 
             L 52 34 
             C 44 38, 20 38, 12 34 Z"
          fill="url(#founderGoldBody)"
          stroke="#FEF08A"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Đai vương miện chân đế kim cương */}
        <path
          d="M 13 32 C 22 36, 42 36, 51 32 L 51 35 C 42 39, 22 39, 13 35 Z"
          fill="url(#founderPeakGold)"
          stroke="#F59E0B"
          strokeWidth="0.8"
        />

        {/* Đỉnh chóp ngọc & sao danh vọng 3 ngọn chính */}
        {/* Đỉnh giữa - Viên hồng ngọc Ruby Hoàng Gia */}
        <circle cx="32" cy="4" r="3.2" fill="url(#rubyGlow)" stroke="#FFFBEB" strokeWidth="0.8" />
        <circle cx="31" cy="3" r="0.8" fill="#FFFFFF" />

        {/* Đỉnh trái & phải */}
        <circle cx="16" cy="16" r="2.2" fill="#FEF08A" stroke="#B45309" strokeWidth="0.6" />
        <circle cx="48" cy="16" r="2.2" fill="#FEF08A" stroke="#B45309" strokeWidth="0.6" />

        {/* Họa tiết Ngôi sao Kiến trúc Sư ở giữa ngực vương miện */}
        <path
          d="M 32 18 L 33.5 22 L 38 22.5 L 34.5 25.5 L 35.5 30 L 32 27.5 L 28.5 30 L 29.5 25.5 L 26 22.5 L 30.5 22 Z"
          fill="#FFFBEB"
          stroke="#F59E0B"
          strokeWidth="0.5"
        />

        {/* Kim cương đính dải chân */}
        <polygon points="22,34 23.5,32.5 25,34 23.5,35.5" fill="#FFFFFF" />
        <polygon points="32,35 33.5,33.5 35,35 33.5,36.5" fill="url(#rubyGlow)" />
        <polygon points="42,34 43.5,32.5 45,34 43.5,35.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

/**
 * HUY HIỆU GÓC DƯỚI (CORNER ICON BADGE)
 */
function CornerBadge({
  type,
  sizeClass,
  iconPx,
}: {
  type: AthleteBadgeConfig['cornerIcon'];
  sizeClass: string;
  iconPx: number;
}) {
  if (!type) return null;

  if (type === 'diamond') {
    return (
      <div
        className={`absolute -bottom-1 -right-1 ${sizeClass} rounded-full bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-cyan-500/50 border border-white dark:border-slate-900 z-20`}
        title="Nhà Đầu Tư Thiên Thần (Diamond VIP)"
      >
        <span style={{ fontSize: `${iconPx}px` }}>💎</span>
      </div>
    );
  }

  if (type === 'shield') {
    return (
      <div
        className={`absolute -bottom-1 -right-1 ${sizeClass} rounded-full bg-[#FC4C02] text-white flex items-center justify-center shadow-md shadow-[#FC4C02]/40 border border-white dark:border-slate-900 z-20`}
        title="Quản Trị Viên Hệ Thống"
      >
        <ShieldCheck className="w-full h-full p-0.5" />
      </div>
    );
  }

  if (type === 'crown_gold') {
    return (
      <div
        className={`absolute -bottom-1 -right-1 ${sizeClass} rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md shadow-amber-400/50 border border-white dark:border-slate-900 z-20`}
        title="Quán Quân Bảng Xếp Hạng (Top 1)"
      >
        <Crown className="w-full h-full p-0.5 fill-slate-950" />
      </div>
    );
  }

  if (type === 'crown_silver') {
    return (
      <div
        className={`absolute -bottom-1 -right-1 ${sizeClass} rounded-full bg-slate-200 text-slate-800 flex items-center justify-center shadow-sm border border-white dark:border-slate-900 z-20`}
        title="Á Quân 1 (Top 2)"
      >
        <Crown className="w-full h-full p-0.5 fill-slate-800" />
      </div>
    );
  }

  if (type === 'crown_bronze') {
    return (
      <div
        className={`absolute -bottom-1 -right-1 ${sizeClass} rounded-full bg-amber-700 text-white flex items-center justify-center shadow-sm border border-white dark:border-slate-900 z-20`}
        title="Á Quân 2 (Top 3)"
      >
        <Crown className="w-full h-full p-0.5 fill-white" />
      </div>
    );
  }

  if (type === 'zap') {
    return (
      <div
        className={`absolute -bottom-1 -right-1 ${sizeClass} rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/40 border border-white dark:border-slate-900 z-20`}
        title="Vận Động Viên Tốc Độ (Elite Runner)"
      >
        <Zap className="w-full h-full p-0.5 fill-white" />
      </div>
    );
  }

  return null;
}

/**
 * COMPONENT CHÍNH: ATHLETE AVATAR ĐA TẦNG CÁ NHÂN HOÁ
 */
export default function AthleteAvatar({
  user,
  rank,
  size = 'md',
  showBadge = true,
  showWings = true,
  showSharkCrown = true,
  className = '',
  onClick,
}: AthleteAvatarProps) {
  const cfg = getAthleteBadgeConfig(user, rank);
  const sizeProps = sizeConfig[size];
  const isAngelInvestor = cfg.badgeType === 'ANGEL_INVESTOR';

  const avatarSrc =
    user?.avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.fullName || user?.id || 'runner')}`;

  const showWingsActual = Boolean(showWings && cfg.hasWings);
  const showSharkActual = Boolean(showSharkCrown && cfg.hasSharkCrown);
  const showFounderActual = Boolean(showSharkCrown && cfg.hasFounderCrown);

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 group ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      title={`${user?.fullName || 'VĐV'} • ${cfg.title}`}
    >
      {/* 1. ĐÔI CÁNH THIÊN THẦN NỔI BẬT CHO ANGEL INVESTOR & FOUNDER */}
      {showWingsActual && <AngelWings scale={sizeProps.wingsScale} />}

      {/* 2. ĐẦU CÁ MẬP NGỰ TRÊN ĐỈNH ĐẦU AVATAR CHO SHARK ANGEL */}
      {showSharkActual && (
        <div className={`absolute ${sizeProps.sharkTopOffset} left-0 right-0 flex justify-center`}>
          <SharkCrown width={sizeProps.sharkWidth} height={sizeProps.sharkHeight} />
        </div>
      )}

      {/* 2B. VƯƠNG MIỆN HOÀNG ĐẾ KIẾN TRÚC SƯ ĐẶC QUYỀN CHO FOUNDER */}
      {showFounderActual && (
        <div className={`absolute ${sizeProps.sharkTopOffset} left-0 right-0 flex justify-center`}>
          <FounderCrown width={sizeProps.sharkWidth} height={sizeProps.sharkHeight} />
        </div>
      )}

      {/* 3. KHUNG HÀO QUANG & AVATAR CHÍNH */}
      <div
        className={`relative z-10 rounded-2xl overflow-hidden transition-all duration-300 ${sizeProps.boxSize} ${cfg.ringClasses} ${
          isAngelInvestor ? 'group-hover:shadow-[0_0_24px_rgba(34,211,238,0.85)]' : ''
        }`}
      >
        <img
          src={avatarSrc}
          alt={user?.fullName || 'Athlete'}
          className="w-full h-full object-cover rounded-2xl bg-slate-100 dark:bg-slate-800"
          loading="lazy"
        />

        {/* Shimmer Light Sweep on Hover for Angel Investor */}
        {isAngelInvestor && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
        )}
      </div>

      {/* 4. HUY HIỆU GÓC DƯỚI */}
      {showBadge && (
        <CornerBadge
          type={cfg.cornerIcon}
          sizeClass={sizeProps.badgeSize}
          iconPx={sizeProps.badgeIconPx}
        />
      )}
    </div>
  );
}

/**
 * NHÃN DANH HIỆU CAO CẤP CẠNH TÊN (ATHLETE HONOR PILL)
 */
export function AthleteHonorPill({
  user,
  rank,
  className = '',
}: {
  user?: {
    id?: string;
    fullName?: string;
    avatarUrl?: string | null;
    departmentOrUnit?: string | null;
    role?: UserRole | string;
    honorBadge?: string | null;
    pr5kSec?: number | null;
    pr42kSec?: number | null;
  } | null;
  rank?: number;
  className?: string;
}) {
  const cfg = getAthleteBadgeConfig(user, rank);
  if (cfg.badgeType === 'STANDARD') return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] tracking-tight uppercase transition-transform hover:scale-105 cursor-default ${cfg.pillClasses} ${className}`}
      title={cfg.title}
    >
      {cfg.pillText}
    </span>
  );
}

