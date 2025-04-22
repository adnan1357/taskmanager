"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Clock, ChevronLeft, ChevronRight, MoreVertical, Trash, Pencil, Trash2, LayoutGrid, List } from "lucide-react";
import { NewTaskModal } from "@/components/modals/new-task-modal";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { TaskModal } from "@/components/modals/task-modal";
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ProjectMembersSidebar } from "@/components/shared/project-members-sidebar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InviteLinkModal } from "@/components/modals/invite-link-modal";
import { Badge } from "@/components/ui/badge";
import { GanttChart } from "@/components/charts/gantt-chart";
import { ProjectProgressChart } from "@/components/charts/progress-chart";
import { TaskDistributionChart } from "@/components/charts/task-distribution-chart";
import { KanbanBoard } from "@/app/components/KanbanBoard";
import { sendTaskEmailNotification } from '@/lib/email';

type ProjectStatus = 'planning' | 'in_progress' | 'in_review' | 'completed';

interface MemberUser {
  id: string;
  full_name: string | null;
  email: string | null;
  notifications_enabled?: boolean;
}

interface ProjectMemberWithUser {
  user_id: string;
  users: MemberUser;
}

interface ProjectMember {
  user_id: string;
  role: string;
  users: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string | null;
    notifications_enabled?: boolean;
  };
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  color: string;
  project_members: ProjectMember[];
  tasks_count: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  project_id: string;
  assignee_id: string | null;
  assignee: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploaded_at: string;
  file_path: string;
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
  file_path: string;
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

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  onFileUpload: (file: File) => Promise<void>;
}

interface ViewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
}

type ChartType = 'gantt' | 'progress' | 'distribution';

