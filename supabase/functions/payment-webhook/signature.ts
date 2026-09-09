/**
 * Vérification de signature de webhook — fonctions pures, sans dépendance
 * Deno ni Node : utilisables aussi bien par la fonction Edge
 * (`index.ts`, exécutée par Supabase) que par
 * `tests/unit/payment-webhook-signature.test.ts` (exécuté par Vitest sous
 * Node). Les deux runtimes exposent la Web Crypto API globalement, donc ce
 * fichier n'importe rien de spécifique à l'un ou l'autre.
 *
 * Voir docs/specs/PAYMENT-FLOW.md — vérification obligatoire n°1 avant tout
 * autre traitement d'un webhook.
 */

const encoder = new TextEncoder();

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Comparaison en temps constant : une comparaison `===` classique quitte
 * dès le premier octet différent, ce qui laisse fuir — par le temps de
 * réponse — combien d'octets de tête un attaquant a déjà devinés.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export interface SignatureCheck {
  valid: boolean;
  /** Raison de l'échec, journalisée dans `payment_events.rejection_reason`. */
  reason?: string;
}

/**
 * Vérifie l'en-tête `Wave-Signature` d'un webhook Wave.
 *
 * Format documenté : `t=<timestamp unix>,v1=<hmac-sha256 hex>[,v1=<autre>...]`
 * (plusieurs `v1=` possibles pendant une rotation de clé — voir
 * https://docs.wave.com/webhook, consulté pour cette implémentation).
 *
 * Chaîne signée : `timestamp` (tel quel, en chaîne) concaténé DIRECTEMENT
 * (sans séparateur) au corps brut de la requête. `rawBody` doit être la
 * chaîne exactement reçue — jamais un JSON reparsé puis réémis, l'ordre des
 * clés ou un espace en plus suffit à invalider la signature.
 */
export async function verifyWaveSignature(
  header: string | null,
  rawBody: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  maxAgeSeconds = 300,
): Promise<SignatureCheck> {
  if (!header) return { valid: false, reason: 'En-tête Wave-Signature absent.' };

  const segments = header.split(',').map((part) => part.trim());
  const timestamp = segments.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = segments.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) {
    return { valid: false, reason: 'En-tête Wave-Signature mal formé.' };
  }

  const age = nowSeconds - Number(timestamp);
  if (!Number.isFinite(age) || age > maxAgeSeconds || age < -maxAgeSeconds) {
    return { valid: false, reason: 'Horodatage du webhook hors fenêtre de validité (rejeu possible).' };
  }

  const expected = await hmacSha256Hex(secret, timestamp + rawBody);
  const matches = signatures.some((sig) => timingSafeEqualHex(sig, expected));
  if (!matches) return { valid: false, reason: 'Signature Wave invalide.' };

  return { valid: true };
}

/**
 * Vérifie un webhook Orange Money.
 *
 * ⚠️ Aucune documentation publique canonique de l'API Orange Money Sénégal
 * n'a été trouvée au moment de l'écriture (l'intégration passe en général
 * par un contrat marchand direct dont les détails webhook varient). Ce qui
 * suit est un schéma HMAC-SHA256 générique — en-tête contenant la signature
 * hexadécimale du corps brut — à CONFIRMER avec le contrat d'intégration
 * réel avant toute mise en production. Ne pas faire confiance à ces noms de
 * champs sans les vérifier auprès d'Orange Money / du partenaire technique.
 */
export async function verifyOrangeMoneySignature(
  header: string | null,
  rawBody: string,
  secret: string,
): Promise<SignatureCheck> {
  if (!header) return { valid: false, reason: 'En-tête de signature Orange Money absent.' };

  const expected = await hmacSha256Hex(secret, rawBody);
  if (!timingSafeEqualHex(header.trim(), expected)) {
    return { valid: false, reason: 'Signature Orange Money invalide.' };
  }
  return { valid: true };
}
