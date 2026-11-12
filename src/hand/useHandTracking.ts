/**
 * useHandTracking hook — Camera + MediaPipe HandLandmarker lifecycle.
 * - Manages webcam stream via navigator.mediaDevices.getUserMedia.
 * - Initializes MediaPipe FilesetResolver & HandLandmarker with GPU delegate and CPU fallback.
 * - Caps inference loop to 30 fps to preserve 60 fps canvas rendering.
 * - Performs all inference outside React state (in refs) to eliminate re-render storms.
 * - Cleanly releases media tracks and model resources when disabled.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { detectGesture, type GestureDetectionResult, type Landmark } from './gestures';
import { OneEuroFilter3D } from './smoothing';

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

export function useHandTracking(isEnabled: boolean, options?: UseHandTrackingOptions) {
  const [status, setStatus] = useState<HandTrackingStatus>('off');
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastInferenceTimeRef = useRef<number>(0);

  // Filter and gesture tracking refs
  const filterRef = useRef(new OneEuroFilter3D(1.2, 0.05, 1.0));
  const wasPinchingRef = useRef(false);

  // Callback subscriber for hand frame events
  const onFrameRef = useRef<((data: HandFrameData) => void) | null>(null);

  const setOnFrame = useCallback((cb: (data: HandFrameData) => void) => {
    onFrameRef.current = cb;
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

    if (landmarkerRef.current) {
      try {
        landmarkerRef.current.close();
      } catch (err) {
        console.warn('Error closing HandLandmarker:', err);
      }
      landmarkerRef.current = null;
    }

    filterRef.current.reset();
    wasPinchingRef.current = false;
    setVideoElement(null);
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch {
          // ignore
        }
        landmarkerRef.current = null;
      }
      return;
    }

    let isCancelled = false;

    async function initMediaPipe() {
      setStatus('loading');

      // 1. Request camera
      let video: HTMLVideoElement;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Create background video element for feeding frames to MediaPipe
        video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        await video.play();
        setVideoElement(video);
      } catch (err: unknown) {
        const error = err as Error;
        let msg = 'Failed to start camera.';
        let errStatus: HandTrackingStatus = 'error';

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errStatus = 'permission_denied';
          msg = 'Camera access was denied. Please allow camera permissions to use hand gestures.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errStatus = 'no_camera';
          msg = 'No camera found on this device.';
        }

        setStatus(errStatus);
        options?.onError?.(msg);
        return;
      }

      // 2. Initialize MediaPipe HandLandmarker
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
        );

        if (isCancelled) return;

        let landmarker: HandLandmarker;
        try {
          // Attempt GPU delegate
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
          });
        } catch {
          // CPU Fallback
          console.warn('GPU delegate failed for MediaPipe, falling back to CPU');
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
          });
        }

        if (isCancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setStatus('ready');

        // 3. Process video frames in requestAnimationFrame loop
        const processLoop = () => {
          if (isCancelled) return;

          const now = performance.now();
          const landmarkerInstance = landmarkerRef.current;

          // Cap inference at 30 fps (32 ms per inference)
          if (
            video &&
            landmarkerInstance &&
            video.readyState >= 2 &&
            video.currentTime !== lastVideoTimeRef.current &&
            now - lastInferenceTimeRef.current >= 32
          ) {
            lastVideoTimeRef.current = video.currentTime;
            lastInferenceTimeRef.current = now;

            const results = landmarkerInstance.detectForVideo(video, now);

            if (results && results.landmarks && results.landmarks.length > 0) {
              setStatus('tracking');

              // Primary hand = index 0
              const rawLandmarks1 = results.landmarks[0] as Landmark[];
              const detection1 = detectGesture(rawLandmarks1, wasPinchingRef.current);
              wasPinchingRef.current = detection1.isPinching;

              // Landmark 8 = Index fingertip
              // Mirror X so movement aligns intuitively with human mirror reflex
              const rawX = 1.0 - rawLandmarks1[8].x;
              const rawY = rawLandmarks1[8].y;

              const smoothed = filterRef.current.filter(rawX, rawY, 0, now);

              // Secondary hand if detected
              let secondaryHandData = null;
              let twoHandDist: number | null = null;

              if (results.landmarks.length > 1) {
                const rawLandmarks2 = results.landmarks[1] as Landmark[];
                const detection2 = detectGesture(rawLandmarks2, false);
                secondaryHandData = {
                  landmarks: rawLandmarks2,
                  detection: detection2,
                };

                // Distance between wrist centers of both hands
                const p1 = detection1.palmCenter;
                const p2 = detection2.palmCenter;
                twoHandDist = Math.sqrt(
                  Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2),
                );
              }

              if (onFrameRef.current) {
                onFrameRef.current({
                  primaryHand: {
                    landmarks: rawLandmarks1,
                    detection: detection1,
                    cursor2D: { x: rawX, y: rawY },
                    smoothedCursor2D: { x: smoothed[0], y: smoothed[1] },
                  },
                  secondaryHand: secondaryHandData,
                  twoHandPinchDistance: twoHandDist,
                });
              }
            } else {
              setStatus('no_hand');
              wasPinchingRef.current = false;
            }
          }

          animationFrameIdRef.current = requestAnimationFrame(processLoop);
        };

        animationFrameIdRef.current = requestAnimationFrame(processLoop);
      } catch (err) {
        console.error('Failed to initialize MediaPipe HandLandmarker:', err);
        setStatus('error');
        options?.onError?.('Failed to load MediaPipe hand detection model.');
      }
    }

    initMediaPipe();

    return () => {
      isCancelled = true;
      stopTracking();
      setStatus('off');
    };
  }, [isEnabled, stopTracking, options]);

  return {
    status,
    videoElement,
    setOnFrame,
    updateSmoothness,
  };
}