export default function ProjectPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const supabase = createClientComponentClient();
  const { isCollapsed } = useSidebar();
  const router = useRouter();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { toast } = useToast();
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<'open' | 'todo' | 'in_progress' | 'done' | 'all'>('open');
  const [showStatusAlert, setShowStatusAlert] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [selectedChart, setSelectedChart] = useState<ChartType>('gantt');
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'kanban'>('list');

  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          project_members!inner (
            user_id,
            role,
            users!inner (
              id,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('id', params.id)
        .single();

      if (projectError) throw projectError;

      if (!projectData) {
        setLoading(false);
        return;
      }

      // Check if current user is owner
      const userIsOwner = projectData.project_members?.some(
        (member: ProjectMember) => member.user_id === user.id && member.role === 'owner'
      );
      setIsOwner(userIsOwner);

      // Transform and validate the data
      const formattedProject: Project = {
        id: projectData.id,
        name: projectData.name,
        description: projectData.description,
        status: projectData.status as ProjectStatus,
        progress: projectData.progress || 0,
        color: projectData.color || 'bg-blue-500',
        project_members: (projectData.project_members || []).filter(
          (member: Partial<ProjectMember>): member is ProjectMember => 
            !!member && !!member.users && typeof member.users.full_name === 'string'
        ),
        tasks_count: projectData.tasks_count || 0
      };

      setProject(formattedProject);
      setLoading(false);

      // Set current user role
      const userMember = projectData.project_members?.find(
        (member: ProjectMember) => member.user_id === user.id
      );
      setCurrentUserRole(userMember?.role || null);

      // Fetch project documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select(`
          *,
          uploader:profiles!documents_uploaded_by_fkey (
            full_name,
            email
          )
        `)
        .eq('project_id', params.id)
        .order('uploaded_at', { ascending: false });

      if (documentsError) {
        console.error('Error fetching documents:', documentsError);
        throw documentsError;
      }

      // Transform the data to match your interface
      const transformedDocs = documentsData?.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        uploaded_at: doc.uploaded_at,
        file_path: doc.file_path,
        uploader: {
          full_name: doc.uploader?.full_name || doc.uploader?.email || 'Unknown User'
        }
      })) || [];

      setDocuments(transformedDocs);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', params.id)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Tasks fetch error:', tasksError);
        throw tasksError;
      }

      // Prepare the tasks with null assignees initially
      const formattedTasks = tasksData.map(task => ({
        ...task,
        assignee: null
      })) as Task[];

      // Get assignee_ids to fetch
      const assigneeIds = [];
      for (const task of tasksData) {
        if (task.assignee_id) {
          assigneeIds.push(task.assignee_id);
        }
      }

      // If we have assignees, fetch their data
      if (assigneeIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .in('id', assigneeIds);

        if (usersData) {
          // Create a map for quick lookup
          const userMap: Record<string, any> = {};
          for (const user of usersData) {
            userMap[user.id] = user;
          }

          // Update tasks with assignee data
          for (const task of formattedTasks) {
            if (task.assignee_id && userMap[task.assignee_id]) {
              const user = userMap[task.assignee_id];
              task.assignee = {
                id: user.id,
                full_name: user.full_name,
                avatar_url: user.avatar_url,
                email: user.email
              };
            }
          }
        }
      }

      // Update state with the formatted tasks
      setTasks(formattedTasks);

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
      setLoading(false);
    }
  }, [params.id, supabase]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleTaskUpdate = async (fromKanban = false) => {
    // Always refresh the task data to ensure assignee changes are reflected
    await fetchProjectData();
  };

  const handleFileUpload = async (file: File) => {
    try {
      if (!file || !file.type.includes('pdf')) {
        toast({
          title: "Invalid file",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }

      // First check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Create a more structured file path
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const filePath = `projects/${params.id}/${fileName}`;

      console.log('Attempting to upload file:', { fileName, filePath });

      // Upload file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);

      // Create document record
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .insert([
          {
            name: file.name,
            type: file.type,
            size: file.size,
            project_id: params.id,
            uploaded_by: user.id,
            file_path: filePath, // Use the same filePath we used for upload
          },
        ])
        .select()
        .single();

      if (documentError) {
        console.error('Document insert error:', documentError);
        throw documentError;
      }

      console.log('Document record created:', documentData);

      await fetchProjectData();
      setShowUploadModal(false);
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    }
  };

  const getDocumentUrl = async (filePath: string) => {
    try {
      console.log('Getting signed URL for:', filePath);

      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);

      if (error) {
        console.error('Error creating signed URL:', error);
        throw error;
      }

      if (!data?.signedUrl) {
        console.error('No signed URL returned for path:', filePath);
        throw new Error('No signed URL returned');
      }

      console.log('Successfully created signed URL');
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting document URL:', error);
      toast({
        title: "Error",
        description: "Could not load the document. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleDeleteDocument = async (docId: string, filePath: string, docName: string) => {
    try {
      // First check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Delete from database first
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .match({ id: docId, project_id: params.id });

      if (dbError) {
        console.error('Database delete error:', dbError);
        throw dbError;
      }

      // Then delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        throw storageError;
      }

      // Add activity for the deletion
      const { error: activityError } = await supabase
        .from('activities')
        .insert([{
          type: 'document_delete',
          description: `deleted document "${docName}"`,
          project_id: params.id,
          user_id: user.id,
        }]);

      if (activityError) {
        console.error('Activity insert error:', activityError);
      }

      await fetchProjectData();
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const trackProjectView = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('project_views')
        .upsert(
          { 
            project_id: params.id,
            user_id: user.id,
            viewed_at: new Date().toISOString()
          },
          { onConflict: 'user_id,project_id' }
        );

      if (error) {
        console.error('Error tracking project view:', error);
      }
    } catch (error) {
      console.error('Error in trackProjectView:', error);
    }
  };

  useEffect(() => {
    trackProjectView();
  }, [params.id]);

  const handleCreateTask = async (taskData: any) => {
    try {
      console.log('Creating task with data:', taskData);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create the task with the current user as creator
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          project_id: params.id,
          created_by: user.id
        })
        .select()
        .single();

      if (taskError) {
        console.error('Task creation error:', taskError);
        throw taskError;
      }

      console.log('Task created successfully:', newTask);

      // Add activity for task creation
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          type: 'task_create',
          description: `created task "${taskData.title}"`,
          project_id: params.id,
          task_id: newTask.id,
          user_id: user.id
        });

      if (activityError) {
        console.error('Activity insert error:', activityError);
      }

      // Refresh project data
      await fetchProjectData();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is project owner
      const isOwner = project?.project_members.some(
        member => member.user_id === user.id && member.role === 'owner'
      );

      if (!isOwner) {
        toast({
          title: "Permission Denied",
          description: "Only project owners can change the project status",
          variant: "destructive"
        });
        return;
      }

      // If trying to mark as completed, check for outstanding tasks
      if (newStatus === 'completed') {
        const outstandingTasks = tasks.filter(task => task.status !== 'done');
        if (outstandingTasks.length > 0) {
          setPendingStatus(null);
          setShowStatusAlert(true);
          return;
        }
      }

      // Update project status in the database using the correct column name 'status'
      const { error: updateError } = await supabase
        .from('projects')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Update local state
      if (project) {
        setProject({
          ...project,
          status: newStatus
        });
      }

      // Record the activity
      await supabase.from('activities').insert({
        project_id: params.id,
        user_id: user.id,
        type: 'project_update',
        description: `changed project status to ${newStatus}`
      });

      toast({
        title: "Success",
        description: "Project status updated successfully",
      });

      // Refresh project data
      await fetchProjectData();
      
    } catch (error: any) {
      console.error('Error updating project status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update project status",
        variant: "destructive"
      });
    }
  };

  const filteredTasks = tasks.filter(task => {
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
  });

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

  // Update the getDueDateDisplay function
  const getDueDateDisplay = (dueDate: string, status: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const isOverdue = due < now && status !== 'done';

    if (status === 'done') {
      return {
        text: `Completed ${formatDistanceToNow(due, { addSuffix: true })}`,
        isOverdue: false
      };
    }

    return {
      text: isOverdue 
        ? `${formatDistanceToNow(due)} overdue` 
        : formatDistanceToNow(due, { addSuffix: true }),
      isOverdue
    };
  };

  // Add a helper function for status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-purple-100 text-purple-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'in_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddComment = async () => {
    try {
      if (!newComment.trim()) {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add comments",
          variant: "destructive",
        });
        return;
      }

      // Add the comment as an activity
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          project_id: params.id,
          type: 'comment',
          description: newComment,
          user_id: user.id
        });

      if (activityError) {
        throw activityError;
      }

      // Clear the comment input and refresh project data
      setNewComment('');
      await fetchProjectData();

      toast({
        title: "Success",
        description: "Comment added successfully",
      });

    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const generateInviteLink = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found when generating invite');
        return;
      }

      // Check if user has permission to invite
      if (currentUserRole === 'viewer') {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to invite members",
          variant: "destructive",
        });
        return;
      }

      const token = crypto.randomUUID();

      // Log the data we're about to insert
      console.log('Creating invite with data:', {
        project_id: params.id,
        token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      const { data: invite, error: inviteError } = await supabase
        .from('project_invites')
        .insert({
          project_id: params.id,
          token: token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (inviteError) {
        console.error('Error creating invite:', inviteError);
        throw inviteError;
      }

      console.log('Created invite:', invite);

      const inviteUrl = `${window.location.origin}/join/${params.id}?token=${token}`;
      
      const { error: activityError } = await supabase.from('activities').insert({
        project_id: params.id,
        user_id: user.id,
        type: 'invite_create',
        description: 'generated a new invite link'
      });

      if (activityError) {
        console.error('Error creating activity:', activityError);
      }

      return inviteUrl;
    } catch (error) {
      console.error('Detailed error generating invite:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate invite link",
        variant: "destructive",
      });
      return null;
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
      <div className={cn(
        "mx-auto space-y-8 p-8 transition-all duration-300",
        "max-w-full"
      )}>
        {/* Project Header with themed background */}
        <div 
          className="rounded-lg p-8 mb-8"
          style={{
            background: `linear-gradient(135deg, ${project.color}15, ${project.color}25)`,
            borderLeft: `4px solid ${project.color}`
          }}
        >
          <Button
            variant="ghost"
            className="mb-4 hover:bg-black/5 -ml-2"
            onClick={() => router.push('/projects')}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Projects
          </Button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <p className="text-muted-foreground mt-2">{project.description}</p>
            </div>
            {/* Project Status and Members */}
            <div className="flex items-center gap-4">
              {isOwner ? (
                <Select
                  value={project.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge 
                  variant="secondary"
                  className={cn(
                    "h-9 px-4 flex items-center capitalize",
                    getStatusColor(project.status)
                  )}
                >
                  {project.status.replace('_', ' ')}
                </Badge>
              )}
              {currentUserRole !== 'viewer' && (
                <Button 
                  className="rounded-full bg-[#1C1B1F] text-white hover:bg-[#2C2B2F]"
                  onClick={() => setShowNewTaskModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Replace the Documents and Tasks sections with this new layout */}
        <div className="grid grid-cols-4 gap-6">
          {/* Documents Section - 1/4 width, hidden in kanban mode */}
          <div className={cn("col-span-1", taskViewMode === 'kanban' && "hidden")}>
            <Card className="p-6 h-full" style={{ borderLeft: `4px solid ${project.color}` }}>
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Documents</h2>
                </div>
                {currentUserRole !== 'viewer' && (
                  <Button 
                    variant="outline"
                    onClick={() => setShowUploadModal(true)}
                    className="w-full mb-6"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                )}
                <div className="flex-1 overflow-y-auto">
                  {documents.length > 0 ? (
                    <div className="space-y-4">
                      {documents.map((doc) => (
                        <Card 
                          key={doc.id} 
                          className="p-4 flex items-start space-x-4 group relative"
                        >
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={async () => {
                              const url = await getDocumentUrl(doc.file_path);
                              if (url) setSelectedDocumentUrl(url);
                            }}
                          >
                            <div className="flex items-start space-x-4">
                              <FileText className="h-8 w-8 text-blue-500" />
                              <div>
                                <h3 className="font-medium">{doc.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Uploaded by {doc.uploader.full_name}
                                </p>
                              </div>
                            </div>
                          </div>
                          {currentUserRole !== 'viewer' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteDocument(doc.id, doc.file_path, doc.name)}
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>There's nothing here. {currentUserRole !== 'viewer' ? 'Add your first document to begin.' : ''}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Tasks Section - 3/4 width or full width if in kanban mode */}
          <div className={cn("col-span-3", taskViewMode === 'kanban' && "col-span-4")}>
            <Card className="p-6" style={{ borderLeft: `4px solid ${project.color}` }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Current Tasks</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center rounded-md border">
                    <button 
                      onClick={() => setTaskViewMode('list')} 
                      className={cn(
                        "px-3 py-1.5 flex items-center gap-1",
                        taskViewMode === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      )}
                    >
                      <List className="h-4 w-4" />
                      <span className="text-sm">List</span>
                    </button>
                    <button 
                      onClick={() => setTaskViewMode('kanban')} 
                      className={cn(
                        "px-3 py-1.5 flex items-center gap-1",
                        taskViewMode === 'kanban' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      )}
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span className="text-sm">Kanban</span>
                    </button>
                  </div>
                  <Select
                    value={taskFilter}
                    onValueChange={(value: string) => setTaskFilter(value as typeof taskFilter)}
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
              
              {taskViewMode === 'list' ? (
                <div className="h-[500px] overflow-y-auto">
                  {filteredTasks.length > 0 ? (
                    <div className="space-y-4">
                      {filteredTasks.map((task) => (
                        <div 
                          key={task.id}
                          className="flex items-start space-x-4 p-4 hover:bg-muted rounded-lg cursor-pointer"
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          <div className="flex-1">
                            <h3 className="font-medium">{task.title}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              {task.assignee ? (
                                <>
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage 
                                      src={task.assignee.avatar_url || undefined} 
                                      alt={task.assignee.full_name || 'User'}
                                    />
                                    <AvatarFallback className="text-xs bg-primary/10">
                                      {task.assignee.full_name 
                                        ? task.assignee.full_name
                                            .split(' ')
                                            .map((name: string) => name[0])
                                            .join('')
                                            .toUpperCase()
                                        : 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-muted-foreground">
                                    {task.assignee.full_name || task.assignee.email || 'Unnamed User'}
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">Unassigned</span>
                              )}
                            </div>
                            <div className="flex gap-2 mt-2">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                getPriorityColor(task.priority)
                              )}>
                                {task.priority}
                              </span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                task.status === 'todo' && "bg-blue-100 text-blue-700",
                                task.status === 'in_progress' && "bg-yellow-100 text-yellow-700",
                                task.status === 'done' && "bg-green-100 text-green-700"
                              )}>
                                {task.status === 'todo' && 'To Do'}
                                {task.status === 'in_progress' && 'In Progress'}
                                {task.status === 'done' && 'Done'}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {task.due_date && (
                              <div className={cn(
                                "flex items-center gap-1",
                                getDueDateDisplay(task.due_date, task.status).isOverdue && "text-red-600 font-medium"
                              )}>
                                <Clock className={cn(
                                  "h-4 w-4",
                                  getDueDateDisplay(task.due_date, task.status).isOverdue && "text-red-600"
                                )} />
                                {getDueDateDisplay(task.due_date, task.status).text}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No tasks match the selected filter.</p>
                    </div>
                  )}
                </div>
              ) : (
                <KanbanBoard 
                  tasks={tasks} 
                  projectId={params.id}
                  onTaskUpdate={() => handleTaskUpdate(true)}
                  onTaskSelect={(taskId) => setSelectedTaskId(taskId)}
                />
              )}
            </Card>
          </div>
        </div>

        {/* Project Analytics Card */}
        <Card className="p-6 mt-8" style={{ borderLeft: `4px solid ${project.color}` }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Project Analytics</h2>
            <Tabs value={selectedChart} onValueChange={(value) => setSelectedChart(value as ChartType)}>
              <TabsList>
                <TabsTrigger value="gantt">Timeline View</TabsTrigger>
                <TabsTrigger value="progress">Progress Timeline</TabsTrigger>
                <TabsTrigger value="distribution">Task Distribution</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="h-[400px]">
            {selectedChart === 'gantt' && (
              <GanttChart tasks={tasks} />
            )}
            {selectedChart === 'progress' && (
              <ProjectProgressChart activities={activities} />
            )}
            {selectedChart === 'distribution' && (
              <TaskDistributionChart tasks={tasks} />
            )}
          </div>
        </Card>

        {/* Recent Activity Card */}
        <Card className="p-6 mt-8" style={{ borderLeft: `4px solid ${project.color}` }}>
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          {activities.length > 0 ? (
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Recent project activity would show here.</p>
            </div>
          )}
        </Card>

        {/* Comments Section */}
        <Card className="p-6 mt-8" style={{ borderLeft: `4px solid ${project.color}` }}>
          <h2 className="text-xl font-semibold mb-4">Comments</h2>
          {currentUserRole !== 'viewer' ? (
            <div className="flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Button onClick={handleAddComment}>
                Send
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Viewers cannot add comments
            </p>
          )}
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
            currentUserRole={currentUserRole || undefined}
          />
        )}

        <UploadDocumentModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={fetchProjectData}
          projectId={params.id}
          onFileUpload={handleFileUpload}
        />

        {selectedDocumentUrl && (
          <ViewDocumentModal
            isOpen={!!selectedDocumentUrl}
            onClose={() => setSelectedDocumentUrl(null)}
            documentUrl={selectedDocumentUrl}
          />
        )}

        <AlertDialog open={showStatusAlert} onOpenChange={setShowStatusAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cannot Complete Project</AlertDialogTitle>
              <AlertDialogDescription>
                There are {tasks.filter(task => task.status !== 'done').length} outstanding tasks that need to be completed first.
                Please complete all tasks before marking the project as completed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowStatusAlert(false)}>
                Understood
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <ProjectMembersSidebar projectId={params.id} />

      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={fetchProjectData}
        projectId={params.id}
        onFileUpload={handleFileUpload}
      />

      {selectedDocumentUrl && (
        <ViewDocumentModal
          isOpen={!!selectedDocumentUrl}
          onClose={() => setSelectedDocumentUrl(null)}
          documentUrl={selectedDocumentUrl}
        />
      )}

      <AlertDialog open={showStatusAlert} onOpenChange={setShowStatusAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Complete Project</AlertDialogTitle>
            <AlertDialogDescription>
              There are {tasks.filter(task => task.status !== 'done').length} outstanding tasks that need to be completed first.
              Please complete all tasks before marking the project as completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowStatusAlert(false)}>
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UploadDocumentModal({ isOpen, onClose, onSuccess, projectId, onFileUpload }: UploadDocumentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to upload",
        variant: "destructive",
      });
      return;
    }
    await onFileUpload(file);
    onSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a PDF document to your project
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            required
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Upload</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ViewDocumentModal({ isOpen, onClose, documentUrl }: ViewDocumentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Document Viewer</DialogTitle>
        </DialogHeader>
        <div className="flex-1 w-full h-full min-h-[60vh]">
          <iframe
            src={`${documentUrl}#toolbar=0`}
            className="w-full h-full rounded-md"
            title="PDF Viewer"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}