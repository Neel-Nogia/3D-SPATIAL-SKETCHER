# 🎓 Viva & Technical Interview Notes — 3D Spatial Sketcher

> Prepared for B.Tech CSE (AIML) Viva Examination & Technical Interviews.
> Written in simple, clear, explainable English with crisp answers.

---

## 1. Project Concept & Architecture

### Q1: What is the 3D Spatial Sketcher?
**Answer:**
It is a browser-based 3D sketching and modeling application that allows users to draw freehand strokes and place geometric shapes (boxes, spheres, cylinders, cones, rectangles, circles, lines) directly in 3D space, manipulate them with transform gizmos, orbit around the scene, and export their creations to standard 3D formats (GLTF, OBJ, PNG, JSON). It also features optional AI-powered webcam hand gesture tracking.

### Q2: Why use React Three Fiber (R3F) instead of raw imperative Three.js?
**Answer:**
- **Declarative vs. Imperative:** Raw Three.js requires manually instantiating geometries, materials, meshes, adding them to scenes, handling resize listeners, and calling `requestAnimationFrame` manually. R3F lets us express 3D scenes as declarative React components (`<mesh>`, `<boxGeometry>`, `<ambientLight>`).
- **Component Lifecycle:** R3F handles automatic resource cleanup and unmounting when an object is removed from the store, preventing WebGL memory leaks.
- **Ecosystem:** We can leverage `@react-three/drei` for production-tested camera controls (`OrbitControls`), grid helpers (`Grid`), and transform gizmos (`TransformControls`).

### Q3: Why is Three.js NOT allowed to hold authoritative state in your design?
**Answer:**
If meshes in Three.js store the authoritative state (like position, color, or shape size), React has no way of knowing when things change unless we poll or attach custom listeners. This causes state desynchronization bugs and makes features like **Undo/Redo**, **Autosave**, **Layers**, and **JSON Export** almost impossible to maintain reliably.
In our architecture, the **Zustand store is the single source of truth**. Three.js meshes are purely visual renderers of the store data.

---

## 2. State Management & Undo / Redo

### Q4: Why choose Zustand over Redux or React Context?
**Answer:**
- **No Boilerplate:** Zustand does not require reducers, action creators, or wrapping the app in context providers.
- **Selective Re-rendering:** Components subscribe only to the exact slice of state they need (e.g. `const theme = useSceneStore(s => s.theme)`). If an object updates in the store, unrelated UI buttons do not re-render.
- **Performance:** Zustand can be accessed outside React render cycles (e.g. `useSceneStore.getState().addObject(...)`), which is essential for high-frequency 60fps WebGL event loops and MediaPipe frame processors.

### Q5: How does your Undo/Redo mechanism work?
**Answer:**
We use a **snapshot-based history system**:
- Two stacks: `past` and `future`, capped at 100 entries.
- Each snapshot stores `{ objects, order }`.
- When an action is performed, the current state snapshot is pushed onto `past`, and `future` is cleared.
- Calling `undo()` pops the previous state from `past` and pushes current state to `future`.
- Calling `redo()` pops from `future` and pushes current state to `past`.
- **Grouping Rule:** Dragging a shape or gizmo does NOT push 60 states per second. The transient drag preview lives in a lightweight draft store; only on `pointerUp` is a single atomic snapshot recorded.

---

## 3. Math & Algorithms

### Q6: How does drawing on a 3D plane work mathematically?
**Answer:**
A mouse click or touch on a 2D screen corresponds to an infinite ray shooting from the camera into the 3D scene.
To find where on a plane the user is drawing:
1. We define a 3D mathematical plane equation: $\vec{n} \cdot \vec{p} + d = 0$, where $\vec{n}$ is the unit normal vector and $d$ is the plane offset.
   - Ground plane ($XZ$): $\vec{n} = (0, 1, 0)$, $d = -\text{offset}$.
   - Front plane ($XY$): $\vec{n} = (0, 0, 1)$, $d = -\text{offset}$.
   - Side plane ($YZ$): $\vec{n} = (1, 0, 0)$, $d = -\text{offset}$.
2. Using Three.js `Raycaster`, we shoot a ray from the camera through the mouse screen coordinates.
3. We calculate the ray-plane intersection point $\vec{p} = \vec{r}_0 + t\vec{r}_{\text{dir}}$ where $t = -\frac{\vec{r}_0 \cdot \vec{n} + d}{\vec{r}_{\text{dir}} \cdot \vec{n}}$.
4. That point $\vec{p}$ gives the exact 3D coordinates on the plane.

### Q7: What is the Ramer-Douglas-Peucker (RDP) algorithm? Why did you use it?
**Answer:**
- **What it is:** A line simplification algorithm that reduces the number of points in a polyline while preserving its overall visual shape.
- **Why it is needed:** When a user draws freehand in 3D, pointer events fire hundreds of times per second, generating thousands of redundant points along straight or gentle paths. This bloats file size and reduces WebGL rendering performance.
- **How it works:**
  1. Draw a line segment between the first point and last point of the curve.
  2. Find the intermediate point with the maximum perpendicular distance $\epsilon$ from this segment.
  3. If $\text{maxDist} > \epsilon$, keep this point, split the curve into two halves, and recursively simplify both halves.
  4. If $\text{maxDist} \le \epsilon$, discard all intermediate points and keep only the endpoints.
