import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Field, fieldAria } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ImageUploader } from '@/components/listings/ImageUploader';
import { useCategories, useCreateListing, useListingById, useUpdateListing } from '@/hooks/use-listings';
import { useAuth } from '@/hooks/use-auth';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { canEditListing } from '@/lib/permissions';
import { listingSchema, type ListingValues } from '@/lib/validations';
import { errorMessage } from '@/lib/errors';
import { CITIES, PRICE_UNITS } from '@/constants';

/** Formulaire de création et de modification d'une annonce. */
export function ListingFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  useDocumentTitle(isEdit ? 'Modifier une annonce' : 'Publier une offre');

  const navigate = useNavigate();
  const toast = useToast();
  const { profile } = useAuth();

  const categoriesQuery = useCategories();
  const listingQuery = useListingById(id);
  const createListing = useCreateListing();
  const updateListing = useUpdateListing();

  // En création, l'identifiant sert à rattacher les photos après enregistrement.
  const [draftId, setDraftId] = React.useState<string | null>(null);

  const form = useForm<ListingValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: '',
      category_id: '',
      description: '',
      price: 0,
      price_unit: 'jour',
      quantity: 1,
      city: (profile?.city as ListingValues['city']) ?? 'Dakar',
      address: '',
      conditions: '',
      availability_status: true,
    },
  });

  React.useEffect(() => {
    const listing = listingQuery.data;
    if (!listing || !isEdit) return;
    form.reset({
      title: listing.title,
      category_id: listing.category_id,
      description: listing.description,
      price: listing.price,
      price_unit: listing.price_unit,
      quantity: listing.quantity,
      city: listing.city,
      address: listing.address ?? '',
      conditions: listing.conditions ?? '',
      availability_status: listing.availability_status,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingQuery.data, isEdit]);

  const submit = async (values: ListingValues, publish: boolean) => {
    try {
      if (isEdit && id) {
        await updateListing.mutateAsync({ id, values });
        toast.success('Offre modifiée avec succès.');
        navigate('/prestataire/annonces');
        return;
      }

      const created = await createListing.mutateAsync({ values, submit: publish });
      setDraftId(created.id);
      toast.success(
        publish ? 'Offre soumise à validation.' : 'Brouillon enregistré.',
        publish
          ? "Votre annonce sera visible dès qu'elle aura été validée par l'équipe MAKALO."
          : 'Ajoutez vos photos puis soumettez-la à validation.',
      );
    } catch (error) {
      form.setError('root', { message: errorMessage(error) });
    }
  };

  const listingId = id ?? draftId;
  const busy = createListing.isPending || updateListing.isPending;

  if (isEdit && listingQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isEdit && listingQuery.isError) {
    return <ErrorState message={errorMessage(listingQuery.error)} onRetry={() => listingQuery.refetch()} />;
  }

  // Contrôle de propriété : un prestataire ne modifie jamais l'annonce d'un autre.
  if (isEdit && listingQuery.data && !canEditListing(profile, listingQuery.data)) {
    return (
      <EmptyState
        title="Modification impossible"
        description="Cette annonce ne vous appartient pas. Vous ne pouvez modifier que vos propres offres."
        action={
          <Button asChild>
            <Link to="/prestataire/annonces">Retour à mes annonces</Link>
          </Button>
        }
      />
    );
  }

  if (isEdit && !listingQuery.isPending && !listingQuery.data) {
    return (
      <EmptyState
        title="Annonce introuvable"
        description="Cette annonce n'existe pas ou a été supprimée."
        action={
          <Button asChild>
            <Link to="/prestataire/annonces">Retour à mes annonces</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/prestataire/annonces">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Retour à mes annonces
        </Link>
      </Button>

      <PageHeader
        title={isEdit ? 'Modifier l’annonce' : 'Publier une offre'}
        description={
          isEdit
            ? 'Mettez à jour les informations de votre matériel.'
            : 'Décrivez votre matériel : votre annonce sera vérifiée avant sa mise en ligne.'
        }
      />

      <form
        onSubmit={form.handleSubmit((values) => submit(values, true))}
        className="space-y-6"
        noValidate
      >
        {form.formState.errors.root && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Informations principales</CardTitle>
            <CardDescription>Ces informations apparaissent sur la fiche de votre offre.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Titre de l'annonce"
              htmlFor="title"
              required
              hint="Exemple : Chaise Napoléon dorée, DJ mariage & soirée, Traiteur buffet 100 couverts."
              error={form.formState.errors.title?.message}
            >
              <Input
                {...fieldAria('title', form.formState.errors.title?.message, 'hint')}
                {...form.register('title')}
              />
            </Field>

            <Field label="Catégorie" htmlFor="category_id" required error={form.formState.errors.category_id?.message}>
              <Select
                value={form.watch('category_id')}
                onValueChange={(value) => form.setValue('category_id', value, { shouldValidate: true })}
              >
                <SelectTrigger id="category_id" aria-invalid={Boolean(form.formState.errors.category_id)}>
                  <SelectValue placeholder={categoriesQuery.isPending ? 'Chargement…' : 'Choisir une catégorie'} />
                </SelectTrigger>
                <SelectContent>
                  {(categoriesQuery.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Description"
              htmlFor="description"
              required
              hint="Décrivez l'offre (matériel ou prestation), ce qui est inclus, et les modalités de livraison ou d'intervention."
              error={form.formState.errors.description?.message}
            >
              <Textarea
                rows={6}
                {...fieldAria('description', form.formState.errors.description?.message, 'hint')}
                {...form.register('description')}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarif et disponibilité</CardTitle>
            <CardDescription>Indiquez votre prix en FCFA et la quantité réellement disponible.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Prix (FCFA)" htmlFor="price" required error={form.formState.errors.price?.message}>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={100}
                {...fieldAria('price', form.formState.errors.price?.message)}
                {...form.register('price')}
              />
            </Field>

            <Field label="Unité" htmlFor="price_unit" required error={form.formState.errors.price_unit?.message}>
              <Select
                value={form.watch('price_unit')}
                onValueChange={(value) =>
                  form.setValue('price_unit', value as ListingValues['price_unit'], { shouldValidate: true })
                }
              >
                <SelectTrigger id="price_unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Quantité disponible"
              htmlFor="quantity"
              required
              error={form.formState.errors.quantity?.message}
            >
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                {...fieldAria('quantity', form.formState.errors.quantity?.message)}
                {...form.register('quantity')}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Localisation et conditions</CardTitle>
            <CardDescription>Où l'offre est-elle disponible et sous quelles conditions ?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ville" htmlFor="city" required error={form.formState.errors.city?.message}>
                <Select
                  value={form.watch('city')}
                  onValueChange={(value) => form.setValue('city', value, { shouldValidate: true })}
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
                label="Adresse ou quartier"
                htmlFor="address"
                hint="Facultatif"
                error={form.formState.errors.address?.message}
              >
                <Input
                  placeholder="Ouakam, Cité Avion"
                  {...fieldAria('address', form.formState.errors.address?.message, 'hint')}
                  {...form.register('address')}
                />
              </Field>
            </div>

            <Field
              label="Conditions de location ou d'intervention"
              htmlFor="conditions"
              hint="Caution, quantité minimum, frais de déplacement, horaires d'intervention ou de retrait…"
              error={form.formState.errors.conditions?.message}
            >
              <Textarea
                rows={4}
                {...fieldAria('conditions', form.formState.errors.conditions?.message, 'hint')}
                {...form.register('conditions')}
              />
            </Field>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-ivoire px-4 py-3.5">
              <div>
                <Label htmlFor="availability_status" className="cursor-pointer">
                  Offre disponible
                </Label>
                <p className="mt-0.5 text-sm text-doux">
                  Désactivez temporairement si vous n'êtes pas disponible (entretien, congés, saison…).
                </p>
              </div>
              <Switch
                id="availability_status"
                checked={form.watch('availability_status')}
                onCheckedChange={(checked) => form.setValue('availability_status', checked, { shouldDirty: true })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>
              {listingId
                ? 'La première photo devient la couverture de votre annonce.'
                : "Enregistrez d'abord votre annonce pour pouvoir ajouter des photos."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listingId ? (
              <ImageUploader listingId={listingId} />
            ) : (
              <p className="rounded-xl border border-dashed border-doux-300 bg-ivoire/50 px-4 py-8 text-center text-sm text-doux">
                Les photos pourront être ajoutées dès que l'annonce sera enregistrée.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" variant="accent" size="lg" loading={busy} loadingText="Enregistrement…">
            <Send className="size-4" aria-hidden="true" />
            {isEdit ? 'Enregistrer les modifications' : 'Soumettre à validation'}
          </Button>

          {!isEdit && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={busy}
              onClick={form.handleSubmit((values) => submit(values, false))}
            >
              <Save className="size-4" aria-hidden="true" />
              Enregistrer comme brouillon
            </Button>
          )}

          {draftId && (
            <Button asChild variant="ghost" size="lg">
              <Link to="/prestataire/annonces">Terminer</Link>
            </Button>
          )}
        </div>
      </form>
    </>
  );
}
