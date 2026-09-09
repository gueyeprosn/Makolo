import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Label } from './label';
import { cn } from '@/lib/utils';

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Enveloppe accessible d'un champ de formulaire : label lié, message d'erreur
 * annoncé par les lecteurs d'écran, indication d'aide facultative.
 */
export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="ml-0.5 text-orange" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {hint && (
        <p id={hintId} className="text-xs text-doux">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/** Attributs ARIA à appliquer au contrôle piloté par `Field`. */
export function fieldAria(id: string, error?: string, hint?: string) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined,
  } as const;
}
