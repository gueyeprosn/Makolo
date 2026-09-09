import { NavLink, Outlet } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DemoBanner } from '@/components/common/DemoBanner';
import { cn } from '@/lib/utils';

export interface DashboardNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface DashboardLayoutProps {
  title: string;
  items: DashboardNavItem[];
}

/**
 * Ossature commune aux trois espaces connectés (client, prestataire, admin).
 * La navigation devient une barre horizontale défilante sur mobile.
 */
export function DashboardLayout({ title, items }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-ivoire/50">
      <DemoBanner />
      <Header />

      <div className="container flex-1 py-6 lg:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <aside className="lg:w-60 lg:shrink-0" aria-label={title}>
            <p className="mb-3 hidden text-xs font-bold uppercase tracking-[0.14em] text-doux lg:block">{title}</p>
            <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:px-0 lg:pb-0">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                      isActive ? 'bg-nuit text-white shadow-sm' : 'bg-white text-doux-600 hover:bg-white hover:text-nuit lg:bg-transparent',
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <main id="contenu-principal" className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
