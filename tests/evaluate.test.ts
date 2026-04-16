import { describe, it, expect } from 'vitest';
import { computeAverages, computeProForma, buildSeededComps } from '@/lib/evaluate';

describe('evaluate utilities', () => {
  it('computeAverages returns sane averages', () => {
    const comps = [
      { platform: 'airbnb', nightlyRate: 200, occupancy: 0.6, cleaningFee: 120 },
      { platform: 'vrbo', nightlyRate: 220, occupancy: 0.5, cleaningFee: 100 },
    ];
    const avg = computeAverages(comps as any);
    expect(avg.averageNightlyRate).toBeCloseTo(210, 1);
    expect(avg.averageOccupancy).toBeCloseTo(0.55, 2);
    expect(avg.averageCleaningFee).toBeCloseTo(110, 1);
  });

  it('computeProForma yields non-negative values', () => {
    const comps = [
      { platform: 'airbnb', nightlyRate: 200, occupancy: 0.6, cleaningFee: 120 },
      { platform: 'vrbo', nightlyRate: 220, occupancy: 0.5, cleaningFee: 100 },
    ];
    const pf = computeProForma(comps as any);
    expect(pf.grossRevenue).toBeGreaterThan(0);
    expect(pf.netOperatingIncome).toBeGreaterThanOrEqual(0);
    expect(pf.operatingExpenses).toBeGreaterThanOrEqual(0);
  });

  it('buildSeededComps is deterministic for a given address', () => {
    const a1 = buildSeededComps('123 Main St');
    const a2 = buildSeededComps('123 Main St');
    expect(a1).toEqual(a2);
  });
});


