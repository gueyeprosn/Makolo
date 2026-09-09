import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { DemoBanner } from '@/components/common/DemoBanner';

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#contenu-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-nuit focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Aller au contenu principal
      </a>
      <DemoBanner />
      <Header />
      <main id="contenu-principal" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
