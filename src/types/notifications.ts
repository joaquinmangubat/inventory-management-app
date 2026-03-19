export type NotificationType =
  | "low_stock"
  | "expiring_soon"
  | "expired"
  | "adjustment_pending"
  | "adjustment_approved"
  | "adjustment_rejected";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  itemId: string | null;
  isRead: boolean;
  createdAt: string;
}
