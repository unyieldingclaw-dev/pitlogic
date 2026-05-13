import { describe, it, expect } from 'vitest';
import { totalStats, cooksByMonth, stallPrediction, computeClimbRate, computeETA, computeStallProbability, buildAverageCurve, buildCompareCurves } from '../analytics';

const makeCook = (overrides = {}) => ({
  id: '1', status: 'complete', cut: 'Brisket', meat: 'Beef',
  startTime: Date.now() - 3600000 * 8, endTime: Date.now(),
  rating: 4, pellet: 'Hickory',
  probes: [{ readings: [] }],
  ...overrides,
});

describe('totalStats', () => {
  it('returns zeros for empty array', () => {
    const s = totalStats([]);
    expect(s.total).toBe(0);
    expect(s.totalHours).toBe(0);
    expect(s.favCut).toBe('—');
  });

  it('counts only complete cooks', () => {
    const cooks = [makeCook(), makeCook({ status: 'active', endTime: null })];
    expect(totalStats(cooks).total).toBe(1);
  });

  it('calculates totalHours correctly', () => {
    const start = Date.now() - 3600000 * 4;
    const end = Date.now();
    const s = totalStats([makeCook({ startTime: start, endTime: end })]);
    expect(s.totalHours).toBeCloseTo(4, 0);
  });

  it('finds favorite cut', () => {
    const cooks = [
      makeCook({ cut: 'Brisket' }), makeCook({ cut: 'Brisket' }), makeCook({ cut: 'Ribs' }),
    ];
    expect(totalStats(cooks).favCut).toBe('Brisket');
  });

  it('calculates average rating', () => {
    const cooks = [makeCook({ rating: 4 }), makeCook({ rating: 5 })];
    expect(parseFloat(totalStats(cooks).avgRating)).toBeCloseTo(4.5, 1);
  });
});

describe('cooksByMonth', () => {
  it('returns 12 months', () => {
    expect(cooksByMonth([]).length).toBe(12);
  });

  it('counts cooks in correct month bucket', () => {
    const now = Date.now();
    const result = cooksByMonth([makeCook({ startTime: now }), makeCook({ status: 'active', endTime: null, startTime: now })]);
    const thisMonth = result[result.length - 1];
    expect(thisMonth.count).toBe(1); // only complete cook
  });
});

describe('stallPrediction', () => {
  it('returns null with fewer than 2 matching cooks', () => {
    expect(stallPrediction([], 'Brisket')).toBeNull();
    expect(stallPrediction([makeCook()], 'Brisket')).toBeNull();
  });

  it('returns null when no stall detected in readings', () => {
    const cook = makeCook({ probes: [{ readings: [{ time: 0, temp: 100 }, { time: 60, temp: 200 }] }] });
    expect(stallPrediction([cook, cook], 'Brisket')).toBeNull();
  });

  it('detects a stall and returns prediction when conditions are met', () => {
    // Stall algorithm: window of 4 readings where range < 8, tdiff >= 18, temps[0] in [140,185]
    // readings[5] and [6]: window=[10,85,110,135], range=2, tdiff=125>=18, temps[0]=158 in range ✓
    const stallReadings = [
      { time: 0,   temp: 100 },
      { time: 5,   temp: 130 },
      { time: 10,  temp: 158 },
      { time: 85,  temp: 160 },
      { time: 110, temp: 159 },
      { time: 135, temp: 160 },
    ];
    const cook = makeCook({ probes: [{ readings: stallReadings }] });
    const result = stallPrediction([cook, cook], 'Brisket');
    expect(result).not.toBeNull();
    expect(result.avgTemp).toBeGreaterThanOrEqual(140);
    expect(result.avgTemp).toBeLessThanOrEqual(185);
    expect(result.sampleSize).toBe(2);
  });
});

