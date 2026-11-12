import { describe, expect, it, vi } from 'vitest';
import reviewResolver from './base.resolver';

// The resolver reaches Nuxt's auto-imports through these modules, which a plain node run cannot resolve.
vi.mock('../../middleware/defineShopware', () => ({ defineShopwareComponentResolver: (resolver: unknown) => resolver }));
vi.mock('../../const/passthroughTokens', () => ({ currentProductIdsToken: 'currentProductIds' }));

type Resolved = { entities: Record<string, unknown>[] };

const resolve = async (rows: Record<string, unknown>[]) => {
  const context = {
    storefrontClient: { invoke: vi.fn(async () => ({ data: { elements: rows } })) },
    resolveCriteria: async (_entity: string, criteria: unknown) => criteria,
  };
  const result = (await (reviewResolver as unknown as { resolve: (args: unknown) => Promise<Resolved> }).resolve({
    entityIds: rows.map((row) => row.id),
    context,
    passthrough: { get: () => ['p1'] },
    $entity: (entity: unknown) => entity,
  })) as Resolved;
  return result.entities;
};

const review = {
  id: 'r1',
  title: 'Comfortable',
  content: 'Sits well, and the cover comes off for washing without any tools.',
  points: 4,
  externalUser: 'Kim',
  createdAt: '2026-11-12T10:00:00.000Z',
};

describe('Review component resolver', () => {
  it('resolves the full text and the name the reviewer gave', async () => {
    const [entity] = await resolve([review]);

    expect((entity!.content as () => unknown)()).toBe(review.content);
    expect((entity!.reviewer as () => unknown)()).toEqual({ name: 'Kim' });
  });

  it('gives a review without a name an empty reviewer name', async () => {
    const [entity] = await resolve([{ ...review, externalUser: undefined }]);

    expect((entity!.reviewer as () => unknown)()).toEqual({ name: '' });
  });
});
