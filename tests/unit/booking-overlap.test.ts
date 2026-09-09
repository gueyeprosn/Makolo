import { describe, expect, it } from 'vitest';
import { demoBackend, eachDateInRange, rangesOverlap } from '@/services/demo-backend';
import { toISODate } from '@/lib/utils';

/**
 * Couvre la logique de chevauchement de périodes, miroir de la contrainte
 * d'exclusion GiST `bookings_no_duplicate_pending` (scripts/sql/01_schema.sql)
 * et de l'agrégation « pire jour » de `check_booking_capacity()` /
 * `listing_availability()`. Voir docs/specs/BOOKING-LIFECYCLE.md.
 */

describe('rangesOverlap', () => {
  it('détecte deux périodes identiques', () => {
    expect(rangesOverlap('2026-01-10', '2026-01-15', '2026-01-10', '2026-01-15')).toBe(true);
  });

  it('détecte un chevauchement partiel', () => {
    expect(rangesOverlap('2026-01-10', '2026-01-15', '2026-01-14', '2026-01-20')).toBe(true);
    expect(rangesOverlap('2026-01-14', '2026-01-20', '2026-01-10', '2026-01-15')).toBe(true);
  });

  it('détecte un contact borne à borne comme un chevauchement (bornes incluses)', () => {
    expect(rangesOverlap('2026-01-10', '2026-01-15', '2026-01-15', '2026-01-20')).toBe(true);
  });

  it('ne détecte aucun chevauchement pour deux périodes disjointes', () => {
    expect(rangesOverlap('2026-01-01', '2026-01-05', '2026-01-10', '2026-01-15')).toBe(false);
    expect(rangesOverlap('2026-01-10', '2026-01-15', '2026-01-01', '2026-01-05')).toBe(false);
  });

  it('détecte une période englobante', () => {
    expect(rangesOverlap('2026-01-01', '2026-01-31', '2026-01-10', '2026-01-12')).toBe(true);
  });

  it('gère un jour unique (from === to)', () => {
    expect(rangesOverlap('2026-01-10', '2026-01-10', '2026-01-10', '2026-01-10')).toBe(true);
    expect(rangesOverlap('2026-01-10', '2026-01-10', '2026-01-11', '2026-01-11')).toBe(false);
  });
});

describe('eachDateInRange', () => {
  it('renvoie un seul jour quand from === to', () => {
    expect(eachDateInRange('2026-03-01', '2026-03-01')).toEqual(['2026-03-01']);
  });

  it('renvoie toutes les dates, bornes incluses', () => {
    expect(eachDateInRange('2026-03-01', '2026-03-04')).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
    ]);
  });

  it('traverse correctement un changement de mois', () => {
    expect(eachDateInRange('2026-01-30', '2026-02-02')).toEqual([
      '2026-01-30',
      '2026-01-31',
      '2026-02-01',
      '2026-02-02',
    ]);
  });
});

/**
 * Vérifie, à travers le vrai backend démo (et non une réimplémentation),
 * que deux demandes en attente du même client dont les périodes se
 * chevauchent sont refusées, alors que deux demandes contiguës mais
 * disjointes sont toutes deux acceptées — exactement le scénario validé
 * manuellement par un test Playwright de bout en bout sur l'interface.
 */
describe('demoBackend.createBooking — chevauchement de périodes', () => {
  const CHAISES_ID = 'lst-chaise-plastique'; // stock abondant (600 unités)
  const inDays = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return toISODate(d);
  };

  it('refuse une deuxième demande en attente qui chevauche la première', async () => {
    await demoBackend.signIn('client@makalo.sn', 'Makalo2026');

    const from = inDays(200);
    const to = inDays(203);
    await demoBackend.createBooking({ listing_id: CHAISES_ID, requested_from: from, requested_to: to, quantity: 1 });

    await expect(
      demoBackend.createBooking({
        listing_id: CHAISES_ID,
        requested_from: inDays(202),
        requested_to: inDays(205),
        quantity: 1,
      }),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('accepte une demande sur une période disjointe (contiguë) de la même annonce', async () => {
    await demoBackend.signIn('client@makalo.sn', 'Makalo2026');

    const from = inDays(300);
    const to = inDays(303);
    await demoBackend.createBooking({ listing_id: CHAISES_ID, requested_from: from, requested_to: to, quantity: 1 });

    // Le jour suivant la reprise : aucune période commune, donc acceptée.
    await expect(
      demoBackend.createBooking({
        listing_id: CHAISES_ID,
        requested_from: inDays(304),
        requested_to: inDays(306),
        quantity: 1,
      }),
    ).resolves.toBeUndefined();
  });
});
