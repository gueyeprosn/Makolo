import { PAGE_SIZE } from '@/constants';
import { AppError } from '@/lib/errors';
import { fromISODate, localId, normalize, slugify, todayISO, toISODate } from '@/lib/utils';
import type {
  AdminStats,
  AvailabilityResult,
  BookingRequest,
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
  NotificationType,
  Paginated,
  Profile,
  ProviderStats,
  User,
  UserRole,
} from '@/types';
import type { CategoryValues, ListingValues, ProfileValues, RegisterValues } from '@/lib/validations';
import type { AdminUserFilters, CreateBookingInput, MakaloBackend, SignUpResult } from './backend';
import { DEMO_PASSWORD } from './demo/data';
import { getState, mutate } from './demo/store';
import { placeholderFor } from '@/assets/placeholders';

/**
 * Backend de DÉMONSTRATION.
 *
 * Il reproduit fidèlement le comportement du backend Supabase (règles d'accès,
 * transitions de statut, création automatique des notifications) afin que
 * l'interface soit réellement fonctionnelle sans base de données. Il n'est
 * jamais utilisé lorsque VITE_SUPABASE_URL est renseigné.
 */

const listeners = new Set<(user: User | null) => void>();

/** Latence simulée : rend les états de chargement observables comme en réel. */
const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

function findProfile(id: string | null | undefined): Profile | null {
  if (!id) return null;
  return getState().profiles.find((p) => p.id === id) ?? null;
}

function toUser(profile: Profile | null): User | null {
  if (!profile) return null;
  return { id: profile.id, email: profile.email, profile };
}

function currentProfile(): Profile | null {
  return findProfile(getState().currentUserId);
}

function requireProfile(): Profile {
  const profile = currentProfile();
  if (!profile) throw new AppError('Vous devez être connecté pour effectuer cette action.', 'unauthenticated');
  if (!profile.active) throw new AppError('Votre compte est désactivé. Contactez le support MAKALO.', 'inactive');
  return profile;
}

function notify(userId: string, type: NotificationType, title: string, message: string, link: string | null): void {
  mutate((draft) => {
    draft.notifications.unshift({
      id: localId(),
      user_id: userId,
      type,
      title,
      message,
      link,
      read: false,
      created_at: new Date().toISOString(),
    });
  });
}

function categoryOf(listing: Listing): Category | undefined {
  return getState().categories.find((c) => c.id === listing.category_id);
}

function hydrateListing(listing: Listing): ListingWithRelations {
  const category = categoryOf(listing);
  const provider = findProfile(listing.provider_id);
  return {
    ...listing,
    category: category ? { id: category.id, name: category.name, slug: category.slug, icon: category.icon } : null,
    provider: provider
      ? {
          id: provider.id,
          full_name: provider.full_name,
          city: provider.city,
          avatar_url: provider.avatar_url,
          phone: provider.phone,
          bio: provider.bio,
        }
      : null,
    images: getState()
      .listingImages.filter((img) => img.listing_id === listing.id)
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}

function emitAuth(): void {
  const user = toUser(currentProfile());
  listeners.forEach((listener) => listener(user));
}

/**
 * Vrai si deux périodes [aFrom, aTo] et [bFrom, bTo] (dates ISO) se chevauchent.
 * Exportée pour test unitaire direct — miroir de l'opérateur `&&` de
 * `daterange(...)` utilisé par la contrainte d'exclusion GiST côté SQL.
 */
export function rangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return aFrom <= bTo && aTo >= bFrom;
}

