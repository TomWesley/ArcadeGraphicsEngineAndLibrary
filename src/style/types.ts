/**
 * Core type definitions for the Arcade Graphics Engine style system.
 * All types are platform-agnostic — no browser/canvas dependencies.
 */

/** RGBA color as [r, g, b, a] with values 0-255 (a: 0-1) */
export type RGBA = [number, number, number, number];

/** HSL color as [h, s, l] with h: 0-360, s/l: 0-100 */
export type HSL = [number, number, number];

/** A named color with its glow variant */
export interface NeonColor {
  name: string;
  /** The core bright color */
  core: RGBA;
  /** The outer glow color (usually same hue, lower opacity) */
  glow: RGBA;
  /** The dim/shadow variant */
  dim: RGBA;
}

/** A complete color palette for a game */
export interface ColorPalette {
  name: string;
  /** Primary accent color — main character outlines, key UI elements */
  primary: NeonColor;
  /** Secondary accent — environment, secondary UI */
  secondary: NeonColor;
  /** Tertiary — particles, effects, highlights */
  tertiary: NeonColor;
  /** Warning/danger color — damage, low health, hazards */
  danger: NeonColor;
  /** Background tint (applied over pure black) */
  backgroundTint: RGBA;
  /** The base black background */
  background: RGBA;
}

/** Glow effect configuration */
export interface GlowConfig {
  /** Number of glow passes (more = smoother, more expensive) */
  passes: number;
  /** Base blur radius in pixels for innermost glow */
  innerRadius: number;
  /** Outer glow radius in pixels */
  outerRadius: number;
  /** Glow intensity multiplier (0-1) */
  intensity: number;
  /** Whether to use additive blending */
  additive: boolean;
}

/** Pixel art rendering rules */
export interface PixelConfig {
  /** Base pixel scale — how many screen pixels per art pixel */
  pixelScale: number;
  /** Whether to use nearest-neighbor scaling (crisp pixels) */
  crispScaling: boolean;
  /** Outline thickness in art pixels */
  outlineThickness: number;
  /** Whether outlines should glow */
  glowOutlines: boolean;
  /** Sub-pixel anti-aliasing for glow effects only */
  subPixelGlow: boolean;
}

/** Particle effect style */
export interface ParticleStyle {
  /** Particle shape */
  shape: 'pixel' | 'circle' | 'diamond' | 'line' | 'spark';
  /** Base size in art pixels */
  size: number;
  /** Size variance (0-1) */
  sizeVariance: number;
  /** Whether particles glow */
  glow: boolean;
  /** Trail length (0 = no trail) */
  trailLength: number;
  /** Fade curve: 'linear' | 'ease-out' | 'ease-in' */
  fadeCurve: 'linear' | 'ease-out' | 'ease-in';
}

/** Edge rendering style for terrain/objects */
export interface EdgeStyle {
  /** Edge type */
  type: 'crystalline' | 'smooth' | 'jagged' | 'organic';
  /** Sharpness of edges (0-1, 1 = razor sharp) */
  sharpness: number;
  /** Whether edges have a bright inner line */
  innerHighlight: boolean;
  /** Whether edges have glow */
  edgeGlow: boolean;
  /** Edge detail level (segments per unit) */
  detailLevel: number;
}

/** Animation timing constants */
export interface AnimationConfig {
  /** Glow pulse speed (cycles per second) */
  glowPulseSpeed: number;
  /** Glow pulse amplitude (0-1) */
  glowPulseAmplitude: number;
  /** Particle spawn rate multiplier */
  particleRate: number;
  /** Default sprite animation FPS */
  spriteAnimFps: number;
}

/** Complete style theme combining all aspects */
export interface ArcadeTheme {
  name: string;
  palette: ColorPalette;
  glow: GlowConfig;
  pixel: PixelConfig;
  particles: ParticleStyle;
  edges: EdgeStyle;
  animation: AnimationConfig;
}

/** Sprite definition */
export interface SpriteDefinition {
  name: string;
  /** Width in art pixels */
  width: number;
  /** Height in art pixels */
  height: number;
  /** Pixel data as flat array of palette indices or RGBA values */
  pixels: number[];
  /** Whether pixel data is palette-indexed or raw RGBA */
  indexed: boolean;
  /** Animation frames (if animated) */
  frames?: number;
  /** Frame duration in ms */
  frameDuration?: number;
}

/** Render target abstraction — implemented per platform */
export interface RenderTarget {
  width: number;
  height: number;
  getPixel(x: number, y: number): RGBA;
  setPixel(x: number, y: number, color: RGBA): void;
  clear(color?: RGBA): void;
  toImageData?(): unknown;
}
