import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatPrice,
  formatPriceWithUnit,
  fromISODate,
  initials,
  isPastDate,
  normalize,
  slugify,
  toISODate,
  truncate,
} from '@/lib/utils';

describe('formatPrice — format monétaire sénégalais', () => {
  it('utilise l’espace comme séparateur de milliers', () => {
    // Intl.NumberFormat('fr-FR') produit une espace insécable étroite (U+202F).
    expect(formatPrice(25000).replace(/ | /g, ' ')).toBe('25 000 FCFA');
    expect(formatPrice(500).replace(/ | /g, ' ')).toBe('500 FCFA');
    expect(formatPrice(175000).replace(/ | /g, ' ')).toBe('175 000 FCFA');
  });

  it('arrondit les décimales : le FCFA n’a pas de subdivision', () => {
    expect(formatPrice(499.6).replace(/ | /g, ' ')).toBe('500 FCFA');
  });

  it('accole l’unité de location', () => {
    expect(formatPriceWithUnit(500, 'jour')).toContain('/ jour');
    expect(formatPriceWithUnit(125000, 'evenement')).toContain('/ événement');
  });
});

describe('slugify — URL SEO', () => {
  it('translittère les accents français', () => {
    expect(slugify('Chaise Napoléon dorée', 'Dakar')).toBe('chaise-napoleon-doree-dakar');
    expect(slugify('Éclairage de scène')).toBe('eclairage-de-scene');
  });

  it('supprime la ponctuation et les séparateurs multiples', () => {
    expect(slugify('Tente 10x20 m — grande !')).toBe('tente-10x20-m-grande');
  });

  it('ignore les fragments vides', () => {
    expect(slugify('Sono', null, undefined, 'Thiès')).toBe('sono-thies');
  });

  it('borne la longueur à 90 caractères', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(90);
  });
});

describe('dates — pas de décalage de fuseau', () => {
  it('fait l’aller-retour sans glisser d’un jour', () => {
    // `new Date('2026-05-24')` est interprété en UTC et recule d’un jour à l’ouest
    // de Greenwich. `fromISODate` doit construire une date locale.
    const date = fromISODate('2026-05-24');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(4);
    expect(date.getDate()).toBe(24);
    expect(toISODate(date)).toBe('2026-05-24');
  });

  it('complète les mois et jours sur deux chiffres', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('formate en français long', () => {
    expect(formatDate('2026-05-24')).toMatch(/24 mai 2026/);
  });

  it('ne casse pas sur une entrée invalide', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('pas-une-date')).toBe('—');
  });

  it('détecte une date passée', () => {
    expect(isPastDate('2020-01-01')).toBe(true);
    expect(isPastDate('2099-01-01')).toBe(false);
    expect(isPastDate(toISODate(new Date()))).toBe(false); // aujourd’hui reste réservable
  });
});

describe('helpers de présentation', () => {
  it('extrait deux initiales au maximum', () => {
    expect(initials('Fatou Sarr')).toBe('FS');
    expect(initials('Ibrahima Fall Diop')).toBe('IF');
    expect(initials('Awa')).toBe('A');
  });

  it('tronque proprement', () => {
    expect(truncate('court', 20)).toBe('court');
    expect(truncate('a'.repeat(30), 10)).toHaveLength(10);
    expect(truncate('a'.repeat(30), 10).endsWith('…')).toBe(true);
  });

  it('normalise pour la recherche insensible aux accents', () => {
    expect(normalize('Éclairage')).toBe('eclairage');
    expect(normalize('THIÈS')).toBe('thies');
  });
});
