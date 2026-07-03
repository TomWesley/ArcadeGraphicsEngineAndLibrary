import type { RGBA } from '../style/types';

/**
 * Icon system — sleek futuristic HUD icons (Halo HUD / Elite Dangerous).
 *
 * DESIGN PRINCIPLES (see CLAUDE.md):
 * - 2-4 visual elements per icon
 * - Solid gradient-filled primary shapes, never flat monotone
 * - Bold outlines (0.7-0.9 opacity) with selective shadowBlur glow
 * - Dark internal detail lines drawn ON TOP of fills
 * - One bright highlight accent per icon
 * - Spacecraft-instrument interpretation: a heart is an EKG waveform,
 *   a skull is a radiation trefoil, a trophy is rank bars — never
 *   cute/retro illustration.
 *
 * The drawing code is ported from the approved implementations in
 * tests/icon-library/index.html, parameterized so every icon scales
 * with `size` and tints with `color` instead of global palette arrays.
 */

/** Icons with their own drawing implementation. */
type BaseIconName =
  // Playback / transport
  | 'play' | 'pause' | 'stop' | 'forward' | 'back'
  // Arrows
  | 'arrow-up' | 'arrow-down' | 'arrow-left' | 'arrow-right'
  // UI / system
  | 'fullscreen' | 'info' | 'warning' | 'error' | 'search'
  | 'settings' | 'refresh' | 'plus' | 'minus'
  | 'download' | 'upload'
  // Game systems
  | 'quest' | 'energy' | 'target' | 'inventory' | 'craft'
  | 'diamond' | 'star' | 'heart' | 'skull'
  // Comms / systems (approved 2026-07-03)
  | 'comms' | 'timer'
  // Legacy names, redesigned in the approved vocabulary
  | 'leaderboard' | 'shield' | 'sword' | 'home' | 'potion' | 'coin' | 'crown';

/** Legacy names kept as aliases to their nearest approved equivalent. */
type AliasIconName = 'gear' | 'lightning' | 'trophy';

export type IconName = BaseIconName | AliasIconName;

const ALIASES: Record<AliasIconName, BaseIconName> = {
  gear: 'settings',       // gear → interconnected node network
  lightning: 'energy',    // lightning → progress arc with bolt
  trophy: 'leaderboard',  // trophy → rank bars
};

// ── Pen: parameterized drawing helpers ───────────────────────────────
//
// The approved icons were authored on a 100px canvas where content spans
// roughly ±24 units from center. `u(n)` maps those author-space units onto
// the requested icon size so that u(24) === size / 2.

interface Pen {
  /** The 2D context ("x" mirrors the reference implementation). */
  x: CanvasRenderingContext2D;
  /** Author-space unit → pixels for the requested size. */
  u(n: number): number;
  /** Primary color as a CSS rgba() string at the given opacity. */
  pc(a: number): string;
  /** Enable glow (shadow) in the icon color. */
  G(blur: number, a?: number): void;
  /** Clear glow. */
  N(): void;
  /** Bold glowing stroke for primary shape outlines. */
  bold(a?: number, w?: number): void;
  /** Solid fill for silhouette shapes. */
  solid(a?: number): void;
  /** Lower-opacity fill. */
  fill(a?: number): void;
  /** Thin accent line. */
  thin(a?: number, w?: number): void;
  /** Dark detail lines drawn ON TOP of solid fills. */
  det(a?: number, w?: number): void;
  /** Bright highlight lines. */
  hi(a?: number, w?: number): void;
  /** Linear gradient in the icon color; stops are [offset, opacity] pairs. */
  grad(x0: number, y0: number, x1: number, y1: number, stops: [number, number][]): CanvasGradient;
}

function makePen(x: CanvasRenderingContext2D, size: number, color: RGBA): Pen {
  const k = size / 48;
  const r = Math.round(color[0]), g = Math.round(color[1]), b = Math.round(color[2]);
  const u = (n: number): number => n * k;
  const pc = (a: number): string => `rgba(${r},${g},${b},${a})`;
  const G = (blur: number, a = 0.5): void => {
    x.shadowColor = pc(a);
    x.shadowBlur = blur * k;
  };
  const N = (): void => {
    x.shadowColor = 'transparent';
    x.shadowBlur = 0;
  };
  const bold = (a = 0.85, w = 2): void => {
    G(6, 0.35);
    x.strokeStyle = pc(a);
    x.lineWidth = u(w);
    x.lineCap = 'round';
    x.lineJoin = 'round';
  };
  const solid = (a = 0.7): void => { x.fillStyle = pc(a); };
  const fill = (a = 0.5): void => { x.fillStyle = pc(a); };
  const thin = (a = 0.3, w = 0.8): void => {
    N();
    x.strokeStyle = pc(a);
    x.lineWidth = u(w);
    x.lineCap = 'round';
  };
  const det = (a = 0.35, w = 1): void => {
    N();
    x.strokeStyle = `rgba(15,12,22,${a})`;
    x.lineWidth = u(w);
    x.lineCap = 'round';
    x.lineJoin = 'round';
  };
  const hi = (a = 0.95, w = 0.7): void => {
    N();
    x.strokeStyle = pc(a);
    x.lineWidth = u(w);
    x.lineCap = 'round';
  };
  const grad = (
    x0: number, y0: number, x1: number, y1: number,
    stops: [number, number][],
  ): CanvasGradient => {
    const gr = x.createLinearGradient(x0, y0, x1, y1);
    for (const [t, a] of stops) gr.addColorStop(t, pc(a));
    return gr;
  };
  return { x, u, pc, G, N, bold, solid, fill, thin, det, hi, grad };
}

type IconDrawFn = (d: Pen, cx: number, cy: number) => void;

// ── Icon definitions (ported from tests/icon-library/index.html) ─────

