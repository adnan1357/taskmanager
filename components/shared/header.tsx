import { Button } from "@/components/ui/button";
import { CheckSquare } from "lucide-react";
import Image from "next/image";

export function Header() {
  return (
    <header className="bg-background/80 backdrop-blur-sm border-b fixed top-0 right-0 left-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-primary" />
          <span className="font-semibold">TaskMaster</span>
        </div>
      </div>
    </header>
  );
}