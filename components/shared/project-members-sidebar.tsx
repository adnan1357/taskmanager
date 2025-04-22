"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUIState } from "@/lib/hooks/use-ui-state";

interface ProjectMember {
  role: 'owner' | 'member' | 'viewer';
  created_at: string;
  user_id: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface SupabaseMember {
  role: string;
  created_at: string;
  user_id: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  }
}

export function ProjectMembersSidebar({ projectId }: { projectId: string }) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'member' | 'viewer' | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const supabase = createClientComponentClient();
  const { isMembersSidebarExpanded, expandMembersSidebar, collapseMembersSidebar } = useUIState();

  useEffect(() => {
    if (isHovered) {
      expandMembersSidebar();
    } else {
      collapseMembersSidebar();
    }
  }, [isHovered, expandMembersSidebar, collapseMembersSidebar]);

  const fetchMembers = async () => {
    try {
      const { data: membersData, error } = await supabase
        .from('project_members')
        .select(`
          role,
          created_at,
          user_id,
          user:users (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .returns<{
          role: 'owner' | 'member' | 'viewer';
          created_at: string;
          user_id: string;
          user: {
            id: string;
            full_name: string;
            avatar_url: string | null;
          };
        }[]>();

      if (error) throw error;

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const transformedMembers = membersData.map(member => {
        if (member.user_id === currentUser?.id) {
          setCurrentUserRole(member.role);
        }

        return {
          role: member.role,
          created_at: member.created_at,
          user_id: member.user_id,
          user: {
            id: member.user.id,
            full_name: member.user.full_name,
            avatar_url: member.user.avatar_url
          }
        };
      });

      setMembers(transformedMembers);
    } catch (error) {
      console.error('Error fetching project members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [projectId]);

  const generateInviteLink = async () => {
    try {
      setGenerating(true);
      
      // Generate a random token
      const token = crypto.randomUUID();
      
      // Calculate expiry date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      // Save the invite to the database
      const { error } = await supabase
        .from('project_invites')
        .insert({
          project_id: projectId,
          token: token,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      // Generate the full invite link
      const link = `${window.location.origin}/join/${projectId}?token=${token}`;
      setInviteLink(link);
      
    } catch (error) {
      console.error('Error generating invite link:', error);
      toast.error("Failed to generate invite link");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteLink) return;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'owner' | 'member' | 'viewer') => {
    try {
      if (currentUserRole !== 'owner') {
        toast.error("Only owners can change member roles");
        return;
      }

      // First check if this is the last owner
      if (newRole !== 'owner') {
        const { data: owners, error: ownersError } = await supabase
          .from('project_members')
          .select('user_id')
          .eq('project_id', projectId)
          .eq('role', 'owner');

        if (ownersError) throw ownersError;

        if (owners.length === 1 && owners[0].user_id === memberId) {
          toast.error("Cannot remove the last owner");
          return;
        }
      }

      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('project_id', projectId)
        .eq('user_id', memberId);

      if (error) throw error;

      await fetchMembers();
      toast.success("Member role updated successfully");
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error("Failed to update member role");
    }
  };

  if (loading) {
    return <div className="p-4">Loading members...</div>;
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div 
        className={cn(
          "fixed right-0 top-0 h-screen border-l bg-background pt-16 transition-all duration-300",
          isHovered || isDropdownOpen ? "w-64" : "w-16",
          "hover:shadow-lg"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => !isDropdownOpen && setIsHovered(false)}
      >
        <div className={cn(
          "h-full p-4 space-y-6",
          isHovered ? "opacity-100" : "opacity-0",
          "transition-opacity duration-300"
        )}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Project Members</h2>
            <span className="text-sm text-muted-foreground">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-16rem)]">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-start space-x-4 p-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.user.avatar_url || ''} alt={member.user.full_name || ''} />
                  <AvatarFallback>
                    {member.user.full_name?.split(' ').map(n => n[0]).join('') || '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {member.user.full_name}
                      </p>
                    </div>
                    {currentUserRole === 'owner' ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) => updateMemberRole(member.user_id, value as 'owner' | 'member' | 'viewer')}
                        onOpenChange={(open) => setIsDropdownOpen(open)}
                      >
                        <SelectTrigger className="h-8 w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge 
                        variant="secondary"
                        className={getRoleBadgeColor(member.role)}
                      >
                        {member.role}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined {new Date(member.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {currentUserRole && currentUserRole !== 'viewer' && (
            <div className="absolute bottom-4 left-4 right-4">
              <Button 
                variant="outline"
                onClick={() => setShowInviteModal(true)}
                className="w-full"
              >
                Invite Members
              </Button>
            </div>
          )}
        </div>

        <div className={cn(
          "absolute inset-0 pt-16 px-2 flex flex-col items-center",
          isHovered ? "opacity-0 pointer-events-none" : "opacity-100",
          "transition-opacity duration-300"
        )}>
          <div className="space-y-4 pt-4">
            {members.map((member) => (
              <Avatar key={member.user_id} className="h-10 w-10">
                <AvatarImage src={member.user.avatar_url || ''} alt={member.user.full_name || ''} />
                <AvatarFallback>
                  {member.user.full_name?.split(' ').map(n => n[0]).join('') || '??'}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      </div>

      {currentUserRole && (
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Members</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {!inviteLink ? (
                <Button 
                  onClick={generateInviteLink}
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? "Generating..." : "Generate Invite Link"}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      value={inviteLink}
                      readOnly
                      className="flex-1"
                    />
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={copyToClipboard}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This link will expire in 7 days
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setInviteLink(null)}
                    className="w-full"
                  >
                    Generate New Link
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 