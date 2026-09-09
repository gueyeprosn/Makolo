/**
 * Types metier MAKALO.
 * Ces types refletent exactement le schema SQL de scripts/sql/01_schema.sql.
 */

export type UserRole = 'client' | 'provider' | 'admin';

export type ListingStatus = 'draft' | 'pending' | 'published' | 'archived' | 'rejected';

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

/**
 * Chaîne d'argent, séparée de `BookingStatus` (chaîne d'engagement) — voir
 * docs/specs/PAYMENT-FLOW.md. `none` est la valeur de toute demande
 * aujourd'hui : le chantier n°2 n'est qu'une fondation, aucun compte
 * marchand Wave/Orange Money réel n'est branché, donc rien ne fait jamais
 * transitionner cette valeur en dehors d'un webhook réel.
 */
export type PaymentStatus = 'none' | 'pending' | 'paid' | 'failed' | 'refunded';

export type PaymentProvider = 'wave' | 'orange_money';

export type PriceUnit = 'jour' | 'evenement' | 'unite' | 'heure' | 'semaine';

export type NotificationType =
  | 'booking_request'
  | 'booking_accepted'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'listing_published'
  | 'listing_rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  city: string | null;
  bio: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Utilisateur authentifie = identite Supabase Auth + profil applicatif. */
export interface User {
  id: string;
  email: string;
  profile: Profile;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  icon: string | null;
  image_url: string | null;
  active: boolean;
  created_at: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface Listing {
  id: string;
  provider_id: string;
  category_id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  price_unit: PriceUnit;
  city: string;
  address: string | null;
  conditions: string | null;
  availability_status: boolean;
  quantity: number;
  cover_image: string | null;
  status: ListingStatus;
  moderation_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** Annonce enrichie des jointures utilisees par l'interface. */
export interface ListingWithRelations extends Listing {
  category: Pick<Category, 'id' | 'name' | 'slug' | 'icon'> | null;
  provider: Pick<Profile, 'id' | 'full_name' | 'city' | 'avatar_url' | 'phone' | 'bio'> | null;
  images: ListingImage[];
}

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
}

export interface FavoriteWithListing extends Favorite {
  listing: ListingWithRelations | null;
}

export interface BookingRequest {
  id: string;
  listing_id: string;
  client_id: string;
  provider_id: string;
  /**
   * Période complète pendant laquelle le matériel est chez le client (de la
   * livraison à la reprise), pas seulement la date de l'événement — voir
   * docs/specs/BOOKING-LIFECYCLE.md. Une location d'un seul jour a
   * `requested_from === requested_to`.
   */
  requested_from: string;
  requested_to: string;
  quantity: number;
  message: string | null;
  status: BookingStatus;
  /**
   * Champs en lecture seule pour le frontend : ils ne sont jamais écrits
   * par un client authentifié (RLS le refuse au niveau colonne, voir
   * scripts/sql/02_rls.sql), seulement par le service serveur qui traite
   * les webhooks Wave/Orange Money.
   */
  payment_status: PaymentStatus;
  payment_provider: PaymentProvider | null;
  deposit_amount: number | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingRequestWithRelations extends BookingRequest {
  listing: Pick<Listing, 'id' | 'title' | 'slug' | 'cover_image' | 'price' | 'price_unit' | 'city' | 'quantity'> | null;
  client: Pick<Profile, 'id' | 'full_name' | 'phone' | 'city' | 'avatar_url'> | null;
  provider: Pick<Profile, 'id' | 'full_name' | 'phone' | 'city' | 'avatar_url'> | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/* Filtres, tri et pagination de la marketplace                                */
/* -------------------------------------------------------------------------- */

export type ListingSort = 'recent' | 'price_asc' | 'price_desc';

export interface ListingFilters {
  search?: string;
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  availableOnly?: boolean;
  sort?: ListingSort;
  page?: number;
  pageSize?: number;
  /** Reserve au back-office : filtre par statut de moderation. */
  status?: ListingStatus | 'all';
  providerId?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* -------------------------------------------------------------------------- */
/* Disponibilite                                                               */
/* -------------------------------------------------------------------------- */

export type AvailabilityState = 'available' | 'partial' | 'unavailable' | 'disabled';

export interface AvailabilityResult {
  state: AvailabilityState;
  /** Quantite restante reellement reservable a cette date. */
  remaining: number;
  /** Quantite deja bloquee par des demandes acceptees. */
  booked: number;
  /** Quantite en cours de confirmation (demandes en attente). */
  pending: number;
  total: number;
  label: string;
}

/* -------------------------------------------------------------------------- */
/* Statistiques                                                                */
/* -------------------------------------------------------------------------- */

export interface ClientStats {
  pending: number;
  accepted: number;
  rejected: number;
  favorites: number;
}

export interface ProviderStats {
  publishedListings: number;
  pendingListings: number;
  totalRequests: number;
  pendingRequests: number;
  acceptedRequests: number;
}

export interface AdminStats {
  users: number;
  providers: number;
  clients: number;
  listings: number;
  pendingListings: number;
  requests: number;
  acceptedRequests: number;
  categories: number;
}
