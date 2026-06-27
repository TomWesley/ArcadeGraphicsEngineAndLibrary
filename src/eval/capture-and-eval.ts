import * as path from 'path';
import * as fs from 'fs';
import { evaluateAndReport, EvalOptions } from './vision-evaluator';

// Load .env
import 'dotenv/config';

/**
 * CLI tool: Evaluate any visual asset — PNG, SVG, or live URL.
 *
 * Usage:
 *   npx tsx src/eval/capture-and-eval.ts <file> <asset-type> <description>
 *   npx tsx src/eval/capture-and-eval.ts --url <url> <asset-type> <description>
 *   npx tsx src/eval/capture-and-eval.ts --url <url> --selector "#myElement" <asset-type> <description>
 *
 * Supports: .png, .jpg, .webp (direct), .svg (auto-rendered to PNG), URLs (screenshot)
 *
 * Examples:
 *   npx tsx src/eval/capture-and-eval.ts favicon.svg favicon "Winged W logo"
 *   npx tsx src/eval/capture-and-eval.ts screenshot.png icon "Shield icon"
 *   npx tsx src/eval/capture-and-eval.ts --url http://localhost:8093 --selector "#svg256" favicon "Winged W"
 */

async function renderSvgToPng(svgPath: string, outputPath: string, size: number = 512): Promise<void> {
  const svgContent = fs.readFileSync(svgPath, 'utf-8');

  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: size, height: size });

  // Render SVG in a clean page — no surrounding UI, just the SVG
  const html = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; }
  body { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
  svg { width: ${size}px; height: ${size}px; }
</style></head>
<body>${svgContent}</body></html>`;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: outputPath, omitBackground: false });
  await browser.close();
}

async function captureUrl(url: string, outputPath: string, selector?: string): Promise<void> {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  if (selector) {
    // Capture just the selected element
    const el = await page.$(selector);
    if (el) {
      await el.screenshot({ path: outputPath });
      console.log(`   Captured element "${selector}"`);
    } else {
      console.error(`   ❌ Selector "${selector}" not found, capturing full page`);
      await page.screenshot({ path: outputPath, fullPage: false });
    }
  } else {
    await page.screenshot({ path: outputPath, fullPage: false });
  }

  await browser.close();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log(`
  VISION EVALUATOR — Give the graphics engine eyes

  Usage:
    npx tsx src/eval/capture-and-eval.ts <file.png|.svg> <asset-type> <description>
    npx tsx src/eval/capture-and-eval.ts --url <url> [--selector "#id"] <asset-type> <description>

  Supported inputs:
    .png, .jpg, .webp    → sent directly to evaluator
    .svg                 → auto-rendered to PNG at 512px, then evaluated
    --url                → screenshot via Puppeteer
    --selector           → capture only a specific element from the page

  Asset types: icon, favicon, menu, hud, sprite, scene, component

  Examples:
    npx tsx src/eval/capture-and-eval.ts favicon.svg favicon "Winged W logo"
    npx tsx src/eval/capture-and-eval.ts --url http://localhost:8093 --selector "#svg256" favicon "W favicon"
    npx tsx src/eval/capture-and-eval.ts icon-shield.png icon "Defense shield"
    `);
    process.exit(1);
  }

  let imagePath: string;
  let assetType: string;
  let description: string;
  let cleanup = false;

  if (args[0] === '--url') {
    const url = args[1];
    let selector: string | undefined;
    let argOffset = 2;

    if (args[2] === '--selector') {
      selector = args[3];
      argOffset = 4;
    }

    assetType = args[argOffset];
    description = args.slice(argOffset + 1).join(' ');

    console.log(`📸 Capturing from ${url}${selector ? ` (selector: ${selector})` : ''}...`);

    imagePath = path.join(process.cwd(), '.eval-screenshot.png');
    await captureUrl(url, imagePath, selector);
    cleanup = true;

    console.log(`   Screenshot saved to ${imagePath}`);
  } else {
    const inputFile = args[0];
    assetType = args[1];
    description = args.slice(2).join(' ');

    if (!fs.existsSync(inputFile)) {
      console.error(`❌ File not found: ${inputFile}`);
      process.exit(1);
    }

    const ext = path.extname(inputFile).toLowerCase();

    if (ext === '.svg') {
      // Render SVG to PNG for evaluation
      console.log(`🔄 Rendering SVG to PNG at 512px...`);
      imagePath = path.join(process.cwd(), '.eval-svg-render.png');
      await renderSvgToPng(inputFile, imagePath);
      cleanup = true;
      console.log(`   Rendered to ${imagePath}`);
    } else {
      imagePath = inputFile;
    }
  }

  const options: EvalOptions = {
    assetType: assetType as EvalOptions['assetType'],
    description,
    threshold: 7,
  };

  try {
    const result = await evaluateAndReport(imagePath, options);

    if (cleanup && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    process.exit(result.passed ? 0 : 1);
  } catch (err: any) {
    console.error(`❌ Evaluation failed: ${err.message}`);
    process.exit(1);
  }
}

main();
