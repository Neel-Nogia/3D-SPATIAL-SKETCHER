/**
 * Unit tests for the snap utility (snap.ts).
 */
import { describe, it, expect } from 'vitest';
import { snapValue, snapVec3, snapRotation } from './snap';

describe('snapValue', () => {
  it('snaps to the nearest grid step', () => {
    expect(snapValue(0.27, 0.25)).toBeCloseTo(0.25);
    expect(snapValue(0.37, 0.25)).toBeCloseTo(0.25);
    expect(snapValue(0.38, 0.25)).toBeCloseTo(0.5);
  });

  it('snaps exact values correctly', () => {
    expect(snapValue(1.0, 0.5)).toBeCloseTo(1.0);
    expect(snapValue(0.5, 0.5)).toBeCloseTo(0.5);
  });

  it('snaps negative values', () => {
    expect(snapValue(-0.3, 0.5)).toBeCloseTo(-0.5);
    expect(snapValue(-0.1, 0.5)).toBeCloseTo(0);
  });

  it('snaps with grid size 1', () => {
    expect(snapValue(1.4, 1)).toBe(1);
    expect(snapValue(1.6, 1)).toBe(2);
  });
});

describe('snapVec3', () => {
  it('snaps all three components', () => {
    const result = snapVec3([0.27, 0.73, 1.1], 0.5);
    expect(result[0]).toBeCloseTo(0.5);
    expect(result[1]).toBeCloseTo(0.5);
    expect(result[2]).toBeCloseTo(1.0);
  });
});

describe('snapRotation', () => {
  it('snaps to 15-degree increments', () => {
    const deg15 = Math.PI / 12;
    expect(snapRotation(deg15 * 0.4)).toBeCloseTo(0);
    expect(snapRotation(deg15 * 0.6)).toBeCloseTo(deg15);
    expect(snapRotation(deg15 * 2.1)).toBeCloseTo(deg15 * 2);
  });

  it('snaps to custom degree increments', () => {
    const deg45 = Math.PI / 4;
    expect(snapRotation(deg45 * 0.6, 45)).toBeCloseTo(deg45);
  });
});
