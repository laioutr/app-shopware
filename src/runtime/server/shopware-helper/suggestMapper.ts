import { createFallbackSlug, entitySlug } from './mappers/slugMapper';
import { mapMedia } from './mediaMapper';
import { swTranslated } from './swTranslated';
import { ProductSearchPage } from '@laioutr-core/canonical-types/ecommerce';
import type { ProductRow } from './productTargets';
import type { ShopwareExtensions, ShopwareProduct } from '../types/shopware';
import type { MediaImage } from '@laioutr-core/core-types/common';

type SuggestResponse = ShopwareExtensions & { elements?: ShopwareProduct[] };

export interface MappedSuggestResponse {
  suggestions: Array<{
    id: string;
    type: string;
    title: string;
    link:
      | { readonly type: 'reference'; readonly reference: { type: string; id: string; slug: string } }
      | { readonly type: 'pageType'; readonly pageType: string; readonly params: Record<string, string> };
    cover?: MediaImage;
  }>;
  products: ProductRow[];
}

const coverOf = (product: ShopwareProduct): MediaImage | undefined => {
  const media = product.cover?.media;
  if (!media) return undefined;
  const mapped = mapMedia(media);
  return mapped.type === 'image' ? mapped : undefined;
};

/**
 * The entries of a `/search-suggest` answer — query completions, brands, categories and products — and
 * the product rows behind them. Shopware leaves a variant's own name empty where it inherits the
 * parent's, so names are read translated.
 */
export const mapSuggestResponse = (data: SuggestResponse | undefined): MappedSuggestResponse => {
  const querySuggestions = Object.values(data?.extensions?.completionResult ?? {})
    .filter((value) => value !== 'array_struct')
    .map((value, index) => ({
      id: `query_suggestion_${index}`,
      type: 'query-suggestion',
      title: value,
      link: { type: 'pageType', pageType: ProductSearchPage, params: { q: value } } as const,
    }));

  const brands = Object.values(data?.extensions?.multiSuggestResult?.suggestResults?.product_manufacturer?.elements ?? {}).map(
    (manufacturer) => {
      const name = swTranslated(manufacturer, 'name') ?? '';
      return {
        id: manufacturer.id,
        type: 'brand',
        title: name,
        link: {
          type: 'reference',
          reference: { type: 'brand', id: manufacturer.id, slug: createFallbackSlug(name, manufacturer.id) },
        } as const,
      };
    }
  );

  const categories = Object.values(data?.extensions?.multiSuggestResult?.suggestResults?.category?.elements ?? {}).map((category) => ({
    id: category.id,
    type: 'category',
    title: swTranslated(category, 'name') ?? '',
    link: {
      type: 'reference',
      reference: { type: 'category', id: category.id, slug: entitySlug(category) },
    } as const,
  }));

  const productElements = (data?.elements ?? []).filter((product) => typeof product?.id === 'string');
  const products = productElements.map((product) => {
    const cover = coverOf(product);
    return {
      id: product.id,
      type: 'product',
      title: swTranslated(product, 'name') ?? '',
      link: {
        type: 'reference',
        reference: { type: 'product', id: product.id, slug: entitySlug(product) },
      } as const,
      ...(cover ? { cover } : {}),
    };
  });

  const productRows: ProductRow[] = productElements.map((product) => ({
    id: product.id,
    ...(product.parentId ? { parentId: product.parentId } : {}),
  }));

  return { suggestions: [...querySuggestions, ...brands, ...categories, ...products], products: productRows };
};
