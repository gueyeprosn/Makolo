import { describe, expect, it } from 'vitest';
import { demoBackend } from '@/services/demo-backend';
import { DEMO_PASSWORD } from '@/services/demo/data';

/**
 * Couvre, à travers le vrai backend démo (et non une réimplémentation), la
 * machine à états de vérification d'identité prestataire — miroir du
 * trigger SQL `enforce_provider_verification_transition()`
 * (scripts/sql/01_schema.sql), déjà vérifié sur PostgreSQL réel.
 */
describe('vérification d’identité prestataire', () => {
  const UNVERIFIED_EMAIL = 'tentes.baobab@example.sn'; // usr-provider-3 : unverified
  const PENDING_EMAIL = 'sonoteranga@example.sn'; // usr-provider-2 : pending (jeu de démonstration)
  const REJECTED_EMAIL = 'decor.lumiere@example.sn'; // usr-provider-4 : rejected
  const ADMIN_EMAIL = 'admin@makalo.sn';

  it('un prestataire non vérifié peut demander une vérification', async () => {
    const user = await demoBackend.signIn(UNVERIFIED_EMAIL, DEMO_PASSWORD);
    const updated = await demoBackend.requestProviderVerification(user.id);
    expect(updated.verification_status).toBe('pending');
    expect(updated.verification_requested_at).not.toBeNull();
  });

  it('un prestataire déjà en attente ne peut pas redemander une vérification', async () => {
    const user = await demoBackend.signIn(PENDING_EMAIL, DEMO_PASSWORD);
    expect(user.profile.verification_status).toBe('pending');
    await expect(demoBackend.requestProviderVerification(user.id)).rejects.toMatchObject({
      code: 'invalid_state',
    });
  });

  it('un prestataire rejeté peut redemander une vérification', async () => {
    const user = await demoBackend.signIn(REJECTED_EMAIL, DEMO_PASSWORD);
    const updated = await demoBackend.requestProviderVerification(user.id);
    expect(updated.verification_status).toBe('pending');
    expect(updated.verification_note).toBeNull();
  });

  it('un prestataire ne peut pas demander la vérification d’un autre compte', async () => {
    await demoBackend.signIn(UNVERIFIED_EMAIL, DEMO_PASSWORD);
    await expect(demoBackend.requestProviderVerification('usr-admin')).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it('un administrateur ne peut pas rejeter une vérification sans motif', async () => {
    await demoBackend.signIn(ADMIN_EMAIL, DEMO_PASSWORD);
    await expect(demoBackend.adminSetProviderVerification('usr-provider-2', 'rejected')).rejects.toMatchObject({
      code: 'invalid_input',
    });
  });

  it('un administrateur peut vérifier un prestataire en attente', async () => {
    await demoBackend.signIn(ADMIN_EMAIL, DEMO_PASSWORD);
    const updated = await demoBackend.adminSetProviderVerification('usr-provider-2', 'verified');
    expect(updated.verification_status).toBe('verified');
    expect(updated.verified_at).not.toBeNull();
  });

  it('un administrateur peut rejeter avec un motif, qui est conservé', async () => {
    await demoBackend.signIn(ADMIN_EMAIL, DEMO_PASSWORD);
    const updated = await demoBackend.adminSetProviderVerification('usr-provider-2', 'rejected', 'Pièce illisible.');
    expect(updated.verification_status).toBe('rejected');
    expect(updated.verification_note).toBe('Pièce illisible.');
    expect(updated.verified_at).toBeNull();
  });

  it('un compte non-admin ne peut pas décider d’une vérification', async () => {
    await demoBackend.signIn(UNVERIFIED_EMAIL, DEMO_PASSWORD);
    await expect(demoBackend.adminSetProviderVerification('usr-provider-2', 'verified')).rejects.toMatchObject({
      code: 'forbidden',
    });
  });
});
