/**
 * Root App component.
 * Coordinates all UI layers, panels, shortcuts, persistence, hand tracking, and modals.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useSceneStore } from './store/useSceneStore';
import { useToastStore } from './store/useToastStore';
import { initPersistence } from './store/persistence';
import { Canvas3D } from './components/Canvas3D';
import { TopBar } from './components/TopBar';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { PlaneControls } from './components/PlaneControls';
import { RightPanel } from './components/RightPanel';
import { ExportModal } from './components/ExportModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ToastContainer } from './components/Toast';
import { EmptyStateHint } from './components/EmptyStateHint';
import { HandTrackingOverlay } from './hand/HandCursor';
import { useHandTracking } from './hand/useHandTracking';
import { HandToolBridge } from './hand/handTool';
import type { Landmark, GestureType } from './hand/gestures';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { exportToJSON } from './utils/export';
import { validateProjectFile } from './utils/validation';
import type { ProjectFile } from './types/scene';
import { SlidersHorizontal } from 'lucide-react';

export default function App() {
  const theme = useSceneStore((s) => s.theme);
  const projectName = useSceneStore((s) => s.projectName);
  const objects = useSceneStore((s) => s.objects);
  const order = useSceneStore((s) => s.order);
  const loadProject = useSceneStore((s) => s.loadProject);
  const showToast = useToastStore((s) => s.showToast);

  // Modals state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  // Hand tracking state
  const [isHandModeEnabled, setIsHandModeEnabled] = useState(false);
  const [handCursorPos, setHandCursorPos] = useState<[number, number, number] | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('idle');
  const [currentLandmarks, setCurrentLandmarks] = useState<Landmark[] | null>(null);
  const [smoothness, setSmoothness] = useState(65);

  const handBridgeRef = useRef(new HandToolBridge());

  // Hidden JSON file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize debounced autosave & restore
  useEffect(() => {
    const cleanup = initPersistence();
    return cleanup;
  }, []);

  // Keyboard shortcuts (? opens help modal)
  useKeyboardShortcuts({
    onOpenHelp: () => setIsShortcutsOpen((prev) => !prev),
  });

  const handleHandTrackingError = useCallback(
    (msg: string) => {
      showToast(msg, 'error');
      setIsHandModeEnabled(false);
    },
    [showToast],
  );

  // Hand tracking lifecycle
  const { status, videoElement, setOnFrame, updateSmoothness } =
    useHandTracking(isHandModeEnabled, { onError: handleHandTrackingError });

  // Update filter smoothness
  useEffect(() => {
    updateSmoothness(smoothness);
  }, [smoothness, updateSmoothness]);

  // Hook into video frame processing to bridge hand gestures to Three.js canvas & tools
  useEffect(() => {
    if (!isHandModeEnabled) return;

    setOnFrame((frameData) => {
      // Find R3F camera from canvas
      const canvas = document.querySelector('canvas');
      const camera = (canvas as HTMLCanvasElement & { __r3f?: { camera: THREE.Camera } })?.__r3f?.camera;

      if (frameData.primaryHand) {
        setCurrentLandmarks(frameData.primaryHand.landmarks);
        setCurrentGesture(frameData.primaryHand.detection.gesture);
        setIsPinching(frameData.primaryHand.detection.isPinching);

        if (camera) {
          const pt3D = handBridgeRef.current.handleHandFrame(frameData, camera);
          setHandCursorPos(pt3D);
        }
      } else {
        setCurrentLandmarks(null);
        setCurrentGesture('idle');
        setIsPinching(false);
        setHandCursorPos(null);
      }
    });
  }, [isHandModeEnabled, setOnFrame]);

  const handleToggleHandMode = () => {
    if (!isHandModeEnabled) {
      showToast('Starting webcam hand tracking...', 'info');
      setIsHandModeEnabled(true);
    } else {
      setIsHandModeEnabled(false);
      setHandCursorPos(null);
      setIsPinching(false);
      setCurrentLandmarks(null);
      setCurrentGesture('idle');
      handBridgeRef.current.reset();
      showToast('Hand tracking mode disabled.', 'info');
    }
  };

  const handleSaveJson = () => {
    try {
      const data: ProjectFile = {
        version: 1,
        name: projectName,
        objects,
        order,
      };
      exportToJSON(data, projectName || '3d-sketch');
      showToast('Project saved to JSON file!', 'success');
    } catch {
      showToast('Failed to save project file.', 'error');
    }
  };

  const handleOpenJsonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const validation = validateProjectFile(parsed);

        if (validation.success) {
          loadProject(
            validation.data.objects,
            validation.data.order,
            validation.data.name,
          );
          showToast(`Loaded "${validation.data.name}" (${validation.data.order.length} objects)`, 'success');
        } else {
          showToast(validation.error, 'error');
        }
      } catch (err) {
        showToast('Could not parse JSON file. File may be corrupted.', 'error');
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className={`theme-${theme} w-screen h-screen flex flex-col overflow-hidden`}
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {/* Hidden file input for Open JSON */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.sketch.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top bar */}
      <TopBar
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onSaveJson={handleSaveJson}
        onOpenJson={handleOpenJsonClick}
        isHandModeEnabled={isHandModeEnabled}
        onToggleHandMode={handleToggleHandMode}
      />

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left toolbar */}
        <Toolbar />

        {/* Center: 3D canvas viewport */}
        <main className="flex-1 relative overflow-hidden">
          <PlaneControls />
          <EmptyStateHint />
          <Canvas3D handCursorPos={handCursorPos} isPinching={isPinching} />

          {/* Hand Tracking Picture-in-Picture & Landmark HUD */}
          {isHandModeEnabled && (
            <HandTrackingOverlay
              videoElement={videoElement}
              landmarks={currentLandmarks}
              gesture={currentGesture}
              status={status}
              smoothness={smoothness}
              onSmoothnessChange={setSmoothness}
              onClose={() => setIsHandModeEnabled(false)}
            />
          )}

          {/* Mobile Panel Toggle Button (visible on screens < 768px) */}
          <button
            onClick={() => setShowMobilePanel((p) => !p)}
            className="md:hidden absolute bottom-3 right-3 z-20 p-2.5 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition-colors"
            title="Toggle Properties & Layers Panel"
            aria-label="Toggle Properties & Layers Panel"
          >
            <SlidersHorizontal size={18} />
          </button>
        </main>

        {/* Right panel: Desktop (always visible) / Mobile Drawer */}
        <div
          className={`h-full z-30 transition-transform duration-200 md:relative md:translate-x-0 ${
            showMobilePanel
              ? 'fixed inset-y-0 right-0 translate-x-0 shadow-2xl'
              : 'fixed inset-y-0 right-0 translate-x-full md:translate-x-0'
          }`}
        >
          <RightPanel />
        </div>
      </div>

      {/* Bottom status bar */}
      <StatusBar />

      {/* Modals & Overlays */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <ToastContainer />
    </div>
  );
}
