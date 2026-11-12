/**
 * Tool Registry — maps tool IDs to their implementations.
 */
import type { Tool } from './tool';
import { SelectTool } from './selectTool';
import { MoveTool, RotateTool, ScaleTool } from './transformTool';
import { PenTool } from './penTool';
import { LineTool } from './lineTool';
import { RectTool } from './rectTool';
import { CircleTool } from './circleTool';
import { BoxTool } from './boxTool';
import { SphereTool } from './sphereTool';
import { CylinderTool } from './cylinderTool';
import { ConeTool } from './coneTool';
import { EraserTool } from './eraserTool';

class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.register(new SelectTool());
    this.register(new MoveTool());
    this.register(new RotateTool());
    this.register(new ScaleTool());
    this.register(new PenTool());
    this.register(new LineTool());
    this.register(new RectTool());
    this.register(new CircleTool());
    this.register(new BoxTool());
    this.register(new SphereTool());
    this.register(new CylinderTool());
    this.register(new ConeTool());
    this.register(new EraserTool());
  }

  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }

  get(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }
}

export const toolRegistry = new ToolRegistry();
