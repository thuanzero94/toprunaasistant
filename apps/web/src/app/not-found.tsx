import Link from 'next/link';
import TopRunLogo from '../components/TopRunLogo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#090D16] text-white flex flex-col items-center justify-center p-6 text-center">
      <Link href="/" className="mb-6 hover:opacity-90 transition">
        <TopRunLogo variant="full" size="lg" />
      </Link>
      <div className="w-16 h-16 rounded-2xl bg-[#FC4C02]/10 text-[#FC4C02] flex items-center justify-center mb-4 text-2xl font-bold font-mono">
        404
      </div>
      <h1 className="text-2xl font-bold mb-2">Trang không tồn tại</h1>
      <p className="text-sm text-slate-400 max-w-md mb-6">
        Liên kết bạn vừa truy cập không tìm thấy trên hệ thống giải chạy TOPRun Assistant.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-semibold transition shadow-sm"
      >
        Về trang chủ
      </Link>
    </div>
  );
}

