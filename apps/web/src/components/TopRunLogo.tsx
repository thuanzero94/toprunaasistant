'use client';

import React from 'react';

interface TopRunLogoProps {
  variant?: 'icon' | 'compact' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

export default function TopRunLogo({
  variant = 'compact',
  size = 'md',
  className = '',
  onClick,
}: TopRunLogoProps) {
  const iconDimensions = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-11 h-11 rounded-2xl',
    xl: 'w-14 h-14 rounded-2xl',
  };

  const svgDimensions = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${
        onClick ? 'cursor-pointer hover:opacity-90 transition' : ''
      } ${className}`}
    >
      {/* Brand Icon Mark */}
      <div
        className={`${iconDimensions[size]} bg-gradient-to-br from-[#FC4C02] to-[#FF6B2C] flex items-center justify-center shadow-sm shrink-0`}
      >
        <svg
          viewBox="0 0 32 32"
          className={`${svgDimensions[size]} text-white`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 22L13 10L18 17L26 8"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="26" cy="8" r="2.5" fill="currentColor" />
        </svg>
      </div>

      {/* Brand Text */}
      {variant !== 'icon' && (
        <div className="leading-tight">
          <div
            className={`font-black tracking-tight text-slate-900 dark:text-white ${textSizes[size]}`}
          >
            TOP<span className="text-[#FC4C02]">Run</span>
          </div>
          {variant === 'full' && (
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Virtual Race &amp; Strava Telemetry
            </div>
          )}
        </div>
      )}
    </div>
  );
}

