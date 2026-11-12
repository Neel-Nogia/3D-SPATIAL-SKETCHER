/**
 * SceneObjectMesh — renders a single SceneObject from store state.
 * Supports all 8 types:
 * - stroke: freehand line strip via drei <Line>
 * - line: straight line segment via drei <Line>
 * - rect: 4-corner rectangle line or plane
 * - circle: circular line boundary or disc
 * - box: 3D box geometry
 * - sphere: 3D sphere geometry
 * - cylinder: 3D cylinder geometry
 * - cone: 3D cone geometry
 *
 * Handles selection highlight, visibility, transforms, color, opacity, wireframe.
 */
import { useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '../store/useSceneStore';
import type { SceneObject } from '../types/scene';

interface SceneObjectMeshProps {
  id: string;
}

export function SceneObjectMesh({ id }: SceneObjectMeshProps) {
  const obj = useSceneStore((s) => s.objects[id]) as SceneObject | undefined;
  const isSelected = useSceneStore((s) => s.selectedIds.includes(id));
  const activeTool = useSceneStore((s) => s.activeTool);
  const select = useSceneStore((s) => s.select);
  const selectMultiple = useSceneStore((s) => s.selectMultiple);
  const deleteObjects = useSceneStore((s) => s.deleteObjects);

  const groupRef = useRef<THREE.Group>(null);

  // Compute points for closed shapes if needed
  const linePoints = useMemo(() => {
    if (!obj?.points || obj.points.length === 0) return [];
    return obj.points.map((p) => new THREE.Vector3(...p));
  }, [obj]);

  // Handle click on the object
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!obj || obj.locked || !obj.visible) return;

    // If active tool is Eraser, clicking deletes it
    if (activeTool === 'eraser') {
      e.stopPropagation();
      deleteObjects([id]);
      return;
    }

    // Only allow selection in select, move, rotate, scale tools
    if (['select', 'move', 'rotate', 'scale'].includes(activeTool)) {
      e.stopPropagation();
      if (e.shiftKey) {
        selectMultiple(id);
      } else {
        select(id);
      }
    }
  };

  if (!obj || !obj.visible) return null;

  const {
    type,
    color,
    thickness,
    opacity,
    wireframe,
    position,
    rotation,
    scale,
    size = [1, 1, 1],
    radius = 1,
    height = 2,
  } = obj;

  const isTransparent = opacity < 1.0;

  // Selection outline / highlight color
  const highlightColor = '#3b82f6'; // Bright blue

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={handleClick}
      name={`obj-${id}`}
    >
      {/* 1. Stroke / Freehand line */}
      {type === 'stroke' && linePoints.length >= 2 && (
        <Line
          points={linePoints}
          color={isSelected ? highlightColor : color}
          lineWidth={isSelected ? thickness + 2 : thickness}
          transparent={isTransparent}
          opacity={opacity}
        />
      )}

      {/* 2. Straight Line */}
      {type === 'line' && linePoints.length >= 2 && (
        <Line
          points={linePoints}
          color={isSelected ? highlightColor : color}
          lineWidth={isSelected ? thickness + 2 : thickness}
          transparent={isTransparent}
          opacity={opacity}
        />
      )}

      {/* 3. Rectangle (Wireframe/Boundary or filled) */}
      {type === 'rect' && linePoints.length >= 4 && (
        <>
          <Line
            points={[...linePoints, linePoints[0]]} // Closed loop
            color={isSelected ? highlightColor : color}
            lineWidth={isSelected ? thickness + 2 : thickness}
            transparent={isTransparent}
            opacity={opacity}
          />
          {/* Subtle semi-transparent interior plane for easier clicking */}
          <mesh visible={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial />
          </mesh>
        </>
      )}

      {/* 4. Circle */}
      {type === 'circle' && (
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <Line
            points={Array.from({ length: 65 }, (_, i) => {
              const theta = (i / 64) * Math.PI * 2;
              return new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0);
            })}
            color={isSelected ? highlightColor : color}
            lineWidth={isSelected ? thickness + 2 : thickness}
            transparent={isTransparent}
            opacity={opacity}
          />
        </group>
      )}

      {/* 5. Box */}
      {type === 'box' && (
        <mesh castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial
            color={isSelected ? highlightColor : color}
            wireframe={wireframe}
            transparent={isTransparent}
            opacity={opacity}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      )}

      {/* 6. Sphere */}
      {type === 'sphere' && (
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            color={isSelected ? highlightColor : color}
            wireframe={wireframe}
            transparent={isTransparent}
            opacity={opacity}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      )}

      {/* 7. Cylinder */}
      {type === 'cylinder' && (
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, height, 32]} />
          <meshStandardMaterial
            color={isSelected ? highlightColor : color}
            wireframe={wireframe}
            transparent={isTransparent}
            opacity={opacity}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      )}

      {/* 8. Cone */}
      {type === 'cone' && (
        <mesh castShadow receiveShadow>
          <coneGeometry args={[radius, height, 32]} />
          <meshStandardMaterial
            color={isSelected ? highlightColor : color}
            wireframe={wireframe}
            transparent={isTransparent}
            opacity={opacity}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      )}
    </group>
  );
}
