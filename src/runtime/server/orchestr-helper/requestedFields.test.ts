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

    await resolveProductFields({ loadVariants: false }, resolve);

    expect(targetsSeenBy(resolve)).toEqual(['product']);
  });

  it('runs the variant target over the nested branch before composing the product read', async () => {
    const resolve = vi.fn(passthroughResolver);

    await resolveProductFields({ loadVariants: true }, resolve);

    expect(targetsSeenBy(resolve)).toEqual(['product-variant', 'product']);
  });

  it('carries a variant-target addition into the nested children association', async () => {
    const resolve: ResolveCriteria = async (target, criteria) =>
      target === 'product-variant' ? { ...criteria, associations: { ...criteria.associations, properties: {} } } : criteria;

    const criteria = await resolveProductFields({ loadVariants: true }, resolve);

    expect((criteria.associations.children as any).associations).toHaveProperty('properties');
  });

  it('unions the variant projection into its own so neither read shortens the other', async () => {
    const criteria = await resolveProductFields({ loadVariants: true }, passthroughResolver);

    expect(criteria.includes.product).toEqual(expect.arrayContaining(['optionIds', 'metaTitle']));
  });

  it('requests no children association when variants are not asked for', async () => {
    const criteria = await resolveProductFields({ loadVariants: false }, passthroughResolver);

    expect(criteria.associations).not.toHaveProperty('children');
  });
});
