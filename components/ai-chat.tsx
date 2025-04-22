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

    return projects;
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating task status:', error);
      return false;
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
        // Get all available projects to show in error message
        const { data: availableProjects } = await supabase
          .from('projects')
          .select('name')
          .in('id', projectIds)
          .order('name');
        
        const projectList = availableProjects?.map(p => `"${p.name}"`).join(', ');
        console.log('Project not found or error:', { projectError });
        return `I couldn't find a project named "${projectName}". Your available projects are: ${projectList}. Please try again with one of these project names.`;
      }

      // If multiple matches, use the closest match
      const project = projects.sort((a, b) => 
        Math.abs(a.name.length - projectName.length) - Math.abs(b.name.length - projectName.length)
      )[0];

      console.log('Found project:', project);

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
            created_by: user.id
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
      console.error('Error creating task:', error);
      return `Sorry, I encountered an error while creating the task.`;
    }
  };

  const handleStatusUpdate = async (taskTitle: string, newStatus: string) => {
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

      // Find the task by title in user's projects
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, status, project_id')
        .in('project_id', projectIds)
        .ilike('title', taskTitle);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        return `Sorry, I encountered an error while looking for the task.`;
      }

      if (!tasks?.length) {
        return `I couldn't find a task with the title "${taskTitle}" in your projects.`;
      }

      // If multiple tasks found, use the most recent one
      const task = tasks[0];
      console.log('Found task to update:', task);

      // Map natural language status terms to valid statuses
      const statusMap: { [key: string]: string } = {
        'todo': 'todo',
        'to do': 'todo',
        'not started': 'todo',
        'new': 'todo',
        'in progress': 'in_progress',
        'in-progress': 'in_progress',
        'working': 'in_progress',
        'started': 'in_progress',
        'done': 'done',
        'completed': 'done',
        'complete': 'done',
        'finished': 'done',
        'closed': 'done'
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
        /(?:add|create)\s+['"]?(.+?)['"]?\s+(?:to|in)\s+(?:the\s+)?['"]?(.+?)(?:\s+project)?['"]?(?:\s+with\s+(.+))?$/i
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
12. Consider recent activity updates when providing context-aware responses`;

      // Improve status update detection
      const statusUpdatePatterns = [
        // Pattern for "mark [task] as [status]"
        /(?:mark|set|change|update)\s+(?:the\s+)?(?:task\s+)?['"]?(.+?)['"]?\s+(?:as|to)\s+(.+)/i,
        // Pattern for "mark as [status]"
        /(?:mark|set|change|update)\s+(?:as|to)\s+(.+)/i,
        // Pattern for "complete [task]"
        /(?:complete|finish|done with)\s+(?:the\s+)?(?:task\s+)?['"]?(.+?)['"]?/i,
        // Pattern for "mark [task] complete"
        /(?:mark|set)\s+(?:the\s+)?(?:task\s+)?['"]?(.+?)['"]?\s+(?:as\s+)?(?:complete|done)/i
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
        const response = await handleStatusUpdate(taskTitle, newStatus);
        
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