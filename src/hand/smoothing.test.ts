/**
 * Unit tests for the One Euro Filter 3D smoothing.
 */
import { describe, it, expect } from 'vitest';
import { OneEuroFilter3D } from './smoothing';

describe('OneEuroFilter3D', () => {
  it('returns initial values on the first frame', () => {
    const filter = new OneEuroFilter3D();
    const result = filter.filter(10, 20, 30, 1000);
    expect(result[0]).toBe(10);
    expect(result[1]).toBe(20);
    expect(result[2]).toBe(30);
  });

  it('smooths out sudden small jitters', () => {
    const filter = new OneEuroFilter3D(1.0, 0.0, 1.0);
    // Baseline at 1000ms
    filter.filter(0, 0, 0, 1000);

    // Minor jitter step at 1033ms (30fps)
    const jittered = filter.filter(1, 1, 1, 1033);
    // Filtered output should be damped (closer to 0 than 1)
    expect(jittered[0]).toBeLessThan(0.8);
    expect(jittered[1]).toBeLessThan(0.8);
    expect(jittered[2]).toBeLessThan(0.8);
  });

  it('converges toward steady state value', () => {
    const filter = new OneEuroFilter3D();
    filter.filter(0, 0, 0, 1000);

    let current: [number, number, number] = [0, 0, 0];
    for (let t = 1033; t <= 2000; t += 33) {
      current = filter.filter(5, 5, 5, t);
    }

    expect(current[0]).toBeCloseTo(5, 0.1);
    expect(current[1]).toBeCloseTo(5, 0.1);
    expect(current[2]).toBeCloseTo(5, 0.1);
  });

  it('resets state correctly', () => {
    const filter = new OneEuroFilter3D();
    filter.filter(10, 10, 10, 1000);
    filter.reset();

    // After reset, first value is returned directly
    const firstAfterReset = filter.filter(50, 50, 50, 2000);
    expect(firstAfterReset[0]).toBe(50);
  });
});
