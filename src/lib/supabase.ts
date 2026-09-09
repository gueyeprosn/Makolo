import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * L'application fonctionne dans deux modes :
 *  - MODE SUPABASE  : les variables d'environnement sont présentes, toutes les
 *    données transitent par Supabase (Auth + Postgres + Storage + RLS).
 *  - MODE DÉMO      : aucune variable n'est configurée, un backend de
 *    démonstration en mémoire prend le relais (voir services/demo-backend.ts).
 *    Ce mode sert uniquement à faire tourner l'interface : il est totalement
 *    isolé de la couche Supabase et n'est jamais utilisé en production.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'makalo-auth',
      },
    })
  : null;

/** Accès au client Supabase avec garde explicite (usage interne au backend). */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase non configuré : renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}
