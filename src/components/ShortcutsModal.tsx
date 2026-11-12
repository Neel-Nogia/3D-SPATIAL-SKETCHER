/**
 * ShortcutsModal — Cheat sheet modal showing all keyboard shortcuts and navigation tips.
 * Triggered by the '?' key or Help button.
 */
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  desc: string;
  category: 'Tools' | 'Navigation' | 'Editing';
}

const shortcuts: ShortcutItem[] = [
  // Tools
  { key: 'V', desc: 'Select Tool (click to select, Shift+click multi-select)', category: 'Tools' },
  { key: 'W', desc: 'Move (TransformControls translate)', category: 'Tools' },
  { key: 'E', desc: 'Rotate (TransformControls rotate)', category: 'Tools' },
  { key: 'R', desc: 'Scale (TransformControls scale)', category: 'Tools' },
  { key: 'P', desc: 'Pen (Freehand 3D stroke with RDP simplification)', category: 'Tools' },
  { key: 'L', desc: 'Line (Click-drag straight line)', category: 'Tools' },
  { key: 'Q', desc: 'Rectangle (Click-drag diagonal on plane)', category: 'Tools' },
  { key: 'C', desc: 'Circle (Click-drag center to radius)', category: 'Tools' },
  { key: 'B', desc: 'Box (Click-drag footprint, height = shorter side)', category: 'Tools' },
  { key: 'O', desc: 'Sphere (Click-drag center to radius)', category: 'Tools' },
  { key: 'Y', desc: 'Cylinder (Click-drag radius, height = 2x)', category: 'Tools' },
  { key: 'N', desc: 'Cone (Click-drag radius, height = 2x)', category: 'Tools' },
  { key: 'X', desc: 'Eraser (Click any object to delete)', category: 'Tools' },

  // Navigation
  { key: 'Space + Drag', desc: 'Orbit / Rotate camera (in any tool)', category: 'Navigation' },
  { key: 'Right Drag', desc: 'Pan camera view', category: 'Navigation' },
  { key: 'Scroll Wheel', desc: 'Zoom camera in / out', category: 'Navigation' },

  // Editing
  { key: 'G', desc: 'Toggle Grid Snapping', category: 'Editing' },
  { key: 'Ctrl + Z', desc: 'Undo last action', category: 'Editing' },
  { key: 'Ctrl + Shift + Z / Ctrl + Y', desc: 'Redo previously undone action', category: 'Editing' },
  { key: 'Ctrl + D', desc: 'Duplicate selected object(s)', category: 'Editing' },
  { key: 'Ctrl + A', desc: 'Select all visible & unlocked objects', category: 'Editing' },
  { key: 'Delete / Backspace', desc: 'Delete selected object(s)', category: 'Editing' },
  { key: 'Escape', desc: 'Deselect all', category: 'Editing' },
  { key: '?', desc: 'Open / Close this shortcuts cheatsheet', category: 'Editing' },
];

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  const categories = ['Tools', 'Navigation', 'Editing'] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[85vh] rounded-xl border shadow-2xl p-5 flex flex-col gap-4 text-xs overflow-hidden"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-indigo-400" />
            <h3 className="text-sm font-semibold">Keyboard Shortcuts & Controls</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content categorized */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
          {categories.map((cat) => (
            <div key={cat} className="flex flex-col gap-1.5">
              <span className="font-semibold text-indigo-400 text-[11px] uppercase tracking-wider">
                {cat}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {shortcuts
                  .filter((s) => s.category === cat)
                  .map((s) => (
                    <div
                      key={s.key}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded border bg-black/5 dark:bg-white/5"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <span className="text-[11px] text-slate-300 truncate pr-2">{s.desc}</span>
                      <kbd className="px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[10px] shrink-0">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
