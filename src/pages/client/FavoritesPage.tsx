import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListingGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ListingCard } from '@/components/listings/ListingCard';
import { useFavorites } from '@/hooks/use-favorites';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { errorMessage } from '@/lib/errors';
import { formatNumber } from '@/lib/utils';

export function FavoritesPage() {
  useDocumentTitle('Mes favoris');
  const favoritesQuery = useFavorites();
  const favorites = favoritesQuery.data?.filter((favorite) => favorite.listing) ?? [];

  return (
    <>
      <PageHeader
        title="Mes favoris"
        description={
          favoritesQuery.data ? `${formatNumber(favorites.length)} offre(s) enregistrée(s).` : 'Vos offres enregistrées.'
        }
      />

      {favoritesQuery.isPending && <ListingGridSkeleton count={3} />}

      {favoritesQuery.isError && (
        <ErrorState message={errorMessage(favoritesQuery.error)} onRetry={() => favoritesQuery.refetch()} />
      )}

      {favoritesQuery.data && favorites.length === 0 && (
        <EmptyState
          icon={Heart}
          title="Aucun favori"
          description="Vous n'avez encore enregistré aucune offre. Cliquez sur le cœur d'une annonce pour la retrouver ici."
          action={
            <Button asChild>
              <Link to="/materiel">Parcourir le matériel</Link>
            </Button>
          }
        />
      )}

      {favorites.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((favorite) => favorite.listing && <ListingCard key={favorite.id} listing={favorite.listing} />)}
        </div>
      )}
    </>
  );
}
