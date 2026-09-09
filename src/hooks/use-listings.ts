import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services';
import type { ListingFilters, ListingStatus } from '@/types';
import type { ListingValues } from '@/lib/validations';

export const listingKeys = {
  all: ['listings'] as const,
  list: (filters: ListingFilters) => ['listings', 'list', filters] as const,
  bySlug: (slug: string) => ['listings', 'slug', slug] as const,
  byId: (id: string) => ['listings', 'id', id] as const,
  images: (id: string) => ['listings', 'images', id] as const,
  provider: (id: string) => ['listings', 'provider', id] as const,
};

export function useListings(filters: ListingFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listingKeys.list(filters),
    queryFn: () => api.listListings(filters),
    enabled: options?.enabled ?? true,
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });
}

export function useListingBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: listingKeys.bySlug(slug ?? ''),
    queryFn: () => api.getListingBySlug(slug as string),
    enabled: Boolean(slug),
  });
}

export function useListingById(id: string | undefined) {
  return useQuery({
    queryKey: listingKeys.byId(id ?? ''),
    queryFn: () => api.getListingById(id as string),
    enabled: Boolean(id),
  });
}

export function useCategories(includeInactive = false) {
  return useQuery({
    queryKey: ['categories', { includeInactive }],
    queryFn: () => api.listCategories({ includeInactive }),
    staleTime: 5 * 60_000,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ values, submit }: { values: ListingValues; submit: boolean }) => api.createListing(values, submit),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listingKeys.all }),
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: ListingValues }) => api.updateListing(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listingKeys.all }),
  });
}

export function useSetListingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: ListingStatus; reason?: string }) =>
      api.setListingStatus(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useListingImages(listingId: string | undefined) {
  return useQuery({
    queryKey: listingKeys.images(listingId ?? ''),
    queryFn: () => api.listListingImages(listingId as string),
    enabled: Boolean(listingId),
  });
}
