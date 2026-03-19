import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  BarChart3,
  Package,
  Tags,
  AlertCircle,
  Users,
  Settings,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
  badge?: string; // query key for badge count
  accent?: boolean; // visually emphasized
}

export const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "New Transaction",
    href: "/transactions/new",
    icon: PlusCircle,
    accent: true,
  },
  { label: "Transaction History", href: "/transactions", icon: Clock },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  {
    label: "Submit Adjustment",
    href: "/adjustments/new",
    icon: SlidersHorizontal,
  },
];

export const adminNavItems: NavItem[] = [
  {
    label: "Item Management",
    href: "/items",
    icon: Package,
    ownerOnly: true,
  },
  {
    label: "Category Management",
    href: "/admin/categories",
    icon: Tags,
    ownerOnly: true,
  },
  {
    label: "Pending Adjustments",
    href: "/adjustments/pending",
    icon: AlertCircle,
    ownerOnly: true,
    badge: "pendingAdjustments",
  },
  {
    label: "User Management",
    href: "/admin/users",
    icon: Users,
    ownerOnly: true,
  },
];

export const bottomNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "New Txn",
    href: "/transactions/new",
    icon: PlusCircle,
    accent: true,
  },
  { label: "History", href: "/transactions", icon: Clock },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

export const settingsNavItem: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
};
