import { EBibConfig, EBibTheme } from '@toprun/shared';

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
  config?: EBibConfig;
  eventDate?: string;
}): string {
  const { eventTitle, categoryName, bibNumber, runnerName, teamName, config, eventDate } = params;
  const theme = config?.theme || EBibTheme.MODERN_TITANIUM;
  const slogan = config?.slogan || 'BREAK YOUR LIMITS • OFFICIALLY TIMED';

  // Theme palettes and gradients
  let bgGradientDef = '';
  let borderStroke = '#FC4C02';
  let bannerFill = 'url(#accentGrad)';
  let bibColor = '#FFFFFF';
  let runnerNameColor = '#38BDF8';
  let cornerHoleOuter = '#1E293B';
  let cornerHoleInner = '#0F172A';
  let badgeFill = '#FC4C02';
  let badgeText = '#FFFFFF';
  let chipStroke = '#FC4C02';
  let watermarkColor = 'rgba(255, 255, 255, 0.03)';

  if (theme === EBibTheme.NEON_CYBER) {
    borderStroke = '#06B6D4';
    bibColor = '#22D3EE';
    runnerNameColor = '#F43F5E';
    cornerHoleOuter = '#083344';
    cornerHoleInner = '#020617';
    badgeFill = '#F43F5E';
    badgeText = '#FFFFFF';
    chipStroke = '#06B6D4';
    watermarkColor = 'rgba(6, 182, 212, 0.04)';
    bgGradientDef = `
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#050B14" />
        <stop offset="50%" stop-color="#0A192F" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#06B6D4" />
        <stop offset="50%" stop-color="#3B82F6" />
        <stop offset="100%" stop-color="#EC4899" />
      </linearGradient>
    `;
  } else if (theme === EBibTheme.SUNSET_CRIMSON) {
    borderStroke = '#EF4444';
    bibColor = '#FDE047';
    runnerNameColor = '#FB923C';
    cornerHoleOuter = '#450A0A';
    cornerHoleInner = '#0F172A';
    badgeFill = '#E11D48';
    badgeText = '#FFF';
    chipStroke = '#F97316';
    watermarkColor = 'rgba(239, 68, 68, 0.04)';
    bgGradientDef = `
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#18040A" />
        <stop offset="50%" stop-color="#2D0B1E" />
        <stop offset="100%" stop-color="#1A0A2A" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#F97316" />
        <stop offset="50%" stop-color="#EF4444" />
        <stop offset="100%" stop-color="#BE185D" />
      </linearGradient>
    `;
  } else if (theme === EBibTheme.MINIMAL_CLEAN) {
    borderStroke = '#2563EB';
    bibColor = '#0F172A';
    runnerNameColor = '#1D4ED8';
    cornerHoleOuter = '#CBD5E1';
    cornerHoleInner = '#F8FAFC';
    badgeFill = '#2563EB';
    badgeText = '#FFFFFF';
    chipStroke = '#3B82F6';
    watermarkColor = 'rgba(37, 99, 235, 0.03)';
    bgGradientDef = `
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="50%" stop-color="#F1F5F9" />
        <stop offset="100%" stop-color="#E2E8F0" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#1E40AF" />
        <stop offset="100%" stop-color="#3B82F6" />
      </linearGradient>
    `;
  } else {
    // MODERN_TITANIUM (Standard Default)
    borderStroke = config?.primaryColor || '#FC4C02';
    bgGradientDef = `
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0A0E17" />
        <stop offset="50%" stop-color="#111827" />
        <stop offset="100%" stop-color="#0D111A" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FC4C02" />
        <stop offset="60%" stop-color="#EA580C" />
        <stop offset="100%" stop-color="#F59E0B" />
      </linearGradient>
    `;
  }

  const isLightTheme = theme === EBibTheme.MINIMAL_CLEAN;
  const textColorSecondary = isLightTheme ? '#64748B' : '#94A3B8';
  const cardBorder = isLightTheme ? '#CBD5E1' : '#1E293B';
  const gridLineColor = isLightTheme ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 520" width="100%" height="100%">
  <defs>
    ${bgGradientDef}
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <pattern id="gridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="${gridLineColor}" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Base Plate & Subtle Pattern -->
  <rect width="840" height="520" rx="28" fill="url(#bgGrad)" stroke="${borderStroke}" stroke-width="4.5"/>
  <rect width="840" height="520" rx="28" fill="url(#gridPattern)" />

  <!-- Background Watermark Big Logo/Text -->
  <text x="420" y="320" font-family="Arial Black, Impact, sans-serif" font-size="140" font-weight="900" fill="${watermarkColor}" text-anchor="middle" letter-spacing="10">TOPRUN</text>

  <!-- 4 Corner Reinforced Eyelets (BIB Pinholes) -->
  <!-- Top Left -->
  <circle cx="45" cy="45" r="16" fill="${cornerHoleOuter}" stroke="${borderStroke}" stroke-width="2" />
  <circle cx="45" cy="45" r="7" fill="${cornerHoleInner}" />
  <!-- Top Right -->
  <circle cx="795" cy="45" r="16" fill="${cornerHoleOuter}" stroke="${borderStroke}" stroke-width="2" />
  <circle cx="795" cy="45" r="7" fill="${cornerHoleInner}" />
  <!-- Bottom Left -->
  <circle cx="45" cy="475" r="16" fill="${cornerHoleOuter}" stroke="${borderStroke}" stroke-width="2" />
  <circle cx="45" cy="475" r="7" fill="${cornerHoleInner}" />
  <!-- Bottom Right -->
  <circle cx="795" cy="475" r="16" fill="${cornerHoleOuter}" stroke="${borderStroke}" stroke-width="2" />
  <circle cx="795" cy="475" r="7" fill="${cornerHoleInner}" />

  <!-- Header Header Banner -->
  <rect x="75" y="24" width="690" height="74" rx="16" fill="${bannerFill}" />
  <text x="420" y="55" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="3">${escapeXml(eventTitle.toUpperCase())}</text>
  <text x="420" y="82" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#FEF08A" text-anchor="middle" letter-spacing="1.5">⚡ ${escapeXml(slogan.toUpperCase())}</text>

  <!-- Category & RFID Timing Chip Badge -->
  <g transform="translate(100, 115)">
    <!-- RFID Chip simulation -->
    <rect x="0" y="0" width="70" height="24" rx="6" fill="none" stroke="${chipStroke}" stroke-width="1.5" stroke-dasharray="4,2"/>
    <text x="35" y="16" font-family="Courier, monospace" font-size="10" font-weight="bold" fill="${chipStroke}" text-anchor="middle">RFID-LIVE</text>

    <!-- Category Pill -->
    <rect x="500" y="0" width="140" height="24" rx="12" fill="${badgeFill}" />
    <text x="570" y="16" font-family="-apple-system, sans-serif" font-size="11" font-weight="800" fill="${badgeText}" text-anchor="middle" letter-spacing="1">${escapeXml(categoryName.toUpperCase())}</text>
  </g>

  <!-- Big Central BIB Number -->
  <text x="420" y="275" font-family="'Impact', 'Arial Black', sans-serif" font-size="126" font-weight="900" fill="${bibColor}" text-anchor="middle" letter-spacing="8" filter="url(#softGlow)">${escapeXml(bibNumber)}</text>

  <!-- High-Tech Barcode Line & Decorative Divider -->
  <g transform="translate(140, 310)">
    <line x1="0" y1="0" x2="560" y2="0" stroke="${borderStroke}" stroke-width="2.5" stroke-dasharray="16, 6, 4, 6" opacity="0.8"/>
  </g>

  <!-- Runner Name -->
  <text x="420" y="375" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" fill="${runnerNameColor}" text-anchor="middle" letter-spacing="2">${escapeXml(runnerName.toUpperCase())}</text>

  <!-- Department / Club / Unit -->
  <text x="420" y="415" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="600" fill="${textColorSecondary}" text-anchor="middle" letter-spacing="1">${escapeXml(teamName ? `CLB / ĐỘI: ${teamName.toUpperCase()}` : 'TOPRUN ATHLETE • STRAVA VERIFIED')}</text>

  <!-- Footer Verification & Date Strip -->
  <g transform="translate(90, 445)">
    <!-- Simulated Barcode bars -->
    <rect x="20" y="0" width="3" height="22" fill="${textColorSecondary}" />
    <rect x="26" y="0" width="2" height="22" fill="${textColorSecondary}" />
    <rect x="31" y="0" width="5" height="22" fill="${textColorSecondary}" />
    <rect x="39" y="0" width="2" height="22" fill="${textColorSecondary}" />
    <rect x="44" y="0" width="4" height="22" fill="${textColorSecondary}" />
    <rect x="51" y="0" width="2" height="22" fill="${textColorSecondary}" />
    <rect x="56" y="0" width="6" height="22" fill="${textColorSecondary}" />
    <rect x="65" y="0" width="3" height="22" fill="${textColorSecondary}" />
    <rect x="71" y="0" width="2" height="22" fill="${textColorSecondary}" />
    <rect x="76" y="0" width="4" height="22" fill="${textColorSecondary}" />
    <rect x="83" y="0" width="2" height="22" fill="${textColorSecondary}" />
    <rect x="88" y="0" width="5" height="22" fill="${textColorSecondary}" />
    <text x="102" y="16" font-family="Courier, monospace" font-size="11" fill="${textColorSecondary}">AUTH-${escapeXml(bibNumber)}</text>

    <!-- Official Stamp on right -->
    <text x="560" y="16" font-family="-apple-system, sans-serif" font-size="11" font-weight="700" fill="${textColorSecondary}" text-anchor="end">OFFICIAL VIRTUAL BIB • TOPRUN 2026</text>
  </g>
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

