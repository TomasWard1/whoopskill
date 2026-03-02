import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getWhoopDay, formatDate, getDateRange, validateISODate, getDaysAgo } from '../date.js';

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
    // JS Date wraps 2026-02-30 to 2026-03-02, so isNaN returns false
    expect(validateISODate('2026-02-30')).toBe(true);
  });

  it('rejects dates with extra content', () => {
    expect(validateISODate('2026-01-15T00:00:00')).toBe(false);
    expect(validateISODate('2026-01-15 extra')).toBe(false);
  });
});

describe('formatDate', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    expect(formatDate(new Date('2026-01-15T12:00:00Z'))).toBe('2026-01-15');
  });
});

describe('getDateRange', () => {
  it('returns a 24-hour window', () => {
    const range = getDateRange('2026-01-15');
    const start = new Date(range.start);
    const end = new Date(range.end);
    const diffHours = (end.getTime() - start.getTime()) / 3600000;
    expect(diffHours).toBe(24);
  });

  it('start hour is 4am local', () => {
    const range = getDateRange('2026-01-15');
    const start = new Date(range.start);
    expect(start.getHours()).toBe(4);
    expect(start.getMinutes()).toBe(0);
  });
});

describe('getWhoopDay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns previous day before 4am', () => {
    vi.setSystemTime(new Date('2026-01-15T03:00:00'));
    expect(getWhoopDay()).toBe('2026-01-14');
  });

  it('returns current day at/after 4am', () => {
    vi.setSystemTime(new Date('2026-01-15T04:00:00'));
    expect(getWhoopDay()).toBe('2026-01-15');
  });

  it('returns current day in the afternoon', () => {
    vi.setSystemTime(new Date('2026-01-15T14:00:00'));
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
