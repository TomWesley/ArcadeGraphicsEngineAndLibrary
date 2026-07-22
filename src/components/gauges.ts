import type { RGBA, ArcadeTheme, NeonColor } from '../style/types';
import { rgbaToCss, withAlpha, lerpColor } from '../style/colors';

/**
 * Neon-styled gauge and meter components.
 * These render directly to Canvas2D via the CanvasRenderingContext2D.
 * Each function is self-contained — pass a context and theme, get a gauge.
 */

/** Clamp to [0,1]; non-finite input (NaN/Infinity from live game data) renders as 0, not garbage. */
function sane01(v: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
}

export interface GaugeOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;        // 0-1
  label?: string;
  color?: RGBA;
  showValue?: boolean;
  valueFormat?: (v: number) => string;
}

/** Horizontal bar gauge — health bars, loading bars, etc. */
export function drawBarGauge(
  ctx: CanvasRenderingContext2D,
  theme: ArcadeTheme,
  opts: GaugeOptions,
): void {
  const { x, y, width, height } = opts;
  const value = sane01(opts.value);
  const color = opts.color ?? theme.palette.primary.core;
  const glow = theme.glow;

  ctx.save();

  // Background track with faint hatching so the empty region reads as
  // structure, not dead space
  ctx.fillStyle = rgbaToCss(withAlpha(color, 0.05));
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.05));
  ctx.lineWidth = 1;
  for (let hx = x + 6; hx < x + width; hx += 6) {
    ctx.beginPath();
    ctx.moveTo(hx, y + height - 2);
    ctx.lineTo(hx + 3, y + 2);
    ctx.stroke();
  }

  // Border
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity * 0.3));
  ctx.shadowBlur = glow.innerRadius;
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.3));
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  ctx.shadowBlur = 0;

  // End-cap brackets — instrument bezel detail
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.55));
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 2); ctx.lineTo(x - 2, y + height + 2);
  ctx.moveTo(x + width + 2, y - 2); ctx.lineTo(x + width + 2, y + height + 2);
  ctx.stroke();

  // Fill bar — segmented like an energy readout
  const fillWidth = width * value;
  if (fillWidth > 0) {
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.outerRadius;

    // Gradient fill with a vertical sheen (brighter along the top edge)
    const grad = ctx.createLinearGradient(x, y, x + fillWidth, y);
    grad.addColorStop(0, rgbaToCss(withAlpha(color, 0.6)));
    grad.addColorStop(0.5, rgbaToCss(color));
    grad.addColorStop(1, rgbaToCss(withAlpha(color, 0.8)));
    ctx.fillStyle = grad;
    ctx.fillRect(x + 1, y + 1, fillWidth - 2, height - 2);

    const sheen = ctx.createLinearGradient(0, y, 0, y + height);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    sheen.addColorStop(0.35, 'rgba(255, 255, 255, 0)');
    sheen.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
    ctx.fillStyle = sheen;
    ctx.fillRect(x + 1, y + 1, fillWidth - 2, height - 2);

    // Segment dividers carved into the fill
    ctx.shadowBlur = 0;
    const segCount = Math.max(6, Math.round(width / 34));
    const segW = width / segCount;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    for (let i = 1; i < segCount; i++) {
      const sx = x + i * segW;
      if (sx < x + fillWidth - 2) ctx.fillRect(sx, y + 1, 1.5, height - 2);
    }

    // Bright edge at fill tip
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.innerRadius;
    ctx.fillStyle = rgbaToCss(lerpColor(color, [255, 255, 255, 1], 0.5));
    ctx.fillRect(x + fillWidth - 2, y + 1, 2, height - 2);
    ctx.shadowBlur = 0;
  }

  // Scale ticks under the track at 25/50/75%
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.3));
  ctx.lineWidth = 1;
  for (const f of [0.25, 0.5, 0.75]) {
    const tx = x + width * f;
    ctx.beginPath();
    ctx.moveTo(tx, y + height + 1);
    ctx.lineTo(tx, y + height + 4);
    ctx.stroke();
  }

  // Text renders on top of the colored fill — brighten toward white with a
  // dark shadow so it stays readable over both the fill and the dark track.
  const textColor = lerpColor(color, [255, 255, 255, 1], 0.7);

  // Label
  if (opts.label) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = rgbaToCss(textColor);
    ctx.font = `${Math.max(8, height * 0.5)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.label, x + 4, y + height / 2);
  }

  // Value display
  if (opts.showValue) {
    const formatted = opts.valueFormat
      ? opts.valueFormat(value)
      : `${Math.round(value * 100)}%`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = rgbaToCss(textColor);
    ctx.font = `${Math.max(8, height * 0.5)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatted, x + width - 4, y + height / 2);
  }

  ctx.restore();
}

