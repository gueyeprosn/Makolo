import { Route, Routes } from 'react-router-dom';
import { CalendarClock, Heart, LayoutDashboard, Package, Store, User as UserIcon } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ProtectedRoute, GuestRoute } from '@/routes/ProtectedRoute';
import { ScrollToTop } from '@/routes/ScrollToTop';

import { HomePage } from '@/pages/HomePage';
import { MarketplacePage } from '@/pages/MarketplacePage';
import { ListingDetailPage } from '@/pages/ListingDetailPage';
import { ProviderProfilePage } from '@/pages/ProviderProfilePage';
import { LegalPage } from '@/pages/LegalPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';

import { ClientDashboardPage } from '@/pages/client/ClientDashboardPage';
import { ClientBookingsPage } from '@/pages/client/ClientBookingsPage';
import { FavoritesPage } from '@/pages/client/FavoritesPage';
import { ProfilePage } from '@/pages/client/ProfilePage';

import { ProviderDashboardPage } from '@/pages/provider/ProviderDashboardPage';
import { ProviderListingsPage } from '@/pages/provider/ProviderListingsPage';
import { ProviderBookingsPage } from '@/pages/provider/ProviderBookingsPage';
import { ListingFormPage } from '@/pages/provider/ListingFormPage';

import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminListingsPage } from '@/pages/admin/AdminListingsPage';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage';
import { AdminBookingsPage } from '@/pages/admin/AdminBookingsPage';
import { AdminProvidersPage } from '@/pages/admin/AdminProvidersPage';
import { AdminCalendarPage } from '@/pages/admin/AdminCalendarPage';

const CLIENT_NAV = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/demandes', label: 'Mes demandes', icon: CalendarClock },
  { to: '/favoris', label: 'Mes favoris', icon: Heart },
  { to: '/profil', label: 'Mon profil', icon: UserIcon },
];

const PROVIDER_NAV = [
  { to: '/prestataire', label: 'Tableau de bord', icon: Store, end: true },
  { to: '/prestataire/annonces', label: 'Mes annonces', icon: Package },
  { to: '/prestataire/demandes', label: 'Demandes reçues', icon: CalendarClock },
  { to: '/profil', label: 'Mon profil', icon: UserIcon },
];

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* ------------------------------------------------ Pages publiques */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="materiel" element={<MarketplacePage />} />
          <Route path="materiel/:slug" element={<ListingDetailPage />} />
          <Route path="prestataire/:id" element={<ProviderProfilePage />} />
          <Route path="mentions-legales" element={<LegalPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* ------------------------------------------ Authentification */}
        <Route element={<GuestRoute />}>
          <Route path="connexion" element={<LoginPage />} />
          <Route path="inscription" element={<RegisterPage />} />
          <Route path="mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        </Route>

        {/* ------------------------------------------------ Espace client */}
        <Route element={<ProtectedRoute roles={['client', 'admin']} />}>
          <Route element={<DashboardLayout title="Mon espace" items={CLIENT_NAV} />}>
            <Route path="dashboard" element={<ClientDashboardPage />} />
            <Route path="demandes" element={<ClientBookingsPage />} />
            <Route path="favoris" element={<FavoritesPage />} />
          </Route>
        </Route>

        {/* Profil : accessible à tout compte connecté, quel que soit son rôle */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout title="Mon compte" items={CLIENT_NAV} />}>
            <Route path="profil" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* ------------------------------------------ Espace prestataire */}
        <Route element={<ProtectedRoute roles={['provider', 'admin']} />}>
          <Route element={<DashboardLayout title="Espace prestataire" items={PROVIDER_NAV} />}>
            <Route path="prestataire" element={<ProviderDashboardPage />} />
            <Route path="prestataire/annonces" element={<ProviderListingsPage />} />
            <Route path="prestataire/annonces/nouveau" element={<ListingFormPage />} />
            <Route path="prestataire/annonces/:id/modifier" element={<ListingFormPage />} />
            <Route path="prestataire/demandes" element={<ProviderBookingsPage />} />
          </Route>
        </Route>

        {/* ------------------------------------------------ Back-office */}
        {/* 3 niveaux : Direction (/admin), Opérations, Contenu — voir docs/USER-JOURNEYS.md */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route element={<AdminLayout />}>
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/operations/prestataires" element={<AdminProvidersPage />} />
            <Route path="admin/operations/utilisateurs" element={<AdminUsersPage />} />
            <Route path="admin/operations/annonces" element={<AdminListingsPage />} />
            <Route path="admin/operations/reservations" element={<AdminBookingsPage />} />
            <Route path="admin/operations/calendrier" element={<AdminCalendarPage />} />
            <Route path="admin/cms/categories" element={<AdminCategoriesPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
