import type { LucideIcon } from 'lucide-react';
import { formatNumber, cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: 'nuit' | 'orange' | 'success' | 'danger';
  hint?: string;
}

const TONES = {
  nuit: 'bg-nuit-50 text-nuit',
  orange: 'bg-orange-50 text-orange-600',
  success: 'bg-emerald-50 text-emerald-600',
  danger: 'bg-red-50 text-destructive',
} as const;

export function StatCard({ label, value, icon: Icon, tone = 'nuit', hint }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-doux-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-doux">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-nuit">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          {hint && <p className="mt-1 text-xs text-doux">{hint}</p>}
        </div>
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
