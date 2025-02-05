"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "sonner";

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  projectId: string;
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
        assignee_id: task.assignee_id || user.id,
        due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
        created_by: user.id
      };

      const { error } = await supabase
        .from('tasks')
        .insert(taskData);

      if (error) throw error;

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
            <Textarea
              value={task.description}
              onChange={(e) => setTask(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Task description"
            />
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