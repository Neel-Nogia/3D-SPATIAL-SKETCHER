import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

/**
 * Shared mutable reference to active Three.js OrbitControls and Camera.
 * Enables zero-overhead 60 FPS gyroscope camera rotation and 3D hand cursor projection.
 */
export const activeOrbitControls = {
  current: null as OrbitControlsImpl | null,
};

export const activeCamera = {
  current: null as THREE.Camera | null,
};
