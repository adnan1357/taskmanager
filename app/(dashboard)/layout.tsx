"use client";

import { Header } from "@/components/shared/header";
import { Sidebar } from "@/components/shared/sidebar";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { Footer } from "@/components/shared/footer";
import { AIFloatingButton } from "@/components/ai-floating-button";
import { UIStateProvider } from "@/lib/hooks/use-ui-state";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isInitialRender, setIsInitialRender] = useState(true);
  const { isCollapsed } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Set isInitialRender to false after the first render
    setIsInitialRender(false);
  }, []);

  return (
    <UIStateProvider>
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <Sidebar />
        <main className={cn(
          "min-h-screen bg-white",
          "pl-16", // Default collapsed width
          isHovered && "pl-64", // Expanded width when sidebar is hovered
          "transition-all duration-300"
        )}>
          <div className={cn(
            "min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
            "transition-all duration-300"
          )}>
            {children}
          </div>
        </main>
        <Footer />
        <AIFloatingButton />
      </div>
    </UIStateProvider>
  );
}