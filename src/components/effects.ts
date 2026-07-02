import type { RGBA, ColorPalette } from '../style/types';
import { rgbaToCss, withAlpha } from '../style/colors';

/**
 * Reusable visual effects — ambient particles, scan lines, noise texture,
 * decorative geometry. These add the "sex appeal" detail that makes our
 * style feel rich and alive without being noisy.
 *
 * Every effect is a pure function: (ctx, params) → draws to canvas.
 * Generalizable across menus, HUDs, loading screens, etc.
 */

/** Floating ambient particles — slow-drifting dots of light */
export function drawAmbientParticles(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  color: RGBA,
  time: number,
  count: number = 25,
  seed: number = 0,
): void {
  ctx.save();
  for (let i = 0; i < count; i++) {
    // Deterministic pseudo-random positions (no Math.random — same every frame for consistency)
    const hash = (i * 7919 + seed * 104729) % 100000;
    const baseX = (hash % 1000) / 1000;
    const baseY = ((hash * 3) % 1000) / 1000;
    const speed = 0.3 + (hash % 100) / 200;
    const size = 0.5 + (hash % 50) / 30;
    const phase = (hash % 628) / 100;

    // Positive modulo so particles wrap instead of drifting off-screen
    const x = ((baseX * w + Math.sin(time * speed + phase) * 20 + time * 3) % w + w) % w;
    const y = ((baseY * h + Math.cos(time * speed * 0.7 + phase) * 15 - time * 2) % h + h) % h;
    const alpha = 0.15 + Math.sin(time * 1.5 + phase) * 0.1;

    ctx.shadowColor = rgbaToCss(withAlpha(color, alpha * 0.8));
    ctx.shadowBlur = size * 4;
    ctx.fillStyle = rgbaToCss(withAlpha(color, alpha));
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Subtle scan line overlay — CRT/retro feel */
export function drawScanLines(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  opacity: number = 0.03,
  spacing: number = 2,
): void {
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
  for (let y = 0; y < h; y += spacing * 2) {
    ctx.fillRect(0, y, w, spacing);
  }
  ctx.restore();
}

/** Fine dot grid pattern — adds texture without noise */
export function drawDotGrid(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  color: RGBA,
  spacing: number = 16,
  dotSize: number = 0.5,
): void {
  ctx.save();
  ctx.fillStyle = rgbaToCss(withAlpha(color, 0.06));
  for (let y = spacing; y < h; y += spacing) {
    for (let x = spacing; x < w; x += spacing) {
      ctx.fillRect(x, y, dotSize, dotSize);
    }
  }
  ctx.restore();
}

/** Horizontal accent bars — thin glowing lines at specific positions */
export function drawAccentBar(
  ctx: CanvasRenderingContext2D,
  w: number, y: number,
  color: RGBA,
  options?: {
    thickness?: number;
    fadeEdges?: boolean;
    glow?: boolean;
    dashPattern?: number[];
  },
): void {
  const thickness = options?.thickness ?? 1;
  const fadeEdges = options?.fadeEdges ?? true;
  const glow = options?.glow ?? true;

  ctx.save();

  if (fadeEdges) {
    const grad = ctx.createLinearGradient(0, y, w, y);
    grad.addColorStop(0, rgbaToCss(withAlpha(color, 0)));
    grad.addColorStop(0.1, rgbaToCss(withAlpha(color, 0.4)));
    grad.addColorStop(0.5, rgbaToCss(withAlpha(color, 0.6)));
    grad.addColorStop(0.9, rgbaToCss(withAlpha(color, 0.4)));
    grad.addColorStop(1, rgbaToCss(withAlpha(color, 0)));
    ctx.strokeStyle = grad;
  } else {
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.4));
  }

  if (glow) {
    ctx.shadowColor = rgbaToCss(withAlpha(color, 0.3));
    ctx.shadowBlur = 6;
  }

  ctx.lineWidth = thickness;
  if (options?.dashPattern) ctx.setLineDash(options.dashPattern);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();

  ctx.restore();
}

