import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services';
import { useAuth } from './use-auth';

export function useFavoriteIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['favorites', 'ids', user?.id],
    queryFn: () => api.listFavoriteListingIds(user!.id),
    enabled: Boolean(user),
    staleTime: 60_000,
  });
}

export function useFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['favorites', 'list', user?.id],
    queryFn: () => api.listFavorites(user!.id),
    enabled: Boolean(user),
  });
}

/** Bascule un favori avec mise à jour optimiste et retour arrière en cas d'échec. */
export function useToggleFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, isFavorite }: { listingId: string; isFavorite: boolean }) => {
      if (!user) throw new Error('Non authentifié');
      if (isFavorite) await api.removeFavorite(user.id, listingId);
      else await api.addFavorite(user.id, listingId);
    },
    onMutate: async ({ listingId, isFavorite }) => {
      const key = ['favorites', 'ids', user?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key);
      queryClient.setQueryData<string[]>(key, (current = []) =>
        isFavorite ? current.filter((id) => id !== listingId) : [...current, listingId],
      );
      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
