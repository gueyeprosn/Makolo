import * as React from 'react';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RowSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { BookingCard } from '@/components/booking/BookingCard';
import { useProviderBookings, useUpdateBookingStatus } from '@/hooks/use-bookings';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { errorMessage } from '@/lib/errors';
import type { BookingStatus } from '@/types';

const TABS: { value: BookingStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'À traiter' },
  { value: 'accepted', label: 'Acceptées' },
  { value: 'rejected', label: 'Refusées' },
  { value: 'cancelled', label: 'Annulées' },
  { value: 'all', label: 'Toutes' },
];

export function ProviderBookingsPage() {
  useDocumentTitle('Demandes reçues');
  const toast = useToast();
  const bookingsQuery = useProviderBookings();
  const updateStatus = useUpdateBookingStatus();
  const [tab, setTab] = React.useState<string>('pending');
  const [toReject, setToReject] = React.useState<string | null>(null);

  const bookings = bookingsQuery.data ?? [];
  const filtered = tab === 'all' ? bookings : bookings.filter((booking) => booking.status === tab);

  const accept = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: 'accepted' });
      toast.success('Demande acceptée', 'Le client a été notifié.');
    } catch (error) {
      toast.error("La demande n'a pas pu être acceptée", errorMessage(error));
    }
  };

  const reject = async () => {
    if (!toReject) return;
    try {
      await updateStatus.mutateAsync({ id: toReject, status: 'rejected' });
      toast.success('Demande refusée', 'Le client a été notifié.');
    } catch (error) {
      toast.error("La demande n'a pas pu être refusée", errorMessage(error));
    } finally {
      setToReject(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Demandes reçues"
        description="Acceptez ou refusez les demandes de réservation concernant vos annonces."
      />

      {bookingsQuery.isPending && <RowSkeleton rows={3} />}

      {bookingsQuery.isError && (
        <ErrorState message={errorMessage(bookingsQuery.error)} onRetry={() => bookingsQuery.refetch()} />
      )}

      {bookingsQuery.data && bookings.length === 0 && (
        <EmptyState
          icon={CalendarClock}
          title="Aucune demande"
          description="Vous n'avez reçu aucune demande de réservation pour le moment."
        />
      )}

      {bookings.length > 0 && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {TABS.map((item) => {
              const count =
                item.value === 'all' ? bookings.length : bookings.filter((booking) => booking.status === item.value).length;
              return (
                <TabsTrigger key={item.value} value={item.value}>
                  {item.label}
                  <span className="text-xs text-doux">({count})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={tab}>
            {filtered.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Aucune demande dans cette catégorie" />
            ) : (
              <div className="space-y-3">
                {filtered.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    perspective="provider"
                    actions={
                      booking.status === 'pending' ? (
                        <>
                          <Button
                            size="sm"
                            variant="accent"
                            loading={updateStatus.isPending && updateStatus.variables?.id === booking.id}
                            onClick={() => void accept(booking.id)}
                          >
                            Accepter
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setToReject(booking.id)}>
                            Refuser
                          </Button>
                        </>
                      ) : undefined
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <ConfirmDialog
        open={Boolean(toReject)}
        onOpenChange={(open) => !open && setToReject(null)}
        title="Refuser cette demande ?"
        description="Le client sera informé du refus. Cette action est définitive."
        confirmLabel="Refuser la demande"
        loading={updateStatus.isPending}
        onConfirm={reject}
      />
    </>
  );
}
