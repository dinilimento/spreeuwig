export type Vec2 = { x: number; y: number };

export type Boid = {
  pos: Vec2;
  vel: Vec2;
};

export type BoidsConfig = {
  count: number;
  maxSpeed: number; // px per frame (scaled by dt)
  minSpeed: number; // px per frame
  maxForce: number; // steering limit (px per frame^2 scaled by dt)
  neighborRadius: number;
  separationRadius: number;
  hardSeparationRadius?: number;
  alignmentWeight: number;
  cohesionWeight: number;
  separationWeight: number;
  wrap: boolean;
  floorFraction?: number; // 0–1: fraction of height reserved as no‑fly band at bottom
  edgeJitterStrength?: number; // 0–1 scale for directional randomness on outer birds
  centerPullStrength?: number; // negative => push away from center, positive => pull to center
  collisionResolveInterval?: number; // run hard collision pass every N simulation frames
  denseNeighborSoftCap?: number; // beyond this local neighbor count, cohesion is reduced
  forwardPerceptionBias?: number; // 0..1: de-emphasize neighbors behind current heading
  maxTurnRate?: number; // radians per 60fps-step
  borderPadding?: number; // px inner border to keep flock away from edges
  disturbanceStrength?: number; // multiplier for disturbance event force
  disturbanceFrequency?: number; // event frequency multiplier (0 disables disturbances)
  background?: string;
};

export type Disturbance = {
  x: number;
  y: number;
  radius: number;
  strength: number;
};

function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function mul(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len < 1e-9) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function limitMagnitude(v: Vec2, max: number): Vec2 {
  const len = length(v);
  if (len <= max) return v;
  if (len < 1e-9) return { x: 0, y: 0 };
  const s = max / len;
  return mul(v, s);
}

function wrapCoordinate(value: number, max: number): number {
  // Proper modulo for negative values.
  const m = value % max;
  return m < 0 ? m + max : m;
}

function buildSpatialGrid(boids: Boid[], width: number, height: number, cellSize: number): {
  cols: number;
  rows: number;
  cells: Map<number, number[]>;
} {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const size = Math.max(1, cellSize);
  const cols = Math.max(1, Math.ceil(w / size));
  const rows = Math.max(1, Math.ceil(h / size));
  const cells = new Map<number, number[]>();

  for (let i = 0; i < boids.length; i++) {
    const b = boids[i];
    const cx = Math.max(0, Math.min(cols - 1, Math.floor(b.pos.x / size)));
    const cy = Math.max(0, Math.min(rows - 1, Math.floor(b.pos.y / size)));
    const key = cy * cols + cx;
    let list = cells.get(key);
    if (!list) {
      list = [];
      cells.set(key, list);
    }
    list.push(i);
  }

  return { cols, rows, cells };
}

