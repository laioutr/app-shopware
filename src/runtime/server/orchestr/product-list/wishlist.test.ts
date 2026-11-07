import { beforeEach, describe, expect, it, vi } from 'vitest';
import addItems from './add-items.action';
import listResolver from './base.resolver';
import getWishlist from './get-wishlist.query';
import itemsLink from './items.link';
import removeItems from './remove-items.action';
import { ProductListItemNotFoundError, ProductListNotFoundError, UnauthenticatedError } from '@laioutr-core/canonical-types/ecommerce';
import itemVariantLink from '../product-list-item/product-variant.link';
import itemProductLink from '../product-list-item/product.link';

vi.mock('../../middleware/defineShopware', () => ({
  defineShopwareAction: (_token: unknown, run: unknown) => run,
  defineShopwareQuery: (_token: unknown, run: unknown) => run,
  defineShopwareLink: (_token: unknown, run: unknown) => run,
  defineShopwareComponentResolver: (resolver: unknown) => resolver,
}));
vi.mock('../../const/passthroughTokens', () => ({ wishlistEntryParentsToken: 'wishlistEntryParents' }));

type Run = (args: Record<string, unknown>) => Promise<unknown>;

const apiError = (status: number, code: string) => Object.assign(new Error('Failed request'), { status, details: { errors: [{ code }] } });
const notLoggedIn = () => apiError(403, 'CHECKOUT__CUSTOMER_NOT_LOGGED_IN');
const noWishlist = () => apiError(404, 'CHECKOUT__WISHLIST_NOT_FOUND');

const passthroughOf = () => {
  const store = new Map<string, unknown>();
  return { get: (key: string) => store.get(key), set: (key: string, value: unknown) => store.set(key, value) };
};

const context = { storefrontClient: { invoke: vi.fn() }, settings: { maxLimit: 100 } };
const NOT_FOUND = { notFound: true };

/** A wishlist read answering `products` for customer-1. */
const wishlistOf = (products: { id: string; parentId?: string }[], total = products.length) => ({
  data: { wishlist: { customerId: 'customer-1' }, products: { elements: products, total } },
});

const respond = (table: Record<string, unknown>) =>
  context.storefrontClient.invoke.mockImplementation(async (operation: string) => {
    if (!(operation in table)) throw new Error(`unexpected call ${operation}`);
    const answer = table[operation];
    if (answer instanceof Error) throw answer;
    return answer;
  });

const callsTo = (operation: string) => context.storefrontClient.invoke.mock.calls.filter(([name]) => name === operation);

beforeEach(() => {
  context.storefrontClient.invoke.mockReset();
});

describe('get-wishlist', () => {
  it("answers the customer's wishlist by customer id", async () => {
    respond({ 'readCustomerWishlist post /customer/wishlist': wishlistOf([{ id: 'v1', parentId: 'p1' }]) });

    await expect((getWishlist as unknown as Run)({ context, notFound: () => NOT_FOUND })).resolves.toEqual({ id: 'customer-1' });
  });

  it('resolves nothing for a guest or a customer without a wishlist', async () => {
    respond({ 'readCustomerWishlist post /customer/wishlist': notLoggedIn() });
    await expect((getWishlist as unknown as Run)({ context, notFound: () => NOT_FOUND })).resolves.toBe(NOT_FOUND);

    respond({ 'readCustomerWishlist post /customer/wishlist': noWishlist() });
    await expect((getWishlist as unknown as Run)({ context, notFound: () => NOT_FOUND })).resolves.toBe(NOT_FOUND);
  });
});

describe('the wishlist entity', () => {
  it('resolves the current wishlist with its item count and reports other ids', async () => {
    respond({ 'readCustomerWishlist post /customer/wishlist': wishlistOf([{ id: 'v1' }], 7) });

    const result = (await (listResolver as unknown as { resolve: Run }).resolve({
      entityIds: ['customer-1', 'customer-2'],
      context,
      $entity: (entity: { base: () => unknown }) => ({ ...entity, base: entity.base() }),
    })) as { entities: unknown[]; notFound: string[] };

    expect(result.entities).toEqual([{ id: 'customer-1', base: { type: 'wishlist', itemCount: 7 } }]);
    expect(result.notFound).toEqual(['customer-2']);
  });
});

describe('the items link', () => {
  it('pages through the wishlist and keeps each entry as the product row it holds', async () => {
    respond({
      'readCustomerWishlist post /customer/wishlist': wishlistOf([{ id: 'v1', parentId: 'p1' }, { id: 'p2' }], 12),
    });
    const passthrough = passthroughOf();

    const result = await (itemsLink as unknown as Run)({
      entityIds: ['customer-1'],
      context,
      pagination: { page: 2, limit: 2, offset: 2 },
      passthrough,
    });

    expect(result).toEqual({ links: [{ sourceId: 'customer-1', targetIds: ['v1', 'p2'], entityTotal: 12 }] });
    expect(callsTo('readCustomerWishlist post /customer/wishlist')[0]?.[1]).toMatchObject({ body: { page: 2, limit: 2 } });
    expect(passthrough.get('wishlistEntryParents')).toEqual({ v1: 'p1', p2: undefined });
  });
});

