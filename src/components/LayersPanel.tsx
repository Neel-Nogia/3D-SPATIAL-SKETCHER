/**
 * LayersPanel — List of all objects in draw order (newest on top).
 * Features:
 * - Type icon + editable name
 * - Eye (visibility toggle)
 * - Lock (prevents select/edit)
 * - Up / Down buttons to reorder draw depth
 * - Delete button
 * - Click row selects the object
 */
import { useState, useRef } from 'react';
import { useSceneStore } from '../store/useSceneStore';
import type { ObjectType } from '../types/scene';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ChevronUp,
  ChevronDown,
  Edit2,
  Check,
  Layers,
  Box,
  Globe,
  Circle,
  Square,
  Minus,
  Pencil,
  Cylinder as CylinderIcon,
  Cone,
} from 'lucide-react';

function getTypeIcon(type: ObjectType) {
  switch (type) {
    case 'stroke':
      return Pencil;
    case 'line':
      return Minus;
    case 'rect':
      return Square;
    case 'circle':
      return Circle;
    case 'box':
      return Box;
    case 'sphere':
      return Globe;
    case 'cylinder':
      return CylinderIcon;
    case 'cone':
      return Cone;
  }
}

export function LayersPanel() {
  const order = useSceneStore((s) => s.order);
  const objects = useSceneStore((s) => s.objects);
  const selectedIds = useSceneStore((s) => s.selectedIds);
  const select = useSceneStore((s) => s.select);
  const selectMultiple = useSceneStore((s) => s.selectMultiple);
  const setObjectVisibility = useSceneStore((s) => s.setObjectVisibility);
  const setObjectLocked = useSceneStore((s) => s.setObjectLocked);
  const renameObject = useSceneStore((s) => s.renameObject);
  const reorderObject = useSceneStore((s) => s.reorderObject);
  const deleteObjects = useSceneStore((s) => s.deleteObjects);

  // Editing state for rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setTempName(name);
    setTimeout(() => inputRef.current?.select(), 50);
  };

  const finishRename = () => {
    if (editingId && tempName.trim()) {
      renameObject(editingId, tempName.trim());
    }
    setEditingId(null);
  };

  // Display newest objects at the top of the list
  const reversedOrder = [...order].reverse();

  return (
    <div
      className="w-64 border-l h-full flex flex-col text-xs select-none overflow-hidden"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
        <div className="font-semibold flex items-center gap-1.5">
          <Layers size={14} className="text-indigo-500" />
          <span>Layers ({order.length})</span>
        </div>
      </div>

      {/* Layer items list */}
      <div className="flex-1 overflow-y-auto p-1 flex flex-col gap-0.5">
        {reversedOrder.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-[11px] flex flex-col items-center gap-1">
            <span>No objects yet.</span>
            <span className="text-[10px] text-slate-500">Sketch a shape to start!</span>
          </div>
        ) : (
          reversedOrder.map((id, index) => {
            const obj = objects[id];
            if (!obj) return null;

            const isSelected = selectedIds.includes(id);
            const Icon = getTypeIcon(obj.type);
            const isEditing = editingId === id;

            return (
              <div
                key={id}
                onClick={(e) => {
                  if (obj.locked) return;
                  if (e.shiftKey) {
                    selectMultiple(id);
                  } else {
                    select(id);
                  }
                }}
                className={`flex items-center justify-between px-2 py-1.5 rounded transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-indigo-600/20 text-indigo-400 font-medium'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {/* Left: Type Icon + Name */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: obj.color }}
                  />
                  <Icon size={13} className="shrink-0 text-slate-400" />

                  {isEditing ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        ref={inputRef}
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={finishRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishRename();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-full bg-black/20 px-1 py-0.5 rounded text-xs focus:outline-none"
                      />
                      <button onClick={finishRename} className="hover:text-green-400">
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startRename(id, obj.name);
                      }}
                      className="truncate text-xs flex-1"
                      title={obj.name}
                    >
                      {obj.name}
                    </span>
                  )}
                </div>

                {/* Right: Actions (Eye, Lock, Reorder, Delete) */}
                <div
                  className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!isEditing && (
                    <button
                      onClick={() => startRename(id, obj.name)}
                      className="p-1 hover:text-indigo-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Rename"
                    >
                      <Edit2 size={11} />
                    </button>
                  )}

                  {/* Reorder Up / Down */}
                  <button
                    onClick={() => reorderObject(id, 'up')}
                    disabled={index === 0}
                    className="p-1 hover:text-indigo-400 disabled:opacity-20 rounded"
                    title="Move Layer Up"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={() => reorderObject(id, 'down')}
                    disabled={index === reversedOrder.length - 1}
                    className="p-1 hover:text-indigo-400 disabled:opacity-20 rounded"
                    title="Move Layer Down"
                  >
                    <ChevronDown size={12} />
                  </button>

                  {/* Visibility */}
                  <button
                    onClick={() => setObjectVisibility(id, !obj.visible)}
                    className="p-1 hover:text-indigo-400 rounded"
                    title={obj.visible ? 'Hide object' : 'Show object'}
                  >
                    {obj.visible ? <Eye size={12} /> : <EyeOff size={12} className="text-slate-500" />}
                  </button>

                  {/* Lock */}
                  <button
                    onClick={() => setObjectLocked(id, !obj.locked)}
                    className="p-1 hover:text-amber-400 rounded"
                    title={obj.locked ? 'Unlock object' : 'Lock object'}
                  >
                    {obj.locked ? <Lock size={12} className="text-amber-500" /> : <Unlock size={12} className="opacity-40" />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteObjects([id])}
                    className="p-1 hover:text-red-400 rounded"
                    title="Delete object"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
