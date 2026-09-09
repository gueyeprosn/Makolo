import { Link } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, Clock, FolderTree, Package, Store, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useAdminStats } from '@/hooks/use-stats';
import { useAuth } from '@/hooks/use-auth';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { isAdmin } from '@/lib/permissions';
import { errorMessage } from '@/lib/errors';
import { formatNumber } from '@/lib/utils';

export function AdminDashboardPage() {
  useDocumentTitle('Administration');
  const { profile } = useAuth();
  const statsQuery = useAdminStats(isAdmin(profile));
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
        description="Vue d'ensemble de l'activité de la plateforme MAKOLO."
        action={
          stats && stats.pendingListings > 0 ? (
            <Button asChild variant="accent">
              <Link to="/admin/annonces?statut=pending">
                {formatNumber(stats.pendingListings)} annonce(s) à modérer
              </Link>
            </Button>
          ) : undefined
        }
      />

      {statsQuery.isPending && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      )}

      {statsQuery.isError && <ErrorState message={errorMessage(statsQuery.error)} onRetry={() => statsQuery.refetch()} />}

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <StatCard label="Demandes" value={stats.requests} icon={CalendarCheck} tone="nuit" />
            <StatCard label="Demandes acceptées" value={stats.acceptedRequests} icon={CheckCircle2} tone="success" />
            <StatCard label="Catégories" value={stats.categories} icon={FolderTree} tone="nuit" />
            <StatCard label="Clients" value={stats.clients} icon={Users} tone="nuit" />
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

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Button asChild variant="outline" size="lg" className="h-auto justify-start py-4">
              <Link to="/admin/annonces">
                <Package className="size-5" aria-hidden="true" />
                Modérer les annonces
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-auto justify-start py-4">
              <Link to="/admin/utilisateurs">
                <Users className="size-5" aria-hidden="true" />
                Gérer les utilisateurs
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-auto justify-start py-4">
              <Link to="/admin/categories">
                <FolderTree className="size-5" aria-hidden="true" />
                Gérer les catégories
              </Link>
            </Button>
          </div>
        </>
      )}
    </>
  );
}
