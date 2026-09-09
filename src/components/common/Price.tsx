import { PRICE_UNIT_SHORT } from '@/constants';
import { formatPrice, cn } from '@/lib/utils';
import type { PriceUnit } from '@/types';

interface PriceProps {
  amount: number;
  unit: PriceUnit;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Affichage normalisé d'un tarif : « 25 000 FCFA / jour ». */
export function Price({ amount, unit, size = 'md', className }: PriceProps) {
  return (
    <p className={cn('flex items-baseline gap-1.5', className)}>
      <span
        className={cn(
          'font-bold text-nuit',
          size === 'sm' && 'text-base',
          size === 'md' && 'text-lg',
          size === 'lg' && 'text-2xl sm:text-3xl',
        )}
      >
        {formatPrice(amount)}
      </span>
      <span className={cn('font-medium text-doux', size === 'lg' ? 'text-sm' : 'text-xs')}>
        {PRICE_UNIT_SHORT[unit]}
      </span>
    </p>
  );
}
