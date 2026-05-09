"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPatientSession } from "@/lib/api";

export default function StartSessionButton({ patientId }: { patientId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleStartSession = async () => {
    try {
      setIsLoading(true);
      const session = await createPatientSession(patientId);
      router.push(`/patients/${patientId}/sessions/${session.id}`);
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
