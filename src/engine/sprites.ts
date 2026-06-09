import type { RGBA, ArcadeTheme, NeonColor } from '../style/types';
import { withAlpha, rgbaToHsl, hslToRgba, lerpColor } from '../style/colors';
import { SPEC } from '../style/spec';
import {
  PixelBuffer, createPixelBuffer, getPixel, setPixel,
  multiLayerBloom, generateGlow,
  BloomConfig,
} from './renderer';
import { analyzeImage, ImageAnalysis } from './analysis';

/**
 * Sprite processor — the core style conversion engine.
 *
 * DESIGN: The pipeline is the artist.
 * Every pixel goes through the exact same decision tree.
 * Same zone = same treatment. No randomness.
 *
 * Pipeline:
 * 1. analyzeImage() → structural understanding
 * 2. neonifySprite() → deterministic color mapping using SPEC
 * 3. multiLayerBloom() → consistent glow treatment
 */

/** Override options for fine-tuning (all optional, defaults from SPEC) */
export interface NeonifyOptions {
  neonColor: NeonColor;
  accentColor?: NeonColor;
  backgroundThreshold: number;
  glowEdges: boolean;
  preserveHueVariation: boolean;
  detailPreservation: number;
  outlineBrightness: number;
  interiorBrightness: number;
  edgeGlowRadius: number;
  innerRim: boolean;
  shadingZones: number;
  /** Precomputed analysis (avoids redundant computation) */
  analysis?: ImageAnalysis;
  fillStrength?: number;
}

const DEFAULT_NEONIFY: NeonifyOptions = {
  neonColor: {
    name: 'default',
    core: [255, 0, 255, 1],
    glow: [255, 0, 255, 0.6],
    dim: [80, 0, 80, 1],
  },
  backgroundThreshold: SPEC.EDGE_THRESHOLD,
  glowEdges: true,
  preserveHueVariation: true,
  detailPreservation: 0.6,
  outlineBrightness: SPEC.OUTLINE_BRIGHTNESS,
  interiorBrightness: SPEC.ZONE_BRIGHTNESS[3],
  edgeGlowRadius: SPEC.EDGE_INFLUENCE_RADIUS,
  innerRim: true,
  shadingZones: SPEC.ZONE_COUNT,
};

/**
 * Map a 0-1 value to a neon color using the canonical gradient from SPEC.
 *
 * 0.00 → deep black with faint hue tint
 * 0.15 → very dark dim
 * 0.35 → dim color (shadow regions)
 * 0.60 → mid color (accent blend zone)
 * 0.85 → full neon core
 * 1.00 → white-hot
 */
export function neonGradient(t: number, neon: NeonColor, accent?: NeonColor): RGBA {
  const stops = SPEC.GRADIENT_STOPS;

  if (t < stops[1]) {
    // Deep shadow — nearly black with a hint of hue
    const s = t / stops[1];
    return lerpColor([2, 2, 5, 1], neon.dim, s * 0.3);
  } else if (t < stops[2]) {
    // Shadow to dim
    const s = (t - stops[1]) / (stops[2] - stops[1]);
    const dimDarker: RGBA = [
      Math.round(neon.dim[0] * 0.4),
      Math.round(neon.dim[1] * 0.4),
      Math.round(neon.dim[2] * 0.4),
      1,
    ];
    return lerpColor(dimDarker, neon.dim, s);
  } else if (t < stops[3]) {
    // Dim to mid-tone (accent blend zone)
    const s = (t - stops[2]) / (stops[3] - stops[2]);
    const mid = accent
      ? lerpColor(neon.dim, accent.dim, 0.3)
      : neon.dim;
    return lerpColor(neon.dim, mid, s);
  } else if (t < stops[4]) {
    // Mid to core — the main neon brightness
    const s = (t - stops[3]) / (stops[4] - stops[3]);
    return lerpColor(neon.dim, neon.core, s);
  } else {
    // Core to white-hot
    const s = (t - stops[4]) / (stops[5] - stops[4]);
    const hot: RGBA = [
      Math.min(255, neon.core[0] + 80),
      Math.min(255, neon.core[1] + 80),
      Math.min(255, neon.core[2] + 80),
      1,
    ];
    return lerpColor(neon.core, hot, s);
  }
}

/**
 * Core neonification — deterministic color mapping driven by SPEC.
 *
 * Every pixel's color is determined by:
 * 1. Its zone (from analysis.zoneMap)
 * 2. Its luminance (from analysis.luminance)
 * 3. Its edge strength (from analysis.edgeStrength)
 * 4. The neon gradient function
 *
 * No randomness. Same input + same SPEC = identical output.
 */
