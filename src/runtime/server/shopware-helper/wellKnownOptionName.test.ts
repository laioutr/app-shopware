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

  // Shopware's public demo shop names its colour axis this way, and an exact-match
  // table returns undefined for it — so the tile finds no colour axis and renders
  // no swatches.
  it('resolves a compound axis name from its leading known term', () => {
    expect(guessWellKnownName('Colour / Material')).toBe('color');
    expect(guessWellKnownName('Größe / Weite')).toBe('size');
    expect(guessWellKnownName('Farbe - Muster')).toBe('color');
  });

  it('resolves axis names observed on live shops', () => {
    expect(guessWellKnownName('Farbton')).toBe('color');
    expect(guessWellKnownName('Größe')).toBe('size');
  });

  it('still reports nothing when no token is a known axis', () => {
    expect(guessWellKnownName('Selection')).toBeUndefined();
    expect(guessWellKnownName('Capacity')).toBeUndefined();
    expect(guessWellKnownName('Elli')).toBeUndefined();
  });
});
