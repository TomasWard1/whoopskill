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
  it('returns full calendar day in UTC', () => {
    const range = getDateRange('2026-01-15');
    expect(range.start).toBe('2026-01-15T00:00:00.000Z');
    expect(range.end).toBe('2026-01-15T23:59:59.999Z');
  });

  it('works for any date string', () => {
    const range = getDateRange('2026-03-02');
    expect(range.start).toBe('2026-03-02T00:00:00.000Z');
    expect(range.end).toBe('2026-03-02T23:59:59.999Z');
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
