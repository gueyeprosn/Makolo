// Supabase Edge Function (Deno) — chantier n°2, docs/specs/PAYMENT-FLOW.md.
//
// FONDATION UNIQUEMENT : reçoit et traite les webhooks Wave / Orange Money
// une fois qu'une intention de paiement existe déjà (booking_requests.
// payment_reference posé par une étape encore à construire, qui suppose un
// vrai compte marchand — voir la note "Ce qui manque encore" en bas de ce
// fichier). Aucun compte marchand réel n'est branché dans ce dépôt : ce
// code n'a jamais été exercé contre un webhook Wave/Orange Money réel.
//
// Ce fichier tourne sous Deno (runtime des fonctions Edge Supabase), jamais
// dans le navigateur : c'est précisément le "service serveur hors de cette
// SPA" que ROADMAP.md exige pour ce chantier. `SUPABASE_SERVICE_ROLE_KEY`
// n'existe que dans les variables d'environnement de cette fonction — il ne
// doit jamais apparaître dans le bundle Vite (voir docs/SECURITY.md).
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyOrangeMoneySignature, verifyWaveSignature } from './signature.ts';

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WAVE_WEBHOOK_SECRET = Deno.env.get('WAVE_WEBHOOK_SECRET');
const ORANGE_MONEY_WEBHOOK_SECRET = Deno.env.get('ORANGE_MONEY_WEBHOOK_SECRET');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type Provider = 'wave' | 'orange_money';

