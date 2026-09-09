import { Link } from 'react-router-dom';
import { MapPin, Package, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImageWithFallback } from '@/components/common/ImageWithFallback';
import { Price } from '@/components/common/Price';
import { FavoriteButton } from './FavoriteButton';
import { placeholderFor } from '@/assets/placeholders';
import { LISTING_STATUS_LABEL } from '@/constants';
import { cn, formatNumber, truncate } from '@/lib/utils';
import type { ListingWithRelations } from '@/types';

interface ListingCardProps {
  listing: ListingWithRelations;
  /** Masque le bouton favori (espace prestataire, back-office). */
  hideFavorite?: boolean;
  /** Affiche le statut de modération (espace prestataire, back-office). */
  showStatus?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

/** Carte d'annonce réutilisée sur l'accueil, la marketplace et les tableaux de bord. */
export function ListingCard({ listing, hideFavorite, showStatus, footer, className }: ListingCardProps) {
  const unavailable = !listing.availability_status;
  const href = `/materiel/${listing.slug}`;

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-doux-200 bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover',
        className,
      )}
    >
      <div className="relative">
        <Link to={href} tabIndex={-1} aria-hidden="true" className="block">
          <ImageWithFallback
            src={listing.cover_image}
            fallback={placeholderFor(listing.category?.slug)}
            alt=""
            className={cn(
              'aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-[1.02]',
              unavailable && 'opacity-60 grayscale',
            )}
          />
        </Link>

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {listing.category && (
            <Badge variant="nuit" className="bg-white/95 backdrop-blur">
              {listing.category.name}
            </Badge>
          )}
          {showStatus && (
            <Badge
              variant={
                listing.status === 'published'
                  ? 'success'
                  : listing.status === 'pending'
                    ? 'warning'
                    : listing.status === 'rejected'
                      ? 'danger'
                      : 'neutral'
              }
              className="backdrop-blur"
            >
              {LISTING_STATUS_LABEL[listing.status]}
            </Badge>
          )}
        </div>

        {!hideFavorite && (
          <FavoriteButton listingId={listing.id} listingTitle={listing.title} className="absolute right-3 top-3" />
        )}

        <div className="absolute bottom-3 left-3">
          {unavailable ? (
            <Badge variant="danger" className="bg-white/95 backdrop-blur">
              Momentanément indisponible
            </Badge>
          ) : (
            <Badge variant="success" className="bg-white/95 backdrop-blur">
              Disponible
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="makalo-h3 leading-snug">
          <Link
            to={href}
            className="rounded transition-colors hover:text-orange-600 focus-visible:ring-2 focus-visible:ring-orange"
          >
            {truncate(listing.title, 62)}
          </Link>
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-doux">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" />
            {listing.city}
          </span>
          <span className="inline-flex items-center gap-1">
            <Package className="size-3.5" aria-hidden="true" />
            {formatNumber(listing.quantity)} disponible{listing.quantity > 1 ? 's' : ''}
          </span>
        </div>

        {listing.provider && (
          <Link
            to={`/prestataire/${listing.provider.id}`}
            className="mt-2 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-doux-600 transition-colors hover:text-nuit"
          >
            <Store className="size-3.5" aria-hidden="true" />
            {listing.provider.full_name}
          </Link>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <Price amount={listing.price} unit={listing.price_unit} />
          {footer ?? (
            <Button asChild size="sm" variant="outline">
              <Link to={href}>Voir les détails</Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
