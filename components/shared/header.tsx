import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import Image from "next/image";

export function Header() {
  return (
    <header className="bg-background/80 backdrop-blur-sm border-b fixed top-0 right-0 left-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded"></div>
          <span className="font-semibold">Chaart</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="h-5 w-5" />
          </Button>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm">Calendar</span>
          </div>
        </div>
      </div>
    </header>
  );
}