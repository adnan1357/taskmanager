"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "sonner";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  project_id: string;
}

interface AIChat {
  className?: string;
}

export function AIChat({ className }: AIChat) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  const fetchProjectsAndTasks = async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // First get all projects where user is a member
    const { data: projectMemberships, error: membershipError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    if (membershipError) {
      console.error('Error fetching project memberships:', membershipError);
      return null;
    }

    if (!projectMemberships?.length) return null;

    const projectIds = projectMemberships.map(pm => pm.project_id);

    // Get projects and their tasks
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        tasks (
          id,
          title,
          description,
          status,
          priority,
          due_date
        )
      `)
      .in('id', projectIds);

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return null;
    }

    // For each task, fetch related comments and updates
    const enhancedProjects = await Promise.all(projects.map(async (project) => {
      if (!project.tasks || project.tasks.length === 0) {
        return project;
      }
      
      const taskIds = project.tasks.map((task: any) => task.id);
      
      // Fetch all task comments and updates from activities table
      const { data: taskActivities, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          id,
          description,
          created_at,
          type,
          task_id,
          user_id,
          profiles:profiles!activities_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .in('task_id', taskIds)
        .in('type', ['task_update', 'comment'])
        .order('created_at', { ascending: false });
      
      if (activitiesError) {
        console.error('Error fetching task activities:', activitiesError);
        return project;
      }
      
      // Group activities by task
      const activitiesByTask: Record<string, any[]> = {};
      taskActivities?.forEach(activity => {
        if (!activitiesByTask[activity.task_id]) {
          activitiesByTask[activity.task_id] = [];
        }
        activitiesByTask[activity.task_id].push({
          id: activity.id,
          description: activity.description,
          created_at: activity.created_at,
          type: activity.type,
          user: activity.profiles && Array.isArray(activity.profiles) && activity.profiles.length > 0 
            ? {
                name: activity.profiles[0].full_name,
                avatar: activity.profiles[0].avatar_url
              } 
            : { name: 'Unknown', avatar: null }
        });
      });
      
      // Enhance tasks with their activities
      const enhancedTasks = project.tasks.map((task: any) => ({
        ...task,
        comments: activitiesByTask[task.id] || []
      }));
      
      return {
        ...project,
        tasks: enhancedTasks
      };
    }));

    return enhancedProjects;
  };

  const updateTaskStatus = async (taskTitle: string, newStatus: string) => {
    try {
      console.log('Updating task status:', { taskTitle, newStatus });
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return `Sorry, I couldn't verify your user account. Please try signing out and back in.`;
      }

      // First get all projects where user is a member
      const { data: projectMemberships, error: membershipError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      if (membershipError) {
        console.error('Error fetching project memberships:', membershipError);
        return `Sorry, I encountered an error while checking your project access.`;
      }

      if (!projectMemberships?.length) {
        return `You don't have access to any projects. Please join a project first.`;
      }

      const projectIds = projectMemberships.map(pm => pm.project_id);

      // First try exact match for the task
      const { data: exactTasks, error: exactTasksError } = await supabase
        .from('tasks')
        .select('id, title, status, project_id')
        .in('project_id', projectIds)
        .eq('title', taskTitle);
        
      if (exactTasksError) {
        console.error('Error fetching tasks:', exactTasksError);
        return `Sorry, I encountered an error while looking for the task.`;
      }
      
      // Then try ilike match if no exact match found
      let tasks = exactTasks;
      if (!tasks?.length) {
        const { data: ilikeTasks, error: ilikeTasksError } = await supabase
          .from('tasks')
          .select('id, title, status, project_id')
          .in('project_id', projectIds)
          .ilike('title', `%${taskTitle}%`);
          
        if (ilikeTasksError) {
          console.error('Error fetching tasks with ilike:', ilikeTasksError);
          return `Sorry, I encountered an error while looking for the task.`;
        }
        
        tasks = ilikeTasks;
      }

      if (!tasks?.length) {
        // Try with more flexible matching
        const { data: allTasks, error: allTasksError } = await supabase
          .from('tasks')
          .select('id, title, status, project_id')
          .in('project_id', projectIds);
          
        if (allTasksError) {
          console.error('Error fetching all tasks:', allTasksError);
          return `Sorry, I encountered an error while looking for the task.`;
        }
        
        // Find the closest match using string similarity
        if (allTasks?.length) {
          // Simple string similarity using Levenshtein distance
          const findClosestMatch = (search: string, options: any[]) => {
            let bestMatch = null;
            let bestScore = Infinity;
            
            for (const option of options) {
              const title = option.title.toLowerCase();
              const searchLower = search.toLowerCase();
              
              // Skip if no overlap at all
              if (!title.includes(searchLower) && !searchLower.includes(title)) {
                // Calculate simple edit distance as fallback
                const distance = Math.abs(title.length - searchLower.length);
                if (distance < bestScore) {
                  bestScore = distance;
                  bestMatch = option;
                }
                continue;
              }
              
              // Prefer exact word matches
              const titleWords = title.split(/\s+/);
              const searchWords = searchLower.split(/\s+/);
              
              let matchCount = 0;
              for (const word of searchWords) {
                if (titleWords.includes(word)) {
                  matchCount++;
                }
              }
              
              // Calculate a score (lower is better)
              const score = (searchWords.length - matchCount) * 10;
              
              if (score < bestScore) {
                bestScore = score;
                bestMatch = option;
              }
            }
            
            // Only return a match if it's reasonably close
            return bestScore < 50 ? bestMatch : null;
          };
          
          const bestMatch = findClosestMatch(taskTitle, allTasks);
          if (bestMatch) {
            tasks = [bestMatch];
            console.log('Found closest matching task:', bestMatch.title);
          }
        }
      }

      if (!tasks?.length) {
        return `I couldn't find a task with a title similar to "${taskTitle}" in your projects.`;
      }

      // Sort by title similarity to the searched title
      tasks.sort((a, b) => {
        const aMatch = a.title.toLowerCase().includes(taskTitle.toLowerCase());
        const bMatch = b.title.toLowerCase().includes(taskTitle.toLowerCase());
        
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });

      // If multiple tasks found, use the most similar one
      const task = tasks[0];
      console.log('Found task to update:', task);

      // Map natural language status terms to valid statuses
      const statusMap: { [key: string]: string } = {
        'todo': 'todo',
        'to do': 'todo',
        'to-do': 'todo',
        'not started': 'todo',
        'new': 'todo',
        'backlog': 'todo',
        'planning': 'todo',
        'in progress': 'in_progress',
        'in-progress': 'in_progress',
        'working': 'in_progress',
        'started': 'in_progress',
        'ongoing': 'in_progress',
        'underway': 'in_progress',
        'processing': 'in_progress',
        'wip': 'in_progress', // work in progress
        'doing': 'in_progress',
        'done': 'done',
        'completed': 'done',
        'complete': 'done',
        'finished': 'done',
        'closed': 'done',
        'resolved': 'done',
        'ready': 'done',
        'finalized': 'done'
      };

      // Normalize the status
      const normalizedStatus = statusMap[newStatus.toLowerCase()];
      
      if (!normalizedStatus) {
        return `Sorry, I couldn't understand the status "${newStatus}". You can use terms like "todo", "in progress", or "done".`;
      }

      // Update the task status
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          status: normalizedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (updateError) {
        console.error('Error updating task:', updateError);
        return `Sorry, I encountered an error while updating the task status.`;
      }

      // Add activity for status update
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          type: 'task_update',
          description: `changed task "${taskTitle}" status to ${normalizedStatus}`,
          project_id: task.project_id,
          task_id: task.id,
          user_id: user.id
        });

      if (activityError) {
        console.error('Error creating activity:', activityError);
      }

      return `I've updated "${taskTitle}" to ${normalizedStatus}.`;
    } catch (error) {
      console.error('Error in handleStatusUpdate:', error);
      return `Sorry, I encountered an error while updating the task status.`;
    }
  };

  const createTask = async (projectName: string, taskTitle: string, description?: string, priority: string = 'medium') => {
    try {
      console.log('Creating task:', { projectName, taskTitle, description, priority });
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting current user:', userError);
        return `Sorry, I couldn't verify your user account. Please try signing out and back in.`;
      }

      // First get all projects where user is a member
      const { data: projectMemberships, error: membershipError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      if (membershipError) {
        console.error('Error fetching project memberships:', membershipError);
        return `Sorry, I encountered an error while checking your project access.`;
      }

      if (!projectMemberships?.length) {
        return `You don't have access to any projects. Please join a project first.`;
      }

      const projectIds = projectMemberships.map(pm => pm.project_id);

      // Find the project with more lenient matching, but only in user's projects
      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds)
        .or(`name.ilike.${projectName},name.ilike.${projectName}%,name.ilike.%${projectName}`);

      console.log('Project search result:', { projects, projectError });

      if (projectError || !projects?.length) {
        // Try more aggressive fuzzy matching
        const { data: allProjects, error: allProjectsError } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);
          
        if (allProjectsError || !allProjects?.length) {
          // If still can't find, get all available projects to show in error message
          const { data: availableProjects } = await supabase
            .from('projects')
            .select('name')
            .in('id', projectIds)
            .order('name');
          
          const projectList = availableProjects?.map(p => `"${p.name}"`).join(', ');
          console.log('Project not found or error:', { projectError });
          return `I couldn't find a project named "${projectName}". Your available projects are: ${projectList}. Please try again with one of these project names.`;
        }
        
        // Find closest match using word similarity
        const findBestProjectMatch = (searchName: string, projectOptions: any[]) => {
          let bestMatch = null;
          let highestScore = 0;
          
          const searchWords = searchName.toLowerCase().split(/\s+/);
          
          for (const project of projectOptions) {
            const projectName = project.name.toLowerCase();
            const projectWords = projectName.split(/\s+/);
            
            // Calculate word overlap
            let matchCount = 0;
            for (const word of searchWords) {
              // Check for word or partial word match
              for (const projectWord of projectWords) {
                if (projectWord.includes(word) || word.includes(projectWord)) {
                  matchCount++;
                  break;
                }
              }
            }
            
            // Calculate a similarity score (0-100)
            const score = (matchCount / searchWords.length) * 100;
            
            if (score > highestScore) {
              highestScore = score;
              bestMatch = project;
            }
          }
          
          // Only return if reasonably confident (40% match or better)
          return highestScore >= 40 ? bestMatch : null;
        };
        
        const bestProjectMatch = findBestProjectMatch(projectName, allProjects);
        if (bestProjectMatch) {
          console.log(`Found best matching project: "${bestProjectMatch.name}" for search "${projectName}"`);
          return await createTaskWithProject(bestProjectMatch, taskTitle, user.id, priority, description);
        } else {
          // If no match found, show available projects
          const projectList = allProjects.map(p => `"${p.name}"`).join(', ');
          return `I couldn't find a project similar to "${projectName}". Your available projects are: ${projectList}. Please try again with one of these project names.`;
        }
      }

      // If multiple matches, use the closest match
      const project = projects.sort((a, b) => 
        Math.abs(a.name.length - projectName.length) - Math.abs(b.name.length - projectName.length)
      )[0];

      console.log('Found project:', project);
      
      return await createTaskWithProject(project, taskTitle, user.id, priority, description);
    } catch (error) {
      console.error('Error creating task:', error);
      return `Sorry, I encountered an error while creating the task.`;
    }
  };

  // Helper function to actually create the task once we've found the project
  const createTaskWithProject = async (
    project: { id: string, name: string }, 
    taskTitle: string, 
    userId: string,
    priority: string = 'medium',
    description?: string
  ) => {
    try {
      // Ensure priority is a valid value
      let validPriority = priority;
      if (!['high', 'medium', 'low'].includes(validPriority)) {
        validPriority = 'medium';
      }

      // Create the task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert([
          {
            title: taskTitle,
            description: description || '',
            status: 'todo',
            project_id: project.id,
            priority: validPriority,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: userId
          }
        ])
        .select()
        .single();

      console.log('Task creation result:', { task, taskError });

      if (taskError) {
        console.error('Task creation error:', taskError);
        throw taskError;
      }

      return `Great! I've added "${taskTitle}" to the ${project.name} project${validPriority !== 'medium' ? ` with ${validPriority} priority` : ''}.`;
    } catch (error) {
      console.error('Error in createTaskWithProject:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    try {
      setIsLoading(true);
      const userMessage = input.trim();
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      setInput('');

      const projects = await fetchProjectsAndTasks();
      if (!projects) {
        toast.error('Failed to fetch project data');
        return;
      }

      // Add task creation patterns
      const createTaskPatterns = [
        // Pattern for "Create a task in [project] called [task]" with optional attributes
        /(?:create|add)\s+(?:a\s+)?(?:new\s+)?task\s+(?:in|to)\s+(?:the\s+)?['"]?(.+?)(?:\s+project)?['"]?\s+(?:called|named|titled)\s+['"]?(.+?)['"]?(?:\s+with\s+(.+))?$/i,
        
        // Pattern for "Create a task called [task] in [project]" with optional attributes
        /(?:create|add)\s+(?:a\s+)?(?:new\s+)?task\s+(?:called|named|titled)\s+['"]?(.+?)['"]?\s+(?:in|to)\s+(?:the\s+)?['"]?(.+?)(?:\s+project)?['"]?(?:\s+with\s+(.+))?$/i,
        
        // Pattern for "Create task [task] in [project]" with optional attributes
        /(?:create|add)\s+(?:a\s+)?(?:new\s+)?task\s+['"]?(.+?)['"]?\s+(?:in|to)\s+(?:the\s+)?['"]?(.+?)(?:\s+project)?['"]?(?:\s+with\s+(.+))?$/i,
        
        // Pattern for "Add [task] to [project]" with optional attributes
        /(?:add|create)\s+['"]?(.+?)['"]?\s+(?:to|in)\s+(?:the\s+)?['"]?(.+?)(?:\s+project)?['"]?(?:\s+with\s+(.+))?$/i,
        
        // Pattern for "I need a new task [task] in [project]"
        /(?:i\s+need|i\s+want|please\s+create|please\s+add)\s+(?:a\s+)?(?:new\s+)?task\s+['"]?(.+?)['"]?\s+(?:in|to|for)\s+(?:the\s+)?['"]?(.+?)(?:\s+project)?['"]?(?:\s+with\s+(.+))?/i,
        
        // Pattern for "Make a task called [task] for [project]"
        /(?:make|create|setup)\s+(?:a\s+)?(?:new\s+)?task\s+(?:called|named|titled)\s+['"]?(.+?)['"]?\s+(?:for|in|to)\s+(?:the\s+)?['"]?(.+?)(?:\s+project)?['"]?(?:\s+with\s+(.+))?/i,
        
        // Pattern for "Can you add [task] to [project]"
        /(?:can\s+you|could\s+you|would\s+you)?\s+(?:please\s+)?(?:add|create)\s+(?:a\s+)?(?:new\s+)?(?:task\s+)?['"]?(.+?)['"]?\s+(?:to|in|for)\s+(?:the\s+)?['"]?(.+?)(?:\s+project)?['"]?(?:\s+with\s+(.+))?/i
      ];

      // Check for task creation request
      let createTaskMatch = null;
      let newTaskTitle = '';
      let newProjectName = '';
      let newDescription = '';
      let priority = 'medium'; // Default priority

      for (const pattern of createTaskPatterns) {
        const match = userMessage.match(pattern);
        if (match) {
          createTaskMatch = match;
          console.log('Task creation pattern match:', { 
            pattern: pattern.toString(), 
            match,
            fullMessage: userMessage 
          });
          
          // Extract task title and project name based on pattern
          if (pattern.toString().includes('called|named|titled')) {
            if (pattern.toString().includes('task\\s+(?:in|to)')) {
              // For patterns like "Create a task in X called Y"
              newProjectName = match[1].replace(/^['"]|['"]$/g, '').trim();
              newTaskTitle = match[2].replace(/^['"]|['"]$/g, '').trim();
            } else {
              // For patterns like "Create a task called X in Y"
              newTaskTitle = match[1].replace(/^['"]|['"]$/g, '').trim();
              newProjectName = match[2].replace(/^['"]|['"]$/g, '').trim();
            }
          } else if (pattern.toString().includes('task\\s+\\[')) {
            // For patterns like "Create task X in Y"
            newTaskTitle = match[1].replace(/^['"]|['"]$/g, '').trim();
            newProjectName = match[2].replace(/^['"]|['"]$/g, '').trim();
          } else {
            // For patterns like "Add X to Y"
            newTaskTitle = match[1].replace(/^['"]|['"]$/g, '').trim();
            newProjectName = match[2].replace(/^['"]|['"]$/g, '').trim();
          }
          
          // Extract additional attributes if present
          if (match[3]) {
            const attributesText = match[3].toLowerCase();
            
            // Extract priority
            const priorityMatch = attributesText.match(/(high|medium|low)\s+priority/i);
            if (priorityMatch) {
              priority = priorityMatch[1].toLowerCase();
            }
            
            // Extract description (anything that's not priority)
            const descParts = attributesText.split(/(?:high|medium|low)\s+priority/).filter(Boolean);
            if (descParts.length) {
              newDescription = descParts.join(' ').trim();
            }
          }
          
          console.log('Extracted task creation values:', { 
            newTaskTitle, 
            newProjectName,
            priority,
            newDescription,
            patternUsed: pattern.toString()
          });
          break;
        }
      }

      if (createTaskMatch && newTaskTitle && newProjectName) {
        console.log('Task creation request detected:', { 
          newTaskTitle, 
          newProjectName,
          priority,
          newDescription,
          fullMessage: userMessage
        });
        const response = await createTask(newProjectName, newTaskTitle, newDescription, priority);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response 
        }]);
        
        // Refresh projects data after task creation
        await fetchProjectsAndTasks();
        return;
      }

      const context = JSON.stringify(projects, null, 2);
      
      // Format message history for context
      const messageHistory = messages
        .slice(-5) // Get last 5 messages for context
        .join('\n');

      // Get recent activities for context
      const { data: recentActivities } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Format activities for context
      const activitiesContext = recentActivities
        ?.map(activity => `${activity.type}: ${activity.description} (${formatDistanceToNow(new Date(activity.created_at))} ago)`)
        .join('\n') || 'No recent activities';

      const prompt = `You are a friendly and helpful project management assistant. Here's the current state of projects and tasks:

${context}

Recent activities:
${activitiesContext}

Recent conversation history:
${messageHistory}

Current user question: ${userMessage}

Guidelines for your response:
1. Be friendly and conversational, but concise
2. Use natural, casual language
3. Format dates in a natural way (e.g., "due next Friday" or "due in 2 days")
4. If you see a request to update a task status, even if it's misspelled (like "tasl"), try to understand the intent
5. Recognize variations of status updates like "mark as done", "complete", "finish", etc.
6. For task creation, suggest using formats like:
   - "add task 'task name' to 'project name'"
   - "create task 'task name' in 'project name' with description 'description'"
7. Keep responses to 1-2 short sentences
8. Don't be overly formal or robotic
9. Maintain context from previous messages to understand follow-up questions
10. If a task or project was mentioned in previous messages, use that context for follow-up questions
11. Reference project descriptions and task details when relevant to the conversation
12. Consider recent activity updates when providing context-aware responses
13. Include task descriptions and comments in your responses when they're relevant to the user's question
14. When asked about a specific task, include its description and any recent comments
15. Only provide information about tasks from projects the user is a member of
16. If a user asks about task context, include both the task description and any comments or updates`;

      // Improve status update detection
      const statusUpdatePatterns = [
        // Pattern for "mark [task] as [status]"
        /(?:mark|set|change|update)\s+(?:the\s+)?(?:task\s+)?['"]?(.+?)['"]?\s+(?:as|to)\s+(.+)/i,
        
        // Pattern for "mark as [status]"
        /(?:mark|set|change|update)\s+(?:as|to)\s+(.+)/i,
        
        // Pattern for "complete [task]"
        /(?:complete|finish|done with)\s+(?:the\s+)?(?:task\s+)?['"]?(.+?)['"]?/i,
        
        // Pattern for "mark [task] complete"
        /(?:mark|set)\s+(?:the\s+)?(?:task\s+)?['"]?(.+?)['"]?\s+(?:as\s+)?(?:complete|done)/i,
        
        // Pattern for "move [task] to [status]"
        /(?:move|transition|change)\s+(?:the\s+)?(?:task\s+)?['"]?(.+?)['"]?\s+(?:to|into)\s+(.+)/i,
        
        // Pattern for "update [task] status to [status]"
        /(?:update|change|set)\s+(?:the\s+)?(?:status\s+(?:of\s+)?)?(?:task\s+)?['"]?(.+?)['"]?\s+(?:to|as)\s+(.+)/i,
        
        // Pattern for "can you mark [task] as [status]"
        /(?:can\s+you|could\s+you|would\s+you)?\s+(?:please\s+)?(?:mark|set|change)\s+(?:the\s+)?(?:task\s+)?['"]?(.+?)['"]?\s+(?:as|to)\s+(.+)/i,
        
        // Pattern for "I want to move [task] to [status]"
        /(?:i\s+want\s+to|i\s+need\s+to|please)\s+(?:move|change|update|mark)\s+(?:the\s+)?(?:task\s+)?['"]?(.+?)['"]?\s+(?:to|as)\s+(.+)/i
      ];

      // Check all patterns for a status update request
      let statusMatch = null;
      let taskTitle = '';
      let newStatus = '';

      for (const pattern of statusUpdatePatterns) {
        const match = userMessage.match(pattern);
        if (match) {
          statusMatch = match;
          console.log('Status update pattern match:', { pattern: pattern.toString(), match });
          
          // Extract task title and status based on pattern
          if (pattern.toString().includes('\\s+(?:as|to)\\s+')) {
            // For patterns like "mark [task] as [status]"
            taskTitle = match[1].replace(/^['"]|['"]$/g, '').trim();
            newStatus = match[2].toLowerCase();
          } else if (pattern.toString().includes('(?:complete|finish|done)')) {
            // For patterns like "complete [task]"
            taskTitle = match[1].replace(/^['"]|['"]$/g, '').trim();
            newStatus = 'done';
          } else if (pattern.toString().includes('\\s+(?:as|to)\\s+')) {
            // For patterns like "mark as [status]"
            newStatus = match[1].toLowerCase();
            // Get task title from previous message
            const prevMessage = messages[messages.length - 2];
            if (prevMessage && prevMessage.role === 'user') {
              const taskMatch = prevMessage.content.match(/(?:task|write|create)\s+['"]?(.+?)['"]?/i);
              if (taskMatch) {
                taskTitle = taskMatch[1].replace(/^['"]|['"]$/g, '').trim();
              }
            }
          }
          
          console.log('Extracted status update:', { taskTitle, newStatus });
          break;
        }
      }

      if (statusMatch && taskTitle) {
        console.log('Status update request detected:', { taskTitle, newStatus });
        const response = await updateTaskStatus(taskTitle, newStatus);
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response 
        }]);
        
        // Refresh projects data after status update
        await fetchProjectsAndTasks();
        return;
      }

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key is not configured');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
        }
      });

      console.log('Sending request to Gemini API...');
      const result = await model.generateContent(prompt);
      console.log('Received response from Gemini API');
      
      const response = await result.response;
      const aiMessage = response.text();

      setMessages(prev => [...prev, { role: 'assistant', content: aiMessage }]);
      toast.success('Response generated successfully');
    } catch (error: any) {
      console.error('Error details:', error);
      toast.error(error.message || 'Failed to get response');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again or rephrase your question.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-2.5 rounded-lg text-sm ${
              message.role === 'user'
                ? 'bg-primary text-primary-foreground ml-6'
                : 'bg-muted mr-6'
            }`}
          >
            {message.content}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground p-4 text-sm">
            Hi! I'm your AI assistant. Ask me about your projects and tasks, or update task status.
          </div>
        )}
      </div>
      <div className="p-3 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 resize-none min-h-[40px] max-h-[120px] py-2"
            rows={1}
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()}
            className="h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}