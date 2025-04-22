"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, MoreVertical, Plus, Calendar, ExternalLink } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useUser } from "@/lib/hooks/use-user";
import { NewProjectModal } from "@/components/modals/new-project-modal";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Add this CSS at the top of your file after the imports
const progressBarStyles = `
  .progress-bar {
    width: 100%;
    height: 6px;
    background-color: #f3f4f6;
    border-radius: 9999px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: 9999px;
    transition: width 0.3s ease;
  }
`;

// First update the interface to include priority
interface Task {
  id: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
}

// Add type for priority stats
interface PriorityStat {
  [key: string]: number;
}

// Add the helper function for priority colors
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
};

// Update the helper function to handle color values better
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

  // Fallback if color is not hex
  return {
    background: {
      background: `linear-gradient(135deg, ${color}30, ${color}10)`
    },
    hoverBorder: {
      background: `linear-gradient(to right, ${color}50, ${color}20)`
    }
  };
};

// First, add a helper function to sort projects
const sortProjects = (projects: any[]) => {
  const activeProjects = projects.filter(p => p.status !== 'completed')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  
  const completedProjects = projects.filter(p => p.status === 'completed')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return { activeProjects, completedProjects };
};

// Add these interfaces at the top with other interfaces
interface ProjectMember {
  user_id: string;
  role: string;
  users: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  color: string;
  created_by: string;
  project_members: ProjectMember[];
  tasks: Task[];
  memberDetails: ProjectMember[];
  members: number;
  tasks_count: number;
  progress: number;
  priority_stats: PriorityStat;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  const { user } = useUser();
  const [userName, setUserName] = useState('User');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const { isCollapsed } = useSidebar();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Update the fetchUserProjects function to include task priority
  const fetchUserProjects = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      console.log('Current user ID:', user.id); // Log user ID
      
      const queryString = `
        id,
        name,
        description,
        status,
        color,
        created_by,
        project_members!inner (
          user_id,
          role,
          users!inner (
            id,
            full_name,
            avatar_url
          )
        ),
        tasks (
          id,
          status,
          priority
        )
      `;

      // Get projects where user is creator
      const { data: createdProjects, error: createdError } = await supabase
        .from('projects')
        .select(queryString)
        .eq('created_by', user.id);

      if (createdError) throw createdError;
      
      console.log('Projects created by user:', createdProjects); // Log created projects

      // Get projects where user is a member (modify this query)
      const { data: memberProjects, error: memberError } = await supabase
        .from('projects')
        .select(queryString)
        .neq('created_by', user.id) // Don't get projects user created
        .in('id', ( // Get projects where user is a member
          await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', user.id)
        ).data?.map(pm => pm.project_id) || []);

      if (memberError) throw memberError;

      // Combine and deduplicate projects
      const allProjects = [...(createdProjects || []), ...(memberProjects || [])];
      const uniqueProjects = Array.from(new Map(allProjects.map(p => [p.id, p])).values());

