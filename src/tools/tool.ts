/**
 * Tool interface — every drawing/editing tool implements this.
 * 
 * Adding a new tool:
 * 1. Create a file in src/tools/ implementing this interface.
 * 2. Register it in src/tools/registry.ts.
 * That's it! The canvas component doesn't need to change.
 */
import type { Vec3, ObjectType } from '../types/scene';

/** Transient preview shape rendered while dragging */
export interface DraftShape {
  type: ObjectType;
  points?: Vec3[];
  size?: Vec3;
  radius?: number;
  height?: number;
  position: Vec3;
  rotation?: Vec3;
  color: string;
  thickness: number;
  opacity: number;
  wireframe: boolean;
}

/** Context passed to tool event handlers */
export interface ToolContext {
  /** The 3D point on the drawing plane under the pointer */
  pointOnPlane: Vec3;
  /** The raw Three.js raycaster intersection (for object picking) */
  intersectedObjectId: string | null;
  /** Whether shift key is held */
  shiftKey: boolean;
  /** Whether ctrl/cmd key is held */
  ctrlKey: boolean;
}

/** The common interface that all tools implement */
export interface Tool {
  /** Unique tool identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** Lucide icon name */
  icon: string;
  /** Keyboard shortcut key (single char) */
  shortcut: string;
  /** Called when the pointer goes down on the canvas */
  onPointerDown: (ctx: ToolContext) => void;
  /** Called when the pointer moves while held down */
  onPointerMove: (ctx: ToolContext) => void;
  /** Called when the pointer is released */
  onPointerUp: (ctx: ToolContext) => void;
  /** Optional cancel / reset */
  reset?: () => void;
}
