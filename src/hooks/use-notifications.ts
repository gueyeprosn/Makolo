import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services';
import { useAuth } from './use-auth';

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => api.listNotifications(user!.id),
    enabled: Boolean(user),
    // Les notifications sont créées côté base : un rafraîchissement périodique
    // suffit pour le MVP (pas de temps réel, hors périmètre).
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.markAllNotificationsRead(user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
