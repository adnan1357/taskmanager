"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, MoreVertical, Plus, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useUser } from "@/lib/hooks/use-user";
import { NewProjectModal } from "@/components/modals/new-project-modal";
import { useSidebar } from "@/lib/hooks/use-sidebar";

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

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  useEffect(() => {
    async function fetchUserProjects() {
      if (!user?.id) return;
      
      try {
        // Get all projects where user is creator or member
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select(`
            *,
            project_members (user_id),
            tasks (count)
          `)
          .order('created_at', { ascending: false });

        if (projectsError) throw projectsError;

        if (!projectsData?.length) {
          setProjects([]);
          setLoading(false);
          return;
        }

        // Transform the data
        const projectsWithDetails = projectsData.map(project => ({
          ...project,
          members: project.project_members?.length || 0,
          tasks: project.tasks?.[0]?.count || 0
        }));

        setProjects(projectsWithDetails);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    }

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
  }, [user?.id, user?.email, supabase]);

  const handleProjectClick = (projectId: number) => {
    router.push(`/projects/${projectId}`);
  };

  // Helper function to generate random colors for projects
  const getRandomColor = () => {
    const colors = ['bg-[#8B5CF6]', 'bg-[#67E3F9]', 'bg-[#FF8A65]'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96">Loading...</div>;
  }

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto space-y-8 p-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold">Hello, {userName}</h1>
            <p className="text-muted-foreground">Today is {today}</p>
          </div>
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
            <Button variant="ghost" size="icon" className="rounded-full">
              <Calendar className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card 
              key={project.id} 
              className="p-6 project-card border-none cursor-pointer transition-transform hover:scale-[1.02]"
              onClick={() => handleProjectClick(project.id)}
            >
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{project.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle menu click
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2 flex-1">
                    {[...Array(Math.min(3, project.members))].map((_, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border-2 border-white bg-muted"
                      />
                    ))}
                    {project.members > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                        +{project.members - 3}
                      </div>
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
                    <span className="text-muted-foreground">{project.tasks} tasks</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ 
                        width: `${project.progress}%`,
                        backgroundColor: project.color // Use the color directly
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <NewProjectModal
          isOpen={showNewProjectModal}
          onClose={() => setShowNewProjectModal(false)}
          onSuccess={() => {
            // Refresh the projects list
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}