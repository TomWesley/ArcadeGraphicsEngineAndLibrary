import type { RGBA, ArcadeTheme, NeonColor } from '../style/types';
import { withAlpha, rgbaToHsl, hslToRgba, lerpColor } from '../style/colors';
import {
  PixelBuffer, createPixelBuffer, getPixel, setPixel, setPixelBlend,
  setPixelAdditive, gaussianBlur, multiLayerBloom, sobelEdges,
  distanceField, compositeAdditive, compositeScreen, generateGlow,
  BloomConfig, DEFAULT_BLOOM,
} from './renderer';

/**
 * Sprite processor — transforms raw pixel art into the neon arcade style.
 * This is the core "style engine" that takes any sprite and makes it look
 * like it belongs in our games.
 *
 * The pipeline:
 * 1. Analyze source image luminance and structure
 * 2. Detect edges (Sobel) for outer neon outlines
 * 3. Compute distance field for smooth inner falloff
 * 4. Map luminance to neon color gradient (dim -> mid -> core -> bright)
 * 5. Apply multi-zone coloring (outline, near-edge, interior, highlights)
 * 6. Generate multi-layer bloom (inner core, mid bloom, outer atmosphere)
 * 7. Post-process: color grade, atmospheric effects
 */

/** Full neonification options */
export interface NeonifyOptions {
  neonColor: NeonColor;
  /** Secondary color for gradients/accents within the sprite */
  accentColor?: NeonColor;
  /** Threshold (0-255) below which pixels are treated as background */
  backgroundThreshold: number;
  /** Whether to detect and glow edges */
  glowEdges: boolean;
  /** Whether to preserve some of the original color variation */
  preserveHueVariation: boolean;
  /** How much original detail/shading to preserve (0-1) */
  detailPreservation: number;
  /** Outline brightness boost (0-2) */
  outlineBrightness: number;
  /** Interior fill darkness (0=very dark, 1=fully lit) */
  interiorBrightness: number;
  /** Edge glow radius in pixels */
  edgeGlowRadius: number;
  /** Whether to add inner rim highlights */
  innerRim: boolean;
  /** Number of distinct shading zones */
  shadingZones: number;
}

const DEFAULT_NEONIFY: NeonifyOptions = {
  neonColor: {
    name: 'default',
    core: [255, 0, 255, 1],
    glow: [255, 0, 255, 0.6],
    dim: [80, 0, 80, 1],
  },
  backgroundThreshold: 30,
  glowEdges: true,
  preserveHueVariation: true,
  detailPreservation: 0.6,
  outlineBrightness: 1.0,
  interiorBrightness: 0.35,
  edgeGlowRadius: 3,
  innerRim: true,
  shadingZones: 5,
};

function isBackground(color: RGBA, threshold: number): boolean {
  return color[3] < 0.1 || (color[0] + color[1] + color[2]) / 3 < threshold;
}

function brightness(c: RGBA): number {
  return c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
}

/** Create a luminance map from source */
function luminanceMap(src: PixelBuffer): Float64Array {
  const lum = new Float64Array(src.width * src.height);
  for (let i = 0; i < lum.length; i++) {
    const si = i * 4;
    const a = src.data[si + 3] / 255;
    lum[i] = (src.data[si] * 0.299 + src.data[si + 1] * 0.587 + src.data[si + 2] * 0.114) * a / 255;
  }
  return lum;
}

/** Create an alpha mask buffer from source */
function alphaMask(src: PixelBuffer, threshold: number): PixelBuffer {
  const mask = createPixelBuffer(src.width, src.height);
  for (let i = 0; i < src.data.length; i += 4) {
    const a = src.data[i + 3];
    const bright = src.data[i] + src.data[i + 1] + src.data[i + 2];
    if (a > 10 && bright > threshold * 3) {
      mask.data[i] = 255;
      mask.data[i + 1] = 255;
      mask.data[i + 2] = 255;
      mask.data[i + 3] = 255;
    }
  }
  return mask;
}

/**
 * Map a 0-1 value to a neon color using a multi-stop gradient.
 * 0.0 = deep dim, 0.3 = dim, 0.6 = core, 0.85 = bright core, 1.0 = white-hot
 */
