"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, Package, Tags, AlertCircle, Users, Settings, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { bottomNavItems } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function MoreMenu() {
  const pathname = usePathname();
  const { isOwner, logout } = useAuth();

  const moreItems = [
    ...(isOwner
      ? [
          { label: "Item Management", href: "/items", icon: Package },
          { label: "Category Management", href: "/admin/categories", icon: Tags },
          { label: "Pending Adjustments", href: "/adjustments/pending", icon: AlertCircle },
          { label: "User Management", href: "/admin/users", icon: Users },
        ]
      : []),
    { label: "Submit Adjustment", href: "/adjustments/new", icon: SlidersHorizontal },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="flex flex-col items-center gap-0.5 pt-1 text-muted-foreground min-w-[48px] min-h-[48px] justify-center">
          <Menu className="h-5 w-5" />
          <span className="text-[10px]">More</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="py-4 space-y-1">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <Separator className="my-2" />
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive"
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex items-center justify-around px-2">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 pt-1 min-w-[48px] min-h-[48px] justify-center",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground",
                item.accent && !isActive && "text-primary"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
        <MoreMenu />
      </div>
    </nav>
  );
}