interface NormalizedEvent {
  providerEventId: string;
  eventType: string;
  amount: number | null;
  currency: string | null;
  /** Référence de paiement à retrouver dans booking_requests.payment_reference. */
  reference: string | null;
  outcome: 'success' | 'failure' | 'unknown';
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/**
 * Payload documenté par https://docs.wave.com/webhook (consulté pour cette
 * implémentation) :
 * { id, type, data: { id, amount, currency, payment_status, checkout_status } }
 */
function normalizeWave(payload: any): NormalizedEvent {
  const data = payload?.data ?? {};
  const type = String(payload?.type ?? '');
  const succeeded = type === 'checkout.session.completed' && data.checkout_status === 'complete' && data.payment_status === 'succeeded';
  const failed = type === 'checkout.session.payment_failed';
  return {
    providerEventId: String(payload?.id ?? ''),
    eventType: type,
    amount: data.amount != null ? Number(data.amount) : null,
    currency: data.currency ?? null,
    reference: data.id != null ? String(data.id) : null,
    outcome: succeeded ? 'success' : failed ? 'failure' : 'unknown',
  };
}

/**
 * ⚠️ Schéma non confirmé — voir signature.ts. Champs génériques les plus
 * courants pour ce type d'API ; à vérifier avec le contrat d'intégration
 * réel avant mise en production.
 */
function normalizeOrangeMoney(payload: any): NormalizedEvent {
  const status = String(payload?.status ?? '').toUpperCase();
  return {
    providerEventId: String(payload?.transaction_id ?? payload?.id ?? ''),
    eventType: status || 'unknown',
    amount: payload?.amount != null ? Number(payload.amount) : null,
    currency: payload?.currency ?? null,
    reference: payload?.transaction_id != null ? String(payload.transaction_id) : null,
    outcome: status === 'SUCCESS' || status === 'SUCCESSFUL' ? 'success' : status === 'FAILED' ? 'failure' : 'unknown',
  };
}

async function logEvent(params: {
  bookingId: string | null;
  provider: Provider;
  providerEventId: string;
  eventType: string;
  amount: number | null;
  currency: string | null;
  outcome: 'accepted' | 'rejected';
  rejectionReason: string | null;
  rawPayload: unknown;
}) {
  const { error } = await supabase.from('payment_events').insert({
    booking_id: params.bookingId,
    provider: params.provider,
    provider_event_id: params.providerEventId,
    event_type: params.eventType,
    amount: params.amount,
    currency: params.currency,
    outcome: params.outcome,
    rejection_reason: params.rejectionReason,
    raw_payload: params.rawPayload,
  });
  // Un conflit sur (provider, provider_event_id) signifie que ce même
  // événement a déjà été journalisé — c'est l'idempotence attendue, pas une
  // erreur à remonter à l'appelant.
  if (error && error.code !== '23505') {
    console.error('Échec de journalisation payment_events', error);
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const provider: Provider | null = url.pathname.endsWith('/wave')
    ? 'wave'
    : url.pathname.endsWith('/orange-money')
      ? 'orange_money'
      : null;

  if (req.method !== 'POST' || !provider) {
    return json(404, { error: 'Route inconnue. Utilisez /payment-webhook/wave ou /payment-webhook/orange-money.' });
  }

  const secret = provider === 'wave' ? WAVE_WEBHOOK_SECRET : ORANGE_MONEY_WEBHOOK_SECRET;
  if (!secret) {
    console.error(`Secret de webhook manquant pour ${provider} — variable d'environnement non configurée.`);
    return json(500, { error: 'Configuration serveur incomplète.' });
  }

  // Vérification n°1 (docs/specs/PAYMENT-FLOW.md) : la signature, AVANT tout
  // autre traitement. `rawBody` est la chaîne brute — jamais reparsée puis
  // réémise avant ce contrôle.
  const rawBody = await req.text();
  const signatureCheck =
    provider === 'wave'
      ? await verifyWaveSignature(req.headers.get('Wave-Signature'), rawBody, secret)
      : await verifyOrangeMoneySignature(req.headers.get('X-Signature'), rawBody, secret);

  let payload: any = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // Corps illisible : impossible d'extraire un provider_event_id fiable,
    // donc impossible de garantir l'idempotence de CE log — on journalise
    // quand même pour la traçabilité, avec un identifiant de secours.
    await logEvent({
      bookingId: null,
      provider,
      providerEventId: `corps-invalide-${crypto.randomUUID()}`,
      eventType: 'unknown',
      amount: null,
      currency: null,
      outcome: 'rejected',
      rejectionReason: 'Corps de requête JSON invalide.',
      rawPayload: rawBody,
    });
    return json(400, { error: 'Corps JSON invalide.' });
  }

  const normalized = provider === 'wave' ? normalizeWave(payload) : normalizeOrangeMoney(payload);

  if (!signatureCheck.valid) {
    await logEvent({
      bookingId: null,
      provider,
      providerEventId: normalized.providerEventId || `signature-invalide-${crypto.randomUUID()}`,
      eventType: normalized.eventType,
      amount: normalized.amount,
      currency: normalized.currency,
      outcome: 'rejected',
      rejectionReason: signatureCheck.reason ?? 'Signature invalide.',
      rawPayload: payload,
    });
    return json(401, { error: 'Signature invalide.' });
  }

  // Vérification n°2 : idempotence. Un même provider_event_id déjà reçu ne
  // doit produire aucun effet une seconde fois (retry réseau du provider,
  // replay). La contrainte UNIQUE (provider, provider_event_id) sur
  // `payment_events` porte cette garantie au niveau base ; on la vérifie
  // aussi ici pour répondre 200 sans reprocessing, sans dépendre de la
  // capture d'exception.
  const { data: existing } = await supabase
    .from('payment_events')
    .select('id')
    .eq('provider', provider)
    .eq('provider_event_id', normalized.providerEventId)
    .maybeSingle();
  if (existing) {
    return json(200, { received: true, deduplicated: true });
  }

  if (normalized.outcome === 'unknown') {
    // Type d'événement qu'on ne traite pas encore (ex. remboursement) :
    // journalisé pour audit, mais aucune transition de payment_status.
    await logEvent({
      bookingId: null,
      provider,
      providerEventId: normalized.providerEventId,
      eventType: normalized.eventType,
      amount: normalized.amount,
      currency: normalized.currency,
      outcome: 'rejected',
      rejectionReason: `Type d'événement non traité par cette fondation : ${normalized.eventType}.`,
      rawPayload: payload,
    });
    return json(200, { received: true, handled: false });
  }

  // Vérification n°5 : la demande référencée existe et attend un paiement.
  // On la retrouve par `payment_reference`, posé par l'étape de création de
  // l'intention de paiement — voir la note en bas de ce fichier : cette
  // étape n'est pas construite dans ce dépôt, donc aucune ligne ne peut
  // matcher tant qu'elle ne l'est pas. C'est le comportement honnête :
  // rejeter, pas fabriquer une correspondance.
  const { data: booking } = normalized.reference
    ? await supabase
        .from('booking_requests')
        .select('id, status, payment_status, deposit_amount')
        .eq('payment_reference', normalized.reference)
        .maybeSingle()
    : { data: null };

  if (!booking) {
    await logEvent({
      bookingId: null,
      provider,
      providerEventId: normalized.providerEventId,
      eventType: normalized.eventType,
      amount: normalized.amount,
      currency: normalized.currency,
      outcome: 'rejected',
      rejectionReason: `Aucune demande ne correspond à la référence de paiement "${normalized.reference ?? ''}".`,
      rawPayload: payload,
    });
    return json(404, { error: 'Demande introuvable pour cette référence de paiement.' });
  }

  if (booking.payment_status !== 'pending' || booking.status === 'cancelled' || booking.status === 'rejected') {
    await logEvent({
      bookingId: booking.id,
      provider,
      providerEventId: normalized.providerEventId,
      eventType: normalized.eventType,
      amount: normalized.amount,
      currency: normalized.currency,
      outcome: 'rejected',
      rejectionReason: `La demande n'est plus dans un état où un paiement est attendu (booking_status=${booking.status}, payment_status=${booking.payment_status}).`,
      rawPayload: payload,
    });
    return json(409, { error: "Cette demande n'attend plus de paiement." });
  }

  if (normalized.outcome === 'success') {
    // Vérifications n°3 et n°4 : montant et devise, jamais déduits du seul
    // frontend — comparés au montant que LE SERVEUR avait fixé à la
    // création de l'intention (`deposit_amount`), pas recalculés ici.
    if (normalized.currency !== 'XOF') {
      await logEvent({
        bookingId: booking.id,
        provider,
        providerEventId: normalized.providerEventId,
        eventType: normalized.eventType,
        amount: normalized.amount,
        currency: normalized.currency,
        outcome: 'rejected',
        rejectionReason: `Devise inattendue : ${normalized.currency}.`,
        rawPayload: payload,
      });
      return json(409, { error: 'Devise inattendue.' });
    }
    if (normalized.amount !== booking.deposit_amount) {
      await logEvent({
        bookingId: booking.id,
        provider,
        providerEventId: normalized.providerEventId,
        eventType: normalized.eventType,
        amount: normalized.amount,
        currency: normalized.currency,
        outcome: 'rejected',
        rejectionReason: `Montant reçu (${normalized.amount}) différent du montant attendu (${booking.deposit_amount}).`,
        rawPayload: payload,
      });
      return json(409, { error: 'Montant inattendu.' });
    }

    await supabase
      .from('booking_requests')
      .update({ payment_status: 'paid' })
      .eq('id', booking.id);
  } else {
    await supabase
      .from('booking_requests')
      .update({ payment_status: 'failed' })
      .eq('id', booking.id);
  }

  await logEvent({
    bookingId: booking.id,
    provider,
    providerEventId: normalized.providerEventId,
    eventType: normalized.eventType,
    amount: normalized.amount,
    currency: normalized.currency,
    outcome: 'accepted',
    rejectionReason: null,
    rawPayload: payload,
  });

  return json(200, { received: true, handled: true });
});

