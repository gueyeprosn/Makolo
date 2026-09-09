import { z } from 'zod';
import { CITIES } from '@/constants';
import { todayISO } from '@/lib/utils';

const cityValues = CITIES as unknown as [string, ...string[]];

/* -------------------------------------------------------------------------- */
/* Authentification                                                            */
/* -------------------------------------------------------------------------- */

export const loginSchema = z.object({
  email: z.string().min(1, "L'adresse e-mail est obligatoire.").email('Adresse e-mail invalide.'),
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(3, 'Le nom complet doit contenir au moins 3 caractères.')
      .max(80, 'Le nom complet est trop long.'),
    email: z.string().min(1, "L'adresse e-mail est obligatoire.").email('Adresse e-mail invalide.'),
    phone: z
      .string()
      .trim()
      .regex(/^(\+221)?[\s.-]?(7[0678])[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}$/, 'Numéro sénégalais invalide (ex. 77 123 45 67).')
      .optional()
      .or(z.literal('')),
    city: z.enum(cityValues, { errorMap: () => ({ message: 'Veuillez sélectionner une ville.' }) }),
    role: z.enum(['client', 'provider'], {
      errorMap: () => ({ message: 'Veuillez choisir un type de compte.' }),
    }),
    password: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
      .regex(/[A-Za-z]/, 'Le mot de passe doit contenir au moins une lettre.')
      .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre.'),
    confirm_password: z.string().min(1, 'Veuillez confirmer le mot de passe.'),
    accept_terms: z.literal(true, {
      errorMap: () => ({ message: 'Vous devez accepter les conditions d’utilisation.' }),
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirm_password'],
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "L'adresse e-mail est obligatoire.").email('Adresse e-mail invalide.'),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
      .regex(/[A-Za-z]/, 'Le mot de passe doit contenir au moins une lettre.')
      .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre.'),
    confirm_password: z.string().min(1, 'Veuillez confirmer le mot de passe.'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirm_password'],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/* -------------------------------------------------------------------------- */
/* Profil                                                                      */
/* -------------------------------------------------------------------------- */

export const profileSchema = z.object({
  full_name: z.string().min(3, 'Le nom complet doit contenir au moins 3 caractères.').max(80, 'Le nom complet est trop long.'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+221)?[\s.-]?(7[0678])[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}$/, 'Numéro sénégalais invalide (ex. 77 123 45 67).')
    .optional()
    .or(z.literal('')),
  city: z.enum(cityValues, { errorMap: () => ({ message: 'Veuillez sélectionner une ville.' }) }),
  bio: z.string().max(600, 'La description ne doit pas dépasser 600 caractères.').optional().or(z.literal('')),
});
export type ProfileValues = z.infer<typeof profileSchema>;

/* -------------------------------------------------------------------------- */
/* Annonce                                                                     */
/* -------------------------------------------------------------------------- */

export const listingSchema = z.object({
  title: z
    .string()
    .min(5, 'Le titre est obligatoire (5 caractères minimum).')
    .max(90, 'Le titre ne doit pas dépasser 90 caractères.'),
  category_id: z.string().min(1, 'Veuillez sélectionner une catégorie.'),
  description: z
    .string()
    .min(30, 'La description doit contenir au moins 30 caractères.')
    .max(2000, 'La description ne doit pas dépasser 2000 caractères.'),
  price: z.coerce
    .number({ invalid_type_error: 'Le prix doit être un nombre.' })
    .positive('Le prix doit être supérieur à 0.')
    .max(50_000_000, 'Le prix saisi semble incorrect.'),
  price_unit: z.enum(['jour', 'evenement', 'unite', 'heure', 'semaine'], {
    errorMap: () => ({ message: 'Veuillez sélectionner une unité de prix.' }),
  }),
  quantity: z.coerce
    .number({ invalid_type_error: 'La quantité doit être un nombre.' })
    .int('La quantité doit être un nombre entier.')
    .min(1, 'La quantité disponible doit être au moins de 1.')
    .max(100_000, 'La quantité saisie semble incorrecte.'),
  city: z.enum(cityValues, { errorMap: () => ({ message: 'Veuillez sélectionner une ville.' }) }),
  address: z.string().max(160, "L'adresse est trop longue.").optional().or(z.literal('')),
  conditions: z.string().max(1000, 'Les conditions ne doivent pas dépasser 1000 caractères.').optional().or(z.literal('')),
  availability_status: z.boolean(),
});
export type ListingValues = z.infer<typeof listingSchema>;

/* -------------------------------------------------------------------------- */
/* Demande de réservation                                                      */
/* -------------------------------------------------------------------------- */

export const bookingSchema = z.object({
  requested_date: z
    .string()
    .min(1, 'Veuillez sélectionner une date.')
    .refine((value) => value >= todayISO(), { message: 'La date doit être aujourd’hui ou ultérieure.' }),
  quantity: z.coerce
    .number({ invalid_type_error: 'La quantité doit être un nombre.' })
    .int('La quantité doit être un nombre entier.')
    .min(1, 'La quantité doit être au moins de 1.'),
  message: z.string().max(600, 'Le message ne doit pas dépasser 600 caractères.').optional().or(z.literal('')),
});
export type BookingValues = z.infer<typeof bookingSchema>;

/* -------------------------------------------------------------------------- */
/* Catégorie (back-office)                                                     */
/* -------------------------------------------------------------------------- */

export const categorySchema = z.object({
  name: z.string().min(2, 'Le nom est obligatoire.').max(50, 'Le nom est trop long.'),
  description: z.string().max(240, 'La description est trop longue.').optional().or(z.literal('')),
  icon: z.string().max(40).optional().or(z.literal('')),
  image_url: z.string().url('URL invalide.').optional().or(z.literal('')),
  active: z.boolean(),
});
export type CategoryValues = z.infer<typeof categorySchema>;

export const rejectionSchema = z.object({
  reason: z
    .string()
    .min(10, 'Merci d’indiquer un motif d’au moins 10 caractères.')
    .max(400, 'Le motif ne doit pas dépasser 400 caractères.'),
});
export type RejectionValues = z.infer<typeof rejectionSchema>;
