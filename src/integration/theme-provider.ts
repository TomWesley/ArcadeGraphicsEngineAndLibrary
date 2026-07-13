import type { ArcadeTheme, ColorPalette } from '../style/types';
import { createTheme } from '../style/theme';
import {
  PALETTE_NEON_INFERNO, PALETTE_ELECTRIC_OCEAN,
  PALETTE_TOXIC_JUNGLE, PALETTE_SOLAR_STORM,
  createPalette, rgbaToCss,
} from '../style/colors';
import { FONT_DISPLAY, FONT_BODY, FONT_MONO, injectFonts } from '../style/fonts';

/**
 * Theme Provider — the main entry point for games consuming this engine.
 *
 * Usage in a game:
 *
 *   import { ThemeProvider } from '@tomwesley/arcade-graphics-engine/integration';
 *
 *   const theme = ThemeProvider.create('NEON_INFERNO');
 *   theme.injectCSS();                     // CSS custom properties + fonts + base classes
 *   document.body.classList.add('arcade-theme');  // opt the page into themed body styles
 *
 * After injectCSS(), these classes are available on any element:
 *   .arcade-btn, .arcade-panel, .arcade-panel-title, .arcade-input,
 *   .arcade-glow, .arcade-glow-secondary, .arcade-divider,
 *   .arcade-success, .arcade-warning, .arcade-error
 *
 * For canvas rendering, use the engine's draw functions directly with
 * `theme.palette` (e.g. drawIcon, drawPanel, drawBarGauge, renderMenu).
 */

export type PaletteName = 'NEON_INFERNO' | 'ELECTRIC_OCEAN' | 'TOXIC_JUNGLE' | 'SOLAR_STORM';

const PALETTE_MAP: Record<PaletteName, ColorPalette> = {
  NEON_INFERNO: PALETTE_NEON_INFERNO,
  ELECTRIC_OCEAN: PALETTE_ELECTRIC_OCEAN,
  TOXIC_JUNGLE: PALETTE_TOXIC_JUNGLE,
  SOLAR_STORM: PALETTE_SOLAR_STORM,
};

/** Theme overrides derived from provider options. */
function themeOverrides(options?: { lowPower?: boolean }):
  Parameters<typeof createTheme>[2] {
  if (!options?.lowPower) return undefined;
  return {
    glow: { passes: 1, innerRadius: 0, outerRadius: 4, intensity: 0.4 },
    animation: { glowPulseAmplitude: 0 },
  };
}

export class ThemeProvider {
  public readonly theme: ArcadeTheme;
  public readonly palette: ColorPalette;
  private cssInjected = false;

  private constructor(theme: ArcadeTheme) {
    this.theme = theme;
    this.palette = theme.palette;
  }

  /**
   * Create a theme provider with a built-in palette.
   * For custom colors use ThemeProvider.custom().
   *
   * options.lowPower collapses the glow system to a single cheap pass —
   * shadowBlur is the most expensive Canvas2D operation, so use this for
   * weak hardware, battery-saver modes, or scenes dense with glowing
   * components.
   */
  static create(
    paletteName: PaletteName = 'NEON_INFERNO',
    options?: { lowPower?: boolean },
  ): ThemeProvider {
    const palette = PALETTE_MAP[paletteName];
    if (!palette) {
      throw new Error(
        `Unknown palette "${paletteName}". Built-ins: ${Object.keys(PALETTE_MAP).join(', ')}. ` +
        'For custom colors use ThemeProvider.custom(name, primaryHue, secondaryHue, tertiaryHue, dangerHue).'
      );
    }
    return new ThemeProvider(createTheme(paletteName, palette, themeOverrides(options)));
  }

  /** Create a theme provider with custom hues */
  static custom(
    name: string,
    primaryHue: number,
    secondaryHue: number,
    tertiaryHue: number,
    dangerHue: number,
    options?: { lowPower?: boolean },
  ): ThemeProvider {
    const palette = createPalette(name, primaryHue, secondaryHue, tertiaryHue, dangerHue);
    return new ThemeProvider(createTheme(name, palette, themeOverrides(options)));
  }

