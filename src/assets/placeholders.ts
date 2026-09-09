/**
 * Visuels de repli générés localement (SVG inline).
 *
 * En production, les photos des annonces proviennent de Supabase Storage
 * (bucket `listing-images`). Ces illustrations servent uniquement :
 *  - de visuel de secours lorsqu'une image est manquante ou ne charge pas ;
 *  - d'illustration pour le jeu de données de démonstration.
 * Elles restent volontairement sobres et aux couleurs de la marque, plutôt que
 * d'utiliser des photographies génériques sans rapport avec le matériel.
 */

const NUIT = '#0F2B5B';
const ORANGE = '#FF7A30';
const IVOIRE = '#FFF7ED';

function encode(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s{2,}/g, ' ').trim())}`;
}

function scene(body: string, background = IVOIRE): string {
  return encode(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" role="img">
      <rect width="800" height="600" fill="${background}"/>
      <circle cx="678" cy="112" r="150" fill="${ORANGE}" opacity="0.10"/>
      <circle cx="120" cy="520" r="180" fill="${NUIT}" opacity="0.06"/>
      <g fill="none" stroke="${NUIT}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${body}</g>
    </svg>`);
}

/** Chaise de cérémonie. */
const chaises = scene(`
  <path d="M300 200h200v210H300z"/>
  <path d="M300 410v130M500 410v130"/>
  <path d="M270 330h260"/>
  <path d="M340 240h120M340 285h120"/>
  <path d="M270 540h260" stroke="${ORANGE}"/>
`);

/** Table ronde nappée. */
const tables = scene(`
  <ellipse cx="400" cy="250" rx="210" ry="70"/>
  <path d="M190 250c0 120 60 190 210 190s210-70 210-190"/>
  <path d="M400 440v100"/>
  <path d="M300 540h200" stroke="${ORANGE}"/>
`);

/** Tente de réception. */
const tentes = scene(`
  <path d="M400 150 130 330h540z"/>
  <path d="M170 330v190M630 330v190"/>
  <path d="M130 520h540" stroke="${ORANGE}"/>
  <path d="M330 520V400h140v120"/>
`);

/** Enceinte de sonorisation. */
const sono = scene(`
  <rect x="300" y="140" width="200" height="330" rx="18"/>
  <circle cx="400" cy="250" r="58"/>
  <circle cx="400" cy="390" r="34"/>
  <path d="M560 220c40 55 40 160 0 220" stroke="${ORANGE}"/>
  <path d="M240 220c-40 55-40 160 0 220" stroke="${ORANGE}"/>
`);

/** Projecteur / éclairage scénique. */
const eclairage = scene(`
  <rect x="320" y="150" width="160" height="120" rx="16"/>
  <path d="M400 270 250 520h300z" stroke="${ORANGE}"/>
  <path d="M400 120v-40M300 160l-30-30M500 160l30-30"/>
`);

/** Décoration : arche florale. */
const decoration = scene(`
  <path d="M230 520V330c0-95 76-170 170-170s170 75 170 170v190"/>
  <circle cx="290" cy="300" r="30" stroke="${ORANGE}"/>
  <circle cx="400" cy="215" r="30" stroke="${ORANGE}"/>
  <circle cx="510" cy="300" r="30" stroke="${ORANGE}"/>
  <path d="M200 520h400"/>
`);

/** Accessoires : caisse de matériel. */
const accessoires = scene(`
  <path d="M200 250h400v270H200z"/>
  <path d="M200 250 400 140l200 110"/>
  <path d="M400 140v380" stroke="${ORANGE}"/>
  <path d="M280 340h60M460 340h60"/>
`);

/** Traiteurs & cuisiniers : toque et plat couvert. */
const traiteurs = scene(`
  <path d="M310 280c-40-20-40-90 20-100 10-40 60-60 70-20 50-10 80 30 60 70 20 10 20 50-10 60z"/>
  <rect x="300" y="280" width="200" height="50" rx="10"/>
  <ellipse cx="400" cy="460" rx="150" ry="26" stroke="${ORANGE}"/>
  <path d="M320 460c0-45 36-64 80-64s80 19 80 64" stroke="${ORANGE}"/>
`);

/** DJ & animation : platine vinyle. */
const djAnimation = scene(`
  <circle cx="400" cy="300" r="140"/>
  <circle cx="400" cy="300" r="30" stroke="${ORANGE}"/>
  <path d="M400 160v40M400 400v40M260 300h40M500 300h40" stroke="${ORANGE}"/>
`);

