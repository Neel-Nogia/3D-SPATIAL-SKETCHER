/**
 * BoxTool — Click-drag footprint on the drawing plane, height = shorter side.
 */
import type { Tool, ToolContext } from './tool';
import type { Vec3, DrawingPlane } from '../types/scene';
import { useSceneStore } from '../store/useSceneStore';
import { useDraftStore } from './draftStore';

function computeBox(start: Vec3, current: Vec3, plane: DrawingPlane): { position: Vec3; size: Vec3 } {
  switch (plane) {
    case 'XZ': {
      const w = Math.max(0.1, Math.abs(current[0] - start[0]));
      const d = Math.max(0.1, Math.abs(current[2] - start[2]));
      const h = Math.max(0.1, Math.min(w, d));
      const cx = (start[0] + current[0]) / 2;
      const cz = (start[2] + current[2]) / 2;
      const cy = start[1] + h / 2;
      return { position: [cx, cy, cz], size: [w, h, d] };
    }
    case 'XY': {
      const w = Math.max(0.1, Math.abs(current[0] - start[0]));
      const h = Math.max(0.1, Math.abs(current[1] - start[1]));
      const d = Math.max(0.1, Math.min(w, h));
      const cx = (start[0] + current[0]) / 2;
      const cy = (start[1] + current[1]) / 2;
      const cz = start[2] + d / 2;
      return { position: [cx, cy, cz], size: [w, h, d] };
    }
    case 'YZ': {
      const h = Math.max(0.1, Math.abs(current[1] - start[1]));
      const d = Math.max(0.1, Math.abs(current[2] - start[2]));
      const w = Math.max(0.1, Math.min(h, d));
      const cx = start[0] + w / 2;
      const cy = (start[1] + current[1]) / 2;
      const cz = (start[2] + current[2]) / 2;
      return { position: [cx, cy, cz], size: [w, h, d] };
    }
  }
}

export class BoxTool implements Tool {
  id = 'box';
  label = 'Box';
  icon = 'Box';
  shortcut = 'B';

  private startPoint: Vec3 | null = null;
  private isDrawing = false;

  onPointerDown(ctx: ToolContext): void {
    this.isDrawing = true;
    this.startPoint = ctx.pointOnPlane;

    const plane = useSceneStore.getState().drawingPlane;
    const { position, size } = computeBox(this.startPoint, this.startPoint, plane);
    const style = useSceneStore.getState().currentStyle;

    useDraftStore.getState().setDraft({
      type: 'box',
      size,
      position,
      color: style.color,
      thickness: style.thickness,
      opacity: style.opacity,
      wireframe: style.wireframe,
    });
  }

  onPointerMove(ctx: ToolContext): void {
    if (!this.isDrawing || !this.startPoint) return;

    const plane = useSceneStore.getState().drawingPlane;
    const { position, size } = computeBox(this.startPoint, ctx.pointOnPlane, plane);
    const style = useSceneStore.getState().currentStyle;

    useDraftStore.getState().setDraft({
      type: 'box',
      size,
      position,
      color: style.color,
      thickness: style.thickness,
      opacity: style.opacity,
      wireframe: style.wireframe,
    });
  }

  onPointerUp(ctx: ToolContext): void {
    if (!this.isDrawing || !this.startPoint) return;
    this.isDrawing = false;

    const plane = useSceneStore.getState().drawingPlane;
    const { position, size } = computeBox(this.startPoint, ctx.pointOnPlane, plane);

    if (size[0] >= 0.2 && (size[1] >= 0.2 || size[2] >= 0.2)) {
      const style = useSceneStore.getState().currentStyle;
      useSceneStore.getState().addObject({
        type: 'box',
        size,
        position,
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

    this.startPoint = null;
    useDraftStore.getState().clearDraft();
  }

  reset(): void {
    this.isDrawing = false;
    this.startPoint = null;
    useDraftStore.getState().clearDraft();
  }
}
