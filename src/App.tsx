/**
 * Root App component.
 * Sets up the theme class and renders the main layout.
 */
import { useSceneStore } from './store/useSceneStore';
import { Canvas3D } from './components/Canvas3D';
import { TopBar } from './components/TopBar';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { PlaneControls } from './components/PlaneControls';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  const theme = useSceneStore((s) => s.theme);
  useKeyboardShortcuts();

  return (
    <div className={`theme-${theme} w-screen h-screen flex flex-col`}
         style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Top bar */}
      <TopBar />

      {/* Main area: toolbar + canvas + right panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left toolbar */}
        <Toolbar />

        {/* Center: 3D canvas */}
        <div className="flex-1 relative">
          <PlaneControls />
          <Canvas3D />
        </div>
      </div>

      {/* Bottom status bar */}
      <StatusBar />
    </div>
  );
}
