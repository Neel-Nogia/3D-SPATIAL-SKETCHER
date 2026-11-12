/**
 * CylinderTool — Click-drag radius, height = radius * 2.
 */
import type { Tool, ToolContext } from './tool';
import type { Vec3, DrawingPlane } from '../types/scene';
import { useSceneStore } from '../store/useSceneStore';
import { useDraftStore } from './draftStore';

function getCylinderTransform(center: Vec3, radius: number, plane: DrawingPlane): { position: Vec3; rotation: Vec3; height: number } {
  const height = radius * 2;
  switch (plane) {
    case 'XZ':
      // Extrudes along Y
      return {
        position: [center[0], center[1] + height / 2, center[2]],
        rotation: [0, 0, 0],
        height,
      };
    case 'XY':
      // Extrudes along Z
      return {
        position: [center[0], center[1], center[2] + height / 2],
        rotation: [Math.PI / 2, 0, 0],
        height,
      };
    case 'YZ':
      // Extrudes along X
      return {
        position: [center[0] + height / 2, center[1], center[2]],
        rotation: [0, 0, Math.PI / 2],
        height,
      };
  }
}

export class CylinderTool implements Tool {
  id = 'cylinder';
  label = 'Cylinder';
  icon = 'Cylinder';
  shortcut = 'Y';

  private center: Vec3 | null = null;
  private isDrawing = false;

  onPointerDown(ctx: ToolContext): void {
    this.isDrawing = true;
    this.center = ctx.pointOnPlane;

    const plane = useSceneStore.getState().drawingPlane;
    const { position, rotation, height } = getCylinderTransform(this.center, 0.1, plane);
    const style = useSceneStore.getState().currentStyle;

    useDraftStore.getState().setDraft({
      type: 'cylinder',
      radius: 0.1,
      height,
      position,
      rotation,
      color: style.color,
      thickness: style.thickness,
      opacity: style.opacity,
      wireframe: style.wireframe,
    });
  }

  onPointerMove(ctx: ToolContext): void {
    if (!this.isDrawing || !this.center) return;

    const dx = ctx.pointOnPlane[0] - this.center[0];
    const dy = ctx.pointOnPlane[1] - this.center[1];
    const dz = ctx.pointOnPlane[2] - this.center[2];
    const radius = Math.max(0.1, Math.sqrt(dx * dx + dy * dy + dz * dz));

    const plane = useSceneStore.getState().drawingPlane;
    const { position, rotation, height } = getCylinderTransform(this.center, radius, plane);
    const style = useSceneStore.getState().currentStyle;

    useDraftStore.getState().setDraft({
      type: 'cylinder',
      radius,
      height,
      position,
      rotation,
      color: style.color,
      thickness: style.thickness,
      opacity: style.opacity,
      wireframe: style.wireframe,
    });
  }

  onPointerUp(ctx: ToolContext): void {
    if (!this.isDrawing || !this.center) return;
    this.isDrawing = false;

    const dx = ctx.pointOnPlane[0] - this.center[0];
    const dy = ctx.pointOnPlane[1] - this.center[1];
    const dz = ctx.pointOnPlane[2] - this.center[2];
    const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (radius >= 0.15) {
      const plane = useSceneStore.getState().drawingPlane;
      const { position, rotation, height } = getCylinderTransform(this.center, radius, plane);
      const style = useSceneStore.getState().currentStyle;

      useSceneStore.getState().addObject({
        type: 'cylinder',
        radius,
        height,
        position,
        rotation,
        scale: [1, 1, 1],
        color: style.color,
        thickness: style.thickness,
        opacity: style.opacity,
        wireframe: style.wireframe,
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
