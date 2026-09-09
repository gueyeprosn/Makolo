import { placeholderFor } from '@/assets/placeholders';
import type {
  BookingRequest,
  Category,
  Favorite,
  Listing,
  ListingImage,
  Notification,
  Profile,
} from '@/types';

/**
 * Jeu de données de DÉMONSTRATION.
 *
 * Toutes les informations ci-dessous sont fictives : les noms d'entreprises,
 * les personnes et les numéros de téléphone (préfixe non attribué 77 000 xx xx)
 * n'existent pas. Aucune coordonnée réelle n'est utilisée.
 * Ce fichier n'est jamais chargé lorsque Supabase est configuré.
 */

const now = Date.now();
const DAY = 86_400_000;

const iso = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString();
const isoDate = (daysAhead: number) => new Date(now + daysAhead * DAY).toISOString().slice(0, 10);

/** Dates futures utilisées par les demandes de démonstration. */
export const DEMO_DATES = {
  inTwoWeeks: isoDate(14),
  inThreeWeeks: isoDate(21),
  inOneMonth: isoDate(30),
};

/* -------------------------------------------------------------------------- */
/* Comptes de démonstration                                                    */
/* -------------------------------------------------------------------------- */

export const DEMO_PASSWORD = 'Makalo2026';

export const DEMO_ACCOUNTS = [
  { email: 'client@makalo.sn', role: 'Client', password: DEMO_PASSWORD },
  { email: 'prestataire@makalo.sn', role: 'Prestataire', password: DEMO_PASSWORD },
  { email: 'admin@makalo.sn', role: 'Administrateur', password: DEMO_PASSWORD },
];

export const demoProfiles: Profile[] = [
  {
    id: 'usr-admin',
    email: 'admin@makalo.sn',
    full_name: 'Awa Ndiaye',
    phone: '77 000 10 10',
    avatar_url: null,
    role: 'admin',
    city: 'Dakar',
    bio: "Équipe MAKALO — modération et support des prestataires.",
    active: true,
    created_at: iso(180),
    updated_at: iso(20),
  },
  {
    id: 'usr-client',
    email: 'client@makalo.sn',
    full_name: 'Fatou Sarr',
    phone: '77 000 20 20',
    avatar_url: null,
    role: 'client',
    city: 'Dakar',
    bio: "J'organise les événements familiaux et les cérémonies de mon quartier.",
    active: true,
    created_at: iso(90),
    updated_at: iso(5),
  },
  {
    id: 'usr-client-2',
    email: 'moussa.diop@example.sn',
    full_name: 'Moussa Diop',
    phone: '77 000 21 21',
    avatar_url: null,
    role: 'client',
    city: 'Thiès',
    bio: null,
    active: true,
    created_at: iso(60),
    updated_at: iso(12),
  },
  {
    id: 'usr-provider',
    email: 'prestataire@makalo.sn',
    full_name: 'Ibrahima Fall',
    phone: '77 000 30 30',
    avatar_url: null,
    role: 'provider',
    city: 'Dakar',
    bio: "Location de mobilier de réception à Dakar depuis 2016 : chaises, tables, nappage et tentes. Livraison et installation sur site.",
    active: true,
    created_at: iso(150),
    updated_at: iso(3),
  },
  {
    id: 'usr-provider-2',
    email: 'sonoteranga@example.sn',
    full_name: 'Sono Teranga',
    phone: '77 000 31 31',
    avatar_url: null,
    role: 'provider',
    city: 'Dakar',
    bio: "Sonorisation et éclairage pour mariages, baptêmes et séminaires. Technicien présent pendant toute la prestation.",
    active: true,
    created_at: iso(140),
    updated_at: iso(8),
  },
  {
    id: 'usr-provider-3',
    email: 'tentes.baobab@example.sn',
    full_name: 'Tentes Baobab',
    phone: '77 000 32 32',
    avatar_url: null,
    role: 'provider',
    city: 'Thiès',
    bio: "Spécialiste des chapiteaux et tentes de réception pour Thiès, Mbour et la Petite Côte.",
    active: true,
    created_at: iso(120),
    updated_at: iso(15),
  },
  {
    id: 'usr-provider-4',
    email: 'decor.lumiere@example.sn',
    full_name: 'Décor & Lumière',
    phone: '77 000 33 33',
    avatar_url: null,
    role: 'provider',
    city: 'Touba',
    bio: "Décoration de salle, arches florales et éclairage d'ambiance pour vos cérémonies.",
    active: true,
    created_at: iso(100),
    updated_at: iso(9),
  },
];

