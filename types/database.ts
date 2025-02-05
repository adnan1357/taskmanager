export interface Project {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  tasks: number;
  progress: number;
  color: string;
  members: number;
  due_date: string;
} 