/**
 * CANONICAL STYLE SPECIFICATION
 *
 * This is the single source of truth for the Neon Arcade visual style.
 * Every rendering decision flows from these constants. Changing a value
 * here changes the look of EVERY asset across EVERY game.
 *
 * The style is derived from analysis of the reference image (GraphicsSample.png):
 * - Dark/black canvas with no visible noise
 * - Bright neon outlines with multi-layer glow
 * - Crystalline/sharp geometric edges on environment
 * - Smooth organic curves on characters
 * - Rich interior shading (not flat fills)
 * - Particle effects with trails
 * - High contrast: almost nothing in the mid-brightness range
 *
 * DESIGN PRINCIPLE: The pipeline is the artist.
 * Same pipeline + same parameters = visually identical treatment.
 * The input shape varies; the style application is deterministic.
 */

// ── Resolution & Scale ───────────────────────────────────────────────

/** The canonical art resolution. All sprites are authored/processed at this density. */
export const SPEC = {
  // ── CANVAS ──
  /** Background is always pure black */
  BACKGROUND: [0, 0, 0, 255] as const,
  /** Subtle background tint (very dark purple/blue) applied as overlay */
  BACKGROUND_TINT: [8, 2, 12, 255] as const,

  // ── RESOLUTION ──
  /** Target sprite sizes (characters). Width/height in pixels at 1x. */
  SPRITE_SMALL: 64,
  SPRITE_MEDIUM: 128,
  SPRITE_LARGE: 256,
  /** Display scale factor (art pixels to screen pixels) */
  DISPLAY_SCALE: 2,
  /** Always use nearest-neighbor for pixel art layers */
  PIXEL_SCALING: 'nearest' as const,
  /** Glow layers use bilinear (smooth) scaling */
  GLOW_SCALING: 'bilinear' as const,

  // ── OUTLINE ──
  /** Outer contour line weight in art pixels */
  OUTLINE_WEIGHT: 1.5,
  /** Outline is always the full-brightness neon core color */
  OUTLINE_BRIGHTNESS: 1.0,
  /** Inner structure lines are dimmer */
  INNER_LINE_WEIGHT: 0.75,
  INNER_LINE_BRIGHTNESS: 0.45,
  /** Detail lines (textures, patterns) are very subtle */
  DETAIL_LINE_WEIGHT: 0.5,
  DETAIL_LINE_BRIGHTNESS: 0.2,

  // ── EDGE DETECTION ──
  /** Sobel magnitude threshold for "this is an edge" (0-255) */
  EDGE_THRESHOLD: 30,
  /** How wide the edge influence zone extends inward (pixels) */
  EDGE_INFLUENCE_RADIUS: 4,
  /** Edge detection sensitivity for alpha boundaries */
  ALPHA_EDGE_THRESHOLD: 20,

  // ── COLOR ZONES ──
  /**
   * Interior shading is divided into zones based on distance from edge.
   * Each zone has a brightness range from the neon gradient.
   *
   * Zone 0: Outer edge (outline) — full neon core brightness
   * Zone 1: Inner rim — bright, creates the "inner glow" look
   * Zone 2: Mid interior — moderate, shows form
   * Zone 3: Deep interior — dark, preserves contrast
   * Zone 4: Core shadow — nearly black with faint hue
   */
  ZONE_COUNT: 5,
  ZONE_BOUNDARIES: [0, 1, 3, 8, 999] as const, // distance thresholds in pixels
  ZONE_BRIGHTNESS: [1.0, 0.65, 0.4, 0.22, 0.08] as const,

  // ── NEON GRADIENT ──
  /** The neon gradient maps a 0-1 brightness to a color.
   * These are the stops (position, lightness multiplier):
   * 0.00 → deep black with faint hue tint
   * 0.15 → very dark dim
   * 0.35 → dim color (shadow regions)
   * 0.60 → mid color (where accent blend happens)
   * 0.85 → full neon core
   * 1.00 → white-hot (core + 80 per channel)
   */
  GRADIENT_STOPS: [0, 0.15, 0.35, 0.6, 0.85, 1.0] as const,
  /** How much of the original image's hue variation to preserve (0-1) */
  HUE_VARIATION_AMOUNT: 0.12,
  /** Brightness range where hue variation is applied */
  HUE_VARIATION_RANGE: [0.2, 0.7] as const,

  // ── BLOOM / GLOW ──
  /**
   * Three-layer bloom system. Each layer has radius and intensity.
   * Layer 1 (inner): Tight bright halo around bright pixels
   * Layer 2 (mid): Medium color spread, screen-blended
   * Layer 3 (outer): Wide atmospheric haze, very subtle
   */
  BLOOM_INNER_RADIUS: 2,
  BLOOM_INNER_INTENSITY: 0.65,
  BLOOM_MID_RADIUS: 8,
  BLOOM_MID_INTENSITY: 0.30,
  BLOOM_OUTER_RADIUS: 22,
  BLOOM_OUTER_INTENSITY: 0.10,
  /** Number of blur passes per layer (more = smoother, slower) */
  BLOOM_QUALITY: 2,
  /** Brightness threshold for bloom source extraction (0-255) */
  BLOOM_THRESHOLD: 40,

  // ── POST-PROCESSING ──
  /** Full-canvas bloom radius (applied after compositing) */
  CANVAS_BLOOM_RADIUS: 16,
  CANVAS_BLOOM_INTENSITY: 0.06,
  /** Secondary tighter canvas bloom */
  CANVAS_BLOOM2_RADIUS: 5,
  CANVAS_BLOOM2_INTENSITY: 0.08,
  /** Scanline effect opacity (0 = off) */
  SCANLINE_OPACITY: 0.0,
  /** Vignette darkness at edges (0 = off) */
  VIGNETTE_STRENGTH: 0.15,

  // ── PARTICLES ──
  /** Default particle size range [min, max] in art pixels */
  PARTICLE_SIZE: [0.5, 3] as const,
  /** Particle glow radius multiplier (particle_size * this) */
  PARTICLE_GLOW_MULT: 3,
  /** Trail length in frames */
  PARTICLE_TRAIL: 6,
  /** Particle fade curve */
  PARTICLE_FADE: 'ease-out' as const,

  // ── TERRAIN / ENVIRONMENT ──
  /** Environment edges are crystalline (sharp, angular) */
  TERRAIN_EDGE_STYLE: 'crystalline' as const,
  /** Average segment length for terrain generation */
  TERRAIN_SEGMENT_LENGTH: 10,
  /** Inner highlight lines on terrain surfaces */
  TERRAIN_INNER_LINES: true,
  /** Terrain fill opacity (gradient from edge inward) */
  TERRAIN_FILL_OPACITY: [0.10, 0.01] as const,
} as const;

