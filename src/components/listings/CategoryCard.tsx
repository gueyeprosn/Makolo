import { Link } from 'react-router-dom';
import {
  Armchair,
  ArrowRight,
  Lightbulb,
  PackageOpen,
  Speaker,
  Sparkles,
  Table2,
  Tent,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

/** Correspondance slug -> icône Lucide (une seule bibliothèque d'icônes). */
const ICONS: Record<string, LucideIcon> = {
  chaises: Armchair,
  tables: Table2,
  tentes: Tent,
  sono: Speaker,
  eclairage: Lightbulb,
  decoration: Sparkles,
  accessoires: PackageOpen,
};

export function categoryIcon(slug?: string | null): LucideIcon {
  if (!slug) return PackageOpen;
  return ICONS[slug] ?? PackageOpen;
}

interface CategoryCardProps {
  category: Category;
  className?: string;
}

export function CategoryCard({ category, className }: CategoryCardProps) {
  const Icon = categoryIcon(category.slug);

  return (
    <Link
      to={`/materiel?categorie=${category.slug}`}
      className={cn(
        'group flex flex-col justify-between gap-6 rounded-2xl border border-doux-200 bg-white p-5 shadow-card transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-orange',
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-ivoire text-nuit transition-colors group-hover:bg-orange group-hover:text-white">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <span className="block">
        <span className="block text-base font-semibold text-nuit">{category.name}</span>
        {category.description && <span className="mt-1 block text-sm text-doux">{category.description}</span>}
      </span>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600">
        Voir les offres
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
