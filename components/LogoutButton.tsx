'use client'

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function LogoutButton({ 
  children = "Logout",
  className 
}: { 
  children?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className={cn(
        "text-red-500 hover:text-red-600 transition-colors",
        className
      )}
    >
      {children}
    </button>
  );
} 