import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

/**
 * VISION EVALUATOR
 *
 * Gives the graphics engine "eyes." Takes a rendered image (PNG/SVG),
 * sends it to Claude Vision, and gets back a quality evaluation
 * against our style guide.
 *
 * This is the core of the auto-iteration loop:
 * Generate → Render → Evaluate → Adjust → Repeat until score ≥ threshold
 */

export interface EvalResult {
  score: number;           // 1-10
  passed: boolean;         // score >= threshold
  strengths: string[];     // what's working
  issues: string[];        // what needs fixing
  suggestions: string[];   // specific actionable improvements
  reasoning: string;       // full evaluation reasoning
}

export interface EvalOptions {
  /** What type of asset is being evaluated */
  assetType: 'icon' | 'favicon' | 'menu' | 'hud' | 'sprite' | 'scene' | 'component';
  /** What the asset is supposed to represent */
  description: string;
  /** Minimum score to pass (default 7) */
  threshold?: number;
  /** Additional context or requirements */
  context?: string;
}

const STYLE_GUIDE_PROMPT = `You are evaluating a visual asset for a sleek futuristic game graphics engine.

STYLE REFERENCE: Think Halo HUD, Elite Dangerous cockpit, 2001: A Space Odyssey interfaces.

CORE STYLE RULES:
- Dark backgrounds with subtle depth (radial gradients, not flat)
- Thin line UI with selective glow (1-2px strokes, bloom effects)
- Gradient fills on shapes (never flat monotone)
- Clean geometry — circles, hexagons, angular shapes
- Everything should feel like a spacecraft instrument panel
- High contrast between UI elements and background
- Adult, clean, military-grade — NOT childish, cute, or retro
- NO pixel art, no chunky blocks, no retro aesthetics

WHAT MAKES A GOOD ASSET:
- Reads instantly — you know what it is at a glance
- Has visual depth — gradients, inner detail, highlight accents
- Feels premium — like it belongs on a $60 game, not a free mobile app
- Works at multiple sizes — recognizable even small
- Consistent with the spacecraft/HUD aesthetic

WHAT TO PENALIZE:
- Flat, monotone fills (no gradient = lazy)
- Too simple / not enough detail for the size
- Childish or gamey elements (stars, hearts, cute shapes)
- Pixelated or rough edges
- Poor contrast against background
- Looks like a free icon pack, not a custom designed asset`;

/**
 * Evaluate an image against our style guide using Claude Vision.
 */
export async function evaluateAsset(
  imagePath: string,
  options: EvalOptions,
): Promise<EvalResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY not set. Add it to your .env file.\n' +
      'Get a key at console.anthropic.com → Settings → API Keys'
    );
  }

  const client = new Anthropic({ apiKey });

  // Read image
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mediaType = ext === '.png' ? 'image/png' :
                    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                    ext === '.gif' ? 'image/gif' :
                    ext === '.webp' ? 'image/webp' : 'image/png';

  const threshold = options.threshold ?? 7;

  const userPrompt = `Evaluate this ${options.assetType} asset.

ASSET DESCRIPTION: ${options.description}
${options.context ? `ADDITIONAL CONTEXT: ${options.context}` : ''}

Score it 1-10 against the style guide, where:
1-3: Fails badly, needs complete redo
4-5: Below standard, significant issues
6: Acceptable but not impressive
7-8: Good, meets the quality bar
9-10: Excellent, would ship proudly

Respond in this EXACT JSON format (no markdown, no code fences):
{
  "score": <number 1-10>,
  "strengths": ["<strength 1>", "<strength 2>"],
  "issues": ["<issue 1>", "<issue 2>"],
  "suggestions": ["<specific actionable fix 1>", "<specific actionable fix 2>"],
  "reasoning": "<2-3 sentence overall assessment>"
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: 'text',
            text: STYLE_GUIDE_PROMPT + '\n\n' + userPrompt,
          },
        ],
      },
    ],
  });

  // Parse response
  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const parsed = JSON.parse(text);
    return {
      score: parsed.score,
      passed: parsed.score >= threshold,
      strengths: parsed.strengths || [],
      issues: parsed.issues || [],
      suggestions: parsed.suggestions || [],
      reasoning: parsed.reasoning || '',
    };
  } catch {
    // If JSON parsing fails, try to extract score from text
    const scoreMatch = text.match(/"score"\s*:\s*(\d+)/);
    return {
      score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
      passed: false,
      strengths: [],
      issues: ['Failed to parse evaluation response'],
      suggestions: ['Re-run evaluation'],
      reasoning: text,
    };
  }
}

/**
 * Evaluate an image and print a formatted report to console.
 */
export async function evaluateAndReport(
  imagePath: string,
  options: EvalOptions,
): Promise<EvalResult> {
  console.log(`\n🔍 Evaluating ${options.assetType}: "${options.description}"`);
  console.log(`   Image: ${imagePath}`);
  console.log(`   Threshold: ${options.threshold ?? 7}/10\n`);

  const result = await evaluateAsset(imagePath, options);

  const scoreColor = result.score >= 8 ? '\x1b[32m' :
                     result.score >= 6 ? '\x1b[33m' : '\x1b[31m';
  const reset = '\x1b[0m';

  console.log(`   ${scoreColor}SCORE: ${result.score}/10${reset} ${result.passed ? '✓ PASSED' : '✗ FAILED'}\n`);
  console.log(`   ${result.reasoning}\n`);

  if (result.strengths.length > 0) {
    console.log('   STRENGTHS:');
    result.strengths.forEach(s => console.log(`   ✓ ${s}`));
  }

  if (result.issues.length > 0) {
    console.log('\n   ISSUES:');
    result.issues.forEach(i => console.log(`   ✗ ${i}`));
  }

  if (result.suggestions.length > 0) {
    console.log('\n   SUGGESTIONS:');
    result.suggestions.forEach(s => console.log(`   → ${s}`));
  }

  console.log('');
  return result;
}
