import type { components } from '../types/storeApiTypes';
import type { AvailableSorting } from '@laioutr-core/orchestr/types';

export const mapShopwareSortingToOrchestr = (
  sortings: components['schemas']['ProductListingResult']['availableSortings']
): AvailableSorting[] => {
  // Sort sortings by priority ascending
  const sortedSortings = [...sortings].sort((a, b) => a.priority - b.priority);
  return sortedSortings.map((sorting) => ({
    key: sorting.key,
    label: sorting.translated.label,
  }));
};
