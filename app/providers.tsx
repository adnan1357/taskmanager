'use client';

import { SidebarProvider } from "@/lib/hooks/use-sidebar";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      {children}
    </SidebarProvider>
  );
} 