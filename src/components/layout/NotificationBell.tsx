import * as React from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/use-notifications';
import { cn, formatRelative } from '@/lib/utils';

/** Cloche de notifications in-app (aucune notification push : hors MVP). */
export function NotificationBell() {
  const { data: notifications, isPending } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [open, setOpen] = React.useState(false);

  const unread = notifications?.filter((notification) => !notification.read).length ?? 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex size-10 items-center justify-center rounded-xl text-nuit transition-colors hover:bg-doux-100 focus-visible:ring-2 focus-visible:ring-orange"
          aria-label={unread > 0 ? `Notifications (${unread} non lues)` : 'Notifications'}
        >
          <Bell className="size-5" aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-orange px-1 text-[10px] font-bold leading-[18px] text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-doux-200 px-4 py-3">
          <p className="text-sm font-bold text-nuit">Notifications</p>
          {unread > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="size-3.5" aria-hidden="true" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto p-1.5">
          {isPending && <p className="px-3 py-6 text-center text-sm text-doux">Chargement…</p>}

          {!isPending && (!notifications || notifications.length === 0) && (
            <p className="px-3 py-8 text-center text-sm text-doux">Vous n'avez aucune notification pour le moment.</p>
          )}

          {notifications?.map((notification) => (
            <DropdownMenuItem key={notification.id} asChild>
              <Link
                to={notification.link ?? '/dashboard'}
                onClick={() => {
                  if (!notification.read) markRead.mutate(notification.id);
                  setOpen(false);
                }}
                className={cn('flex-col items-start gap-1 py-2.5', !notification.read && 'bg-ivoire')}
              >
                <span className="flex w-full items-start gap-2">
                  {!notification.read && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-orange" aria-label="Non lue" />
                  )}
                  <span className={cn('text-sm font-semibold text-nuit', notification.read && 'pl-4')}>
                    {notification.title}
                  </span>
                </span>
                <span className="pl-4 text-xs text-doux">{notification.message}</span>
                <span className="pl-4 text-[11px] text-doux-400">{formatRelative(notification.created_at)}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator className="mx-0 my-0" />
        <DropdownMenuItem asChild>
          <Link to="/dashboard" onClick={() => setOpen(false)} className="justify-center text-sm font-semibold">
            Voir mon tableau de bord
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
