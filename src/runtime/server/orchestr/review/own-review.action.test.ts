// @vitest-environment node
import { ApiClientError, type ApiError } from '@shopware/api-client';
import { describe, expect, it, vi } from 'vitest';
import getOwnReviewAction from './get-own-review.action';
import updateOwnReviewAction from './update-own-review.action';
import { InvalidFieldError, ReviewNotFoundError, UnauthenticatedError } from '@laioutr-core/canonical-types/ecommerce';
import type { StoredReview } from '../../shopware-helper/ownReview';

const availability = vi.hoisted(() => ({ adminApiIsConfigured: () => true }));

vi.mock('../../middleware/defineShopware', () => ({
  defineShopwareAction: (_token: unknown, handler: object, options: unknown) => Object.assign(handler, { options }),
  adminApiIsConfigured: availability.adminApiIsConfigured,
}));

type Handler = ((args: Record<string, unknown>) => Promise<unknown>) & { options?: { isAvailable?: unknown } };

const CUSTOMER = 'c0ffee00c0ffee00c0ffee00c0ffee00';
const PRODUCT = 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1';
const VARIANT = 'b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2';
const OTHER = 'd4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4';

const stored: StoredReview = {
  id: 'e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5',
  productId: VARIANT,
  title: 'Comfortable',
  content: 'Sits well, and the cover comes off for washing without any tools.',
  points: 4,
  status: true,
  externalUser: 'Kim',
  externalEmail: 'kim@example.com',
};

const refusal = (status: number, errors: ApiError[]) =>
  new ApiClientError({ _data: { errors }, status, statusText: '', url: '/store-api/x', headers: new Headers() } as never);

const notLoggedIn = refusal(403, [{ status: '403', code: 'FRAMEWORK__ROUTING_CUSTOMER_NOT_LOGGED_IN' }]);

/**
 * A shop whose session customer is `customer`. The Admin search answers `reviews`, one entry per
 * search in turn (the last one repeats), or throws `adminError`; the review save throws `saveError`.
 */
const shop = ({
  reviews = [[]] as StoredReview[][],
  customer = { id: CUSTOMER } as unknown,
  saveError = undefined as unknown,
  adminError = undefined as unknown,
} = {}) => {
  const storefront = vi.fn(async (operation: string) => {
    if (operation.startsWith('readCustomer')) {
      if (customer instanceof Error) throw customer;
      return { data: customer };
    }
    if (saveError) throw saveError;
    return { data: undefined };
  });
  let searches = 0;
  const admin = vi.fn(async () => {
    if (adminError) throw adminError;
    return { data: { data: reviews[Math.min(searches++, reviews.length - 1)] } };
  });
  return { storefront, admin, context: { storefrontClient: { invoke: storefront }, adminClient: { invoke: admin } } };
};

const call = (action: unknown, context: unknown, input: Record<string, unknown>) => (action as Handler)({ context, input });

