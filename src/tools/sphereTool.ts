/**
 * SphereTool — Click-drag from center to radius.
 */
import type { Tool, ToolContext } from './tool';
import type { Vec3 } from '../types/scene';
import { useSceneStore } from '../store/useSceneStore';
import { useDraftStore } from './draftStore';

export class SphereTool implements Tool {
  id = 'sphere';
  label = 'Sphere';
  icon = 'Globe';
  shortcut = 'O';

  private center: Vec3 | null = null;
  private isDrawing = false;

  onPointerDown(ctx: ToolContext): void {
    this.isDrawing = true;
    this.center = ctx.pointOnPlane;

    const style = useSceneStore.getState().currentStyle;
    useDraftStore.getState().setDraft({
      type: 'sphere',
      radius: 0.1,
      position: this.center,
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

    const style = useSceneStore.getState().currentStyle;
    useDraftStore.getState().setDraft({
      type: 'sphere',
      radius,
      position: this.center,
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
      const style = useSceneStore.getState().currentStyle;
      useSceneStore.getState().addObject({
        type: 'sphere',
        radius,
        position: this.center,
        rotation: [0, 0, 0],
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