- **Time Complexity:** Average $O(n \log n)$, Worst-case $O(n^2)$.

---

## 4. Software Design & Extensibility

### Q8: How does your tool system implement the Open-Closed Principle?
**Answer:**
The Open-Closed Principle states that software entities should be open for extension, but closed for modification.
Every tool (Pen, Line, Rectangle, Circle, Box, Sphere, Cylinder, Cone, Eraser, Select, Move, Rotate, Scale) implements a common interface:
```typescript
interface Tool {
  id: string;
  label: string;
  icon: string;
  shortcut: string;
  onPointerDown(ctx: ToolContext): void;
  onPointerMove(ctx: ToolContext): void;
  onPointerUp(ctx: ToolContext): void;
}
```
All tools register in `tools/registry.ts`. When adding a new 3D tool, we never modify the Canvas component or interaction plane. We simply create the new tool file and register it.

### Q9: Why use Zod for JSON file imports?
**Answer:**
`JSON.parse()` returns an `any` type with no runtime type guarantees. If a user imports a malformed, outdated, or malicious JSON file, the application could crash or corrupt local storage.
Zod validates the schema at runtime. If any property (like `version: 1`, coordinate array length, or color hex) is missing or has the wrong type, Zod rejects it with human-readable error messages displayed in a toast notification.

---

## 5. MediaPipe Hand Tracking & Computer Vision

### Q10: What is MediaPipe and how does HandLandmarker work?
**Answer:**
Google MediaPipe is a cross-platform machine learning framework for processing perceptual data.
`HandLandmarker` uses a two-stage deep neural network:
1. **Palm Detector:** Detects the presence and bounding box of hands in the full video frame.
2. **Hand Landmark Model:** Predicts 21 3D landmarks (joints and fingertips) with normalized $x, y$ coordinates $[0, 1]$ and relative depth $z$.

### Q11: Why is pinch distance normalized by hand size?
**Answer:**
If we used absolute pixel distance between thumb tip (landmark 4) and index tip (landmark 8), moving the hand closer to or farther from the webcam would change the apparent distance, causing false pinch triggers or making it impossible to pinch when standing back.
We calculate **relative hand size** as the Euclidean distance between the wrist (landmark 0) and the middle knuckle / MCP (landmark 9):
$$\text{Normalized Pinch Distance} = \frac{\text{dist}(\text{ThumbTip}, \text{IndexTip})}{\text{dist}(\text{Wrist}, \text{MiddleMCP})}$$
This normalization makes pinch detection scale-invariant.

### Q12: What is hysteresis and why is it critical for gesture recognition?
**Answer:**
Hysteresis means the state of a system depends on its history.
If we had a single threshold (e.g. distance $< 0.4$ means pinch), when a user holds their fingers near $0.4$, micro-jitters in the webcam feed would rapidly toggle pinch on and off dozens of times per second (chatter/flicker).
By using two distinct thresholds:
- **Start threshold:** $0.38$ (fingers must get close to begin a pinch)
- **Release threshold:** $0.55$ (fingers must separate significantly to release)
We ensure smooth, stable drawing without flickering.

### Q13: What is the One Euro Filter? Why use it over a simple Moving Average?
**Answer:**
A simple Exponential Moving Average (EMA) or moving average introduces noticeable latency (lag) during fast hand movements, while still letting low-frequency hand jitter pass through when trying to draw precisely.
The **One Euro Filter** is a first-order low-pass filter with an **adaptive cutoff frequency**:
- When the hand moves slowly (low speed), the cutoff frequency decreases, filtering out jitter and keeping the 3D cursor rock-steady.
- When the hand moves quickly (high speed), the cutoff frequency automatically increases, removing lag so the cursor follows the hand instantaneously.

---

## 6. Summary Cheat Sheet for Viva

| Concept | What It Does In This Project |
|---------|------------------------------|
| **Vite** | Lightning-fast ES module bundler and dev server |
| **React Three Fiber** | Declarative React wrapper for Three.js WebGL scenes |
| **Drei** | Helper components: OrbitControls, Grid, TransformControls |
| **Zustand** | Lightweight, selector-based centralized state store |
| **Zod** | Strict runtime schema validation for imported JSON projects |
| **RDP Algorithm** | Curve simplification algorithm keeping freehand strokes clean |
| **MediaPipe** | Vision ML model detecting 21 hand joints at 30 fps in the browser |
| **One Euro Filter** | Speed-adaptive low-pass filter for jitter-free 3D cursor tracking |
| **Hysteresis** | Dual-threshold state machine preventing pinch flicker |
| **GLTF / OBJ** | Standard 3D file formats exported directly from client WebGL memory |
