import { describe, expect, it } from 'vitest';
import {
  canAnswerBooking,
  canCancelBooking,
  canEditListing,
  canModerate,
  canRequestBooking,
  canSeeProviderPhone,
  isAdmin,
  isProvider,
} from '@/lib/permissions';
import { admin, client, otherProvider, provider, suspendedProvider } from '../fixtures/profiles';

const publishedListing = { provider_id: provider.id, status: 'published' as const, availability_status: true };
const draftListing = { provider_id: provider.id, status: 'draft' as const, availability_status: true };
const pausedListing = { provider_id: provider.id, status: 'published' as const, availability_status: false };

describe('rôles', () => {
  it('reconnaît les rôles actifs', () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isProvider(provider)).toBe(true);
    expect(isAdmin(client)).toBe(false);
  });

  it('un compte désactivé perd tous ses rôles', () => {
    expect(isProvider(suspendedProvider)).toBe(false);
    expect(canEditListing(suspendedProvider, publishedListing)).toBe(false);
  });

  it('un visiteur non authentifié n’a aucun droit', () => {
    expect(isAdmin(null)).toBe(false);
    expect(canEditListing(null, publishedListing)).toBe(false);
    expect(canRequestBooking(undefined, publishedListing)).toBe(false);
  });
});

describe('canEditListing — cloisonnement entre prestataires', () => {
  it('le propriétaire peut modifier son annonce', () => {
    expect(canEditListing(provider, publishedListing)).toBe(true);
  });

  it('un autre prestataire ne peut pas', () => {
    expect(canEditListing(otherProvider, publishedListing)).toBe(false);
  });

  it('un client ne peut pas, même sur une annonce publiée', () => {
    expect(canEditListing(client, publishedListing)).toBe(false);
  });

  it('l’administrateur peut modérer n’importe quelle annonce', () => {
    expect(canEditListing(admin, publishedListing)).toBe(true);
    expect(canModerate(admin)).toBe(true);
    expect(canModerate(provider)).toBe(false);
  });
});

describe('canRequestBooking', () => {
  it('un client peut réserver une annonce publiée et disponible', () => {
    expect(canRequestBooking(client, publishedListing)).toBe(true);
  });

  it('refuse une annonce non publiée', () => {
    expect(canRequestBooking(client, draftListing)).toBe(false);
  });

  it('refuse une annonce mise en pause par son prestataire', () => {
    expect(canRequestBooking(client, pausedListing)).toBe(false);
  });

  it('un prestataire ne réserve pas sa propre annonce', () => {
    expect(canRequestBooking(provider, publishedListing)).toBe(false);
  });

  it('un autre prestataire peut être client — mais son rôle ne l’y autorise pas', () => {
    // Règle métier : seuls les rôles client et admin passent commande.
    expect(canRequestBooking(otherProvider, publishedListing)).toBe(false);
  });
});

describe('cycle de vie d’une demande', () => {
  const pending = { provider_id: provider.id, client_id: client.id, status: 'pending' as const };
  const accepted = { provider_id: provider.id, client_id: client.id, status: 'accepted' as const };

  it('le prestataire concerné répond à une demande en attente', () => {
    expect(canAnswerBooking(provider, pending)).toBe(true);
  });

  it('un autre prestataire ne répond pas à la place', () => {
    expect(canAnswerBooking(otherProvider, pending)).toBe(false);
  });

  it('le client ne répond pas à sa propre demande', () => {
    expect(canAnswerBooking(client, pending)).toBe(false);
  });

  it('une demande déjà traitée n’est plus modifiable', () => {
    expect(canAnswerBooking(provider, accepted)).toBe(false);
    expect(canCancelBooking(client, accepted)).toBe(false);
  });

  it('le client annule sa demande tant qu’elle est en attente', () => {
    expect(canCancelBooking(client, pending)).toBe(true);
  });

  it('un tiers n’annule pas la demande d’autrui', () => {
    expect(canCancelBooking(otherProvider, pending)).toBe(false);
  });
});

describe('confidentialité du téléphone', () => {
  it('masqué pour un visiteur', () => {
    expect(canSeeProviderPhone(null)).toBe(false);
  });

  it('visible pour un compte connecté et actif', () => {
    expect(canSeeProviderPhone(client)).toBe(true);
  });

  it('masqué pour un compte désactivé', () => {
    expect(canSeeProviderPhone(suspendedProvider)).toBe(false);
  });
});
