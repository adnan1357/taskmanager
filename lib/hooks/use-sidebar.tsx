"use client";

import { createContext, useContext, useState } from 'react';

export const SidebarContext = createContext({
  isCollapsed: false,
  isHovered: false,
  toggleSidebar: () => {},
  setIsHovered: (value: boolean) => {}
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <SidebarContext.Provider value={{
      isCollapsed,
      isHovered,
      toggleSidebar: () => setIsCollapsed(!isCollapsed),
      setIsHovered
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
} 