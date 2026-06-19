# Arcade Graphics Engine

## What This Is
A neon-glow pixel art graphics engine for browser-based arcade games. It provides a complete visual style system — colors, glow effects, UI components, sprite processing — so that multiple games can share a unified look.

## Quick Start for Games

### Installation
```bash
npm install github:TomWesley/ArcadeGraphicsEngineAndLibrary
```

### Basic Usage
```typescript
import { ThemeProvider } from '@tomwesley/arcade-graphics-engine/integration';

// Pick a palette
const theme = ThemeProvider.create('NEON_INFERNO');
// Options: 'NEON_INFERNO', 'ELECTRIC_OCEAN', 'TOXIC_JUNGLE', 'SOLAR_STORM'

// Inject CSS variables for HTML-based UI
theme.injectCSS();
document.body.classList.add('arcade-theme');

// Or create a custom palette
const custom = ThemeProvider.custom('MY_GAME', 280, 180, 40, 0);
```

### CSS Classes Available After `injectCSS()`
- `arcade-theme` — apply to body for base styles
- `arcade-btn` — neon-styled button with clipped corners
- `arcade-panel` — container with border glow
- `arcade-panel-title` — panel header
- `arcade-input` — styled input field
- `arcade-divider` — horizontal neon line
- `arcade-glow` — adds glow to any text
- `arcade-glow-secondary` — secondary color glow
- `arcade-success` / `arcade-warning` / `arcade-error` — status colors

### CSS Variables Available
```css
--arcade-bg, --arcade-bg-tint
--arcade-primary, --arcade-primary-glow, --arcade-primary-dim
--arcade-secondary, --arcade-secondary-glow, --arcade-secondary-dim
--arcade-tertiary, --arcade-tertiary-glow, --arcade-tertiary-dim
--arcade-danger, --arcade-danger-glow, --arcade-danger-dim
--arcade-font
--arcade-glow-radius, --arcade-glow-intensity
```

### Canvas Rendering
```typescript
import { CanvasAdapter } from '@tomwesley/arcade-graphics-engine/engine';
import { DEFAULT_THEME } from '@tomwesley/arcade-graphics-engine/style';

const adapter = new CanvasAdapter(canvas, DEFAULT_THEME);
adapter.clear();
adapter.drawNeonText('SCORE: 1000', 10, 10, theme.palette.primary.core);
adapter.drawNeonRect(10, 40, 200, 30, theme.palette.secondary.core, { filled: true });
adapter.applyBloom();
```

### Menu Generation
```typescript
import { renderMenu } from '@tomwesley/arcade-graphics-engine/components';

renderMenu(ctx, {
  title: 'MY GAME',
  subtitle: 'PRESS START',
  items: ['NEW GAME', 'CONTINUE', 'OPTIONS', 'QUIT'],
  selectedIndex: 0,
  footer: 'v1.0',
  background: 'vignette',
}, theme.palette, canvas.width, canvas.height);
```

### HUD Components
```typescript
import { drawBarGauge, drawRadialGauge, drawLineChart, drawRadarDisplay, drawPanel }
  from '@tomwesley/arcade-graphics-engine/components';

drawPanel(ctx, theme, { x: 10, y: 10, width: 200, height: 150, title: 'STATS' });
drawBarGauge(ctx, theme, { x: 20, y: 50, width: 180, height: 20, value: 0.75, label: 'HP' });
```

### Sprite Style Conversion
```typescript
import { convertToPixelArt } from '@tomwesley/arcade-graphics-engine/engine';
import { createNeonColor } from '@tomwesley/arcade-graphics-engine/style';

const neon = createNeonColor('Primary', 300);
const styled = convertToPixelArt(sourceBuffer, 64, 64, neon);
```

## Reskinning a Game
To reskin an existing game with this engine:

1. Install the package
2. Choose or create a palette
3. Replace the game's CSS with `theme.injectCSS()` + arcade CSS classes
4. Replace canvas drawing calls with `CanvasAdapter` methods
5. Replace UI menus with `renderMenu()`
6. Replace HUD elements with engine components
7. Process sprite assets through the pixel art pipeline

## Architecture
- `src/style/` — Color system, palettes, themes, canonical style spec
- `src/engine/` — Renderer, sprite processor, particle system, pixel art pipeline
- `src/components/` — UI: menus, panels, gauges, charts, radar, effects
- `src/pipeline/` — Image loading, sprite sheets
- `src/integration/` — ThemeProvider, CSS injection

## Built-in Palettes
| Name | Primary | Secondary | Tertiary |
|------|---------|-----------|----------|
| NEON_INFERNO | Magenta (300) | Cyan (195) | Amber (30) |
| ELECTRIC_OCEAN | Blue (220) | Seafoam (160) | Gold (45) |
| TOXIC_JUNGLE | Green (120) | Violet (270) | Yellow (55) |
| SOLAR_STORM | Orange (25) | Blue (210) | White-hot (50) |

## Font
The engine uses "Press Start 2P" from Google Fonts. Add to your HTML:
```html
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
```
