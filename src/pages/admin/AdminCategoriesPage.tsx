import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FolderTree, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Field, fieldAria } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RowSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { categoryIcon } from '@/components/listings/CategoryCard';
import { api } from '@/services';
import { useCategories } from '@/hooks/use-listings';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { categorySchema, type CategoryValues } from '@/lib/validations';
import { errorMessage } from '@/lib/errors';
import type { Category } from '@/types';

export function AdminCategoriesPage() {
  useDocumentTitle('Catégories');
  const toast = useToast();
  const queryClient = useQueryClient();
  const categoriesQuery = useCategories(true);

  const [editing, setEditing] = React.useState<Category | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Category | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '', icon: '', image_url: '', active: true },
  });

  const open = creating || Boolean(editing);

  const openCreate = () => {
    form.reset({ name: '', description: '', icon: '', image_url: '', active: true });
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (category: Category) => {
    form.reset({
      name: category.name,
      description: category.description ?? '',
      icon: category.icon ?? '',
      image_url: category.image_url ?? '',
      active: category.active,
    });
    setCreating(false);
    setEditing(category);
  };

  const closeDialog = () => {
    setCreating(false);
    setEditing(null);
    form.reset();
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        await api.updateCategory(editing.id, values);
        toast.success('Catégorie modifiée avec succès.');
      } else {
        await api.createCategory(values);
        toast.success('Catégorie créée avec succès.');
      }
      refresh();
      closeDialog();
    } catch (error) {
      form.setError('root', { message: errorMessage(error) });
    }
  });

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteCategory(toDelete.id);
      refresh();
      toast.success('Catégorie supprimée.');
    } catch (error) {
      toast.error('Suppression impossible', errorMessage(error));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const categories = categoriesQuery.data ?? [];

  return (
    <>
      <PageHeader
        title="Catégories"
        description="Organisez le catalogue de matériel proposé sur MAKALO."
        action={
          <Button variant="accent" onClick={openCreate}>
            <PlusCircle className="size-4" aria-hidden="true" />
            Nouvelle catégorie
          </Button>
        }
      />

      {categoriesQuery.isPending && <RowSkeleton rows={4} />}

      {categoriesQuery.isError && (
        <ErrorState message={errorMessage(categoriesQuery.error)} onRetry={() => categoriesQuery.refetch()} />
      )}

      {categoriesQuery.data && categories.length === 0 && (
        <EmptyState
          icon={FolderTree}
          title="Aucune catégorie"
          description="Créez la première catégorie pour structurer le catalogue."
          action={<Button onClick={openCreate}>Créer une catégorie</Button>}
        />
      )}

      {categories.length > 0 && (
        <ul className="space-y-3">
          {categories.map((category) => {
            const Icon = categoryIcon(category.slug);
            return (
              <li
                key={category.id}
                className="flex flex-col gap-3 rounded-2xl border border-doux-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ivoire text-nuit">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-nuit">
                      {category.name}
                      {!category.active && <Badge variant="neutral">Inactive</Badge>}
                    </p>
                    <p className="truncate text-sm text-doux">{category.description ?? '—'}</p>
                    <p className="text-xs text-doux-400">/{category.slug}</p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(category)}>
                    <Pencil className="size-4" aria-hidden="true" />
                    Modifier
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setToDelete(category)}>
                    <Trash2 className="size-4" aria-hidden="true" />
                    Supprimer
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={(next) => !next && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
            <DialogDescription>
              Le slug utilisé dans les URL est généré automatiquement à partir du nom.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {form.formState.errors.root && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <Field label="Nom" htmlFor="name" required error={form.formState.errors.name?.message}>
              <Input
                placeholder="Chaises"
                {...fieldAria('name', form.formState.errors.name?.message)}
                {...form.register('name')}
              />
            </Field>

            <Field label="Description" htmlFor="description" error={form.formState.errors.description?.message}>
              <Textarea
                rows={3}
                placeholder="Pour vos invités et cérémonies"
                {...fieldAria('description', form.formState.errors.description?.message)}
                {...form.register('description')}
              />
            </Field>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-ivoire px-4 py-3">
              <Label htmlFor="active" className="cursor-pointer">
                Catégorie visible par les visiteurs
              </Label>
              <Switch
                id="active"
                checked={form.watch('active')}
                onCheckedChange={(checked) => form.setValue('active', checked, { shouldDirty: true })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annuler
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting} loadingText="Enregistrement…">
                {editing ? 'Enregistrer' : 'Créer la catégorie'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(next) => !next && setToDelete(null)}
        title="Supprimer cette catégorie ?"
        description={`« ${toDelete?.name ?? ''} » sera définitivement supprimée. Si des annonces y sont rattachées, désactivez-la plutôt que de la supprimer.`}
        confirmLabel="Supprimer"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
