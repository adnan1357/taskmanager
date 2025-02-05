import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TasksPage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Button>New Task</Button>
      </div>
      <Card className="p-6">
        <p>Tasks list will go here</p>
      </Card>
    </div>
  );
}