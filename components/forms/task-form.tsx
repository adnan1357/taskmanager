"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function TaskForm() {
  return (
    <Card className="p-6">
      <form className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="title">Task Title</label>
          <Input id="title" required />
        </div>
        <div className="space-y-2">
          <label htmlFor="description">Description</label>
          <Input id="description" />
        </div>
        <Button type="submit">Save Task</Button>
      </form>
    </Card>
  );
}