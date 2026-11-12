/**
 * Left vertical toolbar — tool buttons with icons and tooltips.
 * Placeholder for Phase 0; tools will be added in Phase 3.
 */
import { useSceneStore } from '../store/useSceneStore';
import type { ToolId } from '../types/scene';
import {
  MousePointer2,
  Pencil,
  Minus,
  Square,
  Circle,
  Box,
  Globe,
  Cylinder as CylinderIcon,
  Cone,
  Eraser,
  Move,
  RotateCcw,
  Scaling,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Tool definition for the toolbar */
interface ToolDef {
  id: ToolId;
  label: string;
  icon: LucideIcon;
  shortcut: string;
}

const tools: ToolDef[] = [
  { id: 'select', label: 'Select', icon: MousePointer2, shortcut: 'V' },
  { id: 'move', label: 'Move', icon: Move, shortcut: 'W' },
  { id: 'rotate', label: 'Rotate', icon: RotateCcw, shortcut: 'E' },
  { id: 'scale', label: 'Scale', icon: Scaling, shortcut: 'R' },
  { id: 'pen', label: 'Pen', icon: Pencil, shortcut: 'P' },
  { id: 'line', label: 'Line', icon: Minus, shortcut: 'L' },
  { id: 'rect', label: 'Rectangle', icon: Square, shortcut: 'Q' },
  { id: 'circle', label: 'Circle', icon: Circle, shortcut: 'C' },
  { id: 'box', label: 'Box', icon: Box, shortcut: 'B' },
  { id: 'sphere', label: 'Sphere', icon: Globe, shortcut: 'O' },
  { id: 'cylinder', label: 'Cylinder', icon: CylinderIcon, shortcut: 'Y' },
  { id: 'cone', label: 'Cone', icon: Cone, shortcut: 'N' },
  { id: 'eraser', label: 'Eraser', icon: Eraser, shortcut: 'X' },
];

export function Toolbar() {
  const activeTool = useSceneStore((s) => s.activeTool);
  const setActiveTool = useSceneStore((s) => s.setActiveTool);

  return (
    <div
      className="flex flex-col items-center py-2 px-1 gap-1 border-r shrink-0 overflow-y-auto"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', width: '48px' }}
    >
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all
              ${isActive ? 'text-white' : 'hover:opacity-80'}`}
            style={{
              background: isActive ? 'var(--accent)' : 'transparent',
            }}
            aria-label={`${tool.label} (${tool.shortcut})`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
}
