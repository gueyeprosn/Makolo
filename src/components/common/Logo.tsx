import { cn } from '@/lib/utils';

interface LogoProps {
  /** `full` = symbole + nom, `mark` = symbole seul (icône d'application). */
  variant?: 'full' | 'mark';
  /** `light` sur fond clair, `dark` sur fond bleu nuit. */
  tone?: 'light' | 'dark';
  className?: string;
  showTagline?: boolean;
}

/**
 * Identité MAKOLO.
 *
 * Le symbole reprend les éléments de la charte : le M géométrique bleu nuit,
 * l'espace négatif figurant une table et deux chaises, le calendrier
 * (disponibilité), la flèche orange (service, mouvement) et les éclats de
 * célébration. Les proportions et les couleurs ne doivent pas être modifiées.
 */
export function Logo({ variant = 'full', tone = 'light', className, showTagline = false }: LogoProps) {
  const wordColor = tone === 'dark' ? '#FFFFFF' : '#0F2B5B';
  const markColor = tone === 'dark' ? '#FFFFFF' : '#0F2B5B';

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" role="img" aria-label="MAKOLO">
        <title>MAKOLO</title>
        {/* Éclats de célébration */}
        <g stroke="#FF7A30" strokeWidth="3.6" strokeLinecap="round">
          <path d="M30 3v8" />
          <path d="M21.5 6.5 25 13" />
          <path d="M38.5 6.5 35 13" />
        </g>
        {/* Calendrier / disponibilité */}
        <g>
          <rect x="46" y="8" width="15" height="14" rx="3.4" fill="#FF7A30" />
          <path d="M49.5 6.5v3.5M57.5 6.5v3.5" stroke="#FF7A30" strokeWidth="3" strokeLinecap="round" />
          <g fill="#FFFFFF">
            <rect x="49" y="13.5" width="3.4" height="3" rx="1" />
            <rect x="54.5" y="13.5" width="3.4" height="3" rx="1" />
            <rect x="49" y="18" width="3.4" height="3" rx="1" />
          </g>
        </g>
        {/* M géométrique */}
        <path
          d="M9 55V19.5L32 38l23-18.5V55"
          fill="none"
          stroke={markColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Espace négatif : table et deux chaises */}
        <g stroke={tone === 'dark' ? '#0F2B5B' : '#FFFFFF'} strokeWidth="2.6" strokeLinecap="round" fill="none">
          <path d="M25 45h14M32 45v7" />
          <path d="M20 40v12M20 46h4" />
          <path d="M44 40v12M44 46h-4" />
        </g>
        {/* Flèche de service */}
        <path
          d="M15 52c10 8 26 7 36-6"
          fill="none"
          stroke="#FF7A30"
          strokeWidth="4.4"
          strokeLinecap="round"
        />
        <path d="M47 41.5 52.5 45l-2 6" fill="none" stroke="#FF7A30" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {variant === 'full' && (
        <span className="flex flex-col leading-none">
          <span
            className="text-[1.3rem] font-extrabold tracking-[-0.03em]"
            style={{ color: wordColor }}
          >
            MAKOLO
          </span>
          {showTagline && (
            <span className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-doux">
              Louez • Célébrez • Simplement
            </span>
          )}
        </span>
      )}
    </span>
  );
}
