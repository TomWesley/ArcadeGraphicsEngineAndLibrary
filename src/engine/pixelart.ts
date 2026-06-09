import type { RGBA, NeonColor } from '../style/types';
import { lerpColor, withAlpha } from '../style/colors';
import { SPEC } from '../style/spec';
import { PixelBuffer, createPixelBuffer, getPixel, setPixel, nearestNeighborScale, gaussianBlur, compositeAdditive, compositeScreen } from './renderer';

/**
 * Pixel Art Engine — the correct rendering approach.
 *
 * KEY INSIGHT: The reference image is real pixel art, not filtered vector art.
 * - Art is authored at LOW resolution (48-96px characters)
 * - Individual pixels are intentional and visible
 * - 3-5 colors per element (no gradients)
 * - 1px outlines at art resolution
 * - Dithering patterns for shading
 * - Scale up with nearest-neighbor THEN apply glow at display resolution
 *
 * This module provides:
 * 1. Color quantization (reduce to N neon shades)
 * 2. Ordered dithering (Bayer matrix for classic pixel art look)
 * 3. Pixel-perfect outline detection
 * 4. The correct pipeline: art→quantize→dither→scale→glow
 */

// ── Neon Shade Palette Generation ────────────────────────────────────

/**
 * Generate a fixed set of N color shades from a NeonColor.
 * These are the ONLY colors that will appear in the pixel art.
 *
 * For a 5-shade palette (typical):
 * [0] = near-black with faint hue tint (deep interior)
 * [1] = very dark hue (shadow)
 * [2] = dim mid-tone (surface detail)
 * [3] = full neon core (outlines, bright areas)
 * [4] = white-hot highlight
 */
export function generateNeonShades(neon: NeonColor, count: number = 5): RGBA[] {
  const shades: RGBA[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    if (t < 0.1) {
      // Near black
      shades.push([
        Math.round(neon.dim[0] * 0.08),
        Math.round(neon.dim[1] * 0.08),
        Math.round(neon.dim[2] * 0.08),
        1,
      ]);
    } else if (t < 0.3) {
      const s = (t - 0.1) / 0.2;
      shades.push([
        Math.round(neon.dim[0] * (0.15 + s * 0.35)),
        Math.round(neon.dim[1] * (0.15 + s * 0.35)),
        Math.round(neon.dim[2] * (0.15 + s * 0.35)),
        1,
      ]);
    } else if (t < 0.65) {
      const s = (t - 0.3) / 0.35;
      shades.push(lerpColor(neon.dim, neon.core, s * 0.5));
    } else if (t < 0.9) {
      const s = (t - 0.65) / 0.25;
      shades.push(lerpColor(neon.dim, neon.core, 0.5 + s * 0.5));
    } else {
      // White-hot highlight
      shades.push([
        Math.min(255, neon.core[0] + 90),
        Math.min(255, neon.core[1] + 90),
        Math.min(255, neon.core[2] + 90),
        1,
      ]);
    }
  }
  return shades;
}

// ── Ordered Dithering ────────────────────────────────────────────────

/** 4x4 Bayer dithering matrix (normalized to 0-1) */
const BAYER_4X4 = [
  [ 0/16,  8/16,  2/16, 10/16],
  [12/16,  4/16, 14/16,  6/16],
  [ 3/16, 11/16,  1/16,  9/16],
  [15/16,  7/16, 13/16,  5/16],
];

/** 8x8 Bayer dithering matrix */
const BAYER_8X8 = (() => {
  const m: number[][] = [];
  for (let y = 0; y < 8; y++) {
    m[y] = [];
    for (let x = 0; x < 8; x++) {
      // Generate 8x8 Bayer from 4x4 recursion
      const v4 = BAYER_4X4[y % 4][x % 4];
      const offset = ((y >= 4 ? 1 : 0) * 2 + (x >= 4 ? 1 : 0)) / 4;
      m[y][x] = (v4 + offset) / 4;
    }
  }
  // Renormalize to 0-1
  let max = 0;
  for (const row of m) for (const v of row) max = Math.max(max, v);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) m[y][x] /= max;
  return m;
})();

/**
 * Quantize a continuous brightness value to one of N levels,
 * using ordered dithering for smooth transitions between bands.
 */
export function ditherQuantize(
  brightness: number,
  x: number, y: number,
  levels: number,
  ditherStrength: number = 0.5,
): number {
  const threshold = BAYER_4X4[y % 4][x % 4];
  const adjusted = brightness + (threshold - 0.5) * ditherStrength / levels;
  const index = Math.max(0, Math.min(levels - 1, Math.round(adjusted * (levels - 1))));
  return index;
}

// ── Color Quantization ───────────────────────────────────────────────

/**
 * Quantize a pixel buffer to a fixed set of colors.
 * This is what gives pixel art its characteristic "stepped" look.
 */
