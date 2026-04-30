import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

export function generateMetadata(): Metadata {
  return {
    title: "Inventory Management",
    description:
      "Full-stack inventory management system for multi-brand restaurant operations",
    appleWebApp: {
      capable: true,
      title: "Inventory",
      statusBarStyle: "default",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#DC2626",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        <QueryProvider>{children}</QueryProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
