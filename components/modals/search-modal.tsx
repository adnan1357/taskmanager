"use client";

import { useState, useEffect, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: 'task' | 'project';
  id: string;
  title: string;
  description: string | null | undefined;
  project_name?: string;
  color?: string;
}

interface TaskResult {
  id: string;
  title: string;
  description: string | null;
  projects: {
    name: string;
    color: string;
  };
}

interface ProjectResult {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface DatabaseTaskResult {
  id: string;
  title: string;
  description: string | null;
  projects: {
    name: string;
    color: string;
  }[];
}

interface DatabaseProjectResult {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

export function SearchDropdown({
  isOpen,
  onClose,
  searchQuery
}: {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
}) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function performSearch() {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user's project memberships
        const { data: projectMemberships } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id);

        const projectIds = projectMemberships?.map(pm => pm.project_id) || [];

        // Search projects
        const { data: projectResults } = await supabase
          .from('projects')
          .select('id, name, description, color')
          .in('id', projectIds)
          .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .limit(5);

        // Search tasks
        const { data: taskResults } = await supabase
          .from('tasks')
          .select(`
            id,
            title,
            description,
            projects (
              name,
              color
            )
          `)
          .in('project_id', projectIds)
          .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .limit(5);

        const formattedProjectResults = (projectResults as DatabaseProjectResult[] || []).map(project => ({
          type: 'project' as const,
          id: project.id,
          title: project.name,
          description: project.description,
          color: project.color
        }));

        const formattedTaskResults = (taskResults as unknown as DatabaseTaskResult[] || []).map(task => ({
          type: 'task' as const,
          id: task.id,
          title: task.title,
          description: task.description,
          project_name: task.projects[0]?.name,
          color: task.projects[0]?.color
        }));

        setResults([...formattedProjectResults, ...formattedTaskResults]);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [searchQuery, supabase]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'project') {
      router.push(`/projects/${result.id}`);
    } else {
      router.push(`/tasks?taskId=${result.id}`);
    }
    onClose();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!isOpen || !searchQuery) return null;

  return (
    <div 
      ref={dropdownRef}
      className={cn(
        "absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border z-50",
        "max-h-[300px] overflow-y-auto"
      )}
    >
      {loading ? (
        <div className="text-center py-4">Searching...</div>
      ) : (
        <div className="p-2">
          {results.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              className="p-2 rounded-md hover:bg-accent cursor-pointer"
              onClick={() => handleResultClick(result)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: result.color }}
                />
                <span className="font-medium">{result.title}</span>
                <span className="text-xs text-muted-foreground">
                  ({result.type})
                </span>
              </div>
              {result.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {result.description}
                </p>
              )}
              {result.project_name && (
                <p className="text-xs text-muted-foreground mt-1">
                  in {result.project_name}
                </p>
              )}
            </div>
          ))}
          {results.length === 0 && (
            <div className="text-center py-2 text-sm text-muted-foreground">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
} 