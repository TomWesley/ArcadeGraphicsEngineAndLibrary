import type { RGBA, NeonColor, ColorPalette } from '../style/types';
import { rgbaToCss, withAlpha, lerpColor, hslToRgba, rgbaToHsl } from '../style/colors';

/**
 * Icon system — renders common game/app icons in the neon arcade style.
 *
 * DESIGN PRINCIPLE: Icons are NOT wireframe outlines. They are richly filled
 * shapes with:
 * - Dark filled interiors (not empty/transparent)
 * - Multiple shading zones (4-5 brightness levels within each icon)
 * - Bright neon outline edges
 * - Internal detail lines at mid-brightness
 * - Secondary color accents for depth
 * - Highlight hot-spots
 *
 * This matches the reference image where even simple shapes like icicles
 * have 4-5 shades with internal facets and surface detail.
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
  u: number;
  /** Derived shade palette: [deepest, dark, mid, bright, core, highlight] */
  shades: RGBA[];
}

type IconDrawFn = (ic: IconContext) => void;

// ── Shade generation (every icon gets 6 shades from its color) ───────

function generateIconShades(color: RGBA): RGBA[] {
  const [h, s, l] = rgbaToHsl(color);
  return [
    hslToRgba(h, Math.max(0, s - 20), Math.max(0, l - 45)),  // [0] deepest shadow
    hslToRgba(h, Math.max(0, s - 10), Math.max(0, l - 30)),  // [1] dark fill
    hslToRgba(h, s, Math.max(0, l - 18)),                      // [2] mid tone
    hslToRgba(h, s, Math.max(0, l - 5)),                       // [3] bright
    color,                                                       // [4] core (outline)
    hslToRgba(h, Math.max(0, s - 30), Math.min(100, l + 20)), // [5] highlight/hot
  ];
}

// ── Shared drawing helpers ───────────────────────────────────────────

/** Set up context for the bright neon outline */
function outline(ctx: CanvasRenderingContext2D, color: RGBA, lw: number): void {
  ctx.shadowColor = rgbaToCss(withAlpha(color, 0.7));
  ctx.shadowBlur = 8;
  ctx.strokeStyle = rgbaToCss(color);
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/** Set up for internal detail lines (dimmer) */
function detailLine(ctx: CanvasRenderingContext2D, color: RGBA, lw: number): void {
  ctx.shadowColor = rgbaToCss(withAlpha(color, 0.25));
  ctx.shadowBlur = 3;
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.5));
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/** Create a radial fill gradient from dark center to brighter edges */
function radialFill(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, shades: RGBA[]): CanvasGradient {
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  g.addColorStop(0, rgbaToCss(shades[1]));
  g.addColorStop(0.5, rgbaToCss(shades[0]));
  g.addColorStop(0.85, rgbaToCss(shades[1]));
  g.addColorStop(1, rgbaToCss(shades[2]));
  return g;
}

/** Create a linear gradient fill */
function linearFill(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, shades: RGBA[]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, rgbaToCss(shades[2]));
  g.addColorStop(0.3, rgbaToCss(shades[1]));
  g.addColorStop(0.7, rgbaToCss(shades[0]));
  g.addColorStop(1, rgbaToCss(shades[1]));
  return g;
}

