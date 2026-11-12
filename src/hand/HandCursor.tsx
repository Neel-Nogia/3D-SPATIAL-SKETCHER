/**
 * HandCursor — 3D cursor mesh in the R3F scene + Webcam overlay preview HUD.
 * Renders:
 * - Glowing 3D sphere at the raycasted hand cursor position.
 * - Picture-in-picture mirrored camera preview with drawn 21 landmarks.
 * - Real-time gesture badge (Pinch / Open Palm / Fist / Thumbs Up / Idle).
 * - Status chip ("Tracking" / "No hand detected").
 * - Privacy banner: "Video stays in your browser. Nothing is uploaded."
 */
import { useEffect, useRef, useState } from 'react';
import type { Landmark, GestureType } from './gestures';
import { Video, ShieldCheck, Activity, Sparkles } from 'lucide-react';

interface HandCursor3DProps {
  cursorPosition: [number, number, number] | null;
  isPinching: boolean;
}

/** 3D Glowing Cursor rendered inside Canvas3D */
export function HandCursor3D({ cursorPosition, isPinching }: HandCursor3DProps) {
  if (!cursorPosition) return null;

  return (
    <group position={cursorPosition}>
      {/* Center sphere */}
      <mesh>
        <sphereGeometry args={[isPinching ? 0.12 : 0.08, 16, 16]} />
        <meshBasicMaterial
          color={isPinching ? '#ef4444' : '#6366f1'}
          wireframe={false}
        />
      </mesh>
      {/* Outer translucent glow ring */}
      <mesh>
        <sphereGeometry args={[isPinching ? 0.22 : 0.16, 16, 16]} />
        <meshBasicMaterial
          color={isPinching ? '#f87171' : '#818cf8'}
          transparent
          opacity={0.35}
          wireframe
        />
      </mesh>
    </group>
  );
}

interface HandTrackingOverlayProps {
  videoElement: HTMLVideoElement | null;
  landmarks: Landmark[] | null;
  gesture: GestureType;
  status: string;
  smoothness: number;
  onSmoothnessChange: (val: number) => void;
  onClose: () => void;
}

/** Picture-in-Picture camera preview with skeleton and gesture HUD */
export function HandTrackingOverlay({
  videoElement,
  landmarks,
  gesture,
  status,
  smoothness,
  onSmoothnessChange,
  onClose,
}: HandTrackingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Draw 21 landmarks on preview canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame mirrored
    if (videoElement && videoElement.readyState >= 2) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    if (landmarks && landmarks.length >= 21) {
      ctx.save();
      ctx.fillStyle = '#6366f1';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;

      // Draw mirrored landmarks
      for (const pt of landmarks) {
        const x = (1.0 - pt.x) * canvas.width;
        const y = pt.y * canvas.height;

        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw hand skeleton bones
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // index
        [5, 9], [9, 10], [10, 11], [11, 12], // middle
        [9, 13], [13, 14], [14, 15], [15, 16], // ring
        [13, 17], [17, 18], [18, 19], [19, 20], // pinky
        [0, 17], // palm base
      ];

      ctx.beginPath();
      for (const [i, j] of connections) {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        if (p1 && p2) {
          ctx.moveTo((1.0 - p1.x) * canvas.width, p1.y * canvas.height);
          ctx.lineTo((1.0 - p2.x) * canvas.width, p2.y * canvas.height);
        }
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [landmarks, videoElement]);

  const gestureLabelMap: Record<GestureType, string> = {
    pinch: '🤏 Pinch (Drawing)',
    open_palm: '✋ Open Palm (Orbit)',
    fist: '✊ Fist (Idle)',
    thumbs_up: '👍 Thumbs Up (Undo)',
    idle: '👋 Tracking...',
  };

  return (
    <div className="absolute bottom-12 right-3 z-30 flex flex-col items-end gap-1.5 select-none">
      {/* Preview Card */}
      <div
        className="w-56 rounded-xl border shadow-2xl p-2.5 backdrop-blur-md flex flex-col gap-2"
        style={{
          background: 'rgba(15, 23, 42, 0.92)',
          borderColor: 'rgba(99, 102, 241, 0.35)',
          color: '#f8fafc',
        }}
      >
        {/* Header with Status Chip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Video size={13} className="text-indigo-400" />
            <span className="text-[11px] font-semibold">Hand Tracking</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                status === 'tracking'
                  ? 'bg-emerald-400 animate-pulse'
                  : status === 'loading'
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
              }`}
            />
            <span className="text-[10px] text-slate-300 font-medium capitalize">
              {status === 'tracking'
                ? 'Active'
                : status === 'no_hand'
                  ? 'No Hand'
                  : status === 'loading'
                    ? 'Loading...'
                    : status}
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs pl-1"
              title="Turn off Hand Mode"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video Canvas */}
        <div className="relative rounded-lg overflow-hidden border border-slate-700 aspect-video bg-black/60">
          <canvas
            ref={canvasRef}
            width={220}
            height={165}
            className="w-full h-full object-cover"
          />

          {/* Current Gesture HUD Pill */}
          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/75 border border-white/10 text-[10px] font-medium backdrop-blur-sm flex items-center gap-1">
            <Activity size={10} className="text-indigo-400" />
            <span>{gestureLabelMap[gesture] || 'Idle'}</span>
          </div>
        </div>

        {/* Settings Toggle / Sliders */}
        <div className="flex flex-col gap-1 text-[11px]">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowSettings((s) => !s)}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <Sparkles size={11} />
              <span>{showSettings ? 'Hide Settings' : 'Adjust Smoothness'}</span>
            </button>
            <span className="text-[10px] text-slate-400 font-mono">{smoothness}%</span>
          </div>

          {showSettings && (
            <div className="pt-1 flex flex-col gap-1 border-t border-slate-800">
              <label className="text-[10px] text-slate-400 flex justify-between">
                <span>Filter Smoothness</span>
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
          <span className="leading-tight">Video stays in your browser. Nothing is uploaded.</span>
        </div>
      </div>
    </div>
  );
}
