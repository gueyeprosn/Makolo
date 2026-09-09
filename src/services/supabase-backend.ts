import { PAGE_SIZE, STORAGE_BUCKET } from '@/constants';
import { AppError, toAppError } from '@/lib/errors';
import { requireSupabase, supabase } from '@/lib/supabase';
import { slugify } from '@/lib/utils';
import type {
  AdminActivityEvent,
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
  ProviderVerificationStatus,
  User,
  UserRole,
} from '@/types';
import type { CategoryValues, ListingValues, ProfileValues, RegisterValues } from '@/lib/validations';
import type { AdminUserFilters, CreateBookingInput, MakaloBackend, SignUpResult } from './backend';
import { buildAvailability } from './demo-backend';

/**
 * Backend Supabase (production).
 *
 * Toutes les requêtes passent par la clé publique `anon` : la sécurité est
 * assurée par les policies RLS (scripts/sql/02_rls.sql). Chaque lecture ou
 * écriture ci-dessous possède une policy correspondante côté base ; le code
 * client ne fait jamais autorité.
 */

const LISTING_SELECT = `
  id, provider_id, category_id, title, slug, description, price, price_unit, city, address,
  conditions, availability_status, quantity, cover_image, status, moderation_reason,
  created_at, updated_at,
  category:categories ( id, name, slug, icon ),
  provider:profiles!listings_provider_id_fkey ( id, full_name, city, avatar_url, phone, bio ),
  images:listing_images ( id, listing_id, image_url, sort_order, created_at )
`;

const BOOKING_SELECT = `
  id, listing_id, client_id, provider_id, requested_from, requested_to, quantity, message, status,
  payment_status, payment_provider, deposit_amount, payment_reference, created_at, updated_at,
  listing:listings ( id, title, slug, cover_image, price, price_unit, city, quantity ),
  client:profiles!booking_requests_client_id_fkey ( id, full_name, phone, city, avatar_url ),
  provider:profiles!booking_requests_provider_id_fkey ( id, full_name, phone, city, avatar_url )
`;

/** Supabase renvoie parfois une relation `to-one` sous forme de tableau. */
function one<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
  return (value as T | null) ?? null;
}

function mapListing(row: Record<string, unknown>): ListingWithRelations {
  return {
    ...(row as unknown as Listing),
    category: one<ListingWithRelations['category']>(row.category),
    provider: one<ListingWithRelations['provider']>(row.provider),
    images: (((row.images as ListingImage[] | null) ?? []) as ListingImage[])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}

function mapBooking(row: Record<string, unknown>): BookingRequestWithRelations {
  return {
    ...(row as unknown as BookingRequestWithRelations),
    listing: one<BookingRequestWithRelations['listing']>(row.listing),
    client: one<BookingRequestWithRelations['client']>(row.client),
    provider: one<BookingRequestWithRelations['provider']>(row.provider),
  };
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const client = requireSupabase();
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw toAppError(error);
  return (data as Profile | null) ?? null;
}

async function currentUser(): Promise<User | null> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  const profile = await fetchProfile(data.user.id);
  if (!profile) return null;
  return { id: profile.id, email: profile.email, profile };
}

async function requireUserId(): Promise<string> {
  const client = requireSupabase();
  const { data } = await client.auth.getUser();
  if (!data.user) throw new AppError('Vous devez être connecté pour effectuer cette action.', 'unauthenticated');
  return data.user.id;
}

