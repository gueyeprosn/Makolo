import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ListingGridSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { CategoryCard, categoryIcon } from '@/components/listings/CategoryCard';
import { ListingCard } from '@/components/listings/ListingCard';
import { useCategories, useListings } from '@/hooks/use-listings';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { CITIES } from '@/constants';

const QUICK_FILTERS = ['chaises', 'tables', 'tentes', 'sono', 'eclairage'] as const;

const STEPS = [
  {
    icon: Search,
    title: 'Trouvez le matériel',
    description: "Parcourez les offres par catégorie, par ville et par budget, partout au Sénégal.",
  },
  {
    icon: CalendarCheck,
    title: 'Vérifiez la disponibilité',
    description: 'Choisissez la date de votre événement : la plateforme vérifie le stock réellement disponible.',
  },
  {
    icon: CheckCircle2,
    title: 'Envoyez votre demande',
    description: "Le prestataire reçoit votre demande, l'accepte ou la refuse, et vous êtes notifié aussitôt.",
  },
];

const PROVIDER_BENEFITS = [
  { icon: Store, title: 'Une vitrine professionnelle', description: 'Présentez votre matériel, vos tarifs et votre ville en quelques minutes.' },
  { icon: CalendarCheck, title: 'Des demandes centralisées', description: 'Recevez, acceptez ou refusez les demandes depuis un seul tableau de bord.' },
  { icon: Truck, title: 'Plus de visibilité', description: 'Soyez trouvé par les organisateurs d’événements de votre région.' },
];

export function HomePage() {
  useDocumentTitle();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');

  const categoriesQuery = useCategories();
  const popularQuery = useListings({ sort: 'recent', pageSize: 8, page: 1 });

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/materiel?q=${encodeURIComponent(query)}` : '/materiel');
  };

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden bg-ivoire">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-orange/10 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-nuit/5 blur-2xl"
        />

        <div className="container relative py-14 sm:py-20 lg:py-24">
          <div className="max-w-3xl">
            <Badge variant="orange" className="mb-5">
              <Sparkles aria-hidden="true" />
              Louez • Célébrez • Simplement
            </Badge>

            <h1 className="makalo-h1">Tout ce qu'il vous faut pour vos événements.</h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-doux-600 sm:text-lg">
              Trouvez et réservez facilement du matériel événementiel auprès de prestataires au Sénégal.
            </p>

            <form onSubmit={handleSearch} className="mt-8 max-w-xl" role="search">
              <label htmlFor="hero-search" className="sr-only">
                Rechercher un matériel
              </label>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-doux"
                    aria-hidden="true"
                  />
                  <Input
                    id="hero-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher un matériel..."
                    className="h-12 pl-10"
                  />
                </div>
                <Button type="submit" variant="accent" size="lg" className="sm:w-auto">
                  Rechercher
                </Button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-doux">Recherches fréquentes :</span>
              {QUICK_FILTERS.map((slug) => {
                const Icon = categoryIcon(slug);
                return (
                  <Link
                    key={slug}
                    to={`/materiel?categorie=${slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-doux-200 bg-white px-3 py-1.5 text-sm font-medium text-nuit transition-colors hover:border-orange-200 hover:bg-orange-50"
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                    {slug === 'eclairage' ? 'Éclairage' : slug.charAt(0).toUpperCase() + slug.slice(1)}
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/materiel">
                  Voir le matériel
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/inscription?role=prestataire">Publier une offre</Link>
              </Button>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-doux">
              <li className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-orange" aria-hidden="true" />
                {CITIES.length} villes couvertes
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CalendarCheck className="size-4 text-orange" aria-hidden="true" />
                Disponibilité vérifiée par date
              </li>
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-orange" aria-hidden="true" />
                Demandes suivies de bout en bout
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Catégories */}
      <section className="makalo-section" aria-labelledby="categories-title">
        <div className="container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="categories-title" className="makalo-h2">
                Explorez par catégorie
              </h2>
              <p className="mt-2 text-doux">Le matériel essentiel pour réussir votre événement.</p>
            </div>
            <Button asChild variant="link">
              <Link to="/materiel">
                Tout voir
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {categoriesQuery.isPending && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="skeleton h-52 rounded-2xl" />
              ))}
            </div>
          )}

          {categoriesQuery.isError && <ErrorState onRetry={() => categoriesQuery.refetch()} />}

          {categoriesQuery.data && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {categoriesQuery.data.slice(0, 5).map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- Offres populaires */}
      <section className="makalo-section bg-ivoire/60" aria-labelledby="offres-title">
        <div className="container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="offres-title" className="makalo-h2">
                Nos meilleures offres
              </h2>
              <p className="mt-2 text-doux">Les dernières annonces publiées par nos prestataires.</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/materiel">Voir tout le matériel</Link>
            </Button>
          </div>

          {popularQuery.isPending && <ListingGridSkeleton count={8} />}

          {popularQuery.isError && <ErrorState onRetry={() => popularQuery.refetch()} />}

          {popularQuery.data && popularQuery.data.items.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {popularQuery.data.items.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {popularQuery.data && popularQuery.data.items.length === 0 && (
            <p className="rounded-2xl border border-dashed border-doux-300 bg-white px-6 py-12 text-center text-doux">
              Aucune offre n'est encore publiée. Revenez très bientôt.
            </p>
          )}
        </div>
      </section>

      {/* ------------------------------------------------- Comment ça marche */}
      <section id="comment-ca-marche" className="makalo-section scroll-mt-20" aria-labelledby="etapes-title">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="etapes-title" className="makalo-h2">
              Comment ça marche
            </h2>
            <p className="mt-2 text-doux">Trois étapes suffisent pour équiper votre événement.</p>
          </div>

          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative rounded-2xl border border-doux-200 bg-white p-6 shadow-card">
                <span className="absolute right-5 top-5 text-4xl font-extrabold text-ivoire" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="flex size-12 items-center justify-center rounded-xl bg-nuit text-white">
                  <step.icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-nuit">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-doux">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------ Devenir prestataire */}
      <section id="devenir-prestataire" className="makalo-section scroll-mt-20 pb-16" aria-labelledby="prestataire-title">
        <div className="container">
          <div className="overflow-hidden rounded-2xl bg-nuit">
            <div className="grid gap-10 p-8 sm:p-10 lg:grid-cols-2 lg:p-14">
              <div>
                <Badge variant="orange" className="mb-4 border-transparent bg-orange text-white">
                  Prestataires
                </Badge>
                <h2 id="prestataire-title" className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight text-white">
                  Louez votre matériel à plus d'organisateurs.
                </h2>
                <p className="mt-4 max-w-md leading-relaxed text-nuit-100">
                  Publiez vos équipements, définissez vos tarifs et recevez des demandes de réservation de clients
                  partout au Sénégal. La création de compte est gratuite.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="accent" size="lg">
                    <Link to="/inscription?role=prestataire">
                      Devenir prestataire
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-nuit-400 bg-transparent text-white hover:bg-nuit-600 hover:text-white"
                  >
                    <Link to="/materiel">Voir la marketplace</Link>
                  </Button>
                </div>
              </div>

              <ul className="grid gap-4 sm:grid-cols-1">
                {PROVIDER_BENEFITS.map((benefit) => (
                  <li key={benefit.title} className="flex gap-4 rounded-xl bg-nuit-600/60 p-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange text-white">
                      <benefit.icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">{benefit.title}</h3>
                      <p className="mt-1 text-sm text-nuit-100">{benefit.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
