/**
 * EmptyStateHint — Overlay hint on the canvas when no objects exist.
 * Disappears automatically as soon as the first object is added.
 */
import { useSceneStore } from '../store/useSceneStore';
import { Pencil, Sparkles } from 'lucide-react';

export function EmptyStateHint() {
  const objectCount = useSceneStore((s) => s.order.length);

  // Disappear after the first object
  if (objectCount > 0) return null;

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none">
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-2xl border backdrop-blur-md animate-bounce"
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          borderColor: 'rgba(99, 102, 241, 0.4)',
          color: '#e2e8f0',
        }}
      >
        <Sparkles size={16} className="text-amber-400 shrink-0" />
        <span className="text-xs font-medium">
          Pick a tool on the left and drag on the grid to start sketching in 3D!
        </span>
        <Pencil size={14} className="text-indigo-400 shrink-0" />
      </div>
    </div>
  );
}