export function neonifySprite(
  src: PixelBuffer,
  options?: Partial<NeonifyOptions>,
): PixelBuffer {
  const opts = { ...DEFAULT_NEONIFY, ...options };
  const w = src.width, h = src.height;
  const dst = createPixelBuffer(w, h);
  const neon = opts.neonColor;

  // Use precomputed analysis or compute it now
  const analysis = opts.analysis ?? analyzeImage(src);

  const zoneBrightness = SPEC.ZONE_BRIGHTNESS;
  const hueVarAmount = SPEC.HUE_VARIATION_AMOUNT;
  const hueVarRange = SPEC.HUE_VARIATION_RANGE;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;

      // Skip background
      if (!analysis.foregroundMask[idx]) continue;

      const original = getPixel(src, x, y);
      const zone = analysis.zoneMap[idx];
      const pixelLum = analysis.luminance[idx];
      const edgeStr = analysis.edgeStrength[idx];
      const localContrast = analysis.localContrast[idx];

      // Start with zone brightness
      let t: number = zoneBrightness[Math.min(zone, zoneBrightness.length - 1)];

      // Modulate by original luminance (preserves form/shading)
      t = t * (0.5 + pixelLum * opts.detailPreservation);

      // Boost edges based on Sobel strength
      if (edgeStr > 0.15) {
        t = Math.min(1, t + edgeStr * opts.outlineBrightness * 0.5);
      }

      // Boost by local contrast (preserves fine detail)
      t = Math.min(1, t + localContrast * 0.15);

      // Clamp
      t = Math.max(0, Math.min(1, t));

      // Get color from canonical gradient
      let color = neonGradient(t, neon, opts.accentColor);

      // Subtle hue variation from source (only in mid-range)
      if (opts.preserveHueVariation && t > hueVarRange[0] && t < hueVarRange[1]) {
        const origHsl = rgbaToHsl(original);
        const neonHsl = rgbaToHsl(color);
        const blendedH = neonHsl[0] + (origHsl[0] - neonHsl[0]) * hueVarAmount;
        const inf = hslToRgba(
          (blendedH + 360) % 360,
          neonHsl[1],
          neonHsl[2],
          color[3],
        );
        color = lerpColor(color, inf, 0.15);
      }

      setPixel(dst, x, y, [color[0], color[1], color[2], original[3]]);
    }
  }

  return dst;
}

/**
 * Full pipeline: analyze → neonify → bloom.
 * This is the main API for consistent style conversion.
 */
export function createNeonSprite(
  src: PixelBuffer,
  theme: ArcadeTheme,
  colorRole: 'primary' | 'secondary' | 'tertiary' | 'danger' = 'primary',
  options?: Partial<NeonifyOptions>,
): PixelBuffer {
  const neonColor = theme.palette[colorRole];
  const accentRoles = {
    primary: 'secondary',
    secondary: 'tertiary',
    tertiary: 'primary',
    danger: 'tertiary',
  } as const;
  const accentColor = theme.palette[accentRoles[colorRole]];

  // Step 1: Analyze
  const analysis = analyzeImage(src);

  // Step 2: Neonify
  const neonified = neonifySprite(src, {
    neonColor,
    accentColor,
    analysis,
    ...options,
  });

  // Step 3: Bloom (using SPEC constants)
  const bloom: BloomConfig = {
    innerRadius: SPEC.BLOOM_INNER_RADIUS,
    innerIntensity: SPEC.BLOOM_INNER_INTENSITY,
    midRadius: SPEC.BLOOM_MID_RADIUS,
    midIntensity: SPEC.BLOOM_MID_INTENSITY,
    outerRadius: SPEC.BLOOM_OUTER_RADIUS,
    outerIntensity: SPEC.BLOOM_OUTER_INTENSITY,
    quality: SPEC.BLOOM_QUALITY,
  };

  return multiLayerBloom(neonified, bloom);
}

/**
 * Build a sprite from a pixel art grid definition.
 */
export function spriteFromGrid(
  grid: string[],
  neonColor: NeonColor,
): PixelBuffer {
  const height = grid.length;
  const width = grid[0].length / 2;
  const buf = createPixelBuffer(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const hex = grid[y].substring(x * 2, x * 2 + 2);
      if (hex === '00' || hex === '..' || hex === '  ') continue;
      const val = parseInt(hex, 16);
      const t = val / 255;
      const color = neonGradient(t, neonColor);
      setPixel(buf, x, y, color);
    }
  }

  return buf;
}

/**
 * Recolor an existing neon sprite to a different neon color.
 */
export function recolorSprite(src: PixelBuffer, fromColor: NeonColor, toColor: NeonColor): PixelBuffer {
  const dst = createPixelBuffer(src.width, src.height);
  const fromHsl = rgbaToHsl(fromColor.core);

  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const pixel = getPixel(src, x, y);
      if (pixel[3] < 0.01) continue;
      const pixelHsl = rgbaToHsl(pixel);
      const toHsl = rgbaToHsl(toColor.core);
      const hueDiff = toHsl[0] - fromHsl[0];
      const newHue = (pixelHsl[0] + hueDiff + 360) % 360;
      const recolored = hslToRgba(newHue, pixelHsl[1], pixelHsl[2], pixel[3]);
      setPixel(dst, x, y, recolored);
    }
  }

  return dst;
}
