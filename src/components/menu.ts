import type { RGBA, ArcadeTheme, NeonColor, ColorPalette } from '../style/types';
import { rgbaToCss, withAlpha, lerpColor } from '../style/colors';
import { SPEC } from '../style/spec';

/**
 * Menu generation system — takes semantic descriptions and produces
 * fully styled game menus in our neon arcade aesthetic.
 *
 * Usage:
 *   renderMenu(ctx, {
 *     title: 'DRAGON QUEST',
 *     items: ['NEW GAME', 'CONTINUE', 'OPTIONS', 'QUIT'],
 *     selectedIndex: 0,
 *   }, theme);
 *
 * The menu renderer handles all styling decisions:
 * - Layout and spacing
 * - Neon text rendering with glow
 * - Button/selection highlight treatment
 * - Background effects
 * - Animations (pulse, scanlines)
 */

// ── Menu Configuration ───────────────────────────────────────────────

export interface MenuConfig {
  /** Game title text */
  title?: string;
  /** Subtitle or tagline */
  subtitle?: string;
  /** Menu items (button labels) */
  items: string[];
  /** Currently selected item index (-1 = none) */
  selectedIndex?: number;
  /** Overall menu width (auto-calculated if omitted) */
  width?: number;
  /** Layout style */
  layout?: 'center' | 'left' | 'right';
  /** Whether to show decorative elements */
  decorations?: boolean;
  /** Whether to animate (glow pulse, scanlines) */
  animated?: boolean;
  /** Animation time in seconds (for pulsing effects) */
  time?: number;
  /** Footer text (e.g. "PRESS START", copyright) */
  footer?: string;
  /** Background style */
  background?: 'solid' | 'grid' | 'vignette' | 'none';
}

// ── Internal Layout Constants ────────────────────────────────────────

const LAYOUT = {
  titleFontSize: 28,
  subtitleFontSize: 10,
  itemFontSize: 12,
  footerFontSize: 8,
  itemHeight: 40,
  itemPaddingX: 30,
  itemPaddingY: 8,
  titleMarginBottom: 20,
  subtitleMarginBottom: 30,
  itemGap: 6,
  footerMarginTop: 40,
  cornerClipSize: 8,
  minWidth: 280,
  sideMargin: 60,
} as const;

// ── Drawing Helpers ──────────────────────────────────────────────────

function neonText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  color: RGBA, fontSize: number,
  options?: { align?: CanvasTextAlign; glow?: number; font?: string },
) {
  const glow = options?.glow ?? 0.7;
  const font = options?.font ?? '"Press Start 2P", monospace';
  ctx.save();
  ctx.font = `${fontSize}px ${font}`;
  ctx.textAlign = options?.align ?? 'center';
  ctx.textBaseline = 'middle';

  // Glow passes (outer to inner)
  const passes = [
    { blur: 20, alpha: glow * 0.15 },
    { blur: 10, alpha: glow * 0.3 },
    { blur: 4, alpha: glow * 0.5 },
    { blur: 0, alpha: 1.0 },
  ];

  for (const pass of passes) {
    ctx.shadowColor = rgbaToCss(withAlpha(color, pass.alpha));
    ctx.shadowBlur = pass.blur;
    ctx.fillStyle = rgbaToCss(pass.blur === 0 ? color : withAlpha(color, pass.alpha));
    ctx.fillText(text, x, y);
  }

  ctx.restore();
}

function clippedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  clip: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + clip, y);
  ctx.lineTo(x + w - clip, y);
  ctx.lineTo(x + w, y + clip);
  ctx.lineTo(x + w, y + h - clip);
  ctx.lineTo(x + w - clip, y + h);
  ctx.lineTo(x + clip, y + h);
  ctx.lineTo(x, y + h - clip);
  ctx.lineTo(x, y + clip);
  ctx.closePath();
}

