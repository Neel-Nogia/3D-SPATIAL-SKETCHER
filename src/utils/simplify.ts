/**
 * Ramer-Douglas-Peucker line simplification algorithm.
 * Reduces the number of points in a polyline while preserving its shape.
 *
 * How it works:
 * 1. Draw a line from the first to the last point.
 * 2. Find the point farthest from that line.
 * 3. If it's farther than `epsilon`, split there and recurse on both halves.
 * 4. Otherwise, discard all points between the first and last.
 *
 * @param points - Array of 3D points [x, y, z]
 * @param epsilon - Maximum allowed distance from the simplified line (default 0.05)
 * @returns Simplified array of 3D points
 */
import type { Vec3 } from '../types/scene';

/**
 * Calculate the perpendicular distance from a point to a line segment.
 */
function perpendicularDistance(point: Vec3, lineStart: Vec3, lineEnd: Vec3): number {
  // Vector from lineStart to lineEnd
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const dz = lineEnd[2] - lineStart[2];

  const lineLengthSq = dx * dx + dy * dy + dz * dz;

  // If start and end are the same point, return distance to that point
  if (lineLengthSq === 0) {
    const px = point[0] - lineStart[0];
    const py = point[1] - lineStart[1];
    const pz = point[2] - lineStart[2];
    return Math.sqrt(px * px + py * py + pz * pz);
  }

  // Project point onto the line, clamping t to [0, 1]
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - lineStart[0]) * dx +
        (point[1] - lineStart[1]) * dy +
        (point[2] - lineStart[2]) * dz) /
        lineLengthSq
    )
  );

  // Closest point on the segment
  const closestX = lineStart[0] + t * dx;
  const closestY = lineStart[1] + t * dy;
  const closestZ = lineStart[2] + t * dz;

  // Distance from point to closest point on segment
  const ex = point[0] - closestX;
  const ey = point[1] - closestY;
  const ez = point[2] - closestZ;

  return Math.sqrt(ex * ex + ey * ey + ez * ez);
}

export function simplifyPoints(points: Vec3[], epsilon: number = 0.05): Vec3[] {
  if (points.length <= 2) return points;

  // Find the point with the maximum distance from the line (first -> last)
  let maxDist = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  // If the max distance is greater than epsilon, recursively simplify
  if (maxDist > epsilon) {
    const left = simplifyPoints(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyPoints(points.slice(maxIndex), epsilon);
    // Combine, removing the duplicate point at the junction
    return [...left.slice(0, -1), ...right];
  }

  // Otherwise, only keep the endpoints
  return [first, last];
}

// Also export for testing
export { perpendicularDistance };
