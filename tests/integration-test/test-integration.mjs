/**
 * INTEGRATION TEST
 *
 * Simulates what happens when a game repo installs the arcade graphics engine.
 * Tests every public API surface that a consuming game would use.
 *
 * Run: node test-integration.mjs
 */

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

console.log('\n═══════════════════════════════════════════');
console.log('  ARCADE GRAPHICS ENGINE — INTEGRATION TEST');
console.log('═══════════════════════════════════════════\n');

// ── Test 1: Can we import the style module? ──
console.log('STYLE MODULE:');

const style = await import('../../dist/style/index.js');

test('exports createNeonColor', () => {
  assert(typeof style.createNeonColor === 'function');
  const color = style.createNeonColor('Test', 300);
  assert(color.core.length === 4, 'core should be RGBA');
  assert(color.glow.length === 4, 'glow should be RGBA');
  assert(color.dim.length === 4, 'dim should be RGBA');
});

test('exports color palettes', () => {
  assert(style.PALETTE_NEON_INFERNO, 'NEON_INFERNO should exist');
  assert(style.PALETTE_ELECTRIC_OCEAN, 'ELECTRIC_OCEAN should exist');
  assert(style.PALETTE_TOXIC_JUNGLE, 'TOXIC_JUNGLE should exist');
  assert(style.PALETTE_SOLAR_STORM, 'SOLAR_STORM should exist');
  assert(style.ALL_PALETTES.length === 4, 'should have 4 palettes');
});

test('exports createPalette for custom palettes', () => {
  const custom = style.createPalette('MyGame', 200, 30, 120, 0);
  assert(custom.name === 'MyGame');
  assert(custom.primary.core.length === 4);
  assert(custom.secondary.core.length === 4);
});

test('exports theme creation', () => {
  assert(typeof style.createTheme === 'function');
  assert(style.DEFAULT_THEME, 'DEFAULT_THEME should exist');
  assert(style.LITE_THEME, 'LITE_THEME should exist');
  const theme = style.createTheme('Custom', style.PALETTE_NEON_INFERNO);
  assert(theme.name === 'Custom');
  assert(theme.glow, 'theme should have glow config');
  assert(theme.pixel, 'theme should have pixel config');
});

test('exports color utilities', () => {
  assert(typeof style.rgba === 'function');
  assert(typeof style.hslToRgba === 'function');
  assert(typeof style.rgbaToHsl === 'function');
  assert(typeof style.rgbaToCss === 'function');
  assert(typeof style.lerpColor === 'function');
  assert(typeof style.withAlpha === 'function');

  const css = style.rgbaToCss([255, 128, 0, 0.5]);
  assert(css === 'rgba(255, 128, 0, 0.5)', `got: ${css}`);
});

test('exports style spec', () => {
  assert(style.SPEC, 'SPEC should exist');
  assert(style.SPEC.BACKGROUND, 'SPEC should have BACKGROUND');
  assert(typeof style.generateMaterialShading === 'function');
});

test('exports style validator', () => {
  assert(typeof style.validateStyle === 'function');
  assert(typeof style.suggestAdjustments === 'function');
  assert(style.DEFAULT_STYLE_GUIDE, 'DEFAULT_STYLE_GUIDE should exist');
});

// ── Test 2: Can we import the engine module? ──
console.log('\nENGINE MODULE:');

const engine = await import('../../dist/engine/index.js');

test('exports PixelBuffer operations', () => {
  assert(typeof engine.createPixelBuffer === 'function');
  assert(typeof engine.getPixel === 'function');
  assert(typeof engine.setPixel === 'function');
  const buf = engine.createPixelBuffer(4, 4);
  assert(buf.width === 4);
  assert(buf.height === 4);
  assert(buf.data.length === 64);
});

test('exports Gaussian blur', () => {
  assert(typeof engine.gaussianBlur === 'function');
  const buf = engine.createPixelBuffer(8, 8);
  const blurred = engine.gaussianBlur(buf, 2);
  assert(blurred.width === 8);
});

test('exports sprite processing', () => {
  assert(typeof engine.neonifySprite === 'function');
  assert(typeof engine.createNeonSprite === 'function');
  assert(typeof engine.spriteFromGrid === 'function');
  assert(typeof engine.recolorSprite === 'function');
});

test('exports particle system', () => {
  assert(typeof engine.ParticleSystem === 'function');
  assert(typeof engine.createFireEmitter === 'function');
  assert(typeof engine.createIceEmitter === 'function');
});

test('exports image analysis', () => {
  assert(typeof engine.analyzeImage === 'function');
  assert(typeof engine.analysisConsistencyScore === 'function');
});

test('exports bloom system', () => {
  assert(typeof engine.multiLayerBloom === 'function');
  assert(typeof engine.sobelEdges === 'function');
  assert(typeof engine.distanceField === 'function');
});

// ── Test 3: Can we import the integration module? ──
console.log('\nINTEGRATION MODULE:');

const integration = await import('../../dist/integration/index.js');

