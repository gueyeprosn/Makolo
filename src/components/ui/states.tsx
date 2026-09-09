import * as React from 'react';
import { AlertTriangle, Inbox, Lock, RefreshCw, SearchX } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** État vide générique : jamais d'écran blanc sans explication. */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-doux-300 bg-ivoire/60 px-6 py-14 text-center',
        className,
      )}
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white text-nuit shadow-sm">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-nuit">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-doux">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function NoResultsState({ onReset }: { onReset?: () => void }) {
  return (
    <EmptyState
      icon={SearchX}
      title="Aucun résultat"
      description="Aucun matériel ne correspond à votre recherche. Essayez d'élargir vos filtres ou de changer de ville."
      action={
        onReset ? (
          <Button variant="outline" onClick={onReset}>
            Réinitialiser les filtres
          </Button>
        ) : undefined
      }
    />
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Une erreur est survenue',
  message = 'Impossible de charger les données. Veuillez réessayer.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/70 px-6 py-12 text-center',
        className,
      )}
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white text-destructive shadow-sm">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-nuit">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-doux-600">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Réessayer
        </Button>
      )}
    </div>
  );
}

export function UnauthorizedState({ description }: { description?: string }) {
  return (
    <EmptyState
      icon={Lock}
      title="Accès non autorisé"
      description={description ?? "Vous n'avez pas les droits nécessaires pour consulter cette page."}
    />
  );
}
