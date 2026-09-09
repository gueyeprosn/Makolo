import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';

interface State {
  hasError: boolean;
}

/**
 * Filet de sécurité global : une exception de rendu affiche un message
 * compréhensible au lieu d'une page blanche.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) console.error('[MAKALO] Erreur de rendu', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container flex min-h-dvh flex-col items-center justify-center py-16">
          <ErrorState
            title="Une erreur inattendue est survenue"
            message="Nous n'avons pas pu afficher cette page. Rechargez l'application pour continuer."
            className="w-full max-w-lg"
          />
          <Button className="mt-6" onClick={() => window.location.assign('/')}>
            Retour à l'accueil
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