/* -------------------------------------------------------------------------- */
/* Catégories                                                                  */
/* -------------------------------------------------------------------------- */

export const demoCategories: Category[] = [
  { id: 'cat-chaises', name: 'Chaises', slug: 'chaises', description: 'Pour vos invités et cérémonies', icon: 'Armchair', image_url: null, active: true, created_at: iso(200) },
  { id: 'cat-tables', name: 'Tables', slug: 'tables', description: 'Tables rondes, rectangulaires et cocktail', icon: 'Table2', image_url: null, active: true, created_at: iso(200) },
  { id: 'cat-tentes', name: 'Tentes', slug: 'tentes', description: 'Protégez vos invités du soleil et de la pluie', icon: 'Tent', image_url: null, active: true, created_at: iso(200) },
  { id: 'cat-sono', name: 'Sono', slug: 'sono', description: 'Sonorisation pour petits et grands événements', icon: 'Speaker', image_url: null, active: true, created_at: iso(200) },
  { id: 'cat-eclairage', name: 'Éclairage', slug: 'eclairage', description: "Créez l'ambiance de votre événement", icon: 'Lightbulb', image_url: null, active: true, created_at: iso(200) },
  { id: 'cat-decoration', name: 'Décoration', slug: 'decoration', description: 'Arches, nappage et décors de salle', icon: 'Sparkles', image_url: null, active: true, created_at: iso(200) },
  { id: 'cat-accessoires', name: 'Accessoires', slug: 'accessoires', description: 'Vaisselle, groupes électrogènes et petit matériel', icon: 'PackageOpen', image_url: null, active: true, created_at: iso(200) },
];

/* -------------------------------------------------------------------------- */
/* Annonces                                                                    */
/* -------------------------------------------------------------------------- */

interface Seed {
  id: string;
  provider: string;
  category: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  unit: Listing['price_unit'];
  city: string;
  quantity: number;
  status: Listing['status'];
  available?: boolean;
  days: number;
  conditions?: string;
  reason?: string;
}

