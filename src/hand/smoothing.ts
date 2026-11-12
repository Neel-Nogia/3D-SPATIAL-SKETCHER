/**
 * One Euro Filter for 2D/3D signal smoothing.
 * Filters out jitter at low speeds while eliminating lag at high speeds.
 */
class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  filter(value: number, alpha: number): number {
    if (this.y === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.s = alpha * value + (1 - alpha) * (this.s ?? value);
    this.y = this.s;
    return this.y;
  }

  hasLastRawValue(): boolean {
    return this.y !== null;
  }

  lastRawValue(): number {
    return this.y ?? 0;
  }

  reset(): void {
    this.y = null;
    this.s = null;
  }
}

function alpha(rate: number, cutoff: number): number {
  const tau = 1.0 / (2 * Math.PI * cutoff);
  const te = 1.0 / rate;
  return 1.0 / (1.0 + tau / te);
}

export class OneEuroFilter3D {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  private xFilt = new LowPassFilter();
  private yFilt = new LowPassFilter();
  private zFilt = new LowPassFilter();

  private dxFilt = new LowPassFilter();
  private dyFilt = new LowPassFilter();
  private dzFilt = new LowPassFilter();

  private lastTime: number | null = null;

  constructor(minCutoff: number = 1.0, beta: number = 0.05, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  filter(x: number, y: number, z: number, timestampMs: number = Date.now()): [number, number, number] {
    if (this.lastTime === null) {
      this.lastTime = timestampMs;
      return [this.xFilt.filter(x, 1), this.yFilt.filter(y, 1), this.zFilt.filter(z, 1)];
    }

    const dt = Math.max(1e-3, (timestampMs - this.lastTime) / 1000);
    this.lastTime = timestampMs;
    const rate = 1.0 / dt;

    // Filter derivative to compute speed
    const dx = (x - this.xFilt.lastRawValue()) * rate;
    const dy = (y - this.yFilt.lastRawValue()) * rate;
    const dz = (z - this.zFilt.lastRawValue()) * rate;

    const edx = this.dxFilt.filter(dx, alpha(rate, this.dCutoff));
    const edy = this.dyFilt.filter(dy, alpha(rate, this.dCutoff));
    const edz = this.dzFilt.filter(dz, alpha(rate, this.dCutoff));

    const speed = Math.sqrt(edx * edx + edy * edy + edz * edz);
    const cutoff = this.minCutoff + this.beta * speed;
    const a = alpha(rate, cutoff);

    return [this.xFilt.filter(x, a), this.yFilt.filter(y, a), this.zFilt.filter(z, a)];
  }

  setSmoothness(smoothness: number): void {
    // Maps smoothness (0-100) to minCutoff (e.g. 10.0 to 0.1)
    const factor = Math.max(0, Math.min(100, smoothness)) / 100;
    this.minCutoff = 10.0 * (1 - factor) + 0.1 * factor;
  }

  reset(): void {
    this.xFilt.reset();
    this.yFilt.reset();
    this.zFilt.reset();
    this.dxFilt.reset();
    this.dyFilt.reset();
    this.dzFilt.reset();
    this.lastTime = null;
  }
}