// ---------------------------------------------------------------------------
// Ce qui manque encore avant un vrai encaissement (voir docs/ROADMAP.md,
// docs/specs/PAYMENT-FLOW.md) :
//
// 1. Un compte marchand Wave / Orange Money réel, et les secrets de webhook
//    correspondants (WAVE_WEBHOOK_SECRET, ORANGE_MONEY_WEBHOOK_SECRET) —
//    sans eux cette fonction ne reçoit jamais de trafic réel.
// 2. L'endpoint « créer une intention de paiement » (appelé quand le client
//    confirme sa demande) : calcule deposit_amount côté serveur, appelle
//    l'API Wave/Orange Money pour créer une session de paiement, pose
//    payment_reference + payment_status='pending' sur la demande, puis
//    redirige le client. Ce fichier ne fait QUE recevoir la confirmation
//    finale ; sans l'étape 2, `normalized.reference` ne correspond jamais à
//    aucune demande, et c'est le comportement correct tant que 2. n'existe
//    pas — jamais une correspondance fabriquée pour la faire marcher.
// 3. Le schéma exact des webhooks Orange Money (voir l'avertissement dans
//    signature.ts) doit être confirmé avec le contrat d'intégration réel.
// 4. Séquestre et reversement au prestataire (docs/specs/PAYMENT-FLOW.md,
//    section « Séquestre et reversement ») ne sont pas construits ici.
// ---------------------------------------------------------------------------
