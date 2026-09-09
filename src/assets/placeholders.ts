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

export const CATEGORY_PLACEHOLDER: Record<string, string> = {
  chaises,
  tables,
  tentes,
  sono,
  eclairage,
  decoration,
  accessoires,
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
