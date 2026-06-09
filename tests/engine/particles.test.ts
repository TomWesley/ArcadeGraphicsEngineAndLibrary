import { describe, it, expect } from 'vitest';
import {
  ParticleSystem, createFireEmitter, createIceEmitter, createAmbientEmitter,
} from '../../src/engine/particles';
import type { EmitterConfig } from '../../src/engine/particles';
import type { RGBA } from '../../src/style/types';

function makeEmitter(overrides?: Partial<EmitterConfig>): EmitterConfig {
  return {
    x: 100, y: 100,
    rate: 60,
    spread: Math.PI * 2,
    angle: 0,
    speed: 100,
    speedVariance: 0.5,
    lifetime: 1,
    lifetimeVariance: 0.3,
    gravity: 0,
    colorStart: [255, 128, 0, 1] as RGBA,
    colorEnd: [255, 0, 0, 0] as RGBA,
    maxParticles: 200,
    ...overrides,
  };
}

describe('ParticleSystem', () => {
  describe('construction', () => {
    it('starts with empty particles', () => {
      const sys = new ParticleSystem(makeEmitter());
      expect(sys.particles).toHaveLength(0);
    });
  });

  describe('update()', () => {
    it('spawns particles over time', () => {
      const sys = new ParticleSystem(makeEmitter({ rate: 60 }));
      sys.update(1 / 60); // One frame at 60fps
      expect(sys.particles.length).toBeGreaterThan(0);
    });

    it('particles move based on velocity', () => {
      const sys = new ParticleSystem(makeEmitter({ rate: 100, speed: 200, spread: 0, angle: 0 }));
      sys.update(0.1);
      // At least one particle should have moved from origin
      const p = sys.particles[0];
      const dist = Math.sqrt((p.x - 100) ** 2 + (p.y - 100) ** 2);
      expect(dist).toBeGreaterThan(0);
    });

    it('particles die over time', () => {
      const sys = new ParticleSystem(makeEmitter({ rate: 100, lifetime: 0.1, lifetimeVariance: 0 }));
      sys.update(0.05); // Spawn some
      const initialCount = sys.particles.length;
      expect(initialCount).toBeGreaterThan(0);

      // Update enough for them to die
      sys.update(0.2);
      expect(sys.particles.length).toBeLessThan(initialCount);
    });

    it('respects maxParticles limit', () => {
      const sys = new ParticleSystem(makeEmitter({ rate: 10000, maxParticles: 50, lifetime: 10 }));
      sys.update(1);
      expect(sys.particles.length).toBeLessThanOrEqual(50);
    });

    it('applies gravity', () => {
      const sys = new ParticleSystem(makeEmitter({
        rate: 10, speed: 0, gravity: 100, spread: 0,
      }));
      sys.update(0.1);
      sys.update(0.1);
      // Particles should have moved downward
      for (const p of sys.particles) {
        expect(p.vy).toBeGreaterThan(0);
      }
    });

    it('particles fade based on life', () => {
      const sys = new ParticleSystem(makeEmitter({ rate: 10, lifetime: 0.5, lifetimeVariance: 0 }));
      sys.update(0.1);
      sys.update(0.3); // particles should be mostly faded
      for (const p of sys.particles) {
        expect(p.color[3]).toBeLessThan(1);
      }
    });
  });

  describe('burst()', () => {
    it('emits specified number of particles', () => {
      const sys = new ParticleSystem(makeEmitter());
      sys.burst(20);
      expect(sys.particles).toHaveLength(20);
    });

    it('respects maxParticles on burst', () => {
      const sys = new ParticleSystem(makeEmitter({ maxParticles: 10 }));
      sys.burst(50);
      expect(sys.particles.length).toBeLessThanOrEqual(10);
    });
  });

  describe('trail tracking', () => {
    it('records trail positions', () => {
      const sys = new ParticleSystem(
        makeEmitter({ rate: 1, speed: 100 }),
        { shape: 'spark', size: 2, sizeVariance: 0, glow: true, trailLength: 5, fadeCurve: 'linear' },
      );
      sys.burst(1);
      for (let i = 0; i < 5; i++) sys.update(0.1);
      const p = sys.particles[0];
      if (p) {
        expect(p.trail.length).toBeGreaterThan(0);
        expect(p.trail.length).toBeLessThanOrEqual(5);
      }
    });
  });
});

describe('Preset Emitters', () => {
  const testColor: RGBA = [255, 128, 0, 1];

  describe('createFireEmitter()', () => {
    it('creates an upward-facing emitter', () => {
      const emitter = createFireEmitter(100, 200, testColor);
      expect(emitter.angle).toBeCloseTo(-Math.PI / 2);
      expect(emitter.gravity).toBeLessThan(0); // Sparks float up
    });
  });

  describe('createIceEmitter()', () => {
    it('creates a downward-facing emitter', () => {
      const emitter = createIceEmitter(100, 0, testColor);
      expect(emitter.angle).toBeCloseTo(Math.PI / 2);
      expect(emitter.gravity).toBeGreaterThan(0);
    });
  });

  describe('createAmbientEmitter()', () => {
    it('creates an omnidirectional, slow emitter', () => {
      const emitter = createAmbientEmitter(100, 100, testColor);
      expect(emitter.spread).toBeCloseTo(Math.PI * 2);
      expect(emitter.speed).toBeLessThan(50);
      expect(emitter.lifetime).toBeGreaterThan(2);
    });
  });
});
