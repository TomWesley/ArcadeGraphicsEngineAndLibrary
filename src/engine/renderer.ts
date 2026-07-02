import type { RGBA, ArcadeTheme, GlowConfig } from '../style/types';
import { rgbaToCss, withAlpha, lerpColor } from '../style/colors';

/**
 * Platform-agnostic rendering operations.
 * These work on raw pixel buffers and can be used in any environment.
 */

/** A simple pixel buffer for platform-agnostic rendering */
export interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA flat array, length = width * height * 4
}

export function createPixelBuffer(width: number, height: number): PixelBuffer {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  };
}

export function getPixel(buf: PixelBuffer, x: number, y: number): RGBA {
  if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return [0, 0, 0, 0];
  const i = (y * buf.width + x) * 4;
  return [buf.data[i], buf.data[i + 1], buf.data[i + 2], buf.data[i + 3] / 255];
}

export function setPixel(buf: PixelBuffer, x: number, y: number, color: RGBA): void {
  if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return;
  const i = (y * buf.width + x) * 4;
  buf.data[i] = color[0];
  buf.data[i + 1] = color[1];
  buf.data[i + 2] = color[2];
  buf.data[i + 3] = Math.round(color[3] * 255);
}

export function setPixelAdditive(buf: PixelBuffer, x: number, y: number, color: RGBA): void {
  if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return;
  const i = (y * buf.width + x) * 4;
  const a = color[3];
  buf.data[i] = Math.min(255, buf.data[i] + Math.round(color[0] * a));
  buf.data[i + 1] = Math.min(255, buf.data[i + 1] + Math.round(color[1] * a));
  buf.data[i + 2] = Math.min(255, buf.data[i + 2] + Math.round(color[2] * a));
  buf.data[i + 3] = Math.min(255, buf.data[i + 3] + Math.round(a * 255));
}

/** Alpha-blended pixel write (proper compositing) */
export function setPixelBlend(buf: PixelBuffer, x: number, y: number, color: RGBA): void {
  if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return;
  const i = (y * buf.width + x) * 4;
  const sa = color[3];
  const da = buf.data[i + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA < 0.001) return;
  buf.data[i] = Math.round((color[0] * sa + buf.data[i] * da * (1 - sa)) / outA);
  buf.data[i + 1] = Math.round((color[1] * sa + buf.data[i + 1] * da * (1 - sa)) / outA);
  buf.data[i + 2] = Math.round((color[2] * sa + buf.data[i + 2] * da * (1 - sa)) / outA);
  buf.data[i + 3] = Math.round(outA * 255);
}

export function clearBuffer(buf: PixelBuffer, color: RGBA = [0, 0, 0, 1]): void {
  for (let i = 0; i < buf.data.length; i += 4) {
    buf.data[i] = color[0];
    buf.data[i + 1] = color[1];
    buf.data[i + 2] = color[2];
    buf.data[i + 3] = Math.round(color[3] * 255);
  }
}

/** Copy one buffer into another */
export function copyBuffer(dst: PixelBuffer, src: PixelBuffer): void {
  dst.data.set(src.data);
}

// ── Blur Algorithms ──────────────────────────────────────────────────

/** Generate 1D Gaussian kernel */
function gaussianKernel(radius: number): Float64Array {
  const size = radius * 2 + 1;
  const kernel = new Float64Array(size);
  const sigma = radius / 3;
  const s2 = 2 * sigma * sigma;
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-(x * x) / s2);
    sum += kernel[i];
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;
  return kernel;
}

