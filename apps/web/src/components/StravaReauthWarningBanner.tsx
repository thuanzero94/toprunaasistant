'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Link2, X } from 'lucide-react';

interface StravaReauthWarningBannerProps {
  userId?: string;
  apiBase?: string;
}

export default function StravaReauthWarningBanner({
  userId,
  apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
}: StravaReauthWarningBannerProps) {
  const [warningState, setWarningState] = useState<{
    show: boolean;
    authorizeUrl: string;
    athleteName?: string;
  }>({
    show: false,
    authorizeUrl: '',
  });

  const [isDismissed, setIsDismissed] = useState(false);

  const checkScope = useCallback(async () => {
    if (!userId) return;

    try {
      const res = await fetch(`${apiBase}/account/${userId}/strava-scope-check`);
      if (!res.ok) return;
      const data = await res.json();

      // Chỉ cảnh báo nếu user đã từng kết nối Strava nhưng hiện tại thiếu quyền đọc bài chạy
      if (data.isConnected && !data.hasActivityReadScope) {
        setWarningState({
          show: true,
          authorizeUrl: data.authorizeUrl || '',
          athleteName: data.athleteName,
        });
      } else {
        setWarningState({ show: false, authorizeUrl: '' });
      }
    } catch {
      // Ignore background network failure
    }
  }, [userId, apiBase]);

  useEffect(() => {
    if (!userId) return;

    // Kiểm tra ngay khi mount
    checkScope();

    // Chu kỳ kiểm tra định kỳ mỗi 15 phút (900.000 ms)
    const interval = setInterval(checkScope, 15 * 60 * 1000);

    // Kiểm tra khi người dùng quay lại tab (window focus)
    const handleFocus = () => {
      checkScope();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId, checkScope]);

  // Kiểm tra trạng thái tạm đóng (Dismiss) trong sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissedUntil = sessionStorage.getItem('strava_warning_dismissed_until');
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      // Tạm ẩn 30 phút rồi sẽ tự động nhắc lại
      sessionStorage.setItem('strava_warning_dismissed_until', String(Date.now() + 30 * 60 * 1000));
    }
  };

  if (!warningState.show || isDismissed) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-lg border-b border-orange-400/40">
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <span className="p-1.5 rounded-lg bg-black/20 text-amber-200 shrink-0 animate-pulse">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
          </span>
          <div className="leading-snug">
            <p className="font-semibold text-white">
              Cảnh báo Strava: Tài khoản{' '}
              {warningState.athleteName ? `(${warningState.athleteName})` : ''} cần cấp lại quyền đọc
              hoạt động!
            </p>
            <p className="text-amber-100 text-[11px] sm:text-xs">
              Các bài chạy mới qua Webhook sẽ không thể tự động đồng bộ vào giải đấu nếu chưa có
              quyền &quot;activity:read_all&quot;.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <a
            href={warningState.authorizeUrl}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-white text-orange-600 hover:bg-orange-50 font-bold text-xs sm:text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Kết nối lại Strava (1-click)</span>
          </a>

          <button
            type="button"
            onClick={handleDismiss}
            title="Tạm đóng 30 phút"
            className="p-1.5 rounded-lg hover:bg-black/20 text-amber-100 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
