"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  mainNavItems,
  adminNavItems,
  settingsNavItem,
  type NavItem,
} from "@/lib/navigation";
import { NotificationBell } from "@/components/notifications/notification-bell";

function NavLink({
  item,
  collapsed,
  isActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        item.accent && !isActive && "text-primary",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, isOwner, logout } = useAuth();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-card h-screen sticky top-0 z-40 transition-all duration-200",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4">
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold truncate">Inventory</h2>
              <p className="text-xs text-muted-foreground truncate">
                Arcy&apos;s &amp; Bale
              </p>
            </div>
          )}
          {!collapsed && <NotificationBell className="h-8 w-8 shrink-0" />}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Separator />

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              isActive={pathname === item.href}
            />
          ))}

          {/* Admin section */}
          {isOwner && (
            <>
              <Separator className="my-2" />
              {!collapsed && (
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin
                </p>
              )}
              {adminNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  isActive={pathname === item.href}
                />
              ))}
            </>
          )}

          <Separator className="my-2" />
          {collapsed && (
            <div className="flex justify-center py-1">
              <NotificationBell className="h-9 w-9" />
            </div>
          )}
          <NavLink
            item={settingsNavItem}
            collapsed={collapsed}
            isActive={pathname === settingsNavItem.href}
          />
        </nav>

        {/* User section */}
        <Separator />
        <div className={cn("px-2 py-3", collapsed && "px-1")}>
          {!collapsed && user && (
            <div className="px-3 mb-2">
              <p className="text-sm font-medium truncate">{user.fullName}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">
                {user.role}
              </p>
            </div>
          )}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full"
                  onClick={logout}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
