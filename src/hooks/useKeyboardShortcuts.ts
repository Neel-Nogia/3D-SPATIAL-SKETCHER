/**
 * useKeyboardShortcuts — global keyboard shortcuts handler.
 * Maps shortcuts to tools and editing actions.
 */
import { useEffect } from 'react';
import { useSceneStore } from '../store/useSceneStore';
import type { ToolId } from '../types/scene';

const toolKeyMap: Record<string, ToolId> = {
  v: 'select',
  w: 'move',
  e: 'rotate',
  r: 'scale',
  p: 'pen',
  l: 'line',
  q: 'rect',
  c: 'circle',
  b: 'box',
  o: 'sphere',
  y: 'cylinder',
  n: 'cone',
  x: 'eraser',
};

interface ShortcutHandlers {
  onOpenHelp?: () => void;
}

export function useKeyboardShortcuts(handlers?: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // Help modal (?)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        handlers?.onOpenHelp?.();
        return;
      }

      // Undo / Redo
      if (isCtrl && key === 'z') {
        e.preventDefault();
        if (isShift) {
          useSceneStore.getState().redo();
        } else {
          useSceneStore.getState().undo();
        }
        return;
      }

      if (isCtrl && key === 'y') {
        e.preventDefault();
        useSceneStore.getState().redo();
        return;
      }

      // Select All
      if (isCtrl && key === 'a') {
        e.preventDefault();
        useSceneStore.getState().selectAll();
        return;
      }

      // Duplicate
      if (isCtrl && key === 'd') {
        e.preventDefault();
        const selected = useSceneStore.getState().selectedIds;
        if (selected.length > 0) {
          useSceneStore.getState().duplicateObjects(selected);
        }
        return;
      }

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = useSceneStore.getState().selectedIds;
        if (selected.length > 0) {
          e.preventDefault();
          useSceneStore.getState().deleteObjects(selected);
        }
        return;
      }

      // Escape deselects all
      if (e.key === 'Escape') {
        e.preventDefault();
        useSceneStore.getState().deselectAll();
        return;
      }

      // Snapping toggle (G)
      if (!isCtrl && key === 'g') {
        e.preventDefault();
        useSceneStore.getState().toggleSnap();
        return;
      }

      // Tool selection shortcuts (without Ctrl/Meta)
      if (!isCtrl && toolKeyMap[key]) {
        e.preventDefault();
        useSceneStore.getState().setActiveTool(toolKeyMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
