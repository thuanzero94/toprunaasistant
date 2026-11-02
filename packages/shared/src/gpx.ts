import { calculatePaceSecPerKm } from './pace';
import { encodePolyline, GeoPoint } from './polyline';
import { RawActivityInput, RawActivitySplitInput, SportType } from './types';

/**
 * Tính khoảng cách giữa 2 tọa độ GPS (Haversine formula) trả về đơn vị mét
 */
export function haversineDistanceMeters(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371000; // Bán kính Trái Đất (mét)
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Bộ phân tích file GPX (GPS Exchange Format) thành cấu trúc `RawActivityInput` chuẩn
 * Tự động chia các đoạn 1.000m thành mảng `splits` và mã hóa đường chạy thành `mapPolyline`
 */
export function parseGpxToActivityInput(gpxXmlContent: string, fileName = 'GPX Upload'): RawActivityInput {
  // Trích xuất tên bài chạy từ thẻ <name>
  const nameMatch = gpxXmlContent.match(/<name>(.*?)<\/name>/i);
  const activityName = nameMatch ? nameMatch[1].trim() : fileName.replace(/\.gpx$/i, '');

  // Trích xuất tất cả các điểm <trkpt lat="..." lon="...">...</trkpt>
  const trkptRegex = /<trkpt[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/trkpt>/gi;

  interface TrackPoint {
    lat: number;
    lng: number;
    ele: number;
    timeMs: number;
    hr: number | null;
    cad: number | null;
  }

  const trackPoints: TrackPoint[] = [];
  let match: RegExpExecArray | null;

  while ((match = trkptRegex.exec(gpxXmlContent)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    const innerXml = match[3];

    const eleMatch = innerXml.match(/<ele>([^<]+)<\/ele>/i);
    const timeMatch = innerXml.match(/<time>([^<]+)<\/time>/i);
    const hrMatch = innerXml.match(/<(?:gpxtpx:)?hr>([^<]+)<\/(?:gpxtpx:)?hr>/i);
    const cadMatch = innerXml.match(/<(?:gpxtpx:)?cad>([^<]+)<\/(?:gpxtpx:)?cad>/i);

    if (!isNaN(lat) && !isNaN(lng) && timeMatch) {
      trackPoints.push({
        lat,
        lng,
        ele: eleMatch ? parseFloat(eleMatch[1]) : 0,
        timeMs: new Date(timeMatch[1].trim()).getTime(),
        hr: hrMatch ? parseFloat(hrMatch[1]) : null,
        cad: cadMatch ? parseFloat(cadMatch[1]) * 2 : null, // GPX thường lưu 1 chân -> nhân 2 ra spm
      });
    }
  }

  if (trackPoints.length < 2) {
    throw new Error('File GPX không hợp lệ hoặc không chứa dữ liệu tọa độ GPS (<trkpt>) kèm thời gian.');
  }

  let totalDistanceMeters = 0;
  let totalMovingTimeSec = 0;
  let totalElevationGainMeters = 0;
  let hrSum = 0;
  let hrCount = 0;
  let maxHr = 0;
  let cadSum = 0;
  let cadCount = 0;

  const splits: RawActivitySplitInput[] = [];
  let currentSplitDist = 0;
  let currentSplitTimeSec = 0;
  let currentSplitEleDiff = 0;
  let currentSplitHrSum = 0;
  let currentSplitHrCount = 0;

  for (let i = 1; i < trackPoints.length; i++) {
    const prev = trackPoints[i - 1];
    const curr = trackPoints[i];

    const segDist = haversineDistanceMeters({ lat: prev.lat, lng: prev.lng }, { lat: curr.lat, lng: curr.lng });
    const segTimeSec = Math.max(0, (curr.timeMs - prev.timeMs) / 1000);
    const eleDiff = curr.ele - prev.ele;

    // Bỏ qua thời gian dừng nghỉ quá lâu (> 30s tại 1 chỗ) khi tính moving time
    const segSpeedMps = segTimeSec > 0 ? segDist / segTimeSec : 0;
    const isMoving = segSpeedMps > 0.3 && segTimeSec < 120;

    totalDistanceMeters += segDist;
    const effectiveSegTime = isMoving ? segTimeSec : 0;
    totalMovingTimeSec += effectiveSegTime;

    if (eleDiff > 0) {
      totalElevationGainMeters += eleDiff;
    }

    if (curr.hr) {
      hrSum += curr.hr;
      hrCount++;
      if (curr.hr > maxHr) maxHr = curr.hr;
      currentSplitHrSum += curr.hr;
      currentSplitHrCount++;
    }
    if (curr.cad) {
      cadSum += curr.cad;
      cadCount++;
    }

    currentSplitDist += segDist;
    currentSplitTimeSec += effectiveSegTime;
    currentSplitEleDiff += eleDiff;

    // Cứ mỗi 1.000m thì đóng gói 1 Split
    if (currentSplitDist >= 1000) {
      splits.push({
        splitIndex: splits.length + 1,
        distanceMeters: Math.round(currentSplitDist),
        movingTimeSec: Math.round(currentSplitTimeSec),
        elevationDiffMeters: Math.round(currentSplitEleDiff * 10) / 10,
        averageHeartrate: currentSplitHrCount > 0 ? Math.round(currentSplitHrSum / currentSplitHrCount) : null,
      });
      currentSplitDist = 0;
      currentSplitTimeSec = 0;
      currentSplitEleDiff = 0;
      currentSplitHrSum = 0;
      currentSplitHrCount = 0;
    }
  }

  // Đóng gói phần lẻ cuối cùng (nếu >= 50m)
  if (currentSplitDist >= 50) {
    splits.push({
      splitIndex: splits.length + 1,
      distanceMeters: Math.round(currentSplitDist),
      movingTimeSec: Math.round(currentSplitTimeSec),
      elevationDiffMeters: Math.round(currentSplitEleDiff * 10) / 10,
      averageHeartrate: currentSplitHrCount > 0 ? Math.round(currentSplitHrSum / currentSplitHrCount) : null,
    });
  }

  const startDateIso = new Date(trackPoints[0].timeMs).toISOString();
  const elapsedTimeSec = Math.round((trackPoints[trackPoints.length - 1].timeMs - trackPoints[0].timeMs) / 1000);

  // Giảm mật độ điểm (Downsample) trước khi mã hóa Polyline để tối ưu dung lượng
  const step = Math.max(1, Math.floor(trackPoints.length / 250));
  const sampledPoints: GeoPoint[] = [];
  for (let i = 0; i < trackPoints.length; i += step) {
    sampledPoints.push({ lat: trackPoints[i].lat, lng: trackPoints[i].lng });
  }
  const mapPolyline = encodePolyline(sampledPoints);

  return {
    externalId: `gpx_${Date.now()}`,
    name: activityName,
    sportType: SportType.RUN,
    startDateIso,
    distanceMeters: Math.round(totalDistanceMeters),
    movingTimeSec: Math.round(totalMovingTimeSec || elapsedTimeSec),
    elapsedTimeSec,
    totalElevationGainMeters: Math.round(totalElevationGainMeters * 10) / 10,
    averageHeartrate: hrCount > 0 ? Math.round(hrSum / hrCount) : null,
    maxHeartrate: maxHr > 0 ? maxHr : null,
    averageCadenceSpm: cadCount > 0 ? Math.round(cadSum / cadCount) : null,
    isManual: false,
    mapPolyline,
    splits,
  };
}

