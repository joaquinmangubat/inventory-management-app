"use client";

import { CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetClose } from "@/components/ui/sheet";
import { NotificationItem } from "./notification-item";
import { useNotifications, useMarkRead, useMarkAllRead } from "@/hooks/use-notifications";

export function NotificationPanel() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0">
        <div className="flex-1 min-w-0 px-1">
          <h2 className="text-base font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs shrink-0"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </SheetClose>
      </div>

      <Separator />

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-0 divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-4 py-3">
                <Skeleton className="h-4 w-4 rounded-full mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <CheckCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">You&apos;re all caught up</p>
            <p className="text-xs text-muted-foreground mt-1">
              No notifications yet
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={(id) => markRead.mutate(id)}
                isMarkingRead={markRead.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
