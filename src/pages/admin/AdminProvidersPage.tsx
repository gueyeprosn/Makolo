import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Search, ShieldCheck, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Field, fieldAria } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RowSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { api } from '@/services';
import { useDebounce } from '@/hooks/use-debounce';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { rejectionSchema, type RejectionValues } from '@/lib/validations';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatNumber } from '@/lib/utils';
import type { Profile, ProviderVerificationStatus } from '@/types';

const STATUS_LABEL: Record<ProviderVerificationStatus, string> = {
  unverified: 'Non vérifié',
  pending: 'Demande en attente',
  verified: 'Vérifié',
  rejected: 'Rejeté',
};

const STATUS_BADGE: Record<ProviderVerificationStatus, 'neutral' | 'orange' | 'success' | 'danger'> = {
  unverified: 'neutral',
  pending: 'orange',
  verified: 'success',
  rejected: 'danger',
};

export function AdminProvidersPage() {
  useDocumentTitle('Prestataires');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = React.useState('');
  const verification = (searchParams.get('statut') as ProviderVerificationStatus | 'all') ?? 'all';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const [toApprove, setToApprove] = React.useState<Profile | null>(null);
  const [toReject, setToReject] = React.useState<Profile | null>(null);
  const [busy, setBusy] = React.useState(false);

  const debouncedSearch = useDebounce(search, 350);

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

  const providersQuery = useQuery({
    queryKey: ['admin', 'users', { role: 'provider', search: debouncedSearch, verification, page }],
    queryFn: () =>
      api.adminListUsers({ role: 'provider', search: debouncedSearch, verification, page, pageSize: 10 }),
  });

  const rejectForm = useForm<RejectionValues>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: { reason: '' },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'activity'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const approve = async () => {
    if (!toApprove) return;
    setBusy(true);
    try {
      await api.adminSetProviderVerification(toApprove.id, 'verified');
      invalidate();
      toast.success('Prestataire vérifié.', `${toApprove.full_name} est désormais marqué comme vérifié.`);
      setToApprove(null);
    } catch (error) {
      toast.error('Action impossible', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const submitRejection = rejectForm.handleSubmit(async (values) => {
    if (!toReject) return;
    try {
      await api.adminSetProviderVerification(toReject.id, 'rejected', values.reason);
      invalidate();
      toast.success('Vérification rejetée.', 'Le prestataire a été notifié du motif.');
      setToReject(null);
      rejectForm.reset();
    } catch (error) {
      rejectForm.setError('root', { message: errorMessage(error) });
    }
  });

  const providers = providersQuery.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Prestataires"
        description={
          providersQuery.data
            ? `${formatNumber(providersQuery.data.total)} prestataire(s) enregistré(s).`
            : "Vérification de l'identité des prestataires — distincte de la modération des annonces."
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="provider-search">Rechercher</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-doux" aria-hidden="true" />
            <Input
              id="provider-search"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                updateParams({ page: null });
              }}
              placeholder="Nom ou e-mail"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="provider-verification">Statut de vérification</Label>
          <Select value={verification} onValueChange={(value) => updateParams({ statut: value === 'all' ? null : value, page: null })}>
            <SelectTrigger id="provider-verification">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">Demande en attente</SelectItem>
              <SelectItem value="verified">Vérifiés</SelectItem>
              <SelectItem value="rejected">Rejetés</SelectItem>
              <SelectItem value="unverified">Non vérifiés</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {providersQuery.isPending && <RowSkeleton rows={5} />}

      {providersQuery.isError && (
        <ErrorState message={errorMessage(providersQuery.error)} onRetry={() => providersQuery.refetch()} />
      )}

      {providersQuery.data && providers.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title="Aucun prestataire"
          description="Aucun prestataire ne correspond à ces critères."
        />
      )}

      {providers.length > 0 && (
        <>
          <ul className="space-y-3">
            {providers.map((provider) => (
              <li
                key={provider.id}
                className="flex flex-col gap-4 rounded-2xl border border-doux-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <Avatar name={provider.full_name} src={provider.avatar_url} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-nuit">{provider.full_name}</p>
                    <p className="truncate text-sm text-doux">{provider.email}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-doux">
                      <Badge variant={STATUS_BADGE[provider.verification_status]}>
                        {STATUS_LABEL[provider.verification_status]}
                      </Badge>
                      <span>{provider.city ?? '—'}</span>
                      {provider.verification_status === 'pending' && provider.verification_requested_at && (
                        <span>Demandé le {formatDate(provider.verification_requested_at)}</span>
                      )}
                      {provider.verification_status === 'verified' && provider.verified_at && (
                        <span>Vérifié le {formatDate(provider.verified_at)}</span>
                      )}
                    </p>
                    {provider.verification_status === 'rejected' && provider.verification_note && (
                      <p className="mt-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-destructive">
                        <span className="font-semibold">Motif :</span> {provider.verification_note}
                      </p>
                    )}
                  </div>
                </div>

                {provider.verification_status === 'pending' && (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button size="sm" variant="accent" onClick={() => setToApprove(provider)}>
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Vérifier
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setToReject(provider)}>
                      <XCircle className="size-4" aria-hidden="true" />
                      Rejeter
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <Pagination
            className="mt-8"
            page={providersQuery.data?.page ?? 1}
            totalPages={providersQuery.data?.totalPages ?? 1}
            onPageChange={(next) => updateParams({ page: next === 1 ? null : String(next) })}
          />
        </>
      )}

      <Dialog
        open={Boolean(toApprove)}
        onOpenChange={(open) => !open && setToApprove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vérifier ce prestataire ?</DialogTitle>
            <DialogDescription>
              {toApprove?.full_name} sera marqué comme vérifié auprès des clients de la plateforme.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToApprove(null)} disabled={busy}>
              Annuler
            </Button>
            <Button variant="accent" loading={busy} loadingText="Traitement…" onClick={() => void approve()}>
              Confirmer la vérification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejet : un motif est obligatoire et transmis au prestataire. */}
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
            <DialogTitle>Rejeter cette demande de vérification</DialogTitle>
            <DialogDescription>
              Indiquez le motif du rejet : il sera transmis à {toReject?.full_name ?? 'ce prestataire'}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitRejection} className="space-y-4" noValidate>
            {rejectForm.formState.errors.root && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
                {rejectForm.formState.errors.root.message}
              </p>
            )}

            <Field label="Motif du rejet" htmlFor="reason" required error={rejectForm.formState.errors.reason?.message}>
              <Textarea
                rows={4}
                placeholder="Exemple : pièce d'identité illisible, informations non vérifiables."
                {...fieldAria('reason', rejectForm.formState.errors.reason?.message)}
                {...rejectForm.register('reason')}
              />
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setToReject(null)}>
                Annuler
              </Button>
              <Button type="submit" variant="destructive" loading={rejectForm.formState.isSubmitting} loadingText="Envoi…">
                Rejeter la demande
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