/** Maître de cérémonie : micro sur pied. */
const maitreCeremonie = scene(`
  <rect x="360" y="150" width="80" height="180" rx="40"/>
  <path d="M300 290a100 100 0 00200 0" stroke="${ORANGE}"/>
  <path d="M400 390v100M340 490h120"/>
`);

/** Sécurité & gardes du corps : bouclier. */
const securite = scene(`
  <path d="M400 140l160 60v140c0 120-80 190-160 220-80-30-160-100-160-220V200z"/>
  <path d="M340 320l50 50 90-100" stroke="${ORANGE}"/>
`);

/** Photographes & vidéastes : appareil photo. */
const photographes = scene(`
  <rect x="220" y="230" width="360" height="230" rx="24"/>
  <path d="M320 230l30-50h100l30 50"/>
  <circle cx="400" cy="345" r="80" stroke="${ORANGE}"/>
`);

/** Musiciens & groupes traditionnels : tam-tam sabar. */
const musiciens = scene(`
  <path d="M300 220h200l-30 260h-140z"/>
  <ellipse cx="400" cy="220" rx="100" ry="30"/>
  <path d="M520 300c40 20 40 90 0 110" stroke="${ORANGE}"/>
`);

/** Personnel & hôtesses : deux silhouettes d'accueil. */
const personnel = scene(`
  <circle cx="330" cy="230" r="50"/>
  <path d="M240 460c0-80 50-130 90-130s90 50 90 130"/>
  <circle cx="470" cy="230" r="50" stroke="${ORANGE}"/>
  <path d="M380 460c0-80 50-130 90-130s90 50 90 130" stroke="${ORANGE}"/>
`);

/** Transport événementiel : véhicule de cérémonie. */
const transport = scene(`
  <path d="M220 380l40-90c10-20 30-30 55-30h170c25 0 45 10 55 30l40 90"/>
  <rect x="200" y="380" width="400" height="70" rx="18"/>
  <circle cx="290" cy="450" r="34" stroke="${ORANGE}"/>
  <circle cx="510" cy="450" r="34" stroke="${ORANGE}"/>
`);

/** Organisation & wedding planner : liste de tâches. */
const organisation = scene(`
  <rect x="270" y="180" width="260" height="340" rx="20"/>
  <rect x="340" y="150" width="120" height="50" rx="14"/>
  <path d="M320 280h160M320 340h160M320 400h100" stroke="${ORANGE}"/>
`);

/** Beauté & coiffure : miroir à main. */
const beaute = scene(`
  <circle cx="400" cy="270" r="110"/>
  <path d="M400 380v160" stroke="${ORANGE}"/>
  <path d="M340 540h120" stroke="${ORANGE}"/>
`);

export const CATEGORY_PLACEHOLDER: Record<string, string> = {
  chaises,
  tables,
  tentes,
  sono,
  eclairage,
  decoration,
  accessoires,
  traiteurs,
  'dj-animation': djAnimation,
  'maitre-ceremonie': maitreCeremonie,
  securite,
  photographes,
  musiciens,
  personnel,
  transport,
  organisation,
  beaute,
};

/** Visuel générique utilisé quand la catégorie est inconnue. */
export const GENERIC_PLACEHOLDER = scene(`
  <path d="M250 280h300v220H250z"/>
  <path d="M250 500h300" stroke="${ORANGE}"/>
  <circle cx="400" cy="200" r="46" stroke="${ORANGE}"/>
  <path d="M320 380h160"/>
`);

export function placeholderFor(categorySlug?: string | null): string {
  if (!categorySlug) return GENERIC_PLACEHOLDER;
  return CATEGORY_PLACEHOLDER[categorySlug] ?? GENERIC_PLACEHOLDER;
}

/** Avatar de repli aux couleurs de la marque, avec les initiales du profil. */
export function avatarPlaceholder(text: string): string {
  const safe = text.replace(/[<>&]/g, '').slice(0, 2).toUpperCase() || 'MK';
  return encode(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
      <rect width="128" height="128" rx="64" fill="${NUIT}"/>
      <text x="64" y="80" font-family="Inter, Arial, sans-serif" font-size="48" font-weight="700"
        fill="#FFFFFF" text-anchor="middle">${safe}</text>
    </svg>`);
}
