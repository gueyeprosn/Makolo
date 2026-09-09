import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Pagination compacte : évite de charger toutes les annonces d'un coup. */
export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildRange(page, totalPages);

  return (
    <nav className={cn('flex items-center justify-center gap-1.5', className)} aria-label="Pagination">
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Page précédente"
      >
        <ChevronLeft aria-hidden="true" />
      </Button>

      {pages.map((item, index) =>
        item === '…' ? (
          <span key={`gap-${index}`} className="px-1.5 text-sm text-doux" aria-hidden="true">
            …
          </span>
        ) : (
          <Button
            key={item}
            variant={item === page ? 'primary' : 'outline'}
            size="icon-sm"
            onClick={() => onPageChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === page ? 'page' : undefined}
          >
            {item}
          </Button>
        ),
      )}

      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Page suivante"
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}

function buildRange(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const range: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) range.push('…');
  for (let i = start; i <= end; i += 1) range.push(i);
  if (end < totalPages - 1) range.push('…');
  range.push(totalPages);
  return range;
}
