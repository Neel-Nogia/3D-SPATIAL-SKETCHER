/**
 * Top bar — Project name (editable), Camera presets, Undo/Redo, Save/Load, Export menu, Theme toggle, Help button.
 */
import { useState, useRef } from 'react';
import { useSceneStore } from '../store/useSceneStore';
import type { CameraPreset } from '../types/scene';
import {
  Sun,
  Moon,
  Undo2,
  Redo2,
  Camera,
  RotateCcw,
  HelpCircle,
  Download,
  FolderOpen,
  Edit2,
  Check,
  Hand,
} from 'lucide-react';

interface TopBarProps {
  onOpenShortcuts?: () => void;
  onOpenExport?: () => void;
  onSaveJson?: () => void;
  onOpenJson?: () => void;
  isHandModeEnabled?: boolean;
  onToggleHandMode?: () => void;
}

export function TopBar({
  onOpenShortcuts,
  onOpenExport,
  onSaveJson,
  onOpenJson,
  isHandModeEnabled = false,
  onToggleHandMode,
}: TopBarProps) {
  const theme = useSceneStore((s) => s.theme);
  const toggleTheme = useSceneStore((s) => s.toggleTheme);
  const projectName = useSceneStore((s) => s.projectName);
  const setProjectName = useSceneStore((s) => s.setProjectName);
  const setCameraPreset = useSceneStore((s) => s.setCameraPreset);
  const undo = useSceneStore((s) => s.undo);
  const redo = useSceneStore((s) => s.redo);
  const pastCount = useSceneStore((s) => s.past.length);
  const futureCount = useSceneStore((s) => s.future.length);

  // Editable project name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = () => {
    setTempName(projectName);
    setIsEditingName(true);
    setTimeout(() => inputRef.current?.select(), 50);
  };

  const handleFinishEdit = () => {
    if (tempName.trim()) {
      setProjectName(tempName.trim());
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFinishEdit();
    if (e.key === 'Escape') setIsEditingName(false);
  };

  const cameraPresets: { preset: CameraPreset; label: string }[] = [
    { preset: 'perspective', label: 'Persp' },
    { preset: 'top', label: 'Top' },
    { preset: 'front', label: 'Front' },
    { preset: 'right', label: 'Right' },
  ];

  return (
    <header
      className="flex items-center justify-between px-3 h-12 border-b shrink-0 select-none text-xs sm:text-sm"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Left: App Logo & Project Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-bold tracking-tight">
          <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-white text-[11px] font-black">
            3D
          </div>
          <span className="hidden md:inline font-semibold">Spatial Sketcher</span>
        </div>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

        {isEditingName ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleFinishEdit}
              onKeyDown={handleKeyDown}
              className="px-2 py-0.5 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-transparent"
              style={{ borderColor: 'var(--border-color)' }}
              maxLength={40}
            />
            <button
              onClick={handleFinishEdit}
              className="p-1 hover:text-indigo-500"
              aria-label="Confirm name"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors group"
            title="Click to rename project"
          >
            <span>{projectName}</span>
            <Edit2 size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" />
          </button>
        )}
      </div>

      {/* Middle: History & Camera Presets */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-black/5 dark:bg-white/5 rounded p-0.5">
          <button
            onClick={undo}
            disabled={pastCount === 0}
            className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={redo}
            disabled={futureCount === 0}
            className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 size={15} />
          </button>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-300 dark:bg-slate-700" />

        {/* Camera Views */}
        <div className="hidden lg:flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded p-0.5 text-xs">
          <span className="px-1.5 text-slate-400 flex items-center gap-1 font-mono text-[10px]">
            <Camera size={12} /> View:
          </span>
          {cameraPresets.map((p) => (
            <button
              key={p.preset}
              onClick={() => setCameraPreset(p.preset)}
              className="px-2 py-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title={`Switch camera to ${p.label} view`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setCameraPreset('perspective')}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Reset view"
            aria-label="Reset view"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Right: Actions, Export, Theme, Help */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Save JSON */}
        <button
          onClick={onSaveJson}
          className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium text-xs"
          title="Save project as JSON"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Save</span>
        </button>

        {/* Open JSON */}
        <button
          onClick={onOpenJson}
          className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium text-xs"
          title="Open project from JSON file"
        >
          <FolderOpen size={14} />
          <span className="hidden sm:inline">Open</span>
        </button>

        {/* Export Menu */}
        <button
          onClick={onOpenExport}
          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium text-xs shadow-sm transition-colors flex items-center gap-1"
          title="Export 3D Model (PNG / GLTF / OBJ)"
        >
          <span>Export</span>
        </button>

        {/* Hand Mode Toggle */}
        <button
          onClick={onToggleHandMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium text-xs transition-all border ${
            isHandModeEnabled
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm animate-pulse'
              : 'border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Toggle Webcam Hand Gesture Control"
          aria-label="Toggle Webcam Hand Tracking Mode"
        >
          <Hand size={14} className={isHandModeEnabled ? 'text-white' : 'text-indigo-400'} />
          <span className="hidden sm:inline">{isHandModeEnabled ? 'Hand Mode ON' : 'Hand Mode'}</span>
        </button>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Help / Shortcuts Modal */}
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          aria-label="Keyboard Shortcuts (?)"
          title="Keyboard shortcuts & help (?)"
        >
          <HelpCircle size={16} />
        </button>
      </div>
    </header>
  );
}
