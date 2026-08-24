import { describe, expect, it, vi } from 'vitest';
import { resolveProductFields, resolveProductVariantFields } from './requestedFields';
import type { ResolveCriteria } from '../types/criteria';

const passthroughResolver: ResolveCriteria = async (_target, criteria) => criteria;

const targetsSeenBy = (resolver: ReturnType<typeof vi.fn>) => resolver.mock.calls.map(([target]) => target);

describe('resolveProductVariantFields', () => {
  it('offers its criteria under the product-variant target', async () => {
    const resolve = vi.fn(passthroughResolver);

    await resolveProductVariantFields(resolve);

    expect(targetsSeenBy(resolve)).toEqual(['product-variant']);
  });

  it('returns what the resolver handed back, not what it was seeded with', async () => {
    const resolve: ResolveCriteria = async (_target, criteria) => ({
      ...criteria,
      includes: { ...criteria.includes, product: [...criteria.includes.product, 'customFields'] },
    });

    const criteria = await resolveProductVariantFields(resolve);

    expect(criteria.includes.product).toContain('customFields');
  });
});

describe('resolveProductFields', () => {
  it('offers its criteria under the product target', async () => {
    const resolve = vi.fn(passthroughResolver);

    await resolveProductFields(resolve);

    expect(targetsSeenBy(resolve)).toEqual(['product']);
  });

  it('returns what the resolver handed back, not what it was seeded with', async () => {
    const resolve: ResolveCriteria = async (_target, criteria) => ({
      ...criteria,
      includes: { ...criteria.includes, product: [...criteria.includes.product, 'customFields'] },
    });

    const criteria = await resolveProductFields(resolve);

    expect(criteria.includes.product).toContain('customFields');
  });

  it('requests no children association, so the read cannot carry unsellable variants', async () => {
    const criteria = await resolveProductFields(passthroughResolver);

    expect(criteria.associations).not.toHaveProperty('children');
  });

  it('projects no variant-only field, leaving those to the variant read', async () => {
    const criteria = await resolveProductFields(passthroughResolver);

    expect(criteria.includes.product).toContain('metaTitle');
    expect(criteria.includes.product).not.toContain('optionIds');
  });
});
