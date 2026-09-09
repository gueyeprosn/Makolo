import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { ImageWithFallback } from '@/components/common/ImageWithFallback';
import { Price } from '@/components/common/Price';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { AvailabilityBadge } from '@/components/listings/AvailabilityBadge';
import { BookingDialog } from '@/components/booking/BookingDialog';
import { placeholderFor } from '@/assets/placeholders';
import { useListingBySlug } from '@/hooks/use-listings';
import { useAvailability } from '@/hooks/use-bookings';
import { useAuth } from '@/hooks/use-auth';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { canRequestBooking, canSeeProviderPhone } from '@/lib/permissions';
import { errorMessage } from '@/lib/errors';
import { formatNumber, truncate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function ListingDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const listingQuery = useListingBySlug(slug);
  const listing = listingQuery.data;

  const [selectedDate, setSelectedDate] = React.useState('');
  const [bookingOpen, setBookingOpen] = React.useState(false);
  const [activeImage, setActiveImage] = React.useState(0);

  // Vérification rapide d'un jour unique avant d'ouvrir la modale, où la
  // période complète (livraison → reprise) est demandée si nécessaire.
  const availability = useAvailability(listing?.id, selectedDate || undefined, selectedDate || undefined);

  useDocumentTitle(
    listing?.title,
    listing ? truncate(listing.description, 155) : undefined,
  );

  const gallery = React.useMemo(() => {
    if (!listing) return [];
    const urls = listing.images.map((image) => image.image_url);
    if (listing.cover_image && !urls.includes(listing.cover_image)) urls.unshift(listing.cover_image);
    return urls.length > 0 ? urls : [placeholderFor(listing.category?.slug)];
  }, [listing]);

  if (listingQuery.isPending) return <DetailSkeleton />;

  if (listingQuery.isError) {
    return (
      <div className="container py-16">
        <ErrorState message={errorMessage(listingQuery.error)} onRetry={() => listingQuery.refetch()} />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={Package}
          title="Offre introuvable"
          description="Cette offre n'existe pas, n'est plus publiée ou a été retirée par son prestataire."
          action={
            <Button asChild>
              <Link to="/materiel">Voir tout le matériel</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const canBook = canRequestBooking(profile, listing);
  const isOwner = profile?.id === listing.provider_id;

  const handleBookingClick = () => {
    if (!user) {
      toast.info('Connectez-vous pour envoyer une demande de réservation.');
      navigate('/connexion', { state: { from: `/materiel/${listing.slug}` } });
      return;
    }
    if (isOwner) {
      toast.info('Cette annonce vous appartient.', 'Vous ne pouvez pas réserver votre propre matériel.');
      return;
    }
    if (!canBook) {
      toast.error('Réservation indisponible', "Cette offre n'accepte pas de demande pour le moment.");
      return;
    }
    setBookingOpen(true);
  };

  return (
    <div className="container py-6 lg:py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/materiel">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Retour au matériel
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="min-w-0">
          {/* Galerie */}
          <div className="relative overflow-hidden rounded-2xl border border-doux-200 bg-white shadow-card">
            <ImageWithFallback
              src={gallery[activeImage]}
              fallback={placeholderFor(listing.category?.slug)}
              alt={`${listing.title} — photo ${activeImage + 1} sur ${gallery.length}`}
              className="aspect-[4/3] w-full sm:aspect-[16/10]"
            />

            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImage((current) => (current - 1 + gallery.length) % gallery.length)}
                  className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-nuit shadow-sm transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-orange"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImage((current) => (current + 1) % gallery.length)}
                  className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-nuit shadow-sm transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-orange"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              </>
            )}

            <FavoriteButton listingId={listing.id} listingTitle={listing.title} className="absolute right-3 top-3 size-10" />
          </div>

          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Photos de l'offre">
              {gallery.map((url, index) => (
                <button
                  key={url + index}
                  type="button"
                  role="tab"
                  aria-selected={index === activeImage}
                  aria-label={`Afficher la photo ${index + 1}`}
                  onClick={() => setActiveImage(index)}
                  className={`shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                    index === activeImage ? 'border-orange' : 'border-transparent hover:border-doux-300'
                  }`}
                >
                  <ImageWithFallback src={url} alt="" className="size-16 sm:size-20" />
                </button>
              ))}
            </div>
          )}

          {/* Titre et métadonnées */}
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              {listing.category && (
                <Link to={`/materiel?categorie=${listing.category.slug}`}>
                  <Badge variant="nuit">{listing.category.name}</Badge>
                </Link>
              )}
              {listing.availability_status ? (
                <Badge variant="success">Disponible à la location</Badge>
              ) : (
                <Badge variant="danger">Momentanément indisponible</Badge>
              )}
            </div>

            <h1 className="makalo-h2 mt-3">{listing.title}</h1>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-doux">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" />
                {listing.city}
                {listing.address ? ` — ${listing.address}` : ''}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Package className="size-4" aria-hidden="true" />
                {formatNumber(listing.quantity)} unité(s) en stock
              </span>
            </div>
          </div>

          <section className="mt-8" aria-labelledby="description-title">
            <h2 id="description-title" className="makalo-h3">
              Description
            </h2>
            <p className="mt-2.5 whitespace-pre-line leading-relaxed text-doux-600">{listing.description}</p>
          </section>

          {listing.conditions && (
            <section className="mt-8" aria-labelledby="conditions-title">
              <h2 id="conditions-title" className="makalo-h3">
                Conditions de location
              </h2>
              <p className="mt-2.5 flex gap-2.5 rounded-xl bg-ivoire p-4 text-sm leading-relaxed text-doux-600">
                <Info className="mt-0.5 size-4 shrink-0 text-nuit" aria-hidden="true" />
                <span className="whitespace-pre-line">{listing.conditions}</span>
              </p>
            </section>
          )}

          {/* Prestataire */}
          {listing.provider && (
            <section className="mt-8" aria-labelledby="prestataire-title">
              <h2 id="prestataire-title" className="makalo-h3">
                Le prestataire
              </h2>
              <Card className="mt-3">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar name={listing.provider.full_name} src={listing.provider.avatar_url} className="size-12" />
                    <div className="min-w-0">
                      <p className="font-semibold text-nuit">{listing.provider.full_name}</p>
                      {listing.provider.city && (
                        <p className="text-sm text-doux">
                          <MapPin className="mr-1 inline size-3.5" aria-hidden="true" />
                          {listing.provider.city}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button asChild variant="outline">
                    <Link to={`/prestataire/${listing.provider.id}`}>
                      <Store className="size-4" aria-hidden="true" />
                      Voir le profil
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              {listing.provider.bio && <p className="mt-3 text-sm leading-relaxed text-doux">{listing.provider.bio}</p>}
            </section>
          )}
        </div>

        {/* ------------------------------------------------ Panneau réservation */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <Card>
            <CardContent className="p-5 sm:p-6">
              <Price amount={listing.price} unit={listing.price_unit} size="lg" />

              <div className="mt-5 space-y-2">
                <Label htmlFor="availability-date">Vérifier la disponibilité</Label>
                <DatePicker
                  id="availability-date"
                  value={selectedDate}
                  onChange={setSelectedDate}
                  placeholder="Choisir la date de l'événement"
                />
              </div>

              <div className="mt-3 min-h-[3.25rem]" aria-live="polite">
                {!selectedDate && (
                  <p className="flex items-start gap-2 rounded-xl bg-ivoire px-3.5 py-3 text-sm text-doux">
                    <CalendarCheck className="mt-0.5 size-4 shrink-0 text-nuit" aria-hidden="true" />
                    Sélectionnez une date pour connaître la disponibilité réelle de ce matériel.
                  </p>
                )}

                {selectedDate && availability.isPending && (
                  <p className="rounded-xl bg-ivoire px-3.5 py-3 text-sm text-doux">Vérification en cours…</p>
                )}

                {selectedDate && availability.isError && (
                  <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-destructive">
                    La disponibilité n'a pas pu être vérifiée. Veuillez réessayer.
                  </p>
                )}

                {selectedDate && availability.data && (
                  <div className="rounded-xl bg-ivoire px-3.5 py-3">
                    <AvailabilityBadge state={availability.data.state} label={availability.data.label} />
                    <p className="mt-2 text-sm text-doux">
                      {availability.data.state === 'unavailable' || availability.data.state === 'disabled'
                        ? "Aucune unité n'est réservable à cette date."
                        : `${formatNumber(availability.data.remaining)} unité(s) réservable(s)${
                            availability.data.pending > 0
                              ? ` — ${formatNumber(availability.data.pending)} en cours de confirmation`
                              : ''
                          }.`}
                    </p>
                  </div>
                )}
              </div>

              <Button
                variant="accent"
                size="lg"
                block
                className="mt-4"
                onClick={handleBookingClick}
                disabled={
                  !listing.availability_status ||
                  listing.status !== 'published' ||
                  availability.data?.state === 'unavailable'
                }
              >
                Demander une réservation
              </Button>

              {isOwner && (
                <p className="mt-2.5 text-center text-xs text-doux">
                  Cette annonce vous appartient : vous ne pouvez pas la réserver.
                </p>
              )}

              <FavoriteButton
                listingId={listing.id}
                listingTitle={listing.title}
                variant="inline"
                className="mt-2.5 w-full"
              />

              {/* Signal de confiance factuel : aucune certification inventée. */}
              <ul className="mt-5 space-y-2.5 border-t border-doux-200 pt-5 text-sm text-doux">
                <li className="flex items-start gap-2.5">
                  <CalendarCheck className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" />
                  Disponibilité calculée à partir des demandes déjà acceptées.
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" />
                  Votre demande est suivie : vous êtes notifié de la réponse du prestataire.
                </li>
                {listing.provider?.phone && canSeeProviderPhone(profile) && (
                  <li className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" />
                    <span>
                      Contact prestataire :{' '}
                      <a
                        href={`tel:${listing.provider.phone.replace(/\s/g, '')}`}
                        className="font-semibold text-nuit hover:underline"
                      >
                        {listing.provider.phone}
                      </a>
                    </span>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>

      <BookingDialog listing={listing} open={bookingOpen} onOpenChange={setBookingOpen} initialDate={selectedDate} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="container py-10">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
          <Skeleton className="mt-6 h-8 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <Skeleton className="mt-8 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
