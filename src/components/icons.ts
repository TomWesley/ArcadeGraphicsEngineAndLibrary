import type { RGBA, NeonColor, ColorPalette } from '../style/types';
import { rgbaToCss, withAlpha } from '../style/colors';

/**
 * Icon system — renders common game/app icons in the neon arcade style.
 *
 * Each icon is a pure function that draws to a Canvas2D context.
 * Icons are resolution-independent (drawn relative to a given size).
 * All icons use the same glow/outline treatment for visual consistency.
 *
 * Usage:
 *   drawIcon(ctx, 'play', 100, 100, 32, palette.primary);
 */

export type IconName =
  | 'play' | 'pause' | 'stop'
  | 'arrow-right' | 'arrow-left' | 'arrow-up' | 'arrow-down'
  | 'leaderboard' | 'trophy'
  | 'star' | 'heart' | 'shield'
  | 'lightning' | 'gear' | 'home'
  | 'sword' | 'potion' | 'coin'
  | 'skull' | 'crown';

interface IconContext {
  ctx: CanvasRenderingContext2D;
  cx: number;
  cy: number;
  size: number;
  color: RGBA;
  /** Shorthand unit = size/32, so designs work at any resolution */
  u: number;
}

type IconDrawFn = (ic: IconContext) => void;

// ── Shared icon rendering setup ──────────────────────────────────────

