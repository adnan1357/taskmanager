"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { toast } from "sonner";
import { Clock, ArrowLeft, Check, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function JoinProjectPage({ params }: { params: { projectId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [projectDescription, setProjectDescription] = useState<string>('');
  const [creatorName, setCreatorName] = useState<string>('');
  const [invite, setInvite] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!searchParams) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid invitation token');
      setLoading(false);
      return;
    }

    const validateInvite = async () => {
      try {
        console.log('Validating invite with token:', token, 'for project:', params.projectId);
        
        // Check if the user is logged in
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Auth error:', userError);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        
        if (!user) {
          console.log('No user found, showing login prompt');
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);
        console.log('Authenticated user:', user.id);

        // First, check if the invite exists
        const { data: inviteData, error: inviteError } = await supabase
          .from('project_invites')
          .select('*')
          .eq('token', token)
          .single();

        if (inviteError) {
          console.error('Invite fetch error:', inviteError);
          throw new Error('Invalid or expired invitation');
        }

        console.log('Found invite:', inviteData);
        setInvite(inviteData);

        // Check if invite is expired
        if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
          throw new Error('This invitation has expired');
        }

        // Now get project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select(`
            name, 
            description,
            created_by,
            created_at
          `)
          .eq('id', inviteData.project_id)
          .single();

        if (projectError) {
          console.error('Project fetch error:', projectError);
          throw new Error('Error fetching project details');
        }

        setProjectName(projectData.name);
        setProjectDescription(projectData.description || '');
        
        // Get creator's name in a separate query if needed
        if (projectData.created_by) {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', projectData.created_by)
            .single();
            
          setCreatorName(userData?.full_name || 'A team member');
        } else {
          setCreatorName('A team member');
        }
        
        console.log('Project name:', projectData.name);

        // Check if user is already a member
        const { data: existingMember, error: memberError } = await supabase
          .from('project_members')
          .select('*')
          .eq('project_id', inviteData.project_id)
          .eq('user_id', user.id)
          .single();

        if (!memberError && existingMember) {
          console.log('User is already a member, redirecting to project');
          toast.success(`You are already a member of ${projectData.name}`);
          router.push(`/projects/${inviteData.project_id}`);
          return;
        }

        // Set loading to false once validation is complete
        setLoading(false);
        setProject(projectData);
      } catch (err) {
        console.error('Detailed error validating invite:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        toast.error(err instanceof Error ? err.message : 'Failed to validate project invitation');
        setLoading(false);
      }
    };

    validateInvite();
  }, [searchParams, router, supabase, params.projectId]);

  const handleAcceptInvite = async () => {
    try {
      setIsConfirming(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }

      // Add user to project members
      const { error: addError } = await supabase
        .from('project_members')
        .insert({
          project_id: invite.project_id,
          user_id: user.id,
          role: 'member' // Default role for invited members
        });

      if (addError) {
        console.error('Error adding member:', addError);
        throw new Error('Failed to join project');
      }

      console.log('Successfully added user to project');

      // Add activity
      await supabase.from('activities').insert({
        project_id: invite.project_id,
        user_id: user.id,
        type: 'member_join',
        description: 'joined the project'
      });

      toast.success(`Successfully joined ${projectName}`);
      router.push(`/projects/${invite.project_id}`);
    } catch (err) {
      console.error('Error accepting invite:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error(err instanceof Error ? err.message : 'Failed to join project');
      setIsConfirming(false);
    }
  };

  const handleDeclineInvite = () => {
    router.push('/projects');
    toast.info('Invitation declined');
  };

  const handleRedirectToLogin = () => {
    router.push(`/login?redirect=/join/${params.projectId}?token=${searchParams?.get('token')}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-purple-500 to-purple-600">
        <Card className="p-8 w-full max-w-md shadow-lg">
          <div className="text-center space-y-4">
            <Clock className="mx-auto h-12 w-12 text-primary animate-pulse" />
            <h2 className="text-2xl font-semibold">Processing Invitation</h2>
            <p className="text-muted-foreground">Please wait while we process your invitation...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-purple-500 to-purple-600">
        <Card className="p-8 w-full max-w-md shadow-lg">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-destructive">Invitation Error</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => router.push('/projects')} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-purple-500 to-purple-600">
        <Card className="p-8 w-full max-w-md shadow-lg">
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-semibold">Project Invitation</h2>
            <p className="text-muted-foreground">
              You need to sign in to accept this project invitation.
            </p>
            <Button onClick={handleRedirectToLogin} className="mt-4">
              Sign in to continue
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-purple-500 to-purple-600">
      <Card className="p-8 w-full max-w-md shadow-lg">
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-semibold">Project Invitation</h2>
          
          <div className="mx-auto max-w-2xl">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg transition-all hover:shadow-xl">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80 z-10"></div>
                <div className="h-40 w-full bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                <div className="absolute bottom-4 left-4 z-20">
                  <h1 className="text-3xl font-bold text-white">{projectName}</h1>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Project Description</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {projectDescription || "No description provided."}
                  </p>
                </div>
                
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Invitation</h2>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">{creatorName}</span> has invited you to join this project.
                  </p>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Project Owner</p>
                    <div className="flex items-center">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarFallback>{creatorName.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <span>{creatorName}</span>
                    </div>
                  </div>
                  {project?.created_at && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Created On</p>
                      <p>{new Date(project.created_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-4 border-t border-border">
                  <Button 
                    onClick={handleDeclineInvite} 
                    variant="outline"
                    className="flex items-center transition-all duration-300 hover:scale-105 hover:shadow-md"
                    disabled={isConfirming}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                  <Button 
                    onClick={handleAcceptInvite} 
                    className="flex items-center bg-purple-600 hover:bg-purple-700 transition-all duration-300 hover:scale-105 hover:shadow-md"
                    disabled={isConfirming}
                  >
                    {isConfirming ? (
                      <>
                        <span className="animate-pulse">Processing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Accept Invitation
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
} 