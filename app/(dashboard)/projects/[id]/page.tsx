"use client";

import { useEffect, useState, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Clock } from "lucide-react";
import { NewTaskModal } from "@/components/modals/new-task-modal";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { TaskModal } from "@/components/modals/task-modal";
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ProjectMembersSidebar } from "@/components/shared/project-members-sidebar";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  color: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  assignee: {
    full_name: string;
    avatar_url: string;
  };
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploaded_at: string;
  uploader: {
    full_name: string;
  };
}

interface Activity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  actor: {
    full_name: string;
    avatar_url: string;
  };
}

interface RawTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  assignee: {
    full_name: string;
    avatar_url: string;
  };
}

interface RawDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploaded_at: string;
  uploader: {
    full_name: string;
    email: string;
  };
}

interface RawActivity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  actor: {
    full_name: string;
    avatar_url: string;
  };
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const { isCollapsed } = useSidebar();
  const router = useRouter();

  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch project documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select(`
          id,
          name,
          type,
          size,
          uploaded_at,
          uploaded_by,
          uploader:profiles!documents_uploaded_by_fkey (
            full_name,
            email
          )
        `)
        .eq('project_id', params.id)
        .order('uploaded_at', { ascending: false });

      // Transform the data to match your interface
      const transformedDocs = (documentsData as RawDocument[] | null)?.map(doc => ({
        ...doc,
        uploader: {
          full_name: doc.uploader?.full_name || doc.uploader?.email
        }
      })) || [];

      if (documentsError) throw documentsError;
      setDocuments(transformedDocs);

      // Fetch tasks with assignee info
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', params.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      setTasks(tasksData || []);

      // Fetch recent activities - limit to 5 most recent
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          id,
          type,
          description,
          created_at,
          actor:profiles!activities_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', params.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Transform the activities data
      const transformedActivities = (activitiesData as RawActivity[] | null)?.map(activity => ({
        ...activity,
        actor: {
          full_name: activity.actor?.full_name || '',
          avatar_url: activity.actor?.avatar_url || ''
        }
      })) || [];

      if (activitiesError) throw activitiesError;
      setActivities(transformedActivities);

    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, params.id]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleTaskUpdate = async () => {
    try {
      setTasks([]); // Clear the tasks first
      await fetchProjectData(); // Fetch fresh data
      router.refresh(); // Refresh the router
    } catch (error) {
      console.error('Error updating tasks:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96">Loading...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto space-y-8 p-8 pr-72">
        {/* Project Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground mt-2">{project.description}</p>
          </div>
          <Button 
            className="rounded-full bg-[#1C1B1F] text-white hover:bg-[#2C2B2F]"
            onClick={() => setShowNewTaskModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Documents Section */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Documents</h2>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="p-4 flex items-start space-x-4">
                <FileText className="h-8 w-8 text-blue-500" />
                <div>
                  <h3 className="font-medium">{doc.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Uploaded by {doc.uploader.full_name}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* Tasks Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Current Tasks</h2>
          <div className="space-y-4">
            {tasks.map((task) => (
              <Card 
                key={task.id} 
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedTaskId(task.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Assigned to {task.assignee.full_name}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {task.status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* Recent Activity Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-sm">
                      <span className="font-medium">{activity.actor.full_name}</span>{' '}
                      {activity.description}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <NewTaskModal
          isOpen={showNewTaskModal}
          onClose={() => setShowNewTaskModal(false)}
          onSuccess={fetchProjectData}
          projectId={params.id}
        />

        {selectedTaskId && (
          <TaskModal
            isOpen={!!selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
            taskId={selectedTaskId}
            projectId={params.id}
            onTaskUpdate={handleTaskUpdate}
          />
        )}
      </div>
      <ProjectMembersSidebar projectId={params.id} />
    </div>
  );
}