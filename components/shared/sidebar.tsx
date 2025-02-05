"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, ListTodo, Settings, FolderKanban, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/hooks/use-user";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import LogoutButton from '@/components/LogoutButton'

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [userName, setUserName] = useState('User');
  const { isCollapsed, toggleSidebar } = useSidebar();
  const supabase = createClientComponentClient();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    async function fetchUserName() {
      if (!user?.id) return;
      
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (userData) {
        setUserName(userData.full_name || user.email?.split('@')[0] || 'User');
      }
    }

    fetchUserName();
  }, [user?.id, user?.email, supabase]);

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/tasks", label: "Task List", icon: ListTodo },
    { href: "/settings", label: "Setting", icon: Settings },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed z-50 bottom-4 right-4 lg:hidden bg-purple-900 text-white p-3 rounded-full shadow-lg"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={cn(
        "bg-gradient-to-b from-purple-950 to-slate-900 border-r border-purple-800/30 py-8 fixed top-16 bottom-0 transition-all duration-300 z-40 flex flex-col",
        "lg:w-64 lg:translate-x-0",
        isCollapsed ? "lg:w-20" : "lg:w-64",
        isMobileOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full",
      )}>
        {/* Collapse button - visible only on desktop */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-12 bg-purple-800/30 rounded-full p-1.5 text-purple-200 hover:bg-purple-800/50 transition-colors z-50 hidden lg:block"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        
        <div className={cn("mb-8 px-6", isCollapsed && "px-4")}>
          <div className="w-12 h-12 rounded-full bg-purple-800/30 mb-2" />
          {!isCollapsed && (
            <>
              <h3 className="font-medium text-purple-50">{userName}</h3>
              <p className="text-sm text-purple-300/70">{user?.email || ''}</p>
            </>
          )}
        </div>

        <nav className="space-y-2 px-2 flex-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg text-purple-200 transition-colors",
                "hover:bg-purple-800/20",
                pathname === href && "bg-purple-800/30 text-purple-50"
              )}
              title={isCollapsed ? label : undefined}
            >
              <Icon className="h-5 w-5" />
              {!isCollapsed && <span>{label}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout button at bottom */}
        <div className={cn("px-2 mt-auto", isCollapsed ? "px-4" : "px-6")}>
          <LogoutButton className={cn(
            "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-purple-200 transition-colors hover:bg-purple-800/20",
            isCollapsed && "justify-center"
          )}>
            {isCollapsed ? "×" : "Logout"}
          </LogoutButton>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}