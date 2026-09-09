import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-11 w-full rounded-xl border border-doux-300 bg-white px-3.5 py-2 text-base text-nuit shadow-sm transition-colors',
      'placeholder:text-doux-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-1 focus-visible:border-orange',
      'disabled:cursor-not-allowed disabled:bg-doux-100 disabled:text-doux-400',
      'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/30',
      'sm:text-sm',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[110px] w-full rounded-xl border border-doux-300 bg-white px-3.5 py-2.5 text-base text-nuit shadow-sm transition-colors',
        'placeholder:text-doux-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-1 focus-visible:border-orange',
        'disabled:cursor-not-allowed disabled:bg-doux-100',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/30',
        'sm:text-sm',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
