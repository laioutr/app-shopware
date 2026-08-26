import { describe, expect, it } from 'vitest';
import { guessWellKnownName } from './wellKnownOptionName';

describe('guessWellKnownName', () => {
  it('folds case, diacritics and ß onto one key', () => {
    expect(guessWellKnownName('Größe')).toBe('size');
    expect(guessWellKnownName('grösse')).toBe('size');
    expect(guessWellKnownName('GROESSE')).toBe('size');
  });

  it('resolves the same axis across languages', () => {
    expect(guessWellKnownName('Farbe')).toBe('color');
    expect(guessWellKnownName('colour')).toBe('color');
    expect(guessWellKnownName('kleur')).toBe('color');
  });

  it('leaves an unrecognised axis undefined', () => {
    expect(guessWellKnownName('Stutzengröße')).toBeUndefined();
  });
});
