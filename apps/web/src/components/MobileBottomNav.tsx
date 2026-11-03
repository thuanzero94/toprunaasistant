'use client';

import React from 'react';
import { Trophy, Activity, Award, UserCheck } from 'lucide-react';

export type MobileTab = 'events' | 'tracklogs' | 'trophy' | 'account' | 'admin' | 'clubs';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onChangeTab: (tab: MobileTab) => void;
  myEventsCount?: number;
}

export default function MobileBottomNav({
  activeTab,
  onChangeTab,
  myEventsCount = 0,
}: MobileBottomNavProps) {
  const tabs = [
    {
      id: 'events' as const,
      label: 'Giải đấu',
      icon: Trophy,
      badge: myEventsCount > 0 ? myEventsCount : undefined,
    },
    {
      id: 'tracklogs' as const,
      label: 'Tracklog',
      icon: Activity,
    },
    {
      id: 'trophy' as const,
      label: 'E-BIB',
      icon: Award,
    },
    {
      id: 'account' as const,
      label: 'Cá nhân',
      icon: UserCheck,
    },
  ];

  return (
    <nav
      aria-label="Điều hướng chính trên di động"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0C101B]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1 shadow-2xl safe-area-bottom"
    >
      <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition min-h-[48px] touch-manipulation cursor-pointer ${
                isActive
                  ? 'text-[#FC4C02] font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition duration-200 ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'
                  }`}
                />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2.5 px-1.5 py-0.2 rounded-full text-[9px] font-black font-mono bg-[#FC4C02] text-white">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
                {tab.label}
              </span>

              {isActive && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#FC4C02]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

