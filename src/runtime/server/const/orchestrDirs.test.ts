import { describe, expect, it } from 'vitest';
import { orchestrDirsFor } from './orchestrDirs';

describe('orchestrDirsFor', () => {
  it('registers the newsletter handler unless it is switched off', () => {
    expect(orchestrDirsFor({})).toEqual(['server/orchestr', 'server/orchestr-newsletter']);
    expect(orchestrDirsFor({ newsletter: { enabled: true } })).toEqual(['server/orchestr', 'server/orchestr-newsletter']);
    expect(orchestrDirsFor({ newsletter: { enabled: false } })).toEqual(['server/orchestr']);
  });
});
