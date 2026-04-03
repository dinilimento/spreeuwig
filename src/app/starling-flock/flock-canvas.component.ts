import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';

import { Boid, BoidsConfig, Disturbance, createBoids, stepBoids } from './boids';

export const DEFAULT_CONFIG: BoidsConfig = {
  count: 3000,
  maxSpeed: 1.8,
  minSpeed: 0.6,
  maxForce: 0.06,
  neighborRadius: 70,
  separationRadius: 22,
  hardSeparationRadius: 16,
  alignmentWeight: 1.0,
  cohesionWeight: 1.5,
  separationWeight: 3.0,
  wrap: false,
  floorFraction: 0,
  borderPadding: 70,
  edgeJitterStrength: 2.0,
  centerPullStrength: 0.05,
  collisionResolveInterval: 3,
  denseNeighborSoftCap: 26,
  forwardPerceptionBias: 0.45,
  maxTurnRate: 0.23,
  disturbanceStrength: 1.0,
  disturbanceFrequency: 1.7,
};

@Component({
  selector: 'app-flock-canvas',
  standalone: true,
  template: `<canvas #canvas class="canvas"></canvas>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background:
          radial-gradient(1200px 460px at 50% 104%, rgba(255, 180, 116, 0.24) 0%, rgba(248, 146, 116, 0.11) 34%, rgba(45, 43, 88, 0.06) 58%, rgba(18, 26, 58, 0) 76%),
          linear-gradient(180deg, #5f8fff 0%, #4b73de 30%, #3a58bb 52%, #5d4f9d 76%, #8a5c88 100%);
      }

      .canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
    `,
  ],
})
export class FlockCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() set config(value: Partial<BoidsConfig> | null) {
    this.currentConfig = { ...DEFAULT_CONFIG, ...(value ?? {}) };

