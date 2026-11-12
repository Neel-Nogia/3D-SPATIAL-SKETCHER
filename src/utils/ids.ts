/**
 * Generate unique IDs for scene objects using nanoid.
 */
import { nanoid } from 'nanoid';

/** Generate a short unique ID (10 chars) */
export const generateId = (): string => nanoid(10);
