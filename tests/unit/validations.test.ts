import { describe, expect, it } from 'vitest';
import {
  bookingSchema,
  categorySchema,
  listingSchema,
  loginSchema,
  registerSchema,
} from '@/lib/validations';
import { toISODate } from '@/lib/utils';

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISODate(d);
};

const validRegister = {
  full_name: 'Fatou Sarr',
  email: 'fatou@example.sn',
  phone: '77 123 45 67',
  city: 'Dakar',
  role: 'client' as const,
  password: 'Makalo2026',
  confirm_password: 'Makalo2026',
  accept_terms: true as const,
};

describe('registerSchema', () => {
  it('accepte une inscription valide', () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
  });

  it('accepte les formats de téléphone sénégalais courants', () => {
    for (const phone of ['77 123 45 67', '+221 77 123 45 67', '761234567', '78-123-45-67']) {
      const result = registerSchema.safeParse({ ...validRegister, phone });
      expect(result.success, `${phone} devrait être accepté`).toBe(true);
    }
  });

  it('rejette un préfixe mobile inexistant', () => {
    expect(registerSchema.safeParse({ ...validRegister, phone: '99 123 45 67' }).success).toBe(false);
  });

  it('accepte un téléphone vide (champ facultatif)', () => {
    expect(registerSchema.safeParse({ ...validRegister, phone: '' }).success).toBe(true);
  });

  it('exige la concordance des mots de passe', () => {
    const result = registerSchema.safeParse({ ...validRegister, confirm_password: 'Autre2026' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['confirm_password']);
      expect(result.error.issues[0].message).toBe('Les mots de passe ne correspondent pas.');
    }
  });

  it('impose lettres et chiffres dans le mot de passe', () => {
    expect(registerSchema.safeParse({ ...validRegister, password: 'aaaaaaaa', confirm_password: 'aaaaaaaa' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validRegister, password: '12345678', confirm_password: '12345678' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validRegister, password: 'court1', confirm_password: 'court1' }).success).toBe(false);
  });

  it('n’autorise pas l’auto-attribution du rôle administrateur', () => {
    // Défense côté client ; le trigger SQL `handle_new_user()` fait autorité.
    const result = registerSchema.safeParse({ ...validRegister, role: 'admin' });
    expect(result.success).toBe(false);
  });

  it('refuse une ville hors zone couverte', () => {
    expect(registerSchema.safeParse({ ...validRegister, city: 'Paris' }).success).toBe(false);
  });

  it('exige l’acceptation des conditions', () => {
    expect(registerSchema.safeParse({ ...validRegister, accept_terms: false }).success).toBe(false);
  });

  it('produit des messages d’erreur en français', () => {
    const result = registerSchema.safeParse({ ...validRegister, email: 'pas-un-email' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe('Adresse e-mail invalide.');
  });
});

describe('loginSchema', () => {
  it('exige les deux champs', () => {
    expect(loginSchema.safeParse({ email: '', password: '' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.sn', password: 'x' }).success).toBe(true);
  });
});

describe('listingSchema', () => {
  const valid = {
    title: 'Chaise Napoléon dorée',
    category_id: 'cat-chaises',
    description: 'Chaise Napoléon dorée avec galette blanche, idéale pour les mariages.',
    price: 500,
    price_unit: 'jour' as const,
    quantity: 400,
    city: 'Dakar',
    address: '',
    conditions: '',
    availability_status: true,
  };

  it('accepte une annonce valide', () => {
    expect(listingSchema.safeParse(valid).success).toBe(true);
  });

  it('convertit les nombres saisis en texte par les champs de formulaire', () => {
    const result = listingSchema.safeParse({ ...valid, price: '500', quantity: '400' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(500);
      expect(result.data.quantity).toBe(400);
    }
  });

  it('refuse un prix nul ou négatif', () => {
    expect(listingSchema.safeParse({ ...valid, price: 0 }).success).toBe(false);
    expect(listingSchema.safeParse({ ...valid, price: -100 }).success).toBe(false);
  });

  it('refuse une quantité fractionnaire ou nulle', () => {
    expect(listingSchema.safeParse({ ...valid, quantity: 2.5 }).success).toBe(false);
    expect(listingSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
  });

  it('impose une description substantielle', () => {
    expect(listingSchema.safeParse({ ...valid, description: 'Trop court.' }).success).toBe(false);
  });
});

describe('bookingSchema', () => {
  it('accepte une demande future sur un seul jour (from === to)', () => {
    const d = tomorrow();
    expect(
      bookingSchema.safeParse({ requested_from: d, requested_to: d, quantity: 5, message: '' }).success,
    ).toBe(true);
  });

  it('accepte une demande pour aujourd’hui', () => {
    const d = toISODate(new Date());
    expect(bookingSchema.safeParse({ requested_from: d, requested_to: d, quantity: 1 }).success).toBe(true);
  });

  it('accepte une période de plusieurs jours', () => {
    const from = tomorrow();
    const d = new Date();
    d.setDate(d.getDate() + 4);
    const to = toISODate(d);
    expect(bookingSchema.safeParse({ requested_from: from, requested_to: to, quantity: 2 }).success).toBe(true);
  });

  it('refuse une date de début passée', () => {
    const result = bookingSchema.safeParse({ requested_from: '2020-01-01', requested_to: '2020-01-02', quantity: 1 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toContain('ultérieure');
  });

  it('refuse une date de fin antérieure à la date de début', () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    const from = toISODate(d);
    const before = new Date();
    before.setDate(before.getDate() + 2);
    const to = toISODate(before);
    const result = bookingSchema.safeParse({ requested_from: from, requested_to: to, quantity: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['requested_to']);
      expect(result.error.issues[0].message).toContain('postérieure');
    }
  });

  it('exige une date de début et une date de fin', () => {
    expect(bookingSchema.safeParse({ requested_from: '', requested_to: '', quantity: 1 }).success).toBe(false);
    const d = tomorrow();
    expect(bookingSchema.safeParse({ requested_from: d, requested_to: '', quantity: 1 }).success).toBe(false);
  });

  it('refuse une quantité inférieure à 1', () => {
    const d = tomorrow();
    expect(bookingSchema.safeParse({ requested_from: d, requested_to: d, quantity: 0 }).success).toBe(false);
  });
});

describe('categorySchema', () => {
  it('accepte une catégorie minimale', () => {
    expect(categorySchema.safeParse({ name: 'Chaises', active: true }).success).toBe(true);
  });

  it('refuse une URL d’image invalide', () => {
    expect(categorySchema.safeParse({ name: 'Chaises', active: true, image_url: 'pas-une-url' }).success).toBe(false);
  });
});
