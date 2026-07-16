import { Money } from '@screeny05/ts-money';
import { CartCost } from '@laioutr-core/canonical-types/entity/cart';
import { EntityComponentType } from '@laioutr-core/core-types/orchestr';
import { Schemas } from '../types/storeApiTypes';

/** Map a Shopware cart's aggregate price into the canonical nested `CartCost`. */
export const mapCartCost = (cart: Schemas['Cart'], currency: string): EntityComponentType<typeof CartCost> => {
  const money = (value: number) => Money.fromDecimal(value, currency);

  const lineItems = cart.lineItems ?? [];
  const deliveries = cart.deliveries ?? [];
  const price = cart.price;

  const subtotalValue = price?.positionPrice ?? lineItems.reduce((sum, li) => sum + (li.price?.totalPrice ?? 0), 0);
  const totalValue = price?.totalPrice ?? subtotalValue;

  const shippingValue = deliveries.reduce((sum, d) => sum + (d.shippingCosts?.totalPrice ?? 0), 0);

  const itemTaxValue = (price?.calculatedTaxes ?? []).reduce((sum, t) => sum + (t.tax ?? 0), 0);
  const shippingTaxValue = deliveries.reduce(
    (sum, d) => sum + (d.shippingCosts?.calculatedTaxes ?? []).reduce((s, t) => s + (t.tax ?? 0), 0),
    0
  );

  // Shopware runtime returns 'gross' | 'net' | 'tax-free'; the generated enum omits
  // 'gross'. 'gross' means product prices already include tax.
  const taxIncluded = (price?.taxStatus as string | undefined) === 'gross';

  const taxes = (price?.calculatedTaxes ?? []).map((t) => ({
    rate: (t.taxRate ?? 0) / 100,
    amount: money(t.tax ?? 0),
  }));

  return {
    subtotal: money(subtotalValue),
    subtotalIsEstimated: false,
    total: money(totalValue),
    totalIsEstimated: false,
    ...(deliveries.length > 0 ? { shipping: { total: money(shippingValue), isEstimated: false } } : {}),
    tax: { total: money(itemTaxValue + shippingTaxValue), isEstimated: false, isIncluded: taxIncluded },
    ...(taxes.length > 0 ? { taxes } : {}),
  };
};
