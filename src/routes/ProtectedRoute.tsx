import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { UnauthorizedState } from '@/components/ui/states';
import { ROLE_HOME } from '@/constants';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  /** Rôles autorisés. Vide = tout compte connecté. */
  roles?: UserRole[];
}

/**
 * Garde de route côté application.
 *
 * Elle empêche l'affichage d'une page réservée, mais ne constitue PAS la
 * sécurité du système : même en forçant l'URL, les requêtes correspondantes
 * sont rejetées par les policies RLS de Supabase.
 */
export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, profile, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="size-8 animate-spin text-orange" aria-hidden="true" />
        <span className="sr-only">Chargement de votre session…</span>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname + location.search }} />;
  }

  if (!profile.active) {
    return (
      <div className="container py-16">
        <UnauthorizedState description="Votre compte est désactivé. Contactez le support MAKOLO pour le réactiver." />
      </div>
    );
  }

  if (roles && roles.length > 0 && !roles.includes(profile.role)) {
    // Redirection vers l'espace correspondant au rôle réel plutôt qu'une page d'erreur.
    return <Navigate to={ROLE_HOME[profile.role]} replace />;
  }

  return <Outlet />;
}

/** Empêche un utilisateur déjà connecté d'atteindre les pages d'authentification. */
export function GuestRoute() {
  const { user, profile, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="size-8 animate-spin text-orange" aria-hidden="true" />
        <span className="sr-only">Chargement…</span>
      </div>
    );
  }

  if (user && profile) return <Navigate to={ROLE_HOME[profile.role]} replace />;

  return <Outlet />;
}
