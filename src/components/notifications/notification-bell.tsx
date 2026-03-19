"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/use-notifications";
import { NotificationPanel } from "./notification-panel";

interface NotificationBellProps {
  className?: string;
  iconClassName?: string;
}

export function NotificationBell({ className, iconClassName }: NotificationBellProps) {
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label={
            count > 0 ? `${count} unread notifications` : "Notifications"
          }
        >
          <Bell className={cn("h-5 w-5", iconClassName)} />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col [&>button:last-child]:hidden">
        <NotificationPanel />
      </SheetContent>
    </Sheet>
  );
}