test('exports ThemeProvider', () => {
  assert(typeof integration.ThemeProvider === 'function');
  // Note: ThemeProvider.create() and injectCSS() need DOM — can't test in Node
  // But we can verify the class exists and has the right static methods
  assert(typeof integration.ThemeProvider.create === 'function');
  assert(typeof integration.ThemeProvider.custom === 'function');
});

// ── Test 4: Can we import the components module? ──
console.log('\nCOMPONENTS MODULE:');

const components = await import('../../dist/components/index.js');

test('exports menu renderer', () => {
  assert(typeof components.renderMenu === 'function');
});

test('exports gauge components', () => {
  assert(typeof components.drawBarGauge === 'function');
  assert(typeof components.drawRadialGauge === 'function');
  assert(typeof components.drawLineChart === 'function');
  assert(typeof components.drawRadarDisplay === 'function');
});

test('exports panel components', () => {
  assert(typeof components.drawPanel === 'function');
  assert(typeof components.drawDivider === 'function');
  assert(typeof components.drawGrid === 'function');
});

test('exports effects', () => {
  assert(typeof components.drawAmbientParticles === 'function');
  assert(typeof components.drawScanLines === 'function');
  assert(typeof components.drawCornerFlourish === 'function');
  assert(typeof components.canvasBloom === 'function');
});

test('exports icon system', () => {
  assert(typeof components.drawIcon === 'function');
  assert(typeof components.drawFramedIcon === 'function');
  assert(typeof components.getIconNames === 'function');
  const names = components.getIconNames();
  assert(names.length > 0, 'should have icon names');
  assert(names.includes('play'), 'should include play icon');
});

// ── Test 5: Can we import the pipeline module? ──
console.log('\nPIPELINE MODULE:');

const pipeline = await import('../../dist/pipeline/index.js');

test('exports sprite sheet operations', () => {
  assert(typeof pipeline.sliceSpriteSheet === 'function');
  assert(typeof pipeline.assembleSpriteSheet === 'function');
  assert(typeof pipeline.generateManifest === 'function');
});

test('exports image loading utilities', () => {
  assert(typeof pipeline.downscalePixelArt === 'function');
  assert(typeof pipeline.pixelBufferFromRaw === 'function');
});

// ── Test 6: Can we import from the main entry point? ──
console.log('\nMAIN ENTRY POINT:');

const main = await import('../../dist/index.js');

test('main index re-exports style', () => {
  assert(typeof main.createNeonColor === 'function');
  assert(main.PALETTE_NEON_INFERNO);
});

test('main index re-exports engine', () => {
  assert(typeof main.createPixelBuffer === 'function');
  assert(typeof main.gaussianBlur === 'function');
});

test('main index re-exports components', () => {
  assert(typeof main.drawIcon === 'function');
  assert(typeof main.renderMenu === 'function');
});

test('main index re-exports integration', () => {
  assert(typeof main.ThemeProvider === 'function');
});

// ── Test 7: End-to-end workflow ──
console.log('\nEND-TO-END WORKFLOW:');

test('create custom palette → create theme → use for sprite processing', () => {
  const palette = main.createPalette('SpaceGame', 220, 160, 30, 0);
  const theme = main.createTheme('SpaceGame', palette);

  // Create a small test sprite
  const sprite = main.createPixelBuffer(8, 8);
  for (let y = 2; y < 6; y++) {
    for (let x = 2; x < 6; x++) {
      main.setPixel(sprite, x, y, [200, 100, 50, 1]);
    }
  }

  // Process through neon pipeline
  const result = main.createNeonSprite(sprite, theme, 'primary');
  assert(result.width === 8, 'output should be 8px wide');
  assert(result.height === 8, 'output should be 8px tall');

  // Verify some pixels changed
  let hasContent = false;
  for (let i = 0; i < result.data.length; i += 4) {
    if (result.data[i] > 0 || result.data[i + 1] > 0 || result.data[i + 2] > 0) {
      hasContent = true;
      break;
    }
  }
  assert(hasContent, 'processed sprite should have non-zero pixels');
});

test('validate a rendered asset against style guide', () => {
  const testImage = main.createPixelBuffer(32, 32);
  // Create a multi-color test image
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const r = Math.round((x / 31) * 200 + 30);
      const g = Math.round((y / 31) * 150 + 50);
      const b = Math.round(100 + Math.sin(x * 0.3) * 50);
      main.setPixel(testImage, x, y, [r, g, b, 1]);
    }
  }
  const result = main.validateStyle(testImage);
  assert(typeof result.passed === 'boolean', 'should return passed boolean');
  assert(typeof result.score === 'number', 'should return score');
  assert(Array.isArray(result.checks), 'should return checks array');
});

// ── Summary ──
console.log('\n═══════════════════════════════════════════');
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════\n');

if (failed > 0) {
  console.log('  ❌ INTEGRATION TEST FAILED\n');
  process.exit(1);
} else {
  console.log('  ✅ ALL INTEGRATION TESTS PASSED');
  console.log('  The engine can be installed and used by any game repo.\n');
  process.exit(0);
}
