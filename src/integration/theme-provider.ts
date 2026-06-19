import type { ArcadeTheme, ColorPalette } from '../style/types';
import { createTheme } from '../style/theme';
import {
  PALETTE_NEON_INFERNO, PALETTE_ELECTRIC_OCEAN,
  PALETTE_TOXIC_JUNGLE, PALETTE_SOLAR_STORM,
  createPalette, rgbaToCss, withAlpha,
} from '../style/colors';

/**
 * Theme Provider — the main entry point for games consuming this engine.
 *
 * Usage in a game:
 *
 *   import { ThemeProvider } from '@tomwesley/arcade-graphics-engine/integration';
 *
 *   const theme = ThemeProvider.create('NEON_INFERNO');
 *   theme.injectCSS();           // Applies CSS custom properties
 *   theme.getCanvas2DAdapter(canvas);  // Returns styled canvas adapter
 *   theme.renderMenu(ctx, menuConfig); // Renders a styled menu
 *
 * This is the "install and use" interface. Games don't need to understand
 * the internals — just pick a palette and call the helpers.
 */

export type PaletteName = 'NEON_INFERNO' | 'ELECTRIC_OCEAN' | 'TOXIC_JUNGLE' | 'SOLAR_STORM' | 'CUSTOM';

const PALETTE_MAP: Record<string, ColorPalette> = {
  NEON_INFERNO: PALETTE_NEON_INFERNO,
  ELECTRIC_OCEAN: PALETTE_ELECTRIC_OCEAN,
  TOXIC_JUNGLE: PALETTE_TOXIC_JUNGLE,
  SOLAR_STORM: PALETTE_SOLAR_STORM,
};

export class ThemeProvider {
  public readonly theme: ArcadeTheme;
  public readonly palette: ColorPalette;
  private cssInjected = false;

  private constructor(theme: ArcadeTheme) {
    this.theme = theme;
    this.palette = theme.palette;
  }

  /** Create a theme provider with a built-in palette */
  static create(paletteName: PaletteName = 'NEON_INFERNO'): ThemeProvider {
    const palette = PALETTE_MAP[paletteName] ?? PALETTE_NEON_INFERNO;
    return new ThemeProvider(createTheme(paletteName, palette));
  }

  /** Create a theme provider with custom hues */
  static custom(
    name: string,
    primaryHue: number,
    secondaryHue: number,
    tertiaryHue: number,
    dangerHue: number,
  ): ThemeProvider {
    const palette = createPalette(name, primaryHue, secondaryHue, tertiaryHue, dangerHue);
    return new ThemeProvider(createTheme(name, palette));
  }

  /**
   * Inject CSS custom properties into the document.
   * This lets HTML/CSS-based game UIs use the theme colors directly.
   *
   * Injected properties:
   *   --arcade-bg, --arcade-bg-tint
   *   --arcade-primary, --arcade-primary-glow, --arcade-primary-dim
   *   --arcade-secondary, --arcade-secondary-glow, --arcade-secondary-dim
   *   --arcade-tertiary, --arcade-tertiary-glow, --arcade-tertiary-dim
   *   --arcade-danger, --arcade-danger-glow, --arcade-danger-dim
   *   --arcade-font
   *   --arcade-glow-radius, --arcade-glow-intensity
   */
  injectCSS(): void {
    if (this.cssInjected) return;

    const p = this.palette;
    const vars: Record<string, string> = {
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
      '--arcade-font': '"Press Start 2P", "Courier New", monospace',
      '--arcade-glow-radius': `${this.theme.glow.outerRadius}px`,
      '--arcade-glow-intensity': `${this.theme.glow.intensity}`,
    };

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
    document.getElementById('arcade-engine-theme')?.remove();
    this.cssInjected = false;
  }

  /** Get CSS variable map (for frameworks that manage their own styles) */
  getCSSVariables(): Record<string, string> {
    const p = this.palette;
    return {
      '--arcade-bg': rgbaToCss(p.background),
      '--arcade-primary': rgbaToCss(p.primary.core),
      '--arcade-primary-glow': rgbaToCss(p.primary.glow),
      '--arcade-primary-dim': rgbaToCss(p.primary.dim),
      '--arcade-secondary': rgbaToCss(p.secondary.core),
      '--arcade-tertiary': rgbaToCss(p.tertiary.core),
      '--arcade-danger': rgbaToCss(p.danger.core),
    };
  }
}

/** Base CSS that applies the arcade aesthetic to common HTML elements */
const BASE_CSS = `
/* Arcade Graphics Engine — Base Theme */
body.arcade-theme {
  background: var(--arcade-bg);
  color: var(--arcade-primary);
  font-family: var(--arcade-font);
}

.arcade-theme * {
  box-sizing: border-box;
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

/* Neon button */
.arcade-btn {
  background: transparent;
  border: 1px solid var(--arcade-primary-dim);
  color: var(--arcade-primary);
  font-family: var(--arcade-font);
  padding: 10px 20px;
  cursor: pointer;
  position: relative;
  clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px);
  transition: all 0.2s;
}
.arcade-btn:hover {
  border-color: var(--arcade-primary);
  box-shadow:
    0 0 8px var(--arcade-primary-glow),
    inset 0 0 8px var(--arcade-primary-glow);
  text-shadow: 0 0 8px currentColor;
  background: rgba(255, 255, 255, 0.03);
}
.arcade-btn:active {
  transform: scale(0.97);
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
  font-size: 10px;
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
  font-family: var(--arcade-font);
  font-size: 10px;
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
`;