/** Proper separable Gaussian blur */
export function gaussianBlur(src: PixelBuffer, radius: number): PixelBuffer {
  if (radius < 1) {
    const copy = createPixelBuffer(src.width, src.height);
    copy.data.set(src.data);
    return copy;
  }
  const r = Math.round(radius);
  const kernel = gaussianKernel(r);
  const w = src.width, h = src.height;

  // Use Float64 for intermediate precision
  const tmp = new Float64Array(w * h * 4);
  const out = new Float64Array(w * h * 4);

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rr = 0, gg = 0, bb = 0, aa = 0;
      for (let k = -r; k <= r; k++) {
        const sx = Math.max(0, Math.min(w - 1, x + k));
        const si = (y * w + sx) * 4;
        const weight = kernel[k + r];
        rr += src.data[si] * weight;
        gg += src.data[si + 1] * weight;
        bb += src.data[si + 2] * weight;
        aa += src.data[si + 3] * weight;
      }
      const di = (y * w + x) * 4;
      tmp[di] = rr; tmp[di + 1] = gg; tmp[di + 2] = bb; tmp[di + 3] = aa;
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let rr = 0, gg = 0, bb = 0, aa = 0;
      for (let k = -r; k <= r; k++) {
        const sy = Math.max(0, Math.min(h - 1, y + k));
        const si = (sy * w + x) * 4;
        const weight = kernel[k + r];
        rr += tmp[si] * weight;
        gg += tmp[si + 1] * weight;
        bb += tmp[si + 2] * weight;
        aa += tmp[si + 3] * weight;
      }
      const di = (y * w + x) * 4;
      out[di] = rr; out[di + 1] = gg; out[di + 2] = bb; out[di + 3] = aa;
    }
  }

  const dst = createPixelBuffer(w, h);
  for (let i = 0; i < dst.data.length; i++) {
    dst.data[i] = Math.max(0, Math.min(255, Math.round(out[i])));
  }
  return dst;
}

/** Legacy box blur — kept for backwards compat with tests */
export function boxBlur(src: PixelBuffer, radius: number): PixelBuffer {
  return gaussianBlur(src, radius);
}

// ── Compositing ──────────────────────────────────────────────────────

/** Composite src onto dst using additive blending */
export function compositeAdditive(dst: PixelBuffer, src: PixelBuffer, intensity: number): void {
  for (let i = 0; i < dst.data.length; i += 4) {
    dst.data[i] = Math.min(255, dst.data[i] + Math.round(src.data[i] * intensity));
    dst.data[i + 1] = Math.min(255, dst.data[i + 1] + Math.round(src.data[i + 1] * intensity));
    dst.data[i + 2] = Math.min(255, dst.data[i + 2] + Math.round(src.data[i + 2] * intensity));
    dst.data[i + 3] = Math.min(255, dst.data[i + 3] + Math.round(src.data[i + 3] * intensity));
  }
}

/** Screen blend mode compositing — brighter but more natural than additive */
export function compositeScreen(dst: PixelBuffer, src: PixelBuffer, intensity: number): void {
  for (let i = 0; i < dst.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const d = dst.data[i + c] / 255;
      const s = (src.data[i + c] / 255) * intensity;
      dst.data[i + c] = Math.round(Math.min(1, 1 - (1 - d) * (1 - s)) * 255);
    }
    dst.data[i + 3] = Math.min(255, dst.data[i + 3] + Math.round(src.data[i + 3] * intensity));
  }
}

// ── Multi-Layer Bloom System ─────────────────────────────────────────

export interface BloomConfig {
  /** Inner core glow radius */
  innerRadius: number;
  /** Inner core intensity */
  innerIntensity: number;
  /** Mid bloom radius */
  midRadius: number;
  /** Mid bloom intensity */
  midIntensity: number;
  /** Outer atmospheric glow radius */
  outerRadius: number;
  /** Outer glow intensity */
  outerIntensity: number;
  /** Number of blur passes for quality */
  quality: number;
}

export const DEFAULT_BLOOM: BloomConfig = {
  innerRadius: 2,
  innerIntensity: 0.8,
  midRadius: 8,
  midIntensity: 0.4,
  outerRadius: 24,
  outerIntensity: 0.15,
  quality: 2,
};

/**
 * Multi-layer bloom system — produces the rich, layered glow seen in the reference.
 * Layer 1 (inner): Tight, bright halo right around bright pixels
 * Layer 2 (mid): Medium spread color bloom
 * Layer 3 (outer): Wide atmospheric haze
 */