/** Type-safe access to the spec */
export type StyleSpec = typeof SPEC;

/**
 * Validate that a rendered output conforms to the style spec.
 * Returns a list of violations (empty = passes).
 */
export function validateStyleCompliance(
  rendered: { width: number; height: number; data: Uint8ClampedArray },
): string[] {
  const violations: string[] = [];
  const w = rendered.width, h = rendered.height;

  // Check 1: Background should be dark
  // Sample corners (should be near-black)
  const corners = [[0,0], [w-1,0], [0,h-1], [w-1,h-1]];
  for (const [x, y] of corners) {
    const i = (y * w + x) * 4;
    const bright = rendered.data[i] + rendered.data[i+1] + rendered.data[i+2];
    if (bright > 60 && rendered.data[i+3] > 200) {
      violations.push(`Corner (${x},${y}) too bright: ${bright}. Background should be near-black.`);
    }
  }

  // Check 2: High contrast — should have both very dark and very bright pixels
  let darkCount = 0, brightCount = 0, totalVisible = 0;
  for (let i = 0; i < rendered.data.length; i += 4) {
    if (rendered.data[i+3] < 10) continue;
    totalVisible++;
    const lum = rendered.data[i] * 0.299 + rendered.data[i+1] * 0.587 + rendered.data[i+2] * 0.114;
    if (lum < 30) darkCount++;
    if (lum > 180) brightCount++;
  }
  if (totalVisible > 100) {
    const darkRatio = darkCount / totalVisible;
    const brightRatio = brightCount / totalVisible;
    if (darkRatio < 0.3) {
      violations.push(`Insufficient dark pixels: ${(darkRatio*100).toFixed(1)}%. Style requires >30% dark for contrast.`);
    }
    if (brightRatio < 0.02) {
      violations.push(`Insufficient bright pixels: ${(brightRatio*100).toFixed(1)}%. Style requires >2% bright for neon effect.`);
    }
  }

  // Check 3: No mid-range dominance (the style is high-contrast, not flat)
  let midCount = 0;
  for (let i = 0; i < rendered.data.length; i += 4) {
    if (rendered.data[i+3] < 10) continue;
    const lum = rendered.data[i] * 0.299 + rendered.data[i+1] * 0.587 + rendered.data[i+2] * 0.114;
    if (lum > 80 && lum < 160) midCount++;
  }
  if (totalVisible > 100) {
    const midRatio = midCount / totalVisible;
    if (midRatio > 0.4) {
      violations.push(`Too many mid-brightness pixels: ${(midRatio*100).toFixed(1)}%. Style should be high-contrast (dark + bright, not flat mid).`);
    }
  }

  return violations;
}
