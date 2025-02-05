"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

interface ProjectMember {
  user_id: string;
  role: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

export function ProjectMembersSidebar({ projectId }: { projectId: string }) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchMembers = async () => {
      const { data: membersData } = await supabase
        .from('project_members')
        .select(`
          user_id,
          role,
          profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId);

      setMembers(membersData || []);
    };

    fetchMembers();
  }, [projectId, supabase]);

  return (
    <div className="w-64 fixed right-0 top-16 bottom-0 border-l bg-background p-4 overflow-y-auto">
      <h2 className="font-semibold mb-4">Project Members</h2>
      <div className="space-y-2">
        {members.map((member) => (
          <Card key={member.user_id} className="p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.profiles.avatar_url} />
                <AvatarFallback>{member.profiles.full_name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{member.profiles.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 