export function quantizeToShades(
  src: PixelBuffer,
  shades: RGBA[],
  ditherStrength: number = 0.4,
  backgroundThreshold: number = 25,
): PixelBuffer {
  const dst = createPixelBuffer(src.width, src.height);
  const n = shades.length;

  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const px = getPixel(src, x, y);

      // Skip transparent / near-black
      if (px[3] < 0.1) continue;
      const brightness = (px[0] * 0.299 + px[1] * 0.587 + px[2] * 0.114) / 255;
      if (brightness < backgroundThreshold / 255 && px[3] < 0.5) continue;

      // Dithered quantization
      const shadeIdx = ditherQuantize(brightness * px[3], x, y, n, ditherStrength);
      const color = shades[shadeIdx];
      setPixel(dst, x, y, [color[0], color[1], color[2], px[3]]);
    }
  }

  return dst;
}

// ── Pixel-Perfect Outline ────────────────────────────────────────────

/**
 * Extract 1-pixel-thick outlines from a sprite.
 * An outline pixel is any non-transparent pixel adjacent to a transparent pixel.
 * This produces the crisp, single-pixel neon edges seen in the reference.
 */
export function extractOutline(src: PixelBuffer, threshold: number = 10): PixelBuffer {
  const dst = createPixelBuffer(src.width, src.height);
  const w = src.width, h = src.height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src.data[i + 3] < threshold) continue;

      // Check 4-connected neighbors
      let isEdge = false;
      const neighbors = [[0,-1],[0,1],[-1,0],[1,0]];
      for (const [dx, dy] of neighbors) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
          isEdge = true;
          break;
        }
        const ni = (ny * w + nx) * 4;
        if (src.data[ni + 3] < threshold) {
          isEdge = true;
          break;
        }
      }

      if (isEdge) {
        dst.data[i] = 255;
        dst.data[i + 1] = 255;
        dst.data[i + 2] = 255;
        dst.data[i + 3] = 255;
      }
    }
  }

  return dst;
}

/**
 * Extract inner structure lines — edges WITHIN the sprite
 * (where brightness changes sharply but both sides are opaque).
 */
export function extractInnerLines(src: PixelBuffer, sensitivity: number = 50): PixelBuffer {
  const dst = createPixelBuffer(src.width, src.height);
  const w = src.width, h = src.height;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (src.data[i + 3] < 10) continue;

      const lum = src.data[i] * 0.299 + src.data[i + 1] * 0.587 + src.data[i + 2] * 0.114;

      // Check horizontal and vertical brightness differences
      let maxDiff = 0;
      const neighbors = [[-1,0],[1,0],[0,-1],[0,1]];
      for (const [dx, dy] of neighbors) {
        const ni = ((y+dy) * w + (x+dx)) * 4;
        if (src.data[ni + 3] < 10) continue; // Only compare opaque neighbors
        const nLum = src.data[ni] * 0.299 + src.data[ni + 1] * 0.587 + src.data[ni + 2] * 0.114;
        maxDiff = Math.max(maxDiff, Math.abs(lum - nLum));
      }

      if (maxDiff > sensitivity) {
        const strength = Math.min(255, maxDiff);
        dst.data[i] = strength;
        dst.data[i + 1] = strength;
        dst.data[i + 2] = strength;
        dst.data[i + 3] = 255;
      }
    }
  }

  return dst;
}

// ── The Correct Pipeline ─────────────────────────────────────────────

export interface PixelArtPipelineOptions {
  /** Number of color shades (3-7, default 5) */
  shadeCount: number;
  /** Dither strength (0 = no dither, 1 = heavy dither) */
  ditherStrength: number;
  /** Display scale factor */
  displayScale: number;
  /** Inner line detection sensitivity */
  innerLineSensitivity: number;
  /** How bright inner lines are relative to outlines (0-1) */
  innerLineBrightness: number;
  /** Background brightness threshold (0-255) */
  backgroundThreshold: number;
}

const DEFAULT_PIPELINE: PixelArtPipelineOptions = {
  shadeCount: 5,
  ditherStrength: 0.4,
  displayScale: 4,
  innerLineSensitivity: 50,
  innerLineBrightness: 0.55,
  backgroundThreshold: 25,
};

/**
 * THE CORRECT PIPELINE.
 *
 * 1. Take source image at art resolution (low res, any style)
 * 2. Extract outlines (1px) and inner structure lines
 * 3. Quantize interior to N neon shades with dithering
 * 4. Composite: shade 0 (black) for deep interior, shades for mid,
 *    full neon core for outlines, dimmer for inner lines
 * 5. Scale up with nearest-neighbor (crisp pixels)
 * 6. Apply multi-layer glow at display resolution (smooth glow on crisp pixels)
 *
 * Returns the final display-resolution buffer.
 */
