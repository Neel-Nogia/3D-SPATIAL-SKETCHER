/**
 * CircleTool — Click-drag from center to radius on the drawing plane.
 */
import type { Tool, ToolContext } from './tool';
import type { Vec3, DrawingPlane } from '../types/scene';
import { useSceneStore } from '../store/useSceneStore';
import { useDraftStore } from './draftStore';

function getPlaneRotation(plane: DrawingPlane): Vec3 {
  switch (plane) {
    case 'XZ':
      return [0, 0, 0];
    case 'XY':
      return [Math.PI / 2, 0, 0];
    case 'YZ':
      return [0, 0, Math.PI / 2];
  }
}

export class CircleTool implements Tool {
  id = 'circle';
  label = 'Circle';
  icon = 'Circle';
  shortcut = 'C';

  private center: Vec3 | null = null;
  private isDrawing = false;

  onPointerDown(ctx: ToolContext): void {
    this.isDrawing = true;
    this.center = ctx.pointOnPlane;

    const plane = useSceneStore.getState().drawingPlane;
    const style = useSceneStore.getState().currentStyle;

    useDraftStore.getState().setDraft({
      type: 'circle',
      radius: 0.1,
      position: this.center,
      rotation: getPlaneRotation(plane),
      color: style.color,
      thickness: style.thickness,
      opacity: style.opacity,
      wireframe: false,
    });
  }

  onPointerMove(ctx: ToolContext): void {
    if (!this.isDrawing || !this.center) return;

    const dx = ctx.pointOnPlane[0] - this.center[0];
    const dy = ctx.pointOnPlane[1] - this.center[1];
    const dz = ctx.pointOnPlane[2] - this.center[2];
    const radius = Math.max(0.05, Math.sqrt(dx * dx + dy * dy + dz * dz));

    const plane = useSceneStore.getState().drawingPlane;
    const style = useSceneStore.getState().currentStyle;

    useDraftStore.getState().setDraft({
      type: 'circle',
      radius,
      position: this.center,
      rotation: getPlaneRotation(plane),
      color: style.color,
      thickness: style.thickness,
      opacity: style.opacity,
      wireframe: false,
    });
  }

  onPointerUp(ctx: ToolContext): void {
    if (!this.isDrawing || !this.center) return;
    this.isDrawing = false;

    const dx = ctx.pointOnPlane[0] - this.center[0];
    const dy = ctx.pointOnPlane[1] - this.center[1];
    const dz = ctx.pointOnPlane[2] - this.center[2];
    const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (radius >= 0.1) {
      const plane = useSceneStore.getState().drawingPlane;
      const style = useSceneStore.getState().currentStyle;

      useSceneStore.getState().addObject({
        type: 'circle',
        radius,
        position: this.center,
        rotation: getPlaneRotation(plane),
        scale: [1, 1, 1],
        color: style.color,
        thickness: style.thickness,
        opacity: style.opacity,
        wireframe: false,
        visible: true,
        locked: false,
      });
    }

    this.center = null;
    useDraftStore.getState().clearDraft();
  }

  reset(): void {
    this.isDrawing = false;
    this.center = null;
    useDraftStore.getState().clearDraft();
  }
}
