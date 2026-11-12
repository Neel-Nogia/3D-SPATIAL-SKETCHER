/**
 * PenTool — Freehand 3D stroke on the active drawing plane.
 * Samples points only when the pointer moves at least 0.05 world units.
 * On pointer up, simplifies points using the Ramer-Douglas-Peucker (RDP) algorithm.
 */
import type { Tool, ToolContext } from './tool';
import type { Vec3 } from '../types/scene';
import { useSceneStore } from '../store/useSceneStore';
import { useDraftStore } from './draftStore';
import { simplifyPoints } from '../utils/simplify';

/** Euclidean distance between two 3D points */
function dist3D(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export class PenTool implements Tool {
  id = 'pen';
  label = 'Pen';
  icon = 'Pencil';
  shortcut = 'P';

  private points: Vec3[] = [];
  private isDrawing = false;
  private minDistance = 0.05;

  onPointerDown(ctx: ToolContext): void {
    this.isDrawing = true;
    this.points = [ctx.pointOnPlane];

    const style = useSceneStore.getState().currentStyle;
    useDraftStore.getState().setDraft({
      type: 'stroke',
      points: [...this.points],
      position: [0, 0, 0],
      color: style.color,
      thickness: style.thickness,
      opacity: style.opacity,
      wireframe: false,
    });
  }

  onPointerMove(ctx: ToolContext): void {
    if (!this.isDrawing || this.points.length === 0) return;

    const lastPoint = this.points[this.points.length - 1];
    if (dist3D(lastPoint, ctx.pointOnPlane) >= this.minDistance) {
      this.points.push(ctx.pointOnPlane);

      const style = useSceneStore.getState().currentStyle;
      useDraftStore.getState().setDraft({
        type: 'stroke',
        points: [...this.points],
        position: [0, 0, 0],
        color: style.color,
        thickness: style.thickness,
        opacity: style.opacity,
        wireframe: false,
      });
    }
  }

  onPointerUp(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.points.length >= 2) {
      // Simplify stroke points with RDP algorithm
      const simplified = simplifyPoints(this.points, 0.04);

      const style = useSceneStore.getState().currentStyle;
      useSceneStore.getState().addObject({
        type: 'stroke',
        points: simplified,
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

    this.points = [];
    useDraftStore.getState().clearDraft();
  }

  reset(): void {
    this.isDrawing = false;
    this.points = [];
    useDraftStore.getState().clearDraft();
  }
}