export const supabaseBackend: MakaloBackend = {
  mode: 'supabase',

  /* Auth ------------------------------------------------------------------ */

  async getCurrentUser() {
    try {
      return await currentUser();
    } catch (error) {
      throw toAppError(error);
    }
  },

  onAuthStateChange(callback) {
    if (!supabase) return () => undefined;
    const { data } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        callback(null);
        return;
      }
      try {
        callback(await currentUser());
      } catch {
        callback(null);
      }
    });
    return () => data.subscription.unsubscribe();
  },

  async signIn(email, password) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw toAppError(error);
    const profile = data.user ? await fetchProfile(data.user.id) : null;
    if (!profile) throw new AppError('Profil introuvable. Contactez le support MAKALO.', 'profile_missing');
    if (!profile.active) {
      await client.auth.signOut();
      throw new AppError('Votre compte est désactivé. Contactez le support MAKALO.', 'inactive');
    }
    return { id: profile.id, email: profile.email, profile };
  },

  async signUp(values: RegisterValues) {
    const client = requireSupabase();
    // Le rôle et le profil sont créés par le trigger `handle_new_user()` à
    // partir des métadonnées : le client ne peut donc pas s'auto-attribuer le
    // rôle `admin` (le trigger force `client` pour toute valeur non autorisée).
    const { data, error } = await client.auth.signUp({
      email: values.email.trim().toLowerCase(),
      password: values.password,
      options: {
        data: {
          full_name: values.full_name.trim(),
          phone: values.phone?.trim() || null,
          city: values.city,
          role: values.role,
        },
        emailRedirectTo: `${window.location.origin}/connexion`,
      },
    });
    if (error) throw toAppError(error);
    if (!data.session) {
      return { user: null, needsEmailConfirmation: true } satisfies SignUpResult;
    }
    const profile = data.user ? await fetchProfile(data.user.id) : null;
    return {
      user: profile ? { id: profile.id, email: profile.email, profile } : null,
      needsEmailConfirmation: false,
    };
  },

  async signOut() {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw toAppError(error);
  },

  async requestPasswordReset(email: string) {
    const client = requireSupabase();
    const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/profil?reset=1`,
    });
    if (error) throw toAppError(error);
  },

  async updatePassword(password: string) {
    const client = requireSupabase();
    const { error } = await client.auth.updateUser({ password });
    if (error) throw toAppError(error);
  },

  async updateProfile(userId: string, values: ProfileValues) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('profiles')
      .update({
        full_name: values.full_name.trim(),
        phone: values.phone?.trim() || null,
        city: values.city,
        bio: values.bio?.trim() || null,
      })
      .eq('id', userId)
      .select('*')
      .single();
    if (error) throw toAppError(error);
    return data as Profile;
  },

  /* Catégories ------------------------------------------------------------ */

  async listCategories(options) {
    const client = requireSupabase();
    let query = client.from('categories').select('*').order('name', { ascending: true });
    if (!options?.includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw toAppError(error);
    return (data ?? []) as Category[];
  },

  async createCategory(values: CategoryValues) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('categories')
      .insert({
        name: values.name.trim(),
        slug: slugify(values.name),
        description: values.description?.trim() || null,
        icon: values.icon?.trim() || null,
        image_url: values.image_url?.trim() || null,
        active: values.active,
      })
      .select('*')
      .single();
    if (error) throw toAppError(error, 'Une catégorie porte peut-être déjà ce nom.');
    return data as Category;
  },

  async updateCategory(id: string, values: CategoryValues) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('categories')
      .update({
        name: values.name.trim(),
        slug: slugify(values.name),
        description: values.description?.trim() || null,
        icon: values.icon?.trim() || null,
        image_url: values.image_url?.trim() || null,
        active: values.active,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw toAppError(error);
    return data as Category;
  },

  async deleteCategory(id: string) {
    const client = requireSupabase();
    const { error } = await client.from('categories').delete().eq('id', id);
    if (error) {
      throw toAppError(
        error,
        "Cette catégorie contient des annonces et ne peut pas être supprimée. Désactivez-la à la place.",
      );
    }
  },

  /* Annonces -------------------------------------------------------------- */

  async listListings(filters: ListingFilters) {
    const client = requireSupabase();
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? PAGE_SIZE;
    const from = (page - 1) * pageSize;

    let query = client.from('listings').select(LISTING_SELECT, { count: 'exact' });

    const status = filters.status ?? 'published';
    if (status !== 'all') query = query.eq('status', status);
    if (filters.providerId) query = query.eq('provider_id', filters.providerId);
    if (filters.city) query = query.eq('city', filters.city);
    if (filters.availableOnly) query = query.eq('availability_status', true);
    if (typeof filters.minPrice === 'number') query = query.gte('price', filters.minPrice);
    if (typeof filters.maxPrice === 'number') query = query.lte('price', filters.maxPrice);
    if (filters.category) {
      const { data: category, error: categoryError } = await client
        .from('categories')
        .select('id')
        .eq('slug', filters.category)
        .maybeSingle();
      if (categoryError) throw toAppError(categoryError);
      if (!category) {
        return { items: [], total: 0, page, pageSize, totalPages: 1 } satisfies Paginated<ListingWithRelations>;
      }
      query = query.eq('category_id', (category as { id: string }).id);
    }
    if (filters.search) {
      const term = filters.search.replace(/[%,()]/g, ' ').trim();
      if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,city.ilike.%${term}%`);
    }

    switch (filters.sort) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) throw toAppError(error);
    const total = count ?? 0;
    return {
      items: (data ?? []).map((row) => mapListing(row as Record<string, unknown>)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    } satisfies Paginated<ListingWithRelations>;
  },

  async getListingBySlug(slug: string) {
    const client = requireSupabase();
    const { data, error } = await client.from('listings').select(LISTING_SELECT).eq('slug', slug).maybeSingle();
    if (error) throw toAppError(error);
    return data ? mapListing(data as Record<string, unknown>) : null;
  },

  async getListingById(id: string) {
    const client = requireSupabase();
    const { data, error } = await client.from('listings').select(LISTING_SELECT).eq('id', id).maybeSingle();
    if (error) throw toAppError(error);
    return data ? mapListing(data as Record<string, unknown>) : null;
  },

  async createListing(values: ListingValues, submit: boolean) {
    const client = requireSupabase();
    const providerId = await requireUserId();
    const { data, error } = await client
      .from('listings')
      .insert({
        provider_id: providerId,
        category_id: values.category_id,
        title: values.title.trim(),
        slug: `${slugify(values.title, values.city)}-${Math.random().toString(36).slice(2, 6)}`,
        description: values.description.trim(),
        price: values.price,
        price_unit: values.price_unit,
        quantity: values.quantity,
        city: values.city,
        address: values.address?.trim() || null,
        conditions: values.conditions?.trim() || null,
        availability_status: values.availability_status,
        status: submit ? 'pending' : 'draft',
      })
      .select('*')
      .single();
    if (error) throw toAppError(error);
    return data as Listing;
  },

  async updateListing(id: string, values: ListingValues) {
    const client = requireSupabase();
    const { data: existing, error: readError } = await client
      .from('listings')
      .select('status')
      .eq('id', id)
      .maybeSingle();
    if (readError) throw toAppError(readError);

    const patch: Record<string, unknown> = {
      category_id: values.category_id,
      title: values.title.trim(),
      description: values.description.trim(),
      price: values.price,
      price_unit: values.price_unit,
      quantity: values.quantity,
      city: values.city,
      address: values.address?.trim() || null,
      conditions: values.conditions?.trim() || null,
      availability_status: values.availability_status,
    };
    // Une annonce refusée repasse automatiquement en modération après correction.
    if ((existing as { status?: ListingStatus } | null)?.status === 'rejected') {
      patch.status = 'pending';
      patch.moderation_reason = null;
    }

    const { data, error } = await client.from('listings').update(patch).eq('id', id).select('*').single();
    if (error) throw toAppError(error);
    return data as Listing;
  },

  async setListingStatus(id: string, status: ListingStatus, moderationReason) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('listings')
      .update({ status, moderation_reason: status === 'rejected' ? moderationReason ?? null : null })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw toAppError(error);
    // Les notifications de modération sont créées côté base par le trigger
    // `notify_listing_moderation()` : le client n'écrit jamais dans la table
    // `notifications` d'un autre utilisateur.
    return data as Listing;
  },

  async deleteListing(id: string) {
    const client = requireSupabase();
    // Nettoyage du Storage avant suppression de la ligne (cascade en base).
    const { data: images } = await client.from('listing_images').select('image_url').eq('listing_id', id);
    const paths = (images ?? [])
      .map((row) => storagePathFromUrl((row as { image_url: string }).image_url))
      .filter((path): path is string => Boolean(path));
    if (paths.length) await client.storage.from(STORAGE_BUCKET).remove(paths);

    const { error } = await client.from('listings').delete().eq('id', id);
    if (error) throw toAppError(error);
  },

  /* Prestataires ---------------------------------------------------------- */

  async getProviderProfile(id: string) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('role', 'provider')
      .eq('active', true)
      .maybeSingle();
    if (error) throw toAppError(error);
    return (data as Profile | null) ?? null;
  },

  async listProviderPublicListings(providerId: string) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('listings')
      .select(LISTING_SELECT)
      .eq('provider_id', providerId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    if (error) throw toAppError(error);
    return (data ?? []).map((row) => mapListing(row as Record<string, unknown>));
  },

  /* Images ---------------------------------------------------------------- */

  async listListingImages(listingId: string) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('listing_images')
      .select('*')
      .eq('listing_id', listingId)
      .order('sort_order', { ascending: true });
    if (error) throw toAppError(error);
    return (data ?? []) as ListingImage[];
  },

  async uploadListingImage(listingId: string, file: File, sortOrder: number) {
    const client = requireSupabase();
    const userId = await requireUserId();
    const extension = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    // Le chemin commence par l'identifiant du propriétaire : la policy Storage
    // vérifie que le premier segment correspond à `auth.uid()`.
    const path = `${userId}/${listingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

    const { error: uploadError } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (uploadError) throw toAppError(uploadError, "L'image n'a pas pu être envoyée. Veuillez réessayer.");

    const { data: publicUrl } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);

    const { data, error } = await client
      .from('listing_images')
      .insert({ listing_id: listingId, image_url: publicUrl.publicUrl, sort_order: sortOrder })
      .select('*')
      .single();
    if (error) {
      await client.storage.from(STORAGE_BUCKET).remove([path]);
      throw toAppError(error);
    }

    // La première image devient automatiquement la photo de couverture.
    if (sortOrder === 0) {
      await client.from('listings').update({ cover_image: publicUrl.publicUrl }).eq('id', listingId);
    }
    return data as ListingImage;
  },

  async deleteListingImage(image: ListingImage) {
    const client = requireSupabase();
    const { error } = await client.from('listing_images').delete().eq('id', image.id);
    if (error) throw toAppError(error);

    const path = storagePathFromUrl(image.image_url);
    if (path) await client.storage.from(STORAGE_BUCKET).remove([path]);

    const { data: remaining } = await client
      .from('listing_images')
      .select('image_url')
      .eq('listing_id', image.listing_id)
      .order('sort_order', { ascending: true })
      .limit(1);
    await client
      .from('listings')
      .update({ cover_image: (remaining?.[0] as { image_url: string } | undefined)?.image_url ?? null })
      .eq('id', image.listing_id);
  },

  async reorderListingImages(listingId: string, orderedIds: string[]) {
    const client = requireSupabase();
    await Promise.all(
      orderedIds.map((id, index) => client.from('listing_images').update({ sort_order: index }).eq('id', id)),
    );
    const { data, error } = await client
      .from('listing_images')
      .select('*')
      .eq('listing_id', listingId)
      .order('sort_order', { ascending: true });
    if (error) throw toAppError(error);
    const images = (data ?? []) as ListingImage[];
    if (images[0]) await client.from('listings').update({ cover_image: images[0].image_url }).eq('id', listingId);
    return images;
  },

  /* Favoris --------------------------------------------------------------- */

  async listFavorites(userId: string) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('favorites')
      .select(`id, user_id, listing_id, created_at, listing:listings ( ${LISTING_SELECT} )`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw toAppError(error);
    return (data ?? []).map((row) => {
      const favorite = row as unknown as FavoriteWithListing;
      const listing = one<Record<string, unknown>>((row as Record<string, unknown>).listing);
      return { ...favorite, listing: listing ? mapListing(listing) : null };
    });
  },

  async listFavoriteListingIds(userId: string) {
    const client = requireSupabase();
    const { data, error } = await client.from('favorites').select('listing_id').eq('user_id', userId);
    if (error) throw toAppError(error);
    return (data ?? []).map((row) => (row as { listing_id: string }).listing_id);
  },

  async addFavorite(userId: string, listingId: string) {
    const client = requireSupabase();
    const { error } = await client.from('favorites').insert({ user_id: userId, listing_id: listingId });
    // `23505` = favori déjà présent : l'état voulu est atteint, on n'échoue pas.
    if (error && (error as { code?: string }).code !== '23505') throw toAppError(error);
  },

  async removeFavorite(userId: string, listingId: string) {
    const client = requireSupabase();
    const { error } = await client.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId);
    if (error) throw toAppError(error);
  },

  /* Réservations ---------------------------------------------------------- */

  async getAvailability(listingId: string, from: string, to: string) {
    const client = requireSupabase();
    // Fonction SQL `SECURITY DEFINER` : elle ne renvoie que des agrégats, jamais
    // les demandes des autres clients (voir 01_schema.sql). Calcule le pire
    // jour de la période, pas seulement son ensemble — voir 01_schema.sql,
    // section 11, et docs/specs/BOOKING-LIFECYCLE.md.
    const { data, error } = await client.rpc('listing_availability', {
      p_listing_id: listingId,
      p_from: from,
      p_to: to,
    });
    if (error) throw toAppError(error);
    const row = (Array.isArray(data) ? data[0] : data) as
      | { total_quantity: number; accepted_quantity: number; pending_quantity: number; is_active: boolean; listing_status: ListingStatus }
      | undefined;
    if (!row) throw new AppError('Annonce introuvable.', 'not_found');
    return buildAvailability(
      { quantity: row.total_quantity, availability_status: row.is_active, status: row.listing_status },
      row.accepted_quantity,
      row.pending_quantity,
    ) satisfies AvailabilityResult;
  },

  async createBooking(input: CreateBookingInput) {
    const client = requireSupabase();
    const clientId = await requireUserId();
    const { data: listing, error: listingError } = await client
      .from('listings')
      .select('id, provider_id, status, availability_status, quantity')
      .eq('id', input.listing_id)
      .maybeSingle();
    if (listingError) throw toAppError(listingError);
    if (!listing) throw new AppError('Annonce introuvable.', 'not_found');

    const row = listing as Pick<Listing, 'id' | 'provider_id' | 'status' | 'availability_status' | 'quantity'>;
    if (row.status !== 'published' || !row.availability_status) {
      throw new AppError("Cette offre n'est plus disponible à la réservation.", 'unavailable');
    }
    if (row.provider_id === clientId) {
      throw new AppError('Vous ne pouvez pas réserver votre propre annonce.', 'forbidden');
    }

    if (input.requested_to < input.requested_from) {
      throw new AppError('La date de fin doit être identique ou postérieure à la date de début.', 'invalid_date');
    }

    const availability = await this.getAvailability(input.listing_id, input.requested_from, input.requested_to);
    if (input.quantity > availability.remaining) {
      throw new AppError(
        `Quantité indisponible sur cette période : il reste au maximum ${availability.remaining} unité(s) selon les jours.`,
        'unavailable',
      );
    }

    const { error } = await client.from('booking_requests').insert({
      listing_id: input.listing_id,
      client_id: clientId,
      provider_id: row.provider_id,
      requested_from: input.requested_from,
      requested_to: input.requested_to,
      quantity: input.quantity,
      message: input.message?.trim() || null,
      status: 'pending',
    });
    if (error) {
      // `bookings_no_duplicate_pending` (exclusion GiST) renvoie ce code pour
      // toute période qui chevauche une demande déjà en attente.
      if ((error as { code?: string }).code === '23P01' || (error as { code?: string }).code === '23505') {
        throw new AppError(
          'Vous avez déjà une demande en attente pour cette offre sur une période qui chevauche celle-ci.',
          '23505',
        );
      }
      throw toAppError(error);
    }
    // La notification du prestataire est créée par le trigger `notify_booking_created()`.
  },

  async listClientBookings(clientId: string) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('booking_requests')
      .select(BOOKING_SELECT)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) throw toAppError(error);
    return (data ?? []).map((row) => mapBooking(row as Record<string, unknown>));
  },

  async listProviderBookings(providerId: string) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('booking_requests')
      .select(BOOKING_SELECT)
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });
    if (error) throw toAppError(error);
    return (data ?? []).map((row) => mapBooking(row as Record<string, unknown>));
  },

  async listAllBookings() {
    const client = requireSupabase();
    const { data, error } = await client
      .from('booking_requests')
      .select(BOOKING_SELECT)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw toAppError(error);
    return (data ?? []).map((row) => mapBooking(row as Record<string, unknown>));
  },

  async updateBookingStatus(id: string, status: BookingStatus) {
    const client = requireSupabase();
    const { error } = await client.from('booking_requests').update({ status }).eq('id', id).eq('status', 'pending');
    if (error) throw toAppError(error);
    // Les notifications client/prestataire sont créées par le trigger
    // `notify_booking_status_change()`.
  },

  /* Notifications --------------------------------------------------------- */

  async listNotifications(userId: string) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw toAppError(error);
    return (data ?? []) as Notification[];
  },

  async markNotificationRead(id: string) {
    const client = requireSupabase();
    const { error } = await client.from('notifications').update({ read: true }).eq('id', id);
    if (error) throw toAppError(error);
  },

  async markAllNotificationsRead(userId: string) {
    const client = requireSupabase();
    const { error } = await client.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    if (error) throw toAppError(error);
  },

  /* Statistiques ---------------------------------------------------------- */

  async getClientStats(userId: string) {
    const client = requireSupabase();
    const countBookings = (status: BookingStatus) =>
      client
        .from('booking_requests')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', userId)
        .eq('status', status);

    const [pending, accepted, rejected, favorites] = await Promise.all([
      countBookings('pending'),
      countBookings('accepted'),
      countBookings('rejected'),
      client.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    return {
      pending: pending.count ?? 0,
      accepted: accepted.count ?? 0,
      rejected: rejected.count ?? 0,
      favorites: favorites.count ?? 0,
    } satisfies ClientStats;
  },

  async getProviderStats(providerId: string) {
    const client = requireSupabase();
    const [published, pendingListings, total, pendingRequests, acceptedRequests] = await Promise.all([
      client.from('listings').select('id', { count: 'exact', head: true }).eq('provider_id', providerId).eq('status', 'published'),
      client.from('listings').select('id', { count: 'exact', head: true }).eq('provider_id', providerId).eq('status', 'pending'),
      client.from('booking_requests').select('id', { count: 'exact', head: true }).eq('provider_id', providerId),
      client.from('booking_requests').select('id', { count: 'exact', head: true }).eq('provider_id', providerId).eq('status', 'pending'),
      client.from('booking_requests').select('id', { count: 'exact', head: true }).eq('provider_id', providerId).eq('status', 'accepted'),
    ]);
    return {
      publishedListings: published.count ?? 0,
      pendingListings: pendingListings.count ?? 0,
      totalRequests: total.count ?? 0,
      pendingRequests: pendingRequests.count ?? 0,
      acceptedRequests: acceptedRequests.count ?? 0,
    } satisfies ProviderStats;
  },

  async getAdminStats() {
    const client = requireSupabase();
    const [
      users,
      providers,
      clients,
      listings,
      pendingListings,
      requests,
      pendingBookings,
      acceptedRequests,
      categories,
      pendingVerifications,
      acceptedBookingValues,
    ] = await Promise.all([
      client.from('profiles').select('id', { count: 'exact', head: true }),
      client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'provider'),
      client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
      client.from('listings').select('id', { count: 'exact', head: true }),
      client.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      client.from('booking_requests').select('id', { count: 'exact', head: true }),
      client.from('booking_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      client.from('booking_requests').select('id', { count: 'exact', head: true }).eq('status', 'accepted'),
      client.from('categories').select('id', { count: 'exact', head: true }),
      client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'provider')
        .eq('verification_status', 'pending'),
      client.from('booking_requests').select('quantity, listings ( price )').eq('status', 'accepted'),
    ]);
    // Estimation, pas un chiffre d'affaires réel — voir le commentaire sur
    // `AdminStats.gmvEstimate` (src/types/index.ts) : aucun tarif « /jour »
    // n'est ajusté au nombre de jours de la période réservée.
    const gmvEstimate = (acceptedBookingValues.data ?? []).reduce((sum, row) => {
      const listing = Array.isArray(row.listings) ? row.listings[0] : row.listings;
      return sum + (listing?.price ?? 0) * row.quantity;
    }, 0);
    return {
      users: users.count ?? 0,
      providers: providers.count ?? 0,
      clients: clients.count ?? 0,
      listings: listings.count ?? 0,
      pendingListings: pendingListings.count ?? 0,
      requests: requests.count ?? 0,
      pendingBookings: pendingBookings.count ?? 0,
      acceptedRequests: acceptedRequests.count ?? 0,
      categories: categories.count ?? 0,
      pendingVerifications: pendingVerifications.count ?? 0,
      gmvEstimate,
    } satisfies AdminStats;
  },

  /* Administration -------------------------------------------------------- */

  async adminListUsers(filters: AdminUserFilters) {
    const client = requireSupabase();
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? 10;
    const from = (page - 1) * pageSize;

    let query = client.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (filters.role && filters.role !== 'all') query = query.eq('role', filters.role);
    if (filters.active && filters.active !== 'all') query = query.eq('active', filters.active === 'active');
    if (filters.verification && filters.verification !== 'all') query = query.eq('verification_status', filters.verification);
    if (filters.search) {
      const term = filters.search.replace(/[%,()]/g, ' ').trim();
      if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
    }

    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) throw toAppError(error);
    const total = count ?? 0;
    return {
      items: (data ?? []) as Profile[],
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    } satisfies Paginated<Profile>;
  },

  async adminUpdateUser(id: string, patch: { role?: UserRole; active?: boolean }) {
    const client = requireSupabase();
    const { data, error } = await client.from('profiles').update(patch).eq('id', id).select('*').single();
    if (error) throw toAppError(error);
    return data as Profile;
  },

  async adminListActivity(limit = 20) {
    const client = requireSupabase();
    const [createdBookings, resolvedBookings, moderatedListings, newProviders, verificationEvents] = await Promise.all([
      client
        .from('booking_requests')
        .select('id, created_at, client:profiles!booking_requests_client_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(limit),
      client
        .from('booking_requests')
        .select(
          'id, status, updated_at, client:profiles!booking_requests_client_id_fkey(full_name), provider:profiles!booking_requests_provider_id_fkey(full_name)',
        )
        .in('status', ['accepted', 'rejected', 'cancelled'])
        .order('updated_at', { ascending: false })
        .limit(limit),
      client
        .from('listings')
        .select('id, title, status, moderated_at, provider:profiles!listings_provider_id_fkey(full_name)')
        .in('status', ['published', 'rejected'])
        .not('moderated_at', 'is', null)
        .order('moderated_at', { ascending: false })
        .limit(limit),
      client.from('profiles').select('id, full_name, created_at').eq('role', 'provider').order('created_at', { ascending: false }).limit(limit),
      client
        .from('profiles')
        .select('id, full_name, verification_status, verification_requested_at, verified_at')
        .eq('role', 'provider')
        .in('verification_status', ['pending', 'verified'])
        .order('updated_at', { ascending: false })
        .limit(limit),
    ]);

    const events: AdminActivityEvent[] = [];
    for (const b of createdBookings.data ?? []) {
      events.push({
        id: `${b.id}-created`,
        type: 'booking_created',
        label: 'Nouvelle demande de réservation',
        actor: one<{ full_name: string }>(b.client)?.full_name ?? null,
        at: b.created_at,
        href: '/admin/operations/reservations',
      });
    }
    for (const b of resolvedBookings.data ?? []) {
      const type = b.status === 'accepted' ? 'booking_accepted' : b.status === 'rejected' ? 'booking_rejected' : 'booking_cancelled';
      const label = b.status === 'accepted' ? 'Demande acceptée' : b.status === 'rejected' ? 'Demande refusée' : 'Demande annulée';
      const actor = b.status === 'cancelled' ? one<{ full_name: string }>(b.client) : one<{ full_name: string }>(b.provider);
      events.push({ id: `${b.id}-${b.status}`, type, label, actor: actor?.full_name ?? null, at: b.updated_at, href: '/admin/operations/reservations' });
    }
    for (const l of moderatedListings.data ?? []) {
      events.push({
        id: `${l.id}-${l.status}`,
        type: l.status === 'published' ? 'listing_published' : 'listing_rejected',
        label: l.status === 'published' ? `Annonce publiée : ${l.title}` : `Annonce refusée : ${l.title}`,
        actor: one<{ full_name: string }>(l.provider)?.full_name ?? null,
        at: l.moderated_at as string,
        href: '/admin/operations/annonces',
      });
    }
    for (const p of newProviders.data ?? []) {
      events.push({
        id: `${p.id}-registered`,
        type: 'provider_registered',
        label: `Nouveau prestataire : ${p.full_name}`,
        actor: p.full_name,
        at: p.created_at,
        href: '/admin/operations/prestataires',
      });
    }
    for (const p of verificationEvents.data ?? []) {
      if (p.verification_status === 'pending' && p.verification_requested_at) {
        events.push({
          id: `${p.id}-verif-requested`,
          type: 'provider_verification_requested',
          label: `Demande de vérification : ${p.full_name}`,
          actor: p.full_name,
          at: p.verification_requested_at,
          href: '/admin/operations/prestataires',
        });
      }
      if (p.verification_status === 'verified' && p.verified_at) {
        events.push({
          id: `${p.id}-verified`,
          type: 'provider_verified',
          label: `Prestataire vérifié : ${p.full_name}`,
          actor: p.full_name,
          at: p.verified_at,
          href: '/admin/operations/prestataires',
        });
      }
    }

    return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  },

  /* Vérification prestataire ------------------------------------------------ */

  async requestProviderVerification(userId: string) {
    const client = requireSupabase();
    const uid = await requireUserId();
    if (uid !== userId) throw new AppError('Accès refusé.', 'forbidden');
    const { data, error } = await client
      .from('profiles')
      .update({ verification_status: 'pending' })
      .eq('id', userId)
      .select('*')
      .single();
    if (error) throw toAppError(error);
    return data as Profile;
  },

  async adminSetProviderVerification(id: string, status: ProviderVerificationStatus, note?: string | null) {
    const client = requireSupabase();
    if (status === 'rejected' && !note?.trim()) {
      throw new AppError('Un rejet de vérification doit être motivé.', 'invalid_input');
    }
    const { data, error } = await client
      .from('profiles')
      .update({ verification_status: status, verification_note: status === 'rejected' ? note?.trim() : null })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw toAppError(error);
    return data as Profile;
  },
};

/** Extrait le chemin Storage d'une URL publique Supabase. */
function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}
