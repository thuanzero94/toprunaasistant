import { normalizeSportCategory, SportCategory } from './types';

/**
 * Các hàm tiện ích chuẩn hóa Pace, Tốc độ, Quãng đường, Thời gian dùng chung trên Web, Mobile và Backend
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
 * Tính tốc độ theo km/h từ Pace (giây/km)
 * VD: Pace 107s (01:47) -> 33.6 km/h; Pace 67s (01:07) -> 53.7 km/h; Pace 120s (02:00) -> 30.0 km/h
 */
export function calculateSpeedKmh(paceSecPerKm: number | null | undefined): number {
  if (!paceSecPerKm || paceSecPerKm <= 0 || !Number.isFinite(paceSecPerKm)) return 0;
  const speed = 3600 / paceSecPerKm;
  return Math.round((speed + Number.EPSILON) * 10) / 10;
}

/**
 * Định dạng tốc độ km/h cho bộ môn Đạp xe (Ride)
 * VD: 33.9 km/h, 53.7 km/h
 */
export function formatSpeedKmh(paceSecPerKm: number | null | undefined, includeUnit = true): string {
  if (!paceSecPerKm || paceSecPerKm <= 0 || !Number.isFinite(paceSecPerKm)) {
    return includeUnit ? '--.- km/h' : '--.-';
  }
  const speed = calculateSpeedKmh(paceSecPerKm);
  const formatted = speed.toFixed(1);
  return includeUnit ? `${formatted} km/h` : formatted;
}

/**
 * Định dạng Pace bơi lội theo phút/100m (Swim)
 * Vì paceSecPerKm là số giây cho 1000m -> chia 10 để ra số giây cho 100m
 * VD: 2030s/km -> 203s/100m -> "03:23 /100m"
 */
export function formatSwimPace(paceSecPerKm: number | null | undefined, includeUnit = true): string {
  if (!paceSecPerKm || paceSecPerKm <= 0 || !Number.isFinite(paceSecPerKm)) {
    return includeUnit ? '--:-- /100m' : '--:--';
  }
  const secPer100m = Math.round(paceSecPerKm / 10);
  const minutes = Math.floor(secPer100m / 60);
  const seconds = secPer100m % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return includeUnit ? `${formatted} /100m` : formatted;
}

/**
 * Định dạng vận tốc/nhịp độ thông minh theo từng bộ môn:
 * - Đạp xe (Ride): "XX.X km/h"
 * - Bơi lội (Swim): "MM:SS /100m"
 * - Chạy bộ (Run) / Khác: "MM:SS /km"
 */
export function formatSportSpeed(
  paceSecPerKm: number | null | undefined,
  sportType?: string | null,
  includeUnit = true
): string {
  const cat = normalizeSportCategory(sportType);
  if (cat === 'Ride') {
    return formatSpeedKmh(paceSecPerKm, includeUnit);
  }
  if (cat === 'Swim') {
    return formatSwimPace(paceSecPerKm, includeUnit);
  }
  return formatPace(paceSecPerKm, includeUnit);
}

/**
 * Định dạng cự ly thông minh theo bộ môn:
 * - Bơi lội (Swim): Cự ly < 10 km hiển thị mét (VD: "900 m", "1,500 m"); >= 10 km hiển thị km (VD: "12 km")
 * - Đạp xe / Chạy bộ / Khác: Hiển thị km (VD: "10.5 km")
 */
export function formatSportDistance(
  distanceKm: number | null | undefined,
  sportType?: string | null,
  includeUnit = true
): string {
  const km = distanceKm || 0;
  const cat = normalizeSportCategory(sportType);
  if (cat === 'Swim' && km < 10) {
    const meters = Math.round(km * 1000);
    return includeUnit ? `${meters.toLocaleString('vi-VN')} m` : `${meters}`;
  }
  const rounded = roundKm(km);
  return includeUnit ? `${rounded} km` : `${rounded}`;
}

/**
 * Lấy nhãn chỉ số tốc độ/pace trung bình hiển thị trên thẻ Summary:
 * - Ride: "Tốc độ TB (km/h)"
 * - Swim: "Pace TB (phút/100m)"
 * - Run: "Pace TB"
 */
export function getSpeedMetricLabel(sportType?: string | null): string {
  const cat = normalizeSportCategory(sportType);
  if (cat === 'Ride') return 'Tốc độ TB (km/h)';
  if (cat === 'Swim') return 'Pace TB (phút/100m)';
  return 'Pace TB';
}

/**
 * Lấy nhãn hiển thị tốc độ trên từng split (Km/100m breakdown):
 * - Ride: "Tốc độ"
 * - Swim: "Pace"
 * - Run: "Pace"
 */
export function getSpeedSplitLabel(sportType?: string | null): string {
  const cat = normalizeSportCategory(sportType);
  if (cat === 'Ride') return 'Tốc độ';
  return 'Pace';
}

/**
 * Lấy đơn vị vận tốc theo bộ môn:
 * - Ride: "km/h"
 * - Swim: "/100m"
 * - Run: "/km"
 */
export function getSpeedUnit(sportType?: string | null): string {
  const cat = normalizeSportCategory(sportType);
  if (cat === 'Ride') return 'km/h';
  if (cat === 'Swim') return '/100m';
  return '/km';
}

/**
 * Lấy đơn vị cự ly theo bộ môn:
 * - Swim (< 10km): "m"
 * - Ride / Run / Swim (>= 10km): "km"
 */
export function getDistanceUnit(distanceKm: number | null | undefined, sportType?: string | null): string {
  const km = distanceKm || 0;
  const cat = normalizeSportCategory(sportType);
  if (cat === 'Swim' && km < 10) return 'm';
  return 'km';
}

/**
 * Chuyển chuỗi Pace "05:30" thành số giây/km (330)
 */
export function parsePaceToSeconds(paceStr: string): number {
  const clean = paceStr.replace('/km', '').replace('/100m', '').replace('km/h', '').trim();
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
