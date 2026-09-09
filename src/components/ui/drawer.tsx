import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;
export const DrawerTitle = DialogPrimitive.Title;
export const DrawerDescription = DialogPrimitive.Description;

/** Panneau latéral (navigation mobile, filtres marketplace). */
export const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: 'left' | 'right' | 'bottom' }
>(({ className, children, side = 'right', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-nuit-900/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col gap-4 border-doux-200 bg-white shadow-pop transition ease-in-out',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300',
        side === 'right' &&
          'inset-y-0 right-0 h-full w-full max-w-sm border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
        side === 'left' &&
          'inset-y-0 left-0 h-full w-full max-w-sm border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
        side === 'bottom' &&
          'inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-lg p-1.5 text-doux transition-colors hover:bg-doux-100 hover:text-nuit focus-visible:ring-2 focus-visible:ring-orange"
        aria-label="Fermer"
      >
        <X className="size-5" aria-hidden="true" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DrawerContent.displayName = 'DrawerContent';
