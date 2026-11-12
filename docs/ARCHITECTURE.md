# 🏛️ Architecture Documentation — 3D Spatial Sketcher

A high-performance, browser-based 3D spatial sketching and modeling application built with React 18, TypeScript, Three.js, React Three Fiber, Zustand, and MediaPipe Hand Tracking.

---

## 1. High-Level Data Flow

```
+─────────────────────────────────────────────────────────────────────────+
|                                USER INPUT                               |
|   (Mouse Click/Drag, Keyboard Shortcuts, Touch Gestures, Hand Tracking) |
+────────────────────────────────────┬────────────────────────────────────+
                                     │
                                     ▼
+─────────────────────────────────────────────────────────────────────────+
|                         INPUT BRIDGING & HOOKS                          |
|  - usePointerOnPlane: Raycasts screen coords -> 3D Drawing Plane (XZ/XY)|
|  - useKeyboardShortcuts: Maps keys (V, W, E, R, P, L, Q...) to Actions  |
|  - HandToolBridge: Maps 21 MediaPipe landmarks -> Raycasts & Gestures   |
+────────────────────────────────────┬────────────────────────────────────+
                                     │
                                     ▼
+─────────────────────────────────────────────────────────────────────────+
|                           TOOL REGISTRY SYSTEM                          |
|  - SelectTool, MoveTool, RotateTool, ScaleTool                          |
|  - PenTool (RDP Simplification), LineTool, RectTool, CircleTool         |
|  - BoxTool, SphereTool, CylinderTool, ConeTool, EraserTool              |
|                                                                         |
|  * While Dragging: Updates transient `useDraftStore` (No history cost)  |
|  * On Pointer Up:  Commits final SceneObject to Zustand Store           |
+────────────────────────────────────┬────────────────────────────────────+
                                     │
                                     ▼
+─────────────────────────────────────────────────────────────────────────+
|                        ZUSTAND STORE (Single Truth)                     |
|  - objects: Record<string, SceneObject>                                 |
|  - order: string[]                                                      |
|  - selectedIds: string[]                                                |
|  - past[] / future[]: Snapshot history stacks (Capped at 100)           |
|  - activeTool, drawingPlane, planeOffset, snapEnabled, theme            |
+──────────────────┬─────────────────┬──────────────────┬─────────────────+
                   │                 │                  │
                   ▼                 ▼                  ▼
          +────────────────+ +────────────────+ +────────────────+
          |  R3F RENDERER  | |   UI PANELS    | |  PERSISTENCE   |
          | - Canvas3D     | | - TopBar       | | - Autosave     |
          | - SceneHelpers | | - Toolbar      | |   (500ms debounce|
          | - ObjectsMesh  | | - Properties   | | - JSON export/ |
          | - DrawingPlane | | - Layers       | |   import (Zod) |
          | - Gizmo (Drei) | | - StatusBar    | | - GLTF/OBJ/PNG |
          +────────────────+ +────────────────+ +────────────────+
```

---

## 2. Core Architectural Pillars

### A. The Zustand Store is Authoritative
In Three.js applications, a common anti-pattern is letting `THREE.Mesh` objects store authoritative position, rotation, scale, or color. When this happens, React and Three.js fight for control.

In **3D Spatial Sketcher**, the store is the **single source of truth**:
1. All geometry parameters (`size`, `radius`, `height`, `points`), appearance (`color`, `thickness`, `opacity`, `wireframe`), and transforms (`position`, `rotation`, `scale`) live in plain TypeScript objects in Zustand.
2. React Three Fiber components (`<SceneObjectMesh />`) are pure declarative renderers that mirror this state.
3. When TransformControls or the Properties Panel changes an object, they write to the store, which updates the scene.

