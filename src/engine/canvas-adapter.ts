import type { RGBA, ArcadeTheme } from '../style/types';
import { rgbaToCss, withAlpha } from '../style/colors';
import { DEFAULT_THEME } from '../style/theme';
import type { PixelBuffer } from './renderer';

/**
 * Canvas2D adapter — browser-specific rendering layer.
 * This wraps the HTML5 Canvas API and provides high-level drawing
 * operations styled according to an ArcadeTheme.
 *
 * For non-browser environments, use the PixelBuffer-based renderer directly.
 */
export class CanvasAdapter {
  public ctx: CanvasRenderingContext2D;
  public theme: ArcadeTheme;
  public width: number;
  public height: number;

  constructor(
    canvas: HTMLCanvasElement,
    theme: ArcadeTheme = DEFAULT_THEME,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.theme = theme;
    this.width = canvas.width;
    this.height = canvas.height;

    // Enforce crisp pixel rendering
    if (theme.pixel.crispScaling) {
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  clear(): void {
    const bg = this.theme.palette.background;
    this.ctx.fillStyle = rgbaToCss(bg);
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Apply background tint
    const tint = this.theme.palette.backgroundTint;
    if (tint[3] > 0) {
      this.ctx.fillStyle = rgbaToCss(tint);
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  /** Draw a pixel-art scaled rectangle with neon glow */
  drawNeonRect(
    x: number, y: number, w: number, h: number,
    color: RGBA,
    options?: { filled?: boolean; glowOverride?: number },
  ): void {
    const ctx = this.ctx;
    const glow = this.theme.glow;
    const intensity = options?.glowOverride ?? glow.intensity;

    ctx.save();

    // Outer glow
    if (glow.passes > 0 && intensity > 0) {
      ctx.shadowColor = rgbaToCss(withAlpha(color, intensity));
      ctx.shadowBlur = glow.outerRadius;
    }

    ctx.strokeStyle = rgbaToCss(color);
    ctx.lineWidth = this.theme.pixel.outlineThickness;

    if (options?.filled) {
      ctx.fillStyle = rgbaToCss(withAlpha(color, 0.15));
      ctx.fillRect(x, y, w, h);
    }

    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  /** Draw a neon line with glow */
  drawNeonLine(
    x0: number, y0: number, x1: number, y1: number,
    color: RGBA,
    lineWidth: number = 1,
  ): void {
    const ctx = this.ctx;
    const glow = this.theme.glow;

    ctx.save();
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.outerRadius;
    ctx.strokeStyle = rgbaToCss(color);
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }

  /** Draw a neon circle/arc with glow */
  drawNeonCircle(
    cx: number, cy: number, r: number,
    color: RGBA,
    options?: { filled?: boolean; startAngle?: number; endAngle?: number },
  ): void {
    const ctx = this.ctx;
    const glow = this.theme.glow;
    const start = options?.startAngle ?? 0;
    const end = options?.endAngle ?? Math.PI * 2;

    ctx.save();
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.outerRadius;
    ctx.strokeStyle = rgbaToCss(color);
    ctx.lineWidth = this.theme.pixel.outlineThickness;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);

    if (options?.filled) {
      ctx.fillStyle = rgbaToCss(withAlpha(color, 0.1));
      ctx.fill();
    }

    ctx.stroke();
    ctx.restore();
  }

  /** Draw text with neon glow */
  drawNeonText(
    text: string, x: number, y: number,
    color: RGBA,
    options?: { fontSize?: number; fontFamily?: string; align?: CanvasTextAlign; baseline?: CanvasTextBaseline },
  ): void {
    const ctx = this.ctx;
    const glow = this.theme.glow;
    const size = options?.fontSize ?? 16;
    const family = options?.fontFamily ?? '"Press Start 2P", "Courier New", monospace';

    ctx.save();
    ctx.font = `${size}px ${family}`;
    ctx.textAlign = options?.align ?? 'left';
    ctx.textBaseline = options?.baseline ?? 'top';

    // Multi-pass glow for text
    for (let pass = glow.passes; pass >= 0; pass--) {
      const blur = glow.innerRadius + (glow.outerRadius - glow.innerRadius) * (pass / glow.passes);
      const alpha = pass === 0 ? 1 : glow.intensity * (1 - pass / (glow.passes + 1));
      ctx.shadowColor = rgbaToCss(withAlpha(color, alpha));
      ctx.shadowBlur = pass === 0 ? 0 : blur;
      ctx.fillStyle = rgbaToCss(pass === 0 ? color : withAlpha(color, alpha));
      ctx.fillText(text, x, y);
    }

    ctx.restore();
  }

  /** Render a PixelBuffer to the canvas */
  drawPixelBuffer(buf: PixelBuffer, x: number = 0, y: number = 0, scale?: number): void {
    const cloned = new Uint8ClampedArray(buf.data.length);
    cloned.set(buf.data);
    const imageData = new ImageData(cloned, buf.width, buf.height);
    const s = scale ?? this.theme.pixel.pixelScale;

    if (s === 1) {
      this.ctx.putImageData(imageData, x, y);
    } else {
      // Draw to offscreen canvas then scale up with nearest-neighbor
      const off = new OffscreenCanvas(buf.width, buf.height);
      const offCtx = off.getContext('2d')!;
      offCtx.putImageData(imageData, 0, 0);

      this.ctx.save();
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(off, x, y, buf.width * s, buf.height * s);
      this.ctx.restore();
    }
  }

  /** Draw a neon polygon (for crystalline terrain) */
  drawNeonPolygon(points: [number, number][], color: RGBA, filled: boolean = false): void {
    if (points.length < 2) return;
    const ctx = this.ctx;
    const glow = this.theme.glow;

    ctx.save();
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.outerRadius;
    ctx.strokeStyle = rgbaToCss(color);
    ctx.lineWidth = this.theme.pixel.outlineThickness;
    ctx.lineJoin = 'miter';

    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();

    if (filled) {
      ctx.fillStyle = rgbaToCss(withAlpha(color, 0.08));
      ctx.fill();
    }

    ctx.stroke();
    ctx.restore();
  }

  /** Apply a full-screen glow/bloom post-process effect */
  applyBloom(intensity?: number): void {
    const ctx = this.ctx;
    const bloomIntensity = intensity ?? this.theme.glow.intensity * 0.3;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${this.theme.glow.outerRadius}px)`;
    ctx.globalAlpha = bloomIntensity;
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.restore();
  }
}
