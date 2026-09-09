import { useQuery } from '@tanstack/react-query';
import { api } from '@/services';
import { useAuth } from './use-auth';

export function useClientStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['stats', 'client', user?.id],
    queryFn: () => api.getClientStats(user!.id),
    enabled: Boolean(user),
  });
}

export function useProviderStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['stats', 'provider', user?.id],
    queryFn: () => api.getProviderStats(user!.id),
    enabled: Boolean(user),
  });
}

export function useAdminStats(enabled: boolean) {
  return useQuery({
    queryKey: ['stats', 'admin'],
    queryFn: () => api.getAdminStats(),
    enabled,
  });
}
