import { describe, expect, it } from 'vitest';

import { type BoidsConfig, createBoids, stepBoids } from './boids';
import { DEFAULT_CONFIG, FlockCanvasComponent } from './flock-canvas.component';

function makeConfig(overrides: Partial<BoidsConfig> = {}): BoidsConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

describe('boids core', () => {
  it('creates the requested number of boids', () => {
    const cfg = makeConfig({ count: 123 });
    const boids = createBoids(800, 400, cfg);
    expect(boids).toHaveLength(123);
  });

  it('updates positions without throwing for a range of configs', () => {
    const cfg = makeConfig({ maxSpeed: 3.2, separationWeight: 1.6 });
    const boids = createBoids(800, 400, cfg);
    expect(() => stepBoids(boids, 800, 400, 1, cfg)).not.toThrow();
  });
});

describe('FlockCanvasComponent config input', () => {
  it('initialises and resizes the flock when config.count changes', () => {
    const cmp = new FlockCanvasComponent();

    // Pretend canvas has been laid out.
    (cmp as any).width = 800;
    (cmp as any).height = 400;

    cmp.config = { count: 50 };
    expect((cmp as any).boids.length).toBe(50);

    cmp.config = { count: 120 };
    expect((cmp as any).boids.length).toBe(120);
  });

  it('applies behavioural parameters from the incoming config', () => {
    const cmp = new FlockCanvasComponent();
    (cmp as any).width = 800;
    (cmp as any).height = 400;

    const custom = makeConfig({
      maxSpeed: 4,
      cohesionWeight: 0.3,
      separationWeight: 1.9,
      edgeJitterStrength: 0.8,
    });

    cmp.config = custom;

    const current = (cmp as any).currentConfig as BoidsConfig;
    expect(current.maxSpeed).toBeCloseTo(4);
    expect(current.cohesionWeight).toBeCloseTo(0.3);
    expect(current.separationWeight).toBeCloseTo(1.9);
    expect(current.edgeJitterStrength).toBeCloseTo(0.8);
  });
})
