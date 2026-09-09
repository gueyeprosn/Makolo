import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, CheckCircle2, Heart, Search, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCardSkeleton, RowSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { BookingCard } from '@/components/booking/BookingCard';
import { ListingCard } from '@/components/listings/ListingCard';
import { useAuth } from '@/hooks/use-auth';
import { useClientStats } from '@/hooks/use-stats';
import { useClientBookings } from '@/hooks/use-bookings';
import { useFavorites } from '@/hooks/use-favorites';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { errorMessage } from '@/lib/errors';
import { firstName } from '@/lib/utils';

export function ClientDashboardPage() {
  useDocumentTitle('Mon tableau de bord');
  const { profile } = useAuth();
  const statsQuery = useClientStats();
  const bookingsQuery = useClientBookings();
  const favoritesQuery = useFavorites();

  const recentBookings = bookingsQuery.data?.slice(0, 3) ?? [];
  const recentFavorites = favoritesQuery.data?.slice(0, 3) ?? [];

  return (
    <>
      <PageHeader
        title={`Bonjour, ${firstName(profile?.full_name ?? '')}`}
        description="Retrouvez vos demandes de réservation, vos favoris et vos notifications."
        action={
          <Button asChild variant="accent">
            <Link to="/materiel">
              <Search className="size-4" aria-hidden="true" />
              Chercher du matériel
            </Link>
          </Button>
        }
      />

      {/* Statistiques */}
      {statsQuery.isPending && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      )}

      {statsQuery.isError && <ErrorState message={errorMessage(statsQuery.error)} onRetry={() => statsQuery.refetch()} />}

      {statsQuery.data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Demandes en attente" value={statsQuery.data.pending} icon={CalendarClock} tone="orange" />
          <StatCard label="Demandes acceptées" value={statsQuery.data.accepted} icon={CheckCircle2} tone="success" />
          <StatCard label="Demandes refusées" value={statsQuery.data.rejected} icon={XCircle} tone="danger" />
          <StatCard label="Favoris" value={statsQuery.data.favorites} icon={Heart} tone="nuit" />
        </div>
      )}

      {/* Demandes récentes */}
      <section className="mt-10" aria-labelledby="demandes-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="demandes-title" className="makalo-h3">
            Mes dernières demandes
          </h2>
          <Button asChild variant="link" size="sm">
            <Link to="/demandes">
              Tout voir
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {bookingsQuery.isPending && <RowSkeleton rows={2} />}

        {bookingsQuery.isError && (
          <ErrorState message={errorMessage(bookingsQuery.error)} onRetry={() => bookingsQuery.refetch()} />
        )}

        {bookingsQuery.data && recentBookings.length === 0 && (
          <EmptyState
            icon={CalendarClock}
            title="Aucune demande pour le moment"
            description="Vous n'avez encore envoyé aucune demande de réservation."
            action={
              <Button asChild>
                <Link to="/materiel">Découvrir le matériel</Link>
              </Button>
            }
          />
        )}

        <div className="space-y-3">
          {recentBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} perspective="client" />
          ))}
        </div>
      </section>

      {/* Favoris */}
      <section className="mt-10" aria-labelledby="favoris-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="favoris-title" className="makalo-h3">
            Mes favoris
          </h2>
          <Button asChild variant="link" size="sm">
            <Link to="/favoris">
              Tout voir
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {favoritesQuery.isPending && <RowSkeleton rows={1} />}

        {favoritesQuery.data && recentFavorites.length === 0 && (
          <EmptyState
            icon={Heart}
            title="Aucun favori"
            description="Vous n'avez encore enregistré aucune offre."
            action={
              <Button asChild variant="outline">
                <Link to="/materiel">Parcourir les offres</Link>
              </Button>
            }
          />
        )}

        {recentFavorites.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {recentFavorites.map(
              (favorite) => favorite.listing && <ListingCard key={favorite.id} listing={favorite.listing} />,
            )}
          </div>
        )}
      </section>
    </>
  );
}
