import { readCustomer } from './customerAddresses';
import { isShopwareId } from './isShopwareId';
import { accountCall, shopwareErrorStatus } from './shopwareErrors';
import { UnauthenticatedError } from '@laioutr-core/canonical-types/ecommerce';
import type { ShopwareAdminClient } from '../client/shopwareAdminClientFactory';
import type { StorefrontClient } from '../types/shopware';
import type { OwnReview } from '@laioutr-core/canonical-types/ecommerce';

/** The fields of a stored `product_review` the own-review actions read. */
export interface StoredReview {
  id: string;
  /** The product or variant the review is saved on. */
  productId: string;
  title: string;
  content: string;
  points: number;
  /** Whether the shop approved the review. */
  status: boolean;
  /** The reviewer name the review shows. */
  externalUser?: string | null;
  externalEmail?: string | null;
}

const SEARCH_REFUSED =
  "@laioutr/app-shopware: the Admin API integration may not search product reviews, which the customer's own review needs. " +
  'Give its role "Reviews: Read" in Shopware admin → Settings → System → Integrations (product_review:read and product:read).';

/**
 * The customer's newest review of a product, through the Admin API: the Store API cannot filter
 * reviews by their customer. Shopware's own storefront saves a review on the variant it shows, so a
 * review of one of the product's variants counts too.
 */
export const findOwnReview = async (
  adminClient: ShopwareAdminClient,
  customerId: string,
  productId: string
): Promise<StoredReview | undefined> => {
  let response;
  try {
    response = await adminClient.invoke('searchProductReview post /search/product-review', {
      body: {
        filter: [
          { type: 'equals', field: 'customerId', value: customerId },
          {
            type: 'multi',
            operator: 'or',
            queries: [
              { type: 'equals', field: 'productId', value: productId },
              { type: 'equals', field: 'product.parentId', value: productId },
            ],
          },
        ],
        sort: [{ field: 'createdAt', order: 'DESC' }],
        limit: 1,
        includes: {
          product_review: ['id', 'productId', 'title', 'content', 'points', 'status', 'externalUser', 'externalEmail'],
        },
      },
    });
  } catch (cause) {
    const status = shopwareErrorStatus(cause);
    throw new Error(
      status === 401 || status === 403 ?
        SEARCH_REFUSED
      : `@laioutr/app-shopware: the Admin API search for the customer's own review failed: ${(cause as Error).message}`,
      { cause }
    );
  }

  return (response.data.data as StoredReview[] | undefined)?.[0];
};

/**
 * The id of the customer the session belongs to. A guest of an earlier checkout cannot write
 * reviews, so the actions treat that session as a visitor's.
 */
const sessionCustomerId = async (storefrontClient: StorefrontClient): Promise<string> => {
  const customer = await accountCall(() => readCustomer(storefrontClient));
  if (customer.guest || !isShopwareId(customer.id ?? '')) throw new UnauthenticatedError();
  return customer.id;
};

/**
 * The session customer's id and newest review of the product. The customer always comes from the
 * session: the browser only names the product, so it cannot reach another customer's review.
 */
export const findSessionCustomersReview = async (
  { storefrontClient, adminClient }: { storefrontClient: StorefrontClient; adminClient: ShopwareAdminClient },
  productId: string
): Promise<{ customerId: string; review: StoredReview | undefined }> => {
  const customerId = await sessionCustomerId(storefrontClient);
  if (!isShopwareId(productId)) return { customerId, review: undefined };
  return { customerId, review: await findOwnReview(adminClient, customerId, productId) };
};

export const toOwnReview = (review: StoredReview): OwnReview => ({
  title: review.title,
  content: review.content,
  points: review.points,
  published: review.status,
});

/**
 * The body of `saveProductReview` that replaces a stored review's text and rating. Without a name
 * and an email, Shopware writes the customer's first name and email over the stored ones.
 */
export const toUpdateBody = (review: StoredReview, { title, content, points }: Pick<OwnReview, 'title' | 'content' | 'points'>) => ({
  id: review.id,
  title,
  content,
  points,
  ...(review.externalUser ? { name: review.externalUser } : {}),
  ...(review.externalEmail ? { email: review.externalEmail } : {}),
});
