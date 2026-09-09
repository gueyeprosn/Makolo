import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RowSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { api } from '@/services';
import { useAuth } from '@/hooks/use-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { ROLE_LABEL } from '@/constants';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatNumber } from '@/lib/utils';
import type { Profile, UserRole } from '@/types';

export function AdminUsersPage() {
  useDocumentTitle('Utilisateurs');
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile: me } = useAuth();

  const [search, setSearch] = React.useState('');
  const [role, setRole] = React.useState<UserRole | 'all'>('all');
  const [active, setActive] = React.useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = React.useState(1);
  const [target, setTarget] = React.useState<Profile | null>(null);
  const [busy, setBusy] = React.useState(false);

  const debouncedSearch = useDebounce(search, 350);

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', { search: debouncedSearch, role, active, page }],
    queryFn: () => api.adminListUsers({ search: debouncedSearch, role, active, page, pageSize: 10 }),
  });

  const changeRole = async (user: Profile, nextRole: UserRole) => {
    try {
      await api.adminUpdateUser(user.id, { role: nextRole });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Rôle mis à jour.', `${user.full_name} est désormais ${ROLE_LABEL[nextRole].toLowerCase()}.`);
    } catch (error) {
      toast.error('Modification impossible', errorMessage(error));
    }
  };

  const toggleActive = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await api.adminUpdateUser(target.id, { active: !target.active });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(target.active ? 'Compte désactivé.' : 'Compte réactivé.');
    } catch (error) {
      toast.error('Action impossible', errorMessage(error));
    } finally {
      setBusy(false);
      setTarget(null);
    }
  };

  const users = usersQuery.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description={
          usersQuery.data ? `${formatNumber(usersQuery.data.total)} compte(s) enregistré(s).` : 'Gestion des comptes.'
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor="user-search">Rechercher</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-doux" aria-hidden="true" />
            <Input
              id="user-search"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Nom ou e-mail"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-role">Rôle</Label>
          <Select
            value={role}
            onValueChange={(value) => {
              setRole(value as UserRole | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger id="user-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="client">Clients</SelectItem>
              <SelectItem value="provider">Prestataires</SelectItem>
              <SelectItem value="admin">Administrateurs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-status">Statut</Label>
          <Select
            value={active}
            onValueChange={(value) => {
              setActive(value as 'all' | 'active' | 'inactive');
              setPage(1);
            }}
          >
            <SelectTrigger id="user-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Désactivés</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {usersQuery.isPending && <RowSkeleton rows={5} />}

      {usersQuery.isError && <ErrorState message={errorMessage(usersQuery.error)} onRetry={() => usersQuery.refetch()} />}

      {usersQuery.data && users.length === 0 && (
        <EmptyState icon={Users} title="Aucun utilisateur" description="Aucun compte ne correspond à ces critères." />
      )}

      {users.length > 0 && (
        <>
          <ul className="space-y-3">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex flex-col gap-4 rounded-2xl border border-doux-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <Avatar name={user.full_name} src={user.avatar_url} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-nuit">{user.full_name}</p>
                    <p className="truncate text-sm text-doux">{user.email}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-doux">
                      <Badge variant={user.role === 'admin' ? 'nuit' : user.role === 'provider' ? 'orange' : 'neutral'}>
                        {ROLE_LABEL[user.role]}
                      </Badge>
                      {!user.active && <Badge variant="danger">Désactivé</Badge>}
                      <span>{user.city ?? '—'}</span>
                      <span>Inscrit le {formatDate(user.created_at)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Select
                    value={user.role}
                    onValueChange={(value) => void changeRole(user, value as UserRole)}
                    disabled={user.id === me?.id}
                  >
                    <SelectTrigger className="h-9 w-36" aria-label={`Rôle de ${user.full_name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="provider">Prestataire</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    variant={user.active ? 'outline' : 'accent'}
                    onClick={() => setTarget(user)}
                    disabled={user.id === me?.id}
                  >
                    {user.active ? 'Désactiver' : 'Réactiver'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            className="mt-8"
            page={usersQuery.data?.page ?? 1}
            totalPages={usersQuery.data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target?.active ? 'Désactiver ce compte ?' : 'Réactiver ce compte ?'}
        description={
          target?.active
            ? `${target.full_name} ne pourra plus se connecter ni publier sur MAKOLO tant que son compte restera désactivé.`
            : `${target?.full_name ?? ''} pourra de nouveau se connecter et utiliser la plateforme.`
        }
        confirmLabel={target?.active ? 'Désactiver' : 'Réactiver'}
        destructive={Boolean(target?.active)}
        loading={busy}
        onConfirm={toggleActive}
      />
    </>
  );
}
