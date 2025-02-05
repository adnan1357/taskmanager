"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function ProjectForm() {
  return (
    <Card className="p-6">
      <form className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name">Project Name</label>
          <Input id="name" required />
        </div>
        <div className="space-y-2">
          <label htmlFor="description">Description</label>
          <Input id="description" />
        </div>
        <Button type="submit">Save Project</Button>
      </form>
    </Card>
  );
}