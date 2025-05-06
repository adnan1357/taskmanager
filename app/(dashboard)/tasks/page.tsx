"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { TaskModal } from "@/components/modals/task-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  project_id: string;
  assignee: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  project: {
    name: string;
    color: string;
  };
}

export default function TasksPage() {
  const { isCollapsed } = useSidebar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [taskFilter, setTaskFilter] = useState<'open' | 'todo' | 'in_progress' | 'done' | 'all'>('open');
  const supabase = createClientComponentClient();
  const router = useRouter();

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get all projects where user is a member
      const { data: projectMemberships, error: membershipError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      if (!projectMemberships?.length) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const projectIds = projectMemberships.map(pm => pm.project_id);

      // Then get all tasks from those projects with correct joins
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects!inner (
            name,
            color
          ),
          assignee:users (
            id,
            full_name,
            avatar_url
          )
        `)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.log('Tasks Error:', tasksError);
        throw tasksError;
      }
      
      console.log('Raw Tasks Data:', tasksData); // Add this line

      // Transform the data to match our interface
      const transformedTasks = (tasksData || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        created_at: task.created_at || '',
        project_id: task.project_id,
        assignee: task.assignee ? {
          id: task.assignee.id,
          full_name: task.assignee.full_name || '',
          avatar_url: task.assignee.avatar_url
        } : null,
        project: {
          name: task.project.name || 'Unknown Project',
          color: task.project.color || '#e5e7eb'
        }
      }));

      setTasks(transformedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // Subscribe to task changes
    const channel = supabase
      .channel('tasks-page-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        async () => {
          console.log('Tasks page: Real-time task update received');
          await fetchTasks();
        }
      )
      .subscribe();

    // Initial fetch
    fetchTasks();

    // Cleanup subscription
    return () => {
      channel.unsubscribe();
    };
  }, [fetchTasks, supabase]);

  const handleTaskUpdate = async () => {
    await fetchTasks();
  };

  const filteredTasks = tasks.filter(task => {
    // First apply search filter
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.project.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Then apply status filter
    const matchesStatus = (() => {
      switch (taskFilter) {
        case 'open':
          return task.status === 'todo' || task.status === 'in_progress';
        case 'todo':
          return task.status === 'todo';
        case 'in_progress':
          return task.status === 'in_progress';
        case 'done':
          return task.status === 'done';
        case 'all':
          return true;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-96">Loading...</div>;
  }

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto space-y-8 p-8">
        <div className="flex justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">View all Tasks</h1>
          <div className="flex gap-4 items-center">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="search"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-muted/50 border-none focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
            <Select
              value={taskFilter}
              onValueChange={(value) => setTaskFilter(value as typeof taskFilter)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open Tasks</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="all">All Tasks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="p-6">
          {filteredTasks.length > 0 ? (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div 
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="flex items-start space-x-4 p-4 hover:bg-muted rounded-lg cursor-pointer"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{task.title}</h3>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span 
                        className="text-xs px-2 py-1 rounded-full" 
                        style={{ 
                          backgroundColor: task.project.color || '#e5e7eb',
                          color: task.project.color ? '#fff' : '#374151'
                        }}
                      >
                        {task.project.name}
                      </span>
                      {task.assignee && (
                        <div className="flex items-center gap-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage 
                              src={task.assignee.avatar_url || undefined} 
                              alt={task.assignee.full_name || ''}
                            />
                            <AvatarFallback className="text-xs bg-primary/10">
                              {task.assignee.full_name
                                ? task.assignee.full_name
                                    .split(' ')
                                    .slice(0, 2)
                                    .map((name: string) => name[0])
                                    .join('')
                                    .toUpperCase()
                                : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">
                            {task.assignee.full_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      task.status === 'todo' && "bg-blue-100 text-blue-700",
                      task.status === 'in_progress' && "bg-yellow-100 text-yellow-700",
                      task.status === 'done' && "bg-green-100 text-green-700"
                    )}>
                      {task.status === 'todo' && 'To Do'}
                      {task.status === 'in_progress' && 'In Progress'}
                      {task.status === 'done' && 'Done'}
                    </span>
                    {task.due_date && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No tasks match your search.' : 'No tasks match the selected filter.'}
            </div>
          )}
        </Card>

        {selectedTaskId && (
          <TaskModal
            isOpen={!!selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
            taskId={selectedTaskId}
            projectId={tasks.find(t => t.id === selectedTaskId)?.project_id || ''}
            onTaskUpdate={handleTaskUpdate}
          />
        )}
      </div>
    </div>
  );
}