import { Info } from 'lucide-react';
import { isDemoMode } from '@/services';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/services/demo/data';

/**
 * Bandeau affiché uniquement lorsque Supabase n'est pas configuré, afin qu'un
 * visiteur ne confonde jamais les données fictives avec des données réelles.
 */
export function DemoBanner() {
  if (!isDemoMode) return null;

  return (
    <div className="border-b border-orange-200 bg-orange-50 text-nuit">
      <div className="container flex flex-col gap-1 py-2 text-xs sm:flex-row sm:items-center sm:justify-between sm:text-sm">
        <p className="flex items-center gap-2 font-medium">
          <Info className="size-4 shrink-0 text-orange-600" aria-hidden="true" />
          Mode démonstration — données fictives, non connectées à Supabase.
        </p>
        <p className="text-doux-600">
          Comptes de test : {DEMO_ACCOUNTS.map((account) => account.email).join(' · ')} — mot de passe{' '}
          <span className="font-semibold text-nuit">{DEMO_PASSWORD}</span>
        </p>
      </div>
    </div>
  );
}
