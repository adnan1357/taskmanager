"use client";

import { Header } from "@/components/shared/header";
import { Sidebar } from "@/components/shared/sidebar";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/lib/hooks/use-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isInitialRender, setIsInitialRender] = useState(true);
  const { isCollapsed } = useSidebar();

  useEffect(() => {
    // Set isInitialRender to false after the first render
    setIsInitialRender(false);
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <Sidebar />
      <main className={cn(
        "min-h-screen",
        "lg:pl-64", // Default desktop padding
        isCollapsed && "lg:pl-20", // Collapsed desktop padding
        !isInitialRender && "transition-[padding] duration-300"
      )}>
        {children}
      </main>
    </div>
  );
}