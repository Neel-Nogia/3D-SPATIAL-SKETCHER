/**
 * 3D Canvas component — renders the Three.js scene using React Three Fiber.
 * This is the main viewport where all 3D objects are displayed.
 */
import { Canvas } from '@react-three/fiber';
import { useSceneStore } from '../store/useSceneStore';
import { SceneHelpers } from '../scene/SceneHelpers';
import { SceneObjectMesh } from '../scene/SceneObjectMesh';
import { DrawingPlane } from '../scene/DrawingPlane';
import { SelectionGizmo } from '../scene/SelectionGizmo';

function SceneObjects() {
  const order = useSceneStore((s) => s.order);

  return (
    <group name="scene-objects-root">
      {order.map((id) => (
        <SceneObjectMesh key={id} id={id} />
      ))}
    </group>
  );
}

export function Canvas3D() {
  const theme = useSceneStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 50, near: 0.1, far: 1000 }}
      style={{
        background: isDark ? '#0b0d19' : '#f8fafc',
        width: '100%',
        height: '100%',
      }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <SceneHelpers />
      <DrawingPlane />
      <SceneObjects />
      <SelectionGizmo />
    </Canvas>
  );
}
