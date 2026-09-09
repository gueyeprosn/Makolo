import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/services';
import type { ProfileValues, RegisterValues } from '@/lib/validations';
import type { Profile, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  /** `true` tant que la session initiale n'a pas été résolue. */
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (values: RegisterValues) => Promise<{ user: User | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (values: ProfileValues) => Promise<Profile>;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

/**
 * Source de vérité de la session côté interface.
 *
 * La persistance est gérée par Supabase Auth (`persistSession`) ; ce provider
 * se contente de refléter l'état courant et de vider le cache des requêtes à
 * chaque changement d'utilisateur pour éviter toute fuite de données entre
 * deux comptes.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [initializing, setInitializing] = React.useState(true);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    let active = true;

    api
      .getCurrentUser()
      .then((current) => {
        if (active) setUser(current);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setInitializing(false);
      });

    const unsubscribe = api.onAuthStateChange((next) => {
      if (!active) return;
      setUser(next);
      queryClient.clear();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryClient]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      profile: user?.profile ?? null,
      initializing,
      signIn: async (email, password) => {
        const next = await api.signIn(email, password);
        setUser(next);
        queryClient.clear();
        return next;
      },
      signUp: async (values) => {
        const result = await api.signUp(values);
        if (result.user) {
          setUser(result.user);
          queryClient.clear();
        }
        return result;
      },
      signOut: async () => {
        await api.signOut();
        setUser(null);
        queryClient.clear();
      },
      updateProfile: async (values) => {
        if (!user) throw new Error('Non authentifié');
        const profile = await api.updateProfile(user.id, values);
        setUser({ ...user, profile });
        return profile;
      },
      refresh: async () => {
        setUser(await api.getCurrentUser());
      },
    }),
    [user, initializing, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>.');
  return context;
}
