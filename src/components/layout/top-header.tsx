"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/notifications/notification-bell";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TopHeader({ title }: { title?: string }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 py-3 lg:hidden">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-bold text-primary shrink-0">INV</span>
        {title && (
          <h1 className="text-sm font-semibold truncate">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-1">
        <NotificationBell className="h-9 w-9" />
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {user ? getInitials(user.fullName) : "?"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
