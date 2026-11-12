/**
 * Unit tests for project file JSON validation with Zod.
 */
import { describe, it, expect } from 'vitest';
import { validateProjectFile } from './validation';

describe('validateProjectFile', () => {
  const validProject = {
    version: 1,
    name: 'My 3D Sketch',
    objects: {
      box1: {
        id: 'box1',
        type: 'box',
        name: 'Box 1',
        size: [2, 2, 2],
        color: '#ff0000',
        thickness: 2,
        opacity: 1,
        wireframe: false,
        position: [0, 1, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        locked: false,
      },
    },
    order: ['box1'],
  };

  it('accepts a valid project file', () => {
    const result = validateProjectFile(validProject);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My 3D Sketch');
      expect(result.data.order).toEqual(['box1']);
    }
  });

  it('rejects unsupported schema version', () => {
    const invalid = { ...validProject, version: 2 };
    const result = validateProjectFile(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects missing or empty project name', () => {
    const invalid = { ...validProject, name: '' };
    const result = validateProjectFile(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid object type', () => {
    const invalid = {
      ...validProject,
      objects: {
        ...validProject.objects,
        box1: { ...validProject.objects.box1, type: 'triangle' },
      },
    };
    const result = validateProjectFile(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects missing transform vectors', () => {
    const invalid = {
      ...validProject,
      objects: {
        box1: {
          id: 'box1',
          type: 'box',
          name: 'Box 1',
          color: '#ff0000',
          thickness: 1,
          opacity: 1,
          wireframe: false,
          visible: true,
          locked: false,
          // Missing position, rotation, scale
        },
      },
    };
    const result = validateProjectFile(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects non-object inputs', () => {
    expect(validateProjectFile(null).success).toBe(false);
    expect(validateProjectFile('string').success).toBe(false);
    expect(validateProjectFile([]).success).toBe(false);
  });
});
