import { Link } from 'react-router-dom';
import { Compass, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/Logo';
import { useDocumentTitle } from '@/hooks/use-document-title';

export function NotFoundPage() {
  useDocumentTitle('Page introuvable', "La page que vous cherchez n'existe pas.");

  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <Logo variant="mark" className="mb-6 scale-150" />

      <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange">Erreur 404</p>
      <h1 className="makolo-h1 mt-3">Cette page n'existe pas.</h1>
      <p className="mt-4 max-w-md text-doux">
        Le lien est peut-être erroné ou l'offre que vous cherchiez a été retirée. Retournez à l'accueil ou explorez le
        matériel disponible.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link to="/">
            <Home className="size-4" aria-hidden="true" />
            Retour à l'accueil
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/materiel">
            <Search className="size-4" aria-hidden="true" />
            Parcourir le matériel
          </Link>
        </Button>
      </div>

      <p className="mt-10 inline-flex items-center gap-2 text-sm text-doux">
        <Compass className="size-4" aria-hidden="true" />
        Besoin d'aide ? Consultez la section « Comment ça marche » sur la page d'accueil.
      </p>
    </div>
  );
}
