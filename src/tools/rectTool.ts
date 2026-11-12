/**
 * RectTool — Click-drag diagonal on the drawing plane to form a rectangle.
 */
import type { Tool, ToolContext } from './tool';
import type { Vec3, DrawingPlane } from '../types/scene';
import { useSceneStore } from '../store/useSceneStore';
import { useDraftStore } from './draftStore';

function computeRectCorners(start: Vec3, end: Vec3, plane: DrawingPlane): Vec3[] {
  switch (plane) {
    case 'XZ': {
      const y = start[1];
      return [
        [start[0], y, start[2]],
        [end[0], y, start[2]],
        [end[0], y, end[2]],
        [start[0], y, end[2]],
      ];
    }
    case 'XY': {
      const z = start[2];
      return [
        [start[0], start[1], z],
        [end[0], start[1], z],
        [end[0], end[1], z],
        [start[0], end[1], z],
      ];
    }
    case 'YZ': {
      const x = start[0];
      return [
        [x, start[1], start[2]],
        [x, end[1], start[2]],
        [x, end[1], end[2]],
        [x, start[1], end[2]],
      ];
    }
  }
}

export class RectTool implements Tool {
  id = 'rect';
  label = 'Rectangle';
  icon = 'Square';
  shortcut = 'Q';

  private startPoint: Vec3 | null = null;
  private isDrawing = false;

  onPointerDown(ctx: ToolContext): void {
    this.isDrawing = true;
    this.startPoint = ctx.pointOnPlane;

    const plane = useSceneStore.getState().drawingPlane;
    const corners = computeRectCorners(this.startPoint, this.startPoint, plane);
    const style = useSceneStore.getState().currentStyle;

    useDraftStore.getState().setDraft({
      type: 'rect',
      points: corners,
      position: [0, 0, 0],
      color: style.color,
      thickness: style.thickness,
      opacity: style.opacity,
      wireframe: false,
    });
  }

  onPointerMove(ctx: ToolContext): void {
    if (!this.isDrawing || !this.startPoint) return;

    const plane = useSceneStore.getState().drawingPlane;
    const corners = computeRectCorners(this.startPoint, ctx.pointOnPlane, plane);
    const style = useSceneStore.getState().currentStyle;

    useDraftStore.getState().setDraft({
      type: 'rect',
      points: corners,
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

    const plane = useSceneStore.getState().drawingPlane;
    const corners = computeRectCorners(this.startPoint, ctx.pointOnPlane, plane);

    // Ensure non-zero size
    const p1 = corners[0];
    const p2 = corners[2];
    const diagSq =
      Math.pow(p2[0] - p1[0], 2) +
      Math.pow(p2[1] - p1[1], 2) +
      Math.pow(p2[2] - p1[2], 2);

    if (diagSq > 0.001) {
      const style = useSceneStore.getState().currentStyle;
      useSceneStore.getState().addObject({
        type: 'rect',
        points: corners,
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
