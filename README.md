# 🎨 3D Spatial Sketcher

> A high-performance browser-based 3D sketching tool where users draw freehand strokes and place geometric shapes directly in 3D space, orbit around the scene, edit objects, and export their work with optional AI hand-tracking gesture controls. Zero login. Zero backend. 100% Client-Side.

[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r187-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev/)

---

## 🚀 Live Demo

👉 **[Launch 3D Spatial Sketcher (Live Link)](#)** *(Updated upon deployment)*

---

## ✨ Features

- **🎯 3D Drawing Planes:** Sketch on ground (`XZ`), front (`XY`), or side (`YZ`) planes with interactive depth offset slider ($-20$ to $+20$).
- **✏️ 8 Distinct 3D Shape Tools:**
  - `Pen (P)`: Freehand 3D strokes with real-time distance sampling & Ramer-Douglas-Peucker (RDP) curve simplification.
  - `Line (L)`: Click-and-drag straight lines in 3D space.
  - `Rectangle (Q)`: 4-corner planar rectangles.
  - `Circle (C)`: Planar circles with radius drag.
  - `Box (B)`: 3D bounding boxes with automatic height estimation.
  - `Sphere (O)`: 3D spheres with radius sizing.
  - `Cylinder (Y)`: 3D cylinders aligned with plane normal.
  - `Cone (N)`: 3D cones with customizable proportions.
  - `Eraser (X)`: Click any object in the 3D canvas to delete it instantly.
- **🔄 Interactive Transform Gizmos:** Move (`W`), Rotate (`E`), and Scale (`R`) selected objects with Drei `TransformControls`.
- **🎛️ Properties & Styling Panel:** Live color picker with 8 preset swatches, stroke thickness slider (1-20), opacity slider, wireframe toggle for solid geometry, and real-time numeric inputs for Position, Rotation (degrees), and Scale.
- **📑 Hierarchical Layers Panel:** Visual draw order list (newest on top), inline object rename, visibility eye toggle, lock toggle (prevents canvas edits), and layer depth reordering.
- **🧲 Precision Snapping (G):** Toggleable grid snapping with step size dropdown ($0.1, 0.25, 0.5, 1.0$) for drawing points and translation, plus $15^\circ$ rotation snapping.
- **↩️ Full Undo / Redo:** Multi-step history stack capped at 100 entries with smart grouping (one continuous drag = one undo state).
- **💾 Auto-Persistence & Validation:** Debounced 500ms localStorage autosave, JSON project backup (`.sketch.json`) validated strictly at runtime using **Zod**.
- **📦 Multi-Format 3D Export:** Export canvas screenshots to `.png` (with alpha transparency toggle), `.glb` binary 3D models via `GLTFExporter`, and `.obj` geometry via `OBJExporter` (excluding helper grids).
- **🖐️ AI Hand-Tracking Control (MediaPipe):** Optional webcam control mapping hand gestures to 3D sketching, palm camera rotation, pinch drawing, and thumbs-up undo.

---

## 🖐️ Hand Tracking Mode (MediaPipe)

Enable **Hand Mode** in the top bar to draw in 3D using your webcam. All video processing occurs strictly on your machine—**no video data is ever uploaded**.

### Supported Gestures

| Gesture | Action | Description |
|---------|--------|-------------|
| **🤏 Pinch** | **Draw / PointerDown** | Distance between thumb tip and index tip divided by hand size falls under threshold with dual-threshold hysteresis. |
| **✋ Open Palm** | **Orbit Camera** | All 5 fingers extended; moving palm rotates the camera smoothly around the scene. |
| **✊ Fist** | **Idle** | Fingers curled; pauses drawing or camera actions. |
| **👍 Thumbs Up** | **Undo** | Hold thumb upright for 0.5 seconds to trigger Undo (1s cooldown). |
| **🤲 Two-Hand Pinch** | **Zoom In / Out** | Distance delta between both hands zooms the 3D camera. |

### Tips for Best Accuracy:
1. Ensure good ambient lighting (avoid backlighting).
2. Position your hand $50\text{--}80\text{ cm}$ from the webcam.
3. Keep the background relatively uncluttered.

---

## ⌨️ Keyboard Shortcuts

| Key | Tool / Action | Key | Tool / Action |
|:---:|:---|:---:|:---|
| **`V`** | Select Tool | **`P`** | Freehand Pen |
| **`W`** | Move Gizmo | **`L`** | Straight Line |
| **`E`** | Rotate Gizmo | **`Q`** | Rectangle |
| **`R`** | Scale Gizmo | **`C`** | Circle |
| **`B`** | Box Tool | **`O`** | Sphere Tool |
| **`Y`** | Cylinder Tool | **`N`** | Cone Tool |
| **`X`** | Eraser Tool | **`G`** | Toggle Grid Snapping |
| **`Ctrl + Z`** | Undo | **`Ctrl + Shift + Z`** | Redo |
| **`Ctrl + D`** | Duplicate Selected | **`Ctrl + A`** | Select All |
| **`Delete`** | Delete Selected | **`Escape`** | Deselect All |
| **`Space + Drag`**| Orbit Camera | **`?`** | Help & Shortcuts Modal |

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | React 18 + Vite | Component architecture & blazing fast HMR |
| **Language** | TypeScript (Strict) | Compile-time type safety & clean contracts |
| **3D Engine** | Three.js + R3F + Drei | WebGL rendering, OrbitControls, TransformControls |
| **State** | Zustand | Zero-boilerplate single source of truth |
| **Validation** | Zod | Runtime schema validation for imported JSON files |
| **Styling** | Tailwind CSS v4 | Clean modern UI styling & dark/light theme |
| **Computer Vision**| MediaPipe Tasks Vision | 21 3D hand landmark detection at 30 fps |
| **Testing** | Vitest + Testing Library | Comprehensive unit tests for math, store, gestures |

---

## 📂 Project Structure

```
src/
├── components/          # UI: TopBar, Toolbar, Canvas3D, Properties, Layers, StatusBar, Modals
├── scene/               # Three.js: SceneObjectMesh, DrawingPlane, SceneHelpers, SelectionGizmo
├── tools/               # Tool interface, registry, and individual tool modules (Pen, Box, etc.)
├── store/               # useSceneStore (Zustand), history stack, autosave persistence
├── hand/                # MediaPipe tracking, gesture detection, smoothing filter, HandCursor
├── hooks/               # usePointerOnPlane, useKeyboardShortcuts
├── utils/               # RDP simplify algorithm, grid snap, GLTF/OBJ export, Zod validation
└── types/               # scene.ts (SceneObject, ObjectType, Vec3, DrawingPlane)
```

---

## 🏃 Getting Started

### Prerequisites
- Node.js 20.x or later
- npm or pnpm

### Installation & Development
```bash
# 1. Clone repository
git clone https://github.com/Neel-Nogia/3d-spatial-sketcher.git
cd 3d-spatial-sketcher

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Run test suite
npm run test

# 5. Build for production
npm run build

# 6. Run linter
npm run lint
```

---

## 🧠 How It Works (Short)

1. **Raycasting on Mathematical Planes:** The 2D pointer is converted into a 3D ray through the camera frustum and mathematically intersected with the chosen plane ($XZ$, $XY$, or $YZ$).
2. **Open-Closed Tool System:** Each tool implements the `Tool` interface. Drawing events stream through the active tool, which generates transient preview drafts during drag and commits full objects to Zustand on pointer up.
3. **Smart Curve Simplification:** The Ramer-Douglas-Peucker (RDP) algorithm removes redundant collinear vertices from freehand pen strokes while preserving geometric curves.
4. **Predictable Undo/Redo:** Structural snapshots of `{ objects, order }` are pushed to history stacks only upon committed changes (never on raw mouse movements), capping at 100 entries.

---

## ⚠️ Known Limitations
- Webcam gesture precision is influenced by user camera resolution and ambient lighting conditions.
- Ultra-dense scenes ($> 2,000$ objects) may experience FPS drops on integrated low-power GPUs without instanced batching.

## 🔮 Future Scope
- Lathe / Extrude custom 2D SVG profiles into 3D geometry.
- Multi-user WebRTC collaborative sketching room.
- Physics simulation sandbox mode (gravity and collision tests on drawn shapes).
- VR / WebXR direct spatial controller support.

---

## 👤 Author

**Nogia Neel Pravin**
- GitHub: [@Neel-Nogia](https://github.com/Neel-Nogia)
- B.Tech Computer Science & Engineering (AIML)
