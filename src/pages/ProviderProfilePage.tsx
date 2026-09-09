import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Package, Phone, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ListingGridSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { ListingCard } from '@/components/listings/ListingCard';
import { api } from '@/services';
import { useAuth } from '@/hooks/use-auth';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { canSeeProviderPhone } from '@/lib/permissions';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatNumber } from '@/lib/utils';

/** Vitrine publique d'un prestataire : profil + annonces publiées. */
export function ProviderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { profile: viewer } = useAuth();

  const providerQuery = useQuery({
    queryKey: ['provider', id],
    queryFn: () => api.getProviderProfile(id as string),
    enabled: Boolean(id),
  });

  const listingsQuery = useQuery({
    queryKey: ['provider', id, 'listings'],
    queryFn: () => api.listProviderPublicListings(id as string),
    enabled: Boolean(id && providerQuery.data),
  });

  const provider = providerQuery.data;
  useDocumentTitle(provider?.full_name, provider?.bio ?? undefined);

  if (providerQuery.isPending) {
    return (
      <div className="container py-10">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="mt-8">
          <ListingGridSkeleton count={3} />
        </div>
      </div>
    );
  }

  if (providerQuery.isError) {
    return (
      <div className="container py-16">
        <ErrorState message={errorMessage(providerQuery.error)} onRetry={() => providerQuery.refetch()} />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={Store}
          title="Prestataire introuvable"
          description="Ce profil n'existe pas ou n'est plus actif sur MAKOLO."
          action={
            <Button asChild>
              <Link to="/materiel">Voir tout le matériel</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const listings = listingsQuery.data ?? [];

  return (
    <div className="container py-6 lg:py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/materiel">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Retour au matériel
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:gap-7">
          <Avatar name={provider.full_name} src={provider.avatar_url} className="size-20 sm:size-24" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="makolo-h2">{provider.full_name}</h1>
              <Badge variant="orange">
                <Store aria-hidden="true" />
                Prestataire
              </Badge>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-doux">
              {provider.city && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" aria-hidden="true" />
                  {provider.city}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Package className="size-4" aria-hidden="true" />
                {formatNumber(listings.length)} annonce(s) publiée(s)
              </span>
              <span>Inscrit depuis le {formatDate(provider.created_at)}</span>
            </div>

            {provider.bio && <p className="mt-4 max-w-2xl leading-relaxed text-doux-600">{provider.bio}</p>}

            {/* Le téléphone n'est visible que par les comptes connectés. */}
            {provider.phone && canSeeProviderPhone(viewer) && (
              <p className="mt-4">
                <a
                  href={`tel:${provider.phone.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-ivoire px-3.5 py-2 text-sm font-semibold text-nuit transition-colors hover:bg-orange-50"
                >
                  <Phone className="size-4 text-orange" aria-hidden="true" />
                  {provider.phone}
                </a>
              </p>
            )}

            {provider.phone && !canSeeProviderPhone(viewer) && (
              <p className="mt-4 text-sm text-doux">
                <Link to="/connexion" className="font-semibold text-nuit hover:text-orange-600 hover:underline">
                  Connectez-vous
                </Link>{' '}
                pour afficher les coordonnées du prestataire.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="mt-10" aria-labelledby="annonces-title">
        <h2 id="annonces-title" className="makolo-h2 mb-5">
          Ses offres
        </h2>

        {listingsQuery.isPending && <ListingGridSkeleton count={3} />}

        {listingsQuery.isError && (
          <ErrorState message={errorMessage(listingsQuery.error)} onRetry={() => listingsQuery.refetch()} />
        )}

        {listingsQuery.data && listings.length === 0 && (
          <EmptyState
            icon={Package}
            title="Aucune offre publiée"
            description="Ce prestataire n'a pas encore d'annonce en ligne."
          />
        )}

        {listings.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
