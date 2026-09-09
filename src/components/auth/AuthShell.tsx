import { Link } from 'react-router-dom';
import { CalendarCheck, MapPin, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { DemoBanner } from '@/components/common/DemoBanner';

interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Gabarit commun aux pages d'authentification (mobile-first, deux colonnes en desktop). */
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <DemoBanner />
      <div className="grid flex-1 lg:grid-cols-2">
        <div className="flex flex-col px-5 py-8 sm:px-8 lg:px-14 lg:py-12">
          <Link to="/" className="w-fit rounded-lg focus-visible:ring-2 focus-visible:ring-orange" aria-label="MAKALO — Accueil">
            <Logo />
          </Link>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <h1 className="makalo-h2">{title}</h1>
            <p className="mt-2 text-doux">{description}</p>
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6 text-sm text-doux">{footer}</div>}
          </div>
        </div>

        {/* Colonne de réassurance, masquée sur mobile pour aller à l'essentiel */}
        <aside className="relative hidden overflow-hidden bg-nuit p-14 lg:flex lg:flex-col lg:justify-center">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-orange/20 blur-3xl" />
          <div className="relative max-w-md">
            <h2 className="text-3xl font-bold leading-tight text-white">
              Des événements qui vous ressemblent.
            </h2>
            <p className="mt-4 leading-relaxed text-nuit-100">
              MAKALO réunit les loueurs de matériel événementiel du Sénégal : chaises, tables, tentes, sonorisation,
              éclairage et décoration.
            </p>
            <ul className="mt-8 space-y-4 text-nuit-100">
              <li className="flex gap-3">
                <CalendarCheck className="mt-0.5 size-5 shrink-0 text-orange" aria-hidden="true" />
                Vérifiez la disponibilité réelle avant de réserver.
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-orange" aria-hidden="true" />
                Suivez vos demandes et leurs réponses au même endroit.
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-orange" aria-hidden="true" />
                Dakar, Thiès, Touba, Mbour, Saint-Louis et bien d'autres.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
