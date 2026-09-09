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

/** Formulaire de demande de réservation : date, quantité, message. */
export function BookingDialog({ listing, open, onOpenChange, initialDate }: BookingDialogProps) {
  const toast = useToast();
  const createBooking = useCreateBooking();

  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { requested_date: initialDate ?? '', quantity: 1, message: DEFAULT_MESSAGE },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ requested_date: initialDate ?? '', quantity: 1, message: DEFAULT_MESSAGE });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialDate]);

  const selectedDate = form.watch('requested_date');
  const availability = useAvailability(listing.id, selectedDate || undefined);
  const remaining = availability.data?.remaining ?? listing.quantity;
  const blocked = availability.data?.state === 'unavailable' || availability.data?.state === 'disabled';

  const onSubmit = form.handleSubmit(async (values) => {
    if (blocked) {
      toast.error('Réservation impossible', 'Ce matériel n’est pas disponible à la date choisie.');
      return;
    }
    if (values.quantity > remaining) {
      form.setError('quantity', {
        message: `Quantité indisponible à cette date : il reste ${formatNumber(remaining)} unité(s).`,
      });
      return;
    }

    try {
      await createBooking.mutateAsync({
        listing_id: listing.id,
        requested_date: values.requested_date,
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
          <Field
            label="Date souhaitée"
            htmlFor="requested_date"
            required
            error={form.formState.errors.requested_date?.message}
          >
            <DatePicker
              id="requested_date"
              value={form.watch('requested_date')}
              onChange={(value) => form.setValue('requested_date', value, { shouldValidate: true })}
              aria-invalid={Boolean(form.formState.errors.requested_date)}
            />
          </Field>

          {selectedDate && (
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
            hint={`Stock total annoncé : ${formatNumber(listing.quantity)} unité(s).`}
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
                  Indisponible à cette date
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
