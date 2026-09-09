import { describe, expect, it } from 'vitest';
import { verifyOrangeMoneySignature, verifyWaveSignature } from '../../supabase/functions/payment-webhook/signature';

/**
 * Vérifie la fonction de vérification de signature du webhook de paiement
 * (chantier n°2, docs/specs/PAYMENT-FLOW.md), avant même de savoir si un
 * compte marchand réel est un jour branché : une signature mal vérifiée
 * rendrait tout le reste du flux — idempotence, montant, statut — sans
 * objet, puisque n'importe qui pourrait alors forger un webhook.
 */

const SECRET = 'wave_sn_WHS_test_secret_do_not_use_in_prod';

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('verifyWaveSignature', () => {
  const rawBody = '{"id":"evt_1","type":"checkout.session.completed","data":{"amount":"1000"}}';

  it('accepte une signature valide et fraîche', async () => {
    const now = 1_700_000_000;
    const sig = await hmacSha256Hex(SECRET, String(now) + rawBody);
    const header = `t=${now},v1=${sig}`;
    const result = await verifyWaveSignature(header, rawBody, SECRET, now);
    expect(result.valid).toBe(true);
  });

  it('refuse une signature qui ne correspond pas au corps', async () => {
    const now = 1_700_000_000;
    const sig = await hmacSha256Hex(SECRET, String(now) + rawBody);
    const header = `t=${now},v1=${sig}`;
    const result = await verifyWaveSignature(header, rawBody + ' altéré', SECRET, now);
    expect(result.valid).toBe(false);
  });

  it('refuse une signature calculée avec un autre secret', async () => {
    const now = 1_700_000_000;
    const sig = await hmacSha256Hex('un-autre-secret', String(now) + rawBody);
    const header = `t=${now},v1=${sig}`;
    const result = await verifyWaveSignature(header, rawBody, SECRET, now);
    expect(result.valid).toBe(false);
  });

  it('refuse un webhook rejoué hors de la fenêtre de 5 minutes', async () => {
    const eventTime = 1_700_000_000;
    const sig = await hmacSha256Hex(SECRET, String(eventTime) + rawBody);
    const header = `t=${eventTime},v1=${sig}`;
    const muchLater = eventTime + 600; // 10 minutes plus tard
    const result = await verifyWaveSignature(header, rawBody, SECRET, muchLater);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('fenêtre');
  });

  it('accepte l’une des signatures valides pendant une rotation de clé (plusieurs v1=)', async () => {
    const now = 1_700_000_000;
    const currentSig = await hmacSha256Hex(SECRET, String(now) + rawBody);
    const header = `t=${now},v1=signature-obsolete-invalide,v1=${currentSig}`;
    const result = await verifyWaveSignature(header, rawBody, SECRET, now);
    expect(result.valid).toBe(true);
  });

  it('refuse un en-tête absent', async () => {
    const result = await verifyWaveSignature(null, rawBody, SECRET);
    expect(result.valid).toBe(false);
  });

  it('refuse un en-tête mal formé', async () => {
    const result = await verifyWaveSignature('n’importe-quoi', rawBody, SECRET);
    expect(result.valid).toBe(false);
  });
});

describe('verifyOrangeMoneySignature', () => {
  const rawBody = '{"transaction_id":"om_1","amount":1000,"status":"SUCCESS"}';

  it('accepte une signature HMAC-SHA256 valide du corps brut', async () => {
    const sig = await hmacSha256Hex(SECRET, rawBody);
    const result = await verifyOrangeMoneySignature(sig, rawBody, SECRET);
    expect(result.valid).toBe(true);
  });

  it('refuse une signature invalide', async () => {
    const result = await verifyOrangeMoneySignature('0'.repeat(64), rawBody, SECRET);
    expect(result.valid).toBe(false);
  });

  it('refuse un en-tête absent', async () => {
    const result = await verifyOrangeMoneySignature(null, rawBody, SECRET);
    expect(result.valid).toBe(false);
  });
});
