import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-nuit text-white hover:bg-nuit-600 active:bg-nuit-800 shadow-sm',
        accent: 'bg-orange text-white hover:bg-orange-600 active:bg-orange-700 shadow-sm',
        outline: 'border border-doux-300 bg-white text-nuit hover:bg-ivoire hover:border-nuit-200',
        ghost: 'text-nuit hover:bg-doux-100',
        subtle: 'bg-ivoire text-nuit hover:bg-orange-100',
        destructive: 'bg-destructive text-white hover:bg-red-700',
        link: 'text-nuit underline-offset-4 hover:underline hover:text-orange-600 px-0',
      },
      size: {
        sm: 'h-9 px-3 text-sm [&_svg]:size-4',
        md: 'h-11 px-5 [&_svg]:size-4',
        lg: 'h-12 px-6 text-base [&_svg]:size-5',
        icon: 'h-10 w-10 [&_svg]:size-5',
        'icon-sm': 'h-9 w-9 [&_svg]:size-4',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

/** Bouton unique de l'application : toutes les variantes passent par ici. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, loading = false, loadingText, children, disabled, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, block, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <button
        // `button` par défaut : un bouton d'action ne doit jamais soumettre
        // accidentellement le formulaire qui l'entoure.
        type={type ?? 'button'}
        className={cn(buttonVariants({ variant, size, block, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {loading && loadingText ? loadingText : children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