function resolveHardCollisions(
  boids: Boid[],
  width: number,
  height: number,
  separationRadius: number,
  hardRadius: number,
  wrap: boolean,
): void {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const halfW = w / 2;
  const halfH = h / 2;
  const minDist = hardRadius > 0 ? hardRadius * 0.7 : separationRadius * 0.7;
  const minDist2 = minDist * minDist;

  if (!wrap) {
    const { cols, rows, cells } = buildSpatialGrid(boids, w, h, minDist);

    for (let i = 0; i < boids.length; i++) {
      const a = boids[i];
      const cx = Math.max(0, Math.min(cols - 1, Math.floor(a.pos.x / minDist)));
      const cy = Math.max(0, Math.min(rows - 1, Math.floor(a.pos.y / minDist)));

      for (let oy = -1; oy <= 1; oy++) {
        const ny = cy + oy;
        if (ny < 0 || ny >= rows) continue;
        for (let ox = -1; ox <= 1; ox++) {
          const nx = cx + ox;
          if (nx < 0 || nx >= cols) continue;
          const bucket = cells.get(ny * cols + nx);
          if (!bucket) continue;

          for (const j of bucket) {
            if (j <= i) continue;
            const b = boids[j];

            const dx = b.pos.x - a.pos.x;
            const dy = b.pos.y - a.pos.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 >= minDist2 || dist2 === 0) continue;

            const dist = Math.sqrt(dist2);
            const overlap = minDist - dist;
            const nxDir = dx / dist;
            const nyDir = dy / dist;
            const shiftX = (nxDir * overlap) / 2;
            const shiftY = (nyDir * overlap) / 2;

            a.pos.x -= shiftX;
            a.pos.y -= shiftY;
            b.pos.x += shiftX;
            b.pos.y += shiftY;

            const margin = separationRadius * 1.5;
            const minX = -margin;
            const maxX = w + margin;
            const minY = -margin;
            const maxY = h + margin;
            a.pos.x = Math.max(minX, Math.min(maxX, a.pos.x));
            a.pos.y = Math.max(minY, Math.min(maxY, a.pos.y));
            b.pos.x = Math.max(minX, Math.min(maxX, b.pos.x));
            b.pos.y = Math.max(minY, Math.min(maxY, b.pos.y));
          }
        }
      }
    }

    return;
  }

  for (let i = 0; i < boids.length; i++) {
    for (let j = i + 1; j < boids.length; j++) {
      const a = boids[i];
      const b = boids[j];

      let dx = b.pos.x - a.pos.x;
      let dy = b.pos.y - a.pos.y;

      if (wrap) {
        if (dx > halfW) dx -= w;
        else if (dx < -halfW) dx += w;
        if (dy > halfH) dy -= h;
        else if (dy < -halfH) dy += h;
      }

      const dist2 = dx * dx + dy * dy;
      if (dist2 >= minDist2 || dist2 === 0) continue;

      const dist = Math.sqrt(dist2);
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      const shiftX = (nx * overlap) / 2;
      const shiftY = (ny * overlap) / 2;

      a.pos.x -= shiftX;
      a.pos.y -= shiftY;
      b.pos.x += shiftX;
      b.pos.y += shiftY;

      if (wrap) {
        a.pos.x = wrapCoordinate(a.pos.x, w);
        a.pos.y = wrapCoordinate(a.pos.y, h);
        b.pos.x = wrapCoordinate(b.pos.x, w);
        b.pos.y = wrapCoordinate(b.pos.y, h);
      } else {
        const margin = separationRadius * 1.5;
        const minX = -margin;
        const maxX = w + margin;
        const minY = -margin;
        const maxY = h + margin;

        a.pos.x = Math.max(minX, Math.min(maxX, a.pos.x));
        a.pos.y = Math.max(minY, Math.min(maxY, a.pos.y));
        b.pos.x = Math.max(minX, Math.min(maxX, b.pos.x));
        b.pos.y = Math.max(minY, Math.min(maxY, b.pos.y));
      }
    }
  }
}

export function createBoids(
  width: number,
  height: number,
  cfg: BoidsConfig,
  rng: () => number = Math.random,
): Boid[] {
  const boids: Boid[] = [];
  for (let i = 0; i < cfg.count; i++) {
    const angle = rng() * Math.PI * 2;
    const speed = cfg.minSpeed + rng() * (cfg.maxSpeed - cfg.minSpeed);
    boids.push({
      pos: { x: rng() * width, y: rng() * height },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    });
  }
  return boids;
}

