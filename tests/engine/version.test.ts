import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ENGINE_VERSION } from '../../src/version';

describe('ENGINE_VERSION', () => {
  it('matches the package.json version', () => {
    const pkgPath = fileURLToPath(new URL('../../package.json', import.meta.url));
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    expect(ENGINE_VERSION).toBe(pkg.version);
  });

  it('is a semver string', () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
