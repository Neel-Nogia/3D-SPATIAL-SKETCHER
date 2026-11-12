/**
 * Snap utility functions.
 * Rounds values to the nearest grid step when snapping is enabled.
 */
import type { Vec3 } from '../types/scene';

/** Snap a single number to the nearest grid step */
export function snapValue(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/** Snap a Vec3 to the nearest grid step on all axes */
export function snapVec3(vec: Vec3, gridSize: number): Vec3 {
  return [
    snapValue(vec[0], gridSize),
    snapValue(vec[1], gridSize),
    snapValue(vec[2], gridSize),
  ];
}

/** Snap a rotation in radians to the nearest step (e.g. 15 degrees = π/12) */
export function snapRotation(radians: number, stepDegrees: number = 15): number {
  const stepRadians = (stepDegrees * Math.PI) / 180;
  return Math.round(radians / stepRadians) * stepRadians;
}
