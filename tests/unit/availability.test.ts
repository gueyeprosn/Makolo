import { describe, expect, it } from 'vitest';
import { buildAvailability } from '@/services/demo-backend';

/**
 * `buildAvailability` est la règle de disponibilité partagée par les deux
 * backends : le backend démo la calcule en mémoire, le backend Supabase la
 * nourrit avec les agrégats renvoyés par la fonction SQL `listing_availability`.
 * Toute divergence ici se traduirait par une double réservation en production.
 */
const listing = (quantity: number, active = true, status: 'published' | 'draft' = 'published') => ({
  quantity,
  availability_status: active,
  status,
});

describe('buildAvailability', () => {
  it('annonce disponible quand rien n’est réservé', () => {
    const result = buildAvailability(listing(400), 0, 0);
    expect(result.state).toBe('available');
    expect(result.remaining).toBe(400);
    expect(result.label).toBe('Disponible');
  });

  it('déduit uniquement les demandes ACCEPTÉES du stock réservable', () => {
    // Les demandes en attente ne bloquent pas le stock : deux clients peuvent
    // demander les mêmes chaises, le prestataire arbitre.
    const result = buildAvailability(listing(400), 120, 0);
    expect(result.remaining).toBe(280);
    expect(result.booked).toBe(120);
  });

  it('signale « en cours de confirmation » quand des demandes sont en attente', () => {
    const result = buildAvailability(listing(400), 0, 50);
    expect(result.state).toBe('partial');
    expect(result.label).toBe('En cours de confirmation');
    expect(result.remaining).toBe(400); // le stock reste réservable
    expect(result.pending).toBe(50);
  });

  it('devient indisponible quand le stock accepté couvre tout', () => {
    const result = buildAvailability(listing(4), 4, 0);
    expect(result.state).toBe('unavailable');
    expect(result.remaining).toBe(0);
    expect(result.label).toBe('Indisponible à cette date');
  });

  it('ne renvoie jamais un reste négatif en cas de surréservation', () => {
    // Défense en profondeur : ne doit pas arriver (trigger SQL), mais
    // l’interface ne doit pas afficher « −6 unités disponibles ».
    const result = buildAvailability(listing(10), 16, 0);
    expect(result.remaining).toBe(0);
    expect(result.state).toBe('unavailable');
  });

  it('l’indisponibilité prime sur les demandes en attente', () => {
    const result = buildAvailability(listing(4), 4, 20);
    expect(result.state).toBe('unavailable');
  });

  it('une annonce mise en pause n’est pas réservable, même avec du stock', () => {
    const result = buildAvailability(listing(400, false), 0, 0);
    expect(result.state).toBe('disabled');
    expect(result.remaining).toBe(0);
    expect(result.label).toBe('Non disponible à la location');
  });

  it('une annonce non publiée n’est pas réservable', () => {
    const result = buildAvailability(listing(400, true, 'draft'), 0, 0);
    expect(result.state).toBe('disabled');
  });

  it('conserve la quantité totale pour l’affichage', () => {
    expect(buildAvailability(listing(400), 120, 30).total).toBe(400);
  });
});