export interface RadialGaugeOptions {
  cx: number;
  cy: number;
  radius: number;
  value: number;        // 0-1
  label?: string;
  color?: RGBA;
  startAngle?: number;  // radians, default -PI * 0.75
  endAngle?: number;    // radians, default PI * 0.75
  thickness?: number;
  showValue?: boolean;
  valueFormat?: (v: number) => string;
}

/** Radial/arc gauge — speedometer style */
export function drawRadialGauge(
  ctx: CanvasRenderingContext2D,
  theme: ArcadeTheme,
  opts: RadialGaugeOptions,
): void {
  const { cx, cy, radius } = opts;
  const value = sane01(opts.value);
  const color = opts.color ?? theme.palette.primary.core;
  const glow = theme.glow;
  const startAngle = opts.startAngle ?? -Math.PI * 0.75;
  const endAngle = opts.endAngle ?? Math.PI * 0.75;
  const thickness = opts.thickness ?? radius * 0.15;
  const totalAngle = endAngle - startAngle;

  ctx.save();

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.1));
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Value arc
  const valueAngle = startAngle + totalAngle * value;
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
  ctx.shadowBlur = glow.outerRadius;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, valueAngle);
  ctx.strokeStyle = rgbaToCss(color);
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Tick marks with scale numerals at the majors
  const tickCount = 10;
  for (let i = 0; i <= tickCount; i++) {
    const tickAngle = startAngle + (totalAngle * i) / tickCount;
    const inner = radius - thickness * 1.2;
    const outer = radius - thickness * 0.3;
    const isActive = i / tickCount <= value;
    const isMajor = i % 5 === 0;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(tickAngle) * inner, cy + Math.sin(tickAngle) * inner);
    ctx.lineTo(cx + Math.cos(tickAngle) * outer, cy + Math.sin(tickAngle) * outer);
    ctx.strokeStyle = rgbaToCss(isActive ? withAlpha(color, 0.8) : withAlpha(color, 0.15));
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.shadowBlur = isActive ? 4 : 0;
    ctx.stroke();

    if (isMajor) {
      ctx.shadowBlur = 0;
      ctx.font = `${Math.max(7, radius * 0.14)}px "Share Tech Mono", "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = rgbaToCss(withAlpha(color, isActive ? 0.6 : 0.25));
      const nr = radius - thickness * 2.1;
      ctx.fillText(String(i * 10), cx + Math.cos(tickAngle) * nr, cy + Math.sin(tickAngle) * nr);
    }
  }

  // Danger zone arc — top 15% of range marked in a hotter tone
  ctx.beginPath();
  ctx.arc(cx, cy, radius + thickness * 0.75, startAngle + totalAngle * 0.85, endAngle);
  ctx.strokeStyle = rgbaToCss(withAlpha(theme.palette.danger.core, 0.45));
  ctx.lineWidth = 2;
  ctx.stroke();

  // Needle — bright tip for a crisp instrument read
  const needleAngle = startAngle + totalAngle * value;
  const needleLen = radius * 0.7;
  const nx = cx + Math.cos(needleAngle) * needleLen;
  const ny = cy + Math.sin(needleAngle) * needleLen;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.strokeStyle = rgbaToCss(lerpColor(color, [255, 255, 255, 1], 0.35));
  ctx.lineWidth = 2;
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
  ctx.shadowBlur = glow.outerRadius;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(nx, ny, 2, 0, Math.PI * 2);
  ctx.fillStyle = rgbaToCss(lerpColor(color, [255, 255, 255, 1], 0.6));
  ctx.fill();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = rgbaToCss(color);
  ctx.fill();

  // Label — brightened toward white with dark shadow for legibility at small sizes
  if (opts.label) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = rgbaToCss(lerpColor(color, [255, 255, 255, 1], 0.55));
    ctx.font = `${Math.max(10, radius * 0.2)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(opts.label, cx, cy + radius * 0.34);
  }

  // Value
  if (opts.showValue) {
    const formatted = opts.valueFormat
      ? opts.valueFormat(value)
      : `${Math.round(value * 100)}`;
    ctx.font = `${Math.max(14, radius * 0.34)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = rgbaToCss(lerpColor(color, [255, 255, 255, 1], 0.7));
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.outerRadius * 0.6;
    ctx.fillText(formatted, cx, cy - radius * 0.12);
  }

  ctx.restore();
}

export interface LineChartOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  data: number[];       // values 0-1
  color?: RGBA;
  label?: string;
  filled?: boolean;
  gridLines?: boolean;
  animated?: boolean;
}

/** Line chart with neon glow — great for stock tickers, CPU graphs, etc. */
export function drawLineChart(
  ctx: CanvasRenderingContext2D,
  theme: ArcadeTheme,
  opts: LineChartOptions,
): void {
  const { x, y, width, height, data } = opts;
  const color = opts.color ?? theme.palette.secondary.core;
  const glow = theme.glow;

  if (data.length < 2) return;

  ctx.save();

  // Grid lines
  if (opts.gridLines !== false) {
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.06));
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gy = y + (height * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + width, gy);
      ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const gx = x + (width * i) / 6;
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + height);
      ctx.stroke();
    }
  }

  // Border
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.2));
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Plot data
  const step = width / (data.length - 1);

  // Fill area under curve
  if (opts.filled !== false) {
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    for (let i = 0; i < data.length; i++) {
      const px = x + i * step;
      const py = y + height - data[i] * height;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(x, y, x, y + height);
    grad.addColorStop(0, rgbaToCss(withAlpha(color, 0.15)));
    grad.addColorStop(1, rgbaToCss(withAlpha(color, 0)));
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Line
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const px = x + i * step;
    const py = y + height - data[i] * height;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = rgbaToCss(color);
  ctx.lineWidth = 2;
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
  ctx.shadowBlur = glow.outerRadius;
  ctx.stroke();

  // Data point dots
  ctx.shadowBlur = glow.innerRadius;
  for (let i = 0; i < data.length; i++) {
    const px = x + i * step;
    const py = y + height - data[i] * height;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(color);
    ctx.fill();
  }

  // Label
  if (opts.label) {
    ctx.shadowBlur = 4;
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.8));
    ctx.font = `${Math.max(8, height * 0.06)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(opts.label, x + 4, y + 4);
  }

  ctx.restore();
}

export interface MiniMapOptions {
  x: number;
  y: number;
  size: number;
  /** Contact positions relative to center, each axis in [-1, 1] */
  blips: { x: number; y: number; color: RGBA; size?: number; label?: string }[];
  color?: RGBA;
  label?: string;
  rings?: number;
  /** Current sweep angle in radians. When set, blips are REVEALED by the
   *  sweep: full brightness as the beam passes, fading until the next pass. */
  sweepAngle?: number;
  /** Show bearing tick marks + cardinal degree labels (default true) */
  markings?: boolean;
}

/** Radar/minimap display with sweep animation and sweep-revealed contacts */
export function drawRadarDisplay(
  ctx: CanvasRenderingContext2D,
  theme: ArcadeTheme,
  opts: MiniMapOptions,
): void {
  const { x, y, size, blips } = opts;
  const color = opts.color ?? theme.palette.secondary.core;
  const glow = theme.glow;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;
  const rings = opts.rings ?? 3;
  const markings = opts.markings ?? true;
  const TAU = Math.PI * 2;

  ctx.save();

  // Clip to circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.clip();

  // Background — subtle radial depth, brighter at center like a powered scope
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  bgGrad.addColorStop(0, rgbaToCss(withAlpha(color, 0.05)));
  bgGrad.addColorStop(0.7, rgbaToCss(withAlpha(color, 0.02)));
  bgGrad.addColorStop(1, rgbaToCss(withAlpha(color, 0.005)));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, size, size);

  // Fine polar grid — radial spokes every 30°
  ctx.lineWidth = 1;
  for (let d = 0; d < 360; d += 30) {
    const a = (d * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.strokeStyle = rgbaToCss(withAlpha(color, d % 90 === 0 ? 0.09 : 0.04));
    ctx.stroke();
  }

  // Range rings with faint dashed intermediates
  for (let i = 1; i <= rings; i++) {
    const rr = (r * i) / rings;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, TAU);
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.12));
    ctx.setLineDash([]);
    ctx.stroke();
    // Dashed half-ring between majors
    if (i < rings) {
      ctx.beginPath();
      ctx.arc(cx, cy, rr + (r / rings) * 0.5, 0, TAU);
      ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.05));
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Sweep beam — bright leading edge + long phosphor trail
  if (opts.sweepAngle !== undefined) {
    if (typeof ctx.createConicGradient === 'function') {
      const sweepGrad = ctx.createConicGradient(opts.sweepAngle - TAU, cx, cy);
      // Trail decays behind the leading edge (conic gradient runs "behind" the beam)
      sweepGrad.addColorStop(0, rgbaToCss(withAlpha(color, 0)));
      sweepGrad.addColorStop(0.55, rgbaToCss(withAlpha(color, 0.015)));
      sweepGrad.addColorStop(0.85, rgbaToCss(withAlpha(color, 0.06)));
      sweepGrad.addColorStop(0.985, rgbaToCss(withAlpha(color, 0.16)));
      sweepGrad.addColorStop(1, rgbaToCss(withAlpha(color, 0.3)));
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
    } else {
      // Fallback for engines without conic gradients (Safari < 16.2):
      // a stepped trail of wedges approximating the phosphor decay
      for (let i = 0; i < 4; i++) {
        const span = Math.PI * (0.08 + i * 0.09);
        ctx.fillStyle = rgbaToCss(withAlpha(color, 0.16 / (i + 1)));
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, opts.sweepAngle - span, opts.sweepAngle);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Crisp leading-edge line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(opts.sweepAngle) * r, cy + Math.sin(opts.sweepAngle) * r);
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.55));
    ctx.lineWidth = 1.5;
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity * 0.6));
    ctx.shadowBlur = glow.outerRadius * 0.6;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Blips — revealed by the sweep, fading as it recedes
  for (const blip of blips) {
    const bx = cx + blip.x * r;
    const by = cy + blip.y * r;
    const bs = blip.size ?? 3;

    // How long ago did the sweep pass this contact? 0 = just now.
    let reveal = 1;
    if (opts.sweepAngle !== undefined) {
      const blipAngle = Math.atan2(by - cy, bx - cx);
      const behind = (((opts.sweepAngle - blipAngle) % TAU) + TAU) % TAU;
      reveal = Math.max(0.06, 1 - behind / TAU);   // linear phosphor decay, faint floor
    }

    // Contact dot
    ctx.shadowColor = rgbaToCss(withAlpha(blip.color, glow.intensity * reveal));
    ctx.shadowBlur = glow.outerRadius * reveal;
    ctx.fillStyle = rgbaToCss(withAlpha(blip.color, reveal));
    ctx.beginPath();
    ctx.arc(bx, by, bs, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Fresh contacts get a targeting ring that expands and fades
    if (reveal > 0.7) {
      const ringT = (1 - reveal) / 0.3;            // 0 = just swept, 1 = ring gone
      ctx.beginPath();
      ctx.arc(bx, by, bs + 3 + ringT * 7, 0, TAU);
      ctx.strokeStyle = rgbaToCss(withAlpha(blip.color, 0.6 * (1 - ringT)));
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ctx.restore();

  // ── Outside the clip: rim instrumentation ──

  // Bearing ticks — every 15°, longer/brighter at 45°
  if (markings) {
    ctx.save();
    for (let d = 0; d < 360; d += 15) {
      const a = (d * Math.PI) / 180;
      const major = d % 45 === 0;
      const inner = r + 2;
      const outer = r + (major ? 8 : 4);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.strokeStyle = rgbaToCss(withAlpha(color, major ? 0.5 : 0.22));
      ctx.lineWidth = major ? 1.5 : 1;
      ctx.stroke();
    }
    // Cardinal degree labels
    ctx.font = `${Math.max(8, size * 0.035)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.55));
    const lr = r + Math.max(14, size * 0.05);
    ctx.fillText('000', cx, cy - lr);
    ctx.fillText('090', cx + lr, cy);
    ctx.fillText('180', cx, cy + lr);
    ctx.fillText('270', cx - lr, cy);
    ctx.restore();
  }

  // Outer ring — double line for instrument bezel feel
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.5));
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity * 0.5));
  ctx.shadowBlur = glow.outerRadius;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3, 0, TAU);
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.12));
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Label
  if (opts.label) {
    ctx.save();
    ctx.shadowColor = rgbaToCss(withAlpha(color, 0.5));
    ctx.shadowBlur = 4;
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.8));
    ctx.font = `${Math.max(8, size * 0.06)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(opts.label, cx, y - 4);
    ctx.restore();
  }
}

export interface SegmentDisplayOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  color?: RGBA;
  label?: string;
  digitCount?: number;
}

/** Seven-segment style numeric display */
export function drawSegmentDisplay(
  ctx: CanvasRenderingContext2D,
  theme: ArcadeTheme,
  opts: SegmentDisplayOptions,
): void {
  const { x, y, width, height, value } = opts;
  const color = opts.color ?? theme.palette.tertiary.core;
  const glow = theme.glow;

  ctx.save();

  // Panel background
  ctx.fillStyle = rgbaToCss(withAlpha(color, 0.03));
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.2));
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Display value
  const fontSize = Math.max(12, height * 0.5);
  ctx.font = `${fontSize}px "Share Tech Mono", "Courier New", monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
  ctx.shadowBlur = glow.outerRadius;
  ctx.fillStyle = rgbaToCss(color);
  ctx.fillText(value, x + width - 8, y + height / 2);

  // Label
  if (opts.label) {
    ctx.font = `${Math.max(6, height * 0.2)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowBlur = 2;
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.6));
    ctx.fillText(opts.label, x + 4, y + 4);
  }

  ctx.restore();
}
