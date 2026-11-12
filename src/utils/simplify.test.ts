/**
 * Unit tests for the RDP simplification algorithm (simplify.ts).
 */
import { describe, it, expect } from 'vitest';
import { simplifyPoints, perpendicularDistance } from './simplify';
import type { Vec3 } from '../types/scene';

describe('perpendicularDistance', () => {
  it('returns 0 for a point on the line', () => {
    const dist = perpendicularDistance([1, 0, 0], [0, 0, 0], [2, 0, 0]);
    expect(dist).toBeCloseTo(0);
  });

  it('returns correct distance for a point perpendicular to the line', () => {
    const dist = perpendicularDistance([1, 1, 0], [0, 0, 0], [2, 0, 0]);
    expect(dist).toBeCloseTo(1);
  });

  it('returns distance to start when start equals end', () => {
    const dist = perpendicularDistance([3, 4, 0], [0, 0, 0], [0, 0, 0]);
    expect(dist).toBeCloseTo(5);
  });

  it('works in 3D', () => {
    // Point at [0, 0, 1] is 1 unit away from the X-axis line
    const dist = perpendicularDistance([0, 0, 1], [0, 0, 0], [1, 0, 0]);
    expect(dist).toBeCloseTo(1);
  });
});

describe('simplifyPoints', () => {
  it('returns the same array for 0, 1, or 2 points', () => {
    expect(simplifyPoints([])).toEqual([]);
    expect(simplifyPoints([[0, 0, 0]])).toEqual([[0, 0, 0]]);
    expect(simplifyPoints([[0, 0, 0], [1, 1, 1]])).toEqual([[0, 0, 0], [1, 1, 1]]);
  });

  it('keeps endpoints of a straight line', () => {
    const points: Vec3[] = [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [3, 0, 0],
    ];
    const result = simplifyPoints(points, 0.01);
    expect(result).toEqual([[0, 0, 0], [3, 0, 0]]);
  });

  it('keeps a point that deviates significantly', () => {
    const points: Vec3[] = [
      [0, 0, 0],
      [1, 5, 0],  // big deviation
      [2, 0, 0],
    ];
    const result = simplifyPoints(points, 0.1);
    expect(result.length).toBe(3);
    expect(result[1]).toEqual([1, 5, 0]);
  });

  it('removes points within epsilon of the line', () => {
    const points: Vec3[] = [
      [0, 0, 0],
      [1, 0.01, 0],  // tiny deviation
      [2, 0, 0],
    ];
    const result = simplifyPoints(points, 0.1);
    expect(result).toEqual([[0, 0, 0], [2, 0, 0]]);
  });

  it('handles a complex curve with mixed deviations', () => {
    const points: Vec3[] = [
      [0, 0, 0],
      [1, 1.51, 0],  // along chord (0,0)->(2,3), within epsilon
      [2, 3, 0],     // keep (peak vertex)
      [3, 1.49, 0],  // along chord (2,3)->(4,0), within epsilon
      [4, 0, 0],
    ];
    const result = simplifyPoints(points, 0.1);
    expect(result.length).toBe(3);
    expect(result).toEqual([[0, 0, 0], [2, 3, 0], [4, 0, 0]]);
  });
});
