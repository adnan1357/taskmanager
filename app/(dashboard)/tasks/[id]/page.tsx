import { Card } from "@/components/ui/card";

export default function TaskPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Task Details</h1>
      <Card className="p-6">
        <p>Task ID: {params.id}</p>
      </Card>
    </div>
  );
}