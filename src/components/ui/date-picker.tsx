import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { fr } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { Button } from './button';
import { formatDate, fromISODate, toISODate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Empêche la sélection d'une date passée (par défaut : activé). */
  disablePast?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/** Sélecteur de date accessible, localisé en français. */
export function DatePicker({
  value,
  onChange,
  id,
  placeholder = 'Choisir une date',
  disabled,
  disablePast = true,
  ...aria
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? fromISODate(value) : undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('h-11 w-full justify-start font-normal', !value && 'text-doux-400')}
          {...aria}
        >
          <CalendarDays className="size-4 text-doux" aria-hidden="true" />
          {value ? formatDate(selected) : placeholder}
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 rounded-2xl border border-doux-200 bg-white p-3 shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DayPicker
            mode="single"
            locale={fr}
            selected={selected}
            defaultMonth={selected}
            disabled={disablePast ? { before: today } : undefined}
            onSelect={(date) => {
              if (!date) return;
              onChange(toISODate(date));
              setOpen(false);
            }}
            showOutsideDays
            classNames={{
              months: 'flex flex-col',
              month: 'space-y-3',
              caption: 'relative flex items-center justify-center pt-1',
              caption_label: 'text-sm font-semibold text-nuit capitalize',
              nav: 'flex items-center gap-1',
              nav_button:
                'inline-flex size-8 items-center justify-center rounded-lg text-doux transition-colors hover:bg-ivoire hover:text-nuit',
              nav_button_previous: 'absolute left-0',
              nav_button_next: 'absolute right-0',
              table: 'w-full border-collapse',
              head_row: 'flex',
              head_cell: 'w-9 text-[0.7rem] font-semibold uppercase text-doux',
              row: 'mt-1 flex w-full',
              cell: 'p-0',
              day: 'inline-flex size-9 items-center justify-center rounded-lg text-sm text-nuit transition-colors hover:bg-ivoire focus-visible:ring-2 focus-visible:ring-orange',
              day_selected: 'bg-orange text-white hover:bg-orange-600',
              day_today: 'font-bold text-orange',
              day_outside: 'text-doux-300',
              day_disabled: 'text-doux-300 line-through hover:bg-transparent',
            }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
