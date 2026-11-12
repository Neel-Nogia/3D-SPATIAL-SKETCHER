/**
 * Persistence layer — debounced autosave to localStorage & restore on startup.
 */
import { useSceneStore } from './useSceneStore';
import { validateProjectFile } from '../utils/validation';
import type { ProjectFile } from '../types/scene';

const STORAGE_KEY = '3d-spatial-sketcher-autosave';

/** Initialize autosave subscription and restore initial data */
export function initPersistence(): () => void {
  // 1. Restore from localStorage if present
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const validation = validateProjectFile(parsed);
      if (validation.success) {
        useSceneStore.getState().loadProject(
          validation.data.objects,
          validation.data.order,
          validation.data.name,
        );
      }
    }
  } catch (err) {
    console.warn('Could not restore previous autosaved project:', err);
  }

  // 2. Debounced save on state change (500 ms)
  let timeoutId: number | null = null;

  const unsubscribe = useSceneStore.subscribe((state) => {
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = window.setTimeout(() => {
      try {
        const projectData: ProjectFile = {
          version: 1,
          name: state.projectName,
          objects: state.objects,
          order: state.order,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData));
      } catch (err) {
        console.error('Failed to autosave project:', err);
      }
    }, 500);
  });

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    unsubscribe();
  };
}
