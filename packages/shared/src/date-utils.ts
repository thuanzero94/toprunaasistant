/**
 * @file date-utils.ts
 * Bộ tiện ích chuẩn hoá múi giờ Việt Nam (UTC+7 / Asia/Ho_Chi_Minh) cho toàn bộ hệ thống TOPRun.
 * Đảm bảo mọi tính toán thời gian giải đấu, tracklog, ngày cuối tuần và thống kê tháng
 * luôn đồng nhất và chính xác 100% theo giờ Việt Nam, bất kể môi trường chạy (Node.js UTC, Docker, Browser).
 */

export const VIETNAM_TIMEZONE_OFFSET_HOURS = 7;
export const VIETNAM_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Chuyển đổi timestamp/ISO date sang đối tượng Date đã được offset +7 giờ.
 * Dùng các phương thức getUTC*() trên đối tượng trả về để đọc chính xác Năm, Tháng, Ngày, Giờ, Phút theo giờ Việt Nam.
 */
export function toVietnamDate(dateInput?: string | Date | number | null): Date {
  const ms = dateInput
    ? (typeof dateInput === 'number' ? dateInput : new Date(dateInput).getTime())
    : Date.now();
  const safeMs = isNaN(ms) ? Date.now() : ms;
  return new Date(safeMs + VIETNAM_TIMEZONE_OFFSET_MS);
}

/**
 * Trả về chuỗi định dạng YYYY-MM-DD theo giờ Việt Nam (+7).
 * Rất hữu ích khi bind vào <input type="date" /> trên giao diện Admin / Profile.
 */
export function toVietnamDateString(dateInput?: string | Date | number | null): string {
  const vn = toVietnamDate(dateInput);
  const year = vn.getUTCFullYear();
  const month = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const day = String(vn.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Lấy tháng (1-12) và năm theo giờ Việt Nam (+7).
 */
export function getVietnamMonthYear(dateInput?: string | Date | number | null): { month: number; year: number } {
  const vn = toVietnamDate(dateInput);
  return {
    month: vn.getUTCMonth() + 1,
    year: vn.getUTCFullYear(),
  };
}

/**
 * Chuẩn hoá mốc bắt đầu giải đấu về 00:00:00.000 giờ Việt Nam (+07:00).
 * Ví dụ: "2026-11-01" -> "2026-10-31T17:00:00.000Z"
 */
export function toVietnamEventStartIso(dateStrOrIso: string): string {
  if (!dateStrOrIso) return new Date().toISOString();
  // Nếu đã chứa offset +07:00 hoặc là date YYYY-MM-DD
  const dateOnly = dateStrOrIso.includes('T')
    ? toVietnamDateString(dateStrOrIso)
    : dateStrOrIso.slice(0, 10);
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return new Date(`${dateOnly}T00:00:00+07:00`).toISOString();
  }
  const d = new Date(dateStrOrIso);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Chuẩn hoá mốc kết thúc giải đấu về 23:59:59.999 giờ Việt Nam (+07:00).
 * Ví dụ: "2026-11-30" -> "2026-11-30T16:59:59.999Z"
 */
export function toVietnamEventEndIso(dateStrOrIso: string): string {
  if (!dateStrOrIso) return new Date().toISOString();
  const dateOnly = dateStrOrIso.includes('T')
    ? toVietnamDateString(dateStrOrIso)
    : dateStrOrIso.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return new Date(`${dateOnly}T23:59:59.999+07:00`).toISOString();
  }
  const d = new Date(dateStrOrIso);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Kiểm tra xem một hoạt động có nằm trong thời gian giải đấu hay không theo giờ Việt Nam.
 * Tự động điều chỉnh khoảng thời gian evStart và evEnd nếu giải đấu đang lưu dạng UTC mốc 00:00Z.
 */
export function isActivityInEventRange(
  activityStartDate: string | Date | number,
  eventStartDateIso: string,
  eventEndDateIso: string
): boolean {
  const actMs = typeof activityStartDate === 'number'
    ? activityStartDate
    : new Date(activityStartDate).getTime();
  if (isNaN(actMs)) return false;

  // Chuẩn hoá thời gian bắt đầu và kết thúc của giải đấu
  const startIso = toVietnamEventStartIso(eventStartDateIso);
  const endIso = toVietnamEventEndIso(eventEndDateIso);

  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();

  return actMs >= startMs && actMs <= endMs;
}

/**
 * Kiểm tra xem một hoạt động có diễn ra vào cuối tuần (Thứ 7 hoặc Chủ Nhật) theo giờ Việt Nam (+7) hay không.
 */
export function isVietnamWeekend(dateInput?: string | Date | number | null): boolean {
  const vn = toVietnamDate(dateInput);
  const day = vn.getUTCDay(); // 0: Chủ Nhật, 6: Thứ Bảy
  return day === 0 || day === 6;
}

/**
 * Kiểm tra xem hoạt động có thuộc tháng và năm cụ thể theo giờ Việt Nam (+7) hay không.
 * targetMonth: 1 - 12
 */
export function isDateInVietnamMonth(
  dateInput: string | Date | number | null | undefined,
  targetMonth: number,
  targetYear: number
): boolean {
  if (!dateInput) return false;
  const { month, year } = getVietnamMonthYear(dateInput);
  return month === targetMonth && year === targetYear;
}

