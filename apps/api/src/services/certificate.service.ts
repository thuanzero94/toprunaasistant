/**
 * Bộ tạo ảnh E-BIB (Số báo danh điện tử) và E-Certificate (Chứng nhận hoàn thành Target/Challenge)
 * Xuất ra định dạng Vector SVG sắc nét cao (có thể hiển thị trực tiếp trên Web/Mobile hoặc tải về PNG/PDF)
 */

export function generateEBibSvg(params: {
  eventTitle: string;
  categoryName: string;
  bibNumber: string;
  runnerName: string;
  teamName?: string;
}): string {
  const { eventTitle, categoryName, bibNumber, runnerName, teamName } = params;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#31102f" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="800" height="500" rx="24" fill="url(#bgGrad)" stroke="#f97316" stroke-width="4"/>
  <!-- Top Banner -->
  <rect x="0" y="0" width="800" height="85" rx="20" fill="url(#accentGrad)" />
  <text x="400" y="42" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">${escapeXml(eventTitle.toUpperCase())}</text>
  <text x="400" y="70" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#fef08a" text-anchor="middle" letter-spacing="1">🎯 ${escapeXml(categoryName.toUpperCase())}</text>

  <!-- Corner Holes (BIB pins) -->
  <circle cx="40" cy="40" r="10" fill="#0f172a" />
  <circle cx="760" cy="40" r="10" fill="#0f172a" />
  <circle cx="40" cy="460" r="10" fill="#334155" />
  <circle cx="760" cy="460" r="10" fill="#334155" />

  <!-- BIB Number -->
  <text x="400" y="275" font-family="Impact, Arial Black, sans-serif" font-size="138" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="6">${escapeXml(bibNumber)}</text>

  <!-- Divider -->
  <line x1="120" y1="330" x2="680" y2="330" stroke="#f97316" stroke-width="3" stroke-dasharray="10,6" />

  <!-- Runner Name & Team -->
  <text x="400" y="395" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="#38bdf8" text-anchor="middle" letter-spacing="2">${escapeXml(runnerName.toUpperCase())}</text>
  <text x="400" y="440" font-family="Arial, sans-serif" font-size="18" fill="#cbd5e1" text-anchor="middle">${escapeXml(teamName ? `ĐỘI / CLB: ${teamName}` : 'OFFICIAL VIRTUAL RUNNER • STRAVA VERIFIED')}</text>
</svg>`;
}

export function generateECertificateSvg(params: {
  eventTitle: string;
  runnerName: string;
  bibNumber: string;
  targetCategoryName: string;
  completedDistanceKm: number;
  rawDistanceKm: number;
  avgPaceFormatted: string;
  completedDateStr: string;
  unlockedChallengeBadges: string[];
}): string {
  const {
    eventTitle,
    runnerName,
    bibNumber,
    targetCategoryName,
    completedDistanceKm,
    rawDistanceKm,
    avgPaceFormatted,
    completedDateStr,
    unlockedChallengeBadges,
  } = params;

  const badgeText =
    unlockedChallengeBadges.length > 0
      ? `🏆 CHALLENGE AWARDS ĐẠT ĐƯỢC: ${unlockedChallengeBadges.join(' • ')}`
      : '🏆 ĐÃ HOÀN THÀNH XUẤT SẮC MỤC TIÊU TARGET (FINISHER)';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="100%" height="100%">
  <defs>
    <linearGradient id="certBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="50%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>
  <rect width="1000" height="700" rx="20" fill="url(#certBg)" stroke="url(#goldGrad)" stroke-width="8" />
  <rect x="24" y="24" width="952" height="652" rx="12" fill="none" stroke="#334155" stroke-width="2" />

  <text x="500" y="95" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#f59e0b" text-anchor="middle" letter-spacing="6">TOPRUN ASSISTANT • OFFICIAL FINISHER CERTIFICATE</text>
  <text x="500" y="145" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#ffffff" text-anchor="middle">${escapeXml(eventTitle)}</text>

  <text x="500" y="210" font-family="Arial, sans-serif" font-size="18" fill="#94a3b8" text-anchor="middle">Chứng nhận Vận động viên mang số BIB <tspan fill="#38bdf8" font-weight="bold">${escapeXml(bibNumber)}</tspan></text>
  <text x="500" y="275" font-family="Arial, sans-serif" font-size="52" font-weight="900" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="2">${escapeXml(runnerName.toUpperCase())}</text>

  <!-- Stats Box -->
  <rect x="120" y="325" width="760" height="145" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2" />
  <text x="250" y="375" font-family="Arial, sans-serif" font-size="15" fill="#94a3b8" text-anchor="middle">HẠNG MỤC TARGET</text>
  <text x="250" y="425" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapeXml(targetCategoryName)}</text>

  <text x="500" y="375" font-family="Arial, sans-serif" font-size="15" fill="#94a3b8" text-anchor="middle">TỔNG QUÃNG ĐƯỜNG TÍCH LŨY</text>
  <text x="500" y="425" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#22c55e" text-anchor="middle">${completedDistanceKm} KM</text>
  <text x="500" y="452" font-family="Arial, sans-serif" font-size="13" fill="#64748b" text-anchor="middle">(Thực chạy GPS: ${rawDistanceKm} km)</text>

  <text x="750" y="375" font-family="Arial, sans-serif" font-size="15" fill="#94a3b8" text-anchor="middle">PACE TRUNG BÌNH</text>
  <text x="750" y="425" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#38bdf8" text-anchor="middle">${escapeXml(avgPaceFormatted)}</text>

  <!-- Challenge Tier Awards -->
  <rect x="120" y="495" width="760" height="55" rx="12" fill="#1e1b4b" stroke="#6366f1" stroke-width="1.5" />
  <text x="500" y="530" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#fde047" text-anchor="middle">${escapeXml(badgeText)}</text>

  <!-- Footer -->
  <text x="220" y="625" font-family="Arial, sans-serif" font-size="15" fill="#94a3b8" text-anchor="middle">Ngày hoàn thành: ${escapeXml(completedDateStr)}</text>
  <text x="780" y="625" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#f97316" text-anchor="middle">XÁC THỰC BỞI STRAVA API &amp; TOPRUN ANTI-CHEAT</text>
</svg>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

