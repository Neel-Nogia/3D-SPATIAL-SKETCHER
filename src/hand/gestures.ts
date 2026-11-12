/**
 * Pure functions for detecting hand gestures from 21 MediaPipe hand landmarks.
 * Landmarks are normalized [x, y, z] coordinates where:
 * - x: [0, 1] left to right
 * - y: [0, 1] top to bottom
 * - z: depth relative to wrist
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type GestureType =
  | 'pinch'
  | 'open_palm'
  | 'fist'
  | 'thumbs_up'
  | 'idle';

export interface GestureDetectionResult {
  gesture: GestureType;
  normPinchDistance: number;
  isPinching: boolean;
  handSize: number;
  palmCenter: { x: number; y: number; z: number };
}

/** 3D Euclidean distance between two landmarks */
export function landmarkDist(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Check if a non-thumb finger is extended away from wrist */
export function isFingerExtended(
  tip: Landmark,
  pip: Landmark,
  wrist: Landmark,
): boolean {
  return landmarkDist(tip, wrist) > landmarkDist(pip, wrist) * 1.1;
}

/** Check if thumb is extended */
export function isThumbExtended(
  thumbTip: Landmark,
  thumbMcp: Landmark,
  wrist: Landmark,
): boolean {
  return landmarkDist(thumbTip, wrist) > landmarkDist(thumbMcp, wrist) * 1.15;
}

/**
 * Detect gesture from 21 landmarks.
 * Uses hysteresis to prevent pinch flicker when hovering near threshold:
 * - Start pinch if normDist < startThreshold (default 0.38)
 * - Keep pinch active until normDist > releaseThreshold (default 0.55)
 */
export function detectGesture(
  landmarks: Landmark[],
  wasPinching: boolean = false,
  startThreshold: number = 0.38,
  releaseThreshold: number = 0.55,
): GestureDetectionResult {
  if (landmarks.length < 21) {
    return {
      gesture: 'idle',
      normPinchDistance: 1.0,
      isPinching: false,
      handSize: 1.0,
      palmCenter: { x: 0.5, y: 0.5, z: 0 },
    };
  }

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const middleMcp = landmarks[9];
  const middleTip = landmarks[12];
  const middlePip = landmarks[10];
  const ringTip = landmarks[16];
  const ringPip = landmarks[14];
  const pinkyTip = landmarks[20];
  const pinkyPip = landmarks[18];

  // Palm center approximation (average of wrist and middle MCP)
  const palmCenter = {
    x: (wrist.x + middleMcp.x) / 2,
    y: (wrist.y + middleMcp.y) / 2,
    z: ((wrist.z ?? 0) + (middleMcp.z ?? 0)) / 2,
  };

  // Hand reference size (wrist to middle MCP distance)
  const handSize = Math.max(1e-4, landmarkDist(wrist, middleMcp));

  // Normalized pinch distance
  const pinchDist = landmarkDist(thumbTip, indexTip);
  const normPinchDistance = pinchDist / handSize;

  // Hysteresis threshold check
  const threshold = wasPinching ? releaseThreshold : startThreshold;
  const isPinching = normPinchDistance < threshold;

  // Check finger extension states
  const indexExt = isFingerExtended(indexTip, indexPip, wrist);
  const middleExt = isFingerExtended(middleTip, middlePip, wrist);
  const ringExt = isFingerExtended(ringTip, ringPip, wrist);
  const pinkyExt = isFingerExtended(pinkyTip, pinkyPip, wrist);
  const thumbExt = isThumbExtended(thumbTip, thumbMcp, wrist);

  const allFingersCurled = !indexExt && !middleExt && !ringExt && !pinkyExt;

  // 1. THUMBS UP: thumb extended upward, all 4 fingers curled
  const isThumbUpward = thumbTip.y < thumbMcp.y && thumbTip.y < wrist.y;
  if (thumbExt && isThumbUpward && allFingersCurled) {
    return {
      gesture: 'thumbs_up',
      normPinchDistance,
      isPinching: false,
      handSize,
      palmCenter,
    };
  }

  // 2. FIST: all 4 fingers curled
  if (allFingersCurled) {
    return {
      gesture: 'fist',
      normPinchDistance,
      isPinching: false,
      handSize,
      palmCenter,
    };
  }

  // 3. PINCH: thumb and index tips are close
  if (isPinching) {
    return {
      gesture: 'pinch',
      normPinchDistance,
      isPinching: true,
      handSize,
      palmCenter,
    };
  }

  // 4. OPEN PALM: all 5 fingers extended and thumb not pinched
  if (indexExt && middleExt && ringExt && pinkyExt && thumbExt) {
    return {
      gesture: 'open_palm',
      normPinchDistance,
      isPinching: false,
      handSize,
      palmCenter,
    };
  }

  return {
    gesture: 'idle',
    normPinchDistance,
    isPinching: false,
    handSize,
    palmCenter,
  };
}
