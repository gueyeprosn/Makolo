import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, CheckCircle2, Clock, Package, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RowSkeleton, StatCardSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { BookingCard } from '@/components/booking/BookingCard';
import { useAuth } from '@/hooks/use-auth';
import { useProviderStats } from '@/hooks/use-stats';
import { useProviderBookings } from '@/hooks/use-bookings';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { errorMessage } from '@/lib/errors';
import { firstName } from '@/lib/utils';

export function ProviderDashboardPage() {
  useDocumentTitle('Espace prestataire');
  const { profile } = useAuth();
  const statsQuery = useProviderStats();
  const bookingsQuery = useProviderBookings();

  const pending = bookingsQuery.data?.filter((booking) => booking.status === 'pending') ?? [];

  return (
    <>
      <PageHeader
        title={`Bonjour, ${firstName(profile?.full_name ?? '')}`}
        description="Pilotez vos annonces et répondez aux demandes de réservation."
        action={
          <Button asChild variant="accent">
            <Link to="/prestataire/annonces/nouveau">
              <PlusCircle className="size-4" aria-hidden="true" />
              Publier une offre
            </Link>
          </Button>
        }
      />

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
          <StatCard label="Annonces publiées" value={statsQuery.data.publishedListings} icon={Package} tone="nuit" />
          <StatCard
            label="Annonces en validation"
            value={statsQuery.data.pendingListings}
            icon={Clock}
            tone="orange"
            hint="En attente de modération"
          />
          <StatCard label="Demandes en attente" value={statsQuery.data.pendingRequests} icon={CalendarClock} tone="orange" />
          <StatCard label="Demandes acceptées" value={statsQuery.data.acceptedRequests} icon={CheckCircle2} tone="success" />
        </div>
      )}

      <section className="mt-10" aria-labelledby="demandes-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="demandes-title" className="makolo-h3">
            Demandes à traiter
          </h2>
          <Button asChild variant="link" size="sm">
            <Link to="/prestataire/demandes">
              Toutes les demandes
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {bookingsQuery.isPending && <RowSkeleton rows={2} />}

        {bookingsQuery.isError && (
          <ErrorState message={errorMessage(bookingsQuery.error)} onRetry={() => bookingsQuery.refetch()} />
        )}

        {bookingsQuery.data && pending.length === 0 && (
          <EmptyState
            icon={CalendarClock}
            title="Aucune demande en attente"
            description="Toutes vos demandes ont été traitées. Publiez de nouvelles offres pour gagner en visibilité."
            action={
              <Button asChild variant="outline">
                <Link to="/prestataire/annonces/nouveau">Publier une offre</Link>
              </Button>
            }
          />
        )}

        <div className="space-y-3">
          {pending.slice(0, 3).map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              perspective="provider"
              actions={
                <Button asChild size="sm" variant="outline">
                  <Link to="/prestataire/demandes">Répondre</Link>
                </Button>
              }
            />
          ))}
        </div>
      </section>

      <Card className="mt-10 border-orange-200 bg-orange-50/60">
        <CardHeader>
          <CardTitle>Publier une nouvelle offre</CardTitle>
          <CardDescription>
            Décrivez votre matériel, ajoutez des photos, fixez votre tarif et votre ville. Votre annonce est vérifiée
            par l'équipe MAKOLO avant sa mise en ligne.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="accent">
            <Link to="/prestataire/annonces/nouveau">
              <PlusCircle className="size-4" aria-hidden="true" />
              Créer une annonce
            </Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
