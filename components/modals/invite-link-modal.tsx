"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface InviteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  generateInviteLink: () => Promise<string | null>;
}

export function InviteLinkModal({ isOpen, onClose, projectId, generateInviteLink }: InviteLinkModalProps) {
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      generateInviteLink().then(link => {
        if (link) setInviteLink(link);
      });
    }
  }, [isOpen, generateInviteLink]);

  const handleGenerateLink = async () => {
    try {
      setLoading(true);
      
      // First verify user is a member of the project
      const { data: memberData, error: memberError } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (memberError || !memberData) {
        throw new Error('You do not have permission to create invite links');
      }

      // Generate a unique token
      const token = crypto.randomUUID();
      
      // Set expiry to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create the invite record
      const { data: inviteData, error: inviteError } = await supabase
        .from('project_invites')
        .insert({
          project_id: projectId,
          token: token,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (inviteError) {
        console.error('Database error:', inviteError);
        throw new Error('Failed to create invite link');
      }

      // Generate the full invite URL
      const inviteUrl = `${window.location.origin}/join/${projectId}?token=${token}`;
      setInviteLink(inviteUrl);
      toast({
        title: "Success",
        description: "Invite link generated successfully"
      });
      
    } catch (error) {
      console.error('Error generating invite link:', error);
      toast({
        title: "Error",
        description: "Failed to generate invite link",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Success",
        description: "Invite link copied to clipboard"
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Success",
        description: "Invite link copied to clipboard"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Link</DialogTitle>
          <DialogDescription>
            Share this link to invite people to your project
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            value={inviteLink || ''}
            readOnly
            className="flex-1"
          />
          <Button onClick={copyToClipboard}>
            Copy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}