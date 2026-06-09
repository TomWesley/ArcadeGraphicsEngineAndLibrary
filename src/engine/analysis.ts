import type { RGBA } from '../style/types';
import { SPEC } from '../style/spec';
import {
  PixelBuffer, createPixelBuffer, getPixel, setPixel,
  gaussianBlur, sobelEdges, distanceField,
} from './renderer';

/**
 * Image analysis pipeline — the "understanding" layer.
 * Before we can apply consistent style, we need to deeply understand
 * the structure of the input image:
 *
 * 1. What's foreground vs background?
 * 2. Where are the edges (outline candidates)?
 * 3. How far is each pixel from an edge (for zone shading)?
 * 4. What's the luminance structure (for preserving form)?
 * 5. Where are the highlights and shadows?
 *
 * This analysis is deterministic — same input always produces same analysis.
 */

/** Complete structural analysis of a source image */
export interface ImageAnalysis {
  /** Original source dimensions */
  width: number;
  height: number;
  /** Per-pixel luminance, normalized 0-1 */
  luminance: Float64Array;
  /** Per-pixel edge strength from Sobel, 0-1 */
  edgeStrength: Float64Array;
  /** Per-pixel distance from nearest foreground edge (in pixels) */
  edgeDistance: Float64Array;
  /** Maximum meaningful distance in the image */
  maxDistance: number;
  /** Binary foreground mask */
  foregroundMask: Uint8Array;
  /** Per-pixel zone assignment (0 = outline, 1 = inner rim, ..., N = deep interior) */
  zoneMap: Uint8Array;
  /** Normalized local contrast at each pixel, 0-1 */
  localContrast: Float64Array;
}

/**
 * Perform full structural analysis on a source image.
 * This is the first step of the style pipeline — every conversion starts here.
 */
export function analyzeImage(src: PixelBuffer): ImageAnalysis {
  const w = src.width, h = src.height;
  const pixelCount = w * h;

  // ── 1. Foreground mask ──
  const foregroundMask = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const si = i * 4;
    const alpha = src.data[si + 3];
    const rgb = src.data[si] + src.data[si + 1] + src.data[si + 2];
    foregroundMask[i] = (alpha > SPEC.ALPHA_EDGE_THRESHOLD && rgb > SPEC.EDGE_THRESHOLD * 3) ? 1 : 0;
  }

  // ── 2. Luminance map ──
  const luminance = new Float64Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const si = i * 4;
    const a = src.data[si + 3] / 255;
    luminance[i] = (
      src.data[si] * 0.299 +
      src.data[si + 1] * 0.587 +
      src.data[si + 2] * 0.114
    ) * a / 255;
  }

  // ── 3. Edge detection (Sobel) ──
  const sobelBuf = sobelEdges(src);
  const edgeStrength = new Float64Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    edgeStrength[i] = sobelBuf.data[i * 4] / 255;
  }

  // ── 4. Distance field from foreground edges ──
  // First, create an edge mask (pixels that are foreground AND have high edge strength
  // OR are at the boundary of the foreground mask)
  const edgeMask = createPixelBuffer(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!foregroundMask[idx]) continue;

      let isAlphaEdge = false;
      // Check if this pixel is at the boundary of the foreground
      for (let dy = -1; dy <= 1 && !isAlphaEdge; dy++) {
        for (let dx = -1; dx <= 1 && !isAlphaEdge; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) { isAlphaEdge = true; continue; }
          if (!foregroundMask[ny * w + nx]) isAlphaEdge = true;
        }
      }

      if (isAlphaEdge || edgeStrength[idx] > SPEC.EDGE_THRESHOLD / 255) {
        setPixel(edgeMask, x, y, [255, 255, 255, 1]);
      }
    }
  }

  const rawDist = distanceField(edgeMask, Math.max(w, h));
  const edgeDistance = new Float64Array(pixelCount);
  let maxDistance = 0;
  for (let i = 0; i < pixelCount; i++) {
    edgeDistance[i] = rawDist[i];
    if (foregroundMask[i] && rawDist[i] < 9000) {
      maxDistance = Math.max(maxDistance, rawDist[i]);
    }
  }
  maxDistance = Math.max(1, maxDistance);

  // ── 5. Zone assignment ──
  const zoneMap = new Uint8Array(pixelCount);
  const zoneBounds = SPEC.ZONE_BOUNDARIES;
  for (let i = 0; i < pixelCount; i++) {
    if (!foregroundMask[i]) { zoneMap[i] = 255; continue; } // background
    const d = edgeDistance[i];
    let zone = SPEC.ZONE_COUNT - 1;
    for (let z = 0; z < SPEC.ZONE_COUNT - 1; z++) {
      if (d <= zoneBounds[z + 1]) { zone = z; break; }
    }
    zoneMap[i] = zone;
  }

  // ── 6. Local contrast (for preserving detail) ──
  const localContrast = new Float64Array(pixelCount);
  const blurred = gaussianBlur(src, 3);
  for (let i = 0; i < pixelCount; i++) {
    const si = i * 4;
    const origLum = src.data[si] * 0.299 + src.data[si + 1] * 0.587 + src.data[si + 2] * 0.114;
    const blurLum = blurred.data[si] * 0.299 + blurred.data[si + 1] * 0.587 + blurred.data[si + 2] * 0.114;
    localContrast[i] = Math.min(1, Math.abs(origLum - blurLum) / 128);
  }

  return {
    width: w,
    height: h,
    luminance,
    edgeStrength,
    edgeDistance,
    maxDistance,
    foregroundMask,
    zoneMap,
    localContrast,
  };
}

/**
 * Compute a consistency score between two analyses.
 * Used to verify that different sprites get consistent treatment.
 * Returns 0-1 where 1 = identical distribution profiles.
 */
export function analysisConsistencyScore(a: ImageAnalysis, b: ImageAnalysis): number {
  // Compare zone distribution ratios
  const aZones = new Float64Array(SPEC.ZONE_COUNT);
  const bZones = new Float64Array(SPEC.ZONE_COUNT);
  let aFg = 0, bFg = 0;

  for (let i = 0; i < a.zoneMap.length; i++) {
    if (a.zoneMap[i] < SPEC.ZONE_COUNT) { aZones[a.zoneMap[i]]++; aFg++; }
  }
  for (let i = 0; i < b.zoneMap.length; i++) {
    if (b.zoneMap[i] < SPEC.ZONE_COUNT) { bZones[b.zoneMap[i]]++; bFg++; }
  }

  if (aFg === 0 || bFg === 0) return 0;

  // Normalize
  for (let i = 0; i < SPEC.ZONE_COUNT; i++) { aZones[i] /= aFg; bZones[i] /= bFg; }

  // Compute similarity (1 - average absolute difference)
  let diff = 0;
  for (let i = 0; i < SPEC.ZONE_COUNT; i++) {
    diff += Math.abs(aZones[i] - bZones[i]);
  }
  return Math.max(0, 1 - diff / SPEC.ZONE_COUNT);
}
