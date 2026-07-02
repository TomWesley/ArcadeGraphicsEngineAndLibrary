import type { RGBA, ArcadeTheme } from '../style/types';
import { rgbaToCss, withAlpha } from '../style/colors';

/**
 * HUD panel components — borders, frames, and container elements
 * that tie the visual style together across all game UIs.
 */

export interface PanelOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: RGBA;
  title?: string;
  cornerStyle?: 'square' | 'clipped' | 'rounded';
  /** Corner clip/round size in pixels */
  cornerSize?: number;
  /** Whether to show scan lines */
  scanLines?: boolean;
  /** Background opacity (0-1) */
  bgOpacity?: number;
}

/** Draw a styled HUD panel/container */
export function drawPanel(
  ctx: CanvasRenderingContext2D,
  theme: ArcadeTheme,
  opts: PanelOptions,
): void {
  const { x, y, width, height } = opts;
  const color = opts.color ?? theme.palette.primary.core;
  const glow = theme.glow;
  const cornerStyle = opts.cornerStyle ?? 'clipped';
  const cs = opts.cornerSize ?? 12;
  const bgOpacity = opts.bgOpacity ?? 0.04;

  ctx.save();

  // Build panel path based on corner style
  ctx.beginPath();
  if (cornerStyle === 'clipped') {
    // Sci-fi clipped corners
    ctx.moveTo(x + cs, y);
    ctx.lineTo(x + width - cs, y);
    ctx.lineTo(x + width, y + cs);
    ctx.lineTo(x + width, y + height - cs);
    ctx.lineTo(x + width - cs, y + height);
    ctx.lineTo(x + cs, y + height);
    ctx.lineTo(x, y + height - cs);
    ctx.lineTo(x, y + cs);
    ctx.closePath();
  } else if (cornerStyle === 'rounded') {
    ctx.roundRect(x, y, width, height, cs);
  } else {
    ctx.rect(x, y, width, height);
  }

  // Background fill
  ctx.fillStyle = rgbaToCss(withAlpha(color, bgOpacity));
  ctx.fill();

  // Border with glow
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity * 0.5));
  ctx.shadowBlur = glow.outerRadius;
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.5));
  ctx.lineWidth = 1;
  ctx.stroke();

  // Inner border line (subtle)
  ctx.shadowBlur = 0;
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.1));
  ctx.lineWidth = 1;
  if (cornerStyle === 'clipped') {
    const inset = 3;
    ctx.beginPath();
    ctx.moveTo(x + cs + inset, y + inset);
    ctx.lineTo(x + width - cs - inset, y + inset);
    ctx.lineTo(x + width - inset, y + cs + inset);
    ctx.lineTo(x + width - inset, y + height - cs - inset);
    ctx.lineTo(x + width - cs - inset, y + height - inset);
    ctx.lineTo(x + cs + inset, y + height - inset);
    ctx.lineTo(x + inset, y + height - cs - inset);
    ctx.lineTo(x + inset, y + cs + inset);
    ctx.closePath();
    ctx.stroke();
  }

  // Corner accent marks
  const accentLen = cs * 0.6;
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.8));
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
  ctx.shadowBlur = glow.innerRadius;
  ctx.lineWidth = 2;

  // Top-left corner accent
  ctx.beginPath();
  ctx.moveTo(x, y + cs);
  ctx.lineTo(x + cs, y);
  ctx.stroke();

  // Top-right corner accent
  ctx.beginPath();
  ctx.moveTo(x + width - cs, y);
  ctx.lineTo(x + width, y + cs);
  ctx.stroke();

  // Scan lines
  if (opts.scanLines) {
    ctx.globalAlpha = 0.03;
    for (let sy = y; sy < y + height; sy += 3) {
      ctx.fillStyle = rgbaToCss(color);
      ctx.fillRect(x, sy, width, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Title bar
  if (opts.title) {
    const titleHeight = 24;

    // Title bar background
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.08));
    ctx.fillRect(x + 1, y + 1, width - 2, titleHeight);

    // Title bar bottom line
    ctx.beginPath();
    ctx.moveTo(x, y + titleHeight);
    ctx.lineTo(x + width, y + titleHeight);
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.3));
    ctx.lineWidth = 1;
    ctx.shadowBlur = 2;
    ctx.stroke();

    // Title text
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.innerRadius;
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.9));
    ctx.font = `10px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.title.toUpperCase(), x + cs + 4, y + titleHeight / 2);

    // Status dot
    ctx.beginPath();
    ctx.arc(x + width - 12, y + titleHeight / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(theme.palette.tertiary.core);
    ctx.shadowColor = rgbaToCss(withAlpha(theme.palette.tertiary.core, 0.8));
    ctx.shadowBlur = 6;
    ctx.fill();
  }

  ctx.restore();
}

/** Draw a horizontal divider line */
export function drawDivider(
  ctx: CanvasRenderingContext2D,
  theme: ArcadeTheme,
  x: number, y: number, width: number,
  color?: RGBA,
): void {
  const c = color ?? theme.palette.primary.core;
  ctx.save();

  // Main line
  const grad = ctx.createLinearGradient(x, y, x + width, y);
  grad.addColorStop(0, rgbaToCss(withAlpha(c, 0)));
  grad.addColorStop(0.2, rgbaToCss(withAlpha(c, 0.4)));
  grad.addColorStop(0.5, rgbaToCss(withAlpha(c, 0.6)));
  grad.addColorStop(0.8, rgbaToCss(withAlpha(c, 0.4)));
  grad.addColorStop(1, rgbaToCss(withAlpha(c, 0)));
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.shadowColor = rgbaToCss(withAlpha(c, theme.glow.intensity * 0.3));
  ctx.shadowBlur = theme.glow.innerRadius;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();

  ctx.restore();
}

/** Draw a grid overlay (like the HUD grid in the reference) */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  theme: ArcadeTheme,
  x: number, y: number, width: number, height: number,
  cellSize: number = 40,
  color?: RGBA,
): void {
  const c = color ?? theme.palette.primary.core;
  ctx.save();

  ctx.strokeStyle = rgbaToCss(withAlpha(c, 0.04));
  ctx.lineWidth = 1;

  for (let gx = x; gx <= x + width; gx += cellSize) {
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + height);
    ctx.stroke();
  }
  for (let gy = y; gy <= y + height; gy += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + width, gy);
    ctx.stroke();
  }

  ctx.restore();
}
