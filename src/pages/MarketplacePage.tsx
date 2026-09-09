import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ListingGridSkeleton } from '@/components/ui/skeleton';
import { ErrorState, NoResultsState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { ListingCard } from '@/components/listings/ListingCard';
import { ListingFiltersPanel, type FiltersValue } from '@/components/listings/ListingFilters';
import { useCategories, useListings } from '@/hooks/use-listings';
import { useDebounce } from '@/hooks/use-debounce';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { PAGE_SIZE, SORT_OPTIONS } from '@/constants';
import { errorMessage } from '@/lib/errors';
import { formatNumber } from '@/lib/utils';
import type { ListingSort } from '@/types';

/**
 * Marketplace : recherche, filtres, tri et pagination réellement appliqués
 * côté données. L'état vit dans l'URL afin qu'une recherche soit partageable.
 */
export function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const filters = React.useMemo<FiltersValue>(
    () => ({
      search: searchParams.get('q') ?? '',
      category: searchParams.get('categorie') ?? '',
      city: searchParams.get('ville') ?? '',
      minPrice: searchParams.get('prix_min') ?? '',
      maxPrice: searchParams.get('prix_max') ?? '',
      availableOnly: searchParams.get('dispo') === '1',
    }),
    [searchParams],
  );

  const sort = (searchParams.get('tri') as ListingSort) || 'recent';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  // La saisie de recherche reste locale puis se propage à l'URL après un délai.
  const [searchDraft, setSearchDraft] = React.useState(filters.search);
  const debouncedSearch = useDebounce(searchDraft, 400);

  React.useEffect(() => {
    setSearchDraft(filters.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  React.useEffect(() => {
    if (debouncedSearch === filters.search) return;
    updateParams({ q: debouncedSearch || null, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  function updateParams(patch: Record<string, string | null>) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(patch).forEach(([key, value]) => {
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
        });
        return next;
      },
      { replace: true },
    );
  }

  const handleFilterChange = (patch: Partial<FiltersValue>) => {
    if ('search' in patch) {
      setSearchDraft(patch.search ?? '');
      return;
    }
    updateParams({
      categorie: patch.category ?? undefined,
      ville: patch.city ?? undefined,
      prix_min: patch.minPrice ?? undefined,
      prix_max: patch.maxPrice ?? undefined,
      dispo: 'availableOnly' in patch ? (patch.availableOnly ? '1' : null) : undefined,
      page: null,
    } as Record<string, string | null>);
  };

  const handleReset = () => {
    setSearchDraft('');
    setSearchParams({}, { replace: true });
  };

  const categoriesQuery = useCategories();
  const listingsQuery = useListings({
    search: filters.search || undefined,
    category: filters.category || undefined,
    city: filters.city || undefined,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    availableOnly: filters.availableOnly || undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const activeCategory = categoriesQuery.data?.find((category) => category.slug === filters.category);
  const title = activeCategory ? `${activeCategory.name} à louer` : 'Matériel événementiel';

  useDocumentTitle(
    title,
    activeCategory?.description ?? 'Parcourez le matériel événementiel disponible à la location au Sénégal.',
  );

  const activeFilterCount = [
    filters.category,
    filters.city,
    filters.minPrice,
    filters.maxPrice,
    filters.availableOnly ? '1' : '',
  ].filter(Boolean).length;

  const total = listingsQuery.data?.total ?? 0;

  return (
    <div className="container py-8 lg:py-12">
      <header className="mb-6">
        <h1 className="makalo-h2">{title}</h1>
        <p className="mt-2 text-doux">
          {listingsQuery.isPending
            ? 'Chargement des offres…'
            : `${formatNumber(total)} offre${total > 1 ? 's' : ''} disponible${total > 1 ? 's' : ''}${filters.city ? ` à ${filters.city}` : ' au Sénégal'}.`}
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Colonne de filtres (desktop) */}
        <aside className="hidden w-64 shrink-0 lg:block" aria-label="Filtres">
          <div className="sticky top-24 rounded-2xl border border-doux-200 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-nuit">Filtrer</h2>
            <ListingFiltersPanel
              idPrefix="desktop"
              value={{ ...filters, search: searchDraft }}
              categories={categoriesQuery.data ?? []}
              onChange={handleFilterChange}
              onReset={handleReset}
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Barre d'actions : filtres mobiles + tri */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Filtres
                  {activeFilterCount > 0 && (
                    <Badge variant="orange" className="ml-1">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent side="bottom" className="p-5">
                <DrawerTitle className="text-lg font-bold text-nuit">Filtrer les offres</DrawerTitle>
                <DrawerDescription className="sr-only">
                  Affinez les résultats par catégorie, ville, prix et disponibilité.
                </DrawerDescription>
                <div className="overflow-y-auto pb-2">
                  <ListingFiltersPanel
                    idPrefix="mobile"
                    value={{ ...filters, search: searchDraft }}
                    categories={categoriesQuery.data ?? []}
                    onChange={handleFilterChange}
                    onReset={handleReset}
                  />
                </div>
                <DrawerClose asChild>
                  <Button variant="accent" block>
                    Afficher {formatNumber(total)} offre{total > 1 ? 's' : ''}
                  </Button>
                </DrawerClose>
              </DrawerContent>
            </Drawer>

            <div className="ml-auto flex items-center gap-2">
              <Label htmlFor="sort" className="whitespace-nowrap text-sm text-doux">
                Trier par
              </Label>
              <Select value={sort} onValueChange={(next) => updateParams({ tri: next, page: null })}>
                <SelectTrigger id="sort" className="h-10 w-[11rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {listingsQuery.isPending && <ListingGridSkeleton count={PAGE_SIZE} />}

          {listingsQuery.isError && (
            <ErrorState message={errorMessage(listingsQuery.error)} onRetry={() => listingsQuery.refetch()} />
          )}

          {listingsQuery.data && listingsQuery.data.items.length === 0 && <NoResultsState onReset={handleReset} />}

          {listingsQuery.data && listingsQuery.data.items.length > 0 && (
            <>
              <div
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                aria-busy={listingsQuery.isFetching}
              >
                {listingsQuery.data.items.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>

              <Pagination
                className="mt-10"
                page={listingsQuery.data.page}
                totalPages={listingsQuery.data.totalPages}
                onPageChange={(next) => {
                  updateParams({ page: next === 1 ? null : String(next) });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