  /** Build the full CSS variable map — single source for injectCSS and getCSSVariables. */
  private buildCSSVariables(): Record<string, string> {
    const p = this.palette;
    return {
      '--arcade-bg': rgbaToCss(p.background),
      '--arcade-bg-tint': rgbaToCss(p.backgroundTint),
      '--arcade-primary': rgbaToCss(p.primary.core),
      '--arcade-primary-glow': rgbaToCss(p.primary.glow),
      '--arcade-primary-dim': rgbaToCss(p.primary.dim),
      '--arcade-secondary': rgbaToCss(p.secondary.core),
      '--arcade-secondary-glow': rgbaToCss(p.secondary.glow),
      '--arcade-secondary-dim': rgbaToCss(p.secondary.dim),
      '--arcade-tertiary': rgbaToCss(p.tertiary.core),
      '--arcade-tertiary-glow': rgbaToCss(p.tertiary.glow),
      '--arcade-tertiary-dim': rgbaToCss(p.tertiary.dim),
      '--arcade-danger': rgbaToCss(p.danger.core),
      '--arcade-danger-glow': rgbaToCss(p.danger.glow),
      '--arcade-danger-dim': rgbaToCss(p.danger.dim),
      '--arcade-font-display': FONT_DISPLAY,
      '--arcade-font-body': FONT_BODY,
      '--arcade-font-mono': FONT_MONO,
      '--arcade-font': FONT_BODY,
      '--arcade-glow-radius': `${this.theme.glow.outerRadius}px`,
      '--arcade-glow-intensity': `${this.theme.glow.intensity}`,
    };
  }

  /**
   * Inject CSS custom properties, the Google Fonts stylesheet, and base
   * component classes into the document.
   *
   * Add `class="arcade-theme"` to <body> to opt into themed background/font;
   * the component classes (.arcade-btn etc.) work on any element regardless.
   */
  injectCSS(): void {
    // SSR/build-time safe: no-op outside a browser
    if (typeof document === 'undefined') return;
    if (this.cssInjected) return;

    injectFonts();

    const vars = this.buildCSSVariables();
    const style = document.createElement('style');
    style.id = 'arcade-engine-theme';
    style.textContent = `:root {\n${
      Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n')
    }\n}\n${BASE_CSS}`;

    // Remove existing if re-injecting
    document.getElementById('arcade-engine-theme')?.remove();
    document.head.appendChild(style);
    this.cssInjected = true;
  }

  /** Remove injected CSS */
  removeCSS(): void {
    if (typeof document === 'undefined') return;
    document.getElementById('arcade-engine-theme')?.remove();
    this.cssInjected = false;
  }

  /** Get the full CSS variable map (for frameworks that manage their own styles) */
  getCSSVariables(): Record<string, string> {
    return this.buildCSSVariables();
  }
}

