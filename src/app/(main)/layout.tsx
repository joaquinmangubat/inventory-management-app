import { AuthProvider } from "@/providers/auth-provider";
import { SessionTimeoutProvider } from "@/providers/session-timeout-provider";
import { AppShell } from "@/components/layout/app-shell";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SessionTimeoutProvider>
        <AppShell>{children}</AppShell>
      </SessionTimeoutProvider>
    </AuthProvider>
  );
}
