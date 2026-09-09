import type {
  AdminStats,
  AvailabilityResult,
  BookingRequestWithRelations,
  BookingStatus,
  Category,
  ClientStats,
  FavoriteWithListing,
  Listing,
  ListingFilters,
  ListingImage,
  ListingStatus,
  ListingWithRelations,
  Notification,
  Paginated,
  Profile,
  ProviderStats,
  User,
  UserRole,
} from '@/types';
import type { CategoryValues, ListingValues, ProfileValues, RegisterValues } from '@/lib/validations';

export interface SignUpResult {
  user: User | null;
  /** `true` lorsque Supabase exige une confirmation d'e-mail avant connexion. */
  needsEmailConfirmation: boolean;
}

export interface AdminUserFilters {
  search?: string;
  role?: UserRole | 'all';
  active?: 'all' | 'active' | 'inactive';
  page?: number;
  pageSize?: number;
}

export interface CreateBookingInput {
  listing_id: string;
  requested_from: string;
  requested_to: string;
  quantity: number;
  message?: string;
}

/**
 * Contrat unique de la couche données.
 *
 * Deux implémentations respectent ce contrat :
 *  - `supabase-backend.ts` : Supabase Auth + Postgres + Storage (production) ;
 *  - `demo-backend.ts`     : jeu de données fictif en mémoire (démonstration).
 *
 * L'interface applicative ne connaît que ce contrat, jamais l'implémentation.
 */
export interface MakaloBackend {
  readonly mode: 'supabase' | 'demo';

  /* Auth ------------------------------------------------------------------ */
  getCurrentUser(): Promise<User | null>;
  onAuthStateChange(callback: (user: User | null) => void): () => void;
  signIn(email: string, password: string): Promise<User>;
  signUp(values: RegisterValues): Promise<SignUpResult>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  updateProfile(userId: string, values: ProfileValues): Promise<Profile>;

  /* Catégories ------------------------------------------------------------ */
  listCategories(options?: { includeInactive?: boolean }): Promise<Category[]>;
  createCategory(values: CategoryValues): Promise<Category>;
  updateCategory(id: string, values: CategoryValues): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  /* Annonces -------------------------------------------------------------- */
  listListings(filters: ListingFilters): Promise<Paginated<ListingWithRelations>>;
  getListingBySlug(slug: string): Promise<ListingWithRelations | null>;
  getListingById(id: string): Promise<ListingWithRelations | null>;
  createListing(values: ListingValues, submit: boolean): Promise<Listing>;
  updateListing(id: string, values: ListingValues): Promise<Listing>;
  setListingStatus(id: string, status: ListingStatus, moderationReason?: string | null): Promise<Listing>;
  deleteListing(id: string): Promise<void>;

  /* Prestataires ---------------------------------------------------------- */
  getProviderProfile(id: string): Promise<Profile | null>;
  listProviderPublicListings(providerId: string): Promise<ListingWithRelations[]>;

  /* Images ---------------------------------------------------------------- */
  listListingImages(listingId: string): Promise<ListingImage[]>;
  uploadListingImage(listingId: string, file: File, sortOrder: number): Promise<ListingImage>;
  deleteListingImage(image: ListingImage): Promise<void>;
  reorderListingImages(listingId: string, orderedIds: string[]): Promise<ListingImage[]>;

  /* Favoris --------------------------------------------------------------- */
  listFavorites(userId: string): Promise<FavoriteWithListing[]>;
  listFavoriteListingIds(userId: string): Promise<string[]>;
  addFavorite(userId: string, listingId: string): Promise<void>;
  removeFavorite(userId: string, listingId: string): Promise<void>;

  /* Réservations ---------------------------------------------------------- */
  getAvailability(listingId: string, from: string, to: string): Promise<AvailabilityResult>;
  createBooking(input: CreateBookingInput): Promise<void>;
  listClientBookings(clientId: string): Promise<BookingRequestWithRelations[]>;
  listProviderBookings(providerId: string): Promise<BookingRequestWithRelations[]>;
  listAllBookings(): Promise<BookingRequestWithRelations[]>;
  updateBookingStatus(id: string, status: BookingStatus): Promise<void>;

  /* Notifications --------------------------------------------------------- */
  listNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  /* Statistiques ---------------------------------------------------------- */
  getClientStats(userId: string): Promise<ClientStats>;
  getProviderStats(providerId: string): Promise<ProviderStats>;
  getAdminStats(): Promise<AdminStats>;

  /* Administration -------------------------------------------------------- */
  adminListUsers(filters: AdminUserFilters): Promise<Paginated<Profile>>;
  adminUpdateUser(id: string, patch: { role?: UserRole; active?: boolean }): Promise<Profile>;
}
