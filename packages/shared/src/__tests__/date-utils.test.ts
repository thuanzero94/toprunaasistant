import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toVietnamDate,
  toVietnamDateString,
  getVietnamMonthYear,
  toVietnamEventStartIso,
  toVietnamEventEndIso,
  isActivityInEventRange,
  isVietnamWeekend,
  isDateInVietnamMonth,
} from '../index';

describe('Vietnam Timezone Utilities (UTC+7)', () => {
  // Bài chạy lúc 04:42:00 sáng ngày 01/11/2026 giờ Việt Nam
  // Strava lưu theo UTC: 2026-10-31T21:42:00.000Z
  const runAt442AmUtc = '2026-10-31T21:42:00.000Z';

  it('correctly identifies month and year for run at 04:42 AM on Nov 1st', () => {
    const { month, year } = getVietnamMonthYear(runAt442AmUtc);
    assert.equal(month, 11);
    assert.equal(year, 2026);
    assert.equal(isDateInVietnamMonth(runAt442AmUtc, 11, 2026), true);
  });

  it('correctly formats to Vietnam date string YYYY-MM-DD', () => {
    const dateStr = toVietnamDateString(runAt442AmUtc);
    assert.equal(dateStr, '2026-11-01');
  });

  it('correctly includes the 04:42 AM run in November event range', () => {
    // Giải đấu bắt đầu 01/11/2026 và kết thúc 30/11/2026
    const eventStart = '2026-11-01';
    const eventEnd = '2026-11-30';

    const isInRange = isActivityInEventRange(runAt442AmUtc, eventStart, eventEnd);
    assert.equal(isInRange, true);
  });

  it('correctly includes run even if event start was stored as 2026-11-01T00:00:00.000Z', () => {
    // Trường hợp form admin cũ lưu UTC midnight
    const eventStart = '2026-11-01T00:00:00.000Z';
    const eventEnd = '2026-11-30T23:59:59.000Z';

    const isInRange = isActivityInEventRange(runAt442AmUtc, eventStart, eventEnd);
    assert.equal(isInRange, true);
  });

  it('correctly identifies weekend for Vietnam timezone', () => {
    // 01/11/2026 là Chủ Nhật
    assert.equal(isVietnamWeekend(runAt442AmUtc), true);

    // 02/11/2026 lúc 04:00 sáng (UTC: 2026-11-01T21:00:00Z) là Thứ Hai
    const mondayMorningUtc = '2026-11-01T21:00:00.000Z';
    assert.equal(isVietnamWeekend(mondayMorningUtc), false);
  });
});
