/**
 * Export utilities for 3D Spatial Sketcher.
 * - PNG: Canvas snapshot (supports transparent background)
 * - GLTF: Binary .glb format (excludes grid, helpers, gizmos)
 * - OBJ: Wavefront .obj format
 * - JSON: Serialized project file
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import type { ProjectFile } from '../types/scene';

/** Triggers a browser file download from a Blob or URL */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Export canvas as a PNG screenshot */
export function exportCanvasToPNG(
  canvas: HTMLCanvasElement,
  filename: string,
  transparent: boolean = false,
): void {
  if (transparent) {
    // If transparent requested, read directly from WebGL canvas preserveDrawingBuffer
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${filename}.png`);
    }, 'image/png');
  } else {
    // Fill opaque background before saving
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    tempCanvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${filename}.png`);
    }, 'image/png');
  }
}

/** Extracts only user-drawn scene objects, skipping grid, lights, and helpers */
function getExportableGroup(rootScene: THREE.Scene): THREE.Group {
  const exportGroup = new THREE.Group();
  exportGroup.name = 'ExportRoot';

  // Find the 'scene-objects-root' group that holds all SceneObjectMesh instances
  const sceneObjectsRoot = rootScene.getObjectByName('scene-objects-root');
  if (sceneObjectsRoot) {
    exportGroup.add(sceneObjectsRoot.clone(true));
  } else {
    // Fallback: copy meshes that are not helpers or grids
    rootScene.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        !child.name.includes('helper') &&
        !child.name.includes('grid') &&
        !child.name.includes('plane') &&
        !child.name.includes('gizmo')
      ) {
        exportGroup.add(child.clone(true));
      }
    });
  }

  return exportGroup;
}

/** Export scene as GLTF/GLB binary */
export function exportToGLTF(rootScene: THREE.Scene, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    const exportGroup = getExportableGroup(rootScene);

    exporter.parse(
      exportGroup,
      (gltf) => {
        const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
        downloadBlob(blob, `${filename}.glb`);
        resolve();
      },
      (error) => {
        console.error('GLTF export error:', error);
        reject(error);
      },
      { binary: true },
    );
  });
}

/** Export scene as OBJ format */
export function exportToOBJ(rootScene: THREE.Scene, filename: string): void {
  const exporter = new OBJExporter();
  const exportGroup = getExportableGroup(rootScene);
  const result = exporter.parse(exportGroup);
  const blob = new Blob([result], { type: 'text/plain' });
  downloadBlob(blob, `${filename}.obj`);
}

/** Export project state as JSON file */
export function exportToJSON(data: ProjectFile, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadBlob(blob, `${filename}.sketch.json`);
}
