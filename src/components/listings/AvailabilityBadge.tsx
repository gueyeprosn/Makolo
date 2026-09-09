import { CalendarClock, CheckCircle2, CircleSlash, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AvailabilityState } from '@/types';

const CONFIG: Record<AvailabilityState, { icon: React.ElementType; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  available: { icon: CheckCircle2, variant: 'success' },
  partial: { icon: Clock, variant: 'warning' },
  unavailable: { icon: CircleSlash, variant: 'danger' },
  disabled: { icon: CalendarClock, variant: 'neutral' },
};

interface AvailabilityBadgeProps {
  state: AvailabilityState;
  label: string;
  className?: string;
}

export function AvailabilityBadge({ state, label, className }: AvailabilityBadgeProps) {
  const { icon: Icon, variant } = CONFIG[state];
  return (
    <Badge variant={variant} className={className}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
