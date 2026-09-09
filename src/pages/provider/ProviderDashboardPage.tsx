import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, CheckCircle2, Clock, Package, PlusCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RowSkeleton, StatCardSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { BookingCard } from '@/components/booking/BookingCard';
import { useToast } from '@/components/ui/toast';
import { api } from '@/services';
import { useAuth } from '@/hooks/use-auth';
import { useProviderStats } from '@/hooks/use-stats';
import { useProviderBookings } from '@/hooks/use-bookings';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { errorMessage } from '@/lib/errors';
import { firstName } from '@/lib/utils';
import type { ProviderVerificationStatus } from '@/types';

const VERIFICATION_BADGE: Record<ProviderVerificationStatus, { label: string; variant: 'neutral' | 'orange' | 'success' | 'danger' }> = {
  unverified: { label: 'Non vérifié', variant: 'neutral' },
  pending: { label: 'Demande envoyée', variant: 'orange' },
  verified: { label: 'Vérifié', variant: 'success' },
  rejected: { label: 'Vérification rejetée', variant: 'danger' },
};

function ProviderVerificationCard() {
  const { profile, refresh } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  if (!profile) return null;

  const status = profile.verification_status;
  const canRequest = status === 'unverified' || status === 'rejected';
  const badge = VERIFICATION_BADGE[status];

  const requestVerification = async () => {
    setBusy(true);
    try {
      await api.requestProviderVerification(profile.id);
      await refresh();
      toast.success('Demande envoyée.', "L'équipe MAKALO va examiner votre profil.");
    } catch (error) {
      toast.error('Envoi impossible', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-10">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Vérification du profil</CardTitle>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <CardDescription>
          Un profil vérifié inspire davantage confiance aux clients. La vérification est distincte de la modération
          de vos annonces.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === 'rejected' && profile.verification_note && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-destructive">
            <span className="font-semibold">Motif du rejet :</span> {profile.verification_note}
          </p>
        )}
        {status === 'pending' && (
          <p className="text-sm text-doux">Votre demande est en cours d'examen par l'équipe MAKALO.</p>
        )}
        {status === 'verified' && <p className="text-sm text-doux">Votre profil est vérifié. Rien à faire.</p>}
        {canRequest && (
          <Button variant="outline" onClick={() => void requestVerification()} loading={busy} loadingText="Envoi…">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {status === 'rejected' ? 'Redemander une vérification' : 'Demander la vérification'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

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
          <h2 id="demandes-title" className="makalo-h3">
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
            par l'équipe MAKALO avant sa mise en ligne.
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

      <ProviderVerificationCard />
    </>
  );
}
