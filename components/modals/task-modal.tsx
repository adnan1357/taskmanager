"use client";

import { useState, useEffect } from "react";
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

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  projectId: string;
  onTaskUpdate: () => void;
}

interface TaskUpdate {
  id: string;
  description: string;
  created_at: string;
  type: string;
  user_id: string;
  actor: {
    full_name: string;
    avatar_url: string;
  };
}

export function TaskModal({ isOpen, onClose, taskId, projectId, onTaskUpdate }: TaskModalProps) {
  const [task, setTask] = useState<any>(null);
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [newUpdate, setNewUpdate] = useState("");
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (isOpen) {
      fetchTaskDetails();
      fetchProjectMembers();
    }
  }, [isOpen, taskId]);

  const fetchTaskDetails = async () => {
    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      const { data: updatesData, error: updatesError } = await supabase
        .from('activities')
        .select(`
          id,
          description,
          created_at,
          type,
          user_id,
          task_id,
          actor:profiles!activities_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('type', 'task_update')
        .eq('project_id', projectId)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (updatesError) throw updatesError;

      console.log('Updates data:', updatesData);
      setTask(taskData);
      setUpdates(updatesData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching task details:', error);
    }
  };

  const fetchProjectMembers = async () => {
    try {
      // Get all project members with their profile information
      const { data: membersData, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          role,
          profiles (
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

      // Transform the data to a more usable format
      const members = membersData?.map(member => ({
        ...member,
        profiles: member.profiles || {
          id: member.user_id,
          full_name: 'Unknown User',
          avatar_url: null
        }
      })) || [];

      setProjectMembers(members);
    } catch (error) {
      console.error('Error in fetchProjectMembers:', error);
    }
  };

  const handleUpdateSubmit = async () => {
    if (!newUpdate.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
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

      setNewUpdate("");
      await fetchTaskDetails();
      onTaskUpdate();
    } catch (error) {
      console.error('Error in handleUpdateSubmit:', error);
    }
  };

  const handleAssigneeChange = async (userId: string) => {
    try {
      await supabase
        .from('tasks')
        .update({ assignee_id: userId })
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
      const newAssignee = projectMembers.find(m => m.user_id === userId);
      if (!newAssignee) return;
      
      await supabase.from('activities').insert({
        project_id: projectId,
        task_id: taskId,
        user_id: user.id,
        type: 'task_update',
        description: `${userData.full_name} assigned task to ${newAssignee.profiles.full_name}`
      });

      await fetchTaskDetails();
      onTaskUpdate();
    } catch (error) {
      console.error('Error updating assignee:', error);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (!userData?.full_name) return;

      const formattedStatus = status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      await supabase.from('activities').insert({
        project_id: projectId,
        task_id: taskId,
        user_id: user.id,
        type: 'task_update',
        description: `${userData.full_name} updated status to ${formattedStatus}`
      });

      await fetchTaskDetails();
      onTaskUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setShowDeleteConfirm(false);
      onClose();

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

      // First delete all activities related to this task
      const { error: activitiesError } = await supabase
        .from('activities')
        .delete()
        .eq('task_id', taskId);

      if (activitiesError) {
        console.error('Error deleting activities:', activitiesError);
        return;
      }

      // Then delete the task
      const { error: taskError } = await supabase
        .from('tasks')
        .delete()
        .match({ 
          id: taskId,
          project_id: projectId 
        });

      if (taskError) {
        console.error('Error deleting task:', taskError);
        return;
      }

      // Add deletion activity to project activities
      await supabase.from('activities').insert({
        project_id: projectId,
        user_id: user.id,
        type: 'task_update',
        description: `${userData.full_name} deleted task: ${task.title}`
      });

      await onTaskUpdate();

    } catch (error) {
      console.error('Error in handleDeleteConfirm:', error);
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
              <Button variant="destructive" size="icon" onClick={handleDeleteClick}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Task Controls */}
            <div className="flex gap-4">
              <Select value={task?.assignee?.id} onValueChange={handleAssigneeChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue>
                    {task?.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={task.assignee.avatar_url} />
                          <AvatarFallback>{task.assignee.full_name[0]}</AvatarFallback>
                        </Avatar>
                        {task.assignee.full_name}
                      </div>
                    ) : (
                      "Assign to..."
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projectMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.profiles.avatar_url} />
                          <AvatarFallback>{member.profiles.full_name[0]}</AvatarFallback>
                        </Avatar>
                        {member.profiles.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={task?.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* New Update Input */}
            <div className="space-y-2">
              <Textarea
                placeholder="Add an update..."
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
              />
              <Button onClick={handleUpdateSubmit}>Add Update</Button>
            </div>

            {/* Updates List */}
            <div className="space-y-4">
              <h3 className="font-semibold">Updates</h3>
              <div className="space-y-4">
                {updates.map((update) => (
                  <div key={update.id} className="flex gap-4 p-4 bg-muted rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={update.actor?.avatar_url} />
                      <AvatarFallback>{update.actor?.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{update.actor?.full_name}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1" />
                          {format(new Date(update.created_at), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                      <p className="mt-1 text-sm">{update.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
} 