const seeds: Seed[] = [
  {
    id: 'lst-chaise-napoleon',
    provider: 'usr-provider',
    category: 'cat-chaises',
    title: 'Chaise Napoléon dorée',
    slug: 'chaise-napoleon-doree-dakar',
    description:
      "Chaise Napoléon dorée avec galette blanche, idéale pour les mariages et les réceptions élégantes. Le stock est vérifié et nettoyé après chaque location. Livraison possible sur Dakar et sa banlieue, installation comprise à partir de 100 unités.",
    price: 500,
    unit: 'jour',
    city: 'Dakar',
    quantity: 400,
    status: 'published',
    days: 40,
    conditions: "Caution de 20 000 FCFA. Location minimum 20 chaises. Livraison facturée selon la zone.",
  },
  {
    id: 'lst-chaise-plastique',
    provider: 'usr-provider',
    category: 'cat-chaises',
    title: 'Chaise plastique blanche empilable',
    slug: 'chaise-plastique-blanche-dakar',
    description:
      "Chaise en plastique renforcé, robuste et facile à installer. Parfaite pour les baptêmes, réunions de famille et événements en plein air. Stock important disponible toute l'année.",
    price: 300,
    unit: 'jour',
    city: 'Dakar',
    quantity: 600,
    status: 'published',
    days: 35,
    conditions: 'Location minimum 30 chaises.',
  },
  {
    id: 'lst-table-ronde',
    provider: 'usr-provider',
    category: 'cat-tables',
    title: 'Table ronde 10 personnes',
    slug: 'table-ronde-10-personnes-dakar',
    description:
      "Table ronde de 180 cm accueillant confortablement 10 convives. Disponible avec ou sans nappage blanc. Idéale pour les dîners de mariage et les réceptions d'entreprise.",
    price: 4000,
    unit: 'jour',
    city: 'Dakar',
    quantity: 60,
    status: 'published',
    days: 30,
    conditions: 'Nappage en supplément : 1 500 FCFA par table.',
  },
  {
    id: 'lst-table-cocktail',
    provider: 'usr-provider',
    category: 'cat-tables',
    title: 'Table cocktail mange-debout',
    slug: 'table-cocktail-mange-debout-dakar',
    description:
      "Table haute mange-debout avec housse blanche ou noire. Recommandée pour les cocktails, inaugurations et événements corporatifs. Montage rapide sur place.",
    price: 3500,
    unit: 'jour',
    city: 'Dakar',
    quantity: 40,
    status: 'published',
    days: 28,
  },
  {
    id: 'lst-tente-10x20',
    provider: 'usr-provider-3',
    category: 'cat-tentes',
    title: 'Tente de réception 10x20 m',
    slug: 'tente-reception-10x20-thies',
    description:
      "Chapiteau de 200 m² pouvant abriter jusqu'à 250 personnes assises. Structure aluminium et bâche blanche imperméable. Montage et démontage assurés par notre équipe.",
    price: 175000,
    unit: 'evenement',
    city: 'Thiès',
    quantity: 4,
    status: 'published',
    days: 25,
    conditions: "Montage la veille de l'événement. Prévoir un terrain plat et dégagé.",
  },
  {
    id: 'lst-tente-5x10',
    provider: 'usr-provider-3',
    category: 'cat-tentes',
    title: 'Tente 5x10 m avec parois',
    slug: 'tente-5x10-avec-parois-mbour',
    description:
      "Tente de 50 m² avec parois amovibles, adaptée aux baptêmes et petites réceptions. Résistante au vent de la côte, installation comprise sur Mbour et Saly.",
    price: 75000,
    unit: 'evenement',
    city: 'Mbour',
    quantity: 8,
    status: 'published',
    days: 22,
  },
  {
    id: 'lst-pack-sono-mariage',
    provider: 'usr-provider-2',
    category: 'cat-sono',
    title: 'Pack sono mariage 2000 W',
    slug: 'pack-sono-mariage-2000w-dakar',
    description:
      "Deux enceintes 1000 W, caisson de basses, table de mixage, deux micros sans fil et un technicien présent pendant toute la soirée. Adapté aux salles et aux réceptions en extérieur jusqu'à 300 personnes.",
    price: 125000,
    unit: 'evenement',
    city: 'Dakar',
    quantity: 3,
    status: 'published',
    days: 20,
    conditions: "Prévoir une alimentation électrique stable. Groupe électrogène en option.",
  },
  {
    id: 'lst-sono-conference',
    provider: 'usr-provider-2',
    category: 'cat-sono',
    title: 'Sonorisation conférence et séminaire',
    slug: 'sonorisation-conference-seminaire-dakar',
    description:
      "Ensemble complet pour séminaires : quatre micros de table, pupitre, enceintes de diffusion et régie. Installation discrète adaptée aux salles de réunion et hôtels.",
    price: 85000,
    unit: 'evenement',
    city: 'Dakar',
    quantity: 2,
    status: 'published',
    days: 18,
  },
  {
    id: 'lst-projecteurs-led',
    provider: 'usr-provider-2',
    category: 'cat-eclairage',
    title: 'Projecteurs LED de scène (lot de 6)',
    slug: 'projecteurs-led-scene-lot-6-dakar',
    description:
      "Lot de six projecteurs LED RGBW avec pieds et télécommande DMX. Permet de colorer une salle ou de mettre en valeur une scène. Consommation réduite, aucune surchauffe.",
    price: 60000,
    unit: 'evenement',
    city: 'Dakar',
    quantity: 5,
    status: 'published',
    days: 16,
  },
  {
    id: 'lst-guirlande',
    provider: 'usr-provider-4',
    category: 'cat-eclairage',
    title: 'Guirlande lumineuse guinguette 20 m',
    slug: 'guirlande-lumineuse-guinguette-20m-touba',
    description:
      "Guirlande extérieure de 20 mètres avec ampoules à filament, pour créer une ambiance chaleureuse en terrasse ou sous une tente. Câblage et fixation fournis.",
    price: 15000,
    unit: 'jour',
    city: 'Touba',
    quantity: 25,
    status: 'published',
    days: 14,
  },
  {
    id: 'lst-arche-florale',
    provider: 'usr-provider-4',
    category: 'cat-decoration',
    title: 'Arche florale de cérémonie',
    slug: 'arche-florale-ceremonie-touba',
    description:
      "Arche décorée de fleurs artificielles haut de gamme et de voilage, montée sur place. Point photo idéal pour les mariages et les cérémonies de fiançailles.",
    price: 45000,
    unit: 'evenement',
    city: 'Touba',
    quantity: 6,
    status: 'published',
    days: 12,
    conditions: 'Montage la veille ou le matin même selon disponibilité.',
  },
  {
    id: 'lst-nappage',
    provider: 'usr-provider-4',
    category: 'cat-decoration',
    title: 'Nappage et housses de chaise',
    slug: 'nappage-housses-de-chaise-touba',
    description:
      "Nappes rondes et housses de chaise avec nœud coloré, disponibles en blanc, ivoire, bordeaux et bleu nuit. Linge lavé et repassé avant chaque location.",
    price: 1000,
    unit: 'unite',
    city: 'Touba',
    quantity: 500,
    status: 'published',
    days: 11,
  },
  {
    id: 'lst-groupe-electrogene',
    provider: 'usr-provider-3',
    category: 'cat-accessoires',
    title: 'Groupe électrogène 15 kVA insonorisé',
    slug: 'groupe-electrogene-15kva-thies',
    description:
      "Groupe électrogène silencieux de 15 kVA, carburant non inclus. Sécurise l'alimentation de la sonorisation et de l'éclairage pour les événements en extérieur.",
    price: 90000,
    unit: 'jour',
    city: 'Thiès',
    quantity: 3,
    status: 'published',
    days: 10,
    conditions: 'Carburant à la charge du client. Livraison et raccordement inclus.',
  },
  {
    id: 'lst-vaisselle',
    provider: 'usr-provider',
    category: 'cat-accessoires',
    title: 'Service de vaisselle complet (50 couverts)',
    slug: 'service-vaisselle-50-couverts-dakar',
    description:
      "Assiettes plates et creuses, couverts inox, verres à eau et à jus pour 50 convives. Vaisselle livrée propre en caisses de transport.",
    price: 25000,
    unit: 'evenement',
    city: 'Dakar',
    quantity: 12,
    status: 'published',
    days: 9,
    conditions: 'La casse est facturée à l’unité selon le barème remis à la livraison.',
  },
  {
    id: 'lst-chaise-saint-louis',
    provider: 'usr-provider-3',
    category: 'cat-chaises',
    title: 'Chaise Tiffany transparente',
    slug: 'chaise-tiffany-transparente-saint-louis',
    description:
      "Chaise Tiffany en polycarbonate transparent avec galette, très appréciée pour les mariages contemporains. Disponible à Saint-Louis et dans le nord du pays.",
    price: 900,
    unit: 'jour',
    city: 'Saint-Louis',
    quantity: 200,
    status: 'published',
    days: 8,
  },
  {
    id: 'lst-tente-kaolack',
    provider: 'usr-provider-3',
    category: 'cat-tentes',
    title: 'Tente traditionnelle 8x12 m',
    slug: 'tente-traditionnelle-8x12-kaolack',
    description:
      "Tente de 96 m² avec mâts centraux, adaptée aux baptêmes et aux cérémonies familiales. Installation la veille comprise dans le tarif.",
    price: 95000,
    unit: 'evenement',
    city: 'Kaolack',
    quantity: 5,
    status: 'published',
    days: 7,
  },
  {
    id: 'lst-sono-ziguinchor',
    provider: 'usr-provider-2',
    category: 'cat-sono',
    title: 'Pack sono mobile 800 W',
    slug: 'pack-sono-mobile-800w-ziguinchor',
    description:
      "Système compact sur batterie avec deux micros sans fil, idéal pour les baptêmes, animations de quartier et cérémonies en extérieur sans alimentation électrique.",
    price: 45000,
    unit: 'evenement',
    city: 'Ziguinchor',
    quantity: 2,
    status: 'published',
    days: 6,
    available: false,
  },
  {
    id: 'lst-table-diourbel',
    provider: 'usr-provider-4',
    category: 'cat-tables',
    title: 'Table rectangulaire 8 personnes',
    slug: 'table-rectangulaire-8-personnes-diourbel',
    description:
      "Table pliante rectangulaire de 180 cm, facile à transporter et à installer. Convient aux buffets, aux réunions et aux repas de famille.",
    price: 3000,
    unit: 'jour',
    city: 'Diourbel',
    quantity: 30,
    status: 'published',
    days: 5,
  },
  {
    id: 'lst-en-attente',
    provider: 'usr-provider',
    category: 'cat-decoration',
    title: 'Photobooth avec accessoires',
    slug: 'photobooth-avec-accessoires-dakar',
    description:
      "Cabine photo avec fond personnalisable, éclairage et malle d'accessoires. Impression illimitée pendant toute la durée de l'événement.",
    price: 110000,
    unit: 'evenement',
    city: 'Dakar',
    quantity: 2,
    status: 'pending',
    days: 2,
  },
  {
    id: 'lst-brouillon',
    provider: 'usr-provider',
    category: 'cat-accessoires',
    title: 'Machine à fumée et bulles',
    slug: 'machine-fumee-et-bulles-dakar',
    description:
      "Machine à fumée 1500 W et machine à bulles pour l'ouverture de bal. Liquide inclus pour une soirée complète.",
    price: 35000,
    unit: 'evenement',
    city: 'Dakar',
    quantity: 3,
    status: 'draft',
    days: 1,
  },
];

