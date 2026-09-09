/**
 * Stratégie globale de gestion d'erreurs.
 *
 * Aucune erreur technique (code Postgres, message Supabase brut) ne doit être
 * affichée à l'utilisateur : on la journalise en développement et on renvoie un
 * message français compréhensible.
 */

export class AppError extends Error {
  readonly code: string;
  readonly cause?: unknown;

  constructor(message: string, code = 'unknown', cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

const GENERIC = "Cette action n'a pas pu être effectuée. Veuillez réessayer.";

/** Messages métier associés aux codes d'erreur Postgres / Supabase Auth. */
const MESSAGES: Record<string, string> = {
  // Auth
  invalid_credentials: 'E-mail ou mot de passe incorrect.',
  invalid_login_credentials: 'E-mail ou mot de passe incorrect.',
  email_not_confirmed: 'Veuillez confirmer votre adresse e-mail avant de vous connecter.',
  user_already_exists: 'Un compte existe déjà avec cette adresse e-mail.',
  email_exists: 'Un compte existe déjà avec cette adresse e-mail.',
  weak_password: 'Le mot de passe est trop simple. Utilisez au moins 8 caractères, lettres et chiffres.',
  over_email_send_rate_limit: 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.',
  over_request_rate_limit: 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.',
  same_password: 'Le nouveau mot de passe doit être différent de l’ancien.',
  session_not_found: 'Votre session a expiré. Veuillez vous reconnecter.',

  // Postgres
  '23505': 'Cet élément existe déjà.',
  '23503': 'Cette action est impossible car l’élément est lié à d’autres données.',
  '23514': 'Les informations fournies ne respectent pas les règles de la plateforme.',
  '42501': "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
  PGRST116: 'Élément introuvable.',
  PGRST301: 'Votre session a expiré. Veuillez vous reconnecter.',
};

interface SupabaseLikeError {
  message?: string;
  code?: string;
  status?: number;
  error_description?: string;
}

/** Convertit n'importe quelle erreur en `AppError` prête à être affichée. */
export function toAppError(error: unknown, fallback = GENERIC): AppError {
  if (error instanceof AppError) return error;

  if (import.meta.env.DEV) {
    // Détail technique réservé au développement.
    console.error('[MAKALO]', error);
  }

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return new AppError('Impossible de contacter le serveur. Vérifiez votre connexion internet.', 'network', error);
  }

  const raw = error as SupabaseLikeError | null;
  const code = raw?.code ?? '';
  if (code && MESSAGES[code]) return new AppError(MESSAGES[code], code, error);

  const message = raw?.message ?? raw?.error_description ?? '';
  const normalized = message.toLowerCase().replace(/\s+/g, '_');
  for (const key of Object.keys(MESSAGES)) {
    if (normalized.includes(key.toLowerCase())) return new AppError(MESSAGES[key], key, error);
  }
  if (/failed_to_fetch|networkerror/.test(normalized)) {
    return new AppError('Impossible de contacter le serveur. Vérifiez votre connexion internet.', 'network', error);
  }

  return new AppError(fallback, code || 'unknown', error);
}

/** Message français prêt pour un toast ou un `ErrorState`. */
export function errorMessage(error: unknown, fallback = GENERIC): string {
  return toAppError(error, fallback).message;
}
