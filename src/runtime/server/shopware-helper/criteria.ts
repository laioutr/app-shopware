import type { ShopwareCriteria } from '../types/criteria';
import type { ShopwareIncludesQuery } from '../types/shopware';

const unique = <T>(arr: T[]) => Array.from(new Set(arr));

export const mergeIncludes = (...projections: ShopwareIncludesQuery[]): ShopwareIncludesQuery => {
  const merged: ShopwareIncludesQuery = {};

  for (const projection of projections) {
    for (const [entity, fields] of Object.entries(projection)) {
      merged[entity] = unique([...(merged[entity] ?? []), ...fields]);
    }
  }

  return merged;
};

export const toRequestCriteria = ({ includes, associations }: ShopwareCriteria) => ({
  ...(Object.keys(includes).length > 0 ? { includes } : {}),
  ...(Object.keys(associations).length > 0 ? { associations } : {}),
});
