/**
 * useHandTracking hook — Camera + MediaPipe HandLandmarker lifecycle.
 * - Prioritizes local bundle assets (/wasm and /models/hand_landmarker.task) with CDN fallbacks.
 * - Immediate camera feed display: separates webcam acquisition from AI model loading.
 * - Multi-stage camera acquisition with fallback from ideal constraints to generic video.
 * - Hardware diagnostics: detects device count, secure context, Windows privacy lock, physical shutters.
 * - Caps inference loop to 30 fps to preserve 60 fps canvas rendering.
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
  | 'camera_active'
  | 'ready'
  | 'no_hand'
  | 'tracking'
  | 'permission_denied'
  | 'no_camera'
  | 'model_error'
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

export interface CameraDiagnosticInfo {
  isSecureContext: boolean;
  hasMediaDevices: boolean;
  videoDeviceCount: number;
  deviceLabels: string[];
  errorMessage: string | null;
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

// Returns ordered list of WASM locations: local first, then CDNs
function getWasmSources(): string[] {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return [
    `${origin}/wasm`,
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm',
    'https://unpkg.com/@mediapipe/tasks-vision@0.10.22/wasm',
  ];
}

// Returns ordered list of model locations: local first, then cloud storage
function getModelSources(): string[] {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return [
    `${origin}/models/hand_landmarker.task`,
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  ];
}

/**
 * Robust camera stream acquisition with automated fallback to unconstrained video.
 */
async function acquireCameraStream(): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    const isSecure = typeof window !== 'undefined' && window.isSecureContext;
    if (!isSecure) {
      throw new Error('Camera access requires HTTPS or http://localhost. Insecure HTTP connections block camera access.');
    }
    throw new Error('Camera access is not supported by this browser.');
  }

  // Check connected camera devices
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((d) => d.kind === 'videoinput');
    if (devices.length > 0 && videoInputs.length === 0) {
      throw new Error('No camera hardware found. Check your physical camera switch, laptop privacy shutter, or camera Fn key (e.g. Fn+F10).');
    }
  } catch (enumErr: unknown) {
    const err = enumErr as Error;
    if (err.message && err.message.includes('privacy shutter')) {
      throw err;
    }
    // Non-fatal if enumerateDevices is blocked before permissions
  }

  // Attempt 1: Ideal 480p user-facing stream
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      throw error;
    }
    console.warn('Constrained camera request failed, falling back to minimal video...', error);
  }

  // Attempt 2: Minimal fallback (supported on 100% of working webcams)
  return await navigator.mediaDevices.getUserMedia({
    video: true,
  });
}

export function useHandTracking(isEnabled: boolean, options?: UseHandTrackingOptions) {
  const [status, setStatus] = useState<HandTrackingStatus>('off');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('idle');
  const [diagnostics, setDiagnostics] = useState<CameraDiagnosticInfo>({
    isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : true,
    hasMediaDevices: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
    videoDeviceCount: 0,
    deviceLabels: [],
    errorMessage: null,
  });

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

      // Refresh diagnostics
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        try {
          const devList = await navigator.mediaDevices.enumerateDevices();
          const vInputs = devList.filter((d) => d.kind === 'videoinput');
          setDiagnostics((prev) => ({
            ...prev,
            videoDeviceCount: vInputs.length,
            deviceLabels: vInputs.map((d) => d.label || 'Webcam Device'),
            errorMessage: null,
          }));
        } catch {
          // ignore
        }
      }

      // Step 1: Start Webcam Stream
      let stream: MediaStream;
      let video: HTMLVideoElement;
      try {
        stream = await acquireCameraStream();

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setMediaStream(stream);
        updateStatus('camera_active');

        // Internal video feed for MediaPipe inference input
        video = document.createElement('video');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        video.srcObject = stream;
        videoFeedRef.current = video;

        // Await stream frame availability before starting inference
        await new Promise<void>((resolve) => {
          if (video.readyState >= 2) {
            resolve();
            return;
          }
          const onData = () => {
            video.removeEventListener('loadeddata', onData);
            resolve();
          };
          video.addEventListener('loadeddata', onData);
          setTimeout(resolve, 800);
        });

        if (isCancelled) return;

        try {
          await video.play();
        } catch {
          // Play rejection on hidden element is non-fatal
        }
      } catch (err: unknown) {
        const error = err as Error;
        let msg = 'Failed to start camera.';
        let errStatus: HandTrackingStatus = 'error';

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errStatus = 'permission_denied';
          msg = 'Camera permission denied. Click the lock/camera icon in your browser URL bar and set Camera to "Allow".';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errStatus = 'no_camera';
          msg = 'No camera found. Check if your laptop has a physical privacy slider or camera Fn key (e.g. Fn+F10).';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errStatus = 'error';
          msg = 'Camera is in use by another application (Zoom, Teams, Discord, OBS, or another browser tab).';
        } else if (error.message) {
          msg = error.message;
        }

        setDiagnostics((prev) => ({ ...prev, errorMessage: msg }));
        updateStatus(errStatus);
        options?.onError?.(msg);
        return;
      }

      // Step 2: Initialize MediaPipe HandLandmarker (Local bundle first, then CDN fallback)
      try {
        let vision = null;
        for (const wasmUrl of getWasmSources()) {
          try {
            vision = await FilesetResolver.forVisionTasks(wasmUrl);
            if (vision) break;
          } catch (wErr) {
            console.warn(`WASM source ${wasmUrl} unavailable, trying backup...`, wErr);
          }
        }

        if (isCancelled) return;

        if (!vision) {
          throw new Error('Failed to load MediaPipe vision runtime.');
        }

        let landmarker: HandLandmarker | null = null;
        for (const modelUrl of getModelSources()) {
          const baseConfig = {
            baseOptions: {
              modelAssetPath: modelUrl,
            },
            runningMode: 'VIDEO' as const,
            numHands: 1,
            minHandDetectionConfidence: 0.3,
            minHandPresenceConfidence: 0.3,
            minTrackingConfidence: 0.3,
          };

          try {
            // Attempt GPU delegate
            landmarker = await HandLandmarker.createFromOptions(vision, {
              ...baseConfig,
              baseOptions: { ...baseConfig.baseOptions, delegate: 'GPU' },
            });
            if (landmarker) break;
          } catch {
            // Fallback to CPU delegate
            try {
              landmarker = await HandLandmarker.createFromOptions(vision, {
                ...baseConfig,
                baseOptions: { ...baseConfig.baseOptions, delegate: 'CPU' },
              });
              if (landmarker) break;
            } catch (mErr) {
              console.warn(`Model at ${modelUrl} failed, trying backup...`, mErr);
            }
          }
        }

        if (isCancelled) {
          landmarker?.close();
          return;
        }

        if (!landmarker) {
          updateStatus('model_error');
          console.warn('Hand tracking AI model could not be loaded. Camera remains active for preview.');
          return;
        }

        landmarkerRef.current = landmarker;
        updateStatus('ready');

        // Step 3: Process video frames in requestAnimationFrame loop
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
      } catch (err: unknown) {
        console.error('MediaPipe Model Loading Error:', err);
        updateStatus('model_error');
        // Do NOT close camera if model fails! Camera remains active.
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
    diagnostics,
    setOnFrame,
    setOverlayCanvas,
    updateSmoothness,
  };
}
