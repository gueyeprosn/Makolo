import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, CheckCircle2, Package, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { Field, fieldAria } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ListingGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ListingCard } from '@/components/listings/ListingCard';
import { useDeleteListing, useListings, useSetListingStatus } from '@/hooks/use-listings';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { LISTING_STATUS_LABEL } from '@/constants';
import { rejectionSchema, type RejectionValues } from '@/lib/validations';
import { errorMessage } from '@/lib/errors';
import { formatNumber } from '@/lib/utils';
import type { ListingStatus, ListingWithRelations } from '@/types';

const STATUSES: (ListingStatus | 'all')[] = ['pending', 'published', 'draft', 'rejected', 'archived', 'all'];

export function AdminListingsPage() {
  useDocumentTitle('Modération des annonces');
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = (searchParams.get('statut') as ListingStatus | 'all') ?? 'pending';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const [toReject, setToReject] = React.useState<ListingWithRelations | null>(null);
  const [toDelete, setToDelete] = React.useState<ListingWithRelations | null>(null);

  const listingsQuery = useListings({ status, page, pageSize: 12, sort: 'recent' });
  const setStatus = useSetListingStatus();
  const deleteListing = useDeleteListing();

  const rejectForm = useForm<RejectionValues>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: { reason: '' },
  });

  const updateParams = (patch: Record<string, string | null>) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null) next.delete(key);
        else next.set(key, value);
      });
      return next;
    });
  };

  const moderate = async (id: string, nextStatus: ListingStatus, message: string) => {
    try {
      await setStatus.mutateAsync({ id, status: nextStatus });
      toast.success(message);
    } catch (error) {
      toast.error('Action impossible', errorMessage(error));
    }
  };

  const submitRejection = rejectForm.handleSubmit(async (values) => {
    if (!toReject) return;
    try {
      await setStatus.mutateAsync({ id: toReject.id, status: 'rejected', reason: values.reason });
      toast.success('Annonce refusée', 'Le prestataire a été notifié du motif.');
      setToReject(null);
      rejectForm.reset();
    } catch (error) {
      rejectForm.setError('root', { message: errorMessage(error) });
    }
  });

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteListing.mutateAsync(toDelete.id);
      toast.success('Annonce supprimée.');
    } catch (error) {
      toast.error('Suppression impossible', errorMessage(error));
    } finally {
      setToDelete(null);
    }
  };

  const listings = listingsQuery.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Annonces"
        description={
          listingsQuery.data
            ? `${formatNumber(listingsQuery.data.total)} annonce(s) — ${status === 'all' ? 'tous statuts' : LISTING_STATUS_LABEL[status as ListingStatus].toLowerCase()}.`
            : 'Modération des annonces publiées par les prestataires.'
        }
        action={
          <div className="flex items-center gap-2">
            <Label htmlFor="status-filter" className="whitespace-nowrap text-sm text-doux">
              Statut
            </Label>
            <Select value={status} onValueChange={(value) => updateParams({ statut: value, page: null })}>
              <SelectTrigger id="status-filter" className="h-10 w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === 'all' ? 'Tous les statuts' : LISTING_STATUS_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {listingsQuery.isPending && <ListingGridSkeleton count={6} />}

      {listingsQuery.isError && (
        <ErrorState message={errorMessage(listingsQuery.error)} onRetry={() => listingsQuery.refetch()} />
      )}

      {listingsQuery.data && listings.length === 0 && (
        <EmptyState
          icon={Package}
          title="Aucune annonce"
          description={
            status === 'pending'
              ? 'Aucune annonce n’attend de validation. Tout est à jour.'
              : 'Aucune annonce ne correspond à ce statut.'
          }
        />
      )}

      {listings.length > 0 && (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <div key={listing.id} className="flex flex-col gap-2">
                <ListingCard listing={listing} hideFavorite showStatus footer={<span />} />

                {listing.moderation_reason && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-destructive">
                    <span className="font-semibold">Motif :</span> {listing.moderation_reason}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {listing.status !== 'published' && (
                    <Button
                      size="sm"
                      variant="accent"
                      onClick={() => void moderate(listing.id, 'published', 'Annonce publiée.')}
                    >
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Publier
                    </Button>
                  )}

                  {listing.status !== 'rejected' && (
                    <Button size="sm" variant="outline" onClick={() => setToReject(listing)}>
                      <XCircle className="size-4" aria-hidden="true" />
                      Refuser
                    </Button>
                  )}

                  {listing.status !== 'archived' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void moderate(listing.id, 'archived', 'Annonce archivée.')}
                    >
                      <Archive className="size-4" aria-hidden="true" />
                      Archiver
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

          <Pagination
            className="mt-8"
            page={listingsQuery.data?.page ?? 1}
            totalPages={listingsQuery.data?.totalPages ?? 1}
            onPageChange={(next) => updateParams({ page: next === 1 ? null : String(next) })}
          />
        </>
      )}

      {/* Refus : un motif est obligatoire et transmis au prestataire. */}
      <Dialog
        open={Boolean(toReject)}
        onOpenChange={(open) => {
          if (!open) {
            setToReject(null);
            rejectForm.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser cette annonce</DialogTitle>
            <DialogDescription>
              Indiquez le motif du refus : il sera transmis au prestataire pour qu'il puisse corriger son annonce.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitRejection} className="space-y-4" noValidate>
            {rejectForm.formState.errors.root && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
                {rejectForm.formState.errors.root.message}
              </p>
            )}

            <Field
              label="Motif du refus"
              htmlFor="reason"
              required
              error={rejectForm.formState.errors.reason?.message}
            >
              <Textarea
                rows={4}
                placeholder="Exemple : la description ne correspond pas au matériel photographié."
                {...fieldAria('reason', rejectForm.formState.errors.reason?.message)}
                {...rejectForm.register('reason')}
              />
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setToReject(null)}>
                Annuler
              </Button>
              <Button type="submit" variant="destructive" loading={setStatus.isPending} loadingText="Envoi…">
                Refuser l'annonce
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Supprimer définitivement cette annonce ?"
        description={`« ${toDelete?.title ?? ''} » ainsi que ses photos et demandes associées seront supprimées. Préférez l'archivage si vous souhaitez conserver l'historique.`}
        confirmLabel="Supprimer"
        loading={deleteListing.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
