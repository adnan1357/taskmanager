'use client'

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Clock, Plus, X } from "lucide-react";
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from "@/components/ui/use-toast";
import { TaskModal } from "@/components/modals/task-modal";
import { formatDistanceToNow } from 'date-fns';
import { SearchDropdown } from "@/components/modals/search-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Project {
  id: string
  name: string
  description: string
  progress: number
  color: string
  project_members: Array<{
    user_id: string
    role: string
  }>
  tasks_count: number
}

interface Task {
  id: string
  title: string
  description: string
  project_id: string
  status: string
  priority: 'low' | 'medium' | 'high'
  due_date: string
  projects?: { 
    name: string
    color: string 
  }
}

interface RecentProject {
  id: string;
  name: string;
  description: string;
  progress: number;
  color: string;
  project_members: Array<{
    user_id: string;
    role: string;
  }>;
  tasks_count: number;
  viewed_at: string;
}

const gradients = {
  upcoming: "bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10",
  stats: "bg-gradient-to-br from-pink-500/10 via-orange-500/10 to-yellow-500/10"
};

const getProjectCardStyles = (color: string) => {
  // Convert color to RGB if it's a hex value
  const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgb = hexToRgb(color);
  if (rgb) {
    return {
      background: {
        background: `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05))`
      },
      hoverBorder: {
        background: `linear-gradient(to right, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1))`
      }
    };
  }

  return {
    background: {
      background: `linear-gradient(135deg, ${color}30, ${color}10)`
    },
    hoverBorder: {
      background: `linear-gradient(to right, ${color}50, ${color}20)`
    }
  };
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [userName, setUserName] = useState('')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const { isCollapsed } = useSidebar();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }
        
        await Promise.all([
          fetchUserData(),
          fetchProjects(),
          fetchTasks(),
          fetchRecentProjects()
        ])
      } catch (error) {
        console.error('Session initialization error:', error)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()
  }, [router])

  useEffect(() => {
    // Subscribe to task changes
    const taskChannel = supabase
      .channel('dashboard-task-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'tasks'
        },
        async () => {
          console.log('Dashboard: Real-time task update received');
          await fetchTasks();
        }
      )
      .subscribe();

    // Subscribe to project changes
    const projectChannel = supabase
      .channel('dashboard-project-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        async () => {
          console.log('Dashboard: Real-time project update received');
          await fetchRecentProjects();
        }
      )
      .subscribe();

    // Initial fetch
    fetchTasks();
    fetchRecentProjects();

    // Cleanup subscriptions
    return () => {
      taskChannel.unsubscribe();
      projectChannel.unsubscribe();
    };
  }, [supabase]);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single()
      
      if (userData) {
        setUserName(userData.full_name || user.email?.split('@')[0] || 'User')
      }
    }
  }

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        color,
        tasks (
          id,
          status
        ),
        project_members!inner (
          user_id,
          role
        )
      `)
      .eq('project_members.user_id', user.id)
      .neq('status', 'completed');

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }

    if (data) {
      const formattedProjects = data.map(project => {
        const tasks = project.tasks || [];
        const totalTasks = tasks.length;

        let progress = 0;
        if (totalTasks > 0) {
          const taskWeights = tasks.reduce((acc: number, task: { status: string }) => {
            switch (task.status) {
              case 'done':
                return acc + 100;
              case 'in_progress':
                return acc + 50;
              default:
                return acc + 0;
            }
          }, 0);
          progress = Math.round(taskWeights / totalTasks);
        }

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          progress: progress,
          color: project.color || 'bg-blue-500',
          project_members: project.project_members || [],
          tasks_count: totalTasks
        };
      });

      setProjects(formattedProjects);
    }
  };

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get all tasks assigned to user
    const { data: allTasks, error: allTasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        projects (
          name,
          color
        )
      `)
      .eq('assignee_id', user.id)
      .neq('status', 'done')
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false })

    if (allTasks && !allTasksError) {
      // Store all tasks for statistics
      setAllTasks(allTasks)

      // Set tasks with nearest deadlines (limit to 3)
      const tasksWithDeadlines = allTasks.filter(task => task.due_date)
      setTasks(tasksWithDeadlines.slice(0, 3))
    }
  }

  const fetchRecentProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // First get the recently viewed project IDs
    const { data: recentViews, error: recentViewsError } = await supabase
      .from('project_views')
      .select('*')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(3);

    if (recentViewsError) {
      console.error('Error fetching recent views:', recentViewsError);
      return;
    }

    if (!recentViews?.length) return;

    // Get the full project details for the recently viewed projects
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        project_members (
          user_id,
          role
        ),
        tasks (
          id,
          status
        )
      `)
      .in('id', recentViews.map(view => view.project_id));

    if (projectsError) {
      console.error('Error fetching project details:', projectsError);
      return;
    }

    if (projectsData) {
      // Combine project data with viewed_at timestamps
      const formattedProjects = projectsData.map(project => {
        const recentView = recentViews.find(view => view.project_id === project.id);
        const tasks = project.tasks || [];
        const totalTasks = tasks.length;
        
        // Calculate progress based on task statuses
        let progress = 0;
        if (totalTasks > 0) {
          const taskWeights = tasks.reduce((acc: number, task: { status: string }) => {
            switch (task.status) {
              case 'done':
                return acc + 100;
              case 'in_progress':
                return acc + 50;
              default: // 'todo'
                return acc + 0;
            }
          }, 0);
          progress = Math.round(taskWeights / totalTasks);
        }

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          progress: progress,
          color: project.color || 'bg-blue-500',
          project_members: project.project_members || [],
          tasks_count: totalTasks,
          viewed_at: recentView?.viewed_at || ''
        };
      });

      // Sort by viewed_at timestamp
      formattedProjects.sort((a, b) => 
        new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime()
      );

      setRecentProjects(formattedProjects);
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handleTaskUpdate = async () => {
    await fetchTasks();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700'
      case 'medium':
        return 'bg-orange-100 text-orange-700'
      case 'low':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Add this helper function to handle due date display
  const getDueDateDisplay = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const isOverdue = due < now;

    return {
      text: isOverdue 
        ? `${formatDistanceToNow(due)} overdue` 
        : formatDistanceToNow(due, { addSuffix: true }),
      isOverdue
    };
  };

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Hello, {userName}</h1>
            <p className="text-muted-foreground">Today is {today}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="search"
                placeholder="Search tasks and projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-muted/50 border-none focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
              <SearchDropdown
                isOpen={!!searchQuery}
                onClose={() => setSearchQuery("")}
                searchQuery={searchQuery}
              />
            </div>
            <Button className="w-full sm:w-auto rounded-full bg-[#1C1B1F] text-white hover:bg-[#2C2B2F]">
              Add New Project
            </Button>
          </div>
        </div>

        {/* Recently Viewed Projects Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recently Viewed Projects</h2>
            <Button variant="outline" onClick={() => router.push('/projects')}>View All</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project) => (
              <Card 
                key={project.id} 
                className="p-4 border-none cursor-pointer transition-all duration-300 relative overflow-hidden group hover:shadow-md"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                {/* Background decoration */}
                <div 
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                  style={getProjectCardStyles(project.color).background}
                />
                
                {/* Animated border */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div 
                    className="absolute inset-0"
                    style={getProjectCardStyles(project.color).hoverBorder}
                  />
                </div>

                {/* Add a subtle border */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{ 
                    border: `1px solid ${project.color}` 
                  }}
                />

                <div className="space-y-3 relative z-10">
                  <h3 className="font-medium truncate">{project.name}</h3>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{project.tasks_count} tasks</span>
                    <span>{project.progress}% complete</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${project.progress}%`,
                        backgroundColor: project.color
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last viewed: {new Date(project.viewed_at).toLocaleDateString()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 border-none relative overflow-hidden group hover:shadow-md transition-all duration-300">
            {/* Background decoration */}
            <div className={cn(
              "absolute inset-0 pointer-events-none transition-opacity duration-300",
              gradients.upcoming
            )} />
            
            {/* Animated border */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 opacity-20" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Upcoming Deadlines
                </h2>
                <Button variant="outline" onClick={() => router.push('/tasks')}>View All</Button>
              </div>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} 
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div className={cn("w-1 h-12 rounded-full")} 
                      style={{ backgroundColor: task.projects?.color }}
                    />
                    <div className="flex-1">
                      <h3 className="font-medium">{task.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{task.projects?.name}</span>
                        <div className="flex gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            getPriorityColor(task.priority)
                          )}>
                            {task.priority}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            {
                              "bg-blue-100 text-blue-700": task.status === 'todo',
                              "bg-yellow-100 text-yellow-700": task.status === 'in_progress'
                            }
                          )}>
                            {task.status === 'todo' ? 'To Do' : 'In Progress'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium whitespace-nowrap">
                      {task.due_date && (
                        <div className={cn(
                          "flex items-center gap-1",
                          getDueDateDisplay(task.due_date).isOverdue && "text-red-600"
                        )}>
                          <Clock className={cn(
                            "h-4 w-4",
                            getDueDateDisplay(task.due_date).isOverdue && "text-red-600"
                          )} />
                          {getDueDateDisplay(task.due_date).text}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No upcoming deadlines
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 border-none relative overflow-hidden group hover:shadow-md transition-all duration-300">
            {/* Background decoration */}
            <div className={cn(
              "absolute inset-0 pointer-events-none transition-opacity duration-300",
              gradients.stats
            )} />
            
            {/* Animated border */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-orange-500 to-yellow-500 opacity-20" />
            </div>

            <div className="relative z-10">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-pink-500 to-orange-500" />
                Statistics
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-white/40 backdrop-blur-sm">
                  <p className="text-2xl font-semibold text-pink-600">
                    {allTasks.filter(task => task.status !== 'done').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Pending tasks</p>
                </div>
                <div className="p-4 rounded-lg bg-white/40 backdrop-blur-sm">
                  <p className="text-2xl font-semibold text-orange-600">
                    {projects.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active projects</p>
                </div>
                <div className="p-4 rounded-lg bg-white/40 backdrop-blur-sm">
                  <p className="text-2xl font-semibold text-yellow-600">
                    {Math.round(
                      projects.reduce((acc, project) => acc + project.progress, 0) / 
                      Math.max(projects.length, 1)
                    )}%
                  </p>
                  <p className="text-sm text-muted-foreground">Avg. progress</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Recent Tasks</h2>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} 
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className={cn("w-1 h-12 rounded-full")} 
                    style={{ backgroundColor: task.projects?.color }}
                  />
                  <div className="flex-1">
                    <h3 className="font-medium">{task.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{task.projects?.name}</span>
                      <div className="flex gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          getPriorityColor(task.priority)
                        )}>
                          {task.priority}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          {
                            "bg-blue-100 text-blue-700": task.status === 'todo',
                            "bg-yellow-100 text-yellow-700": task.status === 'in_progress',
                            "bg-green-100 text-green-700": task.status === 'done'
                          }
                        )}>
                          {task.status === 'todo' ? 'To Do' : task.status === 'in_progress' ? 'In Progress' : 'Done'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium whitespace-nowrap">
                    {task.due_date && (
                      <div className={cn(
                        "flex items-center gap-1",
                        getDueDateDisplay(task.due_date).isOverdue && "text-red-600"
                      )}>
                        <Clock className={cn(
                          "h-4 w-4",
                          getDueDateDisplay(task.due_date).isOverdue && "text-red-600"
                        )} />
                        {getDueDateDisplay(task.due_date).text}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
  )
}