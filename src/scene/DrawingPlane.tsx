/**
 * DrawingPlane — Invisible interaction surface + visible faint translucent helper.
 * Captures pointer events when a drawing tool is active, raycasts onto the mathematical plane,
 * dispatches to the active tool, and renders live in-progress draft previews.
 */
import { useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '../store/useSceneStore';
import { useDraftStore } from '../tools/draftStore';
import { toolRegistry } from '../tools/registry';
import { usePointerOnPlane } from '../hooks/usePointerOnPlane';
import type { DrawingPlane as DrawingPlaneType } from '../types/scene';

/** Helper to get plane mesh transform */
function getPlaneTransform(plane: DrawingPlaneType, offset: number): {
  position: [number, number, number];
  rotation: [number, number, number];
} {
  switch (plane) {
    case 'XZ':
      return { position: [0, offset, 0], rotation: [-Math.PI / 2, 0, 0] };
    case 'XY':
      return { position: [0, 0, offset], rotation: [0, 0, 0] };
    case 'YZ':
      return { position: [offset, 0, 0], rotation: [0, Math.PI / 2, 0] };
  }
}

/** Renders the live draft preview while dragging */
function DraftPreview() {
  const draft = useDraftStore((s) => s.draft);

  const threePoints = useMemo(() => {
    if (!draft?.points || draft.points.length === 0) return [];
    return draft.points.map((p) => new THREE.Vector3(...p));
  }, [draft]);

  if (!draft) return null;

  const {
    type,
    color,
    thickness,
    opacity,
    wireframe,
    position,
    rotation = [0, 0, 0],
    size = [1, 1, 1],
    radius = 1,
    height = 2,
  } = draft;

  return (
    <group position={position} rotation={rotation} name="draft-preview">
      {type === 'stroke' && threePoints.length >= 2 && (
        <Line points={threePoints} color={color} lineWidth={thickness} opacity={opacity} />
      )}
      {type === 'line' && threePoints.length >= 2 && (
        <Line points={threePoints} color={color} lineWidth={thickness} opacity={opacity} />
      )}
      {type === 'rect' && threePoints.length >= 4 && (
        <Line
          points={[...threePoints, threePoints[0]]}
          color={color}
          lineWidth={thickness}
          opacity={opacity}
        />
      )}
      {type === 'circle' && (
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <Line
            points={Array.from({ length: 65 }, (_, i) => {
              const theta = (i / 64) * Math.PI * 2;
              return new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0);
            })}
            color={color}
            lineWidth={thickness}
            opacity={opacity}
          />
        </group>
      )}
      {type === 'box' && (
        <mesh>
          <boxGeometry args={size} />
          <meshStandardMaterial
            color={color}
            wireframe={wireframe}
            transparent
            opacity={0.65}
            roughness={0.5}
          />
        </mesh>
      )}
      {type === 'sphere' && (
        <mesh>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            color={color}
            wireframe={wireframe}
            transparent
            opacity={0.65}
            roughness={0.5}
          />
        </mesh>
      )}
      {type === 'cylinder' && (
        <mesh>
          <cylinderGeometry args={[radius, radius, height, 32]} />
          <meshStandardMaterial
            color={color}
            wireframe={wireframe}
            transparent
            opacity={0.65}
            roughness={0.5}
          />
        </mesh>
      )}
      {type === 'cone' && (
        <mesh>
          <coneGeometry args={[radius, height, 32]} />
          <meshStandardMaterial
            color={color}
            wireframe={wireframe}
            transparent
            opacity={0.65}
            roughness={0.5}
          />
        </mesh>
      )}
    </group>
  );
}

export function DrawingPlane() {
  const activeTool = useSceneStore((s) => s.activeTool);
  const drawingPlane = useSceneStore((s) => s.drawingPlane);
  const planeOffset = useSceneStore((s) => s.planeOffset);
  const showPlaneHelper = useSceneStore((s) => s.showPlaneHelper);
  const theme = useSceneStore((s) => s.theme);
  const isDark = theme === 'dark';

  const { getPointOnPlane } = usePointerOnPlane();
  const isPointerDownRef = useRef(false);

  const { position, rotation } = useMemo(
    () => getPlaneTransform(drawingPlane, planeOffset),
    [drawingPlane, planeOffset],
  );

  const isDrawingTool = ![
    'select',
    'move',
    'rotate',
    'scale',
    'eraser',
  ].includes(activeTool);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    // Only respond to main left click
    if (e.button !== 0) return;
    if (!isDrawingTool) return;

    e.stopPropagation();
    const point = getPointOnPlane(e.ray);
    if (!point) return;

    isPointerDownRef.current = true;
    const tool = toolRegistry.get(activeTool);
    if (tool) {
      tool.onPointerDown({
        pointOnPlane: point,
        intersectedObjectId: null,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey || e.metaKey,
      });
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isPointerDownRef.current || !isDrawingTool) return;

    e.stopPropagation();
    const point = getPointOnPlane(e.ray);
    if (!point) return;

    const tool = toolRegistry.get(activeTool);
    if (tool) {
      tool.onPointerMove({
        pointOnPlane: point,
        intersectedObjectId: null,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey || e.metaKey,
      });
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    if (!isDrawingTool) return;

    e.stopPropagation();
    const point = getPointOnPlane(e.ray) || [0, 0, 0];

    const tool = toolRegistry.get(activeTool);
    if (tool) {
      tool.onPointerUp({
        pointOnPlane: point,
        intersectedObjectId: null,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey || e.metaKey,
      });
    }
  };

  return (
    <>
      {/* Invisible interaction plane capturing pointer events */}
      <mesh
        position={position}
        rotation={rotation}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>

      {/* Visible faint translucent drawing plane helper */}
      {showPlaneHelper && (
        <group position={position} rotation={rotation}>
          <mesh>
            <planeGeometry args={[20, 20]} />
            <meshBasicMaterial
              color={isDark ? '#6366f1' : '#818cf8'}
              transparent
              opacity={0.06}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {/* Subtle plane border */}
          <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(20, 20)]} />
            <lineBasicMaterial
              color={isDark ? '#6366f1' : '#4f46e5'}
              transparent
              opacity={0.25}
            />
          </lineSegments>
        </group>
      )}

      {/* Live in-progress draft */}
      <DraftPreview />
    </>
  );
}
