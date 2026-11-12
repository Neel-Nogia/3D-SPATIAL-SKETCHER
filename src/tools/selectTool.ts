/**
 * SelectTool — Click to select, Shift+click multi-select, click empty space to deselect.
 */
import type { Tool, ToolContext } from './tool';
import { useSceneStore } from '../store/useSceneStore';

export class SelectTool implements Tool {
  id = 'select';
  label = 'Select';
  icon = 'MousePointer2';
  shortcut = 'V';

  onPointerDown(ctx: ToolContext): void {
    if (ctx.intersectedObjectId) {
      if (ctx.shiftKey) {
        useSceneStore.getState().selectMultiple(ctx.intersectedObjectId);
      } else {
        useSceneStore.getState().select(ctx.intersectedObjectId);
      }
    } else {
      // Clicked on empty space
      if (!ctx.shiftKey) {
        useSceneStore.getState().deselectAll();
      }
    }
  }

  onPointerMove(): void {}
  onPointerUp(): void {}
}
