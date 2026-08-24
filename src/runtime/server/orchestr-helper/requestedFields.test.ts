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
  it('runs the variant target before composing the product read', async () => {
    const resolve = vi.fn(passthroughResolver);

    await resolveProductFields(resolve);

    expect(targetsSeenBy(resolve)).toEqual(['product-variant', 'product']);
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

  it('projects the variant fields too, since a product without variants is its own variant', async () => {
    const criteria = await resolveProductFields(passthroughResolver);

    expect(criteria.includes.product).toEqual(expect.arrayContaining(['metaTitle', 'available', 'availableStock', 'optionIds']));
  });

  it('carries a variant-target addition into the product projection', async () => {
    const resolve: ResolveCriteria = async (target, criteria) =>
      target === 'product-variant' ?
        { ...criteria, includes: { ...criteria.includes, product: [...criteria.includes.product, 'customFields'] } }
      : criteria;

    const criteria = await resolveProductFields(resolve);

    expect(criteria.includes.product).toContain('customFields');
  });
});
