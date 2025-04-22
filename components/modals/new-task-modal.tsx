"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "sonner";
import { AIEnhanceButton } from "@/components/ui/ai-enhance-button";
import { sendTaskEmailNotification } from '@/lib/email';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  projectId: string;
}

interface ProjectMemberUser {
  id: string;
  full_name: string | null;
  email: string | null;
  notifications_enabled?: boolean;
}

interface ProjectMember {
  user_id: string;
  users: ProjectMemberUser;
}

export function NewTaskModal({ isOpen, onClose, onSuccess, projectId }: NewTaskModalProps) {
  const { user } = useUser();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee_id: user?.id || '', // Default to current user
    due_date: ''
  });
  const [assignee, setAssignee] = useState<string>('');

  useEffect(() => {
    // Auto-set the assignee to the current user when opening the modal
    const setCurrentUserAsAssignee = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAssignee(user.id);
      }
    };
    
    if (isOpen) {
      setCurrentUserAsAssignee();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setLoading(true);

      // Format the task data
      const taskData = {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        project_id: projectId,
        assignee_id: assignee || user.id, // Use the selected assignee
        due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
        created_by: user.id
      };

      console.log('Creating task with data:', taskData);

      // Create the task
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (taskError) {
        console.error('Task creation error:', taskError);
        throw taskError;
      }

      console.log('Task created successfully:', newTask);

      // Get project details for email notification
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Record an activity for the task creation
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          project_id: projectId,
          task_id: newTask.id,
          user_id: user.id,
          type: 'task_create',
          description: `created task "${task.title}"`
        });

      if (activityError) {
        console.error('Error recording activity:', activityError);
      }

      toast.success('Task created successfully');
      await onSuccess();
      onClose();
      setTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee_id: user.id || '',
        due_date: ''
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your project. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={task.title}
              onChange={(e) => setTask(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Task title"
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Description</label>
            <div className="flex gap-2">
              <Textarea
                value={task.description}
                onChange={(e) => setTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Task description"
              />
              <AIEnhanceButton
                text={task.description}
                onEnhancedText={(enhancedText) => setTask(prev => ({ ...prev, description: enhancedText }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={task.status}
                onValueChange={(value) => setTask(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={task.priority}
                onValueChange={(value) => setTask(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Due Date</label>
            <Input
              type="date"
              value={task.due_date}
              onChange={(e) => setTask(prev => ({ ...prev, due_date: e.target.value }))}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 