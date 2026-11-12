/**
 * SceneHelpers - handles camera controls, lighting, grid, and orientation helpers.
 * Manages OrbitControls interaction mode:
 * - OrbitControls rotates with left-click ONLY if Select tool is active OR Space is held down.
 * - Otherwise left-click is reserved for 3D sketching/drawing on planes.
 * - Right-drag pans and scroll zooms at all times.
 */
import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useSceneStore } from '../store/useSceneStore';
import type { CameraPreset } from '../types/scene';

/** Preset camera positions */
const PRESET_POSITIONS: Record<CameraPreset, [number, number, number]> = {
  perspective: [8, 6, 8],
  top: [0, 15, 0.0001], // Slight offset to prevent gimbal lock
  front: [0, 0, 15],
  right: [15, 0, 0],
};

export function SceneHelpers() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const theme = useSceneStore((s) => s.theme);
  const activeTool = useSceneStore((s) => s.activeTool);
  const cameraTrigger = useSceneStore((s) => s.cameraTrigger);
  const isDark = theme === 'dark';

  // Track whether space bar is currently held down
  const [spacePressed, setSpacePressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs/textareas
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' && !e.repeat) {
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle camera preset triggers
  useEffect(() => {
    if (!cameraTrigger) return;
    const targetPos = PRESET_POSITIONS[cameraTrigger.preset];
    if (!targetPos) return;

    camera.position.set(targetPos[0], targetPos[1], targetPos[2]);
    camera.lookAt(0, 0, 0);

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [cameraTrigger, camera]);

  // Left click rotates only when in 'select' tool OR holding Space
  const canRotateWithLeftMouse = activeTool === 'select' || spacePressed;

  return (
    <>
      {/* Lights */}
      <ambientLight intensity={isDark ? 0.45 : 0.65} />
      <directionalLight
        position={[12, 20, 10]}
        intensity={isDark ? 0.9 : 1.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-10, -10, -10]} intensity={0.2} />

      {/* Ground grid */}
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.6}
        cellColor={isDark ? '#2e354f' : '#cbd5e1'}
        sectionSize={5}
        sectionThickness={1.2}
        sectionColor={isDark ? '#4b5563' : '#94a3b8'}
        fadeDistance={60}
        fadeStrength={1}
        infiniteGrid
        position={[0, -0.001, 0]}
      />

      {/* Axis helper (X=Red, Y=Green, Z=Blue) */}
      <primitive object={new THREE.AxesHelper(5)} />

      {/* OrbitControls */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enableRotate={canRotateWithLeftMouse}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />

      {/* Viewport Gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport
          axisColors={['#ef4444', '#22c55e', '#3b82f6']}
          labelColor="white"
        />
      </GizmoHelper>
    </>
  );
}
