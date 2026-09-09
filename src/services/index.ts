import { isSupabaseConfigured } from '@/lib/supabase';
import type { MakaloBackend } from './backend';
import { demoBackend } from './demo-backend';
import { supabaseBackend } from './supabase-backend';

/**
 * Point d'entrée unique de la couche données.
 *
 * L'interface n'importe jamais directement `supabaseBackend` ou `demoBackend` :
 * elle consomme `api`, ce qui garantit qu'un basculement vers Supabase ne
 * demande aucune modification des composants.
 */
export const api: MakaloBackend = isSupabaseConfigured ? supabaseBackend : demoBackend;

export const isDemoMode = api.mode === 'demo';

export type { MakaloBackend } from './backend';
export type { AdminUserFilters, CreateBookingInput, SignUpResult } from './backend';
