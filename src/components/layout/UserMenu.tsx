import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Heart, LayoutDashboard, LogOut, Shield, Store, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { ROLE_LABEL } from '@/constants';
import { errorMessage } from '@/lib/errors';
import { firstName } from '@/lib/utils';

export function UserMenu() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  if (!profile) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Vous êtes déconnecté.');
      navigate('/');
    } catch (error) {
      toast.error('Déconnexion impossible', errorMessage(error));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-doux-100 focus-visible:ring-2 focus-visible:ring-orange"
          aria-label="Menu du compte"
        >
          <Avatar name={profile.full_name} src={profile.avatar_url} className="size-8" />
          <span className="hidden text-sm font-semibold text-nuit sm:inline">{firstName(profile.full_name)}</span>
          <ChevronDown className="size-4 text-doux" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-bold text-nuit">{profile.full_name}</p>
          <p className="truncate text-xs text-doux">{profile.email}</p>
          <Badge variant="orange" className="mt-2">
            {ROLE_LABEL[profile.role]}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {profile.role === 'client' && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/dashboard">
                <LayoutDashboard aria-hidden="true" />
                Mon tableau de bord
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/favoris">
                <Heart aria-hidden="true" />
                Mes favoris
              </Link>
            </DropdownMenuItem>
          </>
        )}

        {profile.role === 'provider' && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/prestataire">
                <Store aria-hidden="true" />
                Espace prestataire
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/prestataire/annonces">
                <LayoutDashboard aria-hidden="true" />
                Mes annonces
              </Link>
            </DropdownMenuItem>
          </>
        )}

        {profile.role === 'admin' && (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <Shield aria-hidden="true" />
              Administration
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <Link to="/profil">
            <UserIcon aria-hidden="true" />
            Mon profil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={handleSignOut}>
          <LogOut aria-hidden="true" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
