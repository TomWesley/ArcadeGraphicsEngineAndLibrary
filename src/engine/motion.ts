/**
 * MOTION — the brand's motion rules as code (BRANDING.md §7).
 *
 * Instruments move like instruments: slow continuous ambient motion,
 * crisp 150–220ms state changes, decelerating arrivals. Deliberately
 * absent: bounce, spring, elastic, and overshoot easings — nothing in
 * this engine boings.
 */

export type EaseFn = (t: number) => number;

/** Approved easing curves. All map [0,1] → [0,1], none overshoot. */
export const EASE: Record<string, EaseFn> = {
  /** Constant rate — sweeps, conveyor motion */
  linear: (t) => t,
  /** Fast start, gentle arrival — the default for state changes */
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  /** Stronger deceleration — panels sliding in, dialogs appearing */
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  /** Near-instant start, long settle — glow swells, needle arrivals */
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  /** Symmetric — camera pans, back-and-forth ambient drift */
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  /** Symmetric, stronger — screen transitions */
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

/** Standard durations (ms) and rates — keep games on a shared clock. */
export const MOTION = {
  /** Button/hover/selection state changes */
  state: 180,
  /** Dialogs, toasts, overlays entering */
  overlay: 220,
  /** Screen-to-screen transitions */
  screen: 350,
  /** Radar sweep angular velocity (rad/s) */
  sweepSpeed: 1.1,
  /** Glow pulse frequency (Hz) — matches theme.animation defaults */
  pulseHz: 0.24,
} as const;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export interface AnimateOptions {
  from?: number;
  to?: number;
  /** Duration in ms. Defaults to MOTION.state. */
  duration?: number;
  ease?: EaseFn;
  onUpdate: (value: number, t: number) => void;
  onDone?: () => void;
}

/**
 * Drive a value from → to over a duration with an approved ease.
 * Returns a cancel function. Uses requestAnimationFrame when available
 * (falls back to timers, so it is safe in tests and workers).
 *
 *   const cancel = animate({ from: gauge.value, to: 0.8, onUpdate: v => gauge.value = v });
 */
export function animate(options: AnimateOptions): () => void {
  const from = options.from ?? 0;
  const to = options.to ?? 1;
  const duration = options.duration ?? MOTION.state;
  const ease = options.ease ?? EASE.outCubic;

  const raf: (cb: (now: number) => void) => unknown =
    typeof requestAnimationFrame !== 'undefined'
      ? requestAnimationFrame
      : (cb) => setTimeout(() => cb(Date.now()), 16);

  let cancelled = false;
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const step = (now: number): void => {
    if (cancelled) return;
    const t = clamp01((now - start) / duration);
    options.onUpdate(lerp(from, to, ease(t)), t);
    if (t < 1) raf(step);
    else options.onDone?.();
  };
  raf(step);

  return () => { cancelled = true; };
}

/**
 * Frame-rate-independent exponential approach — the workhorse for live
 * gauges and camera follow. Moves `current` toward `target` such that
 * halfLifeMs halves the remaining distance regardless of frame rate:
 *
 *   value = approach(value, target, dtMs, 90);
 */
export function approach(
  current: number,
  target: number,
  dtMs: number,
  halfLifeMs = 90,
): number {
  const k = Math.pow(0.5, dtMs / halfLifeMs);
  return target + (current - target) * k;
}