/** Toutes les dates ISO (YYYY-MM-DD) d'une période, bornes incluses. */
export function eachDateInRange(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = fromISODate(from);
  const end = fromISODate(to);
  while (cursor <= end) {
    days.push(toISODate(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
  return days;
}

/**
 * Quantités déjà engagées pour une annonce sur une période, jour par jour,
 * en ne retenant que le pire jour — miroir exact de `check_booking_capacity()`
 * et `listing_availability()` côté SQL (scripts/sql/01_schema.sql). Les deux
 * doivent toujours s'accorder : voir docs/specs/BOOKING-LIFECYCLE.md.
 *
 * Deux réservations acceptées sur des sous-périodes disjointes ne doivent pas
 * se cumuler à tort pour une période qui les couvre sans les chevaucher
 * elles-mêmes (ex. 1-5 et 10-15 face à une demande sur 1-15).
 */
function bookedQuantities(listingId: string, from: string, to: string, excludeBookingId?: string) {
  const candidates = getState().bookings.filter((b) => b.listing_id === listingId && b.id !== excludeBookingId);
  let worstAccepted = 0;
  let worstPending = 0;
  for (const day of eachDateInRange(from, to)) {
    let dayAccepted = 0;
    let dayPending = 0;
    for (const b of candidates) {
      if (!rangesOverlap(b.requested_from, b.requested_to, day, day)) continue;
      if (b.status === 'accepted') dayAccepted += b.quantity;
      else if (b.status === 'pending') dayPending += b.quantity;
    }
    worstAccepted = Math.max(worstAccepted, dayAccepted);
    worstPending = Math.max(worstPending, dayPending);
  }
  return { accepted: worstAccepted, pending: worstPending };
}

export const demoBackend: MakaloBackend = {
  mode: 'demo',

  /* Auth ------------------------------------------------------------------ */

  async getCurrentUser() {
    await delay(80);
    return toUser(currentProfile());
  },

  onAuthStateChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  async signIn(email, password) {
    await delay();
    const normalizedEmail = email.trim().toLowerCase();
    const profile = getState().profiles.find((p) => p.email.toLowerCase() === normalizedEmail);
    const expected = getState().credentials[normalizedEmail] ?? DEMO_PASSWORD;
    if (!profile || password !== expected) {
      throw new AppError('E-mail ou mot de passe incorrect.', 'invalid_credentials');
    }
    if (!profile.active) {
      throw new AppError('Votre compte est désactivé. Contactez le support MAKALO.', 'inactive');
    }
    mutate((draft) => {
      draft.currentUserId = profile.id;
    });
    emitAuth();
    return toUser(profile) as User;
  },

  async signUp(values: RegisterValues) {
    await delay(320);
    const email = values.email.trim().toLowerCase();
    if (getState().profiles.some((p) => p.email.toLowerCase() === email)) {
      throw new AppError('Un compte existe déjà avec cette adresse e-mail.', 'user_already_exists');
    }
    const profile: Profile = {
      id: localId(),
      email,
      full_name: values.full_name.trim(),
      phone: values.phone?.trim() || null,
      avatar_url: null,
      role: values.role,
      city: values.city,
      bio: null,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mutate((draft) => {
      draft.profiles.push(profile);
      draft.credentials[email] = values.password;
      draft.currentUserId = profile.id;
    });
    emitAuth();
    return { user: toUser(profile), needsEmailConfirmation: false } satisfies SignUpResult;
  },

  async signOut() {
    await delay(120);
    mutate((draft) => {
      draft.currentUserId = null;
    });
    emitAuth();
  },

  async requestPasswordReset(email: string) {
    await delay(300);
    if (!email.includes('@')) throw new AppError('Adresse e-mail invalide.', 'invalid_email');
    // En mode démonstration aucun e-mail n'est envoyé : la réponse reste
    // volontairement identique que le compte existe ou non (anti-énumération).
  },

  async updatePassword(password: string) {
    await delay(260);
    const profile = requireProfile();
    mutate((draft) => {
      draft.credentials[profile.email.toLowerCase()] = password;
    });
  },

  async updateProfile(userId: string, values: ProfileValues) {
    await delay(260);
    const me = requireProfile();
    if (me.id !== userId && me.role !== 'admin') {
      throw new AppError("Vous ne pouvez modifier que votre propre profil.", 'forbidden');
    }
    let updated: Profile | null = null;
    mutate((draft) => {
      const target = draft.profiles.find((p) => p.id === userId);
      if (!target) return;
      target.full_name = values.full_name.trim();
      target.phone = values.phone?.trim() || null;
      target.city = values.city;
      target.bio = values.bio?.trim() || null;
      target.updated_at = new Date().toISOString();
      updated = target;
    });
    if (!updated) throw new AppError('Profil introuvable.', 'not_found');
    emitAuth();
    return updated;
  },

  /* Catégories ------------------------------------------------------------ */

  async listCategories(options) {
    await delay(100);
    return getState()
      .categories.filter((c) => options?.includeInactive || c.active)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  },

  async createCategory(values: CategoryValues) {
    await delay();
    const me = requireProfile();
    if (me.role !== 'admin') throw new AppError("Vous n'avez pas les droits nécessaires.", 'forbidden');
    const category: Category = {
      id: localId(),
      name: values.name.trim(),
      slug: slugify(values.name),
      description: values.description?.trim() || null,
      icon: values.icon?.trim() || null,
      image_url: values.image_url?.trim() || null,
      active: values.active,
      created_at: new Date().toISOString(),
    };
    if (getState().categories.some((c) => c.slug === category.slug)) {
      throw new AppError('Une catégorie porte déjà ce nom.', '23505');
    }
    mutate((draft) => {
      draft.categories.push(category);
    });
    return category;
  },

  async updateCategory(id: string, values: CategoryValues) {
    await delay();
    const me = requireProfile();
    if (me.role !== 'admin') throw new AppError("Vous n'avez pas les droits nécessaires.", 'forbidden');
    let updated: Category | null = null;
    mutate((draft) => {
      const target = draft.categories.find((c) => c.id === id);
      if (!target) return;
      target.name = values.name.trim();
      target.slug = slugify(values.name);
      target.description = values.description?.trim() || null;
      target.icon = values.icon?.trim() || null;
      target.image_url = values.image_url?.trim() || null;
      target.active = values.active;
      updated = target;
    });
    if (!updated) throw new AppError('Catégorie introuvable.', 'not_found');
    return updated;
  },

  async deleteCategory(id: string) {
    await delay();
    const me = requireProfile();
    if (me.role !== 'admin') throw new AppError("Vous n'avez pas les droits nécessaires.", 'forbidden');
    if (getState().listings.some((l) => l.category_id === id)) {
      throw new AppError(
        "Cette catégorie contient des annonces et ne peut pas être supprimée. Désactivez-la à la place.",
        '23503',
      );
    }
    mutate((draft) => {
      draft.categories = draft.categories.filter((c) => c.id !== id);
    });
  },

  /* Annonces -------------------------------------------------------------- */

  async listListings(filters: ListingFilters) {
    await delay(240);
    const me = currentProfile();
    const status = filters.status ?? 'published';
    let rows = getState().listings.slice();

    if (filters.providerId) {
      // Espace prestataire : seul le propriétaire (ou un admin) voit ses brouillons.
      if (!me || (me.id !== filters.providerId && me.role !== 'admin')) {
        throw new AppError("Vous n'avez pas les droits nécessaires.", 'forbidden');
      }
      rows = rows.filter((l) => l.provider_id === filters.providerId);
    }
    if (status !== 'all') {
      rows = rows.filter((l) => l.status === status);
    } else if (!filters.providerId && me?.role !== 'admin') {
      throw new AppError("Vous n'avez pas les droits nécessaires.", 'forbidden');
    }

    if (filters.search) {
      const q = normalize(filters.search);
      rows = rows.filter((l) => {
        const category = categoryOf(l);
        return (
          normalize(l.title).includes(q) ||
          normalize(l.description).includes(q) ||
          normalize(l.city).includes(q) ||
          normalize(category?.name ?? '').includes(q)
        );
      });
    }
    if (filters.category) {
      rows = rows.filter((l) => categoryOf(l)?.slug === filters.category);
    }
    if (filters.city) {
      rows = rows.filter((l) => l.city === filters.city);
    }
    if (typeof filters.minPrice === 'number') {
      rows = rows.filter((l) => l.price >= (filters.minPrice as number));
    }
    if (typeof filters.maxPrice === 'number') {
      rows = rows.filter((l) => l.price <= (filters.maxPrice as number));
    }
    if (filters.availableOnly) {
      rows = rows.filter((l) => l.availability_status);
    }

    switch (filters.sort) {
      case 'price_asc':
        rows.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        rows.sort((a, b) => b.price - a.price);
        break;
      default:
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? PAGE_SIZE;
    const total = rows.length;
    const start = (page - 1) * pageSize;

    return {
      items: rows.slice(start, start + pageSize).map(hydrateListing),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    } satisfies Paginated<ListingWithRelations>;
  },

  async getListingBySlug(slug: string) {
    await delay(180);
    const listing = getState().listings.find((l) => l.slug === slug);
    if (!listing) return null;
    const me = currentProfile();
    const visible = listing.status === 'published' || me?.role === 'admin' || me?.id === listing.provider_id;
    return visible ? hydrateListing(listing) : null;
  },

  async getListingById(id: string) {
    await delay(180);
    const listing = getState().listings.find((l) => l.id === id);
    if (!listing) return null;
    const me = currentProfile();
    const visible = listing.status === 'published' || me?.role === 'admin' || me?.id === listing.provider_id;
    return visible ? hydrateListing(listing) : null;
  },

  async createListing(values: ListingValues, submit: boolean) {
    await delay(360);
    const me = requireProfile();
    if (me.role !== 'provider' && me.role !== 'admin') {
      throw new AppError('Seuls les prestataires peuvent publier une offre.', 'forbidden');
    }
    const category = getState().categories.find((c) => c.id === values.category_id);
    const listing: Listing = {
      id: localId(),
      provider_id: me.id,
      category_id: values.category_id,
      title: values.title.trim(),
      slug: `${slugify(values.title, values.city)}-${Math.random().toString(36).slice(2, 6)}`,
      description: values.description.trim(),
      price: values.price,
      price_unit: values.price_unit,
      city: values.city,
      address: values.address?.trim() || null,
      conditions: values.conditions?.trim() || null,
      availability_status: values.availability_status,
      quantity: values.quantity,
      cover_image: placeholderFor(category?.slug),
      status: submit ? 'pending' : 'draft',
      moderation_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mutate((draft) => {
      draft.listings.unshift(listing);
    });
    return listing;
  },

  async updateListing(id: string, values: ListingValues) {
    await delay(320);
    const me = requireProfile();
    const existing = getState().listings.find((l) => l.id === id);
    if (!existing) throw new AppError('Annonce introuvable.', 'not_found');
    if (existing.provider_id !== me.id && me.role !== 'admin') {
      throw new AppError("Vous ne pouvez modifier que vos propres annonces.", 'forbidden');
    }
    let updated: Listing | null = null;
    mutate((draft) => {
      const target = draft.listings.find((l) => l.id === id);
      if (!target) return;
      Object.assign(target, {
        title: values.title.trim(),
        category_id: values.category_id,
        description: values.description.trim(),
        price: values.price,
        price_unit: values.price_unit,
        quantity: values.quantity,
        city: values.city,
        address: values.address?.trim() || null,
        conditions: values.conditions?.trim() || null,
        availability_status: values.availability_status,
        updated_at: new Date().toISOString(),
      });
      // Une annonce déjà refusée repasse en modération après correction.
      if (target.status === 'rejected') {
        target.status = 'pending';
        target.moderation_reason = null;
      }
      updated = target;
    });
    if (!updated) throw new AppError('Annonce introuvable.', 'not_found');
    return updated;
  },

  async setListingStatus(id: string, status: ListingStatus, moderationReason) {
    await delay(280);
    const me = requireProfile();
    const existing = getState().listings.find((l) => l.id === id);
    if (!existing) throw new AppError('Annonce introuvable.', 'not_found');

    const isOwner = existing.provider_id === me.id;
    const isModerator = me.role === 'admin';
    // Un prestataire soumet ou archive ; seul l'admin publie ou refuse.
    const ownerAllowed: ListingStatus[] = ['pending', 'archived', 'draft'];
    if (!isModerator && !(isOwner && ownerAllowed.includes(status))) {
      throw new AppError("Vous n'avez pas les droits nécessaires pour cette action.", 'forbidden');
    }

    let updated: Listing | null = null;
    mutate((draft) => {
      const target = draft.listings.find((l) => l.id === id);
      if (!target) return;
      target.status = status;
      target.moderation_reason = status === 'rejected' ? moderationReason ?? null : null;
      target.updated_at = new Date().toISOString();
      updated = target;
    });
    if (!updated) throw new AppError('Annonce introuvable.', 'not_found');

    if (isModerator && existing.provider_id !== me.id) {
      if (status === 'published') {
        notify(
          existing.provider_id,
          'listing_published',
          'Votre annonce est en ligne',
          `« ${existing.title} » a été validée et est désormais visible par les clients.`,
          '/prestataire/annonces',
        );
      }
      if (status === 'rejected') {
        notify(
          existing.provider_id,
          'listing_rejected',
          'Votre annonce a été refusée',
          `« ${existing.title} » n'a pas été validée : ${moderationReason ?? 'motif non précisé'}.`,
          '/prestataire/annonces',
        );
      }
    }
    return updated;
  },

  async deleteListing(id: string) {
    await delay(260);
    const me = requireProfile();
    const existing = getState().listings.find((l) => l.id === id);
    if (!existing) throw new AppError('Annonce introuvable.', 'not_found');
    if (existing.provider_id !== me.id && me.role !== 'admin') {
      throw new AppError('Vous ne pouvez supprimer que vos propres annonces.', 'forbidden');
    }
    mutate((draft) => {
      draft.listings = draft.listings.filter((l) => l.id !== id);
      draft.listingImages = draft.listingImages.filter((img) => img.listing_id !== id);
      draft.favorites = draft.favorites.filter((f) => f.listing_id !== id);
      draft.bookings = draft.bookings.filter((b) => b.listing_id !== id);
    });
  },

  /* Prestataires ---------------------------------------------------------- */

  async getProviderProfile(id: string) {
    await delay(140);
    const profile = findProfile(id);
    if (!profile || profile.role !== 'provider' || !profile.active) return null;
    return profile;
  },

  async listProviderPublicListings(providerId: string) {
    await delay(160);
    return getState()
      .listings.filter((l) => l.provider_id === providerId && l.status === 'published')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(hydrateListing);
  },

  /* Images ---------------------------------------------------------------- */

  async listListingImages(listingId: string) {
    await delay(120);
    return getState()
      .listingImages.filter((img) => img.listing_id === listingId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  async uploadListingImage(listingId: string, file: File, sortOrder: number) {
    const me = requireProfile();
    const listing = getState().listings.find((l) => l.id === listingId);
    if (!listing) throw new AppError('Annonce introuvable.', 'not_found');
    if (listing.provider_id !== me.id && me.role !== 'admin') {
      throw new AppError("Vous ne pouvez ajouter des photos qu'à vos propres annonces.", 'forbidden');
    }
    // En démonstration l'image reste locale (data URL) : aucun fichier n'est envoyé.
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new AppError("L'image n'a pas pu être lue.", 'file_read'));
      reader.readAsDataURL(file);
    });
    const image: ListingImage = {
      id: localId(),
      listing_id: listingId,
      image_url: dataUrl,
      sort_order: sortOrder,
      created_at: new Date().toISOString(),
    };
    mutate((draft) => {
      draft.listingImages.push(image);
      const target = draft.listings.find((l) => l.id === listingId);
      const isFirst = draft.listingImages.filter((img) => img.listing_id === listingId).length === 1;
      if (target && isFirst) target.cover_image = dataUrl;
    });
    return image;
  },

  async deleteListingImage(image: ListingImage) {
    await delay(160);
    const me = requireProfile();
    const listing = getState().listings.find((l) => l.id === image.listing_id);
    if (!listing) throw new AppError('Annonce introuvable.', 'not_found');
    if (listing.provider_id !== me.id && me.role !== 'admin') {
      throw new AppError("Vous n'avez pas les droits nécessaires.", 'forbidden');
    }
    mutate((draft) => {
      draft.listingImages = draft.listingImages.filter((img) => img.id !== image.id);
      const target = draft.listings.find((l) => l.id === image.listing_id);
      if (target && target.cover_image === image.image_url) {
        const next = draft.listingImages
          .filter((img) => img.listing_id === image.listing_id)
          .sort((a, b) => a.sort_order - b.sort_order)[0];
        target.cover_image = next?.image_url ?? placeholderFor(categoryOf(target)?.slug);
      }
    });
  },

  async reorderListingImages(listingId: string, orderedIds: string[]) {
    await delay(160);
    const me = requireProfile();
    const listing = getState().listings.find((l) => l.id === listingId);
    if (!listing) throw new AppError('Annonce introuvable.', 'not_found');
    if (listing.provider_id !== me.id && me.role !== 'admin') {
      throw new AppError("Vous n'avez pas les droits nécessaires.", 'forbidden');
    }
    mutate((draft) => {
      orderedIds.forEach((id, index) => {
        const image = draft.listingImages.find((img) => img.id === id);
        if (image) image.sort_order = index;
      });
      const cover = draft.listingImages.find((img) => img.id === orderedIds[0]);
      const target = draft.listings.find((l) => l.id === listingId);
      if (target && cover) target.cover_image = cover.image_url;
    });
    return getState()
      .listingImages.filter((img) => img.listing_id === listingId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  /* Favoris --------------------------------------------------------------- */

  async listFavorites(userId: string) {
    await delay(200);
    const me = requireProfile();
    if (me.id !== userId && me.role !== 'admin') throw new AppError("Accès refusé.", 'forbidden');
    return getState()
      .favorites.filter((f) => f.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((favorite) => {
        const listing = getState().listings.find((l) => l.id === favorite.listing_id);
        return { ...favorite, listing: listing ? hydrateListing(listing) : null } satisfies FavoriteWithListing;
      });
  },

  async listFavoriteListingIds(userId: string) {
    await delay(80);
    return getState()
      .favorites.filter((f) => f.user_id === userId)
      .map((f) => f.listing_id);
  },

  async addFavorite(userId: string, listingId: string) {
    await delay(140);
    const me = requireProfile();
    if (me.id !== userId) throw new AppError('Accès refusé.', 'forbidden');
    if (getState().favorites.some((f) => f.user_id === userId && f.listing_id === listingId)) return;
    mutate((draft) => {
      draft.favorites.push({ id: localId(), user_id: userId, listing_id: listingId, created_at: new Date().toISOString() });
    });
  },

  async removeFavorite(userId: string, listingId: string) {
    await delay(140);
    const me = requireProfile();
    if (me.id !== userId) throw new AppError('Accès refusé.', 'forbidden');
    mutate((draft) => {
      draft.favorites = draft.favorites.filter((f) => !(f.user_id === userId && f.listing_id === listingId));
    });
  },

  /* Réservations ---------------------------------------------------------- */

  async getAvailability(listingId: string, from: string, to: string) {
    await delay(200);
    const listing = getState().listings.find((l) => l.id === listingId);
    if (!listing) throw new AppError('Annonce introuvable.', 'not_found');
    const { accepted, pending } = bookedQuantities(listingId, from, to);
    return buildAvailability(listing, accepted, pending);
  },

  async createBooking(input: CreateBookingInput) {
    await delay(420);
    const me = requireProfile();
    const listing = getState().listings.find((l) => l.id === input.listing_id);
    if (!listing) throw new AppError('Annonce introuvable.', 'not_found');
    if (listing.status !== 'published' || !listing.availability_status) {
      throw new AppError("Cette offre n'est plus disponible à la réservation.", 'unavailable');
    }
    if (listing.provider_id === me.id) {
      throw new AppError('Vous ne pouvez pas réserver votre propre annonce.', 'forbidden');
    }
    if (input.requested_from < todayISO()) {
      throw new AppError('La date doit être aujourd’hui ou ultérieure.', 'invalid_date');
    }
    if (input.requested_to < input.requested_from) {
      throw new AppError('La date de fin doit être identique ou postérieure à la date de début.', 'invalid_date');
    }
    const { accepted } = bookedQuantities(input.listing_id, input.requested_from, input.requested_to);
    if (input.quantity > listing.quantity - accepted) {
      throw new AppError(
        `Quantité indisponible sur cette période : il reste au maximum ${Math.max(0, listing.quantity - accepted)} unité(s) selon les jours.`,
        'unavailable',
      );
    }
    // Reflète l'exclusion GiST côté SQL (`bookings_no_duplicate_pending`) :
    // aucune deuxième demande en attente du même client, sur la même annonce,
    // dont la période chevauche celle-ci.
    if (
      getState().bookings.some(
        (b) =>
          b.listing_id === input.listing_id &&
          b.client_id === me.id &&
          b.status === 'pending' &&
          rangesOverlap(b.requested_from, b.requested_to, input.requested_from, input.requested_to),
      )
    ) {
      throw new AppError('Vous avez déjà une demande en attente pour cette offre sur une période qui chevauche celle-ci.', '23505');
    }

    const booking: BookingRequest = {
      id: localId(),
      listing_id: input.listing_id,
      client_id: me.id,
      provider_id: listing.provider_id,
      requested_from: input.requested_from,
      requested_to: input.requested_to,
      quantity: input.quantity,
      message: input.message?.trim() || null,
      status: 'pending',
      // Fondation du chantier n°2 (docs/specs/PAYMENT-FLOW.md) : aucun
      // compte marchand n'est branché, ce champ ne bouge jamais en mode
      // démo — seul un vrai webhook (hors de cette SPA) le ferait.
      payment_status: 'none',
      payment_provider: null,
      deposit_amount: null,
      payment_reference: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mutate((draft) => {
      draft.bookings.unshift(booking);
    });
    notify(
      listing.provider_id,
      'booking_request',
      'Nouvelle demande de réservation',
      `${me.full_name} souhaite réserver « ${listing.title} » (${input.quantity} unité(s)).`,
      '/prestataire/demandes',
    );
  },

  async listClientBookings(clientId: string) {
    await delay(240);
    const me = requireProfile();
    if (me.id !== clientId && me.role !== 'admin') throw new AppError('Accès refusé.', 'forbidden');
    return getState()
      .bookings.filter((b) => b.client_id === clientId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(hydrateBooking);
  },

  async listProviderBookings(providerId: string) {
    await delay(240);
    const me = requireProfile();
    if (me.id !== providerId && me.role !== 'admin') throw new AppError('Accès refusé.', 'forbidden');
    return getState()
      .bookings.filter((b) => b.provider_id === providerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(hydrateBooking);
  },

  async listAllBookings() {
    await delay(260);
    const me = requireProfile();
    if (me.role !== 'admin') throw new AppError('Accès refusé.', 'forbidden');
    return getState()
      .bookings.slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(hydrateBooking);
  },

  async updateBookingStatus(id: string, status: BookingStatus) {
    await delay(320);
    const me = requireProfile();
    const booking = getState().bookings.find((b) => b.id === id);
    if (!booking) throw new AppError('Demande introuvable.', 'not_found');
    if (booking.status !== 'pending') {
      throw new AppError('Cette demande a déjà été traitée.', 'already_processed');
    }

    const isProvider = booking.provider_id === me.id;
    const isClient = booking.client_id === me.id;
    const isAdmin = me.role === 'admin';
    const allowed =
      (status === 'cancelled' && (isClient || isAdmin)) ||
      ((status === 'accepted' || status === 'rejected') && (isProvider || isAdmin));
    if (!allowed) throw new AppError("Vous n'avez pas les droits nécessaires pour cette action.", 'forbidden');

    if (status === 'accepted') {
      const listing = getState().listings.find((l) => l.id === booking.listing_id);
      const { accepted } = bookedQuantities(booking.listing_id, booking.requested_from, booking.requested_to, booking.id);
      if (listing && booking.quantity > listing.quantity - accepted) {
        throw new AppError(
          `Stock insuffisant sur cette période : il reste au maximum ${Math.max(0, listing.quantity - accepted)} unité(s) selon les jours.`,
          'unavailable',
        );
      }
    }

    mutate((draft) => {
      const target = draft.bookings.find((b) => b.id === id);
      if (target) {
        target.status = status;
        target.updated_at = new Date().toISOString();
      }
    });

    const listing = getState().listings.find((l) => l.id === booking.listing_id);
    const title = listing?.title ?? 'votre demande';
    if (status === 'accepted') {
      notify(booking.client_id, 'booking_accepted', 'Votre demande a été acceptée', `Votre demande pour « ${title} » a été acceptée.`, '/demandes');
    } else if (status === 'rejected') {
      notify(booking.client_id, 'booking_rejected', 'Votre demande a été refusée', `Votre demande pour « ${title} » a été refusée.`, '/demandes');
    } else if (status === 'cancelled') {
      notify(booking.provider_id, 'booking_cancelled', 'Demande annulée', `Une demande concernant « ${title} » a été annulée par le client.`, '/prestataire/demandes');
    }
  },

  /* Notifications --------------------------------------------------------- */

  async listNotifications(userId: string) {
    await delay(160);
    const me = requireProfile();
    if (me.id !== userId) throw new AppError('Accès refusé.', 'forbidden');
    return getState()
      .notifications.filter((n) => n.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)) satisfies Notification[];
  },

  async markNotificationRead(id: string) {
    await delay(80);
    const me = requireProfile();
    mutate((draft) => {
      const target = draft.notifications.find((n) => n.id === id && n.user_id === me.id);
      if (target) target.read = true;
    });
  },

  async markAllNotificationsRead(userId: string) {
    await delay(120);
    const me = requireProfile();
    if (me.id !== userId) throw new AppError('Accès refusé.', 'forbidden');
    mutate((draft) => {
      draft.notifications.forEach((n) => {
        if (n.user_id === userId) n.read = true;
      });
    });
  },

  /* Statistiques ---------------------------------------------------------- */

  async getClientStats(userId: string) {
    await delay(160);
    const bookings = getState().bookings.filter((b) => b.client_id === userId);
    return {
      pending: bookings.filter((b) => b.status === 'pending').length,
      accepted: bookings.filter((b) => b.status === 'accepted').length,
      rejected: bookings.filter((b) => b.status === 'rejected').length,
      favorites: getState().favorites.filter((f) => f.user_id === userId).length,
    } satisfies ClientStats;
  },

  async getProviderStats(providerId: string) {
    await delay(160);
    const listings = getState().listings.filter((l) => l.provider_id === providerId);
    const bookings = getState().bookings.filter((b) => b.provider_id === providerId);
    return {
      publishedListings: listings.filter((l) => l.status === 'published').length,
      pendingListings: listings.filter((l) => l.status === 'pending').length,
      totalRequests: bookings.length,
      pendingRequests: bookings.filter((b) => b.status === 'pending').length,
      acceptedRequests: bookings.filter((b) => b.status === 'accepted').length,
    } satisfies ProviderStats;
  },

  async getAdminStats() {
    await delay(200);
    const me = requireProfile();
    if (me.role !== 'admin') throw new AppError('Accès refusé.', 'forbidden');
    const { profiles, listings, bookings, categories } = getState();
    return {
      users: profiles.length,
      providers: profiles.filter((p) => p.role === 'provider').length,
      clients: profiles.filter((p) => p.role === 'client').length,
      listings: listings.length,
      pendingListings: listings.filter((l) => l.status === 'pending').length,
      requests: bookings.length,
      acceptedRequests: bookings.filter((b) => b.status === 'accepted').length,
      categories: categories.length,
    } satisfies AdminStats;
  },

  /* Administration -------------------------------------------------------- */

  async adminListUsers(filters: AdminUserFilters) {
    await delay(240);
    const me = requireProfile();
    if (me.role !== 'admin') throw new AppError('Accès refusé.', 'forbidden');
    let rows = getState().profiles.slice();
    if (filters.search) {
      const q = normalize(filters.search);
      rows = rows.filter((p) => normalize(p.full_name).includes(q) || normalize(p.email).includes(q));
    }
    if (filters.role && filters.role !== 'all') rows = rows.filter((p) => p.role === filters.role);
    if (filters.active && filters.active !== 'all') {
      rows = rows.filter((p) => (filters.active === 'active' ? p.active : !p.active));
    }
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? 10;
    const total = rows.length;
    const start = (page - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    } satisfies Paginated<Profile>;
  },

  async adminUpdateUser(id: string, patch: { role?: UserRole; active?: boolean }) {
    await delay(240);
    const me = requireProfile();
    if (me.role !== 'admin') throw new AppError('Accès refusé.', 'forbidden');
    if (me.id === id && patch.active === false) {
      throw new AppError('Vous ne pouvez pas désactiver votre propre compte administrateur.', 'forbidden');
    }
    let updated: Profile | null = null;
    mutate((draft) => {
      const target = draft.profiles.find((p) => p.id === id);
      if (!target) return;
      if (patch.role) target.role = patch.role;
      if (typeof patch.active === 'boolean') target.active = patch.active;
      target.updated_at = new Date().toISOString();
      updated = target;
    });
    if (!updated) throw new AppError('Utilisateur introuvable.', 'not_found');
    return updated;
  },
};

function hydrateBooking(booking: BookingRequest): BookingRequestWithRelations {
  const listing = getState().listings.find((l) => l.id === booking.listing_id);
  const client = findProfile(booking.client_id);
  const provider = findProfile(booking.provider_id);
  return {
    ...booking,
    listing: listing
      ? {
          id: listing.id,
          title: listing.title,
          slug: listing.slug,
          cover_image: listing.cover_image,
          price: listing.price,
          price_unit: listing.price_unit,
          city: listing.city,
          quantity: listing.quantity,
        }
      : null,
    client: client ? { id: client.id, full_name: client.full_name, phone: client.phone, city: client.city, avatar_url: client.avatar_url } : null,
    provider: provider
      ? { id: provider.id, full_name: provider.full_name, phone: provider.phone, city: provider.city, avatar_url: provider.avatar_url }
      : null,
  };
}

/** Règle de disponibilité partagée par les deux backends. */
export function buildAvailability(
  listing: Pick<Listing, 'quantity' | 'availability_status' | 'status'>,
  accepted: number,
  pending: number,
): AvailabilityResult {
  const total = listing.quantity;
  const remaining = Math.max(0, total - accepted);

  if (!listing.availability_status || listing.status !== 'published') {
    return { state: 'disabled', remaining: 0, booked: accepted, pending, total, label: 'Non disponible actuellement' };
  }
  if (remaining <= 0) {
    return { state: 'unavailable', remaining: 0, booked: accepted, pending, total, label: 'Indisponible à cette date' };
  }
  if (pending > 0) {
    return {
      state: 'partial',
      remaining,
      booked: accepted,
      pending,
      total,
      label: 'En cours de confirmation',
    };
  }
  return { state: 'available', remaining, booked: accepted, pending, total, label: 'Disponible' };
}
