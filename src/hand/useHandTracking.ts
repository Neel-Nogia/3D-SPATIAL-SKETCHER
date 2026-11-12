/**
 * useHandTracking hook — Camera + MediaPipe HandLandmarker lifecycle.
 * - Manages webcam stream via navigator.mediaDevices.getUserMedia (optimized 480x360).
 * - MediaPipe FilesetResolver & HandLandmarker with GPU delegate and CPU fallback.
 * - Caps inference loop to 30 fps to preserve 60 fps canvas rendering.
 * - Performs all frame calculations outside React state to eliminate re-render storms.
 * - Directly renders skeleton overlay to an HTMLCanvasElement context without React diffing.
 * - Cleanly releases media tracks and model resources when disabled.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { detectGesture, type GestureDetectionResult, type Landmark, type GestureType } from './gestures';
import { OneEuroFilter3D } from './smoothing';
import { handCursorState } from './handCursorBridge';

export type HandTrackingStatus =
  | 'off'
  | 'loading'
  | 'ready'
  | 'no_hand'
  | 'tracking'
  | 'permission_denied'
  | 'no_camera'
  | 'error';

export interface HandFrameData {
  primaryHand: {
    landmarks: Landmark[];
    detection: GestureDetectionResult;
    cursor2D: { x: number; y: number }; // Normalized screen coords [0, 1]
    smoothedCursor2D: { x: number; y: number };
  } | null;
  secondaryHand: {
    landmarks: Landmark[];
    detection: GestureDetectionResult;
  } | null;
  twoHandPinchDistance: number | null;
}

interface UseHandTrackingOptions {
  onError?: (msg: string) => void;
}

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm base
];

export function useHandTracking(isEnabled: boolean, options?: UseHandTrackingOptions) {
  const [status, setStatus] = useState<HandTrackingStatus>('off');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('idle');

  const currentStatusRef = useRef<HandTrackingStatus>('off');
  const currentGestureRef = useRef<GestureType>('idle');
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const videoFeedRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastInferenceTimeRef = useRef<number>(0);

  // Filter and gesture tracking refs
  const filterRef = useRef(new OneEuroFilter3D(1.2, 0.05, 1.0));
  const wasPinchingRef = useRef(false);

  // Callback subscriber for hand frame events
  const onFrameRef = useRef<((data: HandFrameData) => void) | null>(null);

  const updateStatus = useCallback((newStatus: HandTrackingStatus) => {
    if (currentStatusRef.current !== newStatus) {
      currentStatusRef.current = newStatus;
      setStatus(newStatus);
    }
  }, []);

  const updateGesture = useCallback((newGesture: GestureType) => {
    if (currentGestureRef.current !== newGesture) {
      currentGestureRef.current = newGesture;
      handCursorState.gesture = newGesture;
      setCurrentGesture(newGesture);
    }
  }, []);

  const setOnFrame = useCallback((cb: (data: HandFrameData) => void) => {
    onFrameRef.current = cb;
  }, []);

  const setOverlayCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    overlayCanvasRef.current = canvas;
  }, []);

  const updateSmoothness = useCallback((smoothness: number) => {
    filterRef.current.setSmoothness(smoothness);
  }, []);

  const stopTracking = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoFeedRef.current) {
      videoFeedRef.current.pause();
      videoFeedRef.current.srcObject = null;
      videoFeedRef.current = null;
    }

    if (landmarkerRef.current) {
      try {
        landmarkerRef.current.close();
      } catch (err) {
        console.warn('Error closing HandLandmarker:', err);
      }
      landmarkerRef.current = null;
    }

    // Clear overlay canvas
    if (overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }

    filterRef.current.reset();
    wasPinchingRef.current = false;
    handCursorState.position = null;
    handCursorState.visible = false;
    handCursorState.isPinching = false;
    handCursorState.gesture = 'idle';

    if (currentStatusRef.current !== 'off') {
      currentStatusRef.current = 'off';
      setStatus('off');
      setMediaStream(null);
    }
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    let isCancelled = false;

    async function initMediaPipe() {
      updateStatus('loading');

      // 1. Request camera with optimized resolution to minimize CPU load
      let stream: MediaStream;
      let video: HTMLVideoElement;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 480, max: 640 },
            height: { ideal: 360, max: 480 },
            frameRate: { ideal: 30, max: 30 },
            facingMode: 'user',
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setMediaStream(stream);

        // Internal video feed for MediaPipe input
        video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        videoFeedRef.current = video;
        await video.play();
      } catch (err: unknown) {
        const error = err as Error;
        let msg = 'Failed to start camera.';
        let errStatus: HandTrackingStatus = 'error';

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errStatus = 'permission_denied';
          msg = 'Camera permission denied. Please allow camera access in browser settings.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errStatus = 'no_camera';
          msg = 'No camera found on this device.';
        }

        updateStatus(errStatus);
        options?.onError?.(msg);
        return;
      }

      // 2. Initialize MediaPipe HandLandmarker
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm',
        );

        if (isCancelled) return;

        const baseConfig = {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          },
          runningMode: 'VIDEO' as const,
          numHands: 1, // Single hand provides 2x faster inference and zero hand-confusion
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        };

        let landmarker: HandLandmarker;
        try {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            ...baseConfig,
            baseOptions: { ...baseConfig.baseOptions, delegate: 'GPU' },
          });
        } catch {
          console.warn('GPU delegate failed for MediaPipe, falling back to CPU');
          landmarker = await HandLandmarker.createFromOptions(vision, {
            ...baseConfig,
            baseOptions: { ...baseConfig.baseOptions, delegate: 'CPU' },
          });
        }

        if (isCancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        updateStatus('ready');

        // 3. Process video frames in requestAnimationFrame loop
        const processLoop = () => {
          if (isCancelled) return;

          const now = performance.now();
          const landmarkerInstance = landmarkerRef.current;
          const currentVideo = videoFeedRef.current;

          // Cap inference at ~30 fps (33 ms)
          if (
            currentVideo &&
            landmarkerInstance &&
            currentVideo.readyState >= 2 &&
            currentVideo.currentTime !== lastVideoTimeRef.current &&
            now - lastInferenceTimeRef.current >= 30
          ) {
            lastVideoTimeRef.current = currentVideo.currentTime;
            lastInferenceTimeRef.current = now;

            const results = landmarkerInstance.detectForVideo(currentVideo, now);

            if (results && results.landmarks && results.landmarks.length > 0) {
              updateStatus('tracking');

              const rawLandmarks1 = results.landmarks[0] as Landmark[];
              const detection1 = detectGesture(rawLandmarks1, wasPinchingRef.current);
              wasPinchingRef.current = detection1.isPinching;

              updateGesture(detection1.gesture);

              // Landmark 8 = Index fingertip
              // Mirror X so movement aligns with user reflection
              const rawX = 1.0 - rawLandmarks1[8].x;
              const rawY = rawLandmarks1[8].y;

              const smoothed = filterRef.current.filter(rawX, rawY, 0, now);

              // Directly render skeleton to overlay canvas if present (no React re-render!)
              const canvas = overlayCanvasRef.current;
              if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  ctx.save();

                  // Draw bones
                  ctx.strokeStyle = detection1.isPinching ? '#ef4444' : '#38bdf8';
                  ctx.lineWidth = 2.5;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';

                  ctx.beginPath();
                  for (const [i, j] of CONNECTIONS) {
                    const p1 = rawLandmarks1[i];
                    const p2 = rawLandmarks1[j];
                    if (p1 && p2) {
                      ctx.moveTo((1.0 - p1.x) * canvas.width, p1.y * canvas.height);
                      ctx.lineTo((1.0 - p2.x) * canvas.width, p2.y * canvas.height);
                    }
                  }
                  ctx.stroke();

                  // Draw joints
                  for (let i = 0; i < rawLandmarks1.length; i++) {
                    const pt = rawLandmarks1[i];
                    const x = (1.0 - pt.x) * canvas.width;
                    const y = pt.y * canvas.height;

                    ctx.beginPath();
                    const isFingertip = [4, 8, 12, 16, 20].includes(i);
                    ctx.arc(x, y, isFingertip ? 4.5 : 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = isFingertip
                      ? (detection1.isPinching ? '#f87171' : '#818cf8')
                      : '#6366f1';
                    ctx.fill();
                  }

                  ctx.restore();
                }
              }

              if (onFrameRef.current) {
                onFrameRef.current({
                  primaryHand: {
                    landmarks: rawLandmarks1,
                    detection: detection1,
                    cursor2D: { x: rawX, y: rawY },
                    smoothedCursor2D: { x: smoothed[0], y: smoothed[1] },
                  },
                  secondaryHand: null,
                  twoHandPinchDistance: null,
                });
              }
            } else {
              updateStatus('no_hand');
              updateGesture('idle');
              wasPinchingRef.current = false;
              handCursorState.visible = false;
              handCursorState.position = null;

              // Clear skeleton canvas
              const canvas = overlayCanvasRef.current;
              if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx?.clearRect(0, 0, canvas.width, canvas.height);
              }
            }
          }

          animationFrameIdRef.current = requestAnimationFrame(processLoop);
        };

        animationFrameIdRef.current = requestAnimationFrame(processLoop);
      } catch (err) {
        console.error('Failed to initialize MediaPipe HandLandmarker:', err);
        updateStatus('error');
        options?.onError?.('Failed to load MediaPipe hand detection model.');
      }
    }

    initMediaPipe();

    return () => {
      isCancelled = true;
      stopTracking();
    };
  }, [isEnabled, stopTracking, updateStatus, updateGesture, options]);

  return {
    status,
    mediaStream,
    currentGesture,
    setOnFrame,
    setOverlayCanvas,
    updateSmoothness,
  };
}
