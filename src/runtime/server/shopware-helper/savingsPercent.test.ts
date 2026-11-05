import { Money } from '@screeny05/ts-money';
import { describe, expect, it } from 'vitest';
import { savingsPercentOf } from './savingsPercent';

const eur = (amount: number) => Money.fromDecimal(amount, 'EUR');

describe('savingsPercentOf', () => {
  it('returns whole percent saved', () => {
    expect(savingsPercentOf(eur(80), eur(100))).toBe(20);
    expect(savingsPercentOf(eur(90), eur(100))).toBe(10);
  });

  it('rounds down, so it never overstates the discount', () => {
    expect(savingsPercentOf(eur(80.01), eur(100))).toBe(19);
    expect(savingsPercentOf(eur(7.05), eur(15))).toBe(53);
    expect(savingsPercentOf(eur(1), eur(3))).toBe(66);
  });

  it('keeps an exact percentage exact despite decimal amounts', () => {
    expect(savingsPercentOf(eur(11.9), eur(17))).toBe(30);
    expect(savingsPercentOf(eur(0.7), eur(1))).toBe(30);
  });

  it('is undefined without a saving', () => {
    expect(savingsPercentOf(eur(100), eur(100))).toBeUndefined();
    expect(savingsPercentOf(eur(299), eur(279))).toBeUndefined();
    expect(savingsPercentOf(eur(10), undefined)).toBeUndefined();
    expect(savingsPercentOf(eur(0), eur(0))).toBeUndefined();
  });
});
