import * as React from 'react';
import { CalendarClock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RowSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { BookingCard } from '@/components/booking/BookingCard';
import { useAllBookings } from '@/hooks/use-bookings';
import { useAuth } from '@/hooks/use-auth';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { isAdmin } from '@/lib/permissions';
import { errorMessage } from '@/lib/errors';
import { formatNumber } from '@/lib/utils';
import type { BookingStatus } from '@/types';

const TABS: { value: BookingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'accepted', label: 'Acceptées' },
  { value: 'rejected', label: 'Refusées' },
  { value: 'cancelled', label: 'Annulées' },
];

/** Supervision en lecture : l'admin observe, la décision revient au prestataire. */
export function AdminBookingsPage() {
  useDocumentTitle('Demandes');
  const { profile } = useAuth();
  const bookingsQuery = useAllBookings(isAdmin(profile));
  const [tab, setTab] = React.useState<string>('all');

  const bookings = bookingsQuery.data ?? [];
  const filtered = tab === 'all' ? bookings : bookings.filter((booking) => booking.status === tab);

  return (
    <>
      <PageHeader
        title="Demandes de réservation"
        description={
          bookingsQuery.data
            ? `${formatNumber(bookings.length)} demande(s) enregistrée(s) sur la plateforme.`
            : 'Supervision des demandes échangées entre clients et prestataires.'
        }
      />

      {bookingsQuery.isPending && <RowSkeleton rows={4} />}

      {bookingsQuery.isError && (
        <ErrorState message={errorMessage(bookingsQuery.error)} onRetry={() => bookingsQuery.refetch()} />
      )}

      {bookingsQuery.data && bookings.length === 0 && (
        <EmptyState
          icon={CalendarClock}
          title="Aucune demande"
          description="Aucune demande de réservation n'a encore été envoyée sur la plateforme."
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
                  <BookingCard key={booking.id} booking={booking} perspective="provider" />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
