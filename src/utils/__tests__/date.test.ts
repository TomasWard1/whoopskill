import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getWhoopDay, formatDate, getDateRange, validateISODate, getDaysAgo, getLocalOffset, toLocalStart, toLocalEnd } from '../date.js';

describe('getLocalOffset', () => {
  it('returns a valid ±HH:MM string', () => {
    const offset = getLocalOffset();
    expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/);
  });

  it('returns correct offset for system timezone', () => {
    const offset = getLocalOffset();
    const offsetMin = new Date().getTimezoneOffset();
    const sign = offsetMin <= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const expected = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
    expect(offset).toBe(expected);
  });
});

describe('toLocalStart / toLocalEnd', () => {
  it('appends local offset to start timestamp', () => {
    const result = toLocalStart('2026-03-03');
    const offset = getLocalOffset();
    expect(result).toBe(`2026-03-03T00:00:00.000${offset}`);
  });

  it('appends local offset to end timestamp', () => {
    const result = toLocalEnd('2026-03-03');
    const offset = getLocalOffset();
    expect(result).toBe(`2026-03-03T23:59:59.999${offset}`);
  });
});

describe('validateISODate', () => {
  it('accepts valid YYYY-MM-DD dates', () => {
    expect(validateISODate('2026-01-15')).toBe(true);
    expect(validateISODate('2025-12-31')).toBe(true);
    expect(validateISODate('2026-03-02')).toBe(true);
  });

  it('rejects non-date strings', () => {
    expect(validateISODate('not-a-date')).toBe(false);
    expect(validateISODate('2026/01/15')).toBe(false);
    expect(validateISODate('01-15-2026')).toBe(false);
    expect(validateISODate('')).toBe(false);
  });

  it('rejects month 13 (NaN date)', () => {
    expect(validateISODate('2026-13-01')).toBe(false);
  });

  it('does not catch date overflow (known limitation)', () => {
    expect(validateISODate('2026-02-30')).toBe(true);
  });

  it('rejects dates with extra content', () => {
    expect(validateISODate('2026-01-15T00:00:00')).toBe(false);
    expect(validateISODate('2026-01-15 extra')).toBe(false);
  });
});

describe('formatDate', () => {
  it('formats a Date as YYYY-MM-DD in UTC', () => {
    expect(formatDate(new Date('2026-01-15T12:00:00Z'))).toBe('2026-01-15');
  });
});

describe('getDateRange', () => {
  it('returns full calendar day with local timezone offset', () => {
    const range = getDateRange('2026-01-15');
    const offset = getLocalOffset();
    expect(range.start).toBe(`2026-01-15T00:00:00.000${offset}`);
    expect(range.end).toBe(`2026-01-15T23:59:59.999${offset}`);
  });

  it('uses local offset not Z', () => {
    const range = getDateRange('2026-03-02');
    expect(range.start).not.toContain('Z');
    expect(range.end).not.toContain('Z');
  });
});

describe('getWhoopDay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns local calendar date', () => {
    vi.setSystemTime(new Date('2026-01-15T14:00:00'));
    expect(getWhoopDay()).toBe('2026-01-15');
  });

  it('returns local date even late at night', () => {
    vi.setSystemTime(new Date('2026-01-15T23:30:00'));
    expect(getWhoopDay()).toBe('2026-01-15');
  });

  it('returns local date early morning', () => {
    vi.setSystemTime(new Date('2026-01-15T03:00:00'));
    expect(getWhoopDay()).toBe('2026-01-15');
  });
});

describe('getDaysAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns date N days ago', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00'));
    expect(getDaysAgo(7)).toBe('2026-01-08');
    expect(getDaysAgo(30)).toBe('2025-12-16');
  });

  it('returns today when 0 days ago', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00'));
    expect(getDaysAgo(0)).toBe('2026-01-15');
  });
});
