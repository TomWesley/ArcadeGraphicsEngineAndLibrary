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

export function clearBuffer(buf: PixelBuffer, color: RGBA = [0, 0, 0, 1]): void {
  for (let i = 0; i < buf.data.length; i += 4) {
    buf.data[i] = color[0];
    buf.data[i + 1] = color[1];
    buf.data[i + 2] = color[2];
    buf.data[i + 3] = Math.round(color[3] * 255);
  }
}

/** Apply a box blur to a pixel buffer (used for glow effects) */
export function boxBlur(src: PixelBuffer, radius: number): PixelBuffer {
  const dst = createPixelBuffer(src.width, src.height);
  const w = src.width;
  const h = src.height;
  const d = src.data;
  const o = dst.data;
  const r = Math.max(1, Math.round(radius));
  const div = (2 * r + 1);

  // Horizontal pass
  const tmp = new Uint8ClampedArray(d.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rr = 0, gg = 0, bb = 0, aa = 0;
      for (let dx = -r; dx <= r; dx++) {
        const sx = Math.max(0, Math.min(w - 1, x + dx));
        const i = (y * w + sx) * 4;
        rr += d[i]; gg += d[i + 1]; bb += d[i + 2]; aa += d[i + 3];
      }
      const i = (y * w + x) * 4;
      tmp[i] = rr / div;
      tmp[i + 1] = gg / div;
      tmp[i + 2] = bb / div;
      tmp[i + 3] = aa / div;
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let rr = 0, gg = 0, bb = 0, aa = 0;
      for (let dy = -r; dy <= r; dy++) {
        const sy = Math.max(0, Math.min(h - 1, y + dy));
        const i = (sy * w + x) * 4;
        rr += tmp[i]; gg += tmp[i + 1]; bb += tmp[i + 2]; aa += tmp[i + 3];
      }
      const i = (y * w + x) * 4;
      o[i] = rr / div;
      o[i + 1] = gg / div;
      o[i + 2] = bb / div;
      o[i + 3] = aa / div;
    }
  }

  return dst;
}

/** Composite a glow layer onto a destination buffer additively */
export function compositeAdditive(dst: PixelBuffer, src: PixelBuffer, intensity: number): void {
  for (let i = 0; i < dst.data.length; i += 4) {
    dst.data[i] = Math.min(255, dst.data[i] + Math.round(src.data[i] * intensity));
    dst.data[i + 1] = Math.min(255, dst.data[i + 1] + Math.round(src.data[i + 1] * intensity));
    dst.data[i + 2] = Math.min(255, dst.data[i + 2] + Math.round(src.data[i + 2] * intensity));
    dst.data[i + 3] = Math.min(255, dst.data[i + 3] + Math.round(src.data[i + 3] * intensity));
  }
}

/** Generate a multi-pass glow from a source buffer */
export function generateGlow(source: PixelBuffer, config: GlowConfig): PixelBuffer {
  const result = createPixelBuffer(source.width, source.height);
  // Copy source to result
  result.data.set(source.data);

  const radiusStep = (config.outerRadius - config.innerRadius) / Math.max(1, config.passes - 1);

  for (let pass = 0; pass < config.passes; pass++) {
    const radius = config.innerRadius + radiusStep * pass;
    const passIntensity = config.intensity * (1 - pass / config.passes) * 0.5;
    const blurred = boxBlur(source, radius);
    compositeAdditive(result, blurred, passIntensity);
  }

  return result;
}

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

// ── Drawing Primitives (on PixelBuffer) ──────────────────────────────

export function drawLine(buf: PixelBuffer, x0: number, y0: number, x1: number, y1: number, color: RGBA): void {
  // Bresenham's line algorithm
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
  // Midpoint circle algorithm
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
