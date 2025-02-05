"use client";

import { Card } from "@/components/ui/card";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { cn } from "@/lib/utils";

export default function TaskPage({ params }: { params: { id: string } }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto space-y-8 p-8">
        <h1 className="text-2xl font-bold">Task Details</h1>
        <Card className="p-6">
          <p>Task ID: {params.id}</p>
        </Card>
      </div>
    </div>
  );
}