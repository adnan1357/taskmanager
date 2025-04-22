"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useToast } from "@/components/ui/use-toast";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notifications, setNotifications] = useState(true);
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        
        // Fetch additional user data from the users table
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, notifications_enabled')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setName(userData.full_name || user.email?.split('@')[0] || 'User');
          setNotifications(userData.notifications_enabled ?? true);
        }
      }
    };

    fetchUserData();
  }, [supabase]);

  const handleNotificationChange = async (checked: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('users')
        .update({ 
          notifications_enabled: checked 
        })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error updating notification settings:', error);
        toast({
          title: "Error",
          description: "Failed to update notification settings",
          variant: "destructive"
        });
        // Revert the toggle if update failed
        setNotifications(!checked);
      } else {
        setNotifications(checked);
        toast({
          title: "Success",
          description: "Notification settings updated"
        });
      }
    }
  };

  return (
    <div className="pt-20 px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                View your profile information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  readOnly
                  disabled
                  placeholder="Your name"
                />
                <p className="text-sm text-muted-foreground">
                  Name cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  placeholder="Enter your email"
                />
                <p className="text-sm text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage your notification settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications about your tasks and projects.
                  </p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={handleNotificationChange}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 