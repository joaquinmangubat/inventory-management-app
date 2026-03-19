"use client";

import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "./sidebar";
import { TopHeader } from "./top-header";
import { BottomTabBar } from "./bottom-tab-bar";
import { SessionTimeoutDialog } from "@/components/auth/session-timeout-dialog";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <TopHeader />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
      </div>
      <BottomTabBar />
      <SessionTimeoutDialog />
    </div>
  );
}
