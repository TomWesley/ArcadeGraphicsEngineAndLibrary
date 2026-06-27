import * as path from 'path';
import * as fs from 'fs';
import { evaluateAndReport, EvalOptions } from './vision-evaluator';

// Load .env
import 'dotenv/config';

/**
 * CLI tool: Capture a screenshot from a test page and evaluate it.
 *
 * Usage:
 *   npx tsx src/eval/capture-and-eval.ts <image-path> <asset-type> <description>
 *
 * Examples:
 *   npx tsx src/eval/capture-and-eval.ts screenshot.png favicon "Winged W with neon glow"
 *   npx tsx src/eval/capture-and-eval.ts icon.png icon "Shield defense icon"
 *
 * Or capture from a URL:
 *   npx tsx src/eval/capture-and-eval.ts --url http://localhost:8093 favicon "Winged W favicon"
 */

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log(`
  VISION EVALUATOR — Give the graphics engine eyes

  Usage:
    npx tsx src/eval/capture-and-eval.ts <image-path> <asset-type> <description>
    npx tsx src/eval/capture-and-eval.ts --url <url> <asset-type> <description>

  Asset types: icon, favicon, menu, hud, sprite, scene, component

  Examples:
    npx tsx src/eval/capture-and-eval.ts screenshot.png favicon "Winged W logo"
    npx tsx src/eval/capture-and-eval.ts --url http://localhost:8093 favicon "Winged W favicon"
    `);
    process.exit(1);
  }

  let imagePath: string;
  let assetType: string;
  let description: string;

  if (args[0] === '--url') {
    // Capture screenshot from URL using Puppeteer
    const url = args[1];
    assetType = args[2];
    description = args.slice(3).join(' ');

    console.log(`📸 Capturing screenshot from ${url}...`);

    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

    // Wait a moment for any animations to settle
    await new Promise(r => setTimeout(r, 1000));

    imagePath = path.join(process.cwd(), '.eval-screenshot.png');
    await page.screenshot({ path: imagePath, fullPage: false });
    await browser.close();

    console.log(`   Screenshot saved to ${imagePath}`);
  } else {
    imagePath = args[0];
    assetType = args[1];
    description = args.slice(2).join(' ');
  }

  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Image not found: ${imagePath}`);
    process.exit(1);
  }

  const options: EvalOptions = {
    assetType: assetType as EvalOptions['assetType'],
    description,
    threshold: 7,
  };

  try {
    const result = await evaluateAndReport(imagePath, options);

    // Clean up temp screenshot if we captured from URL
    if (args[0] === '--url' && fs.existsSync('.eval-screenshot.png')) {
      fs.unlinkSync('.eval-screenshot.png');
    }

    process.exit(result.passed ? 0 : 1);
  } catch (err: any) {
    console.error(`❌ Evaluation failed: ${err.message}`);
    process.exit(1);
  }
}

main();
