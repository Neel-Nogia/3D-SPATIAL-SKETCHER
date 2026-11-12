/**
 * Core data types for the 3D Spatial Sketcher.
 * These types define the shape of every object in the scene.
 */

/** A 3D vector stored as a tuple [x, y, z] */
export type Vec3 = [number, number, number];

/** All supported object types */
export type ObjectType =
  | 'stroke'
  | 'line'
  | 'rect'
  | 'circle'
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone';

/**
 * A single object in the scene.
 * Only the relevant geometry fields are used per type:
 * - stroke/line: points
 * - rect: points (4 corners)
 * - circle: radius
 * - box: size
 * - sphere: radius
 * - cylinder/cone: radius, height
 */
export interface SceneObject {
  id: string;               // nanoid
  type: ObjectType;
  name: string;             // e.g. "Box 3"

  // Geometry parameters (only relevant ones used per type)
  points?: Vec3[];          // stroke / line / rect corners
  size?: Vec3;              // box dimensions [width, height, depth]
  radius?: number;          // circle / sphere / cylinder / cone
  height?: number;          // cylinder / cone

  // Appearance
  color: string;            // hex color e.g. "#ff0000"
  thickness: number;        // line width for stroke/line/rect/circle
  opacity: number;          // 0..1
  wireframe: boolean;

  // Transform (applied on top of geometry)
  position: Vec3;
  rotation: Vec3;           // radians (Euler XYZ order)
  scale: Vec3;

  // Flags
  visible: boolean;
  locked: boolean;
}

/** The three possible drawing planes */
export type DrawingPlane = 'XZ' | 'XY' | 'YZ';

/** Available tool identifiers */
export type ToolId =
  | 'select'
  | 'move'
  | 'rotate'
  | 'scale'
  | 'pen'
  | 'line'
  | 'rect'
  | 'circle'
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'eraser';

/** Theme options */
export type Theme = 'dark' | 'light';

/** Camera preset views */
export type CameraPreset = 'perspective' | 'top' | 'front' | 'right';

/** Snap size options */
export type SnapSize = 0.1 | 0.25 | 0.5 | 1;

/** The serialized project file format */
export interface ProjectFile {
  version: 1;
  name: string;
  objects: Record<string, SceneObject>;
  order: string[];
}
