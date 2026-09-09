import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { CITIES } from '@/constants';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-nuit-800 bg-nuit text-white">
      <div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo tone="dark" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-nuit-100">
            La plateforme de location de matériel événementiel au Sénégal. Chaises, tables, tentes, sonorisation,
            éclairage et décoration.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-nuit-200">
            <MapPin className="size-4" aria-hidden="true" />
            Dakar, Sénégal
          </p>
        </div>

        <nav aria-label="Plateforme">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">Plateforme</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-nuit-100">
            <li>
              <Link to="/materiel" className="transition-colors hover:text-orange">
                Tout le matériel
              </Link>
            </li>
            <li>
              <Link to="/materiel?tri=recent" className="transition-colors hover:text-orange">
                Nouvelles offres
              </Link>
            </li>
            <li>
              <Link to="/inscription?role=prestataire" className="transition-colors hover:text-orange">
                Devenir prestataire
              </Link>
            </li>
            <li>
              <Link to="/connexion" className="transition-colors hover:text-orange">
                Connexion
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Catégories">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">Catégories</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-nuit-100">
            {['chaises', 'tables', 'tentes', 'sono', 'eclairage'].map((slug) => (
              <li key={slug}>
                <Link to={`/materiel?categorie=${slug}`} className="capitalize transition-colors hover:text-orange">
                  {slug === 'eclairage' ? 'Éclairage' : slug}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Villes couvertes">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">Villes couvertes</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm text-nuit-100">
            {CITIES.map((city) => (
              <li key={city}>
                <Link to={`/materiel?ville=${encodeURIComponent(city)}`} className="transition-colors hover:text-orange">
                  {city}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-nuit-800">
        <div className="container flex flex-col items-center justify-between gap-3 py-5 text-sm text-nuit-200 sm:flex-row">
          <p>© {year} MAKOLO. Tous droits réservés.</p>
          <div className="flex items-center gap-5">
            <span className="text-xs uppercase tracking-[0.16em]">Louez • Célébrez • Simplement</span>
            <Link to="/mentions-legales" className="transition-colors hover:text-orange">
              Mentions légales
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
