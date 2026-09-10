import * as React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  FileText,
  FolderOpen,
  FolderTree,
  HelpCircle,
  Home,
  Image,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Newspaper,
  Package,
  Search,
  ShieldCheck,
  Tag,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Logo } from '@/components/common/Logo';
import { DemoBanner } from '@/components/common/DemoBanner';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { UserMenu } from '@/components/layout/UserMenu';
import { cn } from '@/lib/utils';

interface AdminNavLink {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface AdminNavDisabled {
  label: string;
  icon: LucideIcon;
}

interface AdminNavGroup {
  label: string;
  links: AdminNavLink[];
  disabled?: AdminNavDisabled[];
}

/**
 * Arborescence confirmée : Direction (chiffres et pilotage), Opérations
 * (travail quotidien de validation) et Contenu (CMS). Les entrées `disabled`
 * correspondent à des chantiers du master prompt sans aucune donnée réelle
 * derrière — elles restent visibles (jamais masquées silencieusement) mais
 * non cliquables, avec un repère « Bientôt disponible ».
 */
const NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Direction',
    links: [{ to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Opérations',
    links: [
      { to: '/admin/operations/prestataires', label: 'Prestataires', icon: ShieldCheck },
      { to: '/admin/operations/utilisateurs', label: 'Utilisateurs', icon: Users },
      { to: '/admin/operations/annonces', label: 'Annonces', icon: Package },
      { to: '/admin/operations/reservations', label: 'Réservations', icon: CalendarClock },
      { to: '/admin/operations/calendrier', label: 'Calendrier', icon: CalendarDays },
    ],
    disabled: [
      { label: 'Litiges', icon: AlertTriangle },
      { label: 'Support', icon: LifeBuoy },
    ],
  },
  {
    label: 'Contenu',
    links: [{ to: '/admin/cms/categories', label: 'Catégories', icon: FolderTree }],
    disabled: [
      { label: "Page d'accueil", icon: Home },
      { label: 'Pages', icon: FileText },
      { label: 'Bannières', icon: Image },
      { label: 'Médias', icon: FolderOpen },
      { label: 'Articles', icon: Newspaper },
      { label: 'FAQ', icon: HelpCircle },
      { label: 'SEO', icon: Search },
      { label: 'Promotions', icon: Tag },
    ],
  },
];

function NavLinkItem({ item, onNavigate }: { item: AdminNavLink; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
          isActive ? 'bg-nuit text-white shadow-sm' : 'text-doux-600 hover:bg-doux-100 hover:text-nuit',
        )
      }
    >
      <item.icon className="size-4 shrink-0" aria-hidden="true" />
      {item.label}
    </NavLink>
  );
}

function DisabledNavItem({ item }: { item: AdminNavDisabled }) {
  return (
    <div
      aria-disabled="true"
      title="Fonctionnalité pas encore disponible"
      className="flex cursor-not-allowed items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-doux-300"
    >
      <item.icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      <span className="shrink-0 whitespace-nowrap rounded-full bg-doux-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-doux-400">
        Bientôt
      </span>
    </div>
  );
}

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-6" aria-label="Navigation administration">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.14em] text-doux">{group.label}</p>
          <div className="flex flex-col gap-1">
            {group.links.map((item) => (
              <NavLinkItem key={item.to} item={item} onNavigate={onNavigate} />
            ))}
            {group.disabled?.map((item) => <DisabledNavItem key={item.label} item={item} />)}
          </div>
        </div>
      ))}
    </nav>
  );
}

/**
 * Ossature du back-office (3 niveaux : Direction / Opérations / Contenu).
 * Distincte de `DashboardLayout` (espaces client/prestataire) : navigation
 * groupée, pas de footer marketing, retour explicite vers le site public.
 */
export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-ivoire/50">
      <DemoBanner />

      <header className="sticky top-0 z-40 border-b border-doux-200 bg-white">
        <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Ouvrir le menu d'administration">
                  <Menu aria-hidden="true" />
                </Button>
              </DrawerTrigger>
              <DrawerContent side="left" className="p-5">
                <DrawerTitle className="sr-only">Navigation administration</DrawerTitle>
                <DrawerDescription className="sr-only">Accédez aux sections du back-office MAKALO.</DrawerDescription>
                <Link to="/admin" onClick={() => setMobileOpen(false)}>
                  <Logo />
                </Link>
                <div className="mt-4 flex-1 overflow-y-auto">
                  <AdminNav onNavigate={() => setMobileOpen(false)} />
                </div>
                <DrawerClose asChild>
                  <Button variant="outline" block>
                    <Link to="/" className="flex w-full items-center justify-center gap-2">
                      <ArrowLeft className="size-4" aria-hidden="true" />
                      Retour au site
                    </Link>
                  </Button>
                </DrawerClose>
              </DrawerContent>
            </Drawer>

            <Link to="/admin" className="rounded-lg focus-visible:ring-2 focus-visible:ring-orange" aria-label="MAKALO — Administration">
              <Logo />
            </Link>
            <span className="hidden rounded-full bg-nuit-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-nuit sm:inline">
              Administration
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link to="/">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Retour au site
              </Link>
            </Button>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-doux-200 bg-white p-4 lg:block">
          <AdminNav />
        </aside>

        <main id="contenu-principal" className="min-w-0 flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
