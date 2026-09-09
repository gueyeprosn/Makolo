import type { BookingStatus, ListingStatus, PriceUnit, UserRole } from '@/types';

export const APP_NAME = 'MAKALO';
export const APP_TAGLINE = 'Louez • Célébrez • Simplement';
export const APP_DESCRIPTION =
  "Trouvez et réservez facilement du matériel événementiel auprès de prestataires au Sénégal : chaises, tables, tentes, sonorisation, éclairage et décoration.";

/** Villes couvertes au lancement. */
export const CITIES = [
  'Dakar',
  'Thiès',
  'Saint-Louis',
  'Touba',
  'Mbour',
  'Kaolack',
  'Ziguinchor',
  'Diourbel',
] as const;

export type City = (typeof CITIES)[number];

export const PRICE_UNITS: { value: PriceUnit; label: string; short: string }[] = [
  { value: 'jour', label: 'Par jour', short: '/ jour' },
  { value: 'evenement', label: 'Par événement', short: '/ événement' },
  { value: 'unite', label: "Par unité", short: '/ unité' },
  { value: 'heure', label: 'Par heure', short: '/ heure' },
  { value: 'semaine', label: 'Par semaine', short: '/ semaine' },
];

export const PRICE_UNIT_SHORT: Record<PriceUnit, string> = {
  jour: '/ jour',
  evenement: '/ événement',
  unite: '/ unité',
  heure: '/ heure',
  semaine: '/ semaine',
};

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  draft: 'Brouillon',
  pending: 'En attente de validation',
  published: 'Publiée',
  archived: 'Archivée',
  rejected: 'Refusée',
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  rejected: 'Refusée',
  cancelled: 'Annulée',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  client: 'Client',
  provider: 'Prestataire',
  admin: 'Administrateur',
};

/** Redirection post-connexion selon le rôle. */
export const ROLE_HOME: Record<UserRole, string> = {
  client: '/dashboard',
  provider: '/prestataire',
  admin: '/admin',
};

export const PAGE_SIZE = 12;

export const SORT_OPTIONS: { value: 'recent' | 'price_asc' | 'price_desc'; label: string }[] = [
  { value: 'recent', label: 'Plus récent' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
];

/** Contraintes d'upload appliquées côté client ET côté Storage (policies). */
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGES_PER_LISTING = 8;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const STORAGE_BUCKET = 'listing-images';
