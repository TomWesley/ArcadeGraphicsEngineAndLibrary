import type { RGBA, ArcadeTheme, ParticleStyle } from '../style/types';
import { lerpColor, withAlpha } from '../style/colors';

/** Individual particle state */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;      // 0-1, starts at 1
  maxLife: number;    // total lifetime in seconds
  color: RGBA;
  size: number;
  trail: [number, number][];
}

/** Particle emitter configuration */
export interface EmitterConfig {
  x: number;
  y: number;
  /** Particles per second */
  rate: number;
  /** Spread angle in radians (0 = directional, PI*2 = omnidirectional) */
  spread: number;
  /** Base emission angle in radians */
  angle: number;
  /** Base speed in pixels/sec */
  speed: number;
  /** Speed variance (0-1) */
  speedVariance: number;
  /** Particle lifetime in seconds */
  lifetime: number;
  /** Lifetime variance (0-1) */
  lifetimeVariance: number;
  /** Gravity (pixels/sec^2, positive = down) */
  gravity: number;
  /** Color at birth */
  colorStart: RGBA;
  /** Color at death */
  colorEnd: RGBA;
  /** Max particles in pool */
  maxParticles: number;
}

export class ParticleSystem {
  public particles: Particle[] = [];
  public style: ParticleStyle;
  private accumulator: number = 0;

  constructor(
    public emitter: EmitterConfig,
    style?: ParticleStyle,
  ) {
    this.style = style ?? {
      shape: 'spark',
      size: 2,
      sizeVariance: 0.5,
      glow: true,
      trailLength: 6,
      fadeCurve: 'ease-out',
    };
  }

  private spawn(): Particle {
    const e = this.emitter;
    const angle = e.angle + (Math.random() - 0.5) * e.spread;
    const speed = e.speed * (1 + (Math.random() - 0.5) * e.speedVariance * 2);
    const lifetime = e.lifetime * (1 + (Math.random() - 0.5) * e.lifetimeVariance * 2);
    const sizeVar = 1 + (Math.random() - 0.5) * this.style.sizeVariance * 2;

    return {
      x: e.x,
      y: e.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: lifetime,
      color: [...e.colorStart] as RGBA,
      size: this.style.size * sizeVar,
      trail: [],
    };
  }

  update(dt: number): void {
    const e = this.emitter;

    // Spawn new particles
    if (e.rate > 0) {
      this.accumulator += dt;
      const spawnInterval = 1 / e.rate;
      while (this.accumulator >= spawnInterval && this.particles.length < e.maxParticles) {
        this.particles.push(this.spawn());
        this.accumulator -= spawnInterval;
      }
      // Don't bank spawn debt while the pool is saturated — it would
      // release as a burst the moment particles die off.
      this.accumulator = Math.min(this.accumulator, spawnInterval);
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Store trail position
      if (this.style.trailLength > 0) {
        p.trail.push([p.x, p.y]);
        if (p.trail.length > this.style.trailLength) {
          p.trail.shift();
        }
      }

      // Physics
      p.vy += e.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Age
      p.life -= dt / p.maxLife;

      // Color interpolation
      const t = 1 - p.life;
      p.color = lerpColor(e.colorStart, e.colorEnd, t);

      // Apply fade curve
      let alpha: number;
      switch (this.style.fadeCurve) {
        case 'ease-out':
          alpha = p.life * p.life;
          break;
        case 'ease-in':
          alpha = 1 - (1 - p.life) * (1 - p.life);
          break;
        default:
          alpha = p.life;
      }
      p.color = withAlpha(p.color, alpha);

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /** Burst emit a fixed number of particles at once */
  burst(count: number): void {
    for (let i = 0; i < count && this.particles.length < this.emitter.maxParticles; i++) {
      this.particles.push(this.spawn());
    }
  }
}

/** Preset emitter for fire/lava sparks (like in the reference image) */
export function createFireEmitter(x: number, y: number, color: RGBA): EmitterConfig {
  return {
    x, y,
    rate: 30,
    spread: Math.PI * 0.4,
    angle: -Math.PI / 2,
    speed: 80,
    speedVariance: 0.6,
    lifetime: 1.2,
    lifetimeVariance: 0.4,
    gravity: -20,
    colorStart: color,
    colorEnd: withAlpha(color, 0),
    maxParticles: 100,
  };
}

/** Preset emitter for ice crystal shards */
export function createIceEmitter(x: number, y: number, color: RGBA): EmitterConfig {
  return {
    x, y,
    rate: 15,
    spread: Math.PI * 0.2,
    angle: Math.PI / 2,
    speed: 120,
    speedVariance: 0.3,
    lifetime: 0.8,
    lifetimeVariance: 0.3,
    gravity: 50,
    colorStart: color,
    colorEnd: withAlpha(color, 0),
    maxParticles: 60,
  };
}

/** Preset emitter for ambient floating particles */
export function createAmbientEmitter(x: number, y: number, color: RGBA): EmitterConfig {
  return {
    x, y,
    rate: 5,
    spread: Math.PI * 2,
    angle: 0,
    speed: 15,
    speedVariance: 0.8,
    lifetime: 3,
    lifetimeVariance: 0.5,
    gravity: -5,
    colorStart: withAlpha(color, 0.6),
    colorEnd: withAlpha(color, 0),
    maxParticles: 40,
  };
}
