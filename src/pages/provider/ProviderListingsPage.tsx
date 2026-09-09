import * as React from 'react';
import { Link } from 'react-router-dom';
import { Archive, Package, Pencil, PlusCircle, Send, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListingGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ListingCard } from '@/components/listings/ListingCard';
import { useDeleteListing, useListings, useSetListingStatus } from '@/hooks/use-listings';
import { useAuth } from '@/hooks/use-auth';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { errorMessage } from '@/lib/errors';
import type { ListingStatus, ListingWithRelations } from '@/types';

const TABS: { value: ListingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'published', label: 'Publiées' },
  { value: 'pending', label: 'En validation' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'rejected', label: 'Refusées' },
  { value: 'archived', label: 'Archivées' },
];

export function ProviderListingsPage() {
  useDocumentTitle('Mes annonces');
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = React.useState<string>('all');
  const [toDelete, setToDelete] = React.useState<ListingWithRelations | null>(null);

  const listingsQuery = useListings(
    { providerId: user?.id, status: 'all', pageSize: 60, sort: 'recent' },
    { enabled: Boolean(user) },
  );
  const setStatus = useSetListingStatus();
  const deleteListing = useDeleteListing();

  const listings = listingsQuery.data?.items ?? [];
  const filtered = tab === 'all' ? listings : listings.filter((listing) => listing.status === tab);

  const changeStatus = async (id: string, status: ListingStatus, message: string) => {
    try {
      await setStatus.mutateAsync({ id, status });
      toast.success(message);
    } catch (error) {
      toast.error('Action impossible', errorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteListing.mutateAsync(toDelete.id);
      toast.success('Offre supprimée.');
    } catch (error) {
      toast.error('Suppression impossible', errorMessage(error));
    } finally {
      setToDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Mes annonces"
        description="Créez, modifiez et gérez la mise en ligne de votre matériel."
        action={
          <Button asChild variant="accent">
            <Link to="/prestataire/annonces/nouveau">
              <PlusCircle className="size-4" aria-hidden="true" />
              Publier une offre
            </Link>
          </Button>
        }
      />

      {listingsQuery.isPending && <ListingGridSkeleton count={3} />}

      {listingsQuery.isError && (
        <ErrorState message={errorMessage(listingsQuery.error)} onRetry={() => listingsQuery.refetch()} />
      )}

      {listingsQuery.data && listings.length === 0 && (
        <EmptyState
          icon={Package}
          title="Aucune annonce"
          description="Vous n'avez pas encore publié d'offre. Créez votre première annonce en quelques minutes."
          action={
            <Button asChild>
              <Link to="/prestataire/annonces/nouveau">Créer une annonce</Link>
            </Button>
          }
        />
      )}

      {listings.length > 0 && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {TABS.map((item) => {
              const count =
                item.value === 'all' ? listings.length : listings.filter((listing) => listing.status === item.value).length;
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
              <EmptyState icon={Package} title="Aucune annonce dans cette catégorie" />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((listing) => (
                  <div key={listing.id} className="flex flex-col gap-2">
                    <ListingCard listing={listing} hideFavorite showStatus footer={<span />} />

                    {listing.status === 'rejected' && listing.moderation_reason && (
                      <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-destructive">
                        <span className="font-semibold">Motif du refus :</span> {listing.moderation_reason}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/prestataire/annonces/${listing.id}/modifier`}>
                          <Pencil className="size-4" aria-hidden="true" />
                          Modifier
                        </Link>
                      </Button>

                      {(listing.status === 'draft' || listing.status === 'archived') && (
                        <Button
                          size="sm"
                          variant="accent"
                          onClick={() => void changeStatus(listing.id, 'pending', 'Annonce soumise à validation.')}
                        >
                          <Send className="size-4" aria-hidden="true" />
                          Soumettre
                        </Button>
                      )}

                      {listing.status === 'published' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void changeStatus(listing.id, 'archived', 'Annonce archivée.')}
                        >
                          <Archive className="size-4" aria-hidden="true" />
                          Archiver
                        </Button>
                      )}

                      {listing.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void changeStatus(listing.id, 'draft', 'Annonce repassée en brouillon.')}
                        >
                          <Upload className="size-4 rotate-180" aria-hidden="true" />
                          Retirer de la validation
                        </Button>
                      )}

                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setToDelete(listing)}>
                        <Trash2 className="size-4" aria-hidden="true" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Êtes-vous sûr de vouloir supprimer cette annonce ?"
        description={`« ${toDelete?.title ?? ''} » sera définitivement supprimée, ainsi que ses photos et les demandes associées. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        loading={deleteListing.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
