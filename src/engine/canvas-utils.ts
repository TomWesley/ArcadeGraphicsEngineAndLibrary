/**
 * Canvas utilities — the plumbing every consuming game otherwise
 * re-implements by hand.
 */

export interface HiDPISetup {
  ctx: CanvasRenderingContext2D;
  /** Device pixel ratio actually applied */
  dpr: number;
  /** CSS-pixel width the canvas renders at (draw in these units) */
  width: number;
  /** CSS-pixel height the canvas renders at (draw in these units) */
  height: number;
}

/**
 * Configure a canvas for crisp rendering on high-DPI displays.
 *
 * Sets the backing store to CSS size × devicePixelRatio, pins the CSS size,
 * and scales the context so all drawing code works in CSS pixels:
 *
 *   const { ctx, width, height } = setupHiDPICanvas(canvas, 400, 300);
 *   drawRadarDisplay(ctx, theme, { x: 0, y: 0, size: Math.min(width, height), ... });
 *
 * Call again after a resize (e.g. in a ResizeObserver) — it re-reads sizes.
 *
 * @param canvas  Target canvas.
 * @param cssWidth  Render width in CSS px. Defaults to the element's layout width.
 * @param cssHeight Render height in CSS px. Defaults to the element's layout height.
 * @param dpr  Override the pixel ratio (e.g. cap at 2 to bound fill-rate cost).
 */
export function setupHiDPICanvas(
  canvas: HTMLCanvasElement,
  cssWidth?: number,
  cssHeight?: number,
  dpr?: number,
): HiDPISetup {
  const ratio = dpr ?? (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1);
  const width = cssWidth ?? (canvas.clientWidth || canvas.width);
  const height = cssHeight ?? (canvas.clientHeight || canvas.height);

  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('setupHiDPICanvas: could not get 2d context');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  return { ctx, dpr: ratio, width, height };
}
