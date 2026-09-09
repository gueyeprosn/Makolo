import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, MessageSquare, Package, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ImageWithFallback } from '@/components/common/ImageWithFallback';
import { BOOKING_STATUS_LABEL } from '@/constants';
import { formatDate, formatNumber, formatRelative } from '@/lib/utils';
import type { BookingRequestWithRelations, BookingStatus } from '@/types';

const STATUS_VARIANT: Record<BookingStatus, 'warning' | 'success' | 'danger' | 'neutral'> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

interface BookingCardProps {
  booking: BookingRequestWithRelations;
  /** `client` affiche le prestataire ; `provider` affiche le demandeur. */
  perspective: 'client' | 'provider';
  actions?: React.ReactNode;
}

export function BookingCard({ booking, perspective, actions }: BookingCardProps) {
  const counterpart = perspective === 'client' ? booking.provider : booking.client;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-doux-200 bg-white p-4 shadow-card sm:flex-row">
      <Link
        to={booking.listing ? `/materiel/${booking.listing.slug}` : '#'}
        className="shrink-0 overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-orange sm:w-32"
        aria-label={booking.listing?.title ?? 'Annonce'}
      >
        <ImageWithFallback
          src={booking.listing?.cover_image}
          alt=""
          className="h-32 w-full sm:h-24 sm:w-32"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-nuit">
            {booking.listing ? (
              <Link to={`/materiel/${booking.listing.slug}`} className="hover:text-orange-600">
                {booking.listing.title}
              </Link>
            ) : (
              'Annonce supprimée'
            )}
          </h3>
          <Badge variant={STATUS_VARIANT[booking.status]}>{BOOKING_STATUS_LABEL[booking.status]}</Badge>
        </div>

        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-doux">
          <div className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">Date souhaitée</dt>
            <dd>{formatDate(booking.requested_date)}</dd>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Package className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">Quantité</dt>
            <dd>{formatNumber(booking.quantity)} unité(s)</dd>
          </div>
          {booking.listing?.city && (
            <div className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden="true" />
              <dt className="sr-only">Ville</dt>
              <dd>{booking.listing.city}</dd>
            </div>
          )}
          {counterpart && (
            <div className="inline-flex items-center gap-1.5">
              <User className="size-3.5" aria-hidden="true" />
              <dt className="sr-only">{perspective === 'client' ? 'Prestataire' : 'Client'}</dt>
              <dd>{counterpart.full_name}</dd>
            </div>
          )}
        </dl>

        {booking.message && (
          <p className="mt-2.5 flex gap-2 rounded-xl bg-ivoire px-3 py-2 text-sm text-doux-600">
            <MessageSquare className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>{booking.message}</span>
          </p>
        )}

        {/* Le téléphone n'est révélé qu'une fois la demande acceptée. */}
        {booking.status === 'accepted' && counterpart?.phone && (
          <p className="mt-2.5 text-sm text-nuit">
            <span className="font-semibold">Contact {perspective === 'client' ? 'prestataire' : 'client'} :</span>{' '}
            <a href={`tel:${counterpart.phone.replace(/\s/g, '')}`} className="font-semibold text-orange-600 hover:underline">
              {counterpart.phone}
            </a>
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-doux-400">Demande envoyée {formatRelative(booking.created_at)}</p>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </article>
  );
}
