import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CITIES } from '@/constants';
import type { Category } from '@/types';

export interface FiltersValue {
  search: string;
  category: string;
  city: string;
  minPrice: string;
  maxPrice: string;
  availableOnly: boolean;
}

interface ListingFiltersProps {
  value: FiltersValue;
  categories: Category[];
  onChange: (patch: Partial<FiltersValue>) => void;
  onReset: () => void;
  /** Identifiant préfixant les champs (évite les doublons entre desktop et drawer). */
  idPrefix: string;
}

const ALL = '__all__';

/** Panneau de filtres partagé entre la colonne desktop et le tiroir mobile. */
export function ListingFiltersPanel({ value, categories, onChange, onReset, idPrefix }: ListingFiltersProps) {
  const hasFilters =
    Boolean(value.search || value.category || value.city || value.minPrice || value.maxPrice) || value.availableOnly;

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-search`}>Recherche</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-doux" aria-hidden="true" />
          <Input
            id={`${idPrefix}-search`}
            type="search"
            value={value.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Rechercher un matériel..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-category`}>Catégorie</Label>
        <Select
          value={value.category || ALL}
          onValueChange={(next) => onChange({ category: next === ALL ? '' : next })}
        >
          <SelectTrigger id={`${idPrefix}-category`}>
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes les catégories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.slug}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-city`}>Localité</Label>
        <Select value={value.city || ALL} onValueChange={(next) => onChange({ city: next === ALL ? '' : next })}>
          <SelectTrigger id={`${idPrefix}-city`}>
            <SelectValue placeholder="Toutes les villes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes les villes</SelectItem>
            {CITIES.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-nuit">Prix (FCFA)</legend>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label htmlFor={`${idPrefix}-min`} className="sr-only">
              Prix minimum
            </label>
            <Input
              id={`${idPrefix}-min`}
              type="number"
              inputMode="numeric"
              min={0}
              value={value.minPrice}
              onChange={(event) => onChange({ minPrice: event.target.value })}
              placeholder="Min"
            />
          </div>
          <span className="text-doux" aria-hidden="true">
            —
          </span>
          <div className="flex-1">
            <label htmlFor={`${idPrefix}-max`} className="sr-only">
              Prix maximum
            </label>
            <Input
              id={`${idPrefix}-max`}
              type="number"
              inputMode="numeric"
              min={0}
              value={value.maxPrice}
              onChange={(event) => onChange({ maxPrice: event.target.value })}
              placeholder="Max"
            />
          </div>
        </div>
      </fieldset>

      <div className="flex items-center gap-2.5">
        <Checkbox
          id={`${idPrefix}-available`}
          checked={value.availableOnly}
          onCheckedChange={(checked) => onChange({ availableOnly: checked === true })}
        />
        <Label htmlFor={`${idPrefix}-available`} className="cursor-pointer">
          Uniquement les offres disponibles
        </Label>
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="w-full">
          <X className="size-4" aria-hidden="true" />
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );
}
