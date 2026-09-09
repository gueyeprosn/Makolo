import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Store, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, fieldAria } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/hooks/use-auth';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { registerSchema, type RegisterValues } from '@/lib/validations';
import { errorMessage } from '@/lib/errors';
import { CITIES, ROLE_HOME } from '@/constants';
import { cn } from '@/lib/utils';

export function RegisterPage() {
  useDocumentTitle('Créer un compte', 'Rejoignez MAKOLO en tant que client ou prestataire.');
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [confirmationSent, setConfirmationSent] = React.useState(false);

  const initialRole = searchParams.get('role') === 'prestataire' ? 'provider' : 'client';

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      city: 'Dakar',
      role: initialRole,
      password: '',
      confirm_password: '',
      accept_terms: false as unknown as true,
    },
  });

  const role = form.watch('role');

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await signUp(values);
      if (result.needsEmailConfirmation) {
        setConfirmationSent(true);
        return;
      }
      toast.success('Bienvenue sur MAKOLO !', 'Votre compte a été créé avec succès.');
      navigate(ROLE_HOME[values.role], { replace: true });
    } catch (error) {
      form.setError('root', { message: errorMessage(error) });
    }
  });

  if (confirmationSent) {
    return (
      <AuthShell
        title="Vérifiez votre boîte e-mail"
        description="Nous vous avons envoyé un lien de confirmation. Cliquez dessus pour activer votre compte, puis connectez-vous."
      >
        <Button asChild size="lg" block>
          <Link to="/connexion">Aller à la connexion</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Créer un compte"
      description="Quelques informations suffisent pour commencer."
      footer={
        <p>
          Vous avez déjà un compte ?{' '}
          <Link to="/connexion" className="font-semibold text-nuit hover:text-orange-600 hover:underline">
            Se connecter
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

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-nuit">Je souhaite…</legend>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { value: 'client', label: 'Louer du matériel', icon: User },
                { value: 'provider', label: 'Louer mon matériel', icon: Store },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-3.5 text-sm font-semibold transition-colors',
                  'focus-within:ring-2 focus-within:ring-orange focus-within:ring-offset-2',
                  role === option.value
                    ? 'border-orange bg-orange-50 text-nuit'
                    : 'border-doux-200 bg-white text-doux-600 hover:border-doux-300',
                )}
              >
                <input type="radio" value={option.value} className="sr-only" {...form.register('role')} />
                <option.icon className="size-5" aria-hidden="true" />
                {option.label}
              </label>
            ))}
          </div>
          {form.formState.errors.role && (
            <p role="alert" className="mt-1.5 text-sm text-destructive">
              {form.formState.errors.role.message}
            </p>
          )}
        </fieldset>

        <Field label="Nom complet" htmlFor="full_name" required error={form.formState.errors.full_name?.message}>
          <Input
            autoComplete="name"
            placeholder="Fatou Sarr"
            {...fieldAria('full_name', form.formState.errors.full_name?.message)}
            {...form.register('full_name')}
          />
        </Field>

        <Field label="Adresse e-mail" htmlFor="email" required error={form.formState.errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.sn"
            {...fieldAria('email', form.formState.errors.email?.message)}
            {...form.register('email')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Téléphone" htmlFor="phone" hint="Facultatif" error={form.formState.errors.phone?.message}>
            <Input
              type="tel"
              autoComplete="tel"
              placeholder="77 123 45 67"
              {...fieldAria('phone', form.formState.errors.phone?.message, 'hint')}
              {...form.register('phone')}
            />
          </Field>

          <Field label="Ville" htmlFor="city" required error={form.formState.errors.city?.message}>
            <Select
              value={form.watch('city')}
              onValueChange={(value) => form.setValue('city', value, { shouldValidate: true })}
            >
              <SelectTrigger id="city">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field
          label="Mot de passe"
          htmlFor="password"
          required
          hint="8 caractères minimum, avec au moins une lettre et un chiffre."
          error={form.formState.errors.password?.message}
        >
          <Input
            type="password"
            autoComplete="new-password"
            {...fieldAria('password', form.formState.errors.password?.message, 'hint')}
            {...form.register('password')}
          />
        </Field>

        <Field
          label="Confirmer le mot de passe"
          htmlFor="confirm_password"
          required
          error={form.formState.errors.confirm_password?.message}
        >
          <Input
            type="password"
            autoComplete="new-password"
            {...fieldAria('confirm_password', form.formState.errors.confirm_password?.message)}
            {...form.register('confirm_password')}
          />
        </Field>

        <div className="space-y-1.5">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="accept_terms"
              checked={form.watch('accept_terms')}
              onCheckedChange={(checked) =>
                form.setValue('accept_terms', (checked === true) as true, { shouldValidate: true })
              }
              aria-invalid={Boolean(form.formState.errors.accept_terms)}
            />
            <Label htmlFor="accept_terms" className="cursor-pointer font-normal leading-snug text-doux-600">
              J'accepte les conditions d'utilisation et la politique de confidentialité de MAKOLO.
            </Label>
          </div>
          {form.formState.errors.accept_terms && (
            <p role="alert" className="text-sm text-destructive">
              {form.formState.errors.accept_terms.message}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" block loading={form.formState.isSubmitting} loadingText="Création…">
          Créer mon compte
        </Button>
      </form>
    </AuthShell>
  );
}
