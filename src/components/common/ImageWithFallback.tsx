import * as React from 'react';
import { GENERIC_PLACEHOLDER } from '@/assets/placeholders';
import { cn } from '@/lib/utils';

interface ImageWithFallbackProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallback?: string;
  alt: string;
}

/**
 * Image tolérante aux pannes : une URL manquante ou cassée n'affiche jamais
 * une icône de fichier brisé, mais un visuel de repli aux couleurs de la marque.
 */
export function ImageWithFallback({ src, fallback = GENERIC_PLACEHOLDER, alt, className, ...props }: ImageWithFallbackProps) {
  const [failed, setFailed] = React.useState(false);
  const resolved = !src || failed ? fallback : src;

  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <img
      src={resolved}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('bg-ivoire object-cover', className)}
      {...props}
    />
  );
}
