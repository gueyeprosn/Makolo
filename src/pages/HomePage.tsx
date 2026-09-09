import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  MapPin,
  MessageCircleMore,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListingGridSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { CategoryCard, categoryIcon } from '@/components/listings/CategoryCard';
import { ListingCard } from '@/components/listings/ListingCard';
import { useCategories, useListings } from '@/hooks/use-listings';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { CITIES } from '@/constants';
import heroCloseup from '@/assets/hero/hero-event-closeup.jpg';
import heroWide from '@/assets/hero/hero-event-wide.jpg';

const ANY_CITY = '__any_city__';
const ANY_CATEGORY = '__any_category__';

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Annonces vérifiées',
    description: 'Chaque annonce est validée par notre équipe avant sa publication sur la marketplace.',
  },
  {
    icon: CalendarCheck,
    title: 'Disponibilité vérifiée',
    description: "Le stock réellement disponible s'affiche sur la période exacte de votre événement.",
  },
  {
    icon: MessageCircleMore,
    title: 'Demandes suivies de bout en bout',
    description: 'Statut en temps réel, notifications à chaque réponse du prestataire.',
  },
  {
    icon: Store,
    title: 'Devenez prestataire',
    description: 'Création de compte et publication de vos annonces gratuites, en quelques minutes.',
  },
];

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
  const [city, setCity] = React.useState(ANY_CITY);
  const [category, setCategory] = React.useState(ANY_CATEGORY);

  const categoriesQuery = useCategories();
  const popularQuery = useListings({ sort: 'recent', pageSize: 8, page: 1 });

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    const query = search.trim();
    if (query) params.set('q', query);
    if (city !== ANY_CITY) params.set('ville', city);
    if (category !== ANY_CATEGORY) params.set('categorie', category);
    const qs = params.toString();
    navigate(qs ? `/materiel?${qs}` : '/materiel');
  };

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden bg-nuit">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-orange/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-white/5 blur-3xl"
        />

        <div className="container relative pb-24 pt-14 sm:pb-28 sm:pt-20 lg:pb-32 lg:pt-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="max-w-xl">
              <Badge variant="orange" className="mb-5 border-transparent bg-orange text-white">
                <Sparkles aria-hidden="true" />
                Louez • Célébrez • Simplement
              </Badge>

              <h1 className="makalo-h1 text-white">Tout ce qu'il vous faut pour vos événements.</h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-nuit-100 sm:text-lg">
                Trouvez et réservez facilement du matériel événementiel auprès de prestataires au Sénégal.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="accent" size="lg">
                  <Link to="/materiel">
                    Voir le matériel
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-nuit-400 bg-transparent text-white hover:bg-white hover:text-nuit"
                >
                  <Link to="/inscription?role=prestataire">Publier une offre</Link>
                </Button>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-nuit-100">
                <li className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-orange" aria-hidden="true" />
                  {CITIES.length} villes couvertes
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <CalendarCheck className="size-4 text-orange" aria-hidden="true" />
                  Disponibilité vérifiée par période
                </li>
              </ul>
            </div>

            <div className="relative mx-auto w-full max-w-lg">
              <img
                src={heroWide}
                alt="Tente de réception, chaises et guirlandes lumineuses installées pour un événement en soirée"
                className="aspect-[16/9] w-full rounded-3xl object-cover shadow-pop"
                width={1376}
                height={768}
              />
              <img
                src={heroCloseup}
                alt=""
                aria-hidden="true"
                width={1200}
                height={896}
                className="absolute -bottom-8 -left-6 hidden aspect-[4/3] w-56 rounded-2xl border-4 border-white object-cover shadow-pop sm:w-64 lg:block"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Carte de recherche : chevauche volontairement le bas du hero. */}
      <div className="container relative z-10 -mt-14 sm:-mt-16">
        <form
          onSubmit={handleSearch}
          role="search"
          className="mx-auto max-w-3xl rounded-2xl border border-doux-200 bg-white p-2.5 shadow-pop sm:p-3"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:divide-x sm:divide-doux-200">
            <div className="relative flex-[1.8]">
              <label htmlFor="hero-search" className="sr-only">
                Que recherchez-vous ?
              </label>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-doux"
                aria-hidden="true"
              />
              <Input
                id="hero-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Chaises, tentes..."
                className="h-12 border-0 pl-10 shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="flex-[0.9] sm:pl-2">
              <label htmlFor="hero-city" className="sr-only">
                Où ?
              </label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger id="hero-city" className="h-12 border-0 shadow-none focus:ring-0">
                  <MapPin className="size-4 shrink-0 text-doux" aria-hidden="true" />
                  <SelectValue placeholder="Où ?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_CITY}>Ville</SelectItem>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-[0.9] sm:pl-2">
              <label htmlFor="hero-category" className="sr-only">
                Catégorie
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="hero-category" className="h-12 border-0 shadow-none focus:ring-0">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_CATEGORY}>Catégorie</SelectItem>
                  {(categoriesQuery.data ?? []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" variant="accent" size="lg" className="h-12 sm:w-auto">
              <Search className="size-4 sm:hidden" aria-hidden="true" />
              Rechercher
            </Button>
          </div>
        </form>
        <p className="mt-3 text-center text-sm text-doux">
          La disponibilité exacte sur la période de votre événement se vérifie sur chaque annonce.
        </p>
      </div>

      {/* ------------------------------------------------- Bandeau catégories */}
      {categoriesQuery.data && categoriesQuery.data.length > 0 && (
        <nav aria-label="Parcourir par catégorie" className="border-b border-doux-200 bg-white">
          <div className="container">
            <div className="flex gap-7 overflow-x-auto py-6 sm:justify-center sm:gap-10" style={{ scrollbarWidth: 'none' }}>
              {categoriesQuery.data.map((cat) => {
                const Icon = categoryIcon(cat.slug);
                return (
                  <Link
                    key={cat.id}
                    to={`/materiel?categorie=${cat.slug}`}
                    className="group flex shrink-0 flex-col items-center gap-2 text-doux-500 transition-colors hover:text-nuit"
                  >
                    <span className="flex size-11 items-center justify-center rounded-full bg-ivoire text-nuit transition-colors group-hover:bg-orange group-hover:text-white">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="whitespace-nowrap text-xs font-semibold">{cat.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}

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

      {/* ------------------------------------------------------- Réassurance */}
      <section className="border-y border-doux-200 bg-white py-10 sm:py-12" aria-label="Pourquoi MAKALO">
        <div className="container grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_POINTS.map((point) => (
            <div key={point.title} className="flex flex-col items-start gap-3">
              <point.icon className="size-7 text-orange" aria-hidden="true" />
              <h3 className="text-sm font-bold text-nuit">{point.title}</h3>
              <p className="text-sm leading-relaxed text-doux">{point.description}</p>
            </div>
          ))}
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