### B. Tool Registry & Open-Closed Principle
All sketching, selection, and transform operations implement a uniform `Tool` interface:
```typescript
interface Tool {
  id: string;
  label: string;
  icon: string;
  shortcut: string;
  onPointerDown(ctx: ToolContext): void;
  onPointerMove(ctx: ToolContext): void;
  onPointerUp(ctx: ToolContext): void;
  reset?(): void;
}
```
All tools are registered in `src/tools/registry.ts`.
- **Zero canvas modifications**: Adding a new tool (e.g. Pyramid or Torus) requires writing one file in `src/tools/` and adding one line in `registry.ts`. The 3D canvas and interaction plane code never needs to be edited.
- **Transient Drafts**: During mouse drag, shapes are rendered via a separate lightweight `useDraftStore`. This avoids pushing 60 state snapshots per second into the undo stack and prevents re-render storms across the UI.

### C. Snapshot-Based Undo / Redo
Undo/redo is implemented using state snapshots of `{ objects, order }`:
- **Past Stack**: Up to 100 immutable snapshots of past states.
- **Future Stack**: Redo stack, cleared automatically whenever a new mutation occurs.
- **Grouping Rules**:
  - One continuous freehand pen stroke = 1 history entry (committed on `pointerUp`).
  - One gizmo transform drag = 1 history entry (committed on `pointerUp`).
  - Editing a numeric property or color = 1 history entry (committed on `blur` or `Enter`).
  - Deleting multiple selected objects = 1 atomic history entry.

---

## 3. 3D Drawing Plane & Raycasting

Users cannot draw arbitrarily in empty 3D space because a 2D screen coordinate $(x, y)$ corresponds to an infinite ray from the camera into the scene.

To allow precise 3D placement without a VR headset:
1. We define a mathematical 2D plane embedded in 3D:
   - **XZ (Ground)**: Normal $(0, 1, 0)$, offset along $Y$.
   - **XY (Front)**: Normal $(0, 0, 1)$, offset along $Z$.
   - **YZ (Side)**: Normal $(1, 0, 0)$, offset along $X$.
2. The user's screen pointer is cast as a ray from the camera using Three.js `Raycaster`.
3. `ray.intersectPlane(mathPlane, targetVector)` calculates the exact $[x, y, z]$ point on the plane.
4. When **Snap to Grid** is active, the coordinates are rounded to the nearest step ($0.1, 0.25, 0.5, 1.0$) via `snapVec3()`.

---

## 4. MediaPipe Hand Tracking Architecture

Webcam gesture interaction runs as an optional, non-intrusive layer that bridges directly into the same `Tool` interface used by the mouse:

```
Webcam Stream -> MediaPipe HandLandmarker (GPU/CPU) -> 21 3D Landmarks
  │
  ├─> Index Fingertip (Landmark 8) -> Mirrored X -> One Euro Filter -> Raycast to Plane -> 3D Cursor
  │
  ├─> Pinch Detection -> Hysteresis Filter -> tool.onPointerDown/Move/Up
  │
  ├─> Open Palm -> Palm Center Delta -> Camera Orbit Controls
  │
  ├─> Two-Hand Distance Delta -> Camera Dolly/Zoom
  │
  └─> Thumbs Up (0.5s hold) -> useSceneStore.undo()
```

1. **Inference Outside React State**: Inference runs via `requestAnimationFrame` and stores state in mutable `useRef` instances. This guarantees that 30 fps webcam inference never causes React re-render cascades.
2. **Normalized Distance Pinch**: Pinch is calculated as $\frac{\text{dist}(\text{thumbTip}, \text{indexTip})}{\text{dist}(\text{wrist}, \text{middleMCP})}$. This makes pinch detection invariant to how close or far the user stands from the camera.
3. **Hysteresis**: A dual-threshold gate (enter at $0.38$, exit at $0.55$) prevents rapid toggling/flicker when the user's fingers hover near the boundary.
4. **One Euro Filter**: An adaptive low-pass filter dynamically balances responsiveness during fast motions with stillness and stability during steady drawing.
