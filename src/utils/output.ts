import type { WhoopData } from '../types/whoop.js';
import { formatPretty } from './format.js';

export type OutputFormat = 'json' | 'pretty' | 'auto';

/**
 * Determine effective output format.
 * - 'json' or 'pretty': use as-is
 * - 'auto': pretty if stdout is a TTY, JSON otherwise
 */
export function resolveFormat(format: OutputFormat, isTTY?: boolean): 'json' | 'pretty' {
  if (format === 'json') return 'json';
  if (format === 'pretty') return 'pretty';
  return (isTTY ?? process.stdout.isTTY) ? 'pretty' : 'json';
}

/**
 * Output data in the resolved format.
 */
export function output(data: WhoopData, format: OutputFormat): void {
  const resolved = resolveFormat(format);
  console.log(resolved === 'pretty' ? formatPretty(data) : JSON.stringify(data, null, 2));
}
