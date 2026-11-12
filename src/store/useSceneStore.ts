/**
 * Main application store using zustand.
 * This is the SINGLE SOURCE OF TRUTH for the entire app.
 * All scene objects, selection state, tool state, and settings live here.
 */
import { create } from 'zustand';
import type {
  SceneObject,
  DrawingPlane,
  ToolId,
  Theme,
  SnapSize,
  Vec3,
} from '../types/scene';
import { generateId } from '../utils/ids';

/** A snapshot of the scene state for undo/redo */
interface SceneSnapshot {
  objects: Record<string, SceneObject>;
  order: string[];
}

/** The full store state and actions */
interface SceneStore {
  // --- Scene data ---
  objects: Record<string, SceneObject>;
  order: string[]; // draw order (IDs), newest last
  selectedIds: string[];

  // --- Tool state ---
  activeTool: ToolId;

  // --- Drawing plane ---
  drawingPlane: DrawingPlane;
  planeOffset: number;

  // --- Snapping ---
  snapEnabled: boolean;
  snapSize: SnapSize;

  // --- Theme ---
  theme: Theme;

  // --- Project ---
  projectName: string;

  // --- Undo / Redo ---
  past: SceneSnapshot[];
  future: SceneSnapshot[];

  // --- Counters for auto-naming ---
  nameCounts: Record<string, number>;

  // --- Actions ---
  setActiveTool: (tool: ToolId) => void;
  setDrawingPlane: (plane: DrawingPlane) => void;
  setPlaneOffset: (offset: number) => void;
  setSnapEnabled: (enabled: boolean) => void;
  toggleSnap: () => void;
  setSnapSize: (size: SnapSize) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setProjectName: (name: string) => void;

  // Object actions (these push to undo history)
  addObject: (obj: Omit<SceneObject, 'id' | 'name'> & { name?: string }) => string;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  deleteObjects: (ids: string[]) => void;
  duplicateObjects: (ids: string[]) => void;

  // Selection
  select: (id: string) => void;
  selectMultiple: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;

  // Layer management
  setObjectVisibility: (id: string, visible: boolean) => void;
  setObjectLocked: (id: string, locked: boolean) => void;
  renameObject: (id: string, name: string) => void;
  reorderObject: (id: string, direction: 'up' | 'down') => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Persistence
  loadProject: (objects: Record<string, SceneObject>, order: string[], name: string) => void;
  clearProject: () => void;
  getProjectData: () => { objects: Record<string, SceneObject>; order: string[]; name: string };
}

/** Maximum undo history entries */
const MAX_HISTORY = 100;

