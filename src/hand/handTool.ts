/**
 * handTool — Bridges hand tracking gestures to the active Tool in toolRegistry.
 * Allows ALL existing tools (Pen, Box, Line, Eraser, etc.) to work seamlessly with hand gestures!
 */
import * as THREE from 'three';
import { toolRegistry } from '../tools/registry';
import { useSceneStore } from '../store/useSceneStore';
import type { HandFrameData } from './useHandTracking';
import type { Vec3, DrawingPlane } from '../types/scene';

export class HandToolBridge {
  private isPinching = false;
  private lastPalmCenter: { x: number; y: number } | null = null;
  private thumbsUpStartTime: number | null = null;
  private lastUndoTime = 0;
  private lastTwoHandDist: number | null = null;

  /**
   * Projects 2D normalized screen coordinates [0, 1] through camera to intersect the active 3D drawing plane.
   */
  projectToPlane(
    screenX: number,
    screenY: number,
    camera: THREE.Camera,
    plane: DrawingPlane,
    offset: number,
  ): Vec3 | null {
    // Convert [0, 1] screen coords to Normalized Device Coordinates (NDC) [-1, 1]
    const ndcX = screenX * 2 - 1;
    const ndcY = -(screenY * 2 - 1);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    // Compute mathematical plane
    let mathPlane: THREE.Plane;
    switch (plane) {
      case 'XZ':
        mathPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -offset);
        break;
      case 'XY':
        mathPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -offset);
        break;
      case 'YZ':
        mathPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -offset);
        break;
    }

    const hit = new THREE.Vector3();
    const result = raycaster.ray.intersectPlane(mathPlane, hit);
    if (!result) return null;

    return [hit.x, hit.y, hit.z];
  }

  /**
   * Dispatches hand frame events to the active tool or camera controls.
   */
  handleHandFrame(
    frame: HandFrameData,
    camera: THREE.Camera,
    onOrbitDelta?: (deltaX: number, deltaY: number) => void,
    onZoomDelta?: (delta: number) => void,
  ): Vec3 | null {
    if (!frame.primaryHand) {
      if (this.isPinching) {
        this.triggerPointerUp([0, 0, 0]);
      }
      this.lastPalmCenter = null;
      this.thumbsUpStartTime = null;
      return null;
    }

    const { detection, smoothedCursor2D } = frame.primaryHand;
    const drawingPlane = useSceneStore.getState().drawingPlane;
    const planeOffset = useSceneStore.getState().planeOffset;

    // 1. Raycast cursor to 3D point on plane
    const point3D = this.projectToPlane(
      smoothedCursor2D.x,
      smoothedCursor2D.y,
      camera,
      drawingPlane,
      planeOffset,
    );

    const now = performance.now();

    // 2. Gesture Handling

    // Gesture: THUMBS UP -> Undo (held 0.5s with 1s cooldown)
    if (detection.gesture === 'thumbs_up') {
      if (!this.thumbsUpStartTime) {
        this.thumbsUpStartTime = now;
      } else if (now - this.thumbsUpStartTime >= 500 && now - this.lastUndoTime >= 1000) {
        useSceneStore.getState().undo();
        this.lastUndoTime = now;
        this.thumbsUpStartTime = null;
      }
      return point3D;
    } else {
      this.thumbsUpStartTime = null;
    }

    // Gesture: TWO-HAND PINCH -> Zoom
    if (frame.twoHandPinchDistance !== null && frame.secondaryHand) {
      if (this.lastTwoHandDist !== null && onZoomDelta) {
        const delta = (frame.twoHandPinchDistance - this.lastTwoHandDist) * 15;
        onZoomDelta(delta);
      }
      this.lastTwoHandDist = frame.twoHandPinchDistance;
      return point3D;
    } else {
      this.lastTwoHandDist = null;
    }

    // Gesture: OPEN PALM -> Orbit Camera
    if (detection.gesture === 'open_palm') {
      if (this.isPinching && point3D) {
        this.triggerPointerUp(point3D);
      }

      if (this.lastPalmCenter && onOrbitDelta) {
        const deltaX = (detection.palmCenter.x - this.lastPalmCenter.x) * 8;
        const deltaY = (detection.palmCenter.y - this.lastPalmCenter.y) * 8;
        onOrbitDelta(deltaX, deltaY);
      }
      this.lastPalmCenter = detection.palmCenter;
      return point3D;
    } else {
      this.lastPalmCenter = null;
    }

    // Gesture: PINCH -> Draw / PointerDown / PointerMove / PointerUp
    if (point3D) {
      if (detection.isPinching) {
        if (!this.isPinching) {
          this.isPinching = true;
          this.triggerPointerDown(point3D);
        } else {
          this.triggerPointerMove(point3D);
        }
      } else {
        if (this.isPinching) {
          this.triggerPointerUp(point3D);
        }
      }
    }

    return point3D;
  }

  private triggerPointerDown(point: Vec3) {
    const activeToolId = useSceneStore.getState().activeTool;
    const tool = toolRegistry.get(activeToolId);
    if (tool) {
      tool.onPointerDown({
        pointOnPlane: point,
        intersectedObjectId: null,
        shiftKey: false,
        ctrlKey: false,
      });
    }
  }

  private triggerPointerMove(point: Vec3) {
    const activeToolId = useSceneStore.getState().activeTool;
    const tool = toolRegistry.get(activeToolId);
    if (tool) {
      tool.onPointerMove({
        pointOnPlane: point,
        intersectedObjectId: null,
        shiftKey: false,
        ctrlKey: false,
      });
    }
  }

  private triggerPointerUp(point: Vec3) {
    this.isPinching = false;
    const activeToolId = useSceneStore.getState().activeTool;
    const tool = toolRegistry.get(activeToolId);
    if (tool) {
      tool.onPointerUp({
        pointOnPlane: point,
        intersectedObjectId: null,
        shiftKey: false,
        ctrlKey: false,
      });
    }
  }

  reset() {
    this.isPinching = false;
    this.lastPalmCenter = null;
    this.thumbsUpStartTime = null;
    this.lastTwoHandDist = null;
  }
}
