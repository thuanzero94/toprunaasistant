import { HonorBadge, UserRole } from './types';

export interface AthleteBadgeConfig {
  badgeType: 'ANGEL_INVESTOR' | 'ADMIN' | 'ORGANIZER' | 'PODIUM_1' | 'PODIUM_2' | 'PODIUM_3' | 'ELITE' | 'STANDARD';
  title: string;
  shortLabel: string;
  pillText: string;
  pillClasses: string;
  ringClasses: string;
  glowColor: string;
  hasWings: boolean;
  hasSharkCrown: boolean;
  hasFounderCrown?: boolean;
  cornerIcon: 'diamond' | 'shield' | 'crown_gold' | 'crown_silver' | 'crown_bronze' | 'zap' | null;
}

export function getAthleteBadgeConfig(
  user?: {
    role?: UserRole | string;
    honorBadge?: string | null;
    pr5kSec?: number | null;
    pr42kSec?: number | null;
  } | null,
  rank?: number
): AthleteBadgeConfig {
  // 1. Shark Angel Investor (Ưu tiên cao nhất)
  if (user?.honorBadge === HonorBadge.ANGEL_INVESTOR || user?.honorBadge === 'ANGEL_INVESTOR') {
    return {
      badgeType: 'ANGEL_INVESTOR',
      title: 'Nhà Đầu Tư Thiên Thần (Shark VIP Backer)',
      shortLabel: 'Shark Investor',
      pillText: '🦈 SHARK ANGEL INVESTOR 💎',
      pillClasses:
        'bg-gradient-to-r from-cyan-950/80 via-purple-950/80 to-slate-900 text-cyan-300 border border-cyan-400/50 shadow-md shadow-cyan-500/20 font-black',
      ringClasses: 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/50',
      glowColor: '#22d3ee',
      hasWings: true,
      hasSharkCrown: true,
      cornerIcon: 'diamond',
    };
  }

  // 2. Founder / Sáng lập
  if (user?.honorBadge === HonorBadge.FOUNDER || user?.honorBadge === 'FOUNDER') {
    return {
      badgeType: 'ANGEL_INVESTOR',
      title: 'Nhà Sáng Lập Hệ Thống',
      shortLabel: 'Founder',
      pillText: '🚀 FOUNDER & ARCHITECT',
      pillClasses:
        'bg-gradient-to-r from-amber-950/80 to-slate-900 text-amber-300 border border-amber-400/50 shadow-md shadow-amber-500/20 font-black',
      ringClasses: 'ring-2 ring-amber-400 shadow-lg shadow-amber-400/40',
      glowColor: '#f59e0b',
      hasWings: true,
      hasSharkCrown: false,
      hasFounderCrown: true,
      cornerIcon: 'diamond',
    };
  }

  // 3. Podium Champion (Top 1, 2, 3) nếu có rank truyền vào
  if (rank === 1) {
    return {
      badgeType: 'PODIUM_1',
      title: 'Quán Quân Bảng Xếp Hạng',
      shortLabel: 'Top 1',
      pillText: '👑 TOP 1 CHAMPION',
      pillClasses: 'bg-amber-400/15 text-amber-500 dark:text-amber-300 border border-amber-400/40 font-bold',
      ringClasses: 'ring-2 ring-amber-400 shadow-md shadow-amber-400/30',
      glowColor: '#fbbf24',
      hasWings: false,
      hasSharkCrown: false,
      cornerIcon: 'crown_gold',
    };
  }
  if (rank === 2) {
    return {
      badgeType: 'PODIUM_2',
      title: 'Á Quân 1 Bảng Xếp Hạng',
      shortLabel: 'Top 2',
      pillText: '🥈 Á QUÂN 1',
      pillClasses: 'bg-slate-400/15 text-slate-700 dark:text-slate-300 border border-slate-400/40 font-bold',
      ringClasses: 'ring-2 ring-slate-300 shadow-sm shadow-slate-300/30',
      glowColor: '#cbd5e1',
      hasWings: false,
      hasSharkCrown: false,
      cornerIcon: 'crown_silver',
    };
  }
  if (rank === 3) {
    return {
      badgeType: 'PODIUM_3',
      title: 'Á Quân 2 Bảng Xếp Hạng',
      shortLabel: 'Top 3',
      pillText: '🥉 Á QUÂN 2',
      pillClasses: 'bg-amber-700/15 text-amber-700 dark:text-amber-400 border border-amber-700/40 font-bold',
      ringClasses: 'ring-2 ring-amber-700 shadow-sm shadow-amber-700/30',
      glowColor: '#b45309',
      hasWings: false,
      hasSharkCrown: false,
      cornerIcon: 'crown_bronze',
    };
  }

  // 4. Ban Quản Trị (Admin / Organizer)
  if (user?.role === UserRole.ADMIN || user?.role === 'ADMIN') {
    return {
      badgeType: 'ADMIN',
      title: 'Quản Trị Viên Tối Cao',
      shortLabel: 'Admin',
      pillText: '🛡️ QUẢN TRỊ VIÊN',
      pillClasses: 'bg-[#FC4C02]/15 text-[#FC4C02] border border-[#FC4C02]/40 font-bold',
      ringClasses: 'ring-2 ring-[#FC4C02] shadow-md shadow-[#FC4C02]/25',
      glowColor: '#FC4C02',
      hasWings: false,
      hasSharkCrown: false,
      cornerIcon: 'shield',
    };
  }
  if (user?.role === UserRole.ORGANIZER || user?.role === 'ORGANIZER') {
    return {
      badgeType: 'ORGANIZER',
      title: 'Ban Tổ Chức Giải Đấu',
      shortLabel: 'Organizer',
      pillText: '📋 BAN TỔ CHỨC',
      pillClasses: 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 border border-indigo-500/40 font-bold',
      ringClasses: 'ring-2 ring-indigo-500',
      glowColor: '#6366f1',
      hasWings: false,
      hasSharkCrown: false,
      cornerIcon: 'shield',
    };
  }

  // 5. Elite Runner (Tốc độ cao: 5K <= 20:00 hoặc 42K <= 3:30:00 hoặc honorBadge = ELITE_ATHLETE)
  const isSpeedElite =
    user?.honorBadge === HonorBadge.ELITE_ATHLETE ||
    user?.honorBadge === 'ELITE_ATHLETE' ||
    (Boolean(user?.pr5kSec) && (user?.pr5kSec ?? 0) > 0 && (user?.pr5kSec ?? 0) <= 1200) ||
    (Boolean(user?.pr42kSec) && (user?.pr42kSec ?? 0) > 0 && (user?.pr42kSec ?? 0) <= 12600);

  if (isSpeedElite) {
    return {
      badgeType: 'ELITE',
      title: 'Vận Động Viên Tốc Độ (Elite Runner)',
      shortLabel: 'Elite',
      pillText: '⚡ ELITE RUNNER',
      pillClasses: 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/40 font-bold',
      ringClasses: 'ring-2 ring-rose-500 shadow-md shadow-rose-500/30',
      glowColor: '#f43f5e',
      hasWings: false,
      hasSharkCrown: false,
      cornerIcon: 'zap',
    };
  }

  // 6. Standard Runner
  return {
    badgeType: 'STANDARD',
    title: 'Vận Động Viên',
    shortLabel: 'Runner',
    pillText: '🏃 RUNNER',
    pillClasses: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
    ringClasses: 'ring-1 ring-slate-200 dark:ring-slate-700',
    glowColor: 'transparent',
    hasWings: false,
    hasSharkCrown: false,
    cornerIcon: null,
  };
}