function neonGradient(t: number, neon: NeonColor, accent?: NeonColor): RGBA {
  // 5-stop gradient for rich shading
  if (t < 0.15) {
    // Deep shadow — nearly black with a hint of hue
    const s = t / 0.15;
    return lerpColor([2, 2, 5, 1], neon.dim, s * 0.3);
  } else if (t < 0.35) {
    // Shadow to dim
    const s = (t - 0.15) / 0.2;
    const dimDarker: RGBA = [
      Math.round(neon.dim[0] * 0.4),
      Math.round(neon.dim[1] * 0.4),
      Math.round(neon.dim[2] * 0.4),
      1,
    ];
    return lerpColor(dimDarker, neon.dim, s);
  } else if (t < 0.6) {
    // Dim to mid-tone (where accent color can blend in)
    const s = (t - 0.35) / 0.25;
    const mid = accent
      ? lerpColor(neon.dim, accent.dim, 0.3)
      : neon.dim;
    return lerpColor(neon.dim, mid, s);
  } else if (t < 0.85) {
    // Mid to core — the main neon brightness
    const s = (t - 0.6) / 0.25;
    return lerpColor(neon.dim, neon.core, s);
  } else {
    // Core to hot — bright highlights
    const s = (t - 0.85) / 0.15;
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
 * Core neonification pipeline — takes any image and transforms it into
 * the neon arcade style. This is the primary style conversion function.
 */
export function neonifySprite(
  src: PixelBuffer,
  options?: Partial<NeonifyOptions>,
): PixelBuffer {
  const opts = { ...DEFAULT_NEONIFY, ...options };
  const w = src.width, h = src.height;
  const dst = createPixelBuffer(w, h);
  const neon = opts.neonColor;

  // 1. Compute luminance map
  const lum = luminanceMap(src);

  // 2. Detect edges with Sobel
  const edges = sobelEdges(src);

  // 3. Compute distance from transparent/background pixels
  const mask = alphaMask(src, opts.backgroundThreshold);
  const dist = distanceField(mask, Math.max(w, h));

  // Find max distance for normalization
  let maxDist = 0;
  for (let i = 0; i < dist.length; i++) {
    if (dist[i] < 1000) maxDist = Math.max(maxDist, dist[i]);
  }
  maxDist = Math.max(1, maxDist);

  // 4. Per-pixel neon mapping
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const original = getPixel(src, x, y);
      if (isBackground(original, opts.backgroundThreshold)) continue;

      const idx = y * w + x;
      const pixelLum = lum[idx];
      const edgeStrength = edges.data[idx * 4] / 255;
      const distFromEdge = dist[idx];
      const normalizedDist = Math.min(1, distFromEdge / maxDist);

      // Compute the neon color for this pixel
      // Base brightness from original luminance, boosted by edge proximity
      let t = pixelLum * opts.detailPreservation;

      // Boost edges
      if (edgeStrength > 0.15) {
        t = Math.min(1, t + edgeStrength * opts.outlineBrightness);
      }

      // Interior gets darker, edges get brighter
      if (distFromEdge <= 1) {
        // Outer edge — full neon brightness
        t = Math.max(t, 0.75 + edgeStrength * 0.25);
      } else if (distFromEdge <= opts.edgeGlowRadius) {
        // Near-edge zone — inner rim effect
        const rimFade = 1 - (distFromEdge - 1) / opts.edgeGlowRadius;
        if (opts.innerRim) {
          t = Math.max(t, 0.4 + rimFade * 0.35);
        }
      } else {
        // Deep interior — darker, more subdued
        t *= opts.interiorBrightness;
      }

      // Clamp
      t = Math.max(0, Math.min(1, t));

      // Get color from gradient
      let color = neonGradient(t, neon, opts.accentColor);

      // Preserve original hue variation if desired
      if (opts.preserveHueVariation && t > 0.2 && t < 0.7) {
        const origHsl = rgbaToHsl(original);
        const neonHsl = rgbaToHsl(color);
        // Subtle blend of original hue into the neon
        const hueBlend = 0.15; // 15% original hue influence
        const blendedH = neonHsl[0] + (origHsl[0] - neonHsl[0]) * hueBlend;
        const origInfluence = hslToRgba(
          (blendedH + 360) % 360,
          neonHsl[1],
          neonHsl[2],
          color[3],
        );
        color = lerpColor(color, origInfluence, 0.2);
      }

      setPixel(dst, x, y, [color[0], color[1], color[2], original[3]]);
    }
  }

  return dst;
}

/**
 * Apply the full neon treatment: neonify + multi-layer bloom.
 * This is the main API for converting any source into our style.
 */
export function createNeonSprite(
  src: PixelBuffer,
  theme: ArcadeTheme,
  colorRole: 'primary' | 'secondary' | 'tertiary' | 'danger' = 'primary',
  options?: Partial<NeonifyOptions>,
): PixelBuffer {
  const neonColor = theme.palette[colorRole];

  // Pick a complementary accent color
  const accentRoles = {
    primary: 'secondary',
    secondary: 'tertiary',
    tertiary: 'primary',
    danger: 'tertiary',
  } as const;
  const accentColor = theme.palette[accentRoles[colorRole]];

  const neonified = neonifySprite(src, {
    neonColor,
    accentColor,
    ...options,
  });

  // Apply bloom
  const bloom: BloomConfig = {
    innerRadius: theme.glow.innerRadius,
    innerIntensity: theme.glow.intensity * 0.7,
    midRadius: (theme.glow.innerRadius + theme.glow.outerRadius) / 2,
    midIntensity: theme.glow.intensity * 0.35,
    outerRadius: theme.glow.outerRadius,
    outerIntensity: theme.glow.intensity * 0.12,
    quality: theme.glow.passes,
  };

  return multiLayerBloom(neonified, bloom);
}

/**
 * Build a sprite from a pixel art grid definition.
 * Each string in the array is one row, each character pair is a hex brightness.
 * '00' or '..' = transparent, otherwise mapped through neon gradient.
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