/** Base CSS that applies the arcade aesthetic to common HTML elements */
const BASE_CSS = `
/* Arcade Graphics Engine — Base Theme */
body.arcade-theme {
  background: var(--arcade-bg);
  color: var(--arcade-primary);
  font-family: var(--arcade-font-body);
}

.arcade-theme * {
  box-sizing: border-box;
}

/* ── Typography kit — one class per type role ── */
.arcade-display {
  font-family: var(--arcade-font-display);
  font-weight: 900; font-size: 56px; letter-spacing: 0.18em;
  line-height: 1.05; text-transform: uppercase;
}
.arcade-title {
  font-family: var(--arcade-font-display);
  font-weight: 700; font-size: 26px; letter-spacing: 0.14em;
  line-height: 1.15; text-transform: uppercase;
}
.arcade-heading {
  font-family: var(--arcade-font-display);
  font-weight: 600; font-size: 13px; letter-spacing: 0.24em;
  line-height: 1.3; text-transform: uppercase;
}
.arcade-label {
  font-family: var(--arcade-font-body);
  font-weight: 600; font-size: 14px; letter-spacing: 0.14em;
  line-height: 1.3; text-transform: uppercase;
}
.arcade-body {
  font-family: var(--arcade-font-body);
  font-weight: 400; font-size: 15px; letter-spacing: 0.02em;
  line-height: 1.5;
}
.arcade-data {
  font-family: var(--arcade-font-mono);
  font-weight: 400; font-size: 13px; letter-spacing: 0.1em;
  line-height: 1.4; text-transform: uppercase;
}
.arcade-micro {
  font-family: var(--arcade-font-mono);
  font-weight: 400; font-size: 10px; letter-spacing: 0.2em;
  line-height: 1.4; text-transform: uppercase;
}

/* Neon text glow */
.arcade-glow {
  text-shadow:
    0 0 4px currentColor,
    0 0 8px currentColor,
    0 0 16px var(--arcade-primary-glow);
}

.arcade-glow-secondary {
  color: var(--arcade-secondary);
  text-shadow:
    0 0 4px currentColor,
    0 0 8px currentColor,
    0 0 16px var(--arcade-secondary-glow);
}

/* Sleek button — gradient fill, clipped corners, edge accent, hover glow */
.arcade-btn {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055) 0%, rgba(255, 255, 255, 0.012) 45%, rgba(0, 0, 0, 0.12) 100%);
  border: 1px solid var(--arcade-primary-dim);
  color: var(--arcade-primary);
  font-family: var(--arcade-font-body);
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 10px 20px;
  cursor: pointer;
  position: relative;
  clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px);
  transition: all 0.2s;
}
/* Left edge accent bar */
.arcade-btn::before {
  content: '';
  position: absolute;
  left: 0; top: 20%;
  width: 3px; height: 60%;
  background: linear-gradient(180deg, transparent, var(--arcade-primary), transparent);
  opacity: 0.55;
  transition: opacity 0.2s;
}
/* Top edge catch-light */
.arcade-btn::after {
  content: '';
  position: absolute;
  left: 12px; right: 12px; top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--arcade-primary-glow), transparent);
  opacity: 0.5;
}
.arcade-btn:hover {
  border-color: var(--arcade-primary);
  box-shadow:
    0 0 10px var(--arcade-primary-glow),
    inset 0 0 12px var(--arcade-primary-glow);
  text-shadow: 0 0 8px currentColor;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.02) 45%, rgba(0, 0, 0, 0.1) 100%);
}
.arcade-btn:hover::before { opacity: 1; }
.arcade-btn:active {
  transform: scale(0.97);
}
/* Keyboard focus — visible, on-brand, never removed */
.arcade-btn:focus-visible, .arcade-input:focus-visible {
  outline: 2px solid var(--arcade-secondary);
  outline-offset: 2px;
  box-shadow: 0 0 10px var(--arcade-secondary-glow);
}

/* Respect reduced-motion preferences: state changes stay, motion goes */
@media (prefers-reduced-motion: reduce) {
  .arcade-btn, .arcade-input, .arcade-btn::before, .arcade-btn::after {
    transition: none;
  }
  .arcade-btn:active {
    transform: none;
  }
}

/* Panel container */
.arcade-panel {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--arcade-primary-dim);
  padding: 16px;
  clip-path: polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px);
  box-shadow: 0 0 8px var(--arcade-primary-glow);
}

.arcade-panel-title {
  font-family: var(--arcade-font-display);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--arcade-primary);
  text-shadow: 0 0 6px var(--arcade-primary-glow);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--arcade-primary-dim);
}

/* Input fields */
.arcade-input {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--arcade-primary-dim);
  color: var(--arcade-primary);
  font-family: var(--arcade-font-mono);
  font-size: 13px;
  padding: 8px 12px;
  outline: none;
}
.arcade-input:focus {
  border-color: var(--arcade-primary);
  box-shadow: 0 0 6px var(--arcade-primary-glow);
}

/* Divider */
.arcade-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--arcade-primary-dim) 20%,
    var(--arcade-primary) 50%,
    var(--arcade-primary-dim) 80%,
    transparent
  );
  box-shadow: 0 0 4px var(--arcade-primary-glow);
  margin: 12px 0;
}

/* Status colors */
.arcade-success { color: #44ff44; text-shadow: 0 0 6px rgba(68, 255, 68, 0.5); }
.arcade-warning { color: #ffaa44; text-shadow: 0 0 6px rgba(255, 170, 68, 0.5); }
.arcade-error { color: #ff4444; text-shadow: 0 0 6px rgba(255, 68, 68, 0.5); }

/* ── Dialogs ── */
.arcade-dialog-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(2, 3, 6, 0.72);
  backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  animation: arcade-fade-in 0.18s ease-out;
}
.arcade-dialog {
  background: rgba(12, 13, 20, 0.97);
  border: 1px solid var(--arcade-primary-dim);
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.6), 0 0 12px var(--arcade-primary-glow);
  padding: 22px 26px;
  min-width: 320px; max-width: min(480px, 88vw);
  clip-path: polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px);
  animation: arcade-rise-in 0.22s cubic-bezier(0.33, 1, 0.68, 1);
}
.arcade-dialog-title {
  font-family: var(--arcade-font-display);
  font-weight: 600; font-size: 13px; letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--arcade-primary);
  text-shadow: 0 0 6px var(--arcade-primary-glow);
  padding-bottom: 10px; margin-bottom: 12px;
  border-bottom: 1px solid var(--arcade-primary-dim);
}
.arcade-dialog-body {
  font-family: var(--arcade-font-body);
  font-size: 15px; line-height: 1.5;
  color: var(--arcade-primary);
  opacity: 0.85;
  margin-bottom: 18px;
}
.arcade-dialog-actions {
  display: flex; gap: 12px; justify-content: flex-end;
}
.arcade-btn-danger {
  border-color: var(--arcade-danger-dim);
  color: var(--arcade-danger);
}
.arcade-btn-danger::before {
  background: linear-gradient(180deg, transparent, var(--arcade-danger), transparent);
}
.arcade-btn-danger:hover {
  border-color: var(--arcade-danger);
  box-shadow: 0 0 10px var(--arcade-danger-glow), inset 0 0 12px var(--arcade-danger-glow);
}

/* ── Toasts ── */
#arcade-toast-container {
  position: fixed; top: 16px; right: 16px; z-index: 1100;
  display: flex; flex-direction: column; gap: 10px;
  pointer-events: none;
}
.arcade-toast {
  pointer-events: auto;
  cursor: pointer;
  background: rgba(12, 13, 20, 0.96);
  border: 1px solid var(--arcade-primary-dim);
  border-left: 3px solid var(--arcade-primary);
  padding: 10px 16px 10px 13px;
  min-width: 240px; max-width: 360px;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  animation: arcade-slide-in 0.22s cubic-bezier(0.33, 1, 0.68, 1);
  transition: opacity 0.22s ease-out, transform 0.22s ease-out;
}
.arcade-toast--leaving { opacity: 0; transform: translateX(14px); }
.arcade-toast-title {
  font-family: var(--arcade-font-body);
  font-weight: 600; font-size: 13px; letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--arcade-primary);
  margin-bottom: 2px;
}
.arcade-toast-body {
  font-family: var(--arcade-font-mono);
  font-size: 12px; letter-spacing: 0.06em;
  color: var(--arcade-primary);
  opacity: 0.85;
}
.arcade-toast--success { border-left-color: #44ff44; }
.arcade-toast--success .arcade-toast-body { color: #9cf59c; }
.arcade-toast--warning { border-left-color: #ffaa44; }
.arcade-toast--warning .arcade-toast-body { color: #ffd9a8; }
.arcade-toast--error { border-left-color: #ff4444; }
.arcade-toast--error .arcade-toast-body { color: #ffb0b0; }

/* ── Loading ── */
.arcade-loading-backdrop {
  position: fixed; inset: 0; z-index: 1200;
  background: var(--arcade-bg);
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.26s ease-out;
}
.arcade-loading--leaving { opacity: 0; }
.arcade-loading {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
}
.arcade-loading-spinner { animation: arcade-spin 1.6s linear infinite; }
.arcade-loading-label {
  font-family: var(--arcade-font-mono);
  font-size: 12px; letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--arcade-primary);
  opacity: 0.8;
}
.arcade-loading-bar {
  width: 220px; height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--arcade-primary-dim);
}
.arcade-loading-bar-fill {
  height: 100%; width: 0%;
  background: linear-gradient(90deg, var(--arcade-primary-dim), var(--arcade-primary));
  box-shadow: 0 0 6px var(--arcade-primary-glow);
  transition: width 0.2s ease-out;
}

@keyframes arcade-fade-in { from { opacity: 0; } }
@keyframes arcade-rise-in { from { opacity: 0; transform: translateY(8px); } }
@keyframes arcade-slide-in { from { opacity: 0; transform: translateX(18px); } }
@keyframes arcade-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .arcade-dialog-backdrop, .arcade-dialog, .arcade-toast { animation: none; }
  .arcade-toast, .arcade-loading-backdrop, .arcade-loading-bar-fill { transition: none; }
  /* Spinner slows rather than freezes — it is the "still working" signal */
  .arcade-loading-spinner { animation-duration: 4s; }
}
`;
