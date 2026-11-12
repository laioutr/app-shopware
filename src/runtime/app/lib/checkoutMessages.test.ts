// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { checkoutMessages } from './checkoutMessages';

describe('checkoutMessages', () => {
  it('returns German for a German locale, with or without a region', () => {
    expect(checkoutMessages('de').loading).toBe('Checkout wird geladen…');
    expect(checkoutMessages('de-DE').loading).toBe('Checkout wird geladen…');
    expect(checkoutMessages('de-at').loading).toBe('Checkout wird geladen…');
  });

  it('returns English for an English locale', () => {
    expect(checkoutMessages('en-GB').loading).toBe('Loading checkout…');
  });

  it('falls back to English for a language it has no text for', () => {
    expect(checkoutMessages('fr-FR').loading).toBe('Loading checkout…');
    expect(checkoutMessages('').loading).toBe('Loading checkout…');
  });

  it('does not mistake a language that merely starts with "de" for German', () => {
    expect(checkoutMessages('dev').loading).toBe('Loading checkout…');
  });
});
