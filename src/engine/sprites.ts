import type { RGBA, ArcadeTheme, NeonColor } from '../style/types';
import { withAlpha, rgbaToHsl, hslToRgba } from '../style/colors';
import {
  PixelBuffer, createPixelBuffer, getPixel, setPixel,
  setPixelAdditive, generateGlow, boxBlur,
} from './renderer';

/**
 * Sprite processor — transforms raw pixel art into the neon arcade style.
 * This is the core "style engine" that takes any sprite and makes it look
 * like it belongs in our games.
 */

/** Options for the neon-ify transformation */
export interface NeonifyOptions {
  /** The neon color to apply to bright areas */
  neonColor: NeonColor;
  /** Threshold (0-255) below which pixels are treated as background */
  backgroundThreshold: number;
  /** Whether to detect and glow edges */
  glowEdges: boolean;
  /** Whether to preserve some of the original color variation */
  preserveHueVariation: boolean;
  /** Strength of the inner fill (0 = just outlines, 1 = full neon fill) */
  fillStrength: number;
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
  fillStrength: 0.3,
};

/** Detect if a pixel is "empty" (near-black or transparent) */
function isBackground(color: RGBA, threshold: number): boolean {
  return color[3] < 0.1 || (color[0] + color[1] + color[2]) / 3 < threshold;
}

/** Detect edges using simple Sobel-like operator */
function detectEdges(src: PixelBuffer, threshold: number): PixelBuffer {
  const edges = createPixelBuffer(src.width, src.height);

  for (let y = 1; y < src.height - 1; y++) {
    for (let x = 1; x < src.width - 1; x++) {
      const c = getPixel(src, x, y);
      if (isBackground(c, threshold)) continue;

      // Check if any neighbor is background — if so, this is an edge pixel
      let isEdge = false;
      for (let dy = -1; dy <= 1 && !isEdge; dy++) {
        for (let dx = -1; dx <= 1 && !isEdge; dx++) {
          if (dx === 0 && dy === 0) continue;
          const n = getPixel(src, x + dx, y + dy);
          if (isBackground(n, threshold)) {
            isEdge = true;
          }
        }
      }

      if (isEdge) {
        setPixel(edges, x, y, [255, 255, 255, 1]);
      }
    }
  }

  return edges;
}

/** Get the brightness of a pixel (0-255) */
function brightness(c: RGBA): number {
  return c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
}

/**
 * Core style transformation: takes raw pixel art and transforms it
 * into the neon glow style matching our reference image.
 */
export function neonifySprite(
  src: PixelBuffer,
  options?: Partial<NeonifyOptions>,
): PixelBuffer {
  const opts = { ...DEFAULT_NEONIFY, ...options };
  const dst = createPixelBuffer(src.width, src.height);
  const edges = detectEdges(src, opts.backgroundThreshold);
  const neon = opts.neonColor;

  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const original = getPixel(src, x, y);
      const edge = getPixel(edges, x, y);
      const isEdgePixel = edge[0] > 128;
      const isBg = isBackground(original, opts.backgroundThreshold);

      if (isBg) {
        // Background stays black/transparent
        setPixel(dst, x, y, [0, 0, 0, original[3]]);
        continue;
      }

      const bright = brightness(original) / 255;

      if (isEdgePixel) {
        // Edges get the full neon core color
        const edgeColor: RGBA = [
          neon.core[0],
          neon.core[1],
          neon.core[2],
          original[3],
        ];
        setPixel(dst, x, y, edgeColor);
      } else {
        // Interior pixels: blend between dim and core based on brightness
        let r: number, g: number, b: number;

        if (opts.preserveHueVariation) {
          // Keep some of the original hue variation
          const origHsl = rgbaToHsl(original);
          const neonHsl = rgbaToHsl(neon.core);
          // Blend hues, keeping the neon hue dominant
          const h = neonHsl[0]; // Use neon hue
          const s = neonHsl[1] * 0.7 + origHsl[1] * 0.3;
          const l = bright * 40 * opts.fillStrength; // Map brightness to low lightness
          const mapped = hslToRgba(h, s, l);
          r = mapped[0]; g = mapped[1]; b = mapped[2];
        } else {
          // Pure neon coloring
          const t = bright * opts.fillStrength;
          r = Math.round(neon.dim[0] + (neon.core[0] - neon.dim[0]) * t);
          g = Math.round(neon.dim[1] + (neon.core[1] - neon.dim[1]) * t);
          b = Math.round(neon.dim[2] + (neon.core[2] - neon.dim[2]) * t);
        }

        setPixel(dst, x, y, [r, g, b, original[3]]);
      }
    }
  }

  return dst;
}

/**
 * Apply the full neon treatment: neonify + glow layers.
 * Returns a buffer ready for display.
 */
export function createNeonSprite(
  src: PixelBuffer,
  theme: ArcadeTheme,
  colorRole: 'primary' | 'secondary' | 'tertiary' | 'danger' = 'primary',
): PixelBuffer {
  const neonColor = theme.palette[colorRole];
  const neonified = neonifySprite(src, { neonColor, fillStrength: 0.3 });
  return generateGlow(neonified, theme.glow);
}

/**
 * Build a sprite from a pixel art definition (array of hex color strings).
 * Each string in the array is one row, each character pair is a pixel.
 * '00' or '..' = transparent, otherwise hex brightness mapped to neon color.
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

      // Map brightness to neon color
      const r = Math.round(neonColor.dim[0] + (neonColor.core[0] - neonColor.dim[0]) * t);
      const g = Math.round(neonColor.dim[1] + (neonColor.core[1] - neonColor.dim[1]) * t);
      const b = Math.round(neonColor.dim[2] + (neonColor.core[2] - neonColor.dim[2]) * t);

      setPixel(buf, x, y, [r, g, b, 1]);
    }
  }

  return buf;
}

/**
 * Recolor an existing neon sprite to a different neon color.
 * Useful for palette-swapping between games.
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

      // Shift hue from source to target
      const hueDiff = toHsl[0] - fromHsl[0];
      const newHue = (pixelHsl[0] + hueDiff + 360) % 360;

      const recolored = hslToRgba(newHue, pixelHsl[1], pixelHsl[2], pixel[3]);
      setPixel(dst, x, y, recolored);
    }
  }

  return dst;
}
