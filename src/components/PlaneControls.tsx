/**
 * PlaneControls — Floating control bar for active drawing plane, offset slider, and plane helper toggle.
 */
import { useSceneStore } from '../store/useSceneStore';
import type { DrawingPlane } from '../types/scene';
import { Eye, EyeOff, Layers } from 'lucide-react';

const planes: { id: DrawingPlane; label: string; desc: string }[] = [
  { id: 'XZ', label: 'XZ', desc: 'Ground' },
  { id: 'XY', label: 'XY', desc: 'Front' },
  { id: 'YZ', label: 'YZ', desc: 'Side' },
];

export function PlaneControls() {
  const drawingPlane = useSceneStore((s) => s.drawingPlane);
  const setDrawingPlane = useSceneStore((s) => s.setDrawingPlane);
  const planeOffset = useSceneStore((s) => s.planeOffset);
  const setPlaneOffset = useSceneStore((s) => s.setPlaneOffset);
  const showPlaneHelper = useSceneStore((s) => s.showPlaneHelper);
  const togglePlaneHelper = useSceneStore((s) => s.togglePlaneHelper);

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg border backdrop-blur-md select-none text-xs"
      style={{
        background: 'rgba(30, 41, 59, 0.85)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        color: '#f8fafc',
      }}
    >
      <div className="flex items-center gap-1 font-semibold text-slate-300 text-[11px] pr-1">
        <Layers size={13} className="text-indigo-400" />
        <span>Plane:</span>
      </div>

      {/* Plane Selection Buttons */}
      <div className="flex items-center bg-black/40 rounded-full p-0.5">
        {planes.map((p) => {
          const isActive = drawingPlane === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setDrawingPlane(p.id)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title={`${p.desc} Plane (${p.id})`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="h-3.5 w-px bg-white/20 mx-1" />

      {/* Plane Offset Slider */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="plane-offset-slider"
          className="text-[11px] text-slate-300 font-mono w-14 text-right cursor-pointer"
        >
          {planeOffset >= 0 ? `+${planeOffset.toFixed(1)}` : planeOffset.toFixed(1)}
        </label>
        <input
          id="plane-offset-slider"
          type="range"
          min={-20}
          max={20}
          step={0.5}
          value={planeOffset}
          onChange={(e) => setPlaneOffset(parseFloat(e.target.value))}
          className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          title={`Plane offset along normal: ${planeOffset}`}
          aria-label="Plane offset slider"
        />
        {planeOffset !== 0 && (
          <button
            onClick={() => setPlaneOffset(0)}
            className="text-[10px] text-indigo-300 hover:text-indigo-100 underline px-0.5"
            title="Reset plane offset to 0"
          >
            0
          </button>
        )}
      </div>

      <div className="h-3.5 w-px bg-white/20 mx-1" />

      {/* Toggle Plane Helper Visibility */}
      <button
        onClick={togglePlaneHelper}
        className="p-1 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
        title={showPlaneHelper ? 'Hide plane helper grid' : 'Show plane helper grid'}
        aria-label="Toggle drawing plane helper"
      >
        {showPlaneHelper ? <Eye size={14} /> : <EyeOff size={14} className="opacity-50" />}
      </button>
    </div>
  );
}
