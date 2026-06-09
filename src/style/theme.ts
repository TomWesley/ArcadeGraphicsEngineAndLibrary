import type { ArcadeTheme, GlowConfig, PixelConfig, ParticleStyle, EdgeStyle, AnimationConfig, ColorPalette } from './types';
import { PALETTE_NEON_INFERNO } from './colors';

// ── Default Style Constants ──────────────────────────────────────────
// These are calibrated to match the reference image's aesthetic.

export const DEFAULT_GLOW: GlowConfig = {
  passes: 3,
  innerRadius: 2,
  outerRadius: 12,
  intensity: 0.7,
  additive: true,
};

export const DEFAULT_PIXEL: PixelConfig = {
  pixelScale: 3,
  crispScaling: true,
  outlineThickness: 1,
  glowOutlines: true,
  subPixelGlow: true,
};

export const DEFAULT_PARTICLES: ParticleStyle = {
  shape: 'spark',
  size: 2,
  sizeVariance: 0.5,
  glow: true,
  trailLength: 6,
  fadeCurve: 'ease-out',
};

export const DEFAULT_EDGES: EdgeStyle = {
  type: 'crystalline',
  sharpness: 0.85,
  innerHighlight: true,
  edgeGlow: true,
  detailLevel: 8,
};

export const DEFAULT_ANIMATION: AnimationConfig = {
  glowPulseSpeed: 1.5,
  glowPulseAmplitude: 0.15,
  particleRate: 1.0,
  spriteAnimFps: 12,
};

// ── Theme Factory ────────────────────────────────────────────────────

export function createTheme(
  name: string,
  palette: ColorPalette,
  overrides?: Partial<{
    glow: Partial<GlowConfig>;
    pixel: Partial<PixelConfig>;
    particles: Partial<ParticleStyle>;
    edges: Partial<EdgeStyle>;
    animation: Partial<AnimationConfig>;
  }>,
): ArcadeTheme {
  return {
    name,
    palette,
    glow: { ...DEFAULT_GLOW, ...overrides?.glow },
    pixel: { ...DEFAULT_PIXEL, ...overrides?.pixel },
    particles: { ...DEFAULT_PARTICLES, ...overrides?.particles },
    edges: { ...DEFAULT_EDGES, ...overrides?.edges },
    animation: { ...DEFAULT_ANIMATION, ...overrides?.animation },
  };
}

/** The canonical default theme matching the reference art */
export const DEFAULT_THEME: ArcadeTheme = createTheme('Neon Arcade', PALETTE_NEON_INFERNO);

/** Lightweight theme for mobile / lower-end devices */
export const LITE_THEME: ArcadeTheme = createTheme('Neon Arcade Lite', PALETTE_NEON_INFERNO, {
  glow: { passes: 1, outerRadius: 6, intensity: 0.5 },
  pixel: { pixelScale: 2, subPixelGlow: false },
  particles: { trailLength: 3 },
});