describe('computeClimbRate', () => {
  it('returns null with fewer than 2 readings', () => {
    expect(computeClimbRate([])).toBeNull();
    expect(computeClimbRate([{ time: 0, temp: 100 }])).toBeNull();
  });

  it('returns null when all readings are at the same time', () => {
    const flat = [{ time: 10, temp: 150 }, { time: 10, temp: 155 }, { time: 10, temp: 160 }];
    expect(computeClimbRate(flat)).toBeNull();
  });

  it('calculates positive climb rate', () => {
    // 10°F rise over 10 minutes = 1°F/min = 60°F/hr
    const readings = [
      { time: 0, temp: 100 },
      { time: 5, temp: 105 },
      { time: 10, temp: 110 },
    ];
    const rate = computeClimbRate(readings);
    expect(rate).toBeCloseTo(60, 0);
  });

  it('returns negative rate when cooling', () => {
    const readings = [
      { time: 0, temp: 200 },
      { time: 10, temp: 190 },
      { time: 20, temp: 180 },
    ];
    const rate = computeClimbRate(readings);
    expect(rate).toBeLessThan(0);
  });

  it('uses only last 6 readings', () => {
    // First reading drops steeply, last 6 are flat — rate should be near 0
    const readings = [
      { time: 0, temp: 50 },
      { time: 1, temp: 100 },
      { time: 10, temp: 150 },
      { time: 20, temp: 151 },
      { time: 30, temp: 151 },
      { time: 40, temp: 152 },
      { time: 50, temp: 151 },
      { time: 60, temp: 152 },
    ];
    const rate = computeClimbRate(readings);
    expect(Math.abs(rate)).toBeLessThan(5);
  });
});

describe('computeETA', () => {
  it('returns null for empty readings', () => {
    expect(computeETA([], 203)).toBeNull();
    expect(computeETA(null, 203)).toBeNull();
  });

  it('returns 0 when already at or above target', () => {
    const readings = [{ time: 0, temp: 200 }, { time: 10, temp: 205 }];
    expect(computeETA(readings, 203)).toBe(0);
  });

  it('returns null when rate is non-positive', () => {
    const readings = [{ time: 0, temp: 200 }, { time: 10, temp: 195 }];
    expect(computeETA(readings, 203)).toBeNull();
  });

  it('calculates ETA correctly', () => {
    // 60°F/hr climb rate, 10°F to go → 10 minutes
    const readings = [
      { time: 0, temp: 100 },
      { time: 5, temp: 105 },
      { time: 10, temp: 110 },
    ];
    const eta = computeETA(readings, 120);
    // 120 - 110 = 10°F remaining, rate ~60°F/hr → 10/60*60 = 10 min
    expect(eta).toBeCloseTo(10, 0);
  });
});

describe('computeStallProbability', () => {
  it('returns low for empty/short readings', () => {
    expect(computeStallProbability([])).toEqual({ level: 'low', label: 'Normal', pct: 0 });
    expect(computeStallProbability([{ time: 0, temp: 160 }])).toEqual({ level: 'low', label: 'Normal', pct: 0 });
  });

  it('returns low when temp outside stall zone', () => {
    const readings = [{ time: 0, temp: 100 }, { time: 10, temp: 105 }];
    expect(computeStallProbability(readings).level).toBe('low');
    const hot = [{ time: 0, temp: 200 }, { time: 10, temp: 205 }];
    expect(computeStallProbability(hot).level).toBe('low');
  });

  it('detects confirmed stall', () => {
    const readings = [
      { time: 0, temp: 160 },
      { time: 10, temp: 161 },
      { time: 25, temp: 162 },
      { time: 40, temp: 161 },
    ];
    const result = computeStallProbability(readings);
    expect(result.level).toBe('stall');
    expect(result.pct).toBe(100);
  });

  it('detects approaching stall via 3-reading window', () => {
    const readings = [
      { time: 0, temp: 155 },
      { time: 10, temp: 156 },
      { time: 25, temp: 157 },
    ];
    const result = computeStallProbability(readings);
    expect(result.level).toBe('approaching');
    expect(result.pct).toBe(50);
  });

  it('returns approaching when climb rate is slow and positive in stall zone', () => {
    const readings = [
      { time: 0, temp: 160 },
      { time: 60, temp: 161 },
    ];
    const result = computeStallProbability(readings);
    expect(result.level).toBe('approaching');
  });

  it('returns low when rate is negative in stall zone', () => {
    const readings = [
      { time: 0, temp: 165 },
      { time: 30, temp: 163 },
    ];
    const result = computeStallProbability(readings);
    expect(result.level).toBe('low');
  });
});