export function multiLayerBloom(source: PixelBuffer, config: BloomConfig = DEFAULT_BLOOM): PixelBuffer {
  const result = createPixelBuffer(source.width, source.height);
  result.data.set(source.data);

  // Extract bright pixels as bloom source (threshold)
  const brightSource = extractBrightPixels(source, 40);

  // Layer 1: Inner core glow — tight and bright
  let innerGlow = brightSource;
  for (let i = 0; i < config.quality; i++) {
    innerGlow = gaussianBlur(innerGlow, config.innerRadius);
  }
  compositeAdditive(result, innerGlow, config.innerIntensity);

  // Layer 2: Mid bloom — color spread
  let midGlow = gaussianBlur(brightSource, config.midRadius);
  for (let i = 1; i < config.quality; i++) {
    midGlow = gaussianBlur(midGlow, config.midRadius * 0.7);
  }
  compositeScreen(result, midGlow, config.midIntensity);

  // Layer 3: Outer atmospheric haze — wide and subtle
  let outerGlow = gaussianBlur(brightSource, config.outerRadius);
  compositeScreen(result, outerGlow, config.outerIntensity);

  return result;
}

/** Extract pixels above a brightness threshold */
function extractBrightPixels(src: PixelBuffer, threshold: number): PixelBuffer {
  const dst = createPixelBuffer(src.width, src.height);
  for (let i = 0; i < src.data.length; i += 4) {
    const bright = src.data[i] * 0.299 + src.data[i + 1] * 0.587 + src.data[i + 2] * 0.114;
    if (bright > threshold) {
      dst.data[i] = src.data[i];
      dst.data[i + 1] = src.data[i + 1];
      dst.data[i + 2] = src.data[i + 2];
      dst.data[i + 3] = src.data[i + 3];
    }
  }
  return dst;
}

/** Legacy generateGlow — now delegates to multiLayerBloom */
export function generateGlow(source: PixelBuffer, config: GlowConfig): PixelBuffer {
  return multiLayerBloom(source, {
    innerRadius: config.innerRadius,
    innerIntensity: config.intensity * 0.8,
    midRadius: (config.innerRadius + config.outerRadius) / 2,
    midIntensity: config.intensity * 0.4,
    outerRadius: config.outerRadius,
    outerIntensity: config.intensity * 0.15,
    quality: config.passes,
  });
}

// ── Edge Detection ───────────────────────────────────────────────────

/** Sobel edge detection — produces gradient magnitude map */
export function sobelEdges(src: PixelBuffer): PixelBuffer {
  const dst = createPixelBuffer(src.width, src.height);
  const w = src.width, h = src.height;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      // Sample 3x3 neighborhood luminance
      const lum = (px: number, py: number): number => {
        const i = (py * w + px) * 4;
        return src.data[i] * 0.299 + src.data[i + 1] * 0.587 + src.data[i + 2] * 0.114;
      };

      // Sobel kernels
      const gx = (
        -1 * lum(x - 1, y - 1) + 1 * lum(x + 1, y - 1) +
        -2 * lum(x - 1, y)     + 2 * lum(x + 1, y) +
        -1 * lum(x - 1, y + 1) + 1 * lum(x + 1, y + 1)
      );
      const gy = (
        -1 * lum(x - 1, y - 1) - 2 * lum(x, y - 1) - 1 * lum(x + 1, y - 1) +
         1 * lum(x - 1, y + 1) + 2 * lum(x, y + 1) + 1 * lum(x + 1, y + 1)
      );

      const magnitude = Math.min(255, Math.sqrt(gx * gx + gy * gy));
      const i = (y * w + x) * 4;
      dst.data[i] = magnitude;
      dst.data[i + 1] = magnitude;
      dst.data[i + 2] = magnitude;
      dst.data[i + 3] = src.data[i + 3]; // preserve alpha
    }
  }

  return dst;
}

/** Compute distance field from non-transparent pixels (for smooth glow falloff) */
export function distanceField(src: PixelBuffer, maxDist: number): Float64Array {
  const w = src.width, h = src.height;
  const dist = new Float64Array(w * h);
  dist.fill(maxDist);

  // Mark non-transparent pixels as distance 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src.data[i + 3] > 10) {
        dist[y * w + x] = 0;
      }
    }
  }

  // Simple brute-force SDF for small buffers (good enough for sprites)
  // Forward pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (x > 0) dist[idx] = Math.min(dist[idx], dist[idx - 1] + 1);
      if (y > 0) dist[idx] = Math.min(dist[idx], dist[(y - 1) * w + x] + 1);
    }
  }
  // Backward pass
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const idx = y * w + x;
      if (x < w - 1) dist[idx] = Math.min(dist[idx], dist[idx + 1] + 1);
      if (y < h - 1) dist[idx] = Math.min(dist[idx], dist[(y + 1) * w + x] + 1);
    }
  }

  return dist;
}

