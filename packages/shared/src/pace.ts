/**
 * Các hàm tiện ích chuẩn hóa Pace, Quãng đường, Thời gian dùng chung trên Web, Mobile và Backend
 */

/**
 * Chuyển đổi Pace từ giây/km (VD: 330) sang chuỗi chuẩn "05:30 /km"
 */
export function formatPace(paceSecPerKm: number | null | undefined, includeUnit = true): string {
  if (!paceSecPerKm || paceSecPerKm <= 0 || !Number.isFinite(paceSecPerKm)) {
    return includeUnit ? '--:-- /km' : '--:--';
  }
  const totalSeconds = Math.round(paceSecPerKm);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return includeUnit ? `${formatted} /km` : formatted;
}

/**
 * Chuyển chuỗi Pace "05:30" thành số giây/km (330)
 */
export function parsePaceToSeconds(paceStr: string): number {
  const clean = paceStr.replace('/km', '').trim();
  const parts = clean.split(':').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Tính Pace (giây/km) từ quãng đường (mét) và thời gian di chuyển (giây)
 */
export function calculatePaceSecPerKm(distanceMeters: number, movingTimeSec: number): number {
  if (distanceMeters <= 0 || movingTimeSec <= 0) return 0;
  const distanceKm = distanceMeters / 1000;
  return Math.round(movingTimeSec / distanceKm);
}

/**
 * Định dạng thời gian từ giây sang "HH:MM:SS" hoặc "MM:SS"
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '00:00';
  const total = Math.round(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Làm tròn số km tới 2 chữ số thập phân
 */
export function roundKm(km: number): number {
  return Math.round((km + Number.EPSILON) * 100) / 100;
}

