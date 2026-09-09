import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: Omit<ToastMessage, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const STYLES: Record<ToastVariant, string> = {
  success: 'border-emerald-200 bg-white text-nuit [&_[data-icon]]:text-emerald-600',
  error: 'border-red-200 bg-white text-nuit [&_[data-icon]]:text-destructive',
  info: 'border-nuit-100 bg-white text-nuit [&_[data-icon]]:text-nuit',
  warning: 'border-amber-200 bg-white text-nuit [&_[data-icon]]:text-amber-600',
};

/** Système global de notifications éphémères (succès, erreurs, confirmations). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = React.useState<ToastMessage[]>([]);

  const remove = React.useCallback((id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const toast = React.useCallback((message: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages((current) => [...current.slice(-3), { ...message, id }]);
  }, []);

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, variant: 'success' }),
      error: (title, description) => toast({ title, description, variant: 'error' }),
      info: (title, description) => toast({ title, description, variant: 'info' }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {messages.map((message) => {
          const Icon = ICONS[message.variant];
          return (
            <ToastPrimitive.Root
              key={message.id}
              onOpenChange={(open) => !open && remove(message.id)}
              className={cn(
                'pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-pop',
                'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4 sm:data-[state=open]:slide-in-from-right-6',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-80',
                STYLES[message.variant],
              )}
            >
              <Icon data-icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <ToastPrimitive.Title className="text-sm font-semibold">{message.title}</ToastPrimitive.Title>
                {message.description && (
                  <ToastPrimitive.Description className="mt-0.5 text-sm text-doux">
                    {message.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close
                aria-label="Fermer la notification"
                className="rounded-md p-1 text-doux transition-colors hover:bg-doux-100 hover:text-nuit"
              >
                <X className="size-4" aria-hidden="true" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="pointer-events-none fixed bottom-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 sm:bottom-auto sm:right-0 sm:top-0" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast doit être utilisé à l’intérieur de <ToastProvider>.');
  return context;
}
