import * as React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, fieldAria } from '@/components/ui/field';
import { AuthShell } from '@/components/auth/AuthShell';
import { api } from '@/services';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/validations';
import { errorMessage } from '@/lib/errors';

export function ForgotPasswordPage() {
  useDocumentTitle('Mot de passe oublié', 'Réinitialisez le mot de passe de votre compte MAKOLO.');
  const [sent, setSent] = React.useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await api.requestPasswordReset(values.email);
      // Réponse identique que le compte existe ou non (anti-énumération).
      setSent(true);
    } catch (error) {
      form.setError('root', { message: errorMessage(error) });
    }
  });

  if (sent) {
    return (
      <AuthShell
        title="E-mail envoyé"
        description="Si un compte est associé à cette adresse, vous recevrez un lien pour définir un nouveau mot de passe."
      >
        <div className="rounded-2xl border border-doux-200 bg-ivoire p-5">
          <MailCheck className="size-8 text-orange" aria-hidden="true" />
          <p className="mt-3 text-sm text-doux-600">
            Pensez à vérifier vos courriers indésirables. Le lien est valable une heure.
          </p>
        </div>
        <Button asChild size="lg" block className="mt-5">
          <Link to="/connexion">Retour à la connexion</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      description="Saisissez votre adresse e-mail : nous vous enverrons un lien de réinitialisation."
      footer={
        <p>
          <Link to="/connexion" className="font-semibold text-nuit hover:text-orange-600 hover:underline">
            Retour à la connexion
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

        <Button type="submit" size="lg" block loading={form.formState.isSubmitting} loadingText="Envoi…">
          Envoyer le lien
        </Button>
      </form>
    </AuthShell>
  );
}
