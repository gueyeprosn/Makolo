import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services';
import type { BookingStatus } from '@/types';
import type { CreateBookingInput } from '@/services';
import { useAuth } from './use-auth';

export function useAvailability(listingId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['availability', listingId, date],
    queryFn: () => api.getAvailability(listingId as string, date as string),
    enabled: Boolean(listingId && date),
    staleTime: 15_000,
  });
}

export function useClientBookings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bookings', 'client', user?.id],
    queryFn: () => api.listClientBookings(user!.id),
    enabled: Boolean(user),
  });
}

export function useProviderBookings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bookings', 'provider', user?.id],
    queryFn: () => api.listProviderBookings(user!.id),
    enabled: Boolean(user),
  });
}

export function useAllBookings(enabled: boolean) {
  return useQuery({
    queryKey: ['bookings', 'all'],
    queryFn: () => api.listAllBookings(),
    enabled,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => api.createBooking(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => api.updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
