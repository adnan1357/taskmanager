"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserTaskDistributionChart } from "@/components/charts/user-task-distribution-chart";
import { TaskDistributionChart } from "@/components/charts/task-distribution-chart";
import { useToast } from "@/components/ui/use-toast";
import { Task } from "@/types";

export default function ProjectAnalyticsPage({ params }: { params: { id: string } }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        
        const { data: tasksData, error } = await supabase
          .from('tasks')
          .select(`
            id, 
            title, 
            description, 
            status, 
            priority,
            due_date,
            assignee_id,
            project_id,
            assignee:users (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('project_id', params.id);
          
        if (error) throw error;
        
        const typedTasks = (tasksData || []).map(task => ({
          ...task,
          assignee: task.assignee && !Array.isArray(task.assignee) 
            ? task.assignee 
            : Array.isArray(task.assignee) && task.assignee.length > 0
              ? task.assignee[0]
              : null
        })) as Task[];
        
        setTasks(typedTasks);
      } catch (error) {
        console.error('Error fetching project tasks:', error);
        toast({
          title: "Error",
          description: "Failed to load project tasks",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
  }, [params.id, supabase, toast]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Project Analytics</h1>
      
      <Tabs defaultValue="user-distribution" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="user-distribution">User Distribution</TabsTrigger>
          <TabsTrigger value="status-distribution">Status Distribution</TabsTrigger>
        </TabsList>
        
        <TabsContent value="user-distribution" className="space-y-6">
          <Card className="p-6 h-[500px]">
            <UserTaskDistributionChart tasks={tasks} />
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cards showing summary info */}
            <Card className="p-4">
              <h3 className="text-lg font-medium mb-2">Total Tasks</h3>
              <p className="text-3xl font-bold">{tasks.length}</p>
            </Card>
            
            <Card className="p-4">
              <h3 className="text-lg font-medium mb-2">Completion Rate</h3>
              <p className="text-3xl font-bold">
                {tasks.length > 0 
                  ? `${Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)}%` 
                  : '0%'}
              </p>
            </Card>
            
            <Card className="p-4">
              <h3 className="text-lg font-medium mb-2">Assignees</h3>
              <p className="text-3xl font-bold">
                {new Set(tasks.filter(t => t.assignee).map(t => t.assignee?.id)).size}
              </p>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="status-distribution" className="space-y-6">
          <Card className="p-6 h-[500px]">
            <h3 className="text-lg font-medium mb-4">Tasks by Status</h3>
            <TaskDistributionChart tasks={tasks} />
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cards showing detailed status info */}
            <Card className="p-4 border-l-4 border-blue-500">
              <h3 className="text-lg font-medium mb-2">To Do</h3>
              <p className="text-3xl font-bold">{tasks.filter(t => t.status === 'todo').length}</p>
              <p className="text-sm text-gray-500 mt-1">
                {tasks.length > 0 
                  ? `${Math.round((tasks.filter(t => t.status === 'todo').length / tasks.length) * 100)}%` 
                  : '0%'}
              </p>
            </Card>
            
            <Card className="p-4 border-l-4 border-yellow-500">
              <h3 className="text-lg font-medium mb-2">In Progress</h3>
              <p className="text-3xl font-bold">{tasks.filter(t => t.status === 'in_progress').length}</p>
              <p className="text-sm text-gray-500 mt-1">
                {tasks.length > 0 
                  ? `${Math.round((tasks.filter(t => t.status === 'in_progress').length / tasks.length) * 100)}%` 
                  : '0%'}
              </p>
            </Card>
            
            <Card className="p-4 border-l-4 border-green-500">
              <h3 className="text-lg font-medium mb-2">Done</h3>
              <p className="text-3xl font-bold">{tasks.filter(t => t.status === 'done').length}</p>
              <p className="text-sm text-gray-500 mt-1">
                {tasks.length > 0 
                  ? `${Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)}%` 
                  : '0%'}
              </p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 