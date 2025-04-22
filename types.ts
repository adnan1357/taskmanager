export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  assignee_id: string | null;
  assignee: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  project_id: string;
}
