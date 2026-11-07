import type { Money } from '@screeny05/ts-money';

/**
 * Whole percent saved on `reference`, rounded down so a badge never claims more than the actual
 * discount (19.99 % shows as 19 %, never 20 %). Computed on minor units, so no float error tips an
 * exact percentage below its value. Undefined when there is nothing saved.
 */
export const savingsPercentOf = (price: Money, reference: Money | undefined): number | undefined => {
  if (!reference || reference.amount <= 0 || price.amount >= reference.amount) return undefined;
  return Math.floor(((reference.amount - price.amount) * 100) / reference.amount);
};
