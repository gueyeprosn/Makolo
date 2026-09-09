import { Link } from 'react-router-dom';
import {
  Ban,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  FolderTree,
  Inbox,
  Package,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCardSkeleton, RowSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useAdminActivity, useAdminStats } from '@/hooks/use-stats';
import { useAuth } from '@/hooks/use-auth';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { isAdmin } from '@/lib/permissions';
import { errorMessage } from '@/lib/errors';
import { formatNumber, formatPrice, formatRelative } from '@/lib/utils';
import type { AdminActivityType } from '@/types';

const ACTIVITY_ICON: Record<AdminActivityType, LucideIcon> = {
  listing_published: CheckCircle2,
  listing_rejected: XCircle,
  booking_created: CalendarClock,
  booking_accepted: CheckCircle2,
  booking_rejected: XCircle,
  booking_cancelled: Ban,
  provider_registered: Store,
  provider_verification_requested: ShieldCheck,
  provider_verified: ShieldCheck,
};

export function AdminDashboardPage() {
  useDocumentTitle('Administration');
  const { profile } = useAuth();
  const enabled = isAdmin(profile);
  const statsQuery = useAdminStats(enabled);
  const activityQuery = useAdminActivity(enabled);
  const stats = statsQuery.data;

  // Répartition simple des comptes, rendue sans dépendance graphique.
  const roleBreakdown = stats
    ? [
        { label: 'Clients', value: stats.clients, color: 'bg-nuit' },
        { label: 'Prestataires', value: stats.providers, color: 'bg-orange' },
        { label: 'Autres comptes', value: Math.max(0, stats.users - stats.clients - stats.providers), color: 'bg-doux-300' },
      ]
    : [];
  const roleTotal = roleBreakdown.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de l'activité de la plateforme MAKALO."
        action={
          stats && stats.pendingListings > 0 ? (
            <Button asChild variant="accent">
              <Link to="/admin/operations/annonces?statut=pending">
                {formatNumber(stats.pendingListings)} annonce(s) à modérer
              </Link>
            </Button>
          ) : undefined
        }
      />

      {stats && (stats.pendingListings > 0 || stats.pendingVerifications > 0 || stats.pendingBookings > 0) && (
        <Card className="mb-6 border-orange-200 bg-orange-50/60">
          <CardHeader>
            <CardTitle>Action requise</CardTitle>
            <CardDescription>Ce qui attend une décision de l'équipe MAKALO.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {stats.pendingListings > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/operations/annonces?statut=pending">
                  <Package className="size-4" aria-hidden="true" />
                  {formatNumber(stats.pendingListings)} annonce(s) à modérer
                </Link>
              </Button>
            )}
            {stats.pendingVerifications > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/operations/prestataires?statut=pending">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  {formatNumber(stats.pendingVerifications)} prestataire(s) à vérifier
                </Link>
              </Button>
            )}
            {stats.pendingBookings > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/operations/reservations">
                  <CalendarClock className="size-4" aria-hidden="true" />
                  {formatNumber(stats.pendingBookings)} demande(s) en attente
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {statsQuery.isPending && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      )}

      {statsQuery.isError && <ErrorState message={errorMessage(statsQuery.error)} onRetry={() => statsQuery.refetch()} />}

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Activité estimée (GMV)"
              value={formatPrice(stats.gmvEstimate)}
              icon={Wallet}
              tone="success"
              hint="Estimation, pas un revenu confirmé"
            />
            <StatCard label="Utilisateurs" value={stats.users} icon={Users} tone="nuit" />
            <StatCard label="Prestataires" value={stats.providers} icon={Store} tone="orange" />
            <StatCard label="Annonces" value={stats.listings} icon={Package} tone="nuit" />
            <StatCard
              label="Annonces en attente"
              value={stats.pendingListings}
              icon={Clock}
              tone="orange"
              hint="À modérer"
            />
            <StatCard
              label="Prestataires à vérifier"
              value={stats.pendingVerifications}
              icon={ShieldCheck}
              tone="orange"
              hint="Vérification d'identité"
            />
            <StatCard label="Demandes" value={stats.requests} icon={CalendarCheck} tone="nuit" />
            <StatCard label="Demandes en attente" value={stats.pendingBookings} icon={CalendarClock} tone="orange" />
            <StatCard label="Demandes acceptées" value={stats.acceptedRequests} icon={CheckCircle2} tone="success" />
            <StatCard label="Catégories" value={stats.categories} icon={FolderTree} tone="nuit" />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Répartition des comptes</CardTitle>
              <CardDescription>Part de chaque type de compte sur la plateforme.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-doux-200" role="presentation">
                {roleBreakdown.map((item) => (
                  <div
                    key={item.label}
                    className={item.color}
                    style={{ width: `${(item.value / roleTotal) * 100}%` }}
                    title={`${item.label} : ${item.value}`}
                  />
                ))}
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {roleBreakdown.map((item) => (
                  <li key={item.label} className="inline-flex items-center gap-2 text-doux">
                    <span className={`size-2.5 rounded-full ${item.color}`} aria-hidden="true" />
                    {item.label} : <span className="font-semibold text-nuit">{formatNumber(item.value)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Button asChild variant="outline" size="lg" className="h-auto justify-start py-4">
              <Link to="/admin/operations/prestataires">
                <ShieldCheck className="size-5" aria-hidden="true" />
                Vérifier les prestataires
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-auto justify-start py-4">
              <Link to="/admin/operations/annonces">
                <Package className="size-5" aria-hidden="true" />
                Modérer les annonces
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-auto justify-start py-4">
              <Link to="/admin/operations/utilisateurs">
                <Users className="size-5" aria-hidden="true" />
                Gérer les utilisateurs
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-auto justify-start py-4">
              <Link to="/admin/cms/categories">
                <FolderTree className="size-5" aria-hidden="true" />
                Gérer les catégories
              </Link>
            </Button>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
              <CardDescription>
                Événements dont l'horodatage est fiable (statuts publiés/refusés/acceptés) — pas un journal complet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityQuery.isPending && <RowSkeleton rows={4} />}

              {activityQuery.isError && (
                <ErrorState message={errorMessage(activityQuery.error)} onRetry={() => activityQuery.refetch()} />
              )}

              {activityQuery.data && activityQuery.data.length === 0 && (
                <EmptyState icon={Inbox} title="Aucune activité récente" />
              )}

              {activityQuery.data && activityQuery.data.length > 0 && (
                <ul className="space-y-1">
                  {activityQuery.data.map((event) => {
                    const Icon = ACTIVITY_ICON[event.type];
                    const content = (
                      <>
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ivoire text-nuit">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-nuit">{event.label}</span>
                          <span className="block text-xs text-doux">
                            {event.actor ? `${event.actor} · ` : ''}
                            {formatRelative(event.at)}
                          </span>
                        </span>
                      </>
                    );
                    return (
                      <li key={event.id}>
                        {event.href ? (
                          <Link
                            to={event.href}
                            className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-doux-100"
                          >
                            {content}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 rounded-xl px-2 py-2">{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
