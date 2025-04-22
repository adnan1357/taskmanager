"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
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
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIEnhanceButton } from "@/components/ui/ai-enhance-button";
import { sendTaskEmailNotification } from '@/lib/email';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  projectId: string;
  onTaskUpdate: () => void;
  currentUserRole?: string;
}

interface TaskUpdate {
  id: string;
  description: string;
  created_at: string;
  type: string;
  user_id: string;
  task_id: string;
  actor: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface TaskEmailData {
  taskTitle: string;
  projectName: string;
  action: 'created' | 'updated' | 'priority_changed' | 'status_changed';
  priority?: string;
  status?: string;
  updateText?: string;
  assigneeName?: string;
  dueDate?: string;
}

interface ProjectMember {
  user_id: string;
  users: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: string | null;
  assignee: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  due_date: string | null;
}

interface TaskFormData {
  title: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  assignee_id: string | null;
  due_date: string | null;
}

export function TaskModal({ 
  isOpen, 
  onClose, 
  taskId, 
  projectId, 
  onTaskUpdate,
  currentUserRole 
}: TaskModalProps) {
  const { toast } = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [newUpdate, setNewUpdate] = useState("");
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const supabase = createClientComponentClient();
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'low',
    assignee_id: null,
    due_date: null
  });

  const fetchTaskDetails = useCallback(async () => {
    try {
      // First get the task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      // Then get the assignee details
      let assigneeData = null;
      if (taskData.assignee_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .eq('id', taskData.assignee_id)
          .single();
        
        if (!userError) {
          assigneeData = userData;
        }
      }

      setTask({
        id: taskData.id,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        assignee_id: taskData.assignee_id,
        assignee: assigneeData,
        due_date: taskData.due_date
      });

      // Initialize form data with task data
      setFormData({
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        assignee_id: taskData.assignee_id,
        due_date: taskData.due_date
      });

      const { data: updatesData, error: updatesError } = await supabase
        .from('activities')
        .select(`
          id,
          description,
          created_at,
          type,
          user_id,
          task_id
        `)
        .eq('type', 'task_update')
        .eq('project_id', projectId)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (updatesError) throw updatesError;

      // Get user details for each activity
      const transformedUpdates = await Promise.all((updatesData || []).map(async (update) => {
        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .eq('id', update.user_id)
          .single();

        return {
          ...update,
          actor: {
            id: userData?.id || '',
            full_name: userData?.full_name || '',
            avatar_url: userData?.avatar_url || null
          }
        };
      }));

      setUpdates(transformedUpdates);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching task details:', error);
    }
  }, [taskId, projectId, supabase]);

  const fetchProjectMembers = useCallback(async () => {
    try {
      const { data: membersData, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          users (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching project members:', error);
        return;
      }

      // Log the data structure to understand it better
      console.log('Raw members data:', JSON.stringify(membersData, null, 2));

      // Use type assertion to handle the data structure
      const transformedMembers = (membersData || []).map(member => {
        // Type assertion to handle the structure
        const userData = member.users as unknown as {
          id: string;
          full_name: string;
          avatar_url: string | null;
        };
        
        return {
          user_id: member.user_id,
          users: userData
        } as ProjectMember;
      });

      setProjectMembers(transformedMembers);
    } catch (error) {
      console.error('Error in fetchProjectMembers:', error);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    if (isOpen) {
      fetchTaskDetails();
      fetchProjectMembers();
    }
  }, [isOpen, taskId, fetchTaskDetails, fetchProjectMembers]);

  const sendEmailToProjectMembers = async (taskData: Omit<TaskEmailData, 'projectName'>) => {
    try {
      // First get all project members with their user IDs
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId);

      if (membersError) {
        console.error('Error fetching project members:', membersError);
        return;
      }

      if (!membersData) return;

      // Get project name
      const { data: projectData } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      // Get current user's email from auth
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.email) {
        console.error('No current user email found');
        return;
      }

      // Send email to each project member
      for (const member of membersData) {
        // Get user details from public.users including notification preference
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('full_name, email, notifications_enabled')
          .eq('id', member.user_id)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
          continue;
        }

        // Skip if notifications are disabled for this user
        if (!userData?.notifications_enabled) {
          console.log(`Skipping email for user ${userData?.full_name} - notifications disabled`);
          continue;
        }

        // Use the email from public.users if available, otherwise use current user's email
        const emailToUse = userData?.email || currentUser.email;

        if (emailToUse) {
          await sendTaskEmailNotification(
            emailToUse,
            userData?.full_name || 'Project Member',
            {
              ...taskData,
              projectName: projectData?.name || 'Unknown Project'
            }
          );
        }
      }
    } catch (error) {
      console.error('Error sending email notifications:', error);
    }
  };

  const handleUpdateSubmit = async () => {
    if (!newUpdate.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      if (!userData?.full_name) return;

      const { data, error } = await supabase
        .from('activities')
        .insert({
          project_id: projectId,
          task_id: taskId,
          user_id: user.id,
          type: 'task_update',
          description: `${userData.full_name}: ${newUpdate}`
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding update:', error);
        return;
      }

      // Send email to all project members
      await sendEmailToProjectMembers({
        taskTitle: task?.title || 'Unknown Task',
        action: 'updated',
        updateText: newUpdate,
        assigneeName: task?.assignee?.full_name
      });

      setNewUpdate("");
      await fetchTaskDetails();
      onTaskUpdate();
    } catch (error) {
      console.error('Error in handleUpdateSubmit:', error);
    }
  };

  const handleAssigneeChange = async (userId: string) => {
    try {
      const assigneeId = userId === 'unassigned' ? null : userId;
      
      await supabase
        .from('tasks')
        .update({ assignee_id: assigneeId })
        .eq('id', taskId);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current user's name
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (!userData?.full_name) return;

      // Find the new assignee from project members
      const newAssignee = assigneeId ? projectMembers.find(m => m.user_id === assigneeId) : null;
      
      await supabase.from('activities').insert({
        project_id: projectId,
        task_id: taskId,
        user_id: user.id,
        type: 'task_update',
        description: newAssignee 
          ? `${userData.full_name} assigned task to ${newAssignee.users.full_name}`
          : `${userData.full_name} unassigned the task`
      });

      await fetchTaskDetails();
      onTaskUpdate();
    } catch (error) {
      console.error('Error updating assignee:', error);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      const formattedStatus = status.replace('-', '_');
      
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: formattedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current user's name
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        return;
      }

      if (!userData?.full_name) return;

      // Format status for display
      const displayStatus = formattedStatus
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Send email to all project members
      await sendEmailToProjectMembers({
        taskTitle: task?.title || 'Unknown Task',
        action: 'status_changed',
        status: formattedStatus,
        assigneeName: task?.assignee?.full_name
      });

      // Record the activity
      await supabase.from('activities').insert({
        project_id: projectId,
        task_id: taskId,
        user_id: user.id,
        type: 'task_update',
        description: `${userData.full_name} updated status to ${displayStatus}`
      });

      // Update local task state immediately
      if (task) {
        setTask({
          ...task,
          status: formattedStatus
        });
      }

      // Refresh task details and notify parent
      await fetchTaskDetails();
      onTaskUpdate?.();

      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      });
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      if (!userData?.full_name) return;

      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          priority: newPriority,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Send email to all project members
      await sendEmailToProjectMembers({
        taskTitle: task?.title || 'Unknown Task',
        action: 'priority_changed',
        priority: newPriority,
        assigneeName: task?.assignee?.full_name
      });

      // Update local state
      if (task) {
        setTask({
          ...task,
          priority: newPriority
        });
        setFormData({
          ...formData,
          priority: newPriority as 'low' | 'medium' | 'high'
        });
      }

      // Add activity
      await supabase.from('activities').insert({
        project_id: projectId,
        task_id: taskId,
        user_id: user.id,
        type: 'task_update',
        description: `${userData.full_name} changed priority to ${newPriority}`
      });

      // Refresh task list
      onTaskUpdate();

      toast({
        title: "Success",
        description: "Task priority updated successfully",
      });
    } catch (error) {
      console.error('Error updating task priority:', error);
      toast({
        title: "Error",
        description: "Failed to update task priority",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setShowDeleteConfirm(false);

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Get user's name
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (!userData?.full_name) return;

      // Store task title for the activity log
      const taskTitle = task?.title;

      // Create a single transaction for all operations
      const { error } = await supabase.rpc('delete_task_with_activities', {
        task_id_input: taskId,
        project_id_input: projectId,
        user_id_input: user.id,
        user_name_input: userData.full_name,
        task_title_input: taskTitle || ''
      });

      if (error) {
        console.error('Error deleting task:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });

      onClose();
      await onTaskUpdate();

    } catch (error) {
      console.error('Error in handleDeleteConfirm:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        assignee_id: formData.assignee_id,
        due_date: formData.due_date,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      // Record the activity
      await supabase.from('activities').insert({
        project_id: projectId,
        user_id: user.id,
        type: 'task_update',
        description: `Updated task priority to ${formData.priority}`
      });

      onTaskUpdate?.();
      onClose();
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  if (loading) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">{task?.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{task?.description}</p>
              </div>
              {currentUserRole !== 'viewer' && (
                <Button variant="destructive" size="icon" onClick={handleDeleteClick}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Task Controls */}
            {currentUserRole !== 'viewer' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Select 
                    value={task?.assignee_id || undefined} 
                    onValueChange={handleAssigneeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {projectMembers.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.users.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={task?.status || 'todo'}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={task?.priority || 'low'}
                    onValueChange={handlePriorityChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !task?.due_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {task?.due_date ? format(new Date(task.due_date), 'PPP') : "Set due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={task?.due_date ? new Date(task.due_date) : undefined}
                        onSelect={async (date) => {
                          try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) return;

                            const { data: userData } = await supabase
                              .from('users')
                              .select('full_name')
                              .eq('id', user.id)
                              .single();

                            if (!userData?.full_name) return;

                            const { error } = await supabase
                              .from('tasks')
                              .update({ 
                                due_date: date?.toISOString(),
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', taskId);

                            if (error) throw error;

                            // Add activity
                            await supabase.from('activities').insert({
                              project_id: projectId,
                              task_id: taskId,
                              user_id: user.id,
                              type: 'task_update',
                              description: `${userData.full_name} ${date ? 'set' : 'removed'} due date ${date ? 'to ' + format(date, 'PPP') : ''}`
                            });

                            await fetchTaskDetails();
                            onTaskUpdate();

                            toast({
                              title: "Success",
                              description: "Due date updated successfully",
                            });
                          } catch (error) {
                            console.error('Error updating due date:', error);
                            toast({
                              title: "Error",
                              description: "Failed to update due date",
                              variant: "destructive",
                            });
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label className="w-24">Assignee:</Label>
                  <span className="text-muted-foreground">
                    {task?.assignee?.full_name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-24">Status:</Label>
                  <span className="text-muted-foreground capitalize">
                    {task?.status?.replace('_', ' ') || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-24">Priority:</Label>
                  <span className="text-muted-foreground capitalize">
                    {task?.priority || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-24">Due Date:</Label>
                  <span className="text-muted-foreground">
                    {task?.due_date ? format(new Date(task.due_date), 'PPP') : 'No due date set'}
                  </span>
                </div>
              </div>
            )}

            {/* New Update Input - Only show for non-viewers */}
            {currentUserRole !== 'viewer' && (
              <div className="space-y-2 mt-2">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add an update..."
                    value={newUpdate}
                    onChange={(e) => setNewUpdate(e.target.value)}
                    className="h-20"
                  />
                  <AIEnhanceButton
                    text={newUpdate}
                    onEnhancedText={(enhancedText) => setNewUpdate(enhancedText)}
                  />
                </div>
                <Button onClick={handleUpdateSubmit}>Add Update</Button>
              </div>
            )}

            {/* Updates List - Always visible */}
            <div className="space-y-2 mt-2">
              <h3 className="font-semibold">Updates</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {updates.map((update) => (
                  <div key={update.id} className="flex gap-2 p-2 bg-muted rounded-lg">
                    <Avatar className="h-6 w-6">
                      <AvatarImage 
                        src={update.actor?.avatar_url || undefined} 
                        alt={update.actor?.full_name || ''}
                      />
                      <AvatarFallback className="text-xs">
                        {update.actor?.full_name
                          ? update.actor.full_name
                              .split(' ')
                              .map(name => name[0])
                              .join('')
                              .toUpperCase()
                          : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium">{update.actor?.full_name}</p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(update.created_at), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                      <p className="text-sm">{update.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Only show delete confirmation for non-viewers */}
      {currentUserRole !== 'viewer' && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the task
                and all its associated updates.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
} 