import * as React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RowSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { BookingCard } from '@/components/booking/BookingCard';
import { useAllBookings } from '@/hooks/use-bookings';
import { useAuth } from '@/hooks/use-auth';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { isAdmin } from '@/lib/permissions';
import { errorMessage } from '@/lib/errors';
import { cn, formatDate, todayISO, toISODate } from '@/lib/utils';
import type { BookingRequestWithRelations } from '@/types';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_LABEL = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

/** Grille de 6 semaines (42 jours) centrée sur le mois affiché, semaine commençant le lundi. */
function buildMonthGrid(monthStart: Date): Date[] {
  const firstWeekday = (monthStart.getDay() + 6) % 7; // 0 = lundi
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

/** Occupation réelle du matériel : seules les demandes acceptées ou en attente bloquent une date. */
function isActiveOnDay(booking: BookingRequestWithRelations, dayISO: string): boolean {
  if (booking.status !== 'accepted' && booking.status !== 'pending') return false;
  return dayISO >= booking.requested_from && dayISO <= booking.requested_to;
}

/** Vue calendrier réelle des réservations, construite depuis `listAllBookings()` — aucune donnée fictive. */
export function AdminCalendarPage() {
  useDocumentTitle('Calendrier');
  const { profile } = useAuth();
  const bookingsQuery = useAllBookings(isAdmin(profile));
  const bookings = bookingsQuery.data ?? [];

  const today = todayISO();
  const [monthStart, setMonthStart] = React.useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selected, setSelected] = React.useState(today);

  const grid = React.useMemo(() => buildMonthGrid(monthStart), [monthStart]);

  const byDay = React.useMemo(() => {
    const map = new Map<string, { accepted: number; pending: number }>();
    for (const booking of bookings) {
      if (booking.status !== 'accepted' && booking.status !== 'pending') continue;
      let cursor = new Date(booking.requested_from + 'T00:00:00');
      const end = new Date(booking.requested_to + 'T00:00:00');
      // Une période peut s'étaler sur plusieurs semaines : on marque chaque jour couvert.
      while (cursor <= end) {
        const iso = toISODate(cursor);
        const entry = map.get(iso) ?? { accepted: 0, pending: 0 };
        if (booking.status === 'accepted') entry.accepted += 1;
        else entry.pending += 1;
        map.set(iso, entry);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [bookings]);

  const selectedBookings = bookings.filter((booking) => isActiveOnDay(booking, selected));

  const goToMonth = (delta: number) => {
    setMonthStart((current) => {
      const next = new Date(current);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  };

  return (
    <>
      <PageHeader
        title="Calendrier"
        description="Occupation réelle du matériel : demandes acceptées et en attente, période complète de livraison à reprise."
      />

      {bookingsQuery.isPending && <RowSkeleton rows={4} />}

      {bookingsQuery.isError && (
        <ErrorState message={errorMessage(bookingsQuery.error)} onRetry={() => bookingsQuery.refetch()} />
      )}

      {bookingsQuery.data && (
        <div className="grid gap-6 lg:grid-cols-[1fr,22rem]">
          <div className="rounded-2xl border border-doux-200 bg-white p-4 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="makalo-h3 capitalize">{MONTH_LABEL.format(monthStart)}</h2>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" onClick={() => goToMonth(-1)} aria-label="Mois précédent">
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(1);
                    d.setHours(0, 0, 0, 0);
                    setMonthStart(d);
                    setSelected(today);
                  }}
                >
                  Aujourd'hui
                </Button>
                <Button variant="outline" size="icon" onClick={() => goToMonth(1)} aria-label="Mois suivant">
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-doux">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1.5">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {grid.map((day) => {
                const iso = toISODate(day);
                const inMonth = day.getMonth() === monthStart.getMonth();
                const isToday = iso === today;
                const isSelected = iso === selected;
                const counts = byDay.get(iso);

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelected(iso)}
                    className={cn(
                      'flex aspect-square flex-col items-center justify-start gap-1 rounded-xl p-1.5 text-sm transition-colors',
                      inMonth ? 'text-nuit' : 'text-doux-300',
                      isSelected ? 'bg-nuit text-white' : 'hover:bg-doux-100',
                      isToday && !isSelected && 'ring-1 ring-inset ring-orange',
                    )}
                  >
                    <span className={cn('font-semibold', isSelected && 'text-white')}>{day.getDate()}</span>
                    {counts && (counts.accepted > 0 || counts.pending > 0) && (
                      <span className="flex items-center gap-0.5">
                        {counts.accepted > 0 && (
                          <span
                            className={cn('size-1.5 rounded-full', isSelected ? 'bg-white' : 'bg-nuit')}
                            aria-hidden="true"
                          />
                        )}
                        {counts.pending > 0 && (
                          <span
                            className={cn('size-1.5 rounded-full', isSelected ? 'bg-white/70' : 'bg-orange')}
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-doux">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-nuit" aria-hidden="true" />
                Acceptée
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-orange" aria-hidden="true" />
                En attente
              </span>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="makalo-h3 flex items-center gap-2">
                <CalendarDays className="size-4 text-doux" aria-hidden="true" />
                {formatDate(selected)}
              </h3>
              {selectedBookings.length > 0 && <Badge variant="nuit">{selectedBookings.length}</Badge>}
            </div>

            {selectedBookings.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Aucune occupation ce jour-là" />
            ) : (
              <div className="space-y-3">
                {selectedBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} perspective="provider" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