// ── Scaling ──────────────────────────────────────────────────────────

/** Scale a pixel buffer using nearest-neighbor (crisp pixel art scaling) */
export function nearestNeighborScale(src: PixelBuffer, scale: number): PixelBuffer {
  const w = Math.round(src.width * scale);
  const h = Math.round(src.height * scale);
  const dst = createPixelBuffer(w, h);

  for (let y = 0; y < h; y++) {
    const sy = Math.floor(y / scale);
    for (let x = 0; x < w; x++) {
      const sx = Math.floor(x / scale);
      const si = (sy * src.width + sx) * 4;
      const di = (y * w + x) * 4;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }

  return dst;
}

/** Bilinear scale — smoother, used for glow layers */
export function bilinearScale(src: PixelBuffer, newWidth: number, newHeight: number): PixelBuffer {
  const dst = createPixelBuffer(newWidth, newHeight);
  const xRatio = src.width / newWidth;
  const yRatio = src.height / newHeight;

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(x0 + 1, src.width - 1);
      const y1 = Math.min(y0 + 1, src.height - 1);
      const fx = srcX - x0;
      const fy = srcY - y0;

      const di = (y * newWidth + x) * 4;
      for (let c = 0; c < 4; c++) {
        const tl = src.data[(y0 * src.width + x0) * 4 + c];
        const tr = src.data[(y0 * src.width + x1) * 4 + c];
        const bl = src.data[(y1 * src.width + x0) * 4 + c];
        const br = src.data[(y1 * src.width + x1) * 4 + c];
        const top = tl + (tr - tl) * fx;
        const bot = bl + (br - bl) * fx;
        dst.data[di + c] = Math.round(top + (bot - top) * fy);
      }
    }
  }

  return dst;
}

// ── Drawing Primitives (on PixelBuffer) ──────────────────────────────

export function drawLine(buf: PixelBuffer, x0: number, y0: number, x1: number, y1: number, color: RGBA): void {
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    setPixel(buf, x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

export function drawRect(buf: PixelBuffer, x: number, y: number, w: number, h: number, color: RGBA, filled: boolean = false): void {
  if (filled) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        setPixel(buf, px, py, color);
      }
    }
  } else {
    drawLine(buf, x, y, x + w - 1, y, color);
    drawLine(buf, x + w - 1, y, x + w - 1, y + h - 1, color);
    drawLine(buf, x + w - 1, y + h - 1, x, y + h - 1, color);
    drawLine(buf, x, y + h - 1, x, y, color);
  }
}

export function drawCircle(buf: PixelBuffer, cx: number, cy: number, r: number, color: RGBA, filled: boolean = false): void {
  let x = r, y = 0, err = 1 - r;

  while (x >= y) {
    if (filled) {
      drawLine(buf, cx - x, cy + y, cx + x, cy + y, color);
      drawLine(buf, cx - x, cy - y, cx + x, cy - y, color);
      drawLine(buf, cx - y, cy + x, cx + y, cy + x, color);
      drawLine(buf, cx - y, cy - x, cx + y, cy - x, color);
    } else {
      setPixel(buf, cx + x, cy + y, color);
      setPixel(buf, cx - x, cy + y, color);
      setPixel(buf, cx + x, cy - y, color);
      setPixel(buf, cx - x, cy - y, color);
      setPixel(buf, cx + y, cy + x, color);
      setPixel(buf, cx - y, cy + x, color);
      setPixel(buf, cx + y, cy - x, color);
      setPixel(buf, cx - y, cy - x, color);
    }
    y++;
    if (err < 0) {
      err += 2 * y + 1;
    } else {
      x--;
      err += 2 * (y - x) + 1;
    }
  }
}