const caught = async (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

const changes = { title: 'Still comfortable', content: 'After a year the cover is still fine, the seat a bit softer.', points: 5 };

describe('GetOwnReviewAction', () => {
  it("searches the Admin API for the session customer's review of the product or one of its variants, newest first", async () => {
    const { admin, context } = shop({ reviews: [[stored]] });

    expect(await call(getOwnReviewAction, context, { productId: PRODUCT })).toEqual({
      review: { title: stored.title, content: stored.content, points: 4, published: true },
    });

    const [, { body }] = admin.mock.calls[0] as unknown as [string, { body: Record<string, unknown> }];
    expect(body.filter).toEqual([
      { type: 'equals', field: 'customerId', value: CUSTOMER },
      {
        type: 'multi',
        operator: 'or',
        queries: [
          { type: 'equals', field: 'productId', value: PRODUCT },
          { type: 'equals', field: 'product.parentId', value: PRODUCT },
        ],
      },
    ]);
    expect(body.sort).toEqual([{ field: 'createdAt', order: 'DESC' }]);
    expect(body.limit).toBe(1);
  });

  it('answers null when the customer has not reviewed the product', async () => {
    expect(await call(getOwnReviewAction, shop().context, { productId: PRODUCT })).toEqual({ review: null });
  });

  it('answers null for a product id Shopware cannot have, without asking the Admin API', async () => {
    const { admin, context } = shop({ reviews: [[stored]] });

    expect(await call(getOwnReviewAction, context, { productId: 'not-an-id' })).toEqual({ review: null });
    expect(admin).not.toHaveBeenCalled();
  });

  it('refuses a visitor who is not logged in, before asking the Admin API', async () => {
    const { admin, context } = shop({ customer: notLoggedIn });

    expect(await caught(call(getOwnReviewAction, context, { productId: PRODUCT }))).toBeInstanceOf(UnauthenticatedError);
    expect(admin).not.toHaveBeenCalled();
  });

  it('refuses the guest of an earlier checkout, and a customer answer without an id', async () => {
    for (const customer of [{ id: CUSTOMER, guest: true }, { id: null }, {}]) {
      const { admin, context } = shop({ customer, reviews: [[stored]] });

      expect(await caught(call(getOwnReviewAction, context, { productId: PRODUCT }))).toBeInstanceOf(UnauthenticatedError);
      expect(admin).not.toHaveBeenCalled();
    }
  });

  it('names the app, the integration and the permission when the Admin API refuses the search', async () => {
    const missingPrivilege = refusal(403, [{ status: '403', code: 'FRAMEWORK__MISSING_PRIVILEGE_ERROR' }]);
    const { context } = shop({ adminError: missingPrivilege });

    const error = (await caught(call(getOwnReviewAction, context, { productId: PRODUCT }))) as Error;

    expect(error.message).toMatch(/@laioutr\/app-shopware.*Admin API integration.*Reviews: Read/);
    expect(error.cause).toBe(missingPrivilege);
  });

  it('is offered only where the Admin API is configured', () => {
    expect((getOwnReviewAction as unknown as Handler).options?.isAvailable).toBe(availability.adminApiIsConfigured);
  });
});

describe('UpdateOwnReviewAction', () => {
  it('saves over the stored review on the variant it is on, keeping the reviewer name and email', async () => {
    const { storefront, context } = shop({ reviews: [[stored], [{ ...stored, ...changes, status: false }]] });

    await call(updateOwnReviewAction, context, { productId: PRODUCT, ...changes });

    expect(storefront).toHaveBeenLastCalledWith('saveProductReview post /product/{productId}/review', {
      pathParams: { productId: VARIANT },
      body: { id: stored.id, ...changes, name: 'Kim', email: 'kim@example.com' },
    });
  });

  it('answers the review as Shopware stored it, read back after the save', async () => {
    const sanitized = { ...stored, ...changes, content: 'After a year the cover is still fine.', status: false };
    const { context } = shop({ reviews: [[stored], [sanitized]] });

    expect(await call(updateOwnReviewAction, context, { productId: PRODUCT, ...changes })).toEqual({
      review: { title: changes.title, content: sanitized.content, points: 5, published: false },
    });
  });

  it('leaves the name and email to Shopware when the stored review has none', async () => {
    const { storefront, context } = shop({ reviews: [[{ ...stored, externalUser: null, externalEmail: '' }]] });

    await call(updateOwnReviewAction, context, { productId: PRODUCT, ...changes });

    expect(storefront).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ body: { id: stored.id, ...changes } }));
  });

  it('refuses to save when the customer has no review of the product', async () => {
    const { storefront, context } = shop();

    const error = await caught(call(updateOwnReviewAction, context, { productId: OTHER, ...changes }));

    expect(error).toBeInstanceOf(ReviewNotFoundError);
    expect((error as ReviewNotFoundError).data).toEqual({ productId: OTHER });
    expect(storefront).toHaveBeenCalledTimes(1);
  });

  it('refuses a product id Shopware cannot have as a review not found, without asking the Admin API', async () => {
    const { admin, context } = shop({ reviews: [[stored]] });

    expect(await caught(call(updateOwnReviewAction, context, { productId: 'not-an-id', ...changes }))).toBeInstanceOf(ReviewNotFoundError);
    expect(admin).not.toHaveBeenCalled();
  });

  it('reports a review removed between the search and the save as not found', async () => {
    const { context } = shop({
      reviews: [[stored]],
      saveError: refusal(400, [{ status: '400', code: 'VIOLATION::ENTITY_DOES_NOT_EXISTS', title: '', source: { pointer: '/id' } }]),
    });

    expect(await caught(call(updateOwnReviewAction, context, { productId: PRODUCT, ...changes }))).toBeInstanceOf(ReviewNotFoundError);
  });

  it('names the field Shopware refuses', async () => {
    const { context } = shop({
      reviews: [[stored]],
      saveError: refusal(400, [
        {
          status: '400',
          code: 'VIOLATION::TOO_SHORT_ERROR',
          title: '',
          source: { pointer: '/content' },
          meta: { parameters: { '{{ limit }}': '40' } },
        },
      ]),
    });

    const error = await caught(call(updateOwnReviewAction, context, { productId: PRODUCT, ...changes }));

    expect(error).toBeInstanceOf(InvalidFieldError);
    expect((error as InvalidFieldError).data).toMatchObject({ field: ['content'], limit: 40 });
  });

  it('is offered only where the Admin API is configured', () => {
    expect((updateOwnReviewAction as unknown as Handler).options?.isAvailable).toBe(availability.adminApiIsConfigured);
  });
});
