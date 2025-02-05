"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  Users, 
  MoreVertical, 
  Plus,
  CheckCircle2,
  Circle,
  Timer,
  FileText,
  Download,
  Upload
} from "lucide-react";
import { useState } from "react";

interface Document {
  id: number;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface Task {
  id: number;
  title: string;
  status: "todo" | "in-progress" | "completed";
  assignee: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
}

// This function is required for static site generation
export function generateStaticParams() {
  // Generate params for all possible project IDs
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' }
  ];
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const [documents] = useState<Document[]>([
    {
      id: 1,
      name: "Project Requirements.pdf",
      type: "PDF",
      size: "2.4 MB",
      uploadedBy: "Sarah Connor",
      uploadedAt: "2024-03-20"
    },
    {
      id: 2,
      name: "Design Assets.zip",
      type: "ZIP",
      size: "15.7 MB",
      uploadedBy: "John Smith",
      uploadedAt: "2024-03-19"
    },
    {
      id: 3,
      name: "API Documentation.docx",
      type: "DOCX",
      size: "1.2 MB",
      uploadedBy: "Emily Brown",
      uploadedAt: "2024-03-18"
    }
  ]);

  const [tasks] = useState<Task[]>([
    {
      id: 1,
      title: "Design System Implementation",
      status: "completed",
      assignee: "Sarah Connor",
      dueDate: "2024-04-15",
      priority: "high"
    },
    {
      id: 2,
      title: "User Authentication Flow",
      status: "in-progress",
      assignee: "John Smith",
      dueDate: "2024-04-20",
      priority: "medium"
    },
    {
      id: 3,
      title: "API Integration",
      status: "todo",
      assignee: "Emily Brown",
      dueDate: "2024-04-25",
      priority: "low"
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in-progress":
        return <Timer className="h-4 w-4 text-blue-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500 bg-red-50";
      case "medium":
        return "text-yellow-500 bg-yellow-50";
      case "low":
        return "text-green-500 bg-green-50";
      default:
        return "text-gray-500 bg-gray-50";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-1">Web Development Project</h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Due Apr 15, 2024</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">10:00 AM</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">7 members</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList>
          <TabsTrigger value="documents">Project Documents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="documents" className="mt-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Documents</h2>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.size} • Uploaded by {doc.uploadedBy} on {doc.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Tasks</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {["Todo", "In Progress", "Completed"].map((status) => (
              <Card key={status} className="p-4">
                <h3 className="font-medium mb-4">{status}</h3>
                <div className="space-y-3">
                  {tasks
                    .filter(task => 
                      task.status === status.toLowerCase().replace(" ", "-")
                    )
                    .map(task => (
                      <div
                        key={task.id}
                        className="p-3 bg-muted/50 rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <span className="font-medium">{task.title}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{task.assignee}</span>
                          <span>{task.dueDate}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}