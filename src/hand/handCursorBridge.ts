/**
 * Shared mutable reference for hand 3D cursor & tracking overlay.
 * Updated directly in the animation frame loop to avoid triggering React re-renders.
 */
import type { GestureType } from './gestures';

export const handCursorState = {
  position: null as [number, number, number] | null,
  isPinching: false,
  visible: false,
  gesture: 'idle' as GestureType,
};
