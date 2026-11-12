/**
 * SelectionGizmo — TransformControls (Move/Rotate/Scale) attached to selected object(s).
 * - Mode follows active tool: 'move' -> translate, 'rotate' -> rotate, 'scale' -> scale.
 * - Applies translation snap (snapSize) and rotation snap (15 deg = PI/12) when snap is enabled.
 * - Pushes snapshot to undo history on drag completion.
 */
import { useEffect, useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '../store/useSceneStore';

export function SelectionGizmo() {
  const selectedIds = useSceneStore((s) => s.selectedIds);
  const objects = useSceneStore((s) => s.objects);
  const activeTool = useSceneStore((s) => s.activeTool);
  const snapEnabled = useSceneStore((s) => s.snapEnabled);
  const snapSize = useSceneStore((s) => s.snapSize);
  const updateObject = useSceneStore((s) => s.updateObject);
  const pushHistory = useSceneStore((s) => s.pushHistory);

  const proxyGroupRef = useRef<THREE.Group>(null);

  // Determine gizmo mode
  const mode =
    activeTool === 'rotate'
      ? 'rotate'
      : activeTool === 'scale'
        ? 'scale'
        : 'translate';

  // Only show gizmo when in select, move, rotate, or scale tool and an object is selected
  const isTransformTool = ['select', 'move', 'rotate', 'scale'].includes(activeTool);
  const hasSelection = selectedIds.length > 0;
  const isVisible = isTransformTool && hasSelection;

  // Track the primary selected object
  const primaryId = selectedIds[0];
  const primaryObj = primaryId ? objects[primaryId] : null;

  // Sync proxy group transform with selected object
  useEffect(() => {
    if (!proxyGroupRef.current || !primaryObj) return;

    proxyGroupRef.current.position.set(...primaryObj.position);
    proxyGroupRef.current.rotation.set(...primaryObj.rotation);
    proxyGroupRef.current.scale.set(...primaryObj.scale);
  }, [primaryObj]);

  const handleObjectChange = () => {
    if (primaryId && proxyGroupRef.current) {
      const pos = proxyGroupRef.current.position;
      const rot = proxyGroupRef.current.rotation;
      const scl = proxyGroupRef.current.scale;

      updateObject(primaryId, {
        position: [pos.x, pos.y, pos.z],
        rotation: [rot.x, rot.y, rot.z],
        scale: [scl.x, scl.y, scl.z],
      });
    }
  };

  const handleDragEnd = () => {
    pushHistory();
  };

  if (!isVisible || !primaryObj) return null;

  return (
    <TransformControls
      mode={mode}
      size={0.75}
      translationSnap={snapEnabled ? snapSize : undefined}
      rotationSnap={snapEnabled ? Math.PI / 12 : undefined} // 15 degrees snap
      onObjectChange={handleObjectChange}
      onMouseUp={handleDragEnd}
    >
      {/* Proxy object that TransformControls manipulates */}
      <group ref={proxyGroupRef} name="selection-gizmo-proxy" />
    </TransformControls>
  );
}