describe('the item links', () => {
  it('links an entry to itself as the variant', async () => {
    await expect((itemVariantLink as unknown as Run)({ entityIds: ['v1', 'p2'] })).resolves.toEqual({
      links: [
        { sourceId: 'v1', targetId: 'v1' },
        { sourceId: 'p2', targetId: 'p2' },
      ],
    });
  });

  it('links an entry to its parent product from the wishlist read', async () => {
    const passthrough = passthroughOf();
    passthrough.set('wishlistEntryParents', { v1: 'p1', p2: undefined });

    await expect((itemProductLink as unknown as Run)({ entityIds: ['v1', 'p2'], context, passthrough })).resolves.toEqual({
      links: [
        { sourceId: 'v1', targetId: 'p1' },
        { sourceId: 'p2', targetId: 'p2' },
      ],
    });
    expect(context.storefrontClient.invoke).not.toHaveBeenCalled();
  });

  it('looks up the parents the request has not read', async () => {
    respond({ 'readProduct post /product': { data: { elements: [{ id: 'v3', parentId: 'p3' }] } } });

    await expect(
      (itemProductLink as unknown as Run)({ entityIds: ['v3', 'gone'], context, passthrough: passthroughOf() })
    ).resolves.toEqual({ links: [{ sourceId: 'v3', targetId: 'p3' }] });
  });
});

describe('add-items', () => {
  it('merges the items into the wishlist, keeping variant ids as given', async () => {
    respond({ 'mergeProductOnWishlist post /customer/wishlist/merge': { data: { success: true } } });

    await (addItems as unknown as Run)({
      context,
      input: {
        items: [
          { productId: 'p1', variantId: 'v1', quantity: 1 },
          { productId: 'p2', quantity: 1 },
          { productId: 'p1', variantId: 'v1', quantity: 2 },
        ],
      },
    });

    expect(callsTo('mergeProductOnWishlist post /customer/wishlist/merge')[0]?.[1]).toEqual({ body: { productIds: ['v1', 'p2'] } });
  });

  it('answers a guest as unauthenticated, so the storefront keeps the list locally', async () => {
    respond({ 'mergeProductOnWishlist post /customer/wishlist/merge': notLoggedIn() });

    await expect((addItems as unknown as Run)({ context, input: { items: [{ productId: 'p1', quantity: 1 }] } })).rejects.toBeInstanceOf(
      UnauthenticatedError
    );
  });

  it('rejects a list id that is not the customer wishlist', async () => {
    respond({ 'readCustomerWishlist post /customer/wishlist': wishlistOf([]) });

    await expect(
      (addItems as unknown as Run)({ context, input: { productListId: 'customer-2', items: [{ productId: 'p1', quantity: 1 }] } })
    ).rejects.toBeInstanceOf(ProductListNotFoundError);
  });
});

describe('remove-items', () => {
  it('removes a variant exactly, and a bare product with all its variants', async () => {
    respond({
      'readCustomerWishlist post /customer/wishlist': wishlistOf([
        { id: 'v1', parentId: 'p1' },
        { id: 'v2', parentId: 'p1' },
        { id: 'v9', parentId: 'p9' },
        { id: 'p2' },
      ]),
      'deleteProductOnWishlist delete /customer/wishlist/delete/{productId}': { data: { success: true } },
    });

    await (removeItems as unknown as Run)({ context, input: { items: [{ productId: 'p9', variantId: 'v9' }, { productId: 'p1' }] } });

    const removed = callsTo('deleteProductOnWishlist delete /customer/wishlist/delete/{productId}').map(
      ([, args]) => args.pathParams.productId
    );
    expect(removed.sort()).toEqual(['v1', 'v2', 'v9']);
  });

  it('removes nothing when one item is not on the list', async () => {
    respond({ 'readCustomerWishlist post /customer/wishlist': wishlistOf([{ id: 'p2' }]) });

    await expect(
      (removeItems as unknown as Run)({ context, input: { items: [{ productId: 'p2' }, { productId: 'p3' }] } })
    ).rejects.toMatchObject({ data: { id: 'customer-1', productId: 'p3' } });
    expect(callsTo('deleteProductOnWishlist delete /customer/wishlist/delete/{productId}')).toHaveLength(0);
  });

  it('answers a customer without a wishlist with the missing item', async () => {
    respond({ 'readCustomerWishlist post /customer/wishlist': noWishlist() });

    await expect((removeItems as unknown as Run)({ context, input: { items: [{ productId: 'p1' }] } })).rejects.toBeInstanceOf(
      ProductListItemNotFoundError
    );
  });

  it('answers a guest as unauthenticated', async () => {
    respond({ 'readCustomerWishlist post /customer/wishlist': notLoggedIn() });

    await expect((removeItems as unknown as Run)({ context, input: { items: [{ productId: 'p1' }] } })).rejects.toBeInstanceOf(
      UnauthenticatedError
    );
  });
});