const ICONS: Record<BaseIconName, IconDrawFn> = {

  // ── PLAYBACK ──

  play: (d, cx, cy) => {
    const { x, u, pc, bold, hi, N } = d;
    const g = x.createLinearGradient(cx - u(10), cy - u(14), cx + u(14), cy + u(10));
    g.addColorStop(0, pc(0.55)); g.addColorStop(0.5, pc(0.2)); g.addColorStop(1, pc(0.45));
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(cx - u(10), cy - u(14)); x.lineTo(cx + u(14), cy); x.lineTo(cx - u(10), cy + u(14));
    x.closePath(); x.fill();
    bold(0.9, 2); x.stroke(); N();
    hi(0.65, 0.6);
    x.beginPath(); x.moveTo(cx - u(8), cy - u(11)); x.lineTo(cx + u(9), cy); x.stroke();
  },

  pause: (d, cx, cy) => {
    const { x, u, pc, bold, hi, N } = d;
    for (const xo of [-u(7), u(3)]) {
      const g = x.createLinearGradient(cx + xo, cy - u(14), cx + xo + u(6), cy + u(14));
      g.addColorStop(0, pc(0.5)); g.addColorStop(0.4, pc(0.18)); g.addColorStop(1, pc(0.42));
      x.fillStyle = g;
      x.fillRect(cx + xo, cy - u(14), u(6), u(28));
      bold(0.85, 1.8); x.strokeRect(cx + xo, cy - u(14), u(6), u(28)); N();
      hi(0.55, 0.5);
      x.beginPath(); x.moveTo(cx + xo + u(1.5), cy - u(12)); x.lineTo(cx + xo + u(1.5), cy + u(12)); x.stroke();
    }
  },

  stop: (d, cx, cy) => {
    const { x, u, pc, bold, hi, N } = d;
    const g = x.createLinearGradient(cx - u(13), cy - u(13), cx + u(13), cy + u(13));
    g.addColorStop(0, pc(0.5)); g.addColorStop(0.4, pc(0.18)); g.addColorStop(1, pc(0.42));
    x.fillStyle = g;
    x.fillRect(cx - u(13), cy - u(13), u(26), u(26));
    bold(0.85, 1.8); x.strokeRect(cx - u(13), cy - u(13), u(26), u(26)); N();
    hi(0.45, 0.5);
    x.beginPath(); x.moveTo(cx - u(11), cy - u(13)); x.lineTo(cx - u(13), cy - u(11)); x.stroke();
  },

  forward: (d, cx, cy) => {
    const { x, u, pc, solid, G, N } = d;
    // Double solid thick chevrons
    solid(0.75);
    x.beginPath();
    x.moveTo(cx - u(16), cy - u(16)); x.lineTo(cx - u(2), cy); x.lineTo(cx - u(16), cy + u(16));
    x.lineTo(cx - u(8), cy + u(16)); x.lineTo(cx + u(6), cy); x.lineTo(cx - u(8), cy - u(16));
    x.closePath(); x.fill();
    x.beginPath();
    x.moveTo(cx - u(4), cy - u(16)); x.lineTo(cx + u(10), cy); x.lineTo(cx - u(4), cy + u(16));
    x.lineTo(cx + u(4), cy + u(16)); x.lineTo(cx + u(18), cy); x.lineTo(cx + u(4), cy - u(16));
    x.closePath(); x.fill();
    G(4, 0.2); x.strokeStyle = pc(0.85); x.lineWidth = u(0.8);
    x.beginPath();
    x.moveTo(cx - u(16), cy - u(16)); x.lineTo(cx - u(2), cy); x.lineTo(cx - u(16), cy + u(16));
    x.lineTo(cx - u(8), cy + u(16)); x.lineTo(cx + u(6), cy); x.lineTo(cx - u(8), cy - u(16));
    x.closePath(); x.stroke();
    x.beginPath();
    x.moveTo(cx - u(4), cy - u(16)); x.lineTo(cx + u(10), cy); x.lineTo(cx - u(4), cy + u(16));
    x.lineTo(cx + u(4), cy + u(16)); x.lineTo(cx + u(18), cy); x.lineTo(cx + u(4), cy - u(16));
    x.closePath(); x.stroke(); N();
  },

  back: (d, cx, cy) => {
    const { x, u, pc, solid, G, N } = d;
    solid(0.75);
    x.beginPath();
    x.moveTo(cx + u(16), cy - u(16)); x.lineTo(cx + u(2), cy); x.lineTo(cx + u(16), cy + u(16));
    x.lineTo(cx + u(8), cy + u(16)); x.lineTo(cx - u(6), cy); x.lineTo(cx + u(8), cy - u(16));
    x.closePath(); x.fill();
    x.beginPath();
    x.moveTo(cx + u(4), cy - u(16)); x.lineTo(cx - u(10), cy); x.lineTo(cx + u(4), cy + u(16));
    x.lineTo(cx - u(4), cy + u(16)); x.lineTo(cx - u(18), cy); x.lineTo(cx - u(4), cy - u(16));
    x.closePath(); x.fill();
    G(4, 0.2); x.strokeStyle = pc(0.85); x.lineWidth = u(0.8);
    x.beginPath();
    x.moveTo(cx + u(16), cy - u(16)); x.lineTo(cx + u(2), cy); x.lineTo(cx + u(16), cy + u(16));
    x.lineTo(cx + u(8), cy + u(16)); x.lineTo(cx - u(6), cy); x.lineTo(cx + u(8), cy - u(16));
    x.closePath(); x.stroke();
    x.beginPath();
    x.moveTo(cx + u(4), cy - u(16)); x.lineTo(cx - u(10), cy); x.lineTo(cx + u(4), cy + u(16));
    x.lineTo(cx - u(4), cy + u(16)); x.lineTo(cx - u(18), cy); x.lineTo(cx - u(4), cy - u(16));
    x.closePath(); x.stroke(); N();
  },

  // ── ARROWS — single solid filled chevrons ──

  'arrow-up': (d, cx, cy) => {
    const { x, u, solid, bold, N } = d;
    solid(0.65);
    x.beginPath();
    x.moveTo(cx - u(16), cy + u(8)); x.lineTo(cx, cy - u(8)); x.lineTo(cx + u(16), cy + u(8));
    x.lineTo(cx + u(8), cy + u(8)); x.lineTo(cx, cy - u(1)); x.lineTo(cx - u(8), cy + u(8));
    x.closePath(); x.fill();
    bold(0.8, 1.5); x.stroke(); N();
  },

  'arrow-down': (d, cx, cy) => {
    const { x, u, solid, bold, N } = d;
    solid(0.65);
    x.beginPath();
    x.moveTo(cx - u(16), cy - u(8)); x.lineTo(cx, cy + u(8)); x.lineTo(cx + u(16), cy - u(8));
    x.lineTo(cx + u(8), cy - u(8)); x.lineTo(cx, cy + u(1)); x.lineTo(cx - u(8), cy - u(8));
    x.closePath(); x.fill();
    bold(0.8, 1.5); x.stroke(); N();
  },

  'arrow-left': (d, cx, cy) => {
    const { x, u, solid, bold, N } = d;
    solid(0.65);
    x.beginPath();
    x.moveTo(cx + u(8), cy - u(16)); x.lineTo(cx - u(8), cy); x.lineTo(cx + u(8), cy + u(16));
    x.lineTo(cx + u(8), cy + u(8)); x.lineTo(cx - u(1), cy); x.lineTo(cx + u(8), cy - u(8));
    x.closePath(); x.fill();
    bold(0.8, 1.5); x.stroke(); N();
  },

  'arrow-right': (d, cx, cy) => {
    const { x, u, solid, bold, N } = d;
    solid(0.65);
    x.beginPath();
    x.moveTo(cx - u(8), cy - u(16)); x.lineTo(cx + u(8), cy); x.lineTo(cx - u(8), cy + u(16));
    x.lineTo(cx - u(8), cy + u(8)); x.lineTo(cx + u(1), cy); x.lineTo(cx - u(8), cy - u(8));
    x.closePath(); x.fill();
    bold(0.8, 1.5); x.stroke(); N();
  },

  // ── UI / SYSTEM ──

  fullscreen: (d, cx, cy) => {
    const { x, u, bold, N } = d;
    bold(0.8, 2.5);
    const s = u(14), g = u(5);
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      x.beginPath();
      x.moveTo(cx + dx * g, cy + dy * s); x.lineTo(cx + dx * s, cy + dy * s); x.lineTo(cx + dx * s, cy + dy * g);
      x.stroke();
    }
    N();
  },

  info: (d, cx, cy) => {
    const { x, u, bold, fill, N } = d;
    bold(0.45, 1.5); x.beginPath(); x.arc(cx, cy, u(18), 0, Math.PI * 2); x.stroke(); N();
    fill(0.7); x.beginPath(); x.arc(cx, cy - u(7), u(2.5), 0, Math.PI * 2); x.fill();
    bold(0.7, 2.5);
    x.beginPath(); x.moveTo(cx, cy - u(1)); x.lineTo(cx, cy + u(10)); x.stroke();
    x.beginPath(); x.moveTo(cx - u(4), cy + u(10)); x.lineTo(cx + u(4), cy + u(10)); x.stroke();
    N();
  },

  warning: (d, cx, cy) => {
    const { x, u, bold, fill, N } = d;
    fill(0.15);
    x.beginPath();
    x.moveTo(cx, cy - u(18)); x.lineTo(cx + u(18), cy + u(14)); x.lineTo(cx - u(18), cy + u(14));
    x.closePath(); x.fill();
    bold(0.85, 2.2); x.stroke(); N();
    fill(0.8); x.beginPath(); x.arc(cx, cy + u(7), u(2.5), 0, Math.PI * 2); x.fill();
    bold(0.8, 2.5); x.beginPath(); x.moveTo(cx, cy - u(6)); x.lineTo(cx, cy + u(2)); x.stroke(); N();
  },

  error: (d, cx, cy) => {
    const { x, u, bold, fill, N } = d;
    fill(0.12); x.beginPath(); x.arc(cx, cy, u(18), 0, Math.PI * 2); x.fill();
    bold(0.55, 1.5); x.stroke();
    bold(0.85, 2.5);
    x.beginPath();
    x.moveTo(cx - u(9), cy - u(9)); x.lineTo(cx + u(9), cy + u(9));
    x.moveTo(cx + u(9), cy - u(9)); x.lineTo(cx - u(9), cy + u(9));
    x.stroke(); N();
  },

  search: (d, cx, cy) => {
    const { x, u, bold, thin, fill, pc, G, N, grad } = d;
    // Sensor lens — scan optics with contact (approved rework 2026-07-03)
    const lx = cx - u(4), ly = cy - u(4);
    x.fillStyle = grad(lx - u(10), ly - u(10), lx + u(10), ly + u(10), [[0, 0.3], [0.5, 0.08], [1, 0.25]]);
    x.beginPath(); x.arc(lx, ly, u(10.5), 0, Math.PI * 2); x.fill();
    bold(0.85, 2); x.beginPath(); x.arc(lx, ly, u(10.5), 0, Math.PI * 2); x.stroke(); N();
    // Crosshair ticks inside the lens
    thin(0.5, 1);
    x.beginPath(); x.moveTo(lx, ly - u(8)); x.lineTo(lx, ly - u(4.5)); x.stroke();
    x.beginPath(); x.moveTo(lx, ly + u(4.5)); x.lineTo(lx, ly + u(8)); x.stroke();
    x.beginPath(); x.moveTo(lx - u(8), ly); x.lineTo(lx - u(4.5), ly); x.stroke();
    x.beginPath(); x.moveTo(lx + u(4.5), ly); x.lineTo(lx + u(8), ly); x.stroke();
    // Scan line across the lens
    x.strokeStyle = pc(0.75); x.lineWidth = u(1);
    x.shadowColor = pc(0.4); x.shadowBlur = u(4);
    x.beginPath(); x.moveTo(lx - u(9), ly - u(2.5)); x.lineTo(lx + u(9), ly - u(2.5)); x.stroke(); N();
    // Contact dot in the lens — the find
    G(5, 0.65); fill(0.95);
    x.beginPath(); x.arc(lx + u(2.5), ly + u(2.5), u(1.8), 0, Math.PI * 2); x.fill(); N();
    // Handle — angular grip with blunt cap
    bold(0.85, 2.6);
    x.beginPath();
    x.moveTo(lx + Math.cos(Math.PI / 4) * u(10.5), ly + Math.sin(Math.PI / 4) * u(10.5));
    x.lineTo(cx + u(14), cy + u(14));
    x.stroke(); N();
    bold(0.7, 2.2);
    x.beginPath(); x.moveTo(cx + u(11.8), cy + u(16.2)); x.lineTo(cx + u(16.2), cy + u(11.8)); x.stroke(); N();
  },

  settings: (d, cx, cy) => {
    const { x, u, bold, thin, G, N, grad } = d;
    // Control faders — three rails with staggered handles (approved rework 2026-07-03)
    const rails = [
      { ry: -9, hx: -5, bright: false },
      { ry: 0,  hx: 7,  bright: true },
      { ry: 9,  hx: -1, bright: false },
    ];
    for (const { ry, hx, bright } of rails) {
      // Rail
      thin(0.4, 1.4);
      x.beginPath(); x.moveTo(cx - u(16), cy + u(ry)); x.lineTo(cx + u(16), cy + u(ry)); x.stroke();
      // Rail end ticks
      thin(0.55, 1.2);
      x.beginPath(); x.moveTo(cx - u(16), cy + u(ry - 2)); x.lineTo(cx - u(16), cy + u(ry + 2)); x.stroke();
      x.beginPath(); x.moveTo(cx + u(16), cy + u(ry - 2)); x.lineTo(cx + u(16), cy + u(ry + 2)); x.stroke();
      // Active segment — brighter portion of the rail up to the handle
      thin(0.8, 1.8);
      x.beginPath(); x.moveTo(cx - u(16), cy + u(ry)); x.lineTo(cx + u(hx), cy + u(ry)); x.stroke();
      // Handle — angular fader knob, gradient filled
      x.fillStyle = grad(cx + u(hx), cy + u(ry - 5), cx + u(hx), cy + u(ry + 5), [[0, 0.85], [1, 0.4]]);
      x.beginPath();
      x.moveTo(cx + u(hx - 2.6), cy + u(ry - 4));
      x.lineTo(cx + u(hx + 2.6), cy + u(ry - 4));
      x.lineTo(cx + u(hx + 2.6), cy + u(ry + 4));
      x.lineTo(cx + u(hx - 2.6), cy + u(ry + 4));
      x.closePath();
      if (bright) { G(6, 0.6); }
      x.fill();
      bold(bright ? 0.95 : 0.6, 1.2); x.stroke(); N();
    }
  },

  refresh: (d, cx, cy) => {
    const { x, u, bold, fill, thin, G, N } = d;
    // Cycle arcs with solid arrowheads (approved rework 2026-07-03)
    bold(0.85, 2.2);
    x.beginPath(); x.arc(cx, cy, u(13), -Math.PI * 0.85, -Math.PI * 0.15); x.stroke(); N();
    bold(0.85, 2.2);
    x.beginPath(); x.arc(cx, cy, u(13), Math.PI * 0.15, Math.PI * 0.85); x.stroke(); N();
    // Solid triangular arrowheads — unmistakable direction
    const head = (ang: number, rot: number): void => {
      const hx = cx + Math.cos(ang) * u(13), hy = cy + Math.sin(ang) * u(13);
      x.save(); x.translate(hx, hy); x.rotate(rot);
      x.beginPath();
      x.moveTo(0, -u(4.5)); x.lineTo(u(3.6), u(1.5)); x.lineTo(-u(3.6), u(1.5));
      x.closePath(); x.fill();
      x.restore();
    };
    G(5, 0.5); fill(0.9);
    head(-Math.PI * 0.15, Math.PI * 0.42);
    head(Math.PI * 0.85, Math.PI * 1.42);
    N();
    // Inner ring detail
    thin(0.3, 1);
    x.beginPath(); x.arc(cx, cy, u(8), 0, Math.PI * 2); x.stroke();
    // Sync dot — the highlight
    G(5, 0.6); fill(0.95);
    x.beginPath(); x.arc(cx, cy, u(2), 0, Math.PI * 2); x.fill(); N();
  },

  plus: (d, cx, cy) => {
    const { x, u, bold, thin, N } = d;
    bold(0.85, 3);
    x.beginPath();
    x.moveTo(cx, cy - u(14)); x.lineTo(cx, cy + u(14));
    x.moveTo(cx - u(14), cy); x.lineTo(cx + u(14), cy);
    x.stroke(); N();
    thin(0.25, 1); x.beginPath(); x.arc(cx, cy, u(20), 0, Math.PI * 2); x.stroke();
  },

  minus: (d, cx, cy) => {
    const { x, u, bold, thin, N } = d;
    bold(0.85, 3);
    x.beginPath(); x.moveTo(cx - u(14), cy); x.lineTo(cx + u(14), cy); x.stroke(); N();
    thin(0.25, 1); x.beginPath(); x.arc(cx, cy, u(20), 0, Math.PI * 2); x.stroke();
  },

  download: (d, cx, cy) => {
    const { x, u, bold, N } = d;
    bold(0.45, 1.5);
    x.beginPath();
    x.moveTo(cx - u(16), cy + u(8)); x.lineTo(cx - u(16), cy + u(16));
    x.lineTo(cx + u(16), cy + u(16)); x.lineTo(cx + u(16), cy + u(8));
    x.stroke(); N();
    bold(0.85, 2.5);
    x.beginPath(); x.moveTo(cx, cy - u(14)); x.lineTo(cx, cy + u(6)); x.stroke();
    x.beginPath(); x.moveTo(cx - u(7), cy + u(1)); x.lineTo(cx, cy + u(8)); x.lineTo(cx + u(7), cy + u(1)); x.stroke();
    N();
  },

  upload: (d, cx, cy) => {
    const { x, u, bold, N } = d;
    bold(0.45, 1.5);
    x.beginPath();
    x.moveTo(cx - u(16), cy + u(8)); x.lineTo(cx - u(16), cy + u(16));
    x.lineTo(cx + u(16), cy + u(16)); x.lineTo(cx + u(16), cy + u(8));
    x.stroke(); N();
    bold(0.85, 2.5);
    x.beginPath(); x.moveTo(cx, cy + u(8)); x.lineTo(cx, cy - u(10)); x.stroke();
    x.beginPath(); x.moveTo(cx - u(7), cy - u(4)); x.lineTo(cx, cy - u(12)); x.lineTo(cx + u(7), cy - u(4)); x.stroke();
    N();
  },

  // ── GAME SYSTEMS ──

  quest: (d, cx, cy) => {
    const { x, u, bold, fill, N } = d;
    bold(0.45, 1.5); x.beginPath(); x.arc(cx, cy, u(18), 0, Math.PI * 2); x.stroke(); N();
    fill(0.75);
    x.font = `bold ${u(26)}px 'Orbitron', sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('!', cx, cy + u(1));
  },

  energy: (d, cx, cy) => {
    const { x, u, bold, fill, thin, G, N } = d;
    // Progress arc with lightning bolt
    thin(0.2, 1.5); x.beginPath(); x.arc(cx, cy, u(18), 0, Math.PI * 2); x.stroke();
    bold(0.85, 3); x.beginPath(); x.arc(cx, cy, u(18), -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.4); x.stroke(); N();
    const ea = -Math.PI / 2 + Math.PI * 1.4;
    G(6, 0.6); fill(0.8);
    x.beginPath(); x.arc(cx + Math.cos(ea) * u(18), cy + Math.sin(ea) * u(18), u(3), 0, Math.PI * 2); x.fill(); N();
    fill(0.3);
    x.beginPath();
    x.moveTo(cx + u(2), cy - u(6)); x.lineTo(cx - u(2), cy + u(1)); x.lineTo(cx + u(1), cy + u(1));
    x.lineTo(cx - u(2), cy + u(6)); x.lineTo(cx + u(2), cy - u(1)); x.lineTo(cx - u(1), cy - u(1));
    x.closePath(); x.fill();
    bold(0.5, 0.8); x.stroke(); N();
  },

  target: (d, cx, cy) => {
    const { x, u, bold, fill, thin, G, N } = d;
    // TIE fighter targeting — angular bracket reticle
    bold(0.75, 2);
    x.beginPath(); x.moveTo(cx - u(10), cy - u(20)); x.lineTo(cx, cy - u(14)); x.lineTo(cx + u(10), cy - u(20)); x.stroke();
    x.beginPath(); x.moveTo(cx - u(10), cy + u(20)); x.lineTo(cx, cy + u(14)); x.lineTo(cx + u(10), cy + u(20)); x.stroke();
    x.beginPath(); x.moveTo(cx - u(20), cy - u(10)); x.lineTo(cx - u(14), cy); x.lineTo(cx - u(20), cy + u(10)); x.stroke();
    x.beginPath(); x.moveTo(cx + u(20), cy - u(10)); x.lineTo(cx + u(14), cy); x.lineTo(cx + u(20), cy + u(10)); x.stroke();
    N();
    // Inner diamond reticle
    bold(0.55, 1.5);
    x.beginPath();
    x.moveTo(cx, cy - u(8)); x.lineTo(cx + u(8), cy); x.lineTo(cx, cy + u(8)); x.lineTo(cx - u(8), cy);
    x.closePath(); x.stroke(); N();
    // Center acquisition dot
    G(6, 0.6); fill(0.85); x.beginPath(); x.arc(cx, cy, u(2.5), 0, Math.PI * 2); x.fill(); N();
    // Range ticks
    thin(0.3, 0.8);
    x.beginPath(); x.moveTo(cx - u(3), cy - u(11)); x.lineTo(cx + u(3), cy - u(11)); x.stroke();
    x.beginPath(); x.moveTo(cx - u(3), cy + u(11)); x.lineTo(cx + u(3), cy + u(11)); x.stroke();
    x.beginPath(); x.moveTo(cx - u(11), cy - u(3)); x.lineTo(cx - u(11), cy + u(3)); x.stroke();
    x.beginPath(); x.moveTo(cx + u(11), cy - u(3)); x.lineTo(cx + u(11), cy + u(3)); x.stroke();
  },

  inventory: (d, cx, cy) => {
    const { x, u, bold, det, fill, thin, G, N, grad } = d;
    // Cargo manifest — stocked grid with active bay (approved rework 2026-07-03)
    x.fillStyle = grad(cx - u(15), cy - u(15), cx + u(15), cy + u(15), [[0, 0.28], [0.5, 0.08], [1, 0.24]]);
    x.fillRect(cx - u(15), cy - u(15), u(30), u(30));
    bold(0.8, 1.7);
    x.strokeRect(cx - u(15), cy - u(15), u(30), u(30));
    N();
    // Grid lines — dark detail
    det(0.5, 1.1);
    for (const o of [-5, 5]) {
      x.beginPath(); x.moveTo(cx + u(o), cy - u(15)); x.lineTo(cx + u(o), cy + u(15)); x.stroke();
      x.beginPath(); x.moveTo(cx - u(15), cy + u(o)); x.lineTo(cx + u(15), cy + u(o)); x.stroke();
    }
    // Stocked cells — varied solid fills (cargo in different bays)
    fill(0.55); x.fillRect(cx - u(14), cy - u(14), u(8), u(8));
    fill(0.4);  x.fillRect(cx - u(4),  cy - u(14), u(8), u(8));
    fill(0.3);  x.fillRect(cx - u(14), cy - u(4),  u(8), u(8));
    fill(0.45); x.fillRect(cx + u(6),  cy + u(6),  u(8), u(8));
    // Active bay — glowing dot, the highlight
    G(6, 0.65); fill(0.95);
    x.beginPath(); x.arc(cx + u(10), cy, u(2.2), 0, Math.PI * 2); x.fill(); N();
    // Corner brackets outside the frame
    thin(0.65, 1.5);
    const B = 15, L = 5;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      x.beginPath();
      x.moveTo(cx + sx * u(B + 3), cy + sy * u(B + 3 - L));
      x.lineTo(cx + sx * u(B + 3), cy + sy * u(B + 3));
      x.lineTo(cx + sx * u(B + 3 - L), cy + sy * u(B + 3));
      x.stroke();
    }
  },

  craft: (d, cx, cy) => {
    const { x, u, bold, fill, thin, G, N } = d;
    // Hexagonal schematic with center assembly point
    thin(0.25, 0.8);
    x.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2, r = u(20);
      if (i === 0) x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    x.closePath(); x.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      thin(0.15, 0.5);
      x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * u(18), cy + Math.sin(a) * u(18)); x.stroke();
    }
    bold(0.65, 1.5); x.beginPath(); x.arc(cx, cy, u(8), 0, Math.PI * 2); x.stroke(); N();
    G(5, 0.4); fill(0.7); x.beginPath(); x.arc(cx, cy, u(3), 0, Math.PI * 2); x.fill(); N();
    fill(0.5);
    for (let i = 0; i < 6; i += 2) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      x.beginPath(); x.arc(cx + Math.cos(a) * u(18), cy + Math.sin(a) * u(18), u(2), 0, Math.PI * 2); x.fill();
    }
  },

  diamond: (d, cx, cy) => {
    const { x, u, bold, fill, solid, thin, G, N } = d;
    // Priority marker — concentric diamonds with center dot
    solid(0.25);
    x.beginPath();
    x.moveTo(cx, cy - u(20)); x.lineTo(cx + u(16), cy); x.lineTo(cx, cy + u(20)); x.lineTo(cx - u(16), cy);
    x.closePath(); x.fill();
    bold(0.8, 2); x.stroke(); N();
    thin(0.4, 1);
    x.beginPath();
    x.moveTo(cx, cy - u(12)); x.lineTo(cx + u(10), cy); x.lineTo(cx, cy + u(12)); x.lineTo(cx - u(10), cy);
    x.closePath(); x.stroke();
    G(5, 0.4); fill(0.7); x.beginPath(); x.arc(cx, cy, u(3), 0, Math.PI * 2); x.fill(); N();
  },

  star: (d, cx, cy) => {
    const { x, u, bold, thin, fill, G, N, grad } = d;
    // Nav star — 4 long cardinal points + 4 short diagonals (approved rework 2026-07-03)
    const starPath = (long: number, short: number): void => {
      x.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i - Math.PI / 2;
        const r = i % 2 === 0 ? long : short;
        const px = cx + Math.cos(a) * u(r), py = cy + Math.sin(a) * u(r);
        i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.closePath();
    };
    x.fillStyle = grad(cx - u(17), cy - u(17), cx + u(17), cy + u(17), [[0, 0.6], [0.5, 0.22], [1, 0.5]]);
    starPath(18, 5.5); x.fill();
    bold(0.85, 1.6); starPath(18, 5.5); x.stroke(); N();
    // Inner cross — thin detail aligned with the long points
    thin(0.45, 1);
    x.beginPath(); x.moveTo(cx, cy - u(12)); x.lineTo(cx, cy + u(12)); x.stroke();
    x.beginPath(); x.moveTo(cx - u(12), cy); x.lineTo(cx + u(12), cy); x.stroke();
    // Orbit ring hint
    thin(0.3, 0.9);
    x.beginPath(); x.arc(cx, cy, u(10), 0, Math.PI * 2); x.stroke();
    // Core — glowing center
    G(7, 0.7); fill(0.95);
    x.beginPath(); x.arc(cx, cy, u(2.6), 0, Math.PI * 2); x.fill(); N();
  },

  heart: (d, cx, cy) => {
    const { x, u, pc, thin, G, N } = d;
    // Vitals monitor — clinical EKG waveform, no valentine shape
    thin(0.25, 1);
    x.beginPath(); x.moveTo(cx - u(24), cy + u(2)); x.lineTo(cx + u(24), cy + u(2)); x.stroke();
    G(6, 0.35);
    x.strokeStyle = pc(0.9); x.lineWidth = u(2.5); x.lineJoin = 'miter'; x.lineCap = 'square';
    x.beginPath();
    x.moveTo(cx - u(24), cy + u(2));
    x.lineTo(cx - u(16), cy + u(2));
    x.lineTo(cx - u(13), cy - u(4));
    x.lineTo(cx - u(10), cy + u(6));
    x.lineTo(cx - u(6), cy - u(6));
    x.lineTo(cx - u(3), cy - u(18)); // big spike up
    x.lineTo(cx + u(1), cy + u(12)); // big dip down
    x.lineTo(cx + u(4), cy - u(10)); // recovery spike
    x.lineTo(cx + u(7), cy + u(2));
    x.lineTo(cx + u(10), cy - u(3));
    x.lineTo(cx + u(13), cy + u(2));
    x.lineTo(cx + u(24), cy + u(2));
    x.stroke(); N();
    // BPM readout hint
    thin(0.35, 0.8);
    x.beginPath(); x.moveTo(cx + u(14), cy + u(10)); x.lineTo(cx + u(22), cy + u(10)); x.stroke();
    x.beginPath(); x.moveTo(cx + u(14), cy + u(14)); x.lineTo(cx + u(20), cy + u(14)); x.stroke();
  },

  skull: (d, cx, cy) => {
    const { x, u, bold, fill, solid, G, N } = d;
    // Nuclear hazard — radiation trefoil, not a cartoon skull
    bold(0.7, 2); x.beginPath(); x.arc(cx, cy, u(22), 0, Math.PI * 2); x.stroke(); N();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const a1 = a - 0.45, a2 = a + 0.45;
      solid(0.6);
      x.beginPath();
      x.moveTo(cx + Math.cos(a1) * u(7), cy + Math.sin(a1) * u(7));
      x.lineTo(cx + Math.cos(a1) * u(19), cy + Math.sin(a1) * u(19));
      x.arc(cx, cy, u(19), a1, a2);
      x.lineTo(cx + Math.cos(a2) * u(7), cy + Math.sin(a2) * u(7));
      x.arc(cx, cy, u(7), a2, a1, true);
      x.closePath(); x.fill();
      bold(0.75, 1); x.stroke(); N();
    }
    x.fillStyle = 'rgba(12,11,20,0.9)';
    x.beginPath(); x.arc(cx, cy, u(7), 0, Math.PI * 2); x.fill();
    bold(0.7, 1.5); x.beginPath(); x.arc(cx, cy, u(7), 0, Math.PI * 2); x.stroke(); N();
    G(5, 0.5); fill(0.85); x.beginPath(); x.arc(cx, cy, u(2.5), 0, Math.PI * 2); x.fill(); N();
  },

  // ── LEGACY NAMES, REDESIGNED IN THE APPROVED VOCABULARY ──

  leaderboard: (d, cx, cy) => {
    const { x, u, pc, bold, fill, thin, hi, G, N } = d;
    // Rank bars — three data columns, tallest glowing
    const bot = cy + u(16), bw = u(9);
    const bars: [number, number, number][] = [
      [-u(15), u(14), 0.5],
      [-u(4.5), u(26), 0.85],
      [u(6), u(20), 0.65],
    ];
    for (const [xo, h, a] of bars) {
      const bx = cx + xo, top = bot - h;
      const g = x.createLinearGradient(bx, top, bx, bot);
      g.addColorStop(0, pc(a * 0.6)); g.addColorStop(0.4, pc(0.15)); g.addColorStop(1, pc(0.3));
      x.fillStyle = g;
      x.fillRect(bx, top, bw, h);
      bold(a, 1.5); x.strokeRect(bx, top, bw, h); N();
      hi(a, 1); x.beginPath(); x.moveTo(bx, top); x.lineTo(bx + bw, top); x.stroke();
    }
    thin(0.35, 1); x.beginPath(); x.moveTo(cx - u(19), bot); x.lineTo(cx + u(19), bot); x.stroke();
    // Apex status dot above the leading bar
    G(5, 0.5); fill(0.8);
    x.beginPath(); x.arc(cx, bot - u(26) - u(4), u(2), 0, Math.PI * 2); x.fill(); N();
  },

  shield: (d, cx, cy) => {
    const { x, u, bold, fill, solid, thin, G, N } = d;
    // Defense matrix — angular shield with sector grid
    solid(0.2);
    x.beginPath();
    x.moveTo(cx, cy - u(22)); x.lineTo(cx + u(18), cy - u(10)); x.lineTo(cx + u(16), cy + u(6));
    x.lineTo(cx, cy + u(22)); x.lineTo(cx - u(16), cy + u(6)); x.lineTo(cx - u(18), cy - u(10));
    x.closePath(); x.fill();
    bold(0.8, 2); x.stroke(); N();
    // Inner shield layer
    thin(0.35, 1);
    x.beginPath();
    x.moveTo(cx, cy - u(16)); x.lineTo(cx + u(13), cy - u(7)); x.lineTo(cx + u(11), cy + u(4));
    x.lineTo(cx, cy + u(16)); x.lineTo(cx - u(11), cy + u(4)); x.lineTo(cx - u(13), cy - u(7));
    x.closePath(); x.stroke();
    // Sector dividers
    thin(0.2, 0.6);
    x.beginPath(); x.moveTo(cx, cy - u(22)); x.lineTo(cx, cy + u(22)); x.stroke();
    x.beginPath(); x.moveTo(cx - u(18), cy - u(2)); x.lineTo(cx + u(18), cy - u(2)); x.stroke();
    // Active sector highlight
    G(4, 0.3); solid(0.15);
    x.beginPath();
    x.moveTo(cx, cy - u(16)); x.lineTo(cx + u(13), cy - u(7)); x.lineTo(cx + u(7), cy - u(2)); x.lineTo(cx, cy - u(2));
    x.closePath(); x.fill(); N();
    // Center status dot
    G(5, 0.5); fill(0.75); x.beginPath(); x.arc(cx, cy - u(2), u(3), 0, Math.PI * 2); x.fill(); N();
  },

  sword: (d, cx, cy) => {
    const { x, u, bold, det, fill, hi, G, N, grad } = d;
    // Attack vector — energy blade on a dynamic diagonal (approved rework
    // 2026-07-03; authored on a vertical axis, rotated 45°)
    x.save();
    x.translate(cx, cy);
    x.rotate(Math.PI / 4);
    // Blade — long tapered silhouette, gradient along its length
    x.fillStyle = grad(0, -u(19), 0, u(5), [[0, 0.9], [0.45, 0.5], [1, 0.3]]);
    x.beginPath();
    x.moveTo(0, -u(19));
    x.lineTo(u(3.2), -u(13));
    x.lineTo(u(2.6), u(5));
    x.lineTo(-u(2.6), u(5));
    x.lineTo(-u(3.2), -u(13));
    x.closePath(); x.fill();
    bold(0.8, 1.6); x.stroke(); N();
    // Fuller — dark center groove
    det(0.5, 1.1);
    x.beginPath(); x.moveTo(0, -u(15)); x.lineTo(0, u(3)); x.stroke();
    // Crossguard — angular, swept
    bold(0.85, 2.2);
    x.beginPath();
    x.moveTo(-u(8), u(7.5)); x.lineTo(-u(5), u(5.5)); x.lineTo(u(5), u(5.5)); x.lineTo(u(8), u(7.5));
    x.stroke(); N();
    // Grip + pommel
    bold(0.7, 2);
    x.beginPath(); x.moveTo(0, u(7.5)); x.lineTo(0, u(14)); x.stroke(); N();
    G(5, 0.6); fill(0.9);
    x.beginPath(); x.arc(0, u(16), u(2), 0, Math.PI * 2); x.fill(); N();
    // Edge glint — the highlight
    hi(0.95, 0.9);
    x.beginPath(); x.moveTo(-u(1.6), -u(16)); x.lineTo(-u(1.6), -u(4)); x.stroke();
    x.restore();
  },

  home: (d, cx, cy) => {
    const { x, u, pc, bold, fill, solid, det, N } = d;
    // Home base — angular structure with broadcast antenna
    const hg = x.createLinearGradient(cx - u(14), cy - u(8), cx + u(10), cy + u(16));
    hg.addColorStop(0, pc(0.45)); hg.addColorStop(0.5, pc(0.15)); hg.addColorStop(1, pc(0.35));
    x.fillStyle = hg;
    x.beginPath();
    x.moveTo(cx, cy - u(12)); x.lineTo(cx + u(16), cy + u(4)); x.lineTo(cx + u(12), cy + u(4));
    x.lineTo(cx + u(12), cy + u(16)); x.lineTo(cx - u(12), cy + u(16)); x.lineTo(cx - u(12), cy + u(4));
    x.lineTo(cx - u(16), cy + u(4));
    x.closePath(); x.fill();
    bold(0.75, 1.5); x.stroke(); N();
    // Door
    solid(0.25); x.fillRect(cx - u(4), cy + u(4), u(8), u(12));
    det(0.3, 0.6); x.strokeRect(cx - u(4), cy + u(4), u(8), u(12));
    // Antenna
    bold(0.6, 1.5); x.beginPath(); x.moveTo(cx + u(6), cy - u(6)); x.lineTo(cx + u(6), cy - u(20)); x.stroke(); N();
    // Signal arcs
    bold(0.4, 1);
    x.beginPath(); x.arc(cx + u(6), cy - u(20), u(4), -Math.PI * 0.8, -Math.PI * 0.2); x.stroke();
    x.beginPath(); x.arc(cx + u(6), cy - u(20), u(7), -Math.PI * 0.75, -Math.PI * 0.25); x.stroke();
    x.beginPath(); x.arc(cx + u(6), cy - u(20), u(10), -Math.PI * 0.7, -Math.PI * 0.3); x.stroke();
    N();
    // Window
    fill(0.35); x.fillRect(cx + u(4), cy + u(5), u(5), u(4));
    bold(0.35, 0.6); x.strokeRect(cx + u(4), cy + u(5), u(5), u(4)); N();
  },

  potion: (d, cx, cy) => {
    const { x, u, bold, det, fill, hi, grad } = d;
    // Resource flask — faceted vessel with liquid fill (approved rework 2026-07-03)
    const body = (): void => {
      x.beginPath();
      x.moveTo(cx - u(3.5), cy - u(16));
      x.lineTo(cx - u(3.5), cy - u(6));
      x.lineTo(cx - u(10), cy + u(1));
      x.lineTo(cx - u(10), cy + u(13));
      x.lineTo(cx - u(6), cy + u(17));
      x.lineTo(cx + u(6), cy + u(17));
      x.lineTo(cx + u(10), cy + u(13));
      x.lineTo(cx + u(10), cy + u(1));
      x.lineTo(cx + u(3.5), cy - u(6));
      x.lineTo(cx + u(3.5), cy - u(16));
      x.closePath();
    };
    // Vessel glass — faint fill
    x.fillStyle = grad(cx - u(10), cy - u(16), cx + u(10), cy + u(17), [[0, 0.18], [1, 0.08]]);
    body(); x.fill();
    // Liquid — bright gradient in the lower body
    x.save();
    body(); x.clip();
    x.fillStyle = grad(cx, cy + u(2), cx, cy + u(17), [[0, 0.75], [1, 0.45]]);
    x.fillRect(cx - u(10), cy + u(2), u(20), u(15));
    x.restore();
    bold(0.8, 1.7); body(); x.stroke(); d.N();
    // Cap seal
    bold(0.75, 2);
    x.beginPath(); x.moveTo(cx - u(5), cy - u(17)); x.lineTo(cx + u(5), cy - u(17)); x.stroke(); d.N();
    // Meniscus — bright surface line
    hi(0.9, 1);
    x.beginPath(); x.moveTo(cx - u(9), cy + u(2)); x.lineTo(cx + u(9), cy + u(2)); x.stroke();
    // Bubbles rising
    fill(0.85);
    x.beginPath(); x.arc(cx + u(3), cy + u(7), u(1.3), 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(cx - u(2.5), cy + u(11), u(1), 0, Math.PI * 2); x.fill();
    // Fill-level tick on the side
    det(0.5, 1.1);
    x.beginPath(); x.moveTo(cx - u(10), cy + u(7)); x.lineTo(cx - u(7.5), cy + u(7)); x.stroke();
  },

  coin: (d, cx, cy) => {
    const { x, u, bold, fill, solid, thin, det, G, N } = d;
    // Credit token — hexagonal currency with circuit pattern
    solid(0.2);
    x.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2, r = u(20);
      if (i === 0) x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    x.closePath(); x.fill();
    bold(0.75, 1.8); x.stroke(); N();
    thin(0.35, 1);
    x.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2, r = u(12);
      if (i === 0) x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    x.closePath(); x.stroke();
    thin(0.2, 0.5);
    for (let i = 0; i < 6; i += 2) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * u(6), cy + Math.sin(a) * u(6));
      x.lineTo(cx + Math.cos(a) * u(18), cy + Math.sin(a) * u(18));
      x.stroke();
    }
    G(5, 0.4); fill(0.7); x.beginPath(); x.arc(cx, cy, u(4), 0, Math.PI * 2); x.fill(); N();
    det(0.3, 0.5); x.beginPath(); x.arc(cx, cy, u(4), 0, Math.PI * 2); x.stroke();
  },

  crown: (d, cx, cy) => {
    const { x, u, bold, fill, G, N } = d;
    // Command rank — stacked chevrons (military insignia)
    bold(0.85, 2.5);
    x.beginPath(); x.moveTo(cx - u(16), cy + u(4)); x.lineTo(cx, cy - u(8)); x.lineTo(cx + u(16), cy + u(4)); x.stroke(); N();
    bold(0.65, 2);
    x.beginPath(); x.moveTo(cx - u(14), cy + u(12)); x.lineTo(cx, cy); x.lineTo(cx + u(14), cy + u(12)); x.stroke(); N();
    bold(0.45, 1.5);
    x.beginPath(); x.moveTo(cx - u(12), cy + u(18)); x.lineTo(cx, cy + u(8)); x.lineTo(cx + u(12), cy + u(18)); x.stroke(); N();
    G(5, 0.4); fill(0.7); x.beginPath(); x.arc(cx, cy - u(8), u(2.5), 0, Math.PI * 2); x.fill(); N();
  },

  // ── COMMS / SYSTEMS (approved 2026-07-03) ──

  comms: (d, cx, cy) => {
    const { x, u, bold, thin, fill, G, N } = d;
    // Antenna mast
    bold(0.85, 2);
    x.beginPath(); x.moveTo(cx, cy + u(18)); x.lineTo(cx, cy - u(2)); x.stroke(); N();
    // Base platform
    bold(0.7, 1.8);
    x.beginPath(); x.moveTo(cx - u(9), cy + u(18)); x.lineTo(cx + u(9), cy + u(18)); x.stroke(); N();
    // Support struts
    thin(0.5, 1.2);
    x.beginPath(); x.moveTo(cx - u(6), cy + u(18)); x.lineTo(cx, cy + u(8)); x.stroke();
    x.beginPath(); x.moveTo(cx + u(6), cy + u(18)); x.lineTo(cx, cy + u(8)); x.stroke();
    // Broadcast arcs — expanding signal
    thin(0.75, 1.6);
    x.beginPath(); x.arc(cx, cy - u(6), u(5), -Math.PI * 0.78, -Math.PI * 0.22); x.stroke();
    thin(0.5, 1.4);
    x.beginPath(); x.arc(cx, cy - u(6), u(10), -Math.PI * 0.75, -Math.PI * 0.25); x.stroke();
    thin(0.3, 1.2);
    x.beginPath(); x.arc(cx, cy - u(6), u(15), -Math.PI * 0.72, -Math.PI * 0.28); x.stroke();
    // Beacon tip — highlight
    G(7, 0.7); fill(0.95);
    x.beginPath(); x.arc(cx, cy - u(5), u(2.6), 0, Math.PI * 2); x.fill(); N();
  },

  timer: (d, cx, cy) => {
    const { x, u, bold, thin, fill, pc, G, N } = d;
    // Chronometer ring
    bold(0.8, 1.8);
    x.beginPath(); x.arc(cx, cy + u(1), u(15), 0, Math.PI * 2); x.stroke(); N();
    // Winding crown
    bold(0.7, 1.6);
    x.beginPath(); x.moveTo(cx - u(4), cy - u(17)); x.lineTo(cx + u(4), cy - u(17)); x.stroke();
    x.beginPath(); x.moveTo(cx, cy - u(17)); x.lineTo(cx, cy - u(14)); x.stroke(); N();
    // Elapsed arc — thick bright sector
    x.strokeStyle = pc(0.85); x.lineWidth = u(3); x.lineCap = 'butt';
    x.shadowColor = pc(0.4); x.shadowBlur = u(5);
    x.beginPath(); x.arc(cx, cy + u(1), u(11.5), -Math.PI / 2, Math.PI * 0.25); x.stroke(); N();
    // Remaining arc — faint
    thin(0.2, 3);
    x.beginPath(); x.arc(cx, cy + u(1), u(11.5), Math.PI * 0.25, Math.PI * 1.5); x.stroke();
    // Sector tick marks
    thin(0.45, 1);
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI / 6) * i;
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * u(13.2), cy + u(1) + Math.sin(a) * u(13.2));
      x.lineTo(cx + Math.cos(a) * u(15), cy + u(1) + Math.sin(a) * u(15));
      x.stroke();
    }
    // Needle to elapsed edge + center dot
    thin(0.9, 1.4);
    x.beginPath(); x.moveTo(cx, cy + u(1));
    x.lineTo(cx + Math.cos(Math.PI * 0.25) * u(9), cy + u(1) + Math.sin(Math.PI * 0.25) * u(9));
    x.stroke();
    G(5, 0.6); fill(0.95);
    x.beginPath(); x.arc(cx, cy + u(1), u(1.8), 0, Math.PI * 2); x.fill(); N();
  },
};

// ── Public API ───────────────────────────────────────────────────────

const warnedUnknown = new Set<string>();

export function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: IconName,
  cx: number, cy: number,
  size: number,
  color: RGBA,
): void {
  const resolved = (ALIASES as Record<string, BaseIconName | undefined>)[name] ?? name;
  const fn = ICONS[resolved as BaseIconName];
  if (!fn) {
    if (!warnedUnknown.has(name)) {
      warnedUnknown.add(name);
      // eslint-disable-next-line no-console
      console.warn(`[arcade-graphics-engine] drawIcon: unknown icon name "${name}"`);
    }
    return;
  }
  ctx.save();
  fn(makePen(ctx, size, color), cx, cy);
  ctx.restore();
}

export function getIconNames(): IconName[] {
  return [...(Object.keys(ICONS) as BaseIconName[]), ...(Object.keys(ALIASES) as AliasIconName[])];
}

/**
 * Draws an icon inside a dark instrument panel frame.
 *
 * The default 'square' style is the canonical clipped-corner HUD panel
 * with border and corner accent dots (see CLAUDE.md drawFrame).
 */
export function drawFramedIcon(
  ctx: CanvasRenderingContext2D,
  name: IconName,
  cx: number, cy: number,
  size: number,
  color: RGBA,
  options?: { frameStyle?: 'circle' | 'square' | 'diamond'; frameOpacity?: number },
): void {
  const style = options?.frameStyle ?? 'square';
  const opacity = options?.frameOpacity ?? 0.95;
  const p = makePen(ctx, size, color);
  const r = size * 0.6;

  ctx.save();
  ctx.fillStyle = `rgba(12,11,20,${opacity})`;
  ctx.strokeStyle = p.pc(0.25);
  ctx.lineWidth = Math.max(1, size / 60);

  if (style === 'square') {
    // Clipped-corner panel
    const cs = size * 0.12;
    ctx.beginPath();
    ctx.moveTo(cx - r + cs, cy - r); ctx.lineTo(cx + r - cs, cy - r);
    ctx.lineTo(cx + r, cy - r + cs); ctx.lineTo(cx + r, cy + r - cs);
    ctx.lineTo(cx + r - cs, cy + r); ctx.lineTo(cx - r + cs, cy + r);
    ctx.lineTo(cx - r, cy + r - cs); ctx.lineTo(cx - r, cy - r + cs);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Corner accent dots
    ctx.fillStyle = p.pc(0.5);
    const dotR = Math.max(1, size * 0.022);
    const inset = r - dotR;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.beginPath();
      ctx.arc(cx + dx * inset, cy + dy * inset, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 'circle') {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();

  drawIcon(ctx, name, cx, cy, size * 0.7, color);
}
