"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";

export default function InvitePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    if (!searchParams) return;
    
    const token = searchParams.get('token');
    if (!token) {
      router.push('/projects');
      return;
    }
    
    // Redirect to the new invite URL format
    router.push(`/join/${params.id}?token=${token}`);
  }, [params.id, router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="p-6">
        <p>Redirecting to invitation page...</p>
      </Card>
    </div>
  );
} 