/**
 * Returns the local timezone offset as ±HH:MM string.
 * e.g. Argentina (UTC-3) → "-03:00", Japan (UTC+9) → "+09:00"
 */
export function getLocalOffset(): string {
  const offsetMin = new Date().getTimezoneOffset(); // minutes, positive = behind UTC
  const sign = offsetMin <= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return `${sign}${h}:${m}`;
}

export function getWhoopDay(): string {
  return formatDateLocal(new Date());
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Build start/end timestamps for a local calendar day.
 * Uses the system timezone so "2026-03-03" in Argentina (UTC-3)
 * becomes start: "2026-03-03T00:00:00.000-03:00" (= 03:00 UTC).
 */
export function getDateRange(date: string): { start: string; end: string } {
  const offset = getLocalOffset();
  return {
    start: `${date}T00:00:00.000${offset}`,
    end: `${date}T23:59:59.999${offset}`,
  };
}

/**
 * Append local timezone to a bare date for use as a start timestamp.
 */
export function toLocalStart(date: string): string {
  return `${date}T00:00:00.000${getLocalOffset()}`;
}

/**
 * Append local timezone to a bare date for use as an end timestamp.
 */
export function toLocalEnd(date: string): string {
  return `${date}T23:59:59.999${getLocalOffset()}`;
}

export function validateISODate(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;

  const d = new Date(date);
  return !isNaN(d.getTime());
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDateLocal(d);
}