export function pixelArtPipeline(
  source: PixelBuffer,
  neonColor: NeonColor,
  accentColor?: NeonColor,
  options?: Partial<PixelArtPipelineOptions>,
): PixelBuffer {
  const opts = { ...DEFAULT_PIPELINE, ...options };
  const shades = generateNeonShades(neonColor, opts.shadeCount);
  const w = source.width, h = source.height;

  // Step 1: Extract structure
  const outline = extractOutline(source, opts.backgroundThreshold);
  const innerLines = extractInnerLines(source, opts.innerLineSensitivity);

  // Step 2: Quantize source to neon shades (with dithering)
  const quantized = quantizeToShades(source, shades, opts.ditherStrength, opts.backgroundThreshold);

  // Step 3: Composite the layers at art resolution
  const artBuffer = createPixelBuffer(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;

      // Background check
      if (source.data[i + 3] < opts.backgroundThreshold) continue;

      const isOutline = outline.data[i] > 128;
      const innerStr = innerLines.data[i] / 255;

      if (isOutline) {
        // Outer outline = full neon core color (the brightest shade)
        const core = shades[shades.length - 2]; // Second brightest (core, not white-hot)
        artBuffer.data[i] = core[0];
        artBuffer.data[i + 1] = core[1];
        artBuffer.data[i + 2] = core[2];
        artBuffer.data[i + 3] = 255;
      } else if (innerStr > 0.3) {
        // Inner structure lines — dimmer version of core
        const lineShade = Math.max(1, Math.min(shades.length - 2,
          Math.round((shades.length - 1) * opts.innerLineBrightness)));
        const c = shades[lineShade];
        artBuffer.data[i] = c[0];
        artBuffer.data[i + 1] = c[1];
        artBuffer.data[i + 2] = c[2];
        artBuffer.data[i + 3] = 255;
      } else {
        // Interior — use quantized shade (very dark mostly)
        artBuffer.data[i] = quantized.data[i];
        artBuffer.data[i + 1] = quantized.data[i + 1];
        artBuffer.data[i + 2] = quantized.data[i + 2];
        artBuffer.data[i + 3] = quantized.data[i + 3];
      }
    }
  }

  // Step 4: Scale up with nearest-neighbor (crisp pixel blocks)
  const scaled = nearestNeighborScale(artBuffer, opts.displayScale);

  // Step 5: Apply glow at DISPLAY resolution (smooth glow wrapping crisp pixels)
  return applyDisplayGlow(scaled);
}

/**
 * Apply multi-layer glow at display resolution.
 * This is what gives the neon bloom effect while keeping pixels crisp.
 * The glow is smooth (Gaussian) but the underlying art is pixel-sharp.
 */
function applyDisplayGlow(src: PixelBuffer): PixelBuffer {
  const result = createPixelBuffer(src.width, src.height);
  result.data.set(src.data);

  // Extract bright pixels for bloom source
  const bright = createPixelBuffer(src.width, src.height);
  for (let i = 0; i < src.data.length; i += 4) {
    const lum = src.data[i] * 0.299 + src.data[i + 1] * 0.587 + src.data[i + 2] * 0.114;
    if (lum > 50) {
      bright.data[i] = src.data[i];
      bright.data[i + 1] = src.data[i + 1];
      bright.data[i + 2] = src.data[i + 2];
      bright.data[i + 3] = src.data[i + 3];
    }
  }

  // Layer 1: Tight inner glow (2-3px at display res)
  const inner = gaussianBlur(gaussianBlur(bright, 3), 2);
  compositeAdditive(result, inner, 0.5);

  // Layer 2: Mid bloom (8-10px spread)
  const mid = gaussianBlur(bright, 10);
  compositeScreen(result, mid, 0.25);

  // Layer 3: Wide atmospheric (20-30px)
  const outer = gaussianBlur(bright, 25);
  compositeScreen(result, outer, 0.08);

  return result;
}

/**
 * Convert any high-res source image into pixel art at target resolution,
 * then run through the full pipeline.
 *
 * This is the "give me any image, get back pixel art in our style" function.
 */
export function convertToPixelArt(
  source: PixelBuffer,
  targetWidth: number,
  targetHeight: number,
  neonColor: NeonColor,
  accentColor?: NeonColor,
  options?: Partial<PixelArtPipelineOptions>,
): PixelBuffer {
  // Downscale to pixel art resolution using area averaging
  const downscaled = downscaleForPixelArt(source, targetWidth, targetHeight);
  // Run through the pixel art pipeline
  return pixelArtPipeline(downscaled, neonColor, accentColor, options);
}

/** Downscale using area averaging (good for pixel art conversion) */
function downscaleForPixelArt(src: PixelBuffer, tw: number, th: number): PixelBuffer {
  const dst = createPixelBuffer(tw, th);
  const xr = src.width / tw, yr = src.height / th;

  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      const sx0 = Math.floor(tx * xr), sy0 = Math.floor(ty * yr);
      const sx1 = Math.floor((tx + 1) * xr), sy1 = Math.floor((ty + 1) * yr);
      const count = Math.max(1, (sx1 - sx0) * (sy1 - sy0));
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const si = (sy * src.width + sx) * 4;
          r += src.data[si]; g += src.data[si + 1]; b += src.data[si + 2]; a += src.data[si + 3];
        }
      }
      setPixel(dst, tx, ty, [
        Math.round(r / count), Math.round(g / count),
        Math.round(b / count), Math.round(a / count) / 255,
      ]);
    }
  }
  return dst;
}