export const demoListings: Listing[] = seeds.map((seed) => {
  const category = demoCategories.find((c) => c.id === seed.category);
  return {
    id: seed.id,
    provider_id: seed.provider,
    category_id: seed.category,
    title: seed.title,
    slug: seed.slug,
    description: seed.description,
    price: seed.price,
    price_unit: seed.unit,
    city: seed.city,
    address: null,
    conditions: seed.conditions ?? null,
    availability_status: seed.available ?? true,
    quantity: seed.quantity,
    cover_image: placeholderFor(category?.slug),
    status: seed.status,
    moderation_reason: seed.reason ?? null,
    created_at: iso(seed.days),
    updated_at: iso(Math.max(0, seed.days - 1)),
  };
});

export const demoListingImages: ListingImage[] = demoListings.flatMap((listing) => {
  const category = demoCategories.find((c) => c.id === listing.category_id);
  return [
    {
      id: `img-${listing.id}-1`,
      listing_id: listing.id,
      image_url: placeholderFor(category?.slug),
      sort_order: 0,
      created_at: listing.created_at,
    },
  ];
});

/* -------------------------------------------------------------------------- */
/* Demandes, favoris et notifications                                          */
/* -------------------------------------------------------------------------- */

export const demoBookings: BookingRequest[] = [
  {
    id: 'bkg-1',
    listing_id: 'lst-chaise-napoleon',
    client_id: 'usr-client',
    provider_id: 'usr-provider',
    requested_date: DEMO_DATES.inTwoWeeks,
    quantity: 120,
    message: "Bonjour, je souhaite louer ce matériel pour le mariage de ma sœur à Ouakam.",
    status: 'accepted',
    created_at: iso(6),
    updated_at: iso(5),
  },
  {
    id: 'bkg-2',
    listing_id: 'lst-pack-sono-mariage',
    client_id: 'usr-client',
    provider_id: 'usr-provider-2',
    requested_date: DEMO_DATES.inTwoWeeks,
    quantity: 1,
    message: 'Bonjour, je souhaite louer ce matériel pour mon événement.',
    status: 'pending',
    created_at: iso(3),
    updated_at: iso(3),
  },
  {
    id: 'bkg-3',
    listing_id: 'lst-tente-10x20',
    client_id: 'usr-client-2',
    provider_id: 'usr-provider-3',
    requested_date: DEMO_DATES.inThreeWeeks,
    quantity: 1,
    message: "Besoin d'une tente pour un baptême à Thiès, environ 200 invités.",
    status: 'pending',
    created_at: iso(2),
    updated_at: iso(2),
  },
  {
    id: 'bkg-4',
    listing_id: 'lst-table-ronde',
    client_id: 'usr-client',
    provider_id: 'usr-provider',
    requested_date: DEMO_DATES.inOneMonth,
    quantity: 15,
    message: 'Réception de fin d’année, 150 convives.',
    status: 'pending',
    created_at: iso(1),
    updated_at: iso(1),
  },
  {
    id: 'bkg-5',
    listing_id: 'lst-guirlande',
    client_id: 'usr-client',
    provider_id: 'usr-provider-4',
    requested_date: DEMO_DATES.inTwoWeeks,
    quantity: 4,
    message: null,
    status: 'rejected',
    created_at: iso(9),
    updated_at: iso(8),
  },
];

