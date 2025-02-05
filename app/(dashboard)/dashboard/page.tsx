'use client'

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils";
import { useSidebar } from "@/lib/hooks/use-sidebar";

interface Project {
  id: string
  name: string
  description: string
  progress: number
  color: string
  project_members: Array<{
    user_id: string
    role: string
  }>
  tasks_count: number
}

interface Task {
  id: string
  title: string
  description: string
  project_id: string
  status: string
  projects?: { name: string }
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [userName, setUserName] = useState('')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const { isCollapsed } = useSidebar();
  
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }
        
        await Promise.all([
          fetchUserData(),
          fetchProjects(),
          fetchTasks()
        ])
      } catch (error) {
        console.error('Session initialization error:', error)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()
  }, [router])

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single()
      
      if (userData) {
        setUserName(userData.full_name || user.email?.split('@')[0] || 'User')
      }
    }
  }

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_members!inner (
          user_id,
          role
        ),
        tasks (count)
      `)
      .or(`project_members.user_id.eq.${user.id},created_by.eq.${user.id}`)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching projects:', error)
      return
    }

    if (data) {
      const formattedProjects = data.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        progress: project.progress || 0,
        color: project.color || 'bg-blue-500',
        project_members: project.project_members,
        tasks_count: project.tasks?.[0]?.count || 0
      }))
      setProjects(formattedProjects)
    }
  }

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        projects (
          name
        )
      `)
      .eq('status', 'todo')
      .eq('assignee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3)
    
    if (data && !error) {
      setTasks(data)
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Hello, {userName}</h1>
            <p className="text-muted-foreground">Today is {today}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="search"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 rounded-full bg-muted/50 border-none focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
            <Button className="w-full sm:w-auto rounded-full bg-[#1C1B1F] text-white hover:bg-[#2C2B2F]">
              Add New Project
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="p-6 project-card border-none">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="font-semibold text-lg mb-1">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {project.description}
                  </p>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span>{project.tasks_count} tasks</span>
                    <span className="mx-2">·</span>
                    <span>{project.progress}% complete</span>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {project.project_members.map((member, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white bg-muted flex items-center justify-center text-xs font-medium"
                      title={member.role}
                    >
                      {member.role[0].toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${project.color}`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 border-none">
            <h2 className="text-lg font-semibold mb-4">Your Tasks</h2>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="w-1 h-12 rounded-full bg-blue-500" />
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                      <span className="ml-2 text-xs opacity-60">
                        in {task.projects?.name}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No pending tasks
                </p>
              )}
            </div>
          </Card>

          <Card className="p-6 border-none">
            <h2 className="text-lg font-semibold mb-4">Statistics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-semibold">{tasks.length}</p>
                <p className="text-sm text-muted-foreground">Pending tasks</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{projects.length}</p>
                <p className="text-sm text-muted-foreground">Active projects</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {Math.round(projects.reduce((acc, project) => acc + project.progress, 0) / Math.max(projects.length, 1))}%
                </p>
                <p className="text-sm text-muted-foreground">Avg. progress</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}