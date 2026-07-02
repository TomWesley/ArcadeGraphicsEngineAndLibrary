import type { RGBA, ArcadeTheme, NeonColor } from '../style/types';
import { rgbaToCss, withAlpha, lerpColor } from '../style/colors';

/**
 * Neon-styled gauge and meter components.
 * These render directly to Canvas2D via the CanvasRenderingContext2D.
 * Each function is self-contained — pass a context and theme, get a gauge.
 */

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
  const { x, y, width, height, value } = opts;
  const color = opts.color ?? theme.palette.primary.core;
  const glow = theme.glow;

  ctx.save();

  // Background track
  ctx.fillStyle = rgbaToCss(withAlpha(color, 0.05));
  ctx.fillRect(x, y, width, height);

  // Border
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity * 0.3));
  ctx.shadowBlur = glow.innerRadius;
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.3));
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Fill bar
  const fillWidth = width * Math.max(0, Math.min(1, value));
  if (fillWidth > 0) {
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.outerRadius;

    // Gradient fill
    const grad = ctx.createLinearGradient(x, y, x + fillWidth, y);
    grad.addColorStop(0, rgbaToCss(withAlpha(color, 0.6)));
    grad.addColorStop(0.5, rgbaToCss(color));
    grad.addColorStop(1, rgbaToCss(withAlpha(color, 0.8)));
    ctx.fillStyle = grad;
    ctx.fillRect(x + 1, y + 1, fillWidth - 2, height - 2);

    // Bright edge at fill tip
    ctx.fillStyle = rgbaToCss(withAlpha(color, 1));
    ctx.fillRect(x + fillWidth - 2, y + 1, 2, height - 2);
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
  const { cx, cy, radius, value } = opts;
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
  const valueAngle = startAngle + totalAngle * Math.max(0, Math.min(1, value));
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
  ctx.shadowBlur = glow.outerRadius;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, valueAngle);
  ctx.strokeStyle = rgbaToCss(color);
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Tick marks
  const tickCount = 10;
  for (let i = 0; i <= tickCount; i++) {
    const tickAngle = startAngle + (totalAngle * i) / tickCount;
    const inner = radius - thickness * 1.2;
    const outer = radius - thickness * 0.3;
    const isActive = i / tickCount <= value;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(tickAngle) * inner, cy + Math.sin(tickAngle) * inner);
    ctx.lineTo(cx + Math.cos(tickAngle) * outer, cy + Math.sin(tickAngle) * outer);
    ctx.strokeStyle = rgbaToCss(isActive ? withAlpha(color, 0.8) : withAlpha(color, 0.15));
    ctx.lineWidth = i % 5 === 0 ? 2 : 1;
    ctx.shadowBlur = isActive ? 4 : 0;
    ctx.stroke();
  }

  // Needle — bright tip for a crisp instrument read
  const needleAngle = startAngle + totalAngle * Math.max(0, Math.min(1, value));
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
  blips: { x: number; y: number; color: RGBA; size?: number }[];
  color?: RGBA;
  label?: string;
  rings?: number;
  sweepAngle?: number;
}

/** Radar/minimap display with sweep animation */
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

  ctx.save();

  // Clip to circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  // Background
  ctx.fillStyle = rgbaToCss(withAlpha(color, 0.02));
  ctx.fillRect(x, y, size, size);

  // Rings
  for (let i = 1; i <= rings; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (r * i) / rings, 0, Math.PI * 2);
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.1));
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Crosshairs
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.08));
  ctx.stroke();

  // Sweep
  if (opts.sweepAngle !== undefined) {
    const sweepGrad = ctx.createConicGradient(opts.sweepAngle, cx, cy);
    sweepGrad.addColorStop(0, rgbaToCss(withAlpha(color, 0.2)));
    sweepGrad.addColorStop(0.15, rgbaToCss(withAlpha(color, 0)));
    sweepGrad.addColorStop(1, rgbaToCss(withAlpha(color, 0)));
    ctx.fillStyle = sweepGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Blips
  for (const blip of blips) {
    const bx = cx + blip.x * r;
    const by = cy + blip.y * r;
    const bs = blip.size ?? 3;

    ctx.shadowColor = rgbaToCss(withAlpha(blip.color, glow.intensity));
    ctx.shadowBlur = glow.outerRadius;
    ctx.fillStyle = rgbaToCss(blip.color);
    ctx.beginPath();
    ctx.arc(bx, by, bs, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Outer ring (outside clip)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.5));
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity * 0.5));
  ctx.shadowBlur = glow.outerRadius;
  ctx.lineWidth = 2;
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
