import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

/**
 * Confirmation obligatoire avant toute action destructive
 * (suppression d'annonce, d'image, de catégorie, refus de modération...).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  destructive = true,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-nuit-900/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-doux-200 bg-white p-6 shadow-pop',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )}
        >
          <div className="flex gap-4">
            <span
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl',
                destructive ? 'bg-red-50 text-destructive' : 'bg-ivoire text-nuit',
              )}
            >
              <AlertTriangle className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <AlertDialogPrimitive.Title className="text-base font-bold text-nuit">{title}</AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="mt-1.5 text-sm text-doux">
                {description}
              </AlertDialogPrimitive.Description>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline" disabled={loading}>
                {cancelLabel}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <Button
              variant={destructive ? 'destructive' : 'primary'}
              loading={loading}
              loadingText="Traitement…"
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
