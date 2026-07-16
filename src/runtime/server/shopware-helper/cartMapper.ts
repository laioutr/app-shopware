import { Money } from '@screeny05/ts-money';
import { createFallbackSlug, getEntitySeoSlug } from './mappers/slugMapper';
import { mapMedia } from './mediaMapper';
import { CartCost } from '@laioutr-core/canonical-types/entity/cart';
import {
  CartItemAvailability,
  CartItemBase,
  CartItemCost,
  CartItemProductData,
  CartItemQuantityRule,
} from '@laioutr-core/canonical-types/entity/cart-item';
import { MediaImage } from '@laioutr-core/core-types/common';
import { EntityComponentType } from '@laioutr-core/core-types/orchestr';
import { ShopwareSeoUrl } from '../types/shopware';
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

/** Map a Shopware product line item into the canonical `CartItem` component values. */
export const mapCartItem = (
  lineItem: Schemas['LineItem'],
  currency: string
): {
  base: EntityComponentType<typeof CartItemBase>;
  cost: EntityComponentType<typeof CartItemCost>;
  availability: EntityComponentType<typeof CartItemAvailability>;
  quantityRule: EntityComponentType<typeof CartItemQuantityRule>;
  productData: EntityComponentType<typeof CartItemProductData>;
} => {
  const money = (value: number) => Money.fromDecimal(value, currency);

  const price = lineItem.price;
  const qtyInfo = lineItem.quantityInformation;
  // The cart line-item payload may omit associations not requested; read defensively.
  const payload = (lineItem.payload ?? {}) as Partial<{
    parentId: string;
    productNumber: string;
    availableStock: number;
    available: boolean;
    seoUrls: ShopwareSeoUrl[];
  }>;

  const unit = price?.unitPrice ?? 0;
  const total = price?.totalPrice ?? 0;
  const listPrice = price?.listPrice?.price;

  const parentId = payload.parentId ?? lineItem.referencedId ?? lineItem.id;
  const slug = getEntitySeoSlug(payload) ?? createFallbackSlug(lineItem.label ?? '', lineItem.referencedId ?? lineItem.id);

  const availableStock = payload.availableStock;
  const inStock = availableStock === undefined ? payload.available !== false : availableStock > 0;

  return {
    base: {
      type: 'product' as const,
      quantity: lineItem.quantity,
      title: lineItem.label ?? '',
      code: payload.productNumber,
      // Cart covers are product images (never video), so the narrowing cast is safe.
      cover: lineItem.cover?.media ? (mapMedia(lineItem.cover.media) as MediaImage) : undefined,
      link: {
        type: 'reference' as const,
        reference: { type: 'Product' as const, id: parentId, slug },
      },
    },
    cost: {
      single: money(unit),
      singleStrikethrough: listPrice && listPrice > unit ? money(listPrice) : undefined,
      subtotal: money(total),
      total: money(total),
    },
    availability: {
      quantity: qtyInfo?.maxPurchase ?? availableStock ?? lineItem.quantity,
      status: (inStock ? 'inStock' : 'outOfStock') as 'inStock' | 'outOfStock',
    },
    quantityRule: {
      min: qtyInfo?.minPurchase ?? 1,
      max: qtyInfo?.maxPurchase,
      increment: qtyInfo?.purchaseSteps ?? 1,
      canChange: true,
    },
    // Shopware referencePrice → canonical UnitPrice mapping is deferred; productData is optional.
    productData: undefined,
  };
};
