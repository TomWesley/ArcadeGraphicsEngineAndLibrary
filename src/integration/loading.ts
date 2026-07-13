import type { ArcadeTheme, RGBA } from '../style/types';
import { rgbaToCss, withAlpha } from '../style/colors';

/**
 * Loading — the gap between "blank page" and "game running".
 *
 * HTML overlay for boot/load screens:
 *   const loader = showLoading({ label: 'Loading sector', progress: true });
 *   loader.setProgress(0.4);
 *   loader.done();
 *
 * Canvas primitive for in-game spinners:
 *   drawLoadingArc(ctx, theme, { cx, cy, radius: 20, t: elapsedSeconds });
 */

export interface LoadingHandle {
  /** Update the progress bar (0..1). Ignored when progress bar disabled. */
  setProgress(p: number): void;
  setLabel(label: string): void;
  /** Fade out and remove the overlay. */
  done(): void;
}

export interface LoadingOptions {
  label?: string;
  /** Show a determinate progress bar under the spinner */
  progress?: boolean;
}

export function showLoading(options: LoadingOptions = {}): LoadingHandle {
  if (typeof document === 'undefined') {
    return { setProgress: () => {}, setLabel: () => {}, done: () => {} };
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'arcade-loading-backdrop';

  const box = document.createElement('div');
  box.className = 'arcade-loading';

  // Spinner — a rotating instrument arc (SVG, driven by CSS)
  box.innerHTML = `
    <svg class="arcade-loading-spinner" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
      <circle cx="24" cy="24" r="19" fill="none" stroke="var(--arcade-primary-dim)" stroke-width="2" opacity="0.4"/>
      <circle cx="24" cy="24" r="19" fill="none" stroke="var(--arcade-primary)" stroke-width="2.5"
              stroke-dasharray="34 86" stroke-linecap="butt"/>
      <circle cx="24" cy="24" r="2.2" fill="var(--arcade-primary)"/>
    </svg>`;

  const label = document.createElement('div');
  label.className = 'arcade-loading-label';
  label.textContent = options.label ?? 'LOADING';
  box.appendChild(label);

  let fill: HTMLElement | null = null;
  if (options.progress) {
    const bar = document.createElement('div');
    bar.className = 'arcade-loading-bar';
    fill = document.createElement('div');
    fill.className = 'arcade-loading-bar-fill';
    bar.appendChild(fill);
    box.appendChild(bar);
  }

  backdrop.appendChild(box);
  document.body.appendChild(backdrop);

  return {
    setProgress(p: number): void {
      if (fill) fill.style.width = `${Math.max(0, Math.min(1, p)) * 100}%`;
    },
    setLabel(text: string): void {
      label.textContent = text;
    },
    done(): void {
      backdrop.classList.add('arcade-loading--leaving');
      setTimeout(() => backdrop.remove(), 260);
    },
  };
}

export interface LoadingArcOptions {
  cx: number;
  cy: number;
  radius: number;
  /** Elapsed time in seconds — drives the rotation */
  t: number;
  color?: RGBA;
}

/**
 * Canvas spinner — a rotating arc over a faint ring, instrument style.
 * Call every frame with elapsed seconds.
 */
export function drawLoadingArc(
  ctx: CanvasRenderingContext2D,
  theme: ArcadeTheme,
  opts: LoadingArcOptions,
): void {
  const { cx, cy, radius, t } = opts;
  const color = opts.color ?? theme.palette.primary.core;
  const angle = t * 2.4;   // slow, continuous — instruments don't hurry

  ctx.save();
  // Faint full ring
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.18));
  ctx.lineWidth = Math.max(1.5, radius * 0.1);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Rotating sweep arc with glow
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.9));
  ctx.lineWidth = Math.max(2, radius * 0.12);
  ctx.shadowColor = rgbaToCss(withAlpha(color, theme.glow.intensity * 0.6));
  ctx.shadowBlur = theme.glow.outerRadius * 0.6;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, angle, angle + Math.PI * 0.6);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Hub
  ctx.fillStyle = rgbaToCss(withAlpha(color, 0.8));
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1.5, radius * 0.11), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
