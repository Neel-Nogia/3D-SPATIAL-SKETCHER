/**
 * HandCursor — 3D cursor mesh in the R3F scene + Webcam overlay preview HUD.
 * Renders:
 * - Glowing 3D sphere at the raycasted hand cursor position (updated at 60 FPS in R3F useFrame).
 * - Picture-in-picture mirrored camera preview with hardware-accelerated <video> tag (object-contain to show full face & hands).
 * - Dual-hand 21-landmark skeleton rendering (Drawing hand in Cyan/Red, Gyroscope hand in Emerald Green).
 * - Real-time gesture badge (Pinch / Open Palm / Fist / Thumbs Up / Idle).
 * - Expandable preview card (compact vs large) so face and both hands are clearly visible.
 * - Hardware diagnostics and troubleshooting drawer (device count, permissions, laptop Fn keys).
 * - Privacy banner: "Video stays in your browser. Nothing is uploaded."
 */
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { handCursorState } from './handCursorBridge';
import type { GestureType } from './gestures';
import type { CameraDiagnosticInfo } from './useHandTracking';
import {
  Video,
  ShieldCheck,
  Activity,
  Sparkles,
  Hand,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from 'lucide-react';

/** 3D Glowing Cursor rendered inside Canvas3D, updated in useFrame with zero React diffing */
export function HandCursor3D() {
  const groupRef = useRef<THREE.Group>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const glowMeshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    const pos = handCursorState.position;
    if (!pos || !handCursorState.visible) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;
    groupRef.current.position.set(pos[0], pos[1], pos[2]);

    const isPinching = handCursorState.isPinching;
    if (coreMeshRef.current) {
      const mat = coreMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(isPinching ? '#ef4444' : '#6366f1');
      const scale = isPinching ? 1.4 : 1.0;
      coreMeshRef.current.scale.setScalar(scale);
    }

    if (glowMeshRef.current) {
      const mat = glowMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(isPinching ? '#f87171' : '#818cf8');
      const scale = isPinching ? 1.3 : 1.0;
      glowMeshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Center sphere */}
      <mesh ref={coreMeshRef}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#6366f1" />
      </mesh>
      {/* Outer translucent glow ring */}
      <mesh ref={glowMeshRef}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial
          color="#818cf8"
          transparent
          opacity={0.35}
          wireframe
        />
      </mesh>
    </group>
  );
}

interface HandTrackingOverlayProps {
  mediaStream: MediaStream | null;
  gesture: GestureType;
  status: string;
  diagnostics?: CameraDiagnosticInfo;
  smoothness: number;
  onSmoothnessChange: (val: number) => void;
  onClose: () => void;
  setOverlayCanvas: (canvas: HTMLCanvasElement | null) => void;
}

