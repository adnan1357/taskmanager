"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, ListTodo, Settings, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/hooks/use-user";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [userName, setUserName] = useState('User');
  const supabase = createClientComponentClient();

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
    <aside className="w-64 bg-background border-r px-6 py-8">
      <div className="mb-8">
        <div className="w-12 h-12 rounded-full bg-muted mb-2" />
        <h3 className="font-medium">{userName}</h3>
        <p className="text-sm text-muted-foreground">{user?.email || ''}</p>
      </div>
      <nav className="space-y-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground transition-colors",
              "hover:bg-muted",
              pathname === href && "bg-primary text-primary-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}