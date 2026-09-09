import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarCheck, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Field, fieldAria } from '@/components/ui/field';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/toast';
import { AvailabilityBadge } from '@/components/listings/AvailabilityBadge';
import { useAvailability, useCreateBooking } from '@/hooks/use-bookings';
import { bookingSchema, type BookingValues } from '@/lib/validations';
import { errorMessage } from '@/lib/errors';
import { formatNumber } from '@/lib/utils';
import type { ListingWithRelations } from '@/types';

interface BookingDialogProps {
  listing: ListingWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Date pré-sélectionnée depuis le bloc de disponibilité de la fiche. */
  initialDate?: string;
}

const DEFAULT_MESSAGE = 'Bonjour, je souhaite louer ce matériel pour mon événement.';

/**
 * Formulaire de demande de réservation : période (livraison → reprise),
 * quantité, message. Voir docs/specs/BOOKING-LIFECYCLE.md — une location
 * d'un seul jour a `requested_from === requested_to`.
 */
export function BookingDialog({ listing, open, onOpenChange, initialDate }: BookingDialogProps) {
  const toast = useToast();
  const createBooking = useCreateBooking();
  // Se souvient si le client a lui-même choisi une date de fin distincte,
  // pour ne plus la réaligner automatiquement sur la date de début ensuite.
  const [toTouched, setToTouched] = React.useState(false);

  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      requested_from: initialDate ?? '',
      requested_to: initialDate ?? '',
      quantity: 1,
      message: DEFAULT_MESSAGE,
    },
  });

  React.useEffect(() => {
    if (open) {
      setToTouched(false);
      form.reset({
        requested_from: initialDate ?? '',
        requested_to: initialDate ?? '',
        quantity: 1,
        message: DEFAULT_MESSAGE,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialDate]);

  const requestedFrom = form.watch('requested_from');
  const requestedTo = form.watch('requested_to');
  const availability = useAvailability(listing.id, requestedFrom || undefined, requestedTo || undefined);
  const remaining = availability.data?.remaining ?? listing.quantity;
  const blocked = availability.data?.state === 'unavailable' || availability.data?.state === 'disabled';

  const onSubmit = form.handleSubmit(async (values) => {
    if (blocked) {
      toast.error('Réservation impossible', 'Ce matériel n’est pas disponible sur cette période.');
      return;
    }
    if (values.quantity > remaining) {
      form.setError('quantity', {
        message: `Quantité indisponible sur cette période : il reste au maximum ${formatNumber(remaining)} unité(s) selon les jours.`,
      });
      return;
    }

    try {
      await createBooking.mutateAsync({
        listing_id: listing.id,
        requested_from: values.requested_from,
        requested_to: values.requested_to,
        quantity: values.quantity,
        message: values.message,
      });
      toast.success('Demande envoyée', 'Votre demande a bien été envoyée au prestataire.');
      onOpenChange(false);
    } catch (error) {
      toast.error("La demande n'a pas pu être envoyée", errorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander une réservation</DialogTitle>
          <DialogDescription>
            {listing.title} — {listing.city}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Date de livraison"
              htmlFor="requested_from"
              required
              error={form.formState.errors.requested_from?.message}
            >
              <DatePicker
                id="requested_from"
                value={requestedFrom}
                onChange={(value) => {
                  form.setValue('requested_from', value, { shouldValidate: true });
                  // Par défaut, une location d'un seul jour : la date de fin
                  // suit la date de début tant que le client ne l'a pas
                  // lui-même déplacée.
                  if (!toTouched || requestedTo < value) {
                    form.setValue('requested_to', value, { shouldValidate: true });
                  }
                }}
                aria-invalid={Boolean(form.formState.errors.requested_from)}
              />
            </Field>

            <Field
              label="Date de reprise"
              htmlFor="requested_to"
              required
              hint="Identique à la livraison pour une location d'un seul jour."
              error={form.formState.errors.requested_to?.message}
            >
              <DatePicker
                id="requested_to"
                value={requestedTo}
                minDate={requestedFrom || undefined}
                onChange={(value) => {
                  setToTouched(true);
                  form.setValue('requested_to', value, { shouldValidate: true });
                }}
                aria-invalid={Boolean(form.formState.errors.requested_to)}
              />
            </Field>
          </div>

          {requestedFrom && requestedTo && (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ivoire px-3.5 py-3"
              aria-live="polite"
            >
              {availability.isPending ? (
                <span className="text-sm text-doux">Vérification de la disponibilité…</span>
              ) : availability.isError ? (
                <span className="text-sm text-destructive">
                  La disponibilité n'a pas pu être vérifiée. Veuillez réessayer.
                </span>
              ) : (
                availability.data && (
                  <>
                    <AvailabilityBadge state={availability.data.state} label={availability.data.label} />
                    <span className="text-sm text-doux">
                      {formatNumber(availability.data.remaining)} unité(s) restante(s)
                    </span>
                  </>
                )
              )}
            </div>
          )}

          <Field
            label="Quantité"
            htmlFor="quantity"
            required
            hint={`Quantité totale annoncée : ${formatNumber(listing.quantity)} unité(s).`}
            error={form.formState.errors.quantity?.message}
          >
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={Math.max(1, remaining)}
              {...fieldAria('quantity', form.formState.errors.quantity?.message, 'hint')}
              {...form.register('quantity')}
            />
          </Field>

          <Field
            label="Message au prestataire"
            htmlFor="message"
            error={form.formState.errors.message?.message}
          >
            <Textarea
              rows={3}
              placeholder="Précisez le lieu, l'horaire ou vos besoins particuliers."
              {...fieldAria('message', form.formState.errors.message?.message)}
              {...form.register('message')}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createBooking.isPending}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="accent"
              loading={createBooking.isPending}
              loadingText="Envoi…"
              disabled={blocked}
            >
              {blocked ? (
                <>
                  <CalendarCheck className="size-4" aria-hidden="true" />
                  Indisponible sur cette période
                </>
              ) : (
                <>
                  <Send className="size-4" aria-hidden="true" />
                  Envoyer la demande
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
