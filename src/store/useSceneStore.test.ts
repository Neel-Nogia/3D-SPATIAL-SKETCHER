/**
 * Unit tests for zustand store actions and history.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore } from './useSceneStore';
import type { Vec3 } from '../types/scene';

describe('useSceneStore', () => {
  beforeEach(() => {
    useSceneStore.getState().clearProject();
  });

  it('adds an object with default properties and assigns unique id', () => {
    const store = useSceneStore.getState();
    const id = store.addObject({
      type: 'box',
      size: [2, 2, 2],
      color: '#ff0000',
      thickness: 2,
      opacity: 1,
      wireframe: false,
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      locked: false,
    });

    const updatedState = useSceneStore.getState();
    expect(updatedState.order).toContain(id);
    expect(updatedState.objects[id]).toBeDefined();
    expect(updatedState.objects[id].name).toBe('Box 1');
    expect(updatedState.objects[id].type).toBe('box');
  });

  it('selects and deselects objects', () => {
    const store = useSceneStore.getState();
    const id1 = store.addObject({
      type: 'sphere',
      radius: 1,
      color: '#00ff00',
      thickness: 2,
      opacity: 1,
      wireframe: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      locked: false,
    });

    useSceneStore.getState().select(id1);
    expect(useSceneStore.getState().selectedIds).toEqual([id1]);

    useSceneStore.getState().deselectAll();
    expect(useSceneStore.getState().selectedIds).toEqual([]);
  });

  it('deletes objects and records undo history', () => {
    const store = useSceneStore.getState();
    const id = store.addObject({
      type: 'cylinder',
      radius: 1,
      height: 2,
      color: '#0000ff',
      thickness: 2,
      opacity: 1,
      wireframe: false,
      position: [1, 1, 1],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      locked: false,
    });

    expect(useSceneStore.getState().order.length).toBe(1);

    useSceneStore.getState().deleteObjects([id]);
    expect(useSceneStore.getState().order.length).toBe(0);
    expect(useSceneStore.getState().objects[id]).toBeUndefined();

    // Test Undo
    useSceneStore.getState().undo();
    expect(useSceneStore.getState().order.length).toBe(1);
    expect(useSceneStore.getState().objects[id]).toBeDefined();
  });

  it('duplicates objects with an offset', () => {
    const store = useSceneStore.getState();
    const pos: Vec3 = [2, 0, 2];
    const id = store.addObject({
      type: 'box',
      size: [1, 1, 1],
      color: '#ffff00',
      thickness: 2,
      opacity: 1,
      wireframe: false,
      position: pos,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      locked: false,
    });

    useSceneStore.getState().duplicateObjects([id]);
    const state = useSceneStore.getState();
    expect(state.order.length).toBe(2);

    const dupId = state.selectedIds[0];
    expect(dupId).not.toBe(id);
    expect(state.objects[dupId].position[0]).toBeCloseTo(pos[0] + 0.5);
    expect(state.objects[dupId].position[2]).toBeCloseTo(pos[2] + 0.5);
  });
});
