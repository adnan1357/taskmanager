"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface UIStateContextType {
  isMembersSidebarExpanded: boolean;
  isAIChatVisible: boolean;
  expandMembersSidebar: () => void;
  collapseMembersSidebar: () => void;
  showAIChat: () => void;
  hideAIChat: () => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export function UIStateProvider({ children }: { children: ReactNode }) {
  const [isMembersSidebarExpanded, setIsMembersSidebarExpanded] = useState(false);
  const [isAIChatVisible, setIsAIChatVisible] = useState(true);

  const expandMembersSidebar = () => {
    setIsMembersSidebarExpanded(true);
    // Hide AI chat when members sidebar is expanded
    setIsAIChatVisible(false);
  };

  const collapseMembersSidebar = () => {
    setIsMembersSidebarExpanded(false);
    // Show AI chat when members sidebar is collapsed
    setIsAIChatVisible(true);
  };

  const showAIChat = () => {
    setIsAIChatVisible(true);
  };

  const hideAIChat = () => {
    setIsAIChatVisible(false);
  };

  return (
    <UIStateContext.Provider 
      value={{ 
        isMembersSidebarExpanded, 
        isAIChatVisible,
        expandMembersSidebar,
        collapseMembersSidebar,
        showAIChat,
        hideAIChat
      }}
    >
      {children}
    </UIStateContext.Provider>
  );
}

export function useUIState() {
  const context = useContext(UIStateContext);
  if (context === undefined) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
} 