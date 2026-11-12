/**
 * Bottom status bar — shows active tool, active drawing plane, snapping controls, object count, camera hints.
 */
import { useSceneStore } from '../store/useSceneStore';
import type { SnapSize } from '../types/scene';
import { Magnet } from 'lucide-react';

const snapSizes: SnapSize[] = [0.1, 0.25, 0.5, 1];

export function StatusBar() {
  const activeTool = useSceneStore((s) => s.activeTool);
  const drawingPlane = useSceneStore((s) => s.drawingPlane);
  const snapEnabled = useSceneStore((s) => s.snapEnabled);
  const toggleSnap = useSceneStore((s) => s.toggleSnap);
  const snapSize = useSceneStore((s) => s.snapSize);
  const setSnapSize = useSceneStore((s) => s.setSnapSize);
  const objectCount = useSceneStore((s) => s.order.length);

  return (
    <footer
      className="flex items-center justify-between px-3 h-7 text-xs border-t shrink-0 select-none"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-secondary)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Active Tool */}
        <div className="flex items-center gap-1 font-medium">
          <span className="text-slate-400">Tool:</span>
          <span className="text-indigo-400 font-semibold capitalize">{activeTool}</span>
        </div>

        <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />

        {/* Active Plane */}
        <div className="flex items-center gap-1">
          <span className="text-slate-400">Plane:</span>
          <span className="font-semibold text-slate-200">{drawingPlane}</span>
        </div>

        <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />

        {/* Snap Toggle + Snap Size Dropdown */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSnap}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              snapEnabled
                ? 'bg-indigo-600/30 text-indigo-400 font-semibold'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100'
            }`}
            title="Toggle Snapping (G)"
          >
            <Magnet size={12} className={snapEnabled ? 'text-indigo-400' : 'text-slate-400'} />
            <span>Snap {snapEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {snapEnabled && (
            <select
              value={snapSize}
              onChange={(e) => setSnapSize(parseFloat(e.target.value) as SnapSize)}
              className="bg-transparent border rounded px-1 py-0.5 text-[10px] font-mono focus:outline-none cursor-pointer"
              style={{ borderColor: 'var(--border-color)' }}
              title="Snap Grid Size"
            >
              {snapSizes.map((s) => (
                <option key={s} value={s} className="bg-slate-900 text-slate-100">
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />

        {/* Object Count */}
        <div className="flex items-center gap-1">
          <span className="text-slate-400">Objects:</span>
          <span className="font-mono">{objectCount}</span>
        </div>
      </div>

      {/* Right camera hint */}
      <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
        <span>Right-drag to pan</span>
        <span>•</span>
        <span>Scroll to zoom</span>
        <span>•</span>
        <span>Space + Left-drag to orbit</span>
      </div>
    </footer>
  );
}