/** Corner flourish — decorative marks at screen corners */
export function drawCornerFlourish(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  color: RGBA,
  options?: {
    margin?: number;
    size?: number;
    style?: 'bracket' | 'crosshair' | 'ornate';
  },
): void {
  const margin = options?.margin ?? 20;
  const size = options?.size ?? 30;
  const style = options?.style ?? 'ornate';

  ctx.save();
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.2));
  ctx.shadowColor = rgbaToCss(withAlpha(color, 0.15));
  ctx.shadowBlur = 6;
  ctx.lineWidth = 1;

  const corners = [
    { x: margin, y: margin, dx: 1, dy: 1 },
    { x: w - margin, y: margin, dx: -1, dy: 1 },
    { x: margin, y: h - margin, dx: 1, dy: -1 },
    { x: w - margin, y: h - margin, dx: -1, dy: -1 },
  ];

  for (const c of corners) {
    if (style === 'bracket' || style === 'ornate') {
      // L-bracket
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + c.dy * size);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(c.x + c.dx * size, c.y);
      ctx.stroke();
    }

    if (style === 'ornate') {
      // Inner tick marks
      ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.12));
      ctx.lineWidth = 0.5;

      // Diagonal accent
      ctx.beginPath();
      ctx.moveTo(c.x + c.dx * 3, c.y + c.dy * 3);
      ctx.lineTo(c.x + c.dx * 10, c.y + c.dy * 10);
      ctx.stroke();

      // Small perpendicular ticks
      ctx.beginPath();
      ctx.moveTo(c.x + c.dx * size * 0.4, c.y);
      ctx.lineTo(c.x + c.dx * size * 0.4, c.y + c.dy * 4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(c.x, c.y + c.dy * size * 0.4);
      ctx.lineTo(c.x + c.dx * 4, c.y + c.dy * size * 0.4);
      ctx.stroke();

      // Corner dot
      ctx.fillStyle = rgbaToCss(withAlpha(color, 0.3));
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(c.x + c.dx * 2, c.y + c.dy * 2, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    if (style === 'crosshair') {
      const cs = size * 0.6;
      ctx.beginPath();
      ctx.moveTo(c.x - cs * c.dx * 0.3, c.y);
      ctx.lineTo(c.x + c.dx * cs, c.y);
      ctx.moveTo(c.x, c.y - cs * c.dy * 0.3);
      ctx.lineTo(c.x, c.y + c.dy * cs);
      ctx.stroke();
    }

    // Reset for next corner
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.2));
    ctx.lineWidth = 1;
  }

  ctx.restore();
}

/** Side rail decorations — vertical accent lines along edges */
export function drawSideRails(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  color: RGBA,
  options?: {
    margin?: number;
    tickSpacing?: number;
    tickLength?: number;
  },
): void {
  const margin = options?.margin ?? 15;
  const tickSpacing = options?.tickSpacing ?? 20;
  const tickLength = options?.tickLength ?? 4;

  ctx.save();
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.06));
  ctx.lineWidth = 0.5;

  // Vertical rails
  ctx.beginPath();
  ctx.moveTo(margin, 0);
  ctx.lineTo(margin, h);
  ctx.moveTo(w - margin, 0);
  ctx.lineTo(w - margin, h);
  ctx.stroke();

  // Tick marks
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.08));
  for (let y = tickSpacing; y < h; y += tickSpacing) {
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(margin + tickLength, y);
    ctx.moveTo(w - margin, y);
    ctx.lineTo(w - margin - tickLength, y);
    ctx.stroke();
  }

  ctx.restore();
}

/** Full-canvas post-process bloom pass */
export function canvasBloom(
  ctx: CanvasRenderingContext2D,
  passes?: { radius: number; intensity: number }[],
): void {
  const defaultPasses = [
    { radius: 16, intensity: 0.05 },
    { radius: 6, intensity: 0.06 },
  ];

  for (const pass of passes ?? defaultPasses) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${pass.radius}px)`;
    ctx.globalAlpha = pass.intensity;
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.restore();
  }
}
