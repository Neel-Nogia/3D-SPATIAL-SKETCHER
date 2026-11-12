/**
 * Top bar — project name, undo/redo, save/load, export, theme toggle, help.
 * Placeholder for Phase 0; will be filled in later phases.
 */
import { useSceneStore } from '../store/useSceneStore';
import { Sun, Moon } from 'lucide-react';

export function TopBar() {
  const theme = useSceneStore((s) => s.theme);
  const toggleTheme = useSceneStore((s) => s.toggleTheme);
  const projectName = useSceneStore((s) => s.projectName);

  return (
    <div
      className="flex items-center justify-between px-4 h-12 border-b shrink-0"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
    >
      {/* Project name */}
      <div className="font-semibold text-sm">{projectName}</div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded hover:opacity-80 transition-opacity"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </div>
  );
}
