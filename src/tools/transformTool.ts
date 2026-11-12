/**
 * TransformTools — Move (W), Rotate (E), Scale (R).
 * Selects objects and attaches TransformControls gizmo in the respective mode.
 */
import type { Tool, ToolContext } from './tool';
import { useSceneStore } from '../store/useSceneStore';

export class MoveTool implements Tool {
  id = 'move';
  label = 'Move';
  icon = 'Move';
  shortcut = 'W';

  onPointerDown(ctx: ToolContext): void {
    if (ctx.intersectedObjectId) {
      if (ctx.shiftKey) {
        useSceneStore.getState().selectMultiple(ctx.intersectedObjectId);
      } else {
        useSceneStore.getState().select(ctx.intersectedObjectId);
      }
    }
  }

  onPointerMove(): void {}
  onPointerUp(): void {}
}

export class RotateTool implements Tool {
  id = 'rotate';
  label = 'Rotate';
  icon = 'RotateCcw';
  shortcut = 'E';

  onPointerDown(ctx: ToolContext): void {
    if (ctx.intersectedObjectId) {
      if (ctx.shiftKey) {
        useSceneStore.getState().selectMultiple(ctx.intersectedObjectId);
      } else {
        useSceneStore.getState().select(ctx.intersectedObjectId);
      }
    }
  }

  onPointerMove(): void {}
  onPointerUp(): void {}
}

export class ScaleTool implements Tool {
  id = 'scale';
  label = 'Scale';
  icon = 'Scaling';
  shortcut = 'R';

  onPointerDown(ctx: ToolContext): void {
    if (ctx.intersectedObjectId) {
      if (ctx.shiftKey) {
        useSceneStore.getState().selectMultiple(ctx.intersectedObjectId);
      } else {
        useSceneStore.getState().select(ctx.intersectedObjectId);
      }
    }
  }

  onPointerMove(): void {}
  onPointerUp(): void {}
}
