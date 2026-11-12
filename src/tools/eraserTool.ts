/**
 * EraserTool — Click an object to delete it.
 */
import type { Tool, ToolContext } from './tool';
import { useSceneStore } from '../store/useSceneStore';

export class EraserTool implements Tool {
  id = 'eraser';
  label = 'Eraser';
  icon = 'Eraser';
  shortcut = 'X';

  onPointerDown(ctx: ToolContext): void {
    if (ctx.intersectedObjectId) {
      useSceneStore.getState().deleteObjects([ctx.intersectedObjectId]);
    }
  }

  onPointerMove(): void {}
  onPointerUp(): void {}
}