function drawMenuButton(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  label: string,
  color: RGBA,
  isSelected: boolean,
  time: number,
) {
  const clip = LAYOUT.cornerClipSize;
  const pulse = isSelected ? 0.5 + Math.sin(time * 4) * 0.15 : 0;

  ctx.save();

  // Button background
  clippedRect(ctx, x, y, w, h, clip);
  if (isSelected) {
    const bgAlpha = 0.08 + pulse * 0.04;
    ctx.fillStyle = rgbaToCss(withAlpha(color, bgAlpha));
    ctx.fill();
  }

  // Button border
  clippedRect(ctx, x, y, w, h, clip);
  ctx.shadowColor = rgbaToCss(withAlpha(color, isSelected ? 0.6 + pulse : 0.15));
  ctx.shadowBlur = isSelected ? 12 : 4;
  ctx.strokeStyle = rgbaToCss(withAlpha(color, isSelected ? 0.8 + pulse * 0.2 : 0.2));
  ctx.lineWidth = isSelected ? 1.5 : 0.5;
  ctx.stroke();

  // Corner accents (only on selected)
  if (isSelected) {
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.9));
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + clip);
    ctx.lineTo(x + clip, y);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + w - clip, y);
    ctx.lineTo(x + w, y + clip);
    ctx.stroke();

    // Selection indicator arrow
    ctx.shadowBlur = 10;
    ctx.fillStyle = rgbaToCss(color);
    ctx.beginPath();
    ctx.moveTo(x + 12, y + h / 2);
    ctx.lineTo(x + 18, y + h / 2 - 4);
    ctx.lineTo(x + 18, y + h / 2 + 4);
    ctx.closePath();
    ctx.fill();
  }

  // Label text
  const textColor = isSelected
    ? color
    : withAlpha(color, 0.4);
  const textGlow = isSelected ? 0.8 + pulse * 0.2 : 0.1;

  neonText(ctx, label, x + w / 2, y + h / 2, textColor, LAYOUT.itemFontSize, {
    glow: textGlow,
  });

  // Scanline effect on selected
  if (isSelected) {
    ctx.globalAlpha = 0.03;
    for (let sy = y; sy < y + h; sy += 2) {
      ctx.fillStyle = rgbaToCss(color);
      ctx.fillRect(x, sy, w, 1);
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ── Background Renderers ─────────────────────────────────────────────

function drawGridBackground(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  color: RGBA,
) {
  ctx.save();
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.03));
  ctx.lineWidth = 0.5;
  const cellSize = 30;
  for (let x = 0; x <= w; x += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawVignette(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  strength: number = 0.4,
) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawDecoLines(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  color: RGBA,
  y: number,
) {
  ctx.save();
  // Horizontal divider with fade
  const grad = ctx.createLinearGradient(0, y, w, y);
  grad.addColorStop(0, rgbaToCss(withAlpha(color, 0)));
  grad.addColorStop(0.15, rgbaToCss(withAlpha(color, 0.3)));
  grad.addColorStop(0.5, rgbaToCss(withAlpha(color, 0.5)));
  grad.addColorStop(0.85, rgbaToCss(withAlpha(color, 0.3)));
  grad.addColorStop(1, rgbaToCss(withAlpha(color, 0)));
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.shadowColor = rgbaToCss(withAlpha(color, 0.3));
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();

  // Small diamond at center
  const cx = w / 2;
  ctx.fillStyle = rgbaToCss(withAlpha(color, 0.6));
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(cx, y - 4);
  ctx.lineTo(cx + 4, y);
  ctx.lineTo(cx, y + 4);
  ctx.lineTo(cx - 4, y);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ── Main Menu Renderer ───────────────────────────────────────────────

/**
 * Render a complete game menu from a semantic configuration.
 * Handles all layout, styling, and animation automatically.
 */
export function renderMenu(
  ctx: CanvasRenderingContext2D,
  config: MenuConfig,
  palette: ColorPalette,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const {
    title, subtitle, items, footer,
    selectedIndex = 0,
    layout = 'center',
    decorations = true,
    animated = true,
    time = 0,
    background = 'vignette',
  } = config;

  const primary = palette.primary;
  const secondary = palette.secondary;
  const tertiary = palette.tertiary;

  // ── Background ──
  ctx.fillStyle = rgbaToCss(palette.background);
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = rgbaToCss(palette.backgroundTint);
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (background === 'grid') {
    drawGridBackground(ctx, canvasWidth, canvasHeight, primary.core);
  }
  if (background === 'vignette' || background === 'grid') {
    drawVignette(ctx, canvasWidth, canvasHeight, 0.5);
  }

  // ── Calculate layout ──
  const menuWidth = config.width ?? Math.max(LAYOUT.minWidth, canvasWidth * 0.4);
  let centerX: number;
  if (layout === 'left') centerX = LAYOUT.sideMargin + menuWidth / 2;
  else if (layout === 'right') centerX = canvasWidth - LAYOUT.sideMargin - menuWidth / 2;
  else centerX = canvasWidth / 2;

  let curY = canvasHeight * 0.12;

  // ── Title ──
  if (title) {
    neonText(ctx, title, centerX, curY, primary.core, LAYOUT.titleFontSize, { glow: 0.9 });
    curY += LAYOUT.titleFontSize + LAYOUT.titleMarginBottom;

    if (decorations) {
      drawDecoLines(ctx, canvasWidth, canvasHeight, primary.core, curY - LAYOUT.titleMarginBottom / 2);
    }
  }

  // ── Subtitle ──
  if (subtitle) {
    neonText(ctx, subtitle, centerX, curY, withAlpha(secondary.core, 0.6), LAYOUT.subtitleFontSize, { glow: 0.3 });
    curY += LAYOUT.subtitleFontSize + LAYOUT.subtitleMarginBottom;
  }

  // ── Menu Items ──
  const itemX = centerX - menuWidth / 2;

  for (let i = 0; i < items.length; i++) {
    const isSelected = i === selectedIndex;
    const itemColor = isSelected ? primary.core : secondary.core;

    drawMenuButton(
      ctx, itemX, curY, menuWidth, LAYOUT.itemHeight,
      items[i], itemColor, isSelected, time,
    );

    curY += LAYOUT.itemHeight + LAYOUT.itemGap;
  }

  // ── Footer ──
  if (footer) {
    const footerY = canvasHeight - 40;
    const footerPulse = animated ? 0.4 + Math.sin(time * 2) * 0.2 : 0.5;
    neonText(ctx, footer, centerX, footerY, withAlpha(tertiary.core, footerPulse), LAYOUT.footerFontSize, { glow: 0.3 });
  }

  // ── Decorative corner brackets ──
  if (decorations) {
    const bracketColor = withAlpha(primary.core, 0.15);
    const bracketSize = 30;
    const margin = 20;

    ctx.save();
    ctx.strokeStyle = rgbaToCss(bracketColor);
    ctx.shadowColor = rgbaToCss(withAlpha(primary.core, 0.1));
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(margin, margin + bracketSize);
    ctx.lineTo(margin, margin);
    ctx.lineTo(margin + bracketSize, margin);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(canvasWidth - margin - bracketSize, margin);
    ctx.lineTo(canvasWidth - margin, margin);
    ctx.lineTo(canvasWidth - margin, margin + bracketSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(margin, canvasHeight - margin - bracketSize);
    ctx.lineTo(margin, canvasHeight - margin);
    ctx.lineTo(margin + bracketSize, canvasHeight - margin);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(canvasWidth - margin - bracketSize, canvasHeight - margin);
    ctx.lineTo(canvasWidth - margin, canvasHeight - margin);
    ctx.lineTo(canvasWidth - margin, canvasHeight - margin - bracketSize);
    ctx.stroke();

    ctx.restore();
  }

  // ── Post-process bloom ──
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(12px)';
  ctx.globalAlpha = 0.05;
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.restore();
}
