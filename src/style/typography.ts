import { FONT_DISPLAY, FONT_BODY, FONT_MONO } from './fonts';

/**
 * TYPOGRAPHY KIT — the engine's standard type system.
 *
 * Six roles cover every text surface in a game. Each role fixes family,
 * weight, tracking, and casing so typography is consistent across games
 * without per-game decisions. Sizes are defaults — scale them, but keep
 * the role's other attributes.
 *
 * | Role    | Family          | Use for                                  |
 * |---------|-----------------|------------------------------------------|
 * | display | Orbitron 900    | Game title on the home screen            |
 * | title   | Orbitron 700    | Screen/section titles                     |
 * | heading | Orbitron 600    | Panel titles, small headers               |
 * | label   | Rajdhani 600    | Buttons, menu items, form labels          |
 * | body    | Rajdhani 400    | Sentences, descriptions, tooltips         |
 * | data    | Share Tech Mono | Stats, readouts, coordinates, versions    |
 *
 * Rules of thumb:
 * - display/title/heading/label/data are UPPERCASE. Only body is sentence case.
 * - Tracking is generous on small uppercase text (military-stencil feel) and
 *   tightens as size grows.
 * - Never mix roles inside one line. A stat line is all `data`; a button is
 *   all `label`.
 */

export type TypeRoleName = 'display' | 'title' | 'heading' | 'label' | 'body' | 'data' | 'micro';

export interface TypeRole {
  /** CSS font-family stack */
  family: string;
  /** CSS font-weight */
  weight: number;
  /** Letter-spacing in em (scales with size) */
  tracking: number;
  /** Text casing convention */
  casing: 'uppercase' | 'none';
  /** Default size in px */
  size: number;
  /** Unitless line-height */
  lineHeight: number;
}

export const TYPE_SCALE: Record<TypeRoleName, TypeRole> = {
  /** Game title — the hero mark on a home screen */
  display: { family: FONT_DISPLAY, weight: 900, tracking: 0.18, casing: 'uppercase', size: 56, lineHeight: 1.05 },
  /** Screen and section titles */
  title:   { family: FONT_DISPLAY, weight: 700, tracking: 0.14, casing: 'uppercase', size: 26, lineHeight: 1.15 },
  /** Panel titles, small headers */
  heading: { family: FONT_DISPLAY, weight: 600, tracking: 0.24, casing: 'uppercase', size: 13, lineHeight: 1.3 },
  /** Buttons, menu items, interactive labels */
  label:   { family: FONT_BODY,    weight: 600, tracking: 0.14, casing: 'uppercase', size: 14, lineHeight: 1.3 },
  /** Running text — the only sentence-case role */
  body:    { family: FONT_BODY,    weight: 400, tracking: 0.02, casing: 'none',      size: 15, lineHeight: 1.5 },
  /** Stats, readouts, coordinates, timestamps */
  data:    { family: FONT_MONO,    weight: 400, tracking: 0.10, casing: 'uppercase', size: 13, lineHeight: 1.4 },
  /** Version strings, footnote readouts — smallest legible tier */
  micro:   { family: FONT_MONO,    weight: 400, tracking: 0.20, casing: 'uppercase', size: 10, lineHeight: 1.4 },
};

/**
 * Canvas font string for a role: `canvasFont('label')` → `"600 14px "Rajdhani", ..."`.
 * Canvas has no letter-spacing in the font string — use applyType() to set both.
 */
export function canvasFont(role: TypeRoleName, sizePx?: number): string {
  const r = TYPE_SCALE[role];
  return `${r.weight} ${sizePx ?? r.size}px ${r.family}`;
}

/**
 * Apply a type role to a canvas context: sets font and letterSpacing
 * (letterSpacing needs Chrome 99+/Safari 17+; silently skipped elsewhere).
 */
export function applyType(
  ctx: CanvasRenderingContext2D,
  role: TypeRoleName,
  sizePx?: number,
): void {
  const r = TYPE_SCALE[role];
  const size = sizePx ?? r.size;
  ctx.font = `${r.weight} ${size}px ${r.family}`;
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${(r.tracking * size).toFixed(2)}px`;
  } catch { /* older canvas implementations */ }
}

/**
 * Format text per the role's casing convention. Use before fillText so
 * canvas text follows the same casing rules as CSS-styled text.
 */
export function typeCase(role: TypeRoleName, text: string): string {
  return TYPE_SCALE[role].casing === 'uppercase' ? text.toUpperCase() : text;
}

/** CSS declaration block for a role (for frameworks managing their own styles). */
export function typeCSS(role: TypeRoleName): Record<string, string> {
  const r = TYPE_SCALE[role];
  return {
    'font-family': r.family,
    'font-weight': String(r.weight),
    'font-size': `${r.size}px`,
    'letter-spacing': `${r.tracking}em`,
    'line-height': String(r.lineHeight),
    ...(r.casing === 'uppercase' ? { 'text-transform': 'uppercase' } : {}),
  };
}
