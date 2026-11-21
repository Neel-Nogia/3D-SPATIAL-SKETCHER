import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

/**
 * Shared mutable reference to active Three.js OrbitControls.
 * Enables zero-overhead 60 FPS gyroscope camera rotation from hand tracking.
 */
export const activeOrbitControls = {
  current: null as OrbitControlsImpl | null,
};
