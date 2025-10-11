/**
 * useMarketplace Hook - Optimized Marketplace Fetching
 *
 * Same benefits as useProperties:
 * - Instant cached results
 * - Background refresh
 * - Automatic retry
 * - Offline support
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  fetchAllMarketplaceItems,
  fetchCategoryItems,
  searchMarketplaceItems,
  MarketplaceItem,
  MarketplaceCategory,
} from '@/lib/marketplace-api';

export interface MarketplaceFilters {
  category?: MarketplaceCategory | 'all';
  searchQuery?: string;
  limit?: number;
}

/**
 * Fetch marketplace items with caching
 */
export function useMarketplaceItems(filters: MarketplaceFilters = {}): UseQueryResult<MarketplaceItem[], Error> {
  const { category = 'all', searchQuery, limit = 50 } = filters;

  return useQuery({
    queryKey: ['marketplace', category, searchQuery, limit],
    queryFn: async () => {
      // If searching
      if (searchQuery?.trim()) {
        const { data, error} = await searchMarketplaceItems(searchQuery, {
          category: category !== 'all' ? (category as MarketplaceCategory) : undefined,
          limit,
        });
        if (error) throw error;
        return data || [];
      }

      // If filtering by category
      if (category && category !== 'all') {
        const { data, error } = await fetchCategoryItems(category as MarketplaceCategory, {
          limit,
          orderBy: 'created_at',
          ascending: false,
        });
        if (error) throw error;
        return data || [];
      }

      // Fetch all items
      const { data, error } = await fetchAllMarketplaceItems({
        limit,
        orderBy: 'created_at',
        ascending: false,
      });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch single marketplace item
 */
export function useMarketplaceItem(
  itemId: string | undefined,
  category: string | undefined
): UseQueryResult<MarketplaceItem, Error> {
  return useQuery({
    queryKey: ['marketplace-item', itemId, category],
    queryFn: async () => {
      if (!itemId || !category) throw new Error('Item ID and category required');

      const { fetchItemById } = await import('@/lib/marketplace-api');
      const { data, error } = await fetchItemById(itemId, category as MarketplaceCategory);
      if (error) throw error;
      return data;
    },
    enabled: !!itemId && !!category,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}
