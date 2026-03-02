import { describe, it, expect } from 'vitest';
import { formatSummary, formatSummaryColor, formatPretty, extractSummary } from '../format.js';
import type { WhoopData } from '../../types/whoop.js';

function makeData(overrides: Partial<WhoopData> = {}): WhoopData {
  return {
    date: '2026-01-15',
    fetched_at: '2026-01-15T12:00:00.000Z',
    ...overrides,
  };
}

const mockRecovery = [{
  cycle_id: 1, sleep_id: '1', user_id: 1, created_at: '', updated_at: '', score_state: 'SCORED',
  score: { user_calibrating: false, recovery_score: 72, resting_heart_rate: 58, hrv_rmssd_milli: 45.2 },
}];

const mockSleep = [{
  id: 1, user_id: 1, created_at: '', updated_at: '', start: '', end: '', timezone_offset: '', nap: false,
  score: {
    stage_summary: {
      total_in_bed_time_milli: 28800000, total_awake_time_milli: 3600000, total_no_data_time_milli: 0,
      total_light_sleep_time_milli: 10800000, total_slow_wave_sleep_time_milli: 5400000,
      total_rem_sleep_time_milli: 9000000, sleep_cycle_count: 5, disturbance_count: 2,
    },
    sleep_needed: { baseline_milli: 28800000, need_from_sleep_debt_milli: 0, need_from_recent_strain_milli: 0, need_from_recent_nap_milli: 0 },
    respiratory_rate: 15.0, sleep_performance_percentage: 88, sleep_consistency_percentage: 90, sleep_efficiency_percentage: 93,
  },
}];

const mockCycle = [{
  id: 1, user_id: 1, created_at: '', updated_at: '', start: '', end: '', timezone_offset: '',
  score: { strain: 12.5, kilojoule: 8500, average_heart_rate: 75, max_heart_rate: 165 },
  recovery: { id: 1, score: 72, user_calibrating: false, recovery_score: 72, resting_heart_rate: 58, hrv_rmssd_milli: 45, spo2_percentage: 97, skin_temp_celsius: 33 },
}];

const mockWorkout = [{
  id: '1', user_id: 1, created_at: '', updated_at: '', start: '', end: '', timezone_offset: '',
  sport_id: 1, sport_name: 'Running', score_state: 'SCORED',
  score: { strain: 8.5, average_heart_rate: 145, max_heart_rate: 172, kilojoule: 2500 },
}];

describe('formatSummary', () => {
  it('returns date with no data message when empty', () => {
    const result = formatSummary(makeData());
    expect(result).toBe('2026-01-15 | No data');
  });

  it('includes recovery, sleep, strain, workout count', () => {
    const result = formatSummary(makeData({
      recovery: mockRecovery as any,
      sleep: mockSleep as any,
      cycle: mockCycle as any,
      workout: mockWorkout as any,
    }));
    expect(result).toContain('Recovery: 72%');
    expect(result).toContain('HRV: 45ms');
    expect(result).toContain('Sleep: 88%');
    expect(result).toContain('Strain: 12.5');
    expect(result).toContain('Workouts: 1');
  });

  it('uses pipe separator', () => {
    const result = formatSummary(makeData({ recovery: mockRecovery as any }));
    expect(result).toMatch(/2026-01-15 \| Recovery: 72% \| HRV: 45ms \| RHR: 58/);
  });
});

describe('formatSummaryColor', () => {
  it('shows green for high recovery', () => {
    const result = formatSummaryColor(makeData({ recovery: mockRecovery as any }));
    expect(result).toContain('🟢');
    expect(result).toContain('Recovery: 72%');
  });

  it('includes date header', () => {
    const result = formatSummaryColor(makeData());
    expect(result).toContain('📅 2026-01-15');
  });
});

describe('formatPretty', () => {
  it('starts with date', () => {
    const result = formatPretty(makeData());
    expect(result).toContain('📅 2026-01-15');
  });

  it('formats all data types', () => {
    const result = formatPretty(makeData({
      profile: { user_id: 1, email: 'test@test.com', first_name: 'John', last_name: 'Doe' },
      body: { height_meter: 1.83, weight_kilogram: 82, max_heart_rate: 185 },
      recovery: mockRecovery as any,
      sleep: mockSleep as any,
      cycle: mockCycle as any,
      workout: mockWorkout as any,
    }));
    expect(result).toContain('John Doe');
    expect(result).toContain('1.83m');
    expect(result).toContain('Recovery: 72%');
    expect(result).toContain('Sleep: 88%');
    expect(result).toContain('Running');
    expect(result).toContain('Day strain: 12.5');
  });
});

describe('extractSummary', () => {
  it('returns date for empty data', () => {
    const result = extractSummary(makeData());
    expect(result).toEqual({ date: '2026-01-15' });
  });

  it('extracts flat summary from full data', () => {
    const result = extractSummary(makeData({
      recovery: mockRecovery as any,
      sleep: mockSleep as any,
      cycle: mockCycle as any,
      workout: mockWorkout as any,
    }));
    expect(result.date).toBe('2026-01-15');
    expect(result.recovery_score).toBe(72);
    expect(result.hrv_rmssd_milli).toBe(45.2);
    expect(result.resting_heart_rate).toBe(58);
    expect(result.sleep_performance).toBe(88);
    expect(result.sleep_hours).toBe(8);
    expect(result.sleep_efficiency).toBe(93);
    expect(result.strain).toBe(12.5);
    expect(result.workout_count).toBe(1);
  });

  it('result is JSON-serializable', () => {
    const result = extractSummary(makeData({
      recovery: mockRecovery as any,
      sleep: mockSleep as any,
    }));
    const parsed = JSON.parse(JSON.stringify(result));
    expect(parsed.recovery_score).toBe(72);
    expect(parsed.sleep_performance).toBe(88);
  });
});
