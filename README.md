# Arcade Graphics Engine

A sleek, futuristic graphics engine and UI style library for browser-based
arcade games. Install it into any game repo and the game gets the house
visual identity — icons, HUD instruments, menus, typography, and theming —
so every game built on it looks like it belongs in the same universe.

**Style**: Halo HUD · Elite Dangerous cockpit · *2001* instrument panels.
Dark fields, thin glowing lines, gradient fills, clipped corners.
Not pixel art, not retro, not cute.

## Install

Pin to a release tag — installs are then reproducible and upgrades are
deliberate:

```bash
npm install github:TomWesley/ArcadeGraphicsEngineAndLibrary#v0.3.0
```

The package builds itself on install (`prepare` script). ESM and CJS both
supported, TypeScript types included.

## Quickstart

```javascript
import {
  ThemeProvider,
  drawIcon, drawPanel, drawBarGauge, drawRadialGauge, drawRadarDisplay,
  setupHiDPICanvas, applyType,
} from '@tomwesley/arcade-graphics-engine';

// 1. One palette pick reskins everything (or .custom(...) for your own hues)
const provider = ThemeProvider.create('ELECTRIC_OCEAN');
provider.injectCSS();                          // CSS vars + classes + fonts
document.body.classList.add('arcade-theme');

// 2. Crisp canvas on any display
const { ctx, width, height } = setupHiDPICanvas(myCanvas);

// 3. Draw with the theme
const theme = provider.theme;
drawIcon(ctx, 'target', 40, 40, 48, provider.palette.primary.core);
drawBarGauge(ctx, theme, { x: 10, y: 80, width: 220, height: 22, value: 0.7, label: 'HULL', showValue: true });
drawRadarDisplay(ctx, theme, { x: 250, y: 20, size: 160, sweepAngle: t, blips });
```

Weak hardware? `ThemeProvider.create('ELECTRIC_OCEAN', { lowPower: true })`
collapses the glow system to a single cheap pass.

## What's inside

| Area | Highlights |
|---|---|
| **Theming** | 4 built-in palettes + custom hues; CSS variable injection; `.arcade-btn/panel/input/...` classes; SSR-safe |
| **Typography** | 7 fixed type roles (Orbitron/Rajdhani/Share Tech Mono), CSS classes + canvas helpers |
| **Icons** | 40 hand-built HUD icons + aliases, palette-tinted, `drawIcon`/`drawFramedIcon` |
| **Instruments** | Panels, segmented bar gauges, radial gauges, radar with phosphor sweep, charts |
| **Effects** | Ambient particles, scan lines, corner flourishes, canvas bloom |
| **Engine** | PixelBuffer ops, Gaussian blur, Sobel edges, bloom, particles, sprite pipeline |
| **A11y/perf** | `prefers-reduced-motion` respected, keyboard focus states, low-power glow mode, HiDPI helper |

## Documentation

- **[BRANDING.md](BRANDING.md)** — the definitive brand guide: identity,
  color roles, type system, shape language, glow rules, motion, voice.
- **[CLAUDE.md](CLAUDE.md)** — the integration manual (also read by AI
  assistants working in consuming game repos): quickstart, icon authoring
  recipes, component APIs.
- **[CHANGELOG.md](CHANGELOG.md)** — release history.

## Live reference pages

```bash
npm run test:brand      # living brand guide — palettes, type, icons, components
npm run test:homepage   # complete fake game home page built from the engine
npm run test:iconreview # icon library review board
npm run test:hud        # animated command-center dashboard
```

## Development

```bash
npm install
npm run typecheck
npm test                 # 185 unit tests
npm run test:integration # consumer-surface integration tests
npm run build
```

CI runs typecheck, build, and both test suites on every push.

## License

[MIT](LICENSE)
