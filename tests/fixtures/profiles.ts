import type { Profile, UserRole } from '@/types';

/** Profils de test — toutes les données sont fictives. */
function make(id: string, role: UserRole, overrides: Partial<Profile> = {}): Profile {
  return {
    id,
    email: `${id}@example.test`,
    full_name: `Compte ${id}`,
    phone: null,
    avatar_url: null,
    role,
    city: 'Dakar',
    bio: null,
    active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export const admin = make('admin', 'admin', { full_name: 'Awa Ndiaye' });
export const client = make('client', 'client', { full_name: 'Fatou Sarr' });
export const provider = make('provider', 'provider', { full_name: 'Ibrahima Fall' });
export const otherProvider = make('provider-2', 'provider', { full_name: 'Sono Teranga' });
export const suspendedProvider = make('provider-3', 'provider', { active: false });