      const projectsWithDetails = uniqueProjects.map(project => {
        // Log each project's created_by field with type information
        console.log(`Project ${project.name || 'unnamed'} created_by: ${project.created_by} (${typeof project.created_by}), user.id: ${user.id} (${typeof user.id}), match: ${project.created_by === user.id}, string match: ${String(project.created_by) === String(user.id)}`);
        const tasks = project.tasks || [];
        const activeTasks = tasks.filter(task => task.status !== 'done').length;
        
        // Log the project members to see what we're getting
        console.log('Project members:', project.project_members);

        // Calculate priority distribution - only count non-completed tasks
        const priorityCount = tasks.reduce((acc, task) => {
          // Only count tasks that aren't done
          if (task.status !== 'done') {
            acc[task.priority] = (acc[task.priority] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        // Calculate progress
        let progress = 0;
        if (tasks.length > 0) {  // Note: Use total tasks for progress calculation
          const taskWeights = tasks.reduce((acc, task) => {
            switch (task.status) {
              case 'done':
                return acc + 100;
              case 'in_progress':
                return acc + 50;
              default:
                return acc + 0;
            }
          }, 0);
          progress = Math.round(taskWeights / tasks.length);
        }

        return {
          ...project,
          members: project.project_members?.length || 0,
          tasks: activeTasks,
          progress,
          priority_stats: priorityCount,
          color: project.color || `hsl(${Math.random() * 360}, 70%, 80%)`
        };
      });

      setProjects(projectsWithDetails);
      // Log all projects for debugging
      console.log('All projects with details:', projectsWithDetails);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  useEffect(() => {
    async function fetchUserName() {
      if (!user?.id) return;
      
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (userData) {
        setUserName(userData.full_name || user.email?.split('@')[0] || 'User');
      }
    }

    fetchUserProjects();
    fetchUserName();
  }, [fetchUserProjects, user?.id, user?.email, supabase]);

  const handleProjectClick = (projectId: number) => {
    router.push(`/projects/${projectId}`);
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: number) => {
    e.stopPropagation();
    setShowDeleteConfirm(projectId);
  };

  const handleDeleteConfirm = async () => {
    if (!showDeleteConfirm) return;
    
    try {
      // First delete all activities
      const { error: activitiesError } = await supabase
        .from('activities')
        .delete()
        .eq('project_id', showDeleteConfirm);

      if (activitiesError) throw activitiesError;

      // Delete all documents and their files from storage
      const { data: documents, error: fetchDocsError } = await supabase
        .from('documents')
        .select('file_path')
        .eq('project_id', showDeleteConfirm);

      if (fetchDocsError) throw fetchDocsError;

      // Delete files from storage
      for (const doc of documents || []) {
        const { error: storageError } = await supabase
          .storage
          .from('documents')
          .remove([doc.file_path]);

        if (storageError) throw storageError;
      }

      // Delete document records
      const { error: documentsError } = await supabase
        .from('documents')
        .delete()
        .eq('project_id', showDeleteConfirm);

      if (documentsError) throw documentsError;

      // Delete project members
      const { error: membersError } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', showDeleteConfirm);

      if (membersError) throw membersError;

      // Delete tasks
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('project_id', showDeleteConfirm);

      if (tasksError) throw tasksError;

      // Finally delete the project
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', showDeleteConfirm);

      if (projectError) throw projectError;

      await fetchUserProjects();
      toast.success('Project and all associated data deleted successfully');
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error(error.message || 'Failed to delete project');
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const handleEditProject = (e: React.MouseEvent, projectId: number) => {
    e.stopPropagation();
    router.push(`/projects/${projectId}/edit`);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96">Loading...</div>;
  }

  return (
    <div className="pt-16">
      <div className={cn(
        "mx-auto space-y-8 p-8 transition-all duration-300",
        "max-w-full"
      )}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Projects</h1>
          <div className="flex gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="search"
                placeholder="Search projects..."
                className="pl-10 pr-4 py-2 rounded-full bg-muted/50 border-none focus:ring-2 focus:ring-primary/20 focus:outline-none w-64"
              />
            </div>
            <Button 
              className="rounded-full bg-[#1C1B1F] text-white hover:bg-[#2C2B2F]"
              onClick={() => setShowNewProjectModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Project
            </Button>
          </div>
        </div>

        {/* Active Projects Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortProjects(projects).activeProjects.map((project) => (
              <Card 
                key={project.id} 
                className="p-6 project-card border-none cursor-pointer transition-all duration-300 relative overflow-hidden group hover:shadow-md"
                onClick={() => handleProjectClick(project.id)}
              >
                {/* Background decoration with higher opacity */}
                <div 
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                  style={getProjectCardStyles(project.color).background}
                />
                
                {/* Animated border with higher opacity */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div 
                    className="absolute inset-0"
                    style={getProjectCardStyles(project.color).hoverBorder}
                  />
                </div>

                {/* Add a subtle border using the project color */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{ 
                    border: `1px solid ${project.color}` 
                  }}
                />

                <div className="space-y-6 relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{project.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    </div>
                    {user && (
                      // Show if user created the project OR is an owner
                      (user.id === project.created_by || 
                       String(user.id) === String(project.created_by) ||
                       ((project.project_members || []) as ProjectMember[]).some(m => m.user_id === user.id && m.role === 'owner'))
                    ) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleEditProject(e, project.id)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={(e) => handleDeleteProject(e, project.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2 flex-1">
                      {project.project_members && project.project_members.length > 0 ? (
                        project.project_members.map((member: ProjectMember) => (
                          <Avatar key={member.user_id} className="w-8 h-8 border-2 border-white">
                            <AvatarImage 
                              src={member.users.avatar_url || undefined}
                              alt={member.users.full_name || 'Project member'}
                            />
                            <AvatarFallback className="bg-muted text-sm font-medium">
                              {member.users.full_name
                                ? member.users.full_name
                                    .split(' ')
                                    .slice(0, 2)
                                    .map((name: string) => name[0])
                                    .join('')
                                    .toUpperCase()
                                : '?'}
                            </AvatarFallback>
                          </Avatar>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">No members</div>
                      )}
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      project.status === "in_progress" && "bg-blue-100 text-blue-700",
                      project.status === "in_review" && "bg-yellow-100 text-yellow-700",
                      project.status === "planning" && "bg-purple-100 text-purple-700",
                      project.status === "completed" && "bg-green-100 text-green-700"
                    )}>
                      {project.status === "in_progress" ? "In Progress" :
                       project.status === "in_review" ? "In Review" :
                       project.status === "planning" ? "Planning" :
                       "Completed"}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{project.tasks} tasks</span>
                        {Object.entries(project.priority_stats as PriorityStat).map(([priority, count]) => (
                          <span
                            key={priority}
                            className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              getPriorityColor(priority)
                            )}
                          >
                            {`${count} ${priority}`}
                          </span>
                        ))}
                      </div>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ 
                          width: `${project.progress}%`,
                          backgroundColor: project.color
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Completed Projects Section */}
        {sortProjects(projects).completedProjects.length > 0 && (
          <div className="space-y-4 mt-12">
            <h2 className="text-xl font-semibold text-muted-foreground">Completed Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortProjects(projects).completedProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className="p-6 project-card border-none cursor-pointer transition-all duration-300 relative overflow-hidden group hover:shadow-md"
                  onClick={() => handleProjectClick(project.id)}
                >
                  {/* Background decoration with higher opacity */}
                  <div 
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                    style={getProjectCardStyles(project.color).background}
                  />
                  
                  {/* Animated border with higher opacity */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div 
                      className="absolute inset-0"
                      style={getProjectCardStyles(project.color).hoverBorder}
                    />
                  </div>

                  {/* Add a subtle border using the project color */}
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{ 
                      border: `1px solid ${project.color}` 
                    }}
                  />

                  <div className="space-y-6 relative z-10">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{project.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                      </div>
                      {user && (
                        // Show if user created the project OR is an owner
                        (user.id === project.created_by || 
                         String(user.id) === String(project.created_by) ||
                         ((project.project_members || []) as ProjectMember[]).some(m => m.user_id === user.id && m.role === 'owner'))
                      ) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleEditProject(e, project.id)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={(e) => handleDeleteProject(e, project.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2 flex-1">
                        {project.project_members && project.project_members.length > 0 ? (
                          project.project_members.map((member: ProjectMember) => (
                            <Avatar key={member.user_id} className="w-8 h-8 border-2 border-white">
                              <AvatarImage 
                                src={member.users.avatar_url || undefined}
                                alt={member.users.full_name || 'Project member'}
                              />
                              <AvatarFallback className="bg-muted text-sm font-medium">
                                {member.users.full_name
                                  ? member.users.full_name
                                      .split(' ')
                                      .slice(0, 2)
                                      .map((name: string) => name[0])
                                      .join('')
                                      .toUpperCase()
                                  : '?'}
                              </AvatarFallback>
                            </Avatar>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">No members</div>
                        )}
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        project.status === "in_progress" && "bg-blue-100 text-blue-700",
                        project.status === "in_review" && "bg-yellow-100 text-yellow-700",
                        project.status === "planning" && "bg-purple-100 text-purple-700",
                        project.status === "completed" && "bg-green-100 text-green-700"
                      )}>
                        {project.status === "in_progress" ? "In Progress" :
                         project.status === "in_review" ? "In Review" :
                         project.status === "planning" ? "Planning" :
                         "Completed"}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{project.tasks} tasks</span>
                          {Object.entries(project.priority_stats as PriorityStat).map(([priority, count]) => (
                            <span
                              key={priority}
                              className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                getPriorityColor(priority)
                              )}
                            >
                              {`${count} ${priority}`}
                            </span>
                          ))}
                        </div>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{ 
                            width: `${project.progress}%`,
                            backgroundColor: project.color
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <NewProjectModal
          isOpen={showNewProjectModal}
          onClose={() => setShowNewProjectModal(false)}
          onSuccess={async () => {
            // Refresh the projects list
            await fetchUserProjects();
            setShowNewProjectModal(false);
          }}
        />

        <AlertDialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
          <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">Delete Project</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This will permanently delete the project and all its associated tasks and data. 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Delete Project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}