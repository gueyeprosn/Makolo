import * as React from 'react';
import { GripVertical, ImagePlus, Star, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { ImageWithFallback } from '@/components/common/ImageWithFallback';
import { api } from '@/services';
import { useListingImages } from '@/hooks/use-listings';
import { useQueryClient } from '@tanstack/react-query';
import { listingKeys } from '@/hooks/use-listings';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGES_PER_LISTING, MAX_IMAGE_SIZE_MB } from '@/constants';
import { errorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import type { ListingImage } from '@/types';

interface ImageUploaderProps {
  listingId: string;
}

/**
 * Gestion des photos d'une annonce : ajout (clic ou glisser-déposer),
 * aperçu, suppression, réordonnancement et choix de la photo principale.
 * Les fichiers sont envoyés vers Supabase Storage (bucket `listing-images`).
 */
export function ImageUploader({ listingId }: ImageUploaderProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: images = [], isPending } = useListingImages(listingId);
  const [uploading, setUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<ListingImage | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: listingKeys.images(listingId) });
    queryClient.invalidateQueries({ queryKey: listingKeys.all });
  };

  /** Validation locale : format et taille, avant tout envoi réseau. */
  const validate = (file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return `« ${file.name} » : format non accepté. Utilisez JPG, PNG ou WEBP.`;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return `« ${file.name} » dépasse ${MAX_IMAGE_SIZE_MB} Mo.`;
    }
    return null;
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    if (images.length + files.length > MAX_IMAGES_PER_LISTING) {
      toast.error('Trop de photos', `Vous pouvez ajouter au maximum ${MAX_IMAGES_PER_LISTING} photos par annonce.`);
      return;
    }

    setUploading(true);
    let added = 0;
    try {
      for (const [index, file] of files.entries()) {
        const problem = validate(file);
        if (problem) {
          toast.error('Fichier refusé', problem);
          continue;
        }
        await api.uploadListingImage(listingId, file, images.length + index);
        added += 1;
      }
      if (added > 0) {
        refresh();
        toast.success(`${added} photo(s) ajoutée(s).`);
      }
    } catch (error) {
      toast.error("L'envoi a échoué", errorMessage(error));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= images.length) return;
    const ordered = images.map((image) => image.id);
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
    try {
      await api.reorderListingImages(listingId, ordered);
      refresh();
    } catch (error) {
      toast.error('Réorganisation impossible', errorMessage(error));
    }
  };

  const makeCover = async (index: number) => {
    if (index === 0) return;
    const ordered = images.map((image) => image.id);
    const [picked] = ordered.splice(index, 1);
    ordered.unshift(picked);
    try {
      await api.reorderListingImages(listingId, ordered);
      refresh();
      toast.success('Photo principale mise à jour.');
    } catch (error) {
      toast.error('Modification impossible', errorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteListingImage(toDelete);
      refresh();
      toast.success('Photo supprimée.');
    } catch (error) {
      toast.error('Suppression impossible', errorMessage(error));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragOver ? 'border-orange bg-orange-50' : 'border-doux-300 bg-ivoire/50',
        )}
      >
        <UploadCloud className="size-8 text-doux" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-nuit">Glissez vos photos ici</p>
        <p className="mt-1 text-xs text-doux">
          JPG, PNG ou WEBP — {MAX_IMAGE_SIZE_MB} Mo maximum par photo, {MAX_IMAGES_PER_LISTING} photos au total.
        </p>

        <input
          ref={inputRef}
          id="listing-images"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          className="sr-only"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          loading={uploading}
          loadingText="Envoi en cours…"
          onClick={() => inputRef.current?.click()}
          disabled={images.length >= MAX_IMAGES_PER_LISTING}
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          Choisir des photos
        </Button>
      </div>

      {isPending && <p className="text-sm text-doux">Chargement des photos…</p>}

      {images.length === 0 && !isPending && (
        <p className="text-sm text-doux">
          Aucune photo pour le moment. Une annonce avec photos reçoit davantage de demandes.
        </p>
      )}

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.id} className="group relative overflow-hidden rounded-xl border border-doux-200 bg-white">
              <ImageWithFallback src={image.image_url} alt={`Photo ${index + 1}`} className="aspect-square w-full" />

              {index === 0 && (
                <Badge variant="orange" className="absolute left-2 top-2 bg-white/95">
                  <Star aria-hidden="true" />
                  Principale
                </Badge>
              )}

              <div className="flex items-center justify-between gap-1 border-t border-doux-200 bg-white p-1.5">
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => void move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Déplacer la photo ${index + 1} vers la gauche`}
                    className="rounded-md p-1.5 text-doux transition-colors hover:bg-doux-100 hover:text-nuit disabled:opacity-40"
                  >
                    <GripVertical className="size-3.5 rotate-90" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void makeCover(index)}
                    disabled={index === 0}
                    aria-label={`Définir la photo ${index + 1} comme principale`}
                    className="rounded-md p-1.5 text-doux transition-colors hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40"
                  >
                    <Star className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setToDelete(image)}
                  aria-label={`Supprimer la photo ${index + 1}`}
                  className="rounded-md p-1.5 text-doux transition-colors hover:bg-red-50 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Supprimer cette photo ?"
        description="La photo sera définitivement retirée de votre annonce. Cette action est irréversible."
        confirmLabel="Supprimer"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
