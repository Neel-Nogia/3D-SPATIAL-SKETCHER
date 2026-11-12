/**
 * usePointerOnPlane hook — raycasts pointer from screen coords onto the current 3D drawing plane.
 * Respects:
 * - Active plane: 'XZ' (ground), 'XY' (front), 'YZ' (side)
 * - Plane offset slider value (-20 to 20)
 * - Grid snapping when enabled
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useSceneStore } from '../store/useSceneStore';
import { snapVec3 } from '../utils/snap';
import type { Vec3 } from '../types/scene';

export function usePointerOnPlane() {
  const { raycaster } = useThree();
  const drawingPlane = useSceneStore((s) => s.drawingPlane);
  const planeOffset = useSceneStore((s) => s.planeOffset);
  const snapEnabled = useSceneStore((s) => s.snapEnabled);
  const snapSize = useSceneStore((s) => s.snapSize);

  // Construct mathematical Three.js Plane based on active drawing plane & offset
  const mathPlane = useMemo(() => {
    switch (drawingPlane) {
      case 'XZ':
        // Normal pointing UP (Y=1), plane passes through [0, planeOffset, 0]
        return new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeOffset);
      case 'XY':
        // Normal pointing FRONT (Z=1), plane passes through [0, 0, planeOffset]
        return new THREE.Plane(new THREE.Vector3(0, 0, 1), -planeOffset);
      case 'YZ':
        // Normal pointing RIGHT (X=1), plane passes through [planeOffset, 0, 0]
        return new THREE.Plane(new THREE.Vector3(1, 0, 0), -planeOffset);
    }
  }, [drawingPlane, planeOffset]);

  const targetVec = useMemo(() => new THREE.Vector3(), []);

  /**
   * Intersect the current camera ray with the active plane.
   * Returns [x, y, z] Vec3 or null if ray is parallel to plane.
   */
  const getPointOnPlane = (customRay?: THREE.Ray): Vec3 | null => {
    const ray = customRay || raycaster.ray;
    const hit = ray.intersectPlane(mathPlane, targetVec);
    if (!hit) return null;

    let point: Vec3 = [hit.x, hit.y, hit.z];
    if (snapEnabled) {
      point = snapVec3(point, snapSize);
    }
    return point;
  };

  return { getPointOnPlane, mathPlane };
}
