/**
 * PropertiesPanel — Inspector for selected object properties and active drawing styles.
 * Supports:
 * - Color picker + 8 swatches
 * - Stroke thickness slider (1-20)
 * - Opacity slider (0.05 - 1.0)
 * - Wireframe toggle for 3D solid geometries
 * - Numeric live inputs for Position, Rotation (degrees), and Scale (X, Y, Z)
 * - Commits one undo snapshot on blur/Enter.
 */
import { useState } from 'react';
import { useSceneStore } from '../store/useSceneStore';
import type { Vec3 } from '../types/scene';
import {
  Palette,
  Sliders,
  Maximize2,
  Trash2,
  Copy,
  Lock,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#ef4444', // Red
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#14b8a6', // Teal
];

/** Convert radians to degrees */
const radToDeg = (rad: number) => Math.round((rad * 180) / Math.PI);
/** Convert degrees to radians */
const degToRad = (deg: number) => (deg * Math.PI) / 180;

/** Numeric field component that manages local text while typing and commits on blur/Enter */
function NumericField({
  axis,
  value,
  step = 0.5,
  isDegree = false,
  onCommit,
}: {
  axis: 'X' | 'Y' | 'Z';
  value: number;
  step?: number;
  isDegree?: boolean;
  onCommit: (val: number) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [text, setText] = useState('');

  const displayValue = isFocused
    ? text
    : isDegree
      ? radToDeg(value).toString()
      : value.toFixed(2);

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) {
      onCommit(isDegree ? degToRad(parsed) : parsed);
    }
  };

  return (
    <div
      className="flex items-center border rounded px-1.5 py-0.5 bg-black/10"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <span className="text-[10px] text-slate-400 font-mono mr-1">{axis}</span>
      <input
        type="number"
        step={step}
        value={displayValue}
        onFocus={() => {
          setIsFocused(true);
          setText(isDegree ? radToDeg(value).toString() : value.toFixed(2));
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="w-full bg-transparent focus:outline-none font-mono text-[11px]"
      />
    </div>
  );
}

export function PropertiesPanel() {
  const selectedIds = useSceneStore((s) => s.selectedIds);
  const objects = useSceneStore((s) => s.objects);
  const updateObject = useSceneStore((s) => s.updateObject);
  const deleteObjects = useSceneStore((s) => s.deleteObjects);
  const duplicateObjects = useSceneStore((s) => s.duplicateObjects);
  const pushHistory = useSceneStore((s) => s.pushHistory);
  const currentStyle = useSceneStore((s) => s.currentStyle);
  const setCurrentStyle = useSceneStore((s) => s.setCurrentStyle);
  const setObjectVisibility = useSceneStore((s) => s.setObjectVisibility);
  const setObjectLocked = useSceneStore((s) => s.setObjectLocked);

  const selectedObj = selectedIds.length > 0 ? objects[selectedIds[0]] : null;

  const commitPropertyChange = <T extends object>(updates: T) => {
    if (!selectedObj) return;
    pushHistory();
    updateObject(selectedObj.id, updates);
  };

  const handleColorChange = (newColor: string) => {
    if (selectedObj) {
      commitPropertyChange({ color: newColor });
    } else {
      setCurrentStyle({ color: newColor });
    }
  };

  const handleThicknessChange = (thickness: number) => {
    if (selectedObj) {
      commitPropertyChange({ thickness });
    } else {
      setCurrentStyle({ thickness });
    }
  };

  const handleOpacityChange = (opacity: number) => {
    if (selectedObj) {
      commitPropertyChange({ opacity });
    } else {
      setCurrentStyle({ opacity });
    }
  };

  const handleWireframeToggle = (wireframe: boolean) => {
    if (selectedObj) {
      commitPropertyChange({ wireframe });
    } else {
      setCurrentStyle({ wireframe });
    }
  };

  const handlePosChange = (axisIdx: 0 | 1 | 2, val: number) => {
    if (!selectedObj) return;
    const newPos: Vec3 = [...selectedObj.position];
    newPos[axisIdx] = val;
    commitPropertyChange({ position: newPos });
  };

  const handleRotChange = (axisIdx: 0 | 1 | 2, val: number) => {
    if (!selectedObj) return;
    const newRot: Vec3 = [...selectedObj.rotation];
    newRot[axisIdx] = val;
    commitPropertyChange({ rotation: newRot });
  };

  const handleScaleChange = (axisIdx: 0 | 1 | 2, val: number) => {
    if (!selectedObj) return;
    const newScale: Vec3 = [...selectedObj.scale];
    newScale[axisIdx] = Math.max(0.01, val);
    commitPropertyChange({ scale: newScale });
  };

  const activeColor = selectedObj ? selectedObj.color : currentStyle.color;
  const activeThickness = selectedObj ? selectedObj.thickness : currentStyle.thickness;
  const activeOpacity = selectedObj ? selectedObj.opacity : currentStyle.opacity;
  const activeWireframe = selectedObj ? selectedObj.wireframe : currentStyle.wireframe;

  const isSolidType = selectedObj
    ? ['box', 'sphere', 'cylinder', 'cone'].includes(selectedObj.type)
    : true;

  return (
    <div
      className="w-64 border-l h-full flex flex-col text-xs select-none overflow-y-auto"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
        <div className="font-semibold flex items-center gap-1.5">
          <Sliders size={14} className="text-indigo-500" />
          <span>{selectedObj ? selectedObj.name : 'Drawing Style'}</span>
        </div>
        {selectedObj && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setObjectVisibility(selectedObj.id, !selectedObj.visible)}
              className="p-1 hover:text-indigo-500 rounded"
              title={selectedObj.visible ? 'Hide object' : 'Show object'}
            >
              {selectedObj.visible ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
            <button
              onClick={() => setObjectLocked(selectedObj.id, !selectedObj.locked)}
              className={`p-1 rounded ${selectedObj.locked ? 'text-amber-500' : 'hover:text-indigo-500'}`}
              title={selectedObj.locked ? 'Unlock object' : 'Lock object'}
            >
              <Lock size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-4">
        {/* Color Palette Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between font-medium text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Palette size={12} /> Color
            </span>
            <span className="font-mono">{activeColor.toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={activeColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-7 h-7 rounded border cursor-pointer bg-transparent p-0"
              style={{ borderColor: 'var(--border-color)' }}
              title="Custom Color"
            />
            {/* 8 Preset Swatches */}
            <div className="flex items-center gap-1 flex-wrap flex-1">
              {PRESET_COLORS.map((hex) => (
                <button
                  key={hex}
                  onClick={() => handleColorChange(hex)}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    activeColor.toLowerCase() === hex.toLowerCase() ? 'scale-125 ring-2 ring-indigo-400' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: hex, borderColor: 'rgba(0,0,0,0.1)' }}
                  title={hex}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Stroke Thickness */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Thickness</span>
            <span className="font-mono">{activeThickness}px</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={activeThickness}
            onChange={(e) => handleThicknessChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Opacity */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Opacity</span>
            <span className="font-mono">{Math.round(activeOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={1.0}
            step={0.05}
            value={activeOpacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Wireframe toggle for 3D solids */}
        {isSolidType && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-400 text-[11px]">Wireframe</span>
            <button
              onClick={() => handleWireframeToggle(!activeWireframe)}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                activeWireframe ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  activeWireframe ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        {/* Transform Inputs (When an object is selected) */}
        {selectedObj && (
          <>
            <div className="h-px bg-slate-700/50 my-1" />

            <div className="flex flex-col gap-3">
              <span className="font-medium text-slate-400 text-[11px] flex items-center gap-1">
                <Maximize2 size={12} /> Transform
              </span>

              {/* Position */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Position</span>
                <div className="grid grid-cols-3 gap-1">
                  <NumericField axis="X" value={selectedObj.position[0]} step={0.5} onCommit={(v) => handlePosChange(0, v)} />
                  <NumericField axis="Y" value={selectedObj.position[1]} step={0.5} onCommit={(v) => handlePosChange(1, v)} />
                  <NumericField axis="Z" value={selectedObj.position[2]} step={0.5} onCommit={(v) => handlePosChange(2, v)} />
                </div>
              </div>

              {/* Rotation */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Rotation (Deg)</span>
                <div className="grid grid-cols-3 gap-1">
                  <NumericField axis="X" value={selectedObj.rotation[0]} step={15} isDegree onCommit={(v) => handleRotChange(0, v)} />
                  <NumericField axis="Y" value={selectedObj.rotation[1]} step={15} isDegree onCommit={(v) => handleRotChange(1, v)} />
                  <NumericField axis="Z" value={selectedObj.rotation[2]} step={15} isDegree onCommit={(v) => handleRotChange(2, v)} />
                </div>
              </div>

              {/* Scale */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Scale</span>
                <div className="grid grid-cols-3 gap-1">
                  <NumericField axis="X" value={selectedObj.scale[0]} step={0.1} onCommit={(v) => handleScaleChange(0, v)} />
                  <NumericField axis="Y" value={selectedObj.scale[1]} step={0.1} onCommit={(v) => handleScaleChange(1, v)} />
                  <NumericField axis="Z" value={selectedObj.scale[2]} step={0.1} onCommit={(v) => handleScaleChange(2, v)} />
                </div>
              </div>

              {/* Actions: Duplicate / Delete */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => duplicateObjects([selectedObj.id])}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded border hover:bg-black/10 dark:hover:bg-white/10 transition-colors font-medium text-[11px]"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <Copy size={12} />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={() => deleteObjects([selectedObj.id])}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors font-medium text-[11px]"
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Empty selection state tip */}
        {!selectedObj && (
          <div className="p-3 bg-black/5 dark:bg-white/5 rounded text-slate-400 text-center text-[11px] flex flex-col items-center gap-1 mt-2">
            <Layers size={16} className="text-slate-500 mb-1" />
            <span>Select an object to inspect & edit its transforms</span>
          </div>
        )}
      </div>
    </div>
  );
}
