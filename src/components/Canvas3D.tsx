/**
 * 3D Canvas component — renders the Three.js scene using React Three Fiber.
 * This is the main viewport where all 3D objects are displayed.
 */
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useSceneStore } from '../store/useSceneStore';

/** Scene content — lights, grid, helpers, and objects */
function SceneContent() {
  const theme = useSceneStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={isDark ? 0.4 : 0.6} />
      <directionalLight position={[10, 20, 10]} intensity={isDark ? 0.8 : 1.0} castShadow />

      {/* Ground grid */}
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor={isDark ? '#2a2a4a' : '#d0d0d0'}
        sectionSize={5}
        sectionThickness={1}
        sectionColor={isDark ? '#4a4a6a' : '#a0a0a0'}
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid
        position={[0, 0, 0]}
      />

      {/* Axis helper — X red, Y green, Z blue */}
      <axesHelper args={[5]} />

      {/* Orbit controls — left-drag rotate, right-drag pan, scroll zoom */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        mouseButtons={{
          LEFT: 0,   // rotate
          MIDDLE: 1, // dolly
          RIGHT: 2,  // pan
        }}
      />

      {/* Camera orientation gizmo in the corner */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport
          axisColors={['#ef4444', '#22c55e', '#3b82f6']}
          labelColor="white"
        />
      </GizmoHelper>
    </>
  );
}

export function Canvas3D() {
  const theme = useSceneStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 50, near: 0.1, far: 1000 }}
      style={{ background: isDark ? '#0f0f1a' : '#f0f0f5' }}
      gl={{ preserveDrawingBuffer: true }} // needed for PNG export
    >
      <SceneContent />
    </Canvas>
  );
}
