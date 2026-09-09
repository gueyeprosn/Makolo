import type { Listing, Profile, BookingRequest, UserRole } from '@/types';

/**
 * Règles d'autorisation applicatives.
 *
 * ATTENTION : ces règles servent uniquement à afficher/masquer l'interface et à
 * bloquer les actions évidentes côté client. La sécurité réelle est appliquée
 * par les policies RLS de Supabase (scripts/sql/02_rls.sql). Toute règle
 * définie ici possède une policy équivalente côté base de données.
 */

export function hasRole(profile: Profile | null | undefined, ...roles: UserRole[]): boolean {
  if (!profile || !profile.active) return false;
  return roles.includes(profile.role);
}

export const isAdmin = (profile: Profile | null | undefined) => hasRole(profile, 'admin');
export const isProvider = (profile: Profile | null | undefined) => hasRole(profile, 'provider');
export const isClient = (profile: Profile | null | undefined) => hasRole(profile, 'client');

/** Un prestataire ne gère que ses propres annonces ; l'admin gère tout. */
export function canEditListing(profile: Profile | null | undefined, listing: Pick<Listing, 'provider_id'> | null): boolean {
  if (!profile || !listing) return false;
  if (isAdmin(profile)) return true;
  return isProvider(profile) && listing.provider_id === profile.id;
}

export function canDeleteListing(profile: Profile | null | undefined, listing: Pick<Listing, 'provider_id'> | null): boolean {
  return canEditListing(profile, listing);
}

/** Seul un client connecté peut demander une réservation, et jamais sur sa propre annonce. */
export function canRequestBooking(
  profile: Profile | null | undefined,
  listing: Pick<Listing, 'provider_id' | 'status' | 'availability_status'> | null,
): boolean {
  if (!profile || !listing) return false;
  if (listing.status !== 'published' || !listing.availability_status) return false;
  if (listing.provider_id === profile.id) return false;
  return hasRole(profile, 'client', 'admin');
}

/** Le prestataire concerné (ou l'admin) répond à une demande encore en attente. */
export function canAnswerBooking(
  profile: Profile | null | undefined,
  booking: Pick<BookingRequest, 'provider_id' | 'status'> | null,
): boolean {
  if (!profile || !booking) return false;
  if (booking.status !== 'pending') return false;
  if (isAdmin(profile)) return true;
  return isProvider(profile) && booking.provider_id === profile.id;
}

/** Le client annule sa propre demande tant qu'elle n'est pas traitée. */
export function canCancelBooking(
  profile: Profile | null | undefined,
  booking: Pick<BookingRequest, 'client_id' | 'status'> | null,
): boolean {
  if (!profile || !booking) return false;
  if (booking.status !== 'pending') return false;
  return isAdmin(profile) || booking.client_id === profile.id;
}

export function canModerate(profile: Profile | null | undefined): boolean {
  return isAdmin(profile);
}

export function canFavorite(profile: Profile | null | undefined): boolean {
  return Boolean(profile?.active);
}

/** Le téléphone d'un prestataire n'est visible que par les comptes connectés. */
export function canSeeProviderPhone(profile: Profile | null | undefined): boolean {
  return Boolean(profile?.active);
}
