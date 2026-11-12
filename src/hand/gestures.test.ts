/**
 * Unit tests for gesture detection and hysteresis logic.
 */
import { describe, it, expect } from 'vitest';
import { detectGesture, type Landmark } from './gestures';

/** Creates a synthetic landmark array with default wrist at (0.5, 0.8, 0) and middle MCP at (0.5, 0.5, 0) */
function createBaseHand(): Landmark[] {
  const landmarks: Landmark[] = [];
  for (let i = 0; i < 21; i++) {
    landmarks.push({ x: 0.5, y: 0.5, z: 0 });
  }
  // 0: Wrist
  landmarks[0] = { x: 0.5, y: 0.8, z: 0 };
  // 9: Middle MCP
  landmarks[9] = { x: 0.5, y: 0.5, z: 0 };
  return landmarks;
}

describe('Gesture Detection', () => {
  it('detects a pinch gesture when thumb and index tips are close', () => {
    const hand = createBaseHand();
    // Hand size is dist([0.5, 0.8], [0.5, 0.5]) = 0.3
    // Set thumb tip (4) and index tip (8) very close
    hand[4] = { x: 0.45, y: 0.3, z: 0 };
    hand[8] = { x: 0.46, y: 0.3, z: 0 };

    const result = detectGesture(hand, false);
    expect(result.isPinching).toBe(true);
    expect(result.gesture).toBe('pinch');
  });

  it('handles hysteresis correctly at borderline pinch distance', () => {
    const hand = createBaseHand();
    // Hand size is 0.3
    // We want a distance that corresponds to normDist ~0.45 (between start 0.38 and release 0.55)
    // 0.45 * 0.3 = 0.135
    hand[4] = { x: 0.4, y: 0.3, z: 0 };
    hand[8] = { x: 0.4 + 0.135, y: 0.3, z: 0 };

    // When NOT previously pinching, normDist=0.45 > 0.38 -> Should NOT start pinch
    const notPinching = detectGesture(hand, false);
    expect(notPinching.isPinching).toBe(false);

    // When PREVIOUSLY pinching, normDist=0.45 < 0.55 -> Should MAINTAIN pinch
    const wasPinching = detectGesture(hand, true);
    expect(wasPinching.isPinching).toBe(true);
  });

  it('detects an open palm when all 5 fingers are extended', () => {
    const hand = createBaseHand();
    // Wrist at (0.5, 0.8)
    // Extend all fingertips far from wrist
    hand[2] = { x: 0.3, y: 0.7, z: 0 }; // thumb MCP
    hand[4] = { x: 0.2, y: 0.4, z: 0 }; // thumb tip

    hand[6] = { x: 0.4, y: 0.5, z: 0 }; // index PIP
    hand[8] = { x: 0.4, y: 0.2, z: 0 }; // index tip

    hand[10] = { x: 0.5, y: 0.4, z: 0 }; // middle PIP
    hand[12] = { x: 0.5, y: 0.15, z: 0 }; // middle tip

    hand[14] = { x: 0.6, y: 0.5, z: 0 }; // ring PIP
    hand[16] = { x: 0.6, y: 0.2, z: 0 }; // ring tip

    hand[18] = { x: 0.7, y: 0.55, z: 0 }; // pinky PIP
    hand[20] = { x: 0.7, y: 0.3, z: 0 }; // pinky tip

    const result = detectGesture(hand, false);
    expect(result.gesture).toBe('open_palm');
  });

  it('detects a fist when all four fingers are curled towards palm', () => {
    const hand = createBaseHand();
    // Wrist at (0.5, 0.8)
    // Curled fingers: tip closer to wrist than PIP or very near MCP
    hand[6] = { x: 0.45, y: 0.5, z: 0 };
    hand[8] = { x: 0.45, y: 0.6, z: 0 }; // tip closer to wrist

    hand[10] = { x: 0.5, y: 0.48, z: 0 };
    hand[12] = { x: 0.5, y: 0.6, z: 0 };

    hand[14] = { x: 0.55, y: 0.5, z: 0 };
    hand[16] = { x: 0.55, y: 0.6, z: 0 };

    hand[18] = { x: 0.6, y: 0.55, z: 0 };
    hand[20] = { x: 0.6, y: 0.65, z: 0 };

    // Thumb also curled
    hand[2] = { x: 0.4, y: 0.7, z: 0 };
    hand[4] = { x: 0.42, y: 0.68, z: 0 };

    const result = detectGesture(hand, false);
    expect(result.gesture).toBe('fist');
  });

  it('detects thumbs-up when thumb is extended upward and fingers are curled', () => {
    const hand = createBaseHand();
    // Wrist at (0.5, 0.8)
    // Curled fingers
    hand[6] = { x: 0.45, y: 0.5, z: 0 };
    hand[8] = { x: 0.45, y: 0.6, z: 0 };

    hand[10] = { x: 0.5, y: 0.48, z: 0 };
    hand[12] = { x: 0.5, y: 0.6, z: 0 };

    hand[14] = { x: 0.55, y: 0.5, z: 0 };
    hand[16] = { x: 0.55, y: 0.6, z: 0 };

    hand[18] = { x: 0.6, y: 0.55, z: 0 };
    hand[20] = { x: 0.6, y: 0.65, z: 0 };

    // Thumb pointing up high
    hand[2] = { x: 0.35, y: 0.65, z: 0 };
    hand[4] = { x: 0.35, y: 0.3, z: 0 };

    const result = detectGesture(hand, false);
    expect(result.gesture).toBe('thumbs_up');
  });
});
