/**
 * Zod validation schema for importing JSON project files.
 * Guarantees that any imported file strictly matches the version 1 specification.
 */
import { z } from 'zod';
import type { ProjectFile } from '../types/scene';

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const SceneObjectSchema = z.object({
  id: z.string(),
  type: z.enum(['stroke', 'line', 'rect', 'circle', 'box', 'sphere', 'cylinder', 'cone']),
  name: z.string(),
  points: z.array(Vec3Schema).optional(),
  size: Vec3Schema.optional(),
  radius: z.number().optional(),
  height: z.number().optional(),
  color: z.string(),
  thickness: z.number(),
  opacity: z.number(),
  wireframe: z.boolean(),
  position: Vec3Schema,
  rotation: Vec3Schema,
  scale: Vec3Schema,
  visible: z.boolean(),
  locked: z.boolean(),
});

export const ProjectFileSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1),
  objects: z.record(z.string(), SceneObjectSchema),
  order: z.array(z.string()),
});

/**
 * Validates a parsed JSON object against the ProjectFileSchema.
 * Returns { success: true, data: ProjectFile } or { success: false, error: string }.
 */
export function validateProjectFile(
  json: unknown,
): { success: true; data: ProjectFile } | { success: false; error: string } {
  const result = ProjectFileSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
      .join('; ');
    return {
      success: false,
      error: `Invalid sketch project file: ${issues}`,
    };
  }
  return { success: true, data: result.data as ProjectFile };
}
