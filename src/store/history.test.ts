/**
 * Unit tests for undo/redo history rules, capping, and grouping.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore } from './useSceneStore';

describe('Undo / Redo History Rules', () => {
  beforeEach(() => {
    useSceneStore.getState().clearProject();
  });

  it('records an undo step when an object is added', () => {
    const store = useSceneStore.getState();
    expect(store.past.length).toBe(0);

    const id = store.addObject({
      type: 'box',
      size: [1, 1, 1],
      color: '#ff0000',
      thickness: 1,
      opacity: 1,
      wireframe: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      locked: false,
    });

    const stateAfter = useSceneStore.getState();
    expect(stateAfter.past.length).toBe(1);
    expect(stateAfter.order).toContain(id);

    // Undo returns to 0 objects
    useSceneStore.getState().undo();
    const stateUndo = useSceneStore.getState();
    expect(stateUndo.order.length).toBe(0);
    expect(stateUndo.future.length).toBe(1);

    // Redo brings object back
    useSceneStore.getState().redo();
    const stateRedo = useSceneStore.getState();
    expect(stateRedo.order.length).toBe(1);
    expect(stateRedo.future.length).toBe(0);
  });

  it('clears the redo stack when a new action is performed after undo', () => {
    const store = useSceneStore.getState();
    store.addObject({
      type: 'sphere',
      radius: 1,
      color: '#00ff00',
      thickness: 1,
      opacity: 1,
      wireframe: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      locked: false,
    });

    useSceneStore.getState().undo();
    expect(useSceneStore.getState().future.length).toBe(1);

    // Add a new object
    useSceneStore.getState().addObject({
      type: 'cylinder',
      radius: 1,
      height: 2,
      color: '#0000ff',
      thickness: 1,
      opacity: 1,
      wireframe: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      locked: false,
    });

    // Redo stack must be cleared
    expect(useSceneStore.getState().future.length).toBe(0);
  });

  it('caps history stack at 100 entries', () => {
    for (let i = 0; i < 110; i++) {
      useSceneStore.getState().addObject({
        type: 'box',
        size: [1, 1, 1],
        color: '#ff0000',
        thickness: 1,
        opacity: 1,
        wireframe: false,
        position: [i, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        locked: false,
      });
    }

    const state = useSceneStore.getState();
    expect(state.past.length).toBeLessThanOrEqual(100);
  });

  it('locked objects cannot be selected', () => {
    const id = useSceneStore.getState().addObject({
      type: 'cone',
      radius: 1,
      height: 2,
      color: '#ffff00',
      thickness: 1,
      opacity: 1,
      wireframe: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      locked: true,
    });

    useSceneStore.getState().select(id);
    expect(useSceneStore.getState().selectedIds).not.toContain(id);
  });
});
