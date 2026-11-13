import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The release workflow reads the manifest only after npm has published, so a broken file ships
// to npm and keeps the version out of the Cockpit.
describe('laioutr.manifest.json', () => {
  it('parses as JSON', () => {
    const text = readFileSync(new URL('../laioutr.manifest.json', import.meta.url), 'utf8');

    expect(() => JSON.parse(text)).not.toThrow();
  });
});
