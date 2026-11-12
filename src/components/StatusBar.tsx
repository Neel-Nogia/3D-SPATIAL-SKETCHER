/**
 * Bottom status bar — shows active tool, drawing plane, snap status, object count, camera hints.
 */
import { useSceneStore } from '../store/useSceneStore';

export function StatusBar() {
  const activeTool = useSceneStore((s) => s.activeTool);
  const drawingPlane = useSceneStore((s) => s.drawingPlane);
  const snapEnabled = useSceneStore((s) => s.snapEnabled);
  const objectCount = useSceneStore((s) => s.order.length);

  return (
    <div
      className="flex items-center justify-between px-4 h-7 text-xs border-t shrink-0"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-secondary)',
      }}
    >
      <div className="flex items-center gap-4">
        <span>Tool: <strong>{activeTool}</strong></span>
        <span>Plane: <strong>{drawingPlane}</strong></span>
        <span>Snap: <strong>{snapEnabled ? 'ON' : 'OFF'}</strong></span>
        <span>Objects: <strong>{objectCount}</strong></span>
      </div>
      <div>Right-drag to pan · Scroll to zoom</div>
    </div>
  );
}