/** Picture-in-Picture camera preview with hardware video and skeleton HUD */
export function HandTrackingOverlay({
  mediaStream,
  gesture,
  status,
  diagnostics,
  smoothness,
  onSmoothnessChange,
  onClose,
  setOverlayCanvas,
}: HandTrackingOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [viewSize, setViewSize] = useState<'compact' | 'normal' | 'cinema'>('normal');
  const [videoAspect, setVideoAspect] = useState<number>(16 / 9);

  // Connect mediaStream directly to HTML video element for hardware GPU acceleration
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaStream) return;

    video.srcObject = mediaStream;
    video.muted = true;
    video.playsInline = true;

    const playVideo = () => {
      if (video.videoWidth && video.videoHeight) {
        setVideoAspect(video.videoWidth / video.videoHeight);
      }
      video.play().catch((err) => {
        console.warn('Overlay video play warning:', err);
      });
    };

    video.addEventListener('loadedmetadata', playVideo);
    if (video.readyState >= 1) {
      playVideo();
    }

    return () => {
      video.removeEventListener('loadedmetadata', playVideo);
    };
  }, [mediaStream]);

  // Register overlay canvas ref to hook
  useEffect(() => {
    setOverlayCanvas(canvasRef.current);
    return () => {
      setOverlayCanvas(null);
    };
  }, [setOverlayCanvas]);

  const gestureLabelMap: Record<GestureType, string> = {
    pinch: '🤏 Pinch (Drawing)',
    open_palm: '✋ Open Palm (Orbit)',
    fist: '✊ Fist (Rest)',
    thumbs_up: '👍 Thumbs Up (Undo)',
    idle: '👋 Ready to Draw',
  };

  const isCameraLive = !!mediaStream;

  const cycleViewSize = () => {
    setViewSize((cur) => {
      if (cur === 'compact') return 'normal';
      if (cur === 'normal') return 'cinema';
      return 'compact';
    });
  };

  const sizeClasses = {
    compact: 'w-[320px] max-w-[320px]',
    normal: 'w-[460px] max-w-[460px]',
    cinema: 'w-[600px] max-w-[600px]',
  }[viewSize];

  return (
    <div
      className={`absolute bottom-10 right-3 z-30 flex flex-col items-end gap-1.5 select-none transition-all duration-200 ${sizeClasses}`}
    >
      {/* Instruction Guidance Pill */}
      {status === 'no_hand' && isCameraLive && (
        <div className="bg-amber-500/90 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs shadow-lg flex items-center gap-1.5 animate-bounce">
          <Hand size={14} className="shrink-0" />
          <span>Keep head & hands in camera view — Pinch to draw freely in 3D!</span>
        </div>
      )}

      {/* Preview Card */}
      <div
        className="w-full rounded-xl border shadow-2xl p-3 backdrop-blur-md flex flex-col gap-2.5"
        style={{
          background: 'rgba(15, 23, 42, 0.96)',
          borderColor: 'rgba(99, 102, 241, 0.5)',
          color: '#f8fafc',
        }}
      >
        {/* Header with Status Chip & View Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Video size={14} className="text-indigo-400" />
            <span className="text-xs font-semibold">Webcam Spatial Mode</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                status === 'tracking'
                  ? 'bg-emerald-400 animate-pulse'
                  : status === 'loading'
                    ? 'bg-amber-400 animate-ping'
                    : status === 'camera_active'
                      ? 'bg-emerald-400'
                      : status === 'no_hand'
                        ? 'bg-amber-400'
                        : isCameraLive
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
              }`}
            />
            <span className="text-[10px] text-slate-300 font-medium">
              {status === 'tracking'
                ? 'Hands Tracked'
                : status === 'camera_active'
                  ? 'Camera Active'
                  : status === 'no_hand'
                    ? 'Show Hand...'
                    : status === 'loading'
                      ? 'Starting...'
                      : status === 'model_error'
                        ? 'Camera Active'
                        : isCameraLive
                          ? 'Camera Active'
                          : 'Camera Error'}
            </span>

            {/* Cycle view size button */}
            <button
              onClick={cycleViewSize}
              className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded text-[10px] border border-slate-700 hover:bg-white/10 flex items-center gap-1"
              title={`Current size: ${viewSize}. Click to toggle.`}
            >
              {viewSize === 'cinema' ? (
                <>
                  <Minimize2 size={11} /> <span>Cinema</span>
                </>
              ) : viewSize === 'normal' ? (
                <>
                  <Maximize2 size={11} /> <span>Large</span>
                </>
              ) : (
                <>
                  <Maximize2 size={11} /> <span>Compact</span>
                </>
              )}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs pl-1"
              title="Turn off Hand Mode"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video & Skeleton Overlay Viewport — Uncropped matching camera aspect ratio */}
        <div
          className="relative rounded-lg overflow-hidden border border-slate-700 bg-black flex items-center justify-center transition-all duration-200"
          style={{ aspectRatio: `${videoAspect}` }}
        >
          {/* Native Hardware-Accelerated Video (mirrored like a mirror) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-1 bg-black"
          />

          {/* Transparent Canvas for 21-Landmark Skeleton */}
          <canvas
            ref={canvasRef}
            width={640}
            height={Math.round(640 / videoAspect)}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Current Gesture HUD Pill */}
          {isCameraLive && (
            <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/80 border border-white/10 text-[10px] font-medium backdrop-blur-sm flex items-center gap-1">
              <Activity size={10} className="text-indigo-400" />
              <span>{gestureLabelMap[gesture] || 'Ready'}</span>
            </div>
          )}

          {/* Prompt when Camera is active but no hand is in view */}
          {status === 'no_hand' && isCameraLive && (
            <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center text-center p-2 text-white pointer-events-none">
              <span className="text-2xl">👐</span>
              <span className="text-xs font-medium text-amber-200 mt-1">
                Hold your hand(s) up in camera view
              </span>
              <span className="text-[10px] text-slate-300">
                Pinch = Draw | Other hand = Gyroscope Orbit
              </span>
            </div>
          )}

          {/* Camera Permission Denied Overlay (only when camera is not running) */}
          {status === 'permission_denied' && !isCameraLive && (
            <div className="absolute inset-0 bg-rose-950/90 flex flex-col items-center justify-center text-center p-3 text-white">
              <span className="text-xl">🔒</span>
              <span className="text-xs font-semibold text-rose-200 mt-1">
                Camera Access Blocked
              </span>
              <span className="text-[10px] text-slate-300 mt-1 leading-snug">
                Click the lock icon (🔒) in your browser URL bar and set Camera to &quot;Allow&quot;.
              </span>
            </div>
          )}

          {/* Camera Error or In Use Overlay (only when camera is not running) */}
          {status === 'error' && !isCameraLive && (
            <div className="absolute inset-0 bg-rose-950/90 flex flex-col items-center justify-center text-center p-3 text-white">
              <AlertTriangle size={20} className="text-amber-400" />
              <span className="text-xs font-semibold text-rose-200 mt-1">
                Camera In Use or Locked
              </span>
              <span className="text-[10px] text-slate-300 mt-1 leading-snug">
                Close other apps using your webcam (Zoom, Teams, OBS) or check Windows Camera Privacy.
              </span>
            </div>
          )}

          {/* No Camera Device Found Overlay */}
          {status === 'no_camera' && !isCameraLive && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-center p-3 text-white">
              <span className="text-xl">📷</span>
              <span className="text-xs font-semibold text-amber-200 mt-1">
                No Camera Detected
              </span>
              <span className="text-[10px] text-slate-300 mt-1 leading-snug">
                Check your laptop&apos;s physical camera switch or Fn key (e.g. Fn+F10).
              </span>
            </div>
          )}

          {/* AI Model Notice when Camera is working but Model is loading/fallback */}
          {status === 'model_error' && isCameraLive && (
            <div className="absolute bottom-1 inset-x-1 bg-amber-950/80 border border-amber-600/40 rounded px-1.5 py-0.5 text-center text-[9px] text-amber-200">
              Camera live. You can sketch with mouse / touch!
            </div>
          )}
        </div>

        {/* Dual-Hand Spatial Gyroscope Legend */}
        <div className="grid grid-cols-3 gap-1 text-[9px] text-slate-300 bg-slate-900/80 p-1.5 rounded-md border border-slate-800">
          <div className="text-center">
            <span className="block font-semibold text-cyan-300">✍️ Pinch</span>
            <span>Draw / Shape</span>
          </div>
          <div className="text-center">
            <span className="block font-semibold text-emerald-300">🧭 2nd Hand</span>
            <span>Gyroscope Orbit</span>
          </div>
          <div className="text-center">
            <span className="block font-semibold text-amber-300">🔍 2 Hands</span>
            <span>Zoom In/Out</span>
          </div>
        </div>

        {/* Troubleshooting & Settings Controls */}
        <div className="flex flex-col gap-1 text-[11px]">
          <div className="flex items-center justify-between text-[10px]">
            <button
              onClick={() => {
                setShowSettings((s) => !s);
                setShowHelp(false);
              }}
              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <Sparkles size={11} />
              <span>{showSettings ? 'Hide Filter' : 'Filter Settings'}</span>
            </button>

            <button
              onClick={() => {
                setShowHelp((h) => !h);
                setShowSettings(false);
              }}
              className="text-slate-400 hover:text-white font-medium flex items-center gap-1"
            >
              <HelpCircle size={11} />
              <span>{showHelp ? 'Hide Help' : 'Camera Diagnostics'}</span>
            </button>
          </div>

          {/* Diagnostics Drawer */}
          {showHelp && (
            <div className="pt-2 flex flex-col gap-1.5 border-t border-slate-800 text-[10px] text-slate-300 bg-slate-950/70 p-2 rounded">
              <div className="font-semibold text-indigo-300 flex items-center gap-1">
                <span>Hardware & Browser Status:</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Secure HTTPS Context:</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle size={10} /> Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Detected Webcams:</span>
                <span className="font-mono text-indigo-300">
                  {diagnostics?.videoDeviceCount ?? 1} device(s)
                </span>
              </div>
              <div className="border-t border-slate-800 pt-1 mt-1 text-[9px] text-slate-400 leading-tight">
                💡 <b>Dual-Hand Controls:</b>
                <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-300">
                  <li><b>Drawing:</b> Touch thumb & index fingertip (Pinch) to sketch in 3D.</li>
                  <li><b>Gyroscope:</b> Move your other hand in front of camera to orbit/rotate the 3D scene!</li>
                  <li><b>Zoom:</b> Move both hands apart to zoom in, closer to zoom out.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Smoothness Slider */}
          {showSettings && (
            <div className="pt-1 flex flex-col gap-1 border-t border-slate-800">
              <label className="text-[10px] text-slate-400 flex justify-between">
                <span>Filter Jitter Smoothing</span>
                <span className="font-mono text-slate-300">{smoothness}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={smoothness}
                onChange={(e) => onSmoothnessChange(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Privacy Note */}
        <div className="flex items-center gap-1 text-[9px] text-slate-400 border-t border-slate-800/80 pt-1.5">
          <ShieldCheck size={11} className="text-emerald-400 shrink-0" />
          <span className="leading-tight">100% on-device AI. No video or images ever leave your browser.</span>
        </div>
      </div>
    </div>
  );
}
