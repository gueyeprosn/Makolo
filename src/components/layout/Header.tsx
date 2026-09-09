import * as React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Heart, LayoutDashboard, LogIn, Menu, PlusCircle, Shield, Store, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Logo } from '@/components/common/Logo';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';
import { useAuth } from '@/hooks/use-auth';
import { ROLE_HOME } from '@/constants';
import { cn } from '@/lib/utils';

const PUBLIC_LINKS = [
  { to: '/materiel', label: 'Matériel' },
  { to: '/#comment-ca-marche', label: 'Comment ça marche' },
  { to: '/#devenir-prestataire', label: 'Devenir prestataire' },
];

export function Header() {
  const { user, profile } = useAuth();
  const [open, setOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  const publishHref = !user ? '/inscription?role=prestataire' : profile?.role === 'provider' ? '/prestataire/annonces/nouveau' : '/prestataire';

  return (
    <header className="sticky top-0 z-40 border-b border-doux-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="rounded-lg focus-visible:ring-2 focus-visible:ring-orange" aria-label="MAKOLO — Accueil">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {PUBLIC_LINKS.map((link) =>
            link.to.includes('#') ? (
              <a
                key={link.to}
                href={link.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-doux-600 transition-colors hover:bg-doux-100 hover:text-nuit"
              >
                {link.label}
              </a>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-doux-100 hover:text-nuit',
                    isActive ? 'text-nuit' : 'text-doux-600',
                  )
                }
              >
                {link.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/connexion">
                <LogIn className="size-4" aria-hidden="true" />
                Connexion
              </Link>
            </Button>
          )}

          <Button asChild variant="accent" size="sm" className="hidden md:inline-flex">
            <Link to={publishHref}>
              <PlusCircle className="size-4" aria-hidden="true" />
              Publier une offre
            </Link>
          </Button>

          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
                <Menu aria-hidden="true" />
              </Button>
            </DrawerTrigger>
            <DrawerContent side="right" className="p-5">
              <DrawerTitle className="sr-only">Menu de navigation</DrawerTitle>
              <DrawerDescription className="sr-only">Accédez aux sections de MAKOLO.</DrawerDescription>

              <Logo showTagline />

              <nav className="mt-4 flex flex-col gap-1" aria-label="Navigation mobile">
                <DrawerClose asChild>
                  <Link to="/materiel" className="rounded-xl px-3 py-3 text-base font-semibold text-nuit hover:bg-ivoire">
                    Matériel
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <a href="/#comment-ca-marche" className="rounded-xl px-3 py-3 text-base font-semibold text-nuit hover:bg-ivoire">
                    Comment ça marche
                  </a>
                </DrawerClose>
                <DrawerClose asChild>
                  <a href="/#devenir-prestataire" className="rounded-xl px-3 py-3 text-base font-semibold text-nuit hover:bg-ivoire">
                    Devenir prestataire
                  </a>
                </DrawerClose>

                {user && profile && (
                  <>
                    <span className="mt-3 px-3 text-xs font-semibold uppercase tracking-wide text-doux">Mon espace</span>
                    <DrawerClose asChild>
                      <Link to={ROLE_HOME[profile.role]} className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-base font-semibold text-nuit hover:bg-ivoire">
                        {profile.role === 'admin' ? <Shield className="size-4" aria-hidden="true" /> : profile.role === 'provider' ? <Store className="size-4" aria-hidden="true" /> : <LayoutDashboard className="size-4" aria-hidden="true" />}
                        {profile.role === 'admin' ? 'Administration' : profile.role === 'provider' ? 'Espace prestataire' : 'Mon tableau de bord'}
                      </Link>
                    </DrawerClose>
                    {profile.role === 'client' && (
                      <DrawerClose asChild>
                        <Link to="/favoris" className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-base font-semibold text-nuit hover:bg-ivoire">
                          <Heart className="size-4" aria-hidden="true" />
                          Mes favoris
                        </Link>
                      </DrawerClose>
                    )}
                    <DrawerClose asChild>
                      <Link to="/profil" className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-base font-semibold text-nuit hover:bg-ivoire">
                        <UserIcon className="size-4" aria-hidden="true" />
                        Mon profil
                      </Link>
                    </DrawerClose>
                  </>
                )}
              </nav>

              <div className="mt-auto flex flex-col gap-2 pt-6">
                <Button asChild variant="accent" block>
                  <Link to={publishHref}>
                    <PlusCircle className="size-4" aria-hidden="true" />
                    Publier une offre
                  </Link>
                </Button>
                {!user && (
                  <Button asChild variant="outline" block>
                    <Link to="/connexion">Connexion</Link>
                  </Button>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
  );
}
