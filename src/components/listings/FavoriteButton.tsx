import * as React from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/use-favorites';
import { errorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  listingId: string;
  listingTitle: string;
  className?: string;
  variant?: 'floating' | 'inline';
}

/** Ajout/retrait des favoris, avec invitation à se connecter si nécessaire. */
export function FavoriteButton({ listingId, listingTitle, className, variant = 'floating' }: FavoriteButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: favoriteIds } = useFavoriteIds();
  const toggle = useToggleFavorite();

  const isFavorite = Boolean(favoriteIds?.includes(listingId));

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      toast.info('Connectez-vous pour enregistrer cette offre.');
      navigate('/connexion', { state: { from: window.location.pathname } });
      return;
    }

    toggle.mutate(
      { listingId, isFavorite },
      {
        onSuccess: () => {
          toast.success(isFavorite ? 'Offre retirée des favoris.' : 'Offre ajoutée aux favoris.', listingTitle);
        },
        onError: (error) => toast.error('Action impossible', errorMessage(error)),
      },
    );
  };

  const label = isFavorite ? `Retirer « ${listingTitle} » des favoris` : `Ajouter « ${listingTitle} » aux favoris`;

  if (variant === 'inline') {
    return (
      <Button variant="outline" onClick={handleClick} aria-pressed={isFavorite} className={className}>
        <Heart className={cn('size-4 transition-colors', isFavorite && 'fill-orange text-orange')} aria-hidden="true" />
        {isFavorite ? 'Enregistrée' : 'Enregistrer'}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      aria-pressed={isFavorite}
      className={cn(
        'flex size-9 items-center justify-center rounded-full bg-white/95 text-nuit shadow-sm backdrop-blur transition-transform',
        'hover:scale-105 focus-visible:ring-2 focus-visible:ring-orange active:scale-95',
        className,
      )}
    >
      <Heart
        className={cn('size-[18px] transition-colors', isFavorite && 'animate-pop-in fill-orange text-orange')}
        aria-hidden="true"
      />
    </button>
  );
}