describe('buildAverageCurve', () => {
  const makeReadings = (points) => points.map(([time, temp]) => ({ time, temp }));

  it('returns null with fewer than 2 matching cooks', () => {
    expect(buildAverageCurve([], 'Brisket')).toBeNull();
    const one = makeCook({ cut: 'Brisket', probes: [{ readings: makeReadings([[0, 150], [60, 180]]) }] });
    expect(buildAverageCurve([one], 'Brisket')).toBeNull();
  });

  it('returns null for wrong cut', () => {
    const cook = makeCook({ cut: 'Ribs', probes: [{ readings: makeReadings([[0, 150], [60, 180]]) }] });
    expect(buildAverageCurve([cook, cook], 'Brisket')).toBeNull();
  });

  it('returns curve with sampleSize for 2 matching cooks', () => {
    const cook = makeCook({
      cut: 'Brisket',
      probes: [{ readings: makeReadings([[0, 150], [30, 165], [60, 180]]) }],
    });
    const result = buildAverageCurve([cook, cook], 'Brisket');
    expect(result).not.toBeNull();
    expect(result.sampleSize).toBe(2);
    expect(result.curve.length).toBeGreaterThan(0);
  });

  it('curve points have required shape', () => {
    const cook = makeCook({
      cut: 'Brisket',
      probes: [{ readings: makeReadings([[0, 150], [30, 165], [60, 180]]) }],
    });
    const result = buildAverageCurve([cook, cook], 'Brisket');
    const point = result.curve[0];
    expect(point).toHaveProperty('time');
    expect(point).toHaveProperty('avg');
    expect(point).toHaveProperty('upper');
    expect(point).toHaveProperty('lower');
    expect(point).toHaveProperty('n');
  });

  it('upper >= avg >= lower', () => {
    const cook = makeCook({
      cut: 'Brisket',
      probes: [{ readings: makeReadings([[0, 150], [30, 165], [60, 180]]) }],
    });
    const result = buildAverageCurve([cook, cook], 'Brisket');
    for (const pt of result.curve) {
      expect(pt.upper).toBeGreaterThanOrEqual(pt.avg);
      expect(pt.avg).toBeGreaterThanOrEqual(pt.lower);
    }
  });
});

describe('buildCompareCurves', () => {
  const makeReadings = pts => pts.map(([time, temp]) => ({ time, temp }));
  const makeC = (id, overrides = {}) => ({
    id,
    probes: [{ name: 'Meat', readings: [] }],
    ...overrides,
  });

  it('returns array of same length as input', () => {
    const c1 = makeC('1', { probes: [{ name: 'Meat', readings: makeReadings([[0,150],[30,165],[60,180]]) }] });
    const c2 = makeC('2', { probes: [{ name: 'Meat', readings: makeReadings([[0,145],[30,160],[60,175]]) }] });
    expect(buildCompareCurves([c1, c2], 0).length).toBe(2);
  });

  it('returns points: null when probe slot is missing', () => {
    const cook = makeC('1', { probes: [{ name: 'Meat', readings: makeReadings([[0,150],[30,180]]) }] });
    const result = buildCompareCurves([cook], 1); // probeIndex 1 doesn't exist
    expect(result[0].points).toBeNull();
  });

  it('returns points: null when fewer than 2 readings', () => {
    const cook = makeC('1', { probes: [{ name: 'Meat', readings: [{ time: 0, temp: 150 }] }] });
    const result = buildCompareCurves([cook], 0);
    expect(result[0].points).toBeNull();
  });

  it('cookId matches cook.id', () => {
    const cook = makeC('abc123', { probes: [{ name: 'Meat', readings: makeReadings([[0,150],[30,180]]) }] });
    expect(buildCompareCurves([cook], 0)[0].cookId).toBe('abc123');
  });

  it('interpolates at 15-min buckets', () => {
    // t=0: 150°, t=30: 180° — linear, so t=15 should be 165°
    const cook = makeC('1', { probes: [{ name: 'Meat', readings: makeReadings([[0,150],[30,180]]) }] });
    const result = buildCompareCurves([cook], 0);
    const pt = result[0].points?.find(p => p.t === 15);
    expect(pt).toBeDefined();
    expect(pt.temp).toBeCloseTo(165, 1);
  });

  it('stops at last reading time', () => {
    // readings end at t=45, so no bucket at t=60
    const cook = makeC('1', { probes: [{ name: 'Meat', readings: makeReadings([[0,150],[30,165],[45,172]]) }] });
    const result = buildCompareCurves([cook], 0);
    expect(result[0].points?.every(p => p.t <= 45)).toBe(true);
  });
});
