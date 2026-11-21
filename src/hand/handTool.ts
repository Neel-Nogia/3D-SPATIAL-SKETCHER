/**
 * handTool — Bridges hand tracking gestures to the active Tool in toolRegistry and 3D Camera Controls.
 * Supports:
 * - Primary Hand: 3D Pen / Shape Drawing by pinching (thumb + index touching).
 * - Secondary Hand: Spatial Gyroscope / Camera Orbit navigator (move hand to rotate 3D view).
 * - Dual-Hand Zoom: Move both hands apart to zoom in, closer to zoom out.
 * - Single-Hand Open Palm: Gyroscope Camera Orbit fallback.
 * - Thumbs Up: Undo previous stroke / shape.
 */
import * as THREE from 'three';
import { toolRegistry } from '../tools/registry';
import { useSceneStore } from '../store/useSceneStore';
import type { HandFrameData } from './useHandTracking';
import type { Vec3, DrawingPlane } from '../types/scene';

export class HandToolBridge {
  private isPinching = false;
  private lastPalmCenter: { x: number; y: number } | null = null;
  private lastSecPalmCenter: { x: number; y: number } | null = null;
  private thumbsUpStartTime: number | null = null;
  private lastUndoTime = 0;
  private lastTwoHandDist: number | null = null;
  private lastPoint3D: Vec3 | null = null;

  /**
   * Projects 2D normalized screen coordinates [0, 1] through camera to intersect the active 3D drawing plane.
   * If aiming above horizon or away from primary plane, falls back to a camera-facing plane
   * so the user can sketch freely anywhere in the camera view without strokes abruptly dying.
   */
  projectToPlane(
    screenX: number,
    screenY: number,
    camera: THREE.Camera,
    plane: DrawingPlane,
    offset: number,
  ): Vec3 {
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

    // If intersection exists and is within practical drawing boundary
    if (result && hit.distanceTo(camera.position) < 60) {
      return [hit.x, hit.y, hit.z];
    }

    // Fallback: Plane perpendicular to camera view direction passing through (0, offset, 0)
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const viewPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      camDir.clone().negate(),
      new THREE.Vector3(0, offset, 0),
    );
    const fallbackHit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(viewPlane, fallbackHit)) {
      return [fallbackHit.x, fallbackHit.y, fallbackHit.z];
    }

    // Secondary fallback: Fixed depth point along ray
    const forwardPoint = raycaster.ray.at(10, new THREE.Vector3());
    return [forwardPoint.x, forwardPoint.y, forwardPoint.z];
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
      if (this.isPinching && this.lastPoint3D) {
        this.triggerPointerUp(this.lastPoint3D);
      }
      this.lastPalmCenter = null;
      this.lastSecPalmCenter = null;
      this.lastTwoHandDist = null;
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
    this.lastPoint3D = point3D;

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

    // Secondary Hand: Spatial Gyroscope / Orbit Navigator
    if (frame.secondaryHand && onOrbitDelta) {
      const secPalm = frame.secondaryHand.detection.palmCenter;
      if (this.lastSecPalmCenter) {
        const deltaX = (secPalm.x - this.lastSecPalmCenter.x) * 12;
        const deltaY = (secPalm.y - this.lastSecPalmCenter.y) * 12;
        if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
          onOrbitDelta(deltaX, deltaY);
        }
      }
      this.lastSecPalmCenter = secPalm;
    } else {
      this.lastSecPalmCenter = null;
    }

    // Dual-Hand Spatial Zoom
    if (frame.secondaryHand && frame.twoHandPinchDistance !== null && onZoomDelta) {
      if (this.lastTwoHandDist !== null) {
        const delta = (frame.twoHandPinchDistance - this.lastTwoHandDist) * 10;
        if (Math.abs(delta) > 0.005) {
          onZoomDelta(delta);
        }
      }
      this.lastTwoHandDist = frame.twoHandPinchDistance;
    } else {
      this.lastTwoHandDist = null;
    }

    // Single-Hand OPEN PALM -> Gyroscope Orbit fallback
    if (!frame.secondaryHand && detection.gesture === 'open_palm') {
      if (this.isPinching) {
        this.triggerPointerUp(point3D);
      }

      if (this.lastPalmCenter && onOrbitDelta) {
        const deltaX = (detection.palmCenter.x - this.lastPalmCenter.x) * 10;
        const deltaY = (detection.palmCenter.y - this.lastPalmCenter.y) * 10;
        if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
          onOrbitDelta(deltaX, deltaY);
        }
      }
      this.lastPalmCenter = detection.palmCenter;
      return point3D;
    } else {
      this.lastPalmCenter = null;
    }

    // Primary Hand: PINCH -> Draw / PointerDown / PointerMove / PointerUp
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
    this.lastSecPalmCenter = null;
    this.thumbsUpStartTime = null;
    this.lastTwoHandDist = null;
    this.lastPoint3D = null;
  }
}
