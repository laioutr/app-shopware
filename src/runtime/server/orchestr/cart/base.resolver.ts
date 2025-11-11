import { CartBase, CartCost } from '@laioutr-core/canonical-types/entity/cart';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';

export default defineShopwareComponentResolver({
  entityType: 'Cart',
  label: 'Shopware Cart Component Resolver',
  provides: [CartBase, CartCost],
  resolve: async ({ context, clientEnv, $entity }) => {
    const { storefrontClient } = context;

    /* Cart is identified per unique context session */
    const cart = await storefrontClient.invoke('readCart get /checkout/cart');

    // helper to build Money objects
    const money = (amount: number, currency: string) => ({ amount, currency });

    // safe defaults
    const lineItems = cart.data?.lineItems ?? [];
    const deliveries = cart.data?.deliveries ?? [];
    const price = cart.data?.price ?? {};

    // quantities
    const totalQuantity = lineItems.reduce((sum, li) => sum + (li.quantity ?? 0), 0);

    // subtotal (items only). Prefer cart.price.positionPrice; fallback to summing items
    const subtotalAmount = price.positionPrice ?? lineItems.reduce((sum, li) => sum + (li.price?.totalPrice ?? 0), 0);

    // shipping total
    const shippingTotal = deliveries.reduce((sum, d) => sum + (d.shippingCosts?.totalPrice ?? 0), 0);

    // grand total (items + shipping – promotions already reflected by Shopware totals)
    const totalAmount = price.totalPrice ?? subtotalAmount + shippingTotal;

    // taxes: sum item taxes + shipping taxes
    const itemTaxes = (price.calculatedTaxes ?? []).reduce((sum, t) => sum + (t.tax ?? 0), 0);
    const shippingTaxes = deliveries.reduce(
      (sum, d) => sum + (d.shippingCosts?.calculatedTaxes ?? []).reduce((s, t) => s + (t.tax ?? 0), 0),
      0
    );
    const totalTaxAmount = itemTaxes + shippingTaxes;

    // taxesIncluded is based on taxStatus ("gross" means prices include tax)
    const taxesIncluded = (price.taxStatus ?? 'tax-free') === 'net';

    return {
      entities: [
        $entity({
          id: cart.data?.token ?? '',

          base: () => ({
            totalQuantity,
            discountCodes: [],
          }),

          cost: () => ({
            subtotal: money(Number(subtotalAmount || 0), clientEnv.currency),
            subtotalIsEstimated: false,

            total: money(Number(totalAmount || 0), clientEnv.currency),
            totalIsEstimated: false,

            totalTax: money(Number(totalTaxAmount || 0), clientEnv.currency),
            totalTaxIsEstimated: false,

            totalDuty: money(0, clientEnv.currency), // Shopware doesn't track duties by default
            totalDutyIsEstimated: false,

            dutiesIncluded: false,
            taxesIncluded,
          }),
        }),
      ],
    };
  },
});
