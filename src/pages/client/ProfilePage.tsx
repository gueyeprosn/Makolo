import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Field, fieldAria } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { api } from '@/services';
import { useAuth } from '@/hooks/use-auth';
import { useDocumentTitle } from '@/hooks/use-document-title';
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from '@/lib/validations';
import { errorMessage } from '@/lib/errors';
import { CITIES, ROLE_LABEL } from '@/constants';
import { formatDate } from '@/lib/utils';

export function ProfilePage() {
  useDocumentTitle('Mon profil');
  const { profile, updateProfile } = useAuth();
  const toast = useToast();

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      city: (profile?.city as ProfileValues['city']) ?? 'Dakar',
      bio: profile?.bio ?? '',
    },
  });

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: '', confirm_password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateProfile(values);
      toast.success('Profil mis à jour avec succès.');
      form.reset(values);
    } catch (error) {
      form.setError('root', { message: errorMessage(error) });
    }
  });

  const onPasswordSubmit = passwordForm.handleSubmit(async (values) => {
    try {
      await api.updatePassword(values.password);
      toast.success('Mot de passe modifié avec succès.');
      passwordForm.reset();
    } catch (error) {
      passwordForm.setError('root', { message: errorMessage(error) });
    }
  });

  if (!profile) return null;

  return (
    <>
      <PageHeader title="Mon profil" description="Gérez vos informations personnelles et votre mot de passe." />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <Avatar name={profile.full_name} src={profile.avatar_url} className="size-16" />
          <div className="min-w-0">
            <p className="text-lg font-bold text-nuit">{profile.full_name}</p>
            <p className="truncate text-sm text-doux">{profile.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="orange">{ROLE_LABEL[profile.role]}</Badge>
              <span className="text-xs text-doux">Membre depuis le {formatDate(profile.created_at)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>Ces informations aident les prestataires à traiter vos demandes.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {form.formState.errors.root && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-destructive">
                  {form.formState.errors.root.message}
                </p>
              )}

              <Field label="Nom complet" htmlFor="full_name" required error={form.formState.errors.full_name?.message}>
                <Input
                  autoComplete="name"
                  {...fieldAria('full_name', form.formState.errors.full_name?.message)}
                  {...form.register('full_name')}
                />
              </Field>

              <Field
                label="Adresse e-mail"
                htmlFor="email-readonly"
                hint="L'adresse e-mail ne peut pas être modifiée depuis cette page."
              >
                <Input id="email-readonly" value={profile.email} readOnly disabled />
              </Field>

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
                  onValueChange={(value) => form.setValue('city', value, { shouldValidate: true, shouldDirty: true })}
                >
                  <SelectTrigger id="city">
                    <SelectValue />
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

              <Field
                label={profile.role === 'provider' ? 'Présentation de votre activité' : 'À propos de vous'}
                htmlFor="bio"
                hint={
                  profile.role === 'provider'
                    ? 'Ce texte est affiché publiquement sur votre profil prestataire.'
                    : 'Facultatif.'
                }
                error={form.formState.errors.bio?.message}
              >
                <Textarea
                  rows={4}
                  {...fieldAria('bio', form.formState.errors.bio?.message, 'hint')}
                  {...form.register('bio')}
                />
              </Field>

              <Button
                type="submit"
                loading={form.formState.isSubmitting}
                loadingText="Enregistrement…"
                disabled={!form.formState.isDirty}
              >
                <Save className="size-4" aria-hidden="true" />
                Enregistrer les modifications
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Mot de passe</CardTitle>
            <CardDescription>Choisissez un mot de passe d'au moins 8 caractères.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onPasswordSubmit} className="space-y-4" noValidate>
              {passwordForm.formState.errors.root && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-destructive">
                  {passwordForm.formState.errors.root.message}
                </p>
              )}

              <Field
                label="Nouveau mot de passe"
                htmlFor="new-password"
                required
                error={passwordForm.formState.errors.password?.message}
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...fieldAria('new-password', passwordForm.formState.errors.password?.message)}
                  {...passwordForm.register('password')}
                />
              </Field>

              <Field
                label="Confirmer le mot de passe"
                htmlFor="confirm-new-password"
                required
                error={passwordForm.formState.errors.confirm_password?.message}
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...fieldAria('confirm-new-password', passwordForm.formState.errors.confirm_password?.message)}
                  {...passwordForm.register('confirm_password')}
                />
              </Field>

              <Button type="submit" variant="outline" loading={passwordForm.formState.isSubmitting} loadingText="Modification…">
                <KeyRound className="size-4" aria-hidden="true" />
                Modifier le mot de passe
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