function setupIconGlow(ctx: CanvasRenderingContext2D, color: RGBA, intensity: number = 0.7): void {
  ctx.shadowColor = rgbaToCss(withAlpha(color, intensity));
  ctx.shadowBlur = 8;
  ctx.strokeStyle = rgbaToCss(color);
  ctx.fillStyle = rgbaToCss(color);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function iconOutline(ctx: CanvasRenderingContext2D, color: RGBA, lineWidth: number = 1.5): void {
  ctx.shadowColor = rgbaToCss(withAlpha(color, 0.7));
  ctx.shadowBlur = 8;
  ctx.strokeStyle = rgbaToCss(color);
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function iconFill(ctx: CanvasRenderingContext2D, color: RGBA, opacity: number = 0.08): void {
  ctx.fillStyle = rgbaToCss(withAlpha(color, opacity));
}

// ── Icon definitions ─────────────────────────────────────────────────

const ICONS: Record<IconName, IconDrawFn> = {
  play: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.5);
    ctx.beginPath();
    ctx.moveTo(cx - u * 5, cy - u * 7);
    ctx.lineTo(cx + u * 8, cy);
    ctx.lineTo(cx - u * 5, cy + u * 7);
    ctx.closePath();
    iconFill(ctx, color, 0.1);
    ctx.fill();
    ctx.stroke();
  },

  pause: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.5);
    const barW = u * 3.5, barH = u * 12, gap = u * 2.5;
    // Left bar
    ctx.beginPath();
    ctx.rect(cx - gap - barW, cy - barH / 2, barW, barH);
    iconFill(ctx, color, 0.1); ctx.fill(); ctx.stroke();
    // Right bar
    ctx.beginPath();
    ctx.rect(cx + gap, cy - barH / 2, barW, barH);
    ctx.fill(); ctx.stroke();
  },

  stop: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.5);
    const s = u * 11;
    ctx.beginPath();
    ctx.rect(cx - s / 2, cy - s / 2, s, s);
    iconFill(ctx, color, 0.1); ctx.fill(); ctx.stroke();
  },

  'arrow-right': ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.5);
    // Shaft
    ctx.beginPath();
    ctx.moveTo(cx - u * 8, cy);
    ctx.lineTo(cx + u * 4, cy);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.moveTo(cx + u * 1, cy - u * 5);
    ctx.lineTo(cx + u * 8, cy);
    ctx.lineTo(cx + u * 1, cy + u * 5);
    ctx.stroke();
    // Dot at tip
    ctx.fillStyle = rgbaToCss(color);
    ctx.beginPath(); ctx.arc(cx + u * 8, cy, u * 0.8, 0, Math.PI * 2); ctx.fill();
  },

  'arrow-left': ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.5);
    ctx.beginPath();
    ctx.moveTo(cx + u * 8, cy);
    ctx.lineTo(cx - u * 4, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - u * 1, cy - u * 5);
    ctx.lineTo(cx - u * 8, cy);
    ctx.lineTo(cx - u * 1, cy + u * 5);
    ctx.stroke();
    ctx.fillStyle = rgbaToCss(color);
    ctx.beginPath(); ctx.arc(cx - u * 8, cy, u * 0.8, 0, Math.PI * 2); ctx.fill();
  },

  'arrow-up': ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.5);
    ctx.beginPath(); ctx.moveTo(cx, cy + u * 8); ctx.lineTo(cx, cy - u * 4); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - u * 5, cy - u * 1); ctx.lineTo(cx, cy - u * 8); ctx.lineTo(cx + u * 5, cy - u * 1);
    ctx.stroke();
    ctx.fillStyle = rgbaToCss(color);
    ctx.beginPath(); ctx.arc(cx, cy - u * 8, u * 0.8, 0, Math.PI * 2); ctx.fill();
  },

  'arrow-down': ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.5);
    ctx.beginPath(); ctx.moveTo(cx, cy - u * 8); ctx.lineTo(cx, cy + u * 4); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - u * 5, cy + u * 1); ctx.lineTo(cx, cy + u * 8); ctx.lineTo(cx + u * 5, cy + u * 1);
    ctx.stroke();
    ctx.fillStyle = rgbaToCss(color);
    ctx.beginPath(); ctx.arc(cx, cy + u * 8, u * 0.8, 0, Math.PI * 2); ctx.fill();
  },

  leaderboard: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.3);
    // Three bars (podium chart)
    const bars = [
      { x: cx - u * 7, h: u * 8, rank: '3' },
      { x: cx - u * 2.5, h: u * 14, rank: '1' },
      { x: cx + u * 2, h: u * 11, rank: '2' },
    ];
    const barW = u * 4.5;
    const bottom = cy + u * 8;
    for (const bar of bars) {
      ctx.beginPath();
      ctx.rect(bar.x, bottom - bar.h, barW, bar.h);
      iconFill(ctx, color, bar.rank === '1' ? 0.15 : 0.06);
      ctx.fill(); ctx.stroke();
      // Rank number
      ctx.fillStyle = rgbaToCss(withAlpha(color, bar.rank === '1' ? 0.9 : 0.5));
      ctx.font = `${u * 3}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(bar.rank, bar.x + barW / 2, bottom - bar.h + u * 3);
    }
    // Base line
    ctx.beginPath(); ctx.moveTo(cx - u * 9, bottom); ctx.lineTo(cx + u * 9, bottom); ctx.stroke();
  },

  trophy: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.3);
    // Cup body
    ctx.beginPath();
    ctx.moveTo(cx - u * 6, cy - u * 7);
    ctx.lineTo(cx + u * 6, cy - u * 7);
    ctx.bezierCurveTo(cx + u * 6, cy, cx + u * 4, cy + u * 3, cx + u * 2, cy + u * 4);
    ctx.lineTo(cx - u * 2, cy + u * 4);
    ctx.bezierCurveTo(cx - u * 4, cy + u * 3, cx - u * 6, cy, cx - u * 6, cy - u * 7);
    ctx.closePath();
    iconFill(ctx, color, 0.1); ctx.fill(); ctx.stroke();
    // Handles
    ctx.beginPath();
    ctx.moveTo(cx - u * 6, cy - u * 5);
    ctx.bezierCurveTo(cx - u * 10, cy - u * 5, cx - u * 10, cy + u * 1, cx - u * 6, cy + u * 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + u * 6, cy - u * 5);
    ctx.bezierCurveTo(cx + u * 10, cy - u * 5, cx + u * 10, cy + u * 1, cx + u * 6, cy + u * 1);
    ctx.stroke();
    // Stem and base
    ctx.beginPath();
    ctx.moveTo(cx, cy + u * 4); ctx.lineTo(cx, cy + u * 7); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - u * 4, cy + u * 7); ctx.lineTo(cx + u * 4, cy + u * 7); ctx.stroke();
    ctx.moveTo(cx - u * 5, cy + u * 8); ctx.lineTo(cx + u * 5, cy + u * 8); ctx.stroke();
    // Star on cup
    drawMiniStar(ctx, cx, cy - u * 3, u * 2.5, color);
  },

  star: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.3);
    drawStarPath(ctx, cx, cy, u * 9, u * 4, 5);
    iconFill(ctx, color, 0.1); ctx.fill(); ctx.stroke();
  },

  heart: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.3);
    ctx.beginPath();
    ctx.moveTo(cx, cy + u * 7);
    ctx.bezierCurveTo(cx - u * 14, cy - u * 2, cx - u * 5, cy - u * 10, cx, cy - u * 4);
    ctx.bezierCurveTo(cx + u * 5, cy - u * 10, cx + u * 14, cy - u * 2, cx, cy + u * 7);
    ctx.closePath();
    iconFill(ctx, color, 0.12); ctx.fill(); ctx.stroke();
    // Highlight
    ctx.beginPath();
    ctx.arc(cx - u * 3, cy - u * 4, u * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.25)); ctx.fill();
  },

  shield: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.3);
    ctx.beginPath();
    ctx.moveTo(cx, cy - u * 9);
    ctx.lineTo(cx + u * 8, cy - u * 5);
    ctx.lineTo(cx + u * 8, cy + u * 1);
    ctx.bezierCurveTo(cx + u * 7, cy + u * 6, cx + u * 3, cy + u * 9, cx, cy + u * 10);
    ctx.bezierCurveTo(cx - u * 3, cy + u * 9, cx - u * 7, cy + u * 6, cx - u * 8, cy + u * 1);
    ctx.lineTo(cx - u * 8, cy - u * 5);
    ctx.closePath();
    iconFill(ctx, color, 0.08); ctx.fill(); ctx.stroke();
    // Cross emblem
    ctx.lineWidth = u * 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - u * 4); ctx.lineTo(cx, cy + u * 4); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - u * 3, cy - u * 1); ctx.lineTo(cx + u * 3, cy - u * 1); ctx.stroke();
  },

  lightning: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.3);
    ctx.beginPath();
    ctx.moveTo(cx + u * 2, cy - u * 10);
    ctx.lineTo(cx - u * 3, cy - u * 1);
    ctx.lineTo(cx + u * 1, cy - u * 1);
    ctx.lineTo(cx - u * 2, cy + u * 10);
    ctx.lineTo(cx + u * 3, cy + u * 1);
    ctx.lineTo(cx - u * 1, cy + u * 1);
    ctx.closePath();
    iconFill(ctx, color, 0.15); ctx.fill(); ctx.stroke();
  },

  gear: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.2);
    const teeth = 8;
    const outerR = u * 9;
    const innerR = u * 6.5;
    const toothW = Math.PI / teeth * 0.6;

    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;
      const a1 = angle - toothW;
      const a2 = angle + toothW;
      ctx.lineTo(cx + Math.cos(a1) * innerR, cy + Math.sin(a1) * innerR);
      ctx.lineTo(cx + Math.cos(a1) * outerR, cy + Math.sin(a1) * outerR);
      ctx.lineTo(cx + Math.cos(a2) * outerR, cy + Math.sin(a2) * outerR);
      ctx.lineTo(cx + Math.cos(a2) * innerR, cy + Math.sin(a2) * innerR);
    }
    ctx.closePath();
    iconFill(ctx, color, 0.06); ctx.fill(); ctx.stroke();
    // Center circle
    ctx.beginPath(); ctx.arc(cx, cy, u * 3, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.05)); ctx.fill(); ctx.stroke();
    // Center dot
    ctx.beginPath(); ctx.arc(cx, cy, u * 1, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.4)); ctx.fill();
  },

  home: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.3);
    // Roof
    ctx.beginPath();
    ctx.moveTo(cx, cy - u * 9);
    ctx.lineTo(cx + u * 9, cy - u * 1);
    ctx.lineTo(cx + u * 7, cy - u * 1);
    ctx.lineTo(cx + u * 7, cy + u * 8);
    ctx.lineTo(cx - u * 7, cy + u * 8);
    ctx.lineTo(cx - u * 7, cy - u * 1);
    ctx.lineTo(cx - u * 9, cy - u * 1);
    ctx.closePath();
    iconFill(ctx, color, 0.08); ctx.fill(); ctx.stroke();
    // Door
    ctx.beginPath();
    ctx.rect(cx - u * 2, cy + u * 1, u * 4, u * 7);
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.15)); ctx.fill();
    ctx.stroke();
    // Window
    ctx.beginPath();
    ctx.rect(cx + u * 2.5, cy + u * 0, u * 3, u * 3);
    ctx.stroke();
  },

  sword: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.2);
    // Blade
    ctx.beginPath();
    ctx.moveTo(cx, cy - u * 10);
    ctx.lineTo(cx + u * 2, cy + u * 2);
    ctx.lineTo(cx, cy + u * 3);
    ctx.lineTo(cx - u * 2, cy + u * 2);
    ctx.closePath();
    iconFill(ctx, color, 0.1); ctx.fill(); ctx.stroke();
    // Guard
    ctx.beginPath();
    ctx.moveTo(cx - u * 5, cy + u * 3);
    ctx.lineTo(cx + u * 5, cy + u * 3);
    ctx.lineWidth = u * 1.5; ctx.stroke();
    // Handle
    ctx.lineWidth = u * 1.3;
    ctx.beginPath(); ctx.moveTo(cx, cy + u * 3); ctx.lineTo(cx, cy + u * 8); ctx.stroke();
    // Pommel
    ctx.beginPath(); ctx.arc(cx, cy + u * 9, u * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.3)); ctx.fill(); ctx.stroke();
  },

  potion: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.2);
    // Bottle body
    ctx.beginPath();
    ctx.moveTo(cx - u * 2.5, cy - u * 3);
    ctx.bezierCurveTo(cx - u * 6, cy, cx - u * 6, cy + u * 5, cx - u * 5, cy + u * 8);
    ctx.bezierCurveTo(cx - u * 4, cy + u * 10, cx + u * 4, cy + u * 10, cx + u * 5, cy + u * 8);
    ctx.bezierCurveTo(cx + u * 6, cy + u * 5, cx + u * 6, cy, cx + u * 2.5, cy - u * 3);
    ctx.closePath();
    iconFill(ctx, color, 0.12); ctx.fill(); ctx.stroke();
    // Neck
    ctx.beginPath();
    ctx.rect(cx - u * 2, cy - u * 7, u * 4, u * 4.5);
    iconFill(ctx, color, 0.06); ctx.fill(); ctx.stroke();
    // Cork
    ctx.beginPath();
    ctx.rect(cx - u * 2.5, cy - u * 9, u * 5, u * 2.5);
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.2)); ctx.fill(); ctx.stroke();
    // Liquid level line
    ctx.beginPath();
    ctx.moveTo(cx - u * 4.5, cy + u * 2);
    ctx.bezierCurveTo(cx - u * 2, cy + u * 1, cx + u * 2, cy + u * 3, cx + u * 4.5, cy + u * 2);
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.4));
    ctx.lineWidth = u * 0.7; ctx.stroke();
    // Bubble
    ctx.beginPath(); ctx.arc(cx - u * 1, cy + u * 5, u * 1, 0, Math.PI * 2);
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.3)); ctx.lineWidth = u * 0.5; ctx.stroke();
  },

  coin: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.3);
    // Outer circle
    ctx.beginPath(); ctx.arc(cx, cy, u * 8, 0, Math.PI * 2);
    iconFill(ctx, color, 0.08); ctx.fill(); ctx.stroke();
    // Inner circle
    ctx.beginPath(); ctx.arc(cx, cy, u * 5.5, 0, Math.PI * 2);
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.5)); ctx.lineWidth = u * 0.7; ctx.stroke();
    // Dollar/currency mark
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.8));
    ctx.font = `bold ${u * 8}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', cx, cy + u * 0.5);
  },

  skull: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.2);
    // Cranium
    ctx.beginPath();
    ctx.arc(cx, cy - u * 2, u * 7, Math.PI, 0);
    ctx.lineTo(cx + u * 7, cy + u * 2);
    ctx.bezierCurveTo(cx + u * 7, cy + u * 5, cx + u * 4, cy + u * 6, cx + u * 3, cy + u * 6);
    ctx.lineTo(cx - u * 3, cy + u * 6);
    ctx.bezierCurveTo(cx - u * 4, cy + u * 6, cx - u * 7, cy + u * 5, cx - u * 7, cy + u * 2);
    ctx.closePath();
    iconFill(ctx, color, 0.08); ctx.fill(); ctx.stroke();
    // Eyes
    ctx.beginPath(); ctx.arc(cx - u * 3, cy - u * 1, u * 2, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.2)); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + u * 3, cy - u * 1, u * 2, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Nose
    ctx.beginPath();
    ctx.moveTo(cx, cy + u * 1); ctx.lineTo(cx - u * 1, cy + u * 3); ctx.lineTo(cx + u * 1, cy + u * 3);
    ctx.closePath(); ctx.stroke();
    // Jaw/teeth
    ctx.beginPath();
    ctx.moveTo(cx - u * 4, cy + u * 6); ctx.lineTo(cx - u * 4, cy + u * 9);
    ctx.lineTo(cx + u * 4, cy + u * 9); ctx.lineTo(cx + u * 4, cy + u * 6);
    iconFill(ctx, color, 0.05); ctx.fill(); ctx.stroke();
    // Tooth lines
    for (let i = -3; i <= 3; i += 2) {
      ctx.beginPath(); ctx.moveTo(cx + u * i, cy + u * 6); ctx.lineTo(cx + u * i, cy + u * 9);
      ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.3)); ctx.lineWidth = u * 0.5; ctx.stroke();
    }
  },

  crown: ({ ctx, cx, cy, u, color }) => {
    iconOutline(ctx, color, u * 1.3);
    ctx.beginPath();
    ctx.moveTo(cx - u * 8, cy + u * 5);
    ctx.lineTo(cx - u * 8, cy - u * 3);
    ctx.lineTo(cx - u * 4, cy + u * 1);
    ctx.lineTo(cx, cy - u * 7);
    ctx.lineTo(cx + u * 4, cy + u * 1);
    ctx.lineTo(cx + u * 8, cy - u * 3);
    ctx.lineTo(cx + u * 8, cy + u * 5);
    ctx.closePath();
    iconFill(ctx, color, 0.1); ctx.fill(); ctx.stroke();
    // Base band
    ctx.beginPath();
    ctx.rect(cx - u * 8, cy + u * 5, u * 16, u * 3);
    iconFill(ctx, color, 0.08); ctx.fill(); ctx.stroke();
    // Gems on points
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.5));
    ctx.beginPath(); ctx.arc(cx, cy - u * 6, u * 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - u * 7.5, cy - u * 2.5, u * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + u * 7.5, cy - u * 2.5, u * 0.8, 0, Math.PI * 2); ctx.fill();
  },
};

