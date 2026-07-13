import type { RGBA, ArcadeTheme } from '../style/types';
import { rgbaToCss, withAlpha, lerpColor } from '../style/colors';
import { typeCase } from '../style/typography';

/**
 * Canvas-drawn button — the themed control primitive for games that render
 * their whole UI on canvas (the HTML counterpart is the injected
 * `.arcade-btn` class).
 *
 * The engine draws; the game owns input. Track pointer position, derive the
 * state, and redraw:
 *
 *   const btn = { x: 40, y: 200, width: 220, height: 44, label: 'Launch Mission' };
 *   const state = isPointInButton(btn, mx, my) ? (mouseDown ? 'active' : 'hover') : 'idle';
 *   drawCanvasButton(ctx, theme, { ...btn, state, accent: true });
 */

export type CanvasButtonState = 'idle' | 'hover' | 'active' | 'disabled';

export interface CanvasButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  state?: CanvasButtonState;
  /** Emphasized primary-action treatment (brighter border + resting glow) */
  accent?: boolean;
  /** Override color (defaults to the palette primary) */
  color?: RGBA;
}

export function drawCanvasButton(
  ctx: CanvasRenderingContext2D,
  theme: ArcadeTheme,
  opts: CanvasButtonOptions,
): void {
  const { x, y, width, height, label } = opts;
  const state = opts.state ?? 'idle';
  const color = opts.color ?? theme.palette.primary.core;
  const glow = theme.glow;
  const disabled = state === 'disabled';
  const hover = state === 'hover';
  const active = state === 'active';
  const cs = Math.min(8, height * 0.25);   // corner clip

  ctx.save();
  if (disabled) ctx.globalAlpha = 0.35;
  // Pressed: a subtle sink, never a bounce
  if (active) ctx.translate(0, 1);

  // Clipped-corner body path
  const body = (): void => {
    ctx.beginPath();
    ctx.moveTo(x + cs, y);
    ctx.lineTo(x + width - cs, y);
    ctx.lineTo(x + width, y + cs);
    ctx.lineTo(x + width, y + height - cs);
    ctx.lineTo(x + width - cs, y + height);
    ctx.lineTo(x + cs, y + height);
    ctx.lineTo(x, y + height - cs);
    ctx.lineTo(x, y + cs);
    ctx.closePath();
  };

  // Gradient fill — brighter under the pointer
  const lift = hover || active ? 0.09 : 0.05;
  const grad = ctx.createLinearGradient(x, y, x, y + height);
  grad.addColorStop(0, `rgba(255,255,255,${lift})`);
  grad.addColorStop(0.45, 'rgba(255,255,255,0.012)');
  grad.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = `rgba(10, 10, 16, 0.5)`;
  body(); ctx.fill();
  ctx.fillStyle = grad;
  body(); ctx.fill();

  // Border with selective glow
  const borderAlpha = hover || active || opts.accent ? 0.9 : 0.4;
  if (hover || active || opts.accent) {
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity * (hover ? 1 : 0.5)));
    ctx.shadowBlur = glow.outerRadius * (hover ? 1 : 0.6);
  }
  ctx.strokeStyle = rgbaToCss(withAlpha(color, borderAlpha));
  ctx.lineWidth = 1.5;
  body(); ctx.stroke();
  ctx.shadowBlur = 0;

  // Left edge accent bar
  ctx.fillStyle = rgbaToCss(withAlpha(color, hover || active ? 0.95 : 0.5));
  ctx.fillRect(x, y + height * 0.22, 2.5, height * 0.56);

  // Top catch-light
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.28));
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + cs + 4, y + 0.5);
  ctx.lineTo(x + width - cs - 4, y + 0.5);
  ctx.stroke();

  // Label — the type kit's `label` role, sized to the button
  const size = Math.max(11, Math.min(16, height * 0.36));
  ctx.font = `600 ${size}px "Rajdhani", "Segoe UI", sans-serif`;
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${(0.14 * size).toFixed(2)}px`;
  } catch { /* older canvas implementations */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textColor = hover || active
    ? lerpColor(color, [255, 255, 255, 1], 0.35)
    : color;
  if (hover) {
    ctx.shadowColor = rgbaToCss(withAlpha(color, 0.5));
    ctx.shadowBlur = 6;
  }
  ctx.fillStyle = rgbaToCss(textColor);
  ctx.fillText(typeCase('label', label), x + width / 2, y + height / 2 + 1);

  ctx.restore();
}

/** Pointer hit test for a button (or any rect-shaped control). */
export function isPointInButton(
  rect: { x: number; y: number; width: number; height: number },
  px: number,
  py: number,
): boolean {
  return px >= rect.x && px <= rect.x + rect.width &&
         py >= rect.y && py <= rect.y + rect.height;
}
