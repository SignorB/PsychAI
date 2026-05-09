"use client";

import { useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPatientSession } from "@/lib/api";

export default function StartSessionButton({ patientId }: { patientId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartSession = async () => {
    try {
      setIsLoading(true);
      await createPatientSession(patientId);
      // In a real app you might use a toast library like sonner or react-hot-toast
      // For now we'll use an alert as a simple success toast
      alert("Session started successfully!");
      // Here you might redirect to a session active page
    } catch (error) {
      console.error("Failed to start session:", error);
      alert("Failed to start session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleStartSession} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Mic className="h-4 w-4 mr-2" />
      )}
      {isLoading ? "Starting..." : "Start session"}
    </Button>
  );
}
