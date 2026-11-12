/**
 * LineTool — Click-drag straight line on the drawing plane.
 */
import type { Tool, ToolContext } from './tool';
import type { Vec3 } from '../types/scene';
import { useSceneStore } from '../store/useSceneStore';
import { useDraftStore } from './draftStore';

export class LineTool implements Tool {
  id = 'line';
  label = 'Line';
  icon = 'Minus';
  shortcut = 'L';

  private startPoint: Vec3 | null = null;
  private isDrawing = false;

  onPointerDown(ctx: ToolContext): void {
    this.isDrawing = true;
    this.startPoint = ctx.pointOnPlane;

    const style = useSceneStore.getState().currentStyle;
    useDraftStore.getState().setDraft({
      type: 'line',
      points: [this.startPoint, this.startPoint],
      position: [0, 0, 0],
      color: style.color,
      thickness: style.thickness,
      opacity: style.opacity,
      wireframe: false,
    });
  }

  onPointerMove(ctx: ToolContext): void {
    if (!this.isDrawing || !this.startPoint) return;

    const style = useSceneStore.getState().currentStyle;
    useDraftStore.getState().setDraft({
      type: 'line',
      points: [this.startPoint, ctx.pointOnPlane],
      position: [0, 0, 0],
      color: style.color,
      thickness: style.thickness,
      opacity: style.opacity,
      wireframe: false,
    });
  }

  onPointerUp(ctx: ToolContext): void {
    if (!this.isDrawing || !this.startPoint) return;
    this.isDrawing = false;

    const endPoint = ctx.pointOnPlane;
    // Ensure line has non-zero length
    const dx = endPoint[0] - this.startPoint[0];
    const dy = endPoint[1] - this.startPoint[1];
    const dz = endPoint[2] - this.startPoint[2];

    if (dx * dx + dy * dy + dz * dz > 0.001) {
      const style = useSceneStore.getState().currentStyle;
      useSceneStore.getState().addObject({
        type: 'line',
        points: [this.startPoint, endPoint],
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: style.color,
        thickness: style.thickness,
        opacity: style.opacity,
        wireframe: false,
        visible: true,
        locked: false,
      });
    }

    this.startPoint = null;
    useDraftStore.getState().clearDraft();
  }

  reset(): void {
    this.isDrawing = false;
    this.startPoint = null;
    useDraftStore.getState().clearDraft();
  }
}
