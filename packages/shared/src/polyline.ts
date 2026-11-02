/**
 * Giải mã chuỗi Google Encoded Polyline (từ Strava API map.summary_polyline / map.polyline)
 * thành mảng tọa độ [latitude, longitude] và chuyển đổi thành đường vẽ SVG cho Share Card / Thumbnail.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Giải mã chuỗi Polyline chuẩn Google / Strava thành mảng tọa độ { lat, lng }
 */
export function decodePolyline(encoded: string | null | undefined): GeoPoint[] {
  if (!encoded || encoded.trim().length === 0) return [];

  const points: GeoPoint[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return points;
}

/**
 * Mã hóa mảng tọa độ { lat, lng } thành chuỗi Google Polyline (dùng khi người dùng upload file GPX/TCX)
 */
export function encodePolyline(points: GeoPoint[]): string {
  if (!points || points.length === 0) return '';

  let prevLat = 0;
  let prevLng = 0;
  let result = '';

  const encodeSignedNumber = (num: number): string => {
    let sgnNum = num << 1;
    if (num < 0) {
      sgnNum = ~sgnNum;
    }
    let encoded = '';
    while (sgnNum >= 0x20) {
      encoded += String.fromCharCode((0x20 | (sgnNum & 0x1f)) + 63);
      sgnNum >>= 5;
    }
    encoded += String.fromCharCode(sgnNum + 63);
    return encoded;
  };

  for (const pt of points) {
    const lat = Math.round(pt.lat * 1e5);
    const lng = Math.round(pt.lng * 1e5);
    result += encodeSignedNumber(lat - prevLat);
    result += encodeSignedNumber(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }

  return result;
}

/**
 * Chuyển đổi chuỗi Polyline thành chuỗi thuộc tính `d` của thẻ `<path>` trong SVG
 * Dùng để vẽ nhanh đường chạy trên Feed, Bảng xếp hạng và tính năng "Share Card"
 */
export function polylineToSvgPath(
  encoded: string | null | undefined,
  width = 300,
  height = 200,
  padding = 16
): { pathData: string; startPoint: { x: number; y: number } | null; endPoint: { x: number; y: number } | null } {
  const points = decodePolyline(encoded);
  if (points.length < 2) {
    return { pathData: '', startPoint: null, endPoint: null };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  const latRange = maxLat - minLat || 0.0001;
  const lngRange = maxLng - minLng || 0.0001;

  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  const scale = Math.min(drawWidth / lngRange, drawHeight / latRange);
  const offsetX = padding + (drawWidth - lngRange * scale) / 2;
  const offsetY = padding + (drawHeight - latRange * scale) / 2;

  const mapped = points.map((p) => ({
    x: Math.round((offsetX + (p.lng - minLng) * scale) * 10) / 10,
    // Trục Y của SVG hướng xuống dưới nên đảo ngược Latitude
    y: Math.round((offsetY + (maxLat - p.lat) * scale) * 10) / 10,
  }));

  const pathData = mapped
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
    .join(' ');

  return {
    pathData,
    startPoint: mapped[0],
    endPoint: mapped[mapped.length - 1],
  };
}

