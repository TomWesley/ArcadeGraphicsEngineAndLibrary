import { describe, it, expect } from 'vitest';
import {
  createTheme, DEFAULT_THEME, LITE_THEME,
  DEFAULT_GLOW, DEFAULT_PIXEL, DEFAULT_PARTICLES,
  DEFAULT_EDGES, DEFAULT_ANIMATION,
} from '../../src/style/theme';
import { PALETTE_NEON_INFERNO, PALETTE_ELECTRIC_OCEAN } from '../../src/style/colors';
import type { ArcadeTheme } from '../../src/style/types';

describe('Theme System', () => {
  describe('DEFAULT_THEME', () => {
    it('uses Neon Inferno palette', () => {
      expect(DEFAULT_THEME.palette.name).toBe('Neon Inferno');
    });
    it('has all required sections', () => {
      expect(DEFAULT_THEME.glow).toBeDefined();
      expect(DEFAULT_THEME.pixel).toBeDefined();
      expect(DEFAULT_THEME.particles).toBeDefined();
      expect(DEFAULT_THEME.edges).toBeDefined();
      expect(DEFAULT_THEME.animation).toBeDefined();
    });
  });

  describe('LITE_THEME', () => {
    it('has reduced glow settings', () => {
      expect(LITE_THEME.glow.passes).toBeLessThan(DEFAULT_THEME.glow.passes);
      expect(LITE_THEME.glow.outerRadius).toBeLessThan(DEFAULT_THEME.glow.outerRadius);
    });
    it('has reduced pixel scale', () => {
      expect(LITE_THEME.pixel.pixelScale).toBeLessThan(DEFAULT_THEME.pixel.pixelScale);
    });
    it('has shorter particle trails', () => {
      expect(LITE_THEME.particles.trailLength).toBeLessThan(DEFAULT_THEME.particles.trailLength);
    });
  });

  describe('Default Constants', () => {
    it('glow has reasonable values', () => {
      expect(DEFAULT_GLOW.passes).toBeGreaterThanOrEqual(1);
      expect(DEFAULT_GLOW.passes).toBeLessThanOrEqual(10);
      expect(DEFAULT_GLOW.intensity).toBeGreaterThan(0);
      expect(DEFAULT_GLOW.intensity).toBeLessThanOrEqual(1);
      expect(DEFAULT_GLOW.innerRadius).toBeLessThan(DEFAULT_GLOW.outerRadius);
    });

    it('pixel config enforces crisp scaling', () => {
      expect(DEFAULT_PIXEL.crispScaling).toBe(true);
      expect(DEFAULT_PIXEL.pixelScale).toBeGreaterThanOrEqual(1);
    });

    it('edges default to crystalline (matching reference)', () => {
      expect(DEFAULT_EDGES.type).toBe('crystalline');
      expect(DEFAULT_EDGES.sharpness).toBeGreaterThan(0.5);
    });

    it('particles default to spark with glow', () => {
      expect(DEFAULT_PARTICLES.shape).toBe('spark');
      expect(DEFAULT_PARTICLES.glow).toBe(true);
    });

    it('animation has positive values', () => {
      expect(DEFAULT_ANIMATION.glowPulseSpeed).toBeGreaterThan(0);
      expect(DEFAULT_ANIMATION.spriteAnimFps).toBeGreaterThan(0);
    });
  });

  describe('createTheme()', () => {
    it('creates a theme with defaults when no overrides', () => {
      const theme = createTheme('Test', PALETTE_ELECTRIC_OCEAN);
      expect(theme.name).toBe('Test');
      expect(theme.palette).toBe(PALETTE_ELECTRIC_OCEAN);
      expect(theme.glow).toEqual(DEFAULT_GLOW);
      expect(theme.pixel).toEqual(DEFAULT_PIXEL);
    });

    it('applies partial overrides', () => {
      const theme = createTheme('Custom', PALETTE_NEON_INFERNO, {
        glow: { passes: 5, intensity: 0.9 },
        pixel: { pixelScale: 4 },
      });
      // Overridden values
      expect(theme.glow.passes).toBe(5);
      expect(theme.glow.intensity).toBe(0.9);
      expect(theme.pixel.pixelScale).toBe(4);
      // Non-overridden values should be defaults
      expect(theme.glow.innerRadius).toBe(DEFAULT_GLOW.innerRadius);
      expect(theme.glow.outerRadius).toBe(DEFAULT_GLOW.outerRadius);
      expect(theme.pixel.crispScaling).toBe(DEFAULT_PIXEL.crispScaling);
    });

    it('does not mutate the defaults', () => {
      const before = { ...DEFAULT_GLOW };
      createTheme('Test', PALETTE_NEON_INFERNO, { glow: { passes: 99 } });
      expect(DEFAULT_GLOW).toEqual(before);
    });
  });
});
