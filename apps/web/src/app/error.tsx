'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 text-2xl font-bold">
        !
      </div>
      <h1 className="text-2xl font-bold mb-2">Đã xảy ra sự cố</h1>
      <p className="text-sm text-slate-400 max-w-md mb-6">
        {error?.message || 'Có lỗi xảy ra khi tải trang. Vui lòng thử lại.'}
      </p>
      <button
        onClick={() => reset()}
        className="px-5 py-2.5 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-semibold transition cursor-pointer shadow-sm"
      >
        Thử lại
      </button>
    </div>
  );
}

