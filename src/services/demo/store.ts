import type { BookingRequest, Category, Favorite, Listing, ListingImage, Notification, Profile } from '@/types';
import {
  demoBookings,
  demoCategories,
  demoFavorites,
  demoListingImages,
  demoListings,
  demoNotifications,
  demoProfiles,
} from './data';

export interface DemoState {
  profiles: Profile[];
  categories: Category[];
  listings: Listing[];
  listingImages: ListingImage[];
  favorites: Favorite[];
  bookings: BookingRequest[];
  notifications: Notification[];
  /** Mots de passe des comptes créés pendant la session de démonstration. */
  credentials: Record<string, string>;
  currentUserId: string | null;
}

const STORAGE_KEY = 'makalo-demo-state-v1';

function seed(): DemoState {
  return {
    profiles: structuredClone(demoProfiles),
    categories: structuredClone(demoCategories),
    listings: structuredClone(demoListings),
    listingImages: structuredClone(demoListingImages),
    favorites: structuredClone(demoFavorites),
    bookings: structuredClone(demoBookings),
    notifications: structuredClone(demoNotifications),
    credentials: {},
    currentUserId: null,
  };
}

let state: DemoState = seed();
let hydrated = false;

/**
 * Persistance locale du MODE DÉMONSTRATION uniquement.
 * Elle évite de perdre la session au rafraîchissement de la page. Aucune donnée
 * métier réelle n'est stockée ici : en mode Supabase ce fichier n'est jamais
 * chargé et la persistance est assurée par Postgres.
 */
function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    state = { ...state, ...parsed };
  } catch {
    // Un état corrompu ne doit jamais empêcher l'application de démarrer.
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function getState(): DemoState {
  hydrate();
  return state;
}

export function persist(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota dépassé ou stockage indisponible : la démonstration continue en mémoire.
  }
}

export function mutate(updater: (draft: DemoState) => void): void {
  hydrate();
  updater(state);
  persist();
}

export function resetDemoState(): void {
  state = seed();
  hydrated = true;
  persist();
}