    const desiredCount = this.currentConfig.count;
    // Adjust flock size smoothly while preserving as many existing boids as possible.
    if (this.boids.length === 0 || this.width === 0 || this.height === 0) {
      this.boids = createBoids(this.width || 1, this.height || 1, this.currentConfig);
    } else if (this.boids.length !== desiredCount) {
      if (this.boids.length < desiredCount) {
        const extra = createBoids(this.width, this.height, {
          ...this.currentConfig,
          count: desiredCount - this.boids.length,
        });
        this.boids = [...this.boids, ...extra];
      } else if (this.boids.length > desiredCount) {
        this.boids.length = desiredCount;
      }
    }
  }

  private rafId: number | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private width = 1;
  private height = 1;
  private dpr = 1;

  private boids: Boid[] = [];
  private lastTimeMs = 0;
  private frameIndex = 0;
  private disturbance: Disturbance | null = null;
  private disturbanceEndsAtMs = 0;
  private nextDisturbanceAtMs = 0;

  private resizeObserver?: ResizeObserver;

  private currentConfig: BoidsConfig = { ...DEFAULT_CONFIG };

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d', { alpha: true });
    if (!this.ctx) return;

    this.resizeObserver = new ResizeObserver(() => this.resetSize());
    this.resizeObserver.observe(this.canvasRef.nativeElement);

    // Initial size + boids.
    this.resetSize();
    this.lastTimeMs = performance.now();
    this.nextDisturbanceAtMs = this.lastTimeMs + this.randomRange(2500, 5200);
    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  ngOnDestroy(): void {
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
  }

  private resetSize(): void {
    const prevWidth = this.width;
    const prevHeight = this.height;
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));

    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(this.width * this.dpr));
    canvas.height = Math.max(1, Math.floor(this.height * this.dpr));

    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Only re-seed on first paint or very large size jumps.
    const firstPaint = this.boids.length === 0;
    const majorResize =
      Math.abs(this.width - prevWidth) > 180 || Math.abs(this.height - prevHeight) > 180;
    if (firstPaint || majorResize) {
      this.boids = createBoids(this.width, this.height, this.currentConfig);
      return;
    }

    // Preserve continuity for minor layout shifts (e.g. language/UI text changes).
    const maxY = this.height * (1 - (this.currentConfig.floorFraction ?? 0));
    for (const b of this.boids) {
      b.pos.x = Math.max(0, Math.min(this.width, b.pos.x));
      b.pos.y = Math.max(0, Math.min(maxY, b.pos.y));
    }
  }

  private tick(nowMs: number): void {
    if (!this.ctx) return;

    const dtSec = (nowMs - this.lastTimeMs) / 1000;
    // Convert to ~60fps steps to keep the steering parameters stable.
    const dtScale = Math.min(3, Math.max(0.2, dtSec * 60));
    this.lastTimeMs = nowMs;
    this.updateDisturbance(nowMs);

    // Update physics.
    this.frameIndex++;
    const baseInterval = Math.max(1, Math.floor(this.currentConfig.collisionResolveInterval ?? 3));
    const boidCount = this.boids.length;
    const extraInterval =
      boidCount > 4200 ? 3 : boidCount > 3200 ? 2 : boidCount > 2000 ? 1 : 0;
    const interval = Math.min(8, baseInterval + extraInterval);
    const shouldResolveCollisions = this.frameIndex % interval === 0;
    stepBoids(
      this.boids,
      this.width,
      this.height,
      dtScale,
      this.currentConfig,
      shouldResolveCollisions,
      this.disturbance,
    );

    // Render.
    this.draw(this.ctx);

    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  private updateDisturbance(nowMs: number): void {
    const frequency = Math.max(0, this.currentConfig.disturbanceFrequency ?? 1.2);
    const strengthScale = Math.max(0, this.currentConfig.disturbanceStrength ?? 1.2);

    if (frequency <= 0 || strengthScale <= 0) {
      this.disturbance = null;
      this.nextDisturbanceAtMs = nowMs + 10_000;
      return;
    }

    if (this.disturbance && nowMs >= this.disturbanceEndsAtMs) {
      this.disturbance = null;
      this.nextDisturbanceAtMs = nowMs + this.randomRange(2800, 6200) / frequency;
      return;
    }

    if (!this.disturbance && nowMs >= this.nextDisturbanceAtMs) {
      const floorY = this.height * (1 - (this.currentConfig.floorFraction ?? 0.1));
      const pad = Math.max(0, this.currentConfig.borderPadding ?? 24);
      this.disturbance = {
        x: this.randomRange(this.width * 0.18 + pad, this.width * 0.82 - pad),
        y: this.randomRange(floorY * 0.1 + pad, floorY * 0.88 - pad),
        radius: this.randomRange(70, 180) * (0.9 + 0.25 * strengthScale),
        strength: this.randomRange(1.8, 3.4) * strengthScale,
      };
      this.disturbanceEndsAtMs = nowMs + this.randomRange(600, 1400);
    }
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private draw(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.width, this.height);

    const n = this.boids.length;
    if (n > 3400) {
      this.drawAsPoints(ctx);
      return;
    }

    if (n > 1800) {
      this.drawAsStrokes(ctx);
      return;
    }

    // Detailed mode for smaller flocks: subtle glow + fill triangles.
    const glowColor = 'rgba(0, 0, 0, 0.35)';
    const birdColor = 'rgba(0, 0, 0, 0.96)';
    for (const b of this.boids) this.drawBird(ctx, b, glowColor, 1.7);
    for (const b of this.boids) this.drawBird(ctx, b, birdColor, 1);
  }

  private drawAsStrokes(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    for (const b of this.boids) {
      const speed = Math.hypot(b.vel.x, b.vel.y);
      const inv = speed > 1e-6 ? 1 / speed : 0;
      const hx = b.vel.x * inv;
      const hy = b.vel.y * inv;
      const len = 2.4 + speed * 0.35;
      ctx.moveTo(b.pos.x - hx * len * 0.8, b.pos.y - hy * len * 0.8);
      ctx.lineTo(b.pos.x + hx * len, b.pos.y + hy * len);
    }
    ctx.stroke();

  }

  private drawAsPoints(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.94)';
    for (const b of this.boids) {
      ctx.fillRect(b.pos.x, b.pos.y, 1.5, 1.5);
    }
  }

  private drawBird(ctx: CanvasRenderingContext2D, boid: Boid, color: string, scale: number): void {
    const speed = Math.hypot(boid.vel.x, boid.vel.y);
    const angle = Math.atan2(boid.vel.y, boid.vel.x);

    const body = (2.4 + speed * 0.35) * scale;
    const wing = body * 0.6;
    const tail = body * 0.7;

    ctx.save();
    ctx.translate(boid.pos.x, boid.pos.y);
    ctx.rotate(angle);

    ctx.fillStyle = color;
    ctx.beginPath();
    // Nose / direction: pointing along +X axis in local space after rotation.
    ctx.moveTo(body, 0);
    ctx.lineTo(-tail, wing);
    ctx.lineTo(-tail, -wing);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