export const demoFavorites: Favorite[] = [
  { id: 'fav-1', user_id: 'usr-client', listing_id: 'lst-tente-10x20', created_at: iso(4) },
  { id: 'fav-2', user_id: 'usr-client', listing_id: 'lst-projecteurs-led', created_at: iso(2) },
];

export const demoNotifications: Notification[] = [
  {
    id: 'ntf-1',
    user_id: 'usr-client',
    type: 'booking_accepted',
    title: 'Votre demande a été acceptée',
    message: 'Ibrahima Fall a accepté votre demande pour « Chaise Napoléon dorée ».',
    link: '/demandes',
    read: false,
    created_at: iso(5),
  },
  {
    id: 'ntf-2',
    user_id: 'usr-client',
    type: 'booking_rejected',
    title: 'Votre demande a été refusée',
    message: 'Décor & Lumière a refusé votre demande pour « Guirlande lumineuse guinguette 20 m ».',
    link: '/demandes',
    read: true,
    created_at: iso(8),
  },
  {
    id: 'ntf-3',
    user_id: 'usr-provider',
    type: 'booking_request',
    title: 'Nouvelle demande de réservation',
    message: 'Fatou Sarr souhaite réserver « Table ronde 10 personnes » (15 unités).',
    link: '/prestataire/demandes',
    read: false,
    created_at: iso(1),
  },
];
