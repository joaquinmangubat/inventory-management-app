"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  PackageX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Notification, NotificationType } from "@/types/notifications";

const typeConfig: Record<
  NotificationType,
  { Icon: React.ElementType; iconClass: string; label: string }
> = {
  low_stock: {
    Icon: AlertTriangle,
    iconClass: "text-red-500",
    label: "Low Stock",
  },
  expiring_soon: {
    Icon: Clock,
    iconClass: "text-amber-500",
    label: "Expiring Soon",
  },
  expired: {
    Icon: PackageX,
    iconClass: "text-red-600",
    label: "Expired",
  },
  adjustment_pending: {
    Icon: Clock,
    iconClass: "text-yellow-500",
    label: "Pending Review",
  },
  adjustment_approved: {
    Icon: CheckCircle2,
    iconClass: "text-green-600",
    label: "Approved",
  },
  adjustment_rejected: {
    Icon: XCircle,
    iconClass: "text-red-500",
    label: "Rejected",
  },
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  isMarkingRead: boolean;
}

export function NotificationItem({
  notification,
  onMarkRead,
  isMarkingRead,
}: NotificationItemProps) {
  const config = typeConfig[notification.type];
  const { Icon, iconClass } = config;

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3 transition-colors",
        !notification.isRead && "bg-accent/40"
      )}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        <Icon className={cn("h-4 w-4", iconClass)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={cn("text-sm", !notification.isRead && "font-medium")}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground leading-snug">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Unread indicator + mark read */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {!notification.isRead && (
          <span className="h-2 w-2 rounded-full bg-primary mt-1" />
        )}
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
            onClick={() => onMarkRead(notification.id)}
            disabled={isMarkingRead}
          >
            Mark read
          </Button>
        )}
      </div>
    </div>
  );
}
