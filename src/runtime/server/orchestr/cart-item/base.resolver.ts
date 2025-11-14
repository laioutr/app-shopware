import { Money } from '@screeny05/ts-money';
import { MeasurementUnit } from '@laioutr-core/canonical-types';
import {
  CartItemAvailability,
  CartItemBase,
  CartItemCost,
  CartItemProductData,
  CartItemQuantityRule,
} from '@laioutr-core/canonical-types/entity/cart-item';
import { cartFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { mapMedia } from '../../shopware-helper/mediaMapper';

export default defineShopwareComponentResolver({
  entityType: 'CartItem',
  label: 'Shopify Cart Item Component Resolver',
  provides: [CartItemBase, CartItemCost, CartItemProductData, CartItemAvailability, CartItemQuantityRule],
  resolve: async ({ $entity, passthrough, clientEnv }) => {
    const { currency } = clientEnv;

    const cart = passthrough.require(cartFragmentToken);

    const lineItems = (cart.lineItems ?? []).filter((item) => item.type === 'product');
    const discounts = (cart.lineItems ?? []).filter((item) => item.type === 'discount');

    const mappedDiscounts = discounts.map((item) =>
      $entity({
        id: item.id,
        base: () => ({
          type: 'discount-code' as const,
          quantity: item.quantity,
          title: item.label as string,
        }),
        cost: () => ({
          single: { amount: 0, currency: clientEnv.currency },
          subtotal: { amount: 0, currency: clientEnv.currency },
          total: { amount: 0, currency: clientEnv.currency },
        }),
        productData: () => undefined,
        availability: () => ({
          quantity: 1,
          status: item.payload.available && item.payload.active ? 'inStock' : 'outOfStock',
        }),
        quantityRule: () => ({
          canChange: false,
          increment: item.quantityInformation?.purchaseSteps ?? 1,
          min: item.quantityInformation?.minPurchase ?? 1,
        }),
      })
    );

    const mappedProducts = lineItems.map((item) =>
      $entity({
        id: item.id,
        base: () => ({
          type: 'product' as const,
          quantity: item.quantity,
          title: item.label as string,
          subtitle: item.payload.name,
          brand: item.payload.manufacturerNumber,
          code: item.uniqueIdentifier,
          cover: item.cover?.media ? { ...mapMedia(item.cover.media), type: 'image' } : undefined,
          link: {
            type: 'reference',
            reference: {
              type: 'product',
              slug: item.payload.productNumber,
              id: item.id,
            },
          },
        }),
        cost: () => {
          const listPrice = item.price?.listPrice?.price ?? 0;
          const unitPrice = item.price?.unitPrice ?? 0;
          const totalPrice = item.price?.totalPrice ?? 0;
          const subtotal = Money.fromDecimal({ amount: listPrice * (item.quantity || 1), currency });
          const total = Money.fromDecimal({ amount: totalPrice, currency });
          const singleTotal = total.divide(item.quantity || 1);
          const singleStrikethrough = Money.fromDecimal({ amount: listPrice, currency });
          const hasStrikethrogh = item.price?.listPrice?.discount && item.price.listPrice.discount < 0;

          return {
            single: singleTotal,
            singleStrikethrough: hasStrikethrogh && listPrice > unitPrice ? singleStrikethrough : undefined,
            subtotal,
            total,
          };
        },
        productData: () => ({
          ...(item.payload.packUnit && item.payload.purchaseUnit && item.payload.referenceUnit ?
            {
              unitPrice: {
                price: Money.fromDecimal({ amount: item.price?.unitPrice ?? 0, currency }),
                quantity: { unit: item.payload.packUnit as MeasurementUnit, value: item.payload.purchaseUnit ?? 0 },
                reference: { unit: item.payload.packUnit as MeasurementUnit, value: item.payload.referenceUnit ?? 0 },
              },
            }
          : {}),
        }),
        availability: () => ({
          quantity: item.payload.stock ?? 0, // Keep stock level
          status: item.payload.available ? 'inStock' : 'outOfStock', // Use 'available' flag
        }),
        quantityRule: () => ({
          increment: item.quantityInformation?.purchaseSteps ?? 1,
          min: item.quantityInformation?.minPurchase ?? 1, // Default to 1
          max: item.quantityInformation?.maxPurchase ?? Number.MAX_SAFE_INTEGER,
          canChange: true, // Products should be changeable
        }),
      })
    );

    return {
      entities: [...mappedDiscounts, ...mappedProducts],
    };
  },
});