/** Draw a small highlight dot */
function hotspot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: RGBA): void {
  ctx.save();
  ctx.shadowColor = rgbaToCss(withAlpha(color, 0.6));
  ctx.shadowBlur = r * 3;
  ctx.fillStyle = rgbaToCss(withAlpha(color, 0.7));
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ── Icon definitions ─────────────────────────────────────────────────

const ICONS: Record<IconName, IconDrawFn> = {

  play: ({ ctx, cx, cy, u, shades, color }) => {
    // Filled triangle with depth
    ctx.beginPath();
    ctx.moveTo(cx - u * 5, cy - u * 7);
    ctx.lineTo(cx + u * 8, cy);
    ctx.lineTo(cx - u * 5, cy + u * 7);
    ctx.closePath();
    ctx.fillStyle = rgbaToCss(shades[0]);
    ctx.fill();
    // Interior gradient overlay
    const pg = ctx.createLinearGradient(cx - u * 5, cy - u * 7, cx + u * 6, cy + u * 3);
    pg.addColorStop(0, rgbaToCss(shades[2]));
    pg.addColorStop(0.4, rgbaToCss(shades[1]));
    pg.addColorStop(0.8, rgbaToCss(shades[0]));
    ctx.fillStyle = pg; ctx.fill();
    // Internal facet line
    detailLine(ctx, color, u * 0.7);
    ctx.beginPath(); ctx.moveTo(cx - u * 4, cy - u * 5); ctx.lineTo(cx + u * 3, cy); ctx.lineTo(cx - u * 4, cy + u * 5); ctx.stroke();
    // Bright outline
    outline(ctx, color, u * 1.5);
    ctx.beginPath();
    ctx.moveTo(cx - u * 5, cy - u * 7); ctx.lineTo(cx + u * 8, cy); ctx.lineTo(cx - u * 5, cy + u * 7); ctx.closePath();
    ctx.stroke();
    // Highlight
    hotspot(ctx, cx - u * 2, cy - u * 3, u * 0.8, shades[5]);
  },

  pause: ({ ctx, cx, cy, u, shades, color }) => {
    const bw = u * 3.5, bh = u * 12, gap = u * 2.5;
    for (const xOff of [-gap - bw, gap]) {
      const bx = cx + xOff;
      // Fill
      const g = ctx.createLinearGradient(bx, cy - bh/2, bx + bw, cy + bh/2);
      g.addColorStop(0, rgbaToCss(shades[2]));
      g.addColorStop(0.3, rgbaToCss(shades[1]));
      g.addColorStop(0.7, rgbaToCss(shades[0]));
      g.addColorStop(1, rgbaToCss(shades[1]));
      ctx.fillStyle = g;
      ctx.fillRect(bx, cy - bh/2, bw, bh);
      // Detail line down center
      detailLine(ctx, color, u * 0.5);
      ctx.beginPath(); ctx.moveTo(bx + bw * 0.35, cy - bh/2 + u); ctx.lineTo(bx + bw * 0.35, cy + bh/2 - u); ctx.stroke();
      // Outline
      outline(ctx, color, u * 1.3);
      ctx.strokeRect(bx, cy - bh/2, bw, bh);
    }
    hotspot(ctx, cx - gap - bw + u, cy - bh/2 + u * 2, u * 0.6, shades[5]);
  },

  stop: ({ ctx, cx, cy, u, shades, color }) => {
    const s = u * 11;
    const g = radialFill(ctx, cx, cy, s * 0.7, shades);
    ctx.fillStyle = g; ctx.fillRect(cx - s/2, cy - s/2, s, s);
    // Cross detail
    detailLine(ctx, color, u * 0.5);
    ctx.beginPath(); ctx.moveTo(cx - s/2 + u, cy); ctx.lineTo(cx + s/2 - u, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - s/2 + u); ctx.lineTo(cx, cy + s/2 - u); ctx.stroke();
    outline(ctx, color, u * 1.3);
    ctx.strokeRect(cx - s/2, cy - s/2, s, s);
    hotspot(ctx, cx - s/2 + u * 2, cy - s/2 + u * 2, u * 0.7, shades[5]);
  },

  'arrow-right': ({ ctx, cx, cy, u, shades, color }) => {
    // Shaft with fill
    ctx.fillStyle = rgbaToCss(shades[1]);
    ctx.fillRect(cx - u * 8, cy - u * 1.5, u * 12, u * 3);
    // Gradient on shaft
    const sg = ctx.createLinearGradient(cx - u * 8, cy, cx + u * 4, cy);
    sg.addColorStop(0, rgbaToCss(shades[0]));
    sg.addColorStop(1, rgbaToCss(shades[2]));
    ctx.fillStyle = sg; ctx.fillRect(cx - u * 8, cy - u * 1.5, u * 12, u * 3);
    // Arrowhead with fill
    ctx.beginPath();
    ctx.moveTo(cx + u * 1, cy - u * 5.5); ctx.lineTo(cx + u * 9, cy); ctx.lineTo(cx + u * 1, cy + u * 5.5); ctx.closePath();
    const ag = ctx.createLinearGradient(cx + u * 1, cy - u * 5, cx + u * 9, cy);
    ag.addColorStop(0, rgbaToCss(shades[1])); ag.addColorStop(1, rgbaToCss(shades[2]));
    ctx.fillStyle = ag; ctx.fill();
    // Inner facet
    detailLine(ctx, color, u * 0.6);
    ctx.beginPath(); ctx.moveTo(cx + u * 2.5, cy - u * 3); ctx.lineTo(cx + u * 6, cy); ctx.lineTo(cx + u * 2.5, cy + u * 3); ctx.stroke();
    // Outlines
    outline(ctx, color, u * 1.3);
    ctx.beginPath(); ctx.moveTo(cx - u * 8, cy - u * 1.5); ctx.lineTo(cx + u * 1, cy - u * 1.5); ctx.lineTo(cx + u * 1, cy - u * 5.5);
    ctx.lineTo(cx + u * 9, cy); ctx.lineTo(cx + u * 1, cy + u * 5.5); ctx.lineTo(cx + u * 1, cy + u * 1.5);
    ctx.lineTo(cx - u * 8, cy + u * 1.5); ctx.closePath(); ctx.stroke();
    hotspot(ctx, cx + u * 7, cy, u * 0.8, shades[5]);
  },

  'arrow-left': ({ ctx, cx, cy, u, shades, color }) => {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(-1, 1); ctx.translate(-cx, -cy);
    ICONS['arrow-right']({ ctx, cx, cy, size: u * 32, u, color, shades });
    ctx.restore();
  },

  'arrow-up': ({ ctx, cx, cy, u, shades, color }) => {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-Math.PI/2); ctx.translate(-cx, -cy);
    ICONS['arrow-right']({ ctx, cx, cy, size: u * 32, u, color, shades });
    ctx.restore();
  },

  'arrow-down': ({ ctx, cx, cy, u, shades, color }) => {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI/2); ctx.translate(-cx, -cy);
    ICONS['arrow-right']({ ctx, cx, cy, size: u * 32, u, color, shades });
    ctx.restore();
  },

  leaderboard: ({ ctx, cx, cy, u, shades, color }) => {
    const bars = [
      { x: cx - u * 7.5, h: u * 9, rank: '3', bright: 0.5 },
      { x: cx - u * 2.5, h: u * 15, rank: '1', bright: 1 },
      { x: cx + u * 2.5, h: u * 12, rank: '2', bright: 0.7 },
    ];
    const bw = u * 5, bot = cy + u * 8;
    for (const bar of bars) {
      const top = bot - bar.h;
      // Fill gradient (bright at top, dark at bottom)
      const bg = ctx.createLinearGradient(bar.x, top, bar.x, bot);
      bg.addColorStop(0, rgbaToCss(bar.bright > 0.8 ? shades[2] : shades[1]));
      bg.addColorStop(0.3, rgbaToCss(shades[1]));
      bg.addColorStop(1, rgbaToCss(shades[0]));
      ctx.fillStyle = bg;
      ctx.fillRect(bar.x, top, bw, bar.h);
      // Vertical detail lines (segments)
      detailLine(ctx, color, u * 0.4);
      for (let y = top + u * 3; y < bot; y += u * 3) {
        ctx.beginPath(); ctx.moveTo(bar.x + u * 0.5, y); ctx.lineTo(bar.x + bw - u * 0.5, y); ctx.stroke();
      }
      // Bright top edge
      ctx.fillStyle = rgbaToCss(shades[bar.bright > 0.8 ? 3 : 2]);
      ctx.fillRect(bar.x, top, bw, u * 1);
      // Outline
      outline(ctx, color, u * 1.1);
      ctx.strokeRect(bar.x, top, bw, bar.h);
      // Rank
      ctx.fillStyle = rgbaToCss(withAlpha(shades[4], bar.bright > 0.8 ? 0.9 : 0.5));
      ctx.shadowColor = rgbaToCss(withAlpha(color, 0.4));
      ctx.shadowBlur = 4;
      ctx.font = `${u * 3.5}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(bar.rank, bar.x + bw/2, top + u * 3.5);
    }
    // Base line
    outline(ctx, color, u * 1.2);
    ctx.beginPath(); ctx.moveTo(cx - u * 10, bot); ctx.lineTo(cx + u * 10, bot); ctx.stroke();
    // Crown on #1
    hotspot(ctx, cx, cy + u * 8 - u * 16, u * 1, shades[5]);
  },

  trophy: ({ ctx, cx, cy, u, shades, color }) => {
    // Cup body with rich fill
    ctx.beginPath();
    ctx.moveTo(cx - u * 6, cy - u * 7);
    ctx.lineTo(cx + u * 6, cy - u * 7);
    ctx.bezierCurveTo(cx + u * 6, cy, cx + u * 4, cy + u * 3, cx + u * 2, cy + u * 4);
    ctx.lineTo(cx - u * 2, cy + u * 4);
    ctx.bezierCurveTo(cx - u * 4, cy + u * 3, cx - u * 6, cy, cx - u * 6, cy - u * 7);
    ctx.closePath();
    const tg = ctx.createLinearGradient(cx - u * 6, cy - u * 7, cx + u * 2, cy + u * 4);
    tg.addColorStop(0, rgbaToCss(shades[2]));
    tg.addColorStop(0.3, rgbaToCss(shades[1]));
    tg.addColorStop(0.6, rgbaToCss(shades[0]));
    tg.addColorStop(1, rgbaToCss(shades[1]));
    ctx.fillStyle = tg; ctx.fill();
    // Inner facet line
    detailLine(ctx, color, u * 0.6);
    ctx.beginPath(); ctx.moveTo(cx, cy - u * 6); ctx.lineTo(cx, cy + u * 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - u * 4, cy - u * 3); ctx.lineTo(cx + u * 4, cy - u * 3); ctx.stroke();
    // Outline
    outline(ctx, color, u * 1.3);
    ctx.beginPath();
    ctx.moveTo(cx - u * 6, cy - u * 7); ctx.lineTo(cx + u * 6, cy - u * 7);
    ctx.bezierCurveTo(cx + u * 6, cy, cx + u * 4, cy + u * 3, cx + u * 2, cy + u * 4);
    ctx.lineTo(cx - u * 2, cy + u * 4);
    ctx.bezierCurveTo(cx - u * 4, cy + u * 3, cx - u * 6, cy, cx - u * 6, cy - u * 7);
    ctx.closePath(); ctx.stroke();
    // Handles
    ctx.beginPath(); ctx.moveTo(cx - u * 6, cy - u * 5);
    ctx.bezierCurveTo(cx - u * 10, cy - u * 5, cx - u * 10, cy + u * 1, cx - u * 6, cy + u * 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + u * 6, cy - u * 5);
    ctx.bezierCurveTo(cx + u * 10, cy - u * 5, cx + u * 10, cy + u * 1, cx + u * 6, cy + u * 1); ctx.stroke();
    // Stem + base (filled)
    ctx.fillStyle = rgbaToCss(shades[1]);
    ctx.fillRect(cx - u * 1, cy + u * 4, u * 2, u * 3);
    ctx.fillRect(cx - u * 5, cy + u * 7, u * 10, u * 1.5);
    outline(ctx, color, u * 1);
    ctx.beginPath(); ctx.moveTo(cx, cy + u * 4); ctx.lineTo(cx, cy + u * 7); ctx.stroke();
    ctx.strokeRect(cx - u * 5, cy + u * 7, u * 10, u * 1.5);
    // Star highlight
    hotspot(ctx, cx, cy - u * 4, u * 1.2, shades[5]);
    hotspot(ctx, cx - u * 3, cy - u * 5.5, u * 0.5, shades[5]);
  },

  star: ({ ctx, cx, cy, u, shades, color }) => {
    starPath(ctx, cx, cy, u * 9, u * 4, 5);
    const sg = radialFill(ctx, cx, cy, u * 7, shades);
    ctx.fillStyle = sg; ctx.fill();
    // Inner star facets
    detailLine(ctx, color, u * 0.6);
    starPath(ctx, cx, cy, u * 5, u * 3, 5);
    ctx.stroke();
    outline(ctx, color, u * 1.3);
    starPath(ctx, cx, cy, u * 9, u * 4, 5);
    ctx.stroke();
    hotspot(ctx, cx, cy, u * 1.5, shades[5]);
  },

  heart: ({ ctx, cx, cy, u, shades, color }) => {
    const heartPath = () => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + u * 7);
      ctx.bezierCurveTo(cx - u * 14, cy - u * 2, cx - u * 5, cy - u * 10, cx, cy - u * 4);
      ctx.bezierCurveTo(cx + u * 5, cy - u * 10, cx + u * 14, cy - u * 2, cx, cy + u * 7);
      ctx.closePath();
    };
    // Rich fill
    heartPath();
    const hg = ctx.createRadialGradient(cx - u * 2, cy - u * 3, u * 2, cx, cy, u * 10);
    hg.addColorStop(0, rgbaToCss(shades[2]));
    hg.addColorStop(0.4, rgbaToCss(shades[1]));
    hg.addColorStop(1, rgbaToCss(shades[0]));
    ctx.fillStyle = hg; ctx.fill();
    // Internal shading line
    detailLine(ctx, color, u * 0.6);
    ctx.beginPath();
    ctx.moveTo(cx, cy + u * 4);
    ctx.bezierCurveTo(cx - u * 8, cy - u * 1, cx - u * 3, cy - u * 7, cx, cy - u * 3);
    ctx.stroke();
    // Bright outline
    outline(ctx, color, u * 1.3);
    heartPath(); ctx.stroke();
    // Highlight spots
    hotspot(ctx, cx - u * 3.5, cy - u * 4, u * 1.2, shades[5]);
    hotspot(ctx, cx - u * 1.5, cy - u * 6, u * 0.6, shades[5]);
  },

  shield: ({ ctx, cx, cy, u, shades, color }) => {
    const shieldPath = () => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - u * 9);
      ctx.lineTo(cx + u * 8, cy - u * 5);
      ctx.lineTo(cx + u * 8, cy + u * 1);
      ctx.bezierCurveTo(cx + u * 7, cy + u * 6, cx + u * 3, cy + u * 9, cx, cy + u * 10);
      ctx.bezierCurveTo(cx - u * 3, cy + u * 9, cx - u * 7, cy + u * 6, cx - u * 8, cy + u * 1);
      ctx.lineTo(cx - u * 8, cy - u * 5);
      ctx.closePath();
    };
    // Rich fill
    shieldPath();
    const sg = ctx.createLinearGradient(cx - u * 8, cy - u * 9, cx + u * 4, cy + u * 10);
    sg.addColorStop(0, rgbaToCss(shades[2]));
    sg.addColorStop(0.25, rgbaToCss(shades[1]));
    sg.addColorStop(0.6, rgbaToCss(shades[0]));
    sg.addColorStop(1, rgbaToCss(shades[1]));
    ctx.fillStyle = sg; ctx.fill();
    // Emblem cross (filled)
    ctx.fillStyle = rgbaToCss(shades[2]);
    ctx.fillRect(cx - u * 0.8, cy - u * 5, u * 1.6, u * 8);
    ctx.fillRect(cx - u * 3.5, cy - u * 2, u * 7, u * 1.6);
    // Inner border line
    detailLine(ctx, color, u * 0.6);
    ctx.beginPath();
    ctx.moveTo(cx, cy - u * 7);
    ctx.lineTo(cx + u * 6, cy - u * 3.5);
    ctx.lineTo(cx + u * 6, cy + u * 0.5);
    ctx.bezierCurveTo(cx + u * 5, cy + u * 4.5, cx + u * 2, cy + u * 7, cx, cy + u * 8);
    ctx.bezierCurveTo(cx - u * 2, cy + u * 7, cx - u * 5, cy + u * 4.5, cx - u * 6, cy + u * 0.5);
    ctx.lineTo(cx - u * 6, cy - u * 3.5);
    ctx.closePath(); ctx.stroke();
    // Outline
    outline(ctx, color, u * 1.3);
    shieldPath(); ctx.stroke();
    hotspot(ctx, cx - u * 3, cy - u * 5, u * 0.8, shades[5]);
  },

  lightning: ({ ctx, cx, cy, u, shades, color }) => {
    const boltPath = () => {
      ctx.beginPath();
      ctx.moveTo(cx + u * 2, cy - u * 10);
      ctx.lineTo(cx - u * 3, cy - u * 1);
      ctx.lineTo(cx + u * 1, cy - u * 1);
      ctx.lineTo(cx - u * 2, cy + u * 10);
      ctx.lineTo(cx + u * 3, cy + u * 1);
      ctx.lineTo(cx - u * 1, cy + u * 1);
      ctx.closePath();
    };
    boltPath();
    const lg = ctx.createLinearGradient(cx, cy - u * 10, cx, cy + u * 10);
    lg.addColorStop(0, rgbaToCss(shades[3]));
    lg.addColorStop(0.3, rgbaToCss(shades[2]));
    lg.addColorStop(0.5, rgbaToCss(shades[1]));
    lg.addColorStop(0.7, rgbaToCss(shades[2]));
    lg.addColorStop(1, rgbaToCss(shades[3]));
    ctx.fillStyle = lg; ctx.fill();
    // Inner edge line
    detailLine(ctx, color, u * 0.6);
    ctx.beginPath(); ctx.moveTo(cx + u * 0.5, cy - u * 7); ctx.lineTo(cx - u * 1.5, cy); ctx.lineTo(cx + u * 1, cy + u * 7); ctx.stroke();
    outline(ctx, color, u * 1.3);
    boltPath(); ctx.stroke();
    hotspot(ctx, cx + u * 1, cy - u * 7, u * 1, shades[5]);
    hotspot(ctx, cx - u * 1, cy + u * 7, u * 0.7, shades[5]);
  },

  gear: ({ ctx, cx, cy, u, shades, color }) => {
    const teeth = 8, outerR = u * 9, innerR = u * 6.5, tw = Math.PI / teeth * 0.6;
    const gearPath = () => {
      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2, a1 = a - tw, a2 = a + tw;
        ctx.lineTo(cx + Math.cos(a1) * innerR, cy + Math.sin(a1) * innerR);
        ctx.lineTo(cx + Math.cos(a1) * outerR, cy + Math.sin(a1) * outerR);
        ctx.lineTo(cx + Math.cos(a2) * outerR, cy + Math.sin(a2) * outerR);
        ctx.lineTo(cx + Math.cos(a2) * innerR, cy + Math.sin(a2) * innerR);
      }
      ctx.closePath();
    };
    gearPath();
    ctx.fillStyle = rgbaToCss(shades[0]); ctx.fill();
    // Radial shading
    const gg = ctx.createRadialGradient(cx - u * 2, cy - u * 2, u * 1, cx, cy, outerR);
    gg.addColorStop(0, rgbaToCss(shades[2]));
    gg.addColorStop(0.4, rgbaToCss(shades[1]));
    gg.addColorStop(1, rgbaToCss(shades[0]));
    gearPath(); ctx.fillStyle = gg; ctx.fill();
    // Spokes
    detailLine(ctx, color, u * 0.5);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * u * 3.5, cy + Math.sin(a) * u * 3.5);
      ctx.lineTo(cx + Math.cos(a) * innerR * 0.9, cy + Math.sin(a) * innerR * 0.9);
      ctx.stroke();
    }
    // Center hole
    ctx.beginPath(); ctx.arc(cx, cy, u * 3, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(shades[0]); ctx.fill();
    outline(ctx, color, u * 0.8);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, u * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(shades[1]); ctx.fill();
    ctx.stroke();
    // Outer outline
    outline(ctx, color, u * 1.2);
    gearPath(); ctx.stroke();
    hotspot(ctx, cx - u * 2, cy - u * 2, u * 0.6, shades[5]);
  },

  home: ({ ctx, cx, cy, u, shades, color }) => {
    // Roof
    ctx.beginPath();
    ctx.moveTo(cx, cy - u * 9); ctx.lineTo(cx + u * 10, cy - u * 1); ctx.lineTo(cx - u * 10, cy - u * 1); ctx.closePath();
    const rg = ctx.createLinearGradient(cx, cy - u * 9, cx, cy - u * 1);
    rg.addColorStop(0, rgbaToCss(shades[2])); rg.addColorStop(1, rgbaToCss(shades[0]));
    ctx.fillStyle = rg; ctx.fill();
    outline(ctx, color, u * 1.3); ctx.stroke();
    // House body
    ctx.fillStyle = rgbaToCss(shades[0]);
    ctx.fillRect(cx - u * 7, cy - u * 1, u * 14, u * 9);
    const bg = ctx.createLinearGradient(cx - u * 7, cy - u * 1, cx + u * 7, cy + u * 8);
    bg.addColorStop(0, rgbaToCss(shades[1])); bg.addColorStop(1, rgbaToCss(shades[0]));
    ctx.fillStyle = bg; ctx.fillRect(cx - u * 7, cy - u * 1, u * 14, u * 9);
    outline(ctx, color, u * 1.1);
    ctx.strokeRect(cx - u * 7, cy - u * 1, u * 14, u * 9);
    // Door (filled)
    ctx.fillStyle = rgbaToCss(shades[1]);
    ctx.fillRect(cx - u * 2, cy + u * 1.5, u * 4, u * 6.5);
    detailLine(ctx, color, u * 0.6);
    ctx.strokeRect(cx - u * 2, cy + u * 1.5, u * 4, u * 6.5);
    // Doorknob
    hotspot(ctx, cx + u * 1, cy + u * 5, u * 0.5, shades[4]);
    // Window (with glow)
    ctx.fillStyle = rgbaToCss(shades[2]);
    ctx.fillRect(cx + u * 3, cy + u * 0.5, u * 3, u * 3);
    outline(ctx, color, u * 0.8);
    ctx.strokeRect(cx + u * 3, cy + u * 0.5, u * 3, u * 3);
    detailLine(ctx, color, u * 0.4);
    ctx.beginPath(); ctx.moveTo(cx + u * 4.5, cy + u * 0.5); ctx.lineTo(cx + u * 4.5, cy + u * 3.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + u * 3, cy + u * 2); ctx.lineTo(cx + u * 6, cy + u * 2); ctx.stroke();
    // Chimney
    ctx.fillStyle = rgbaToCss(shades[1]);
    ctx.fillRect(cx + u * 4, cy - u * 7, u * 2.5, u * 4);
    outline(ctx, color, u * 0.8);
    ctx.strokeRect(cx + u * 4, cy - u * 7, u * 2.5, u * 4);
    hotspot(ctx, cx - u * 3, cy - u * 5, u * 0.6, shades[5]);
  },

  sword: ({ ctx, cx, cy, u, shades, color }) => {
    // Blade with metallic fill
    ctx.beginPath();
    ctx.moveTo(cx, cy - u * 10); ctx.lineTo(cx + u * 2.5, cy + u * 1.5);
    ctx.lineTo(cx, cy + u * 3); ctx.lineTo(cx - u * 2.5, cy + u * 1.5); ctx.closePath();
    const bg = ctx.createLinearGradient(cx - u * 2.5, cy - u * 10, cx + u * 2.5, cy + u * 3);
    bg.addColorStop(0, rgbaToCss(shades[3])); bg.addColorStop(0.2, rgbaToCss(shades[2]));
    bg.addColorStop(0.5, rgbaToCss(shades[1])); bg.addColorStop(0.8, rgbaToCss(shades[2]));
    bg.addColorStop(1, rgbaToCss(shades[1]));
    ctx.fillStyle = bg; ctx.fill();
    // Blade center line
    detailLine(ctx, color, u * 0.5);
    ctx.beginPath(); ctx.moveTo(cx, cy - u * 9); ctx.lineTo(cx, cy + u * 2); ctx.stroke();
    // Edge highlight
    detailLine(ctx, shades[5], u * 0.4);
    ctx.beginPath(); ctx.moveTo(cx - u * 1, cy - u * 8); ctx.lineTo(cx - u * 2, cy + u * 1); ctx.stroke();
    outline(ctx, color, u * 1.2);
    ctx.beginPath();
    ctx.moveTo(cx, cy - u * 10); ctx.lineTo(cx + u * 2.5, cy + u * 1.5);
    ctx.lineTo(cx, cy + u * 3); ctx.lineTo(cx - u * 2.5, cy + u * 1.5); ctx.closePath(); ctx.stroke();
    // Guard (cross)
    ctx.fillStyle = rgbaToCss(shades[2]);
    ctx.fillRect(cx - u * 5, cy + u * 2.5, u * 10, u * 2);
    outline(ctx, color, u * 1);
    ctx.strokeRect(cx - u * 5, cy + u * 2.5, u * 10, u * 2);
    // Handle
    ctx.fillStyle = rgbaToCss(shades[1]);
    ctx.fillRect(cx - u * 1, cy + u * 4.5, u * 2, u * 4);
    // Wrap detail
    detailLine(ctx, color, u * 0.4);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - u, cy + u * (5 + i * 1.3)); ctx.lineTo(cx + u, cy + u * (5.5 + i * 1.3)); ctx.stroke(); }
    outline(ctx, color, u * 0.8);
    ctx.strokeRect(cx - u * 1, cy + u * 4.5, u * 2, u * 4);
    // Pommel
    ctx.beginPath(); ctx.arc(cx, cy + u * 9.5, u * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(shades[2]); ctx.fill();
    outline(ctx, color, u * 0.8); ctx.stroke();
    hotspot(ctx, cx, cy - u * 9, u * 0.7, shades[5]);
  },

  potion: ({ ctx, cx, cy, u, shades, color }) => {
    // Bottle body
    const bottlePath = () => {
      ctx.beginPath();
      ctx.moveTo(cx - u * 2.5, cy - u * 3);
      ctx.bezierCurveTo(cx - u * 6, cy, cx - u * 6, cy + u * 5, cx - u * 5, cy + u * 8);
      ctx.bezierCurveTo(cx - u * 4, cy + u * 10, cx + u * 4, cy + u * 10, cx + u * 5, cy + u * 8);
      ctx.bezierCurveTo(cx + u * 6, cy + u * 5, cx + u * 6, cy, cx + u * 2.5, cy - u * 3);
      ctx.closePath();
    };
    bottlePath();
    const pg = ctx.createRadialGradient(cx - u * 1, cy + u * 3, u * 1, cx, cy + u * 4, u * 8);
    pg.addColorStop(0, rgbaToCss(shades[2]));
    pg.addColorStop(0.4, rgbaToCss(shades[1]));
    pg.addColorStop(1, rgbaToCss(shades[0]));
    ctx.fillStyle = pg; ctx.fill();
    // Liquid level shimmer
    detailLine(ctx, color, u * 0.6);
    ctx.beginPath();
    ctx.moveTo(cx - u * 4.5, cy + u * 1.5);
    ctx.bezierCurveTo(cx - u * 2, cy + u * 0.5, cx + u * 2, cy + u * 2.5, cx + u * 4.5, cy + u * 1.5);
    ctx.stroke();
    // Bubbles
    ctx.beginPath(); ctx.arc(cx - u * 1.5, cy + u * 5, u * 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.35)); ctx.lineWidth = u * 0.4; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + u * 1, cy + u * 6.5, u * 0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - u * 0.5, cy + u * 3, u * 0.4, 0, Math.PI * 2); ctx.stroke();
    outline(ctx, color, u * 1.2);
    bottlePath(); ctx.stroke();
    // Neck
    ctx.fillStyle = rgbaToCss(shades[1]);
    ctx.fillRect(cx - u * 2, cy - u * 7, u * 4, u * 4.5);
    outline(ctx, color, u * 1);
    ctx.strokeRect(cx - u * 2, cy - u * 7, u * 4, u * 4.5);
    // Cork with wood grain
    ctx.fillStyle = rgbaToCss(shades[1]);
    ctx.fillRect(cx - u * 2.5, cy - u * 9, u * 5, u * 2.5);
    detailLine(ctx, color, u * 0.3);
    ctx.beginPath(); ctx.moveTo(cx - u * 2, cy - u * 8); ctx.lineTo(cx + u * 2, cy - u * 8); ctx.stroke();
    outline(ctx, color, u * 0.8);
    ctx.strokeRect(cx - u * 2.5, cy - u * 9, u * 5, u * 2.5);
    hotspot(ctx, cx - u * 2, cy + u * 2, u * 0.8, shades[5]);
  },

  coin: ({ ctx, cx, cy, u, shades, color }) => {
    // Outer ring fill
    ctx.beginPath(); ctx.arc(cx, cy, u * 8, 0, Math.PI * 2);
    const cg = ctx.createRadialGradient(cx - u * 2, cy - u * 2, u * 1, cx, cy, u * 8);
    cg.addColorStop(0, rgbaToCss(shades[2]));
    cg.addColorStop(0.5, rgbaToCss(shades[1]));
    cg.addColorStop(1, rgbaToCss(shades[0]));
    ctx.fillStyle = cg; ctx.fill();
    // Inner ring
    ctx.beginPath(); ctx.arc(cx, cy, u * 5.5, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(shades[0]); ctx.fill();
    detailLine(ctx, color, u * 0.7); ctx.stroke();
    // Rim detail dots
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rx = cx + Math.cos(a) * u * 7, ry = cy + Math.sin(a) * u * 7;
      ctx.fillStyle = rgbaToCss(withAlpha(color, 0.2));
      ctx.beginPath(); ctx.arc(rx, ry, u * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    // Symbol
    ctx.fillStyle = rgbaToCss(shades[3]);
    ctx.shadowColor = rgbaToCss(withAlpha(color, 0.4)); ctx.shadowBlur = 4;
    ctx.font = `bold ${u * 7}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', cx, cy + u * 0.5);
    // Outlines
    outline(ctx, color, u * 1.2);
    ctx.beginPath(); ctx.arc(cx, cy, u * 8, 0, Math.PI * 2); ctx.stroke();
    hotspot(ctx, cx - u * 3, cy - u * 3, u * 0.8, shades[5]);
  },

  skull: ({ ctx, cx, cy, u, shades, color }) => {
    // Cranium filled
    ctx.beginPath();
    ctx.arc(cx, cy - u * 2, u * 7, Math.PI, 0);
    ctx.lineTo(cx + u * 7, cy + u * 2);
    ctx.bezierCurveTo(cx + u * 7, cy + u * 5, cx + u * 4, cy + u * 6, cx + u * 3, cy + u * 6);
    ctx.lineTo(cx - u * 3, cy + u * 6);
    ctx.bezierCurveTo(cx - u * 4, cy + u * 6, cx - u * 7, cy + u * 5, cx - u * 7, cy + u * 2);
    ctx.closePath();
    const sg = ctx.createRadialGradient(cx, cy - u * 3, u * 2, cx, cy, u * 8);
    sg.addColorStop(0, rgbaToCss(shades[2]));
    sg.addColorStop(0.5, rgbaToCss(shades[1]));
    sg.addColorStop(1, rgbaToCss(shades[0]));
    ctx.fillStyle = sg; ctx.fill();
    // Brow ridge detail
    detailLine(ctx, color, u * 0.5);
    ctx.beginPath(); ctx.moveTo(cx - u * 5, cy - u * 1.5); ctx.bezierCurveTo(cx - u * 2, cy - u * 3, cx + u * 2, cy - u * 3, cx + u * 5, cy - u * 1.5); ctx.stroke();
    // Cranium outline
    outline(ctx, color, u * 1.2);
    ctx.beginPath(); ctx.arc(cx, cy - u * 2, u * 7, Math.PI, 0);
    ctx.lineTo(cx + u * 7, cy + u * 2);
    ctx.bezierCurveTo(cx + u * 7, cy + u * 5, cx + u * 4, cy + u * 6, cx + u * 3, cy + u * 6);
    ctx.lineTo(cx - u * 3, cy + u * 6);
    ctx.bezierCurveTo(cx - u * 4, cy + u * 6, cx - u * 7, cy + u * 5, cx - u * 7, cy + u * 2);
    ctx.closePath(); ctx.stroke();
    // Eye sockets (dark with glow inside)
    ctx.beginPath(); ctx.arc(cx - u * 3, cy - u * 0.5, u * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fill();
    outline(ctx, color, u * 0.8); ctx.stroke();
    hotspot(ctx, cx - u * 3, cy - u * 0.5, u * 0.8, shades[4]); // eye glow
    ctx.beginPath(); ctx.arc(cx + u * 3, cy - u * 0.5, u * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fill();
    outline(ctx, color, u * 0.8); ctx.stroke();
    hotspot(ctx, cx + u * 3, cy - u * 0.5, u * 0.8, shades[4]);
    // Nose
    ctx.beginPath(); ctx.moveTo(cx, cy + u * 1.5); ctx.lineTo(cx - u * 1, cy + u * 3.5); ctx.lineTo(cx + u * 1, cy + u * 3.5); ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
    // Jaw with teeth
    ctx.fillStyle = rgbaToCss(shades[0]);
    ctx.fillRect(cx - u * 4.5, cy + u * 6, u * 9, u * 3.5);
    outline(ctx, color, u * 1);
    ctx.strokeRect(cx - u * 4.5, cy + u * 6, u * 9, u * 3.5);
    // Individual teeth
    detailLine(ctx, color, u * 0.5);
    for (let i = -3; i <= 3; i += 1.5) {
      ctx.beginPath(); ctx.moveTo(cx + u * i, cy + u * 6); ctx.lineTo(cx + u * i, cy + u * 9.5); ctx.stroke();
    }
    // Tooth fills
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = rgbaToCss(shades[i % 2 ? 1 : 2]);
      ctx.fillRect(cx - u * 4.5 + i * u * 1.8, cy + u * 6.2, u * 1.6, u * 3);
    }
  },

  crown: ({ ctx, cx, cy, u, shades, color }) => {
    const crownPath = () => {
      ctx.beginPath();
      ctx.moveTo(cx - u * 8, cy + u * 5);
      ctx.lineTo(cx - u * 8, cy - u * 3);
      ctx.lineTo(cx - u * 4, cy + u * 1);
      ctx.lineTo(cx, cy - u * 7);
      ctx.lineTo(cx + u * 4, cy + u * 1);
      ctx.lineTo(cx + u * 8, cy - u * 3);
      ctx.lineTo(cx + u * 8, cy + u * 5);
      ctx.closePath();
    };
    crownPath();
    const cg = ctx.createLinearGradient(cx - u * 8, cy - u * 7, cx + u * 4, cy + u * 5);
    cg.addColorStop(0, rgbaToCss(shades[2]));
    cg.addColorStop(0.3, rgbaToCss(shades[1]));
    cg.addColorStop(0.7, rgbaToCss(shades[0]));
    cg.addColorStop(1, rgbaToCss(shades[1]));
    ctx.fillStyle = cg; ctx.fill();
    // Inner facet lines
    detailLine(ctx, color, u * 0.5);
    ctx.beginPath(); ctx.moveTo(cx - u * 6, cy + u * 3); ctx.lineTo(cx - u * 4, cy + u * 1); ctx.lineTo(cx - u * 2, cy + u * 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - u * 2, cy + u * 3); ctx.lineTo(cx, cy - u * 5); ctx.lineTo(cx + u * 2, cy + u * 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + u * 2, cy + u * 3); ctx.lineTo(cx + u * 4, cy + u * 1); ctx.lineTo(cx + u * 6, cy + u * 3); ctx.stroke();
    outline(ctx, color, u * 1.3);
    crownPath(); ctx.stroke();
    // Base band
    ctx.fillStyle = rgbaToCss(shades[1]);
    ctx.fillRect(cx - u * 8, cy + u * 5, u * 16, u * 3);
    // Band detail
    detailLine(ctx, color, u * 0.4);
    ctx.beginPath(); ctx.moveTo(cx - u * 7.5, cy + u * 6.5); ctx.lineTo(cx + u * 7.5, cy + u * 6.5); ctx.stroke();
    outline(ctx, color, u * 1.1);
    ctx.strokeRect(cx - u * 8, cy + u * 5, u * 16, u * 3);
    // Gems
    for (const [gx, gy, gs] of [[cx, cy - u * 6, u * 1.3], [cx - u * 7.5, cy - u * 2.5, u * 0.9], [cx + u * 7.5, cy - u * 2.5, u * 0.9]] as [number, number, number][]) {
      ctx.beginPath(); ctx.arc(gx, gy, gs, 0, Math.PI * 2);
      ctx.fillStyle = rgbaToCss(shades[2]); ctx.fill();
      outline(ctx, color, u * 0.6); ctx.stroke();
      hotspot(ctx, gx, gy, gs * 0.4, shades[5]);
    }
    // Band gem
    hotspot(ctx, cx, cy + u * 6.5, u * 0.8, shades[5]);
  },
};

// ── Helper shapes ────────────────────────────────────────────────────

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number, points: number): void {
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

// ── Public API ───────────────────────────────────────────────────────

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
  fn({ ctx, cx, cy, size, color, u: size / 32, shades: generateIconShades(color) });
  ctx.restore();
}

