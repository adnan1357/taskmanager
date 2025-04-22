"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, ListTodo, Settings, FolderKanban, ChevronLeft, ChevronRight, Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/hooks/use-user";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import LogoutButton from '@/components/LogoutButton'
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [userName, setUserName] = useState('User');
  const { isCollapsed, toggleSidebar } = useSidebar();
  const supabase = createClientComponentClient();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

      <aside
        className={cn(
          "fixed left-0 top-0 z-30 h-screen border-r pt-16 transition-all duration-300",
          "bg-gradient-to-b from-purple-950 to-slate-900 border-purple-800/30",
          !isHovered ? "w-16" : "w-64"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={cn(
          "flex flex-col h-full gap-4 p-4 transition-all duration-300",
          !isHovered && "items-center"
        )}>
          {/* User section */}
          <div className="flex flex-col items-center">
            <Avatar className={cn(
              "transition-all duration-300",
              !isHovered ? "w-10 h-10" : "w-12 h-12"
            )}>
              <AvatarFallback className="bg-purple-800/30 text-purple-50">
                {userName
                  ? userName
                      .split(' ')
                      .map(name => name[0])
                      .join('')
                      .toUpperCase()
                  : '?'}
              </AvatarFallback>
            </Avatar>
            {/* User info section with smooth transition */}
            <div className={cn(
              "overflow-hidden transition-all duration-300",
              isHovered ? "h-auto opacity-100 mt-2" : "h-0 opacity-0"
            )}>
              <h3 className="font-medium text-purple-50">{userName}</h3>
              <p className="text-sm text-purple-300/70">{user?.email || ''}</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg text-purple-200 transition-colors",
                  "hover:bg-purple-800/20",
                  pathname === item.href && "bg-purple-800/30 text-purple-50",
                  !isHovered && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className={cn(
                  "transition-all duration-300 overflow-hidden",
                  !isHovered ? "w-0 opacity-0" : "w-auto opacity-100"
                )}>
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          {/* Logout button */}
          <div className="mt-auto w-full">
            <LogoutButton className={cn(
              "w-full flex items-center gap-3 rounded-lg text-purple-200 transition-colors hover:bg-purple-800/20",
              isHovered ? "px-4 py-2" : "justify-center px-2 py-2"
            )}>
              <LogOut className="h-5 w-5" />
              <span className={cn(
                "transition-all duration-300 overflow-hidden",
                !isHovered ? "w-0 opacity-0" : "w-auto opacity-100"
              )}>
                Logout
              </span>
            </LogoutButton>
          </div>
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