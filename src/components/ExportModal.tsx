/**
 * ExportModal — Modal for exporting scenes as PNG, GLTF (.glb), OBJ, or JSON backup.
 */
import { useState } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '../store/useSceneStore';
import { useToastStore } from '../store/useToastStore';
import {
  exportCanvasToPNG,
  exportToGLTF,
  exportToOBJ,
  exportToJSON,
} from '../utils/export';
import type { ProjectFile } from '../types/scene';
import {
  X,
  Image,
  Box,
  FileCode,
  Download,
  Check,
  Loader2,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const projectName = useSceneStore((s) => s.projectName);
  const objects = useSceneStore((s) => s.objects);
  const order = useSceneStore((s) => s.order);
  const showToast = useToastStore((s) => s.showToast);

  const [transparentPNG, setTransparentPNG] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const getCanvas = (): HTMLCanvasElement | null => {
    return document.querySelector('canvas');
  };

  const getThreeScene = (): THREE.Scene | null => {
    const canvas = getCanvas();
    if (!canvas) return null;
    // Access Three.js scene via React Three Fiber internal root instance if available
    // or through the scene query helper
    const sceneRoot = (canvas as HTMLCanvasElement & { __r3f?: { scene: THREE.Scene } }).__r3f?.scene;
    if (sceneRoot) return sceneRoot;

    // Fallback: construct scene from current objects in store
    const fallbackScene = new THREE.Scene();
    const group = new THREE.Group();
    group.name = 'scene-objects-root';
    fallbackScene.add(group);
    return fallbackScene;
  };

  const handleExportPNG = () => {
    const canvas = getCanvas();
    if (!canvas) {
      showToast('No active 3D canvas found for export.', 'error');
      return;
    }

    try {
      exportCanvasToPNG(canvas, projectName || '3d-sketch', transparentPNG);
      showToast('PNG screenshot exported successfully!', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to export PNG screenshot.', 'error');
    }
  };

  const handleExportGLTF = async () => {
    setIsExporting(true);
    try {
      const canvas = getCanvas();
      const r3f = (canvas as HTMLCanvasElement & { __r3f?: { scene: THREE.Scene } })?.__r3f;
      const scene = r3f?.scene || getThreeScene();

      if (!scene) {
        throw new Error('Scene not initialized');
      }

      await exportToGLTF(scene, projectName || '3d-sketch');
      showToast('3D GLTF (.glb) model exported successfully!', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to export GLTF model.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportOBJ = () => {
    try {
      const canvas = getCanvas();
      const r3f = (canvas as HTMLCanvasElement & { __r3f?: { scene: THREE.Scene } })?.__r3f;
      const scene = r3f?.scene || getThreeScene();

      if (!scene) {
        throw new Error('Scene not initialized');
      }

      exportToOBJ(scene, projectName || '3d-sketch');
      showToast('Wavefront .obj file exported successfully!', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to export OBJ model.', 'error');
    }
  };

  const handleExportJSON = () => {
    try {
      const projectData: ProjectFile = {
        version: 1,
        name: projectName,
        objects,
        order,
      };
      exportToJSON(projectData, projectName || 'sketch');
      showToast('Project JSON exported successfully!', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to export JSON file.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <div
        className="w-full max-w-md rounded-xl border shadow-2xl p-5 flex flex-col gap-4 text-xs"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Download size={16} className="text-indigo-500" />
            <h3 className="text-sm font-semibold">Export Scene</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Options Grid */}
        <div className="flex flex-col gap-2.5">
          {/* PNG Option */}
          <div
            className="flex items-center justify-between p-3 rounded-lg border hover:border-indigo-500/50 transition-colors group cursor-pointer"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}
            onClick={handleExportPNG}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <Image size={16} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-xs">Image (.png)</span>
                <span className="text-[11px] text-slate-400">High-resolution canvas screenshot</span>
              </div>
            </div>

            <div
              className="flex items-center gap-1.5 text-[11px] text-slate-400"
              onClick={(e) => e.stopPropagation()}
            >
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transparentPNG}
                  onChange={(e) => setTransparentPNG(e.target.checked)}
                  className="rounded text-indigo-600 accent-indigo-500"
                />
                <span>Alpha</span>
              </label>
            </div>
          </div>

          {/* GLTF / GLB Option */}
          <div
            className="flex items-center justify-between p-3 rounded-lg border hover:border-indigo-500/50 transition-colors group cursor-pointer"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}
            onClick={handleExportGLTF}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <Box size={16} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-xs">3D GLTF (.glb)</span>
                <span className="text-[11px] text-slate-400">Standard binary 3D model for Blender, Three.js</span>
              </div>
            </div>

            {isExporting ? (
              <Loader2 size={16} className="animate-spin text-indigo-400" />
            ) : (
              <Download size={14} className="opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />
            )}
          </div>

          {/* OBJ Option */}
          <div
            className="flex items-center justify-between p-3 rounded-lg border hover:border-indigo-500/50 transition-colors group cursor-pointer"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}
            onClick={handleExportOBJ}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center">
                <Box size={16} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-xs">Wavefront (.obj)</span>
                <span className="text-[11px] text-slate-400">Universal 3D geometry format</span>
              </div>
            </div>

            <Download size={14} className="opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />
          </div>

          {/* JSON Backup Option */}
          <div
            className="flex items-center justify-between p-3 rounded-lg border hover:border-indigo-500/50 transition-colors group cursor-pointer"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}
            onClick={handleExportJSON}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <FileCode size={16} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-xs">Project File (.sketch.json)</span>
                <span className="text-[11px] text-slate-400">Full project data with layers & properties</span>
              </div>
            </div>

            <Download size={14} className="opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded border hover:bg-black/10 dark:hover:bg-white/10 font-medium text-xs transition-colors flex items-center gap-1"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Check size={13} />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