// ── Helper shapes ────────────────────────────────────────────────────

function drawStarPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number, points: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawMiniStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: RGBA): void {
  ctx.save();
  ctx.fillStyle = rgbaToCss(withAlpha(color, 0.6));
  ctx.shadowColor = rgbaToCss(withAlpha(color, 0.4));
  ctx.shadowBlur = 4;
  drawStarPath(ctx, cx, cy, size, size * 0.4, 5);
  ctx.fill();
  ctx.restore();
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Draw a named icon at the given position and size.
 *
 * @param ctx - Canvas 2D context
 * @param name - Icon identifier
 * @param cx - Center X position
 * @param cy - Center Y position
 * @param size - Icon size in pixels (width = height = size)
 * @param color - Neon color for the icon
 */
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: IconName,
  cx: number, cy: number,
  size: number,
  color: RGBA,
): void {
  const fn = ICONS[name];
  if (!fn) return;

  ctx.save();
  fn({ ctx, cx, cy, size, color, u: size / 32 });
  ctx.restore();
}

/** Get list of all available icon names */
export function getIconNames(): IconName[] {
  return Object.keys(ICONS) as IconName[];
}

/** Draw an icon with a circular background frame */
export function drawFramedIcon(
  ctx: CanvasRenderingContext2D,
  name: IconName,
  cx: number, cy: number,
  size: number,
  color: RGBA,
  options?: { frameStyle?: 'circle' | 'square' | 'diamond'; frameOpacity?: number },
): void {
  const style = options?.frameStyle ?? 'circle';
  const frameOp = options?.frameOpacity ?? 0.08;
  const r = size * 0.6;

  ctx.save();

  // Frame
  ctx.shadowColor = rgbaToCss(withAlpha(color, 0.3));
  ctx.shadowBlur = 10;
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.25));
  ctx.lineWidth = 1;

  if (style === 'circle') {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(withAlpha(color, frameOp));
    ctx.fill(); ctx.stroke();
  } else if (style === 'square') {
    const clip = size * 0.1;
    ctx.beginPath();
    ctx.moveTo(cx - r + clip, cy - r);
    ctx.lineTo(cx + r - clip, cy - r);
    ctx.lineTo(cx + r, cy - r + clip);
    ctx.lineTo(cx + r, cy + r - clip);
    ctx.lineTo(cx + r - clip, cy + r);
    ctx.lineTo(cx - r + clip, cy + r);
    ctx.lineTo(cx - r, cy + r - clip);
    ctx.lineTo(cx - r, cy - r + clip);
    ctx.closePath();
    ctx.fillStyle = rgbaToCss(withAlpha(color, frameOp));
    ctx.fill(); ctx.stroke();
  } else if (style === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fillStyle = rgbaToCss(withAlpha(color, frameOp));
    ctx.fill(); ctx.stroke();
  }

  ctx.restore();

  // Draw icon on top
  drawIcon(ctx, name, cx, cy, size * 0.7, color);
}
