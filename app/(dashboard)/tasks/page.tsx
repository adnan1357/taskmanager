"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { cn } from "@/lib/utils";

export default function TasksPage() {
  const { isCollapsed } = useSidebar();

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto space-y-8 p-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <Button>New Task</Button>
        </div>
        <Card className="p-6">
          <p>Tasks list will go here</p>
        </Card>
      </div>
    </div>
  );
}