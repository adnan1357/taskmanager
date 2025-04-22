"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Clock } from "lucide-react"; // Import the clock icon

export default function JoinPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-500 to-purple-500">
      <Card className="w-[400px] p-6 space-y-6">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <Clock className="h-12 w-12 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold">Invalid Invite Link</h1>
          <p className="text-muted-foreground">
            Oops! This invite link appears to be invalid or may have expired.
            Please request a new invite from your project administrator.
          </p>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/">Return Home</Link>
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-purple-600 hover:text-purple-500">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
} 