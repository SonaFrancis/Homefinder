/**
 * useProperties Hook - Optimized Property Fetching
 *
 * WHY THIS IS BETTER:
 * 1. Automatic caching - Shows instant results from cache while fetching fresh data
 * 2. Background refetch - Updates data without showing loading spinners
 * 3. Deduplication - Multiple components can use this without duplicate requests
 * 4. Offline support - Shows cached data when offline
 * 5. Auto retry - Retries failed requests automatically
 *
 * USAGE:
 * const { data, isLoading, error, refetch } = useProperties(filters);
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { RentalProperty } from '@/lib/supabase';
import { fetchRentalProperties } from '@/lib/rental-api';

export interface PropertyFilters {
  city?: string;
  street?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  furnishing?: string;
  searchQuery?: string;
}

/**
 * Fetch rental properties with React Query caching
 */
export function useProperties(filters: PropertyFilters = {}): UseQueryResult<RentalProperty[], Error> {
  return useQuery({
    // Unique key for this query - React Query uses this for caching
    // Changes to filters will trigger a new fetch
    queryKey: ['properties', filters],

    // Function that fetches the data
    queryFn: async () => {
      const { data, error } = await fetchRentalProperties(filters);
      if (error) throw error;
      return data || [];
    },

    // Keep data fresh for 3 minutes
    staleTime: 1000 * 60 * 3,

    // Keep in cache for 10 minutes after last use
    gcTime: 1000 * 60 * 10,

    // Refetch when user returns to screen
    refetchOnWindowFocus: true,

    // Show cached data while fetching fresh data (stale-while-revalidate)
    // This makes the app feel instant!
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch featured properties
 */
export function useFeaturedProperties(): UseQueryResult<RentalProperty[], Error> {
  return useQuery({
    queryKey: ['properties', 'featured'],
    queryFn: async () => {
      const { fetchFeaturedProperties } = await import('@/lib/rental-api');
      const { data, error } = await fetchFeaturedProperties();
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10, // Featured properties don't change often
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * Fetch single property details
 */
export function useProperty(propertyId: string | undefined): UseQueryResult<RentalProperty, Error> {
  return useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      if (!propertyId) throw new Error('Property ID required');

      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('rental_properties')
        .select(`
          *,
          profiles!rental_properties_seller_id_fkey (*),
          rental_property_media (*)
        `)
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!propertyId, // Only run query if ID exists
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}