/** Get the initial theme from localStorage or system preference */
function getInitialTheme(): Theme {
  const saved = localStorage.getItem('sketcher-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Helper to generate a name like "Box 3" */
function generateName(type: string, counts: Record<string, number>): string {
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  const count = (counts[type] || 0) + 1;
  return `${label} ${count}`;
}

/** Create a snapshot of the current scene state */
function takeSnapshot(state: SceneStore): SceneSnapshot {
  return {
    objects: { ...state.objects },
    order: [...state.order],
  };
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  // --- Initial state ---
  objects: {},
  order: [],
  selectedIds: [],
  activeTool: 'select',
  drawingPlane: 'XZ',
  planeOffset: 0,
  snapEnabled: false,
  snapSize: 0.5,
  theme: getInitialTheme(),
  projectName: 'Untitled Project',
  past: [],
  future: [],
  nameCounts: {},

  // --- Simple setters ---
  setActiveTool: (tool) => set({ activeTool: tool }),
  setDrawingPlane: (plane) => set({ drawingPlane: plane }),
  setPlaneOffset: (offset) => set({ planeOffset: Math.max(-20, Math.min(20, offset)) }),
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  setSnapSize: (size) => set({ snapSize: size }),
  setTheme: (theme) => {
    localStorage.setItem('sketcher-theme', theme);
    set({ theme });
  },
  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('sketcher-theme', newTheme);
    set({ theme: newTheme });
  },
  setProjectName: (name) => set({ projectName: name }),

  // --- Object actions ---
  addObject: (objData) => {
    const state = get();
    const id = generateId();
    const type = objData.type;
    const newCounts = { ...state.nameCounts, [type]: (state.nameCounts[type] || 0) + 1 };
    const name = objData.name || generateName(type, state.nameCounts);

    const obj: SceneObject = {
      id,
      name,
      type: objData.type,
      points: objData.points,
      size: objData.size,
      radius: objData.radius,
      height: objData.height,
      color: objData.color,
      thickness: objData.thickness,
      opacity: objData.opacity,
      wireframe: objData.wireframe,
      position: objData.position,
      rotation: objData.rotation,
      scale: objData.scale,
      visible: objData.visible,
      locked: objData.locked,
    };

    // Push history before making the change
    const snapshot = takeSnapshot(state);
    const past = [...state.past, snapshot].slice(-MAX_HISTORY);

    set({
      objects: { ...state.objects, [id]: obj },
      order: [...state.order, id],
      past,
      future: [], // clear redo on new action
      nameCounts: newCounts,
    });

    return id;
  },

  updateObject: (id, updates) => {
    const state = get();
    if (!state.objects[id]) return;

    set({
      objects: {
        ...state.objects,
        [id]: { ...state.objects[id], ...updates },
      },
    });
  },

  deleteObjects: (ids) => {
    const state = get();
    if (ids.length === 0) return;

    const snapshot = takeSnapshot(state);
    const past = [...state.past, snapshot].slice(-MAX_HISTORY);

    const newObjects = { ...state.objects };
    for (const id of ids) {
      delete newObjects[id];
    }

    set({
      objects: newObjects,
      order: state.order.filter((id) => !ids.includes(id)),
      selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
      past,
      future: [],
    });
  },

  duplicateObjects: (ids) => {
    const state = get();
    if (ids.length === 0) return;

    const snapshot = takeSnapshot(state);
    const past = [...state.past, snapshot].slice(-MAX_HISTORY);

    const newObjects = { ...state.objects };
    const newOrder = [...state.order];
    const newSelectedIds: string[] = [];
    const newCounts = { ...state.nameCounts };

    for (const id of ids) {
      const original = state.objects[id];
      if (!original) continue;

      const newId = generateId();
      newCounts[original.type] = (newCounts[original.type] || 0) + 1;

      const duplicate: SceneObject = {
        ...original,
        id: newId,
        name: generateName(original.type, { ...newCounts, [original.type]: newCounts[original.type] - 1 }),
        position: [
          original.position[0] + 0.5,
          original.position[1],
          original.position[2] + 0.5,
        ] as Vec3,
      };

      newObjects[newId] = duplicate;
      newOrder.push(newId);
      newSelectedIds.push(newId);
    }

    set({
      objects: newObjects,
      order: newOrder,
      selectedIds: newSelectedIds,
      past,
      future: [],
      nameCounts: newCounts,
    });
  },

  // --- Selection ---
  select: (id) => {
    const state = get();
    const obj = state.objects[id];
    if (!obj || obj.locked) return;
    set({ selectedIds: [id] });
  },

  selectMultiple: (id) => {
    const state = get();
    const obj = state.objects[id];
    if (!obj || obj.locked) return;

    if (state.selectedIds.includes(id)) {
      set({ selectedIds: state.selectedIds.filter((sid) => sid !== id) });
    } else {
      set({ selectedIds: [...state.selectedIds, id] });
    }
  },

  selectAll: () => {
    const state = get();
    const selectableIds = state.order.filter((id) => {
      const obj = state.objects[id];
      return obj && !obj.locked && obj.visible;
    });
    set({ selectedIds: selectableIds });
  },

  deselectAll: () => set({ selectedIds: [] }),

  // --- Layer management ---
  setObjectVisibility: (id, visible) => {
    const state = get();
    if (!state.objects[id]) return;
    set({
      objects: {
        ...state.objects,
        [id]: { ...state.objects[id], visible },
      },
      // Deselect hidden objects
      selectedIds: visible
        ? state.selectedIds
        : state.selectedIds.filter((sid) => sid !== id),
    });
  },

  setObjectLocked: (id, locked) => {
    const state = get();
    if (!state.objects[id]) return;
    set({
      objects: {
        ...state.objects,
        [id]: { ...state.objects[id], locked },
      },
      // Deselect locked objects
      selectedIds: locked
        ? state.selectedIds.filter((sid) => sid !== id)
        : state.selectedIds,
    });
  },

  renameObject: (id, name) => {
    const state = get();
    if (!state.objects[id]) return;
    set({
      objects: {
        ...state.objects,
        [id]: { ...state.objects[id], name },
      },
    });
  },

  reorderObject: (id, direction) => {
    const state = get();
    const index = state.order.indexOf(id);
    if (index === -1) return;

    const newOrder = [...state.order];
    if (direction === 'up' && index < newOrder.length - 1) {
      // Move up in the visual list = move later in the array (drawn on top)
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    } else if (direction === 'down' && index > 0) {
      // Move down in the visual list = move earlier in the array
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    }
    set({ order: newOrder });
  },

  // --- Undo / Redo ---
  pushHistory: () => {
    const state = get();
    const snapshot = takeSnapshot(state);
    const past = [...state.past, snapshot].slice(-MAX_HISTORY);
    set({ past, future: [] });
  },

  undo: () => {
    const state = get();
    if (state.past.length === 0) return;

    const previous = state.past[state.past.length - 1];
    const currentSnapshot = takeSnapshot(state);

    set({
      objects: previous.objects,
      order: previous.order,
      selectedIds: [],
      past: state.past.slice(0, -1),
      future: [currentSnapshot, ...state.future],
    });
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) return;

    const next = state.future[0];
    const currentSnapshot = takeSnapshot(state);

    set({
      objects: next.objects,
      order: next.order,
      selectedIds: [],
      past: [...state.past, currentSnapshot],
      future: state.future.slice(1),
    });
  },

  // --- Persistence ---
  loadProject: (objects, order, name) => {
    set({
      objects,
      order,
      projectName: name,
      selectedIds: [],
      past: [],
      future: [],
    });
  },

  clearProject: () => {
    set({
      objects: {},
      order: [],
      selectedIds: [],
      past: [],
      future: [],
      projectName: 'Untitled Project',
      nameCounts: {},
    });
  },

  getProjectData: () => {
    const state = get();
    return {
      objects: state.objects,
      order: state.order,
      name: state.projectName,
    };
  },
}));
