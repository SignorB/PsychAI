"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function RevealOverlay({ children }: { children: React.ReactNode }) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className="relative flex-1 flex flex-col h-full w-full">
      <div 
        className={cn(
          "flex-1 flex flex-col transition-all duration-700 ease-in-out", 
          !isRevealed && "blur-[5px] opacity-40 select-none pointer-events-none"
        )}
      >
        {children}
      </div>
      
      {!isRevealed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Button 
            onClick={() => setIsRevealed(true)} 
            className="gap-2.5 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all rounded-full px-6 bg-clinical-brand text-white font-medium"
          >
            <Sparkles className="h-4 w-4" strokeWidth={2} />
            Generate Recap
          </Button>
        </div>
      )}
    </div>
  );
}
