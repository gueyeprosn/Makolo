import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, fieldAria } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/hooks/use-auth';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { loginSchema, type LoginValues } from '@/lib/validations';
import { errorMessage } from '@/lib/errors';
import { ROLE_HOME } from '@/constants';
import { firstName } from '@/lib/utils';

export function LoginPage() {
  useDocumentTitle('Connexion', 'Connectez-vous à votre compte MAKOLO.');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const user = await signIn(values.email, values.password);
      toast.success(`Bienvenue, ${firstName(user.profile.full_name)} !`);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? ROLE_HOME[user.profile.role], { replace: true });
    } catch (error) {
      // Message unique et générique : n'indique jamais si l'e-mail existe.
      form.setError('root', { message: errorMessage(error, 'E-mail ou mot de passe incorrect.') });
    }
  });

  return (
    <AuthShell
      title="Connexion"
      description="Accédez à vos demandes, vos favoris et votre espace MAKOLO."
      footer={
        <p>
          Vous n'avez pas encore de compte ?{' '}
          <Link to="/inscription" className="font-semibold text-nuit hover:text-orange-600 hover:underline">
            Créer un compte
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {form.formState.errors.root && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <Field label="Adresse e-mail" htmlFor="email" required error={form.formState.errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.sn"
            {...fieldAria('email', form.formState.errors.email?.message)}
            {...form.register('email')}
          />
        </Field>

        <Field label="Mot de passe" htmlFor="password" required error={form.formState.errors.password?.message}>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...fieldAria('password', form.formState.errors.password?.message)}
            {...form.register('password')}
          />
        </Field>

        <div className="flex justify-end">
          <Link to="/mot-de-passe-oublie" className="text-sm font-medium text-nuit hover:text-orange-600 hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>

        <Button type="submit" size="lg" block loading={form.formState.isSubmitting} loadingText="Connexion…">
          Se connecter
        </Button>
      </form>
    </AuthShell>
  );
}
