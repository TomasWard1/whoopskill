import { describe, it, expect } from 'vitest';
import { analyzeTrends, generateInsights, formatTrends, formatInsights } from '../analysis.js';
import type { Insight, TrendData } from '../analysis.js';

function makeRecovery(score: number, hrv: number, rhr: number, daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    cycle_id: 1, sleep_id: '1', user_id: 1,
    created_at: d.toISOString(), updated_at: d.toISOString(),
    score_state: 'SCORED',
    score: { user_calibrating: false, recovery_score: score, resting_heart_rate: rhr, hrv_rmssd_milli: hrv },
  };
}

function makeSleep(perf: number, hoursInBed: number, daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id: 1, user_id: 1, created_at: d.toISOString(), updated_at: d.toISOString(),
    start: '', end: '', timezone_offset: '', nap: false,
    score: {
      stage_summary: {
        total_in_bed_time_milli: hoursInBed * 3600000, total_awake_time_milli: 1800000, total_no_data_time_milli: 0,
        total_light_sleep_time_milli: hoursInBed * 1200000, total_slow_wave_sleep_time_milli: hoursInBed * 600000,
        total_rem_sleep_time_milli: hoursInBed * 600000, sleep_cycle_count: 4, disturbance_count: 2,
      },
      sleep_needed: { baseline_milli: 28800000, need_from_sleep_debt_milli: 3600000, need_from_recent_strain_milli: 0, need_from_recent_nap_milli: 0 },
      respiratory_rate: 15.0, sleep_performance_percentage: perf, sleep_consistency_percentage: 85, sleep_efficiency_percentage: 92,
    },
  };
}

function makeCycle(strain: number, daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id: 1, user_id: 1, created_at: d.toISOString(), updated_at: d.toISOString(),
    start: '', end: '', timezone_offset: '',
    score: { strain, kilojoule: strain * 500, average_heart_rate: 70, max_heart_rate: 150 },
    recovery: { id: 1, score: 70, user_calibrating: false, recovery_score: 70, resting_heart_rate: 60, hrv_rmssd_milli: 40, spo2_percentage: 97, skin_temp_celsius: 33 },
  };
}

describe('analyzeTrends', () => {
  it('returns null stats for empty arrays', () => {
    const result = analyzeTrends([], [], [], 7);
    expect(result.recovery).toBeNull();
    expect(result.hrv).toBeNull();
    expect(result.strain).toBeNull();
    expect(result.period).toBe(7);
  });

  it('computes correct averages', () => {
    const recovery = [makeRecovery(80, 50, 55, 0), makeRecovery(60, 40, 60, 1)] as any;
    const result = analyzeTrends(recovery, [], [], 7);
    expect(result.recovery!.avg).toBe(70);
    expect(result.recovery!.min).toBe(60);
    expect(result.recovery!.max).toBe(80);
    expect(result.recovery!.current).toBe(80);
  });

  it('detects trend direction', () => {
    // Recent values much higher than older → up trend
    const recovery = [
      makeRecovery(90, 50, 55, 0),
      makeRecovery(85, 48, 56, 1),
      makeRecovery(88, 49, 55, 2),
      makeRecovery(60, 35, 62, 3),
      makeRecovery(55, 33, 63, 4),
      makeRecovery(50, 30, 65, 5),
      makeRecovery(52, 31, 64, 6),
    ] as any;
    const result = analyzeTrends(recovery, [], [], 7);
    expect(result.recovery!.trend).toBe('up');
  });
});

describe('generateInsights', () => {
  it('returns green recovery insight for high score', () => {
    const recovery = [makeRecovery(85, 45, 58)] as any;
    const insights = generateInsights(recovery, [], [], []);
    expect(insights.some(i => i.title === 'Green Recovery')).toBe(true);
    expect(insights.some(i => i.level === 'good')).toBe(true);
  });

  it('returns red recovery insight for low score', () => {
    const recovery = [makeRecovery(20, 25, 70)] as any;
    const insights = generateInsights(recovery, [], [], []);
    expect(insights.some(i => i.title === 'Red Recovery')).toBe(true);
    expect(insights.some(i => i.level === 'critical')).toBe(true);
  });

  it('detects significant sleep debt (>2h)', () => {
    const recovery = [makeRecovery(70, 40, 60)] as any;
    // Override sleep_needed to have >2h debt
    const sleep = [makeSleep(60, 5)] as any;
    sleep[0].score.sleep_needed.need_from_sleep_debt_milli = 8000000; // ~2.2h
    const insights = generateInsights(recovery, sleep, [], []);
    expect(insights.some(i => i.title === 'Significant Sleep Debt')).toBe(true);
  });

  it('suggests workout on green recovery with no workouts', () => {
    const recovery = [makeRecovery(85, 45, 58)] as any;
    const cycle = [makeCycle(0.5)] as any;
    const insights = generateInsights(recovery, [], cycle, []);
    expect(insights.some(i => i.title === 'No Workout Yet')).toBe(true);
  });

  it('returns empty array for empty data', () => {
    const insights = generateInsights([], [], [], []);
    expect(insights).toEqual([]);
  });
});

describe('formatTrends', () => {
  const trendData: TrendData = {
    period: 7,
    recovery: { avg: 65, min: 40, max: 85, current: 72, trend: 'up', values: [] },
    hrv: { avg: 42, min: 30, max: 55, current: 45, trend: 'stable', values: [] },
    rhr: null,
    sleepPerformance: null,
    sleepHours: null,
    strain: null,
  };

  it('returns JSON when pretty=false', () => {
    const result = formatTrends(trendData, false);
    expect(JSON.parse(result)).toEqual(trendData);
  });

  it('returns formatted text when pretty=true', () => {
    const result = formatTrends(trendData, true);
    expect(result).toContain('7-Day Trends');
    expect(result).toContain('Recovery: 65%');
    expect(result).toContain('↑');
    expect(result).toContain('HRV: 42ms');
    expect(result).toContain('→');
  });
});

describe('formatInsights', () => {
  const insights: Insight[] = [
    { category: 'recovery', level: 'good', title: 'Green Recovery', message: 'Recovery at 85%', action: 'Train hard' },
    { category: 'sleep', level: 'warning', title: 'Mild Sleep Debt', message: '1.5h debt' },
  ];

  it('returns JSON when pretty=false', () => {
    const result = formatInsights(insights, false);
    expect(JSON.parse(result)).toEqual(insights);
  });

  it('returns formatted text when pretty=true', () => {
    const result = formatInsights(insights, true);
    expect(result).toContain('✅ Green Recovery');
    expect(result).toContain('⚠️ Mild Sleep Debt');
    expect(result).toContain('→ Train hard');
  });

  it('returns healthy message for empty insights', () => {
    const result = formatInsights([], true);
    expect(result).toContain('all metrics look healthy');
  });
});