export function stepBoids(
  boids: Boid[],
  width: number,
  height: number,
  dtScale: number,
  cfg: BoidsConfig,
  shouldResolveCollisions: boolean = true,
  disturbance?: Disturbance | null,
): void {
  const w = Math.max(1, width);
  const h = Math.max(1, height);

  const nR2 = cfg.neighborRadius * cfg.neighborRadius;
  const sR2 = cfg.separationRadius * cfg.separationRadius;
  const halfW = w / 2;
  const halfH = h / 2;
  const eps = 1e-6;
  const floorFrac = cfg.floorFraction ?? 0;
  const floorY = h * (1 - floorFrac);
  const maxPad = Math.max(0, Math.min(w, floorY) * 0.28);
  const borderPadding = Math.max(0, Math.min(maxPad, cfg.borderPadding ?? 24));
  const visibleLeftBound = borderPadding;
  const visibleRightBound = w - borderPadding;
  const visibleTopBound = borderPadding;
  const bottomBound = floorY - borderPadding;
  const offscreenSide = Math.max(80, cfg.neighborRadius * 2.4);
  const offscreenTop = Math.max(120, cfg.neighborRadius * 3.0);
  const leftBound = visibleLeftBound - offscreenSide;
  const rightBound = visibleRightBound + offscreenSide;
  const topBound = visibleTopBound - offscreenTop;
  const jitterStrength = cfg.edgeJitterStrength ?? 0.22;
  const centerPullStrength = Math.max(-0.45, Math.min(0.55, cfg.centerPullStrength ?? 0.05));
  const denseNeighborSoftCap = Math.max(1, cfg.denseNeighborSoftCap ?? 26);
  const forwardPerceptionBias = Math.max(0, Math.min(1, cfg.forwardPerceptionBias ?? 0.45));
  const maxTurnRate = Math.max(0.01, cfg.maxTurnRate ?? 0.23);
  const gridCellSize = Math.max(cfg.neighborRadius, cfg.separationRadius, 1);
  const grid = cfg.wrap ? null : buildSpatialGrid(boids, w, floorY, gridCellSize);

  for (let i = 0; i < boids.length; i++) {
    const boid = boids[i];

    let alignmentSum: Vec2 = { x: 0, y: 0 };
    let cohesionVec: Vec2 = { x: 0, y: 0 }; // vector to centroid in torus coordinates
    let separation: Vec2 = { x: 0, y: 0 };
    let neighbors = 0;

    if (cfg.wrap || !grid) {
      for (let j = 0; j < boids.length; j++) {
        if (j === i) continue;
        const other = boids[j];

        let dx = other.pos.x - boid.pos.x;
        let dy = other.pos.y - boid.pos.y;

        if (cfg.wrap) {
          if (dx > halfW) dx -= w;
          else if (dx < -halfW) dx += w;
          if (dy > halfH) dy -= h;
          else if (dy < -halfH) dy += h;
        }

        const dist2 = dx * dx + dy * dy;
        if (dist2 >= nR2) continue;

        const dist = Math.sqrt(Math.max(dist2, eps));
        const dirX = dx / dist;
        const dirY = dy / dist;
        const velLen = Math.sqrt(boid.vel.x * boid.vel.x + boid.vel.y * boid.vel.y);
        const headingX = velLen > eps ? boid.vel.x / velLen : 1;
        const headingY = velLen > eps ? boid.vel.y / velLen : 0;
        const ahead = headingX * dirX + headingY * dirY; // [-1, 1]
        const perceptionWeight = 1 - forwardPerceptionBias * Math.max(0, -ahead);

        neighbors += perceptionWeight;
        alignmentSum = add(alignmentSum, mul(other.vel, perceptionWeight));
        cohesionVec = add(cohesionVec, { x: dx * perceptionWeight, y: dy * perceptionWeight });

        if (dist2 < sR2) {
          // Stronger separation when closer.
          const inv = 1 / (dist2 + eps);
          separation = add(separation, { x: -dx * inv, y: -dy * inv });
        }
      }
    } else {
      const cx = Math.max(0, Math.min(grid.cols - 1, Math.floor(boid.pos.x / gridCellSize)));
      const cy = Math.max(0, Math.min(grid.rows - 1, Math.floor(boid.pos.y / gridCellSize)));
      for (let oy = -1; oy <= 1; oy++) {
        const ny = cy + oy;
        if (ny < 0 || ny >= grid.rows) continue;
        for (let ox = -1; ox <= 1; ox++) {
          const nx = cx + ox;
          if (nx < 0 || nx >= grid.cols) continue;
          const bucket = grid.cells.get(ny * grid.cols + nx);
          if (!bucket) continue;

          for (const j of bucket) {
            if (j === i) continue;
            const other = boids[j];
            const dx = other.pos.x - boid.pos.x;
            const dy = other.pos.y - boid.pos.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 >= nR2) continue;

            const dist = Math.sqrt(Math.max(dist2, eps));
            const dirX = dx / dist;
            const dirY = dy / dist;
            const velLen = Math.sqrt(boid.vel.x * boid.vel.x + boid.vel.y * boid.vel.y);
            const headingX = velLen > eps ? boid.vel.x / velLen : 1;
            const headingY = velLen > eps ? boid.vel.y / velLen : 0;
            const ahead = headingX * dirX + headingY * dirY;
            const perceptionWeight = 1 - forwardPerceptionBias * Math.max(0, -ahead);

            neighbors += perceptionWeight;
            alignmentSum = add(alignmentSum, mul(other.vel, perceptionWeight));
            cohesionVec = add(cohesionVec, { x: dx * perceptionWeight, y: dy * perceptionWeight });

            if (dist2 < sR2) {
              const inv = 1 / (dist2 + eps);
              separation = add(separation, { x: -dx * inv, y: -dy * inv });
            }
          }
        }
      }
    }

    let accel: Vec2 = { x: 0, y: 0 };

    if (neighbors > 0) {
      // Alignment: match average velocity direction.
      const avgVel = mul(alignmentSum, 1 / neighbors);
      const desiredAlign = mul(normalize(avgVel), cfg.maxSpeed);
      const steerAlign = limitMagnitude(sub(desiredAlign, boid.vel), cfg.maxForce);
      accel = add(accel, mul(steerAlign, cfg.alignmentWeight));

      // Cohesion: steer towards centroid (relative vector).
      const centroidVec = mul(cohesionVec, 1 / neighbors);
      const centroidLen = length(centroidVec);
      if (centroidLen > 1e-3) {
        const desiredCohesion = mul(normalize(centroidVec), cfg.maxSpeed);
        const steerCohesion = limitMagnitude(sub(desiredCohesion, boid.vel), cfg.maxForce);
        // Reduce cohesion in high-density pockets to encourage occasional split/rejoin behavior.
        const denseFactor = Math.max(0.25, 1 - Math.max(0, neighbors - denseNeighborSoftCap) * 0.04);
        accel = add(accel, mul(steerCohesion, cfg.cohesionWeight * denseFactor));
      }

      // Separation: avoid too-close neighbors.
      const sepLimited = limitMagnitude(separation, cfg.maxForce);
      accel = add(accel, mul(sepLimited, cfg.separationWeight));

      // Directional jitter for leading / edge birds to create curvier paths.
      if (jitterStrength > 0) {
        // Birds with fewer neighbors and higher speed are considered "leaders" at the front/edge.
        const neighborFactor = Math.max(0, 1 - neighbors / 14); // stronger jitter when neighbors are sparse
        const speed = length(boid.vel);
        const speedFactor = Math.min(1, (speed - cfg.minSpeed) / (cfg.maxSpeed - cfg.minSpeed + eps));
        const wallProximityX = Math.min(boid.pos.x / w, (w - boid.pos.x) / w);
        const wallProximityY = Math.min(boid.pos.y / floorY, (floorY - boid.pos.y) / floorY);
        const edgeFactor = 1 - Math.min(wallProximityX, wallProximityY); // closer to any border ⇒ larger

        const combined =
          neighborFactor * 0.5 + speedFactor * 0.3 + edgeFactor * 0.2; // weighted mix in [0,1]

        if (combined > 0.15) {
          // Small random angular deflection.
          const rand = Math.random() * 2 - 1;
          const maxAngle = 0.38 * jitterStrength * combined; // radians
          const theta = rand * maxAngle;

          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);
          const vx = boid.vel.x * cosT - boid.vel.y * sinT;
          const vy = boid.vel.x * sinT + boid.vel.y * cosT;
          const newVel: Vec2 = { x: vx, y: vy };

          // Treat this as an extra steering impulse (so maxForce still constrains behaviour overall).
          const jitterSteer = limitMagnitude(sub(newVel, boid.vel), cfg.maxForce * 0.9);
          accel = add(accel, jitterSteer);
        }
      }
    }

    // Temporary external disturbance (e.g. predator-like event) causing local split,
    // after which boids naturally regroup.
    if (disturbance) {
      const dx = boid.pos.x - disturbance.x;
      const dy = boid.pos.y - disturbance.y;
      const d2 = dx * dx + dy * dy;
      const r2 = disturbance.radius * disturbance.radius;
      if (d2 < r2) {
        const d = Math.sqrt(Math.max(d2, eps));
        const proximity = 1 - d / disturbance.radius;
        const repulse = (disturbance.strength * proximity * cfg.maxForce) / d;
        accel.x += dx * repulse;
        accel.y += dy * repulse;
      }
    }

    // Wall avoidance: steer away from borders well before hitting them.
    if (!cfg.wrap) {
      const marginX = Math.max(120, cfg.neighborRadius * 1.7);
      const marginTop = Math.max(120, cfg.neighborRadius * 1.7);
      const marginBottom = Math.max(150, cfg.neighborRadius * 2.0);

      // Left wall
      if (boid.pos.x < leftBound + marginX) {
        const strength = (leftBound + marginX - boid.pos.x) / marginX;
        accel.x += cfg.maxForce * 3.6 * strength;
      }
      // Right wall
      if (boid.pos.x > rightBound - marginX) {
        const strength = (boid.pos.x - (rightBound - marginX)) / marginX;
        accel.x -= cfg.maxForce * 3.6 * strength;
      }
      // Top wall
      if (boid.pos.y < topBound + marginTop) {
        const strength = (topBound + marginTop - boid.pos.y) / marginTop;
        accel.y += cfg.maxForce * 3.9 * strength;
      }
      // Bottom "sky floor" above horizon
      if (boid.pos.y > bottomBound - marginBottom) {
        const strength = (boid.pos.y - (bottomBound - marginBottom)) / marginBottom;
        accel.y -= cfg.maxForce * 4.4 * strength;
      }

      // Attraction toward center of flyable area to keep flock off the boundaries.
      // Keep center target based on visible region so flock returns on-screen naturally.
      const centerX = (visibleLeftBound + visibleRightBound) * 0.5;
      const centerY = visibleTopBound + (bottomBound - visibleTopBound) * 0.4;
      const offsetX = boid.pos.x - centerX;
      const offsetY = boid.pos.y - centerY;
      const centerPullX = 0.0012 * centerPullStrength;
      const centerPullY = 0.001 * centerPullStrength;
      accel.x -= offsetX * centerPullX * cfg.maxSpeed;
      accel.y -= offsetY * centerPullY * cfg.maxSpeed;
    }

    const prevAngle = Math.atan2(boid.vel.y, boid.vel.x);

    // Integrate (frame-based).
    boid.vel = add(boid.vel, mul(accel, dtScale));

    // Limit turn rate for smoother, more natural arc-like motion.
    const nextAngle = Math.atan2(boid.vel.y, boid.vel.x);
    let delta = nextAngle - prevAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    else if (delta < -Math.PI) delta += Math.PI * 2;
    const maxDelta = maxTurnRate * dtScale;
    if (Math.abs(delta) > maxDelta) {
      const clamped = prevAngle + Math.sign(delta) * maxDelta;
      const speedNow = Math.hypot(boid.vel.x, boid.vel.y);
      boid.vel.x = Math.cos(clamped) * speedNow;
      boid.vel.y = Math.sin(clamped) * speedNow;
    }

    // Enforce speed limits.
    const sp = length(boid.vel);
    if (sp > cfg.maxSpeed) boid.vel = mul(normalize(boid.vel), cfg.maxSpeed);
    else if (sp < cfg.minSpeed) boid.vel = mul(normalize(boid.vel), cfg.minSpeed);

    boid.pos = add(boid.pos, mul(boid.vel, dtScale));

    if (cfg.wrap) {
      boid.pos.x = wrapCoordinate(boid.pos.x, w);
      boid.pos.y = wrapCoordinate(boid.pos.y, h * (1 - floorFrac));
    } else {
      // Allow birds to leave the visible frame slightly, but not drift away forever.
      const frameMarginX = cfg.neighborRadius * 1.8;
      const frameMarginTop = cfg.neighborRadius * 1.8;
      const frameMarginBottom = cfg.neighborRadius * 1.8;

      const minX = leftBound - frameMarginX;
      const maxX = rightBound + frameMarginX;
      const minY = topBound - frameMarginTop;
      const maxY = bottomBound + frameMarginBottom;

      if (boid.pos.x < minX) boid.pos.x = minX;
      else if (boid.pos.x > maxX) boid.pos.x = maxX;

      if (boid.pos.y < minY) boid.pos.y = minY;
      else if (boid.pos.y > maxY) boid.pos.y = maxY;
    }
  }

  if (shouldResolveCollisions) {
    resolveHardCollisions(
      boids,
      width,
      height,
      cfg.separationRadius,
      cfg.hardSeparationRadius ?? 0,
      cfg.wrap,
    );
  }
}

