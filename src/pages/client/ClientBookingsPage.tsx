import * as React from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RowSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { BookingCard } from '@/components/booking/BookingCard';
import { useClientBookings, useUpdateBookingStatus } from '@/hooks/use-bookings';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { errorMessage } from '@/lib/errors';
import type { BookingStatus } from '@/types';

const TABS: { value: BookingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'accepted', label: 'Acceptées' },
  { value: 'rejected', label: 'Refusées' },
  { value: 'cancelled', label: 'Annulées' },
];

export function ClientBookingsPage() {
  useDocumentTitle('Mes demandes');
  const toast = useToast();
  const bookingsQuery = useClientBookings();
  const updateStatus = useUpdateBookingStatus();
  const [toCancel, setToCancel] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<string>('all');

  const bookings = bookingsQuery.data ?? [];
  const filtered = tab === 'all' ? bookings : bookings.filter((booking) => booking.status === tab);

  const handleCancel = async () => {
    if (!toCancel) return;
    try {
      await updateStatus.mutateAsync({ id: toCancel, status: 'cancelled' });
      toast.success('Demande annulée.');
      setToCancel(null);
    } catch (error) {
      toast.error("L'annulation a échoué", errorMessage(error));
      setToCancel(null);
    }
  };

  return (
    <>
      <PageHeader title="Mes demandes" description="Suivez l'état de vos demandes de réservation." />

      {bookingsQuery.isPending && <RowSkeleton rows={3} />}

      {bookingsQuery.isError && (
        <ErrorState message={errorMessage(bookingsQuery.error)} onRetry={() => bookingsQuery.refetch()} />
      )}

      {bookingsQuery.data && bookings.length === 0 && (
        <EmptyState
          icon={CalendarClock}
          title="Aucune demande"
          description="Vous n'avez aucune demande pour le moment."
          action={
            <Button asChild>
              <Link to="/materiel">Découvrir le matériel</Link>
            </Button>
          }
        />
      )}

      {bookings.length > 0 && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {TABS.map((item) => {
              const count = item.value === 'all' ? bookings.length : bookings.filter((b) => b.status === item.value).length;
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
                    perspective="client"
                    actions={
                      booking.status === 'pending' ? (
                        <Button variant="outline" size="sm" onClick={() => setToCancel(booking.id)}>
                          Annuler la demande
                        </Button>
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
        open={Boolean(toCancel)}
        onOpenChange={(open) => !open && setToCancel(null)}
        title="Annuler cette demande ?"
        description="Le prestataire sera informé de l'annulation. Cette action est définitive."
        confirmLabel="Annuler la demande"
        cancelLabel="Revenir"
        loading={updateStatus.isPending}
        onConfirm={handleCancel}
      />
    </>
  );
}