export function getIconNames(): IconName[] {
  return Object.keys(ICONS) as IconName[];
}

export function drawFramedIcon(
  ctx: CanvasRenderingContext2D,
  name: IconName,
  cx: number, cy: number,
  size: number,
  color: RGBA,
  options?: { frameStyle?: 'circle' | 'square' | 'diamond'; frameOpacity?: number },
): void {
  const style = options?.frameStyle ?? 'circle';
  const shades = generateIconShades(color);
  const r = size * 0.6;

  ctx.save();
  ctx.shadowColor = rgbaToCss(withAlpha(color, 0.3));
  ctx.shadowBlur = 10;
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.25));
  ctx.lineWidth = 1;

  if (style === 'circle') {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(shades[0]); ctx.fill(); ctx.stroke();
  } else if (style === 'square') {
    const cl = size * 0.1;
    ctx.beginPath();
    ctx.moveTo(cx - r + cl, cy - r); ctx.lineTo(cx + r - cl, cy - r);
    ctx.lineTo(cx + r, cy - r + cl); ctx.lineTo(cx + r, cy + r - cl);
    ctx.lineTo(cx + r - cl, cy + r); ctx.lineTo(cx - r + cl, cy + r);
    ctx.lineTo(cx - r, cy + r - cl); ctx.lineTo(cx - r, cy - r + cl); ctx.closePath();
    ctx.fillStyle = rgbaToCss(shades[0]); ctx.fill(); ctx.stroke();
  } else if (style === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath();
    ctx.fillStyle = rgbaToCss(shades[0]); ctx.fill(); ctx.stroke();
  }
  ctx.restore();

  drawIcon(ctx, name, cx, cy, size * 0.7, color);
}
