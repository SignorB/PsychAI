"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { generatePreSessionRecap } from "@/lib/api";
import { cn } from "@/lib/utils";

type PatientSummary = {
  id: number;
  name?: string;
  surname?: string;
  condition?: string;
};

type SessionSummary = {
  id: number;
  patient_id: number;
  date: string;
};

type RecapResponse = {
  previous_session_id?: number | null;
  recap?: {
    answer?: string;
    citations?: string[];
  };
};

export function DashboardPreSessionRecap({
  patient,
  session,
  showPatientLink = true,
  className,
}: {
  patient?: PatientSummary | null;
  session?: SessionSummary | null;
  showPatientLink?: boolean;
  className?: string;
}) {
  const [recap, setRecap] = useState<RecapResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!patient || !session) return;
    setIsGenerating(true);
    setError("");
    try {
      const response = await generatePreSessionRecap(String(patient.id), String(session.id));
      setRecap(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate recap");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!patient || !session) {
    return (
      <CardContent className={cn("flex-1 flex items-center justify-center text-sm text-[#848484]", className)}>
        No scheduled session available.
      </CardContent>
    );
  }

  const patientName = [patient.name, patient.surname].filter(Boolean).join(" ") || `Patient ${patient.id}`;
  const answer = recap?.recap?.answer?.trim();
  const previousSessionId = recap?.previous_session_id;
  const isRevealed = Boolean(answer);

  return (
    <CardContent className={cn("flex-1 flex flex-col relative", className)}>
      <div
        className={cn(
          "space-y-6 flex-1 flex flex-col transition-all duration-700 ease-in-out",
          !isRevealed && "blur-[5px] opacity-40 select-none pointer-events-none"
        )}
      >
        {answer ? (
          <>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium mb-2.5">
                Generated recap
              </p>
              <div className="prose prose-sm prose-clinical max-w-none prose-headings:text-clinical-ink prose-headings:font-bold prose-p:leading-relaxed prose-p:text-clinical-ink prose-li:text-clinical-ink text-[14px]">
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="bg-clinical-soft text-clinical-ink font-medium px-3 py-1">
                Patient card
              </Badge>
              {previousSessionId && (
                <Badge variant="default" className="bg-clinical-soft text-clinical-ink font-medium px-3 py-1">
                  Last session #{previousSessionId}
                </Badge>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium mb-2.5">
                Input sources
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="bg-clinical-soft text-clinical-ink font-medium px-3 py-1">
                  Patient card
                </Badge>
                <Badge variant="default" className="bg-clinical-soft text-clinical-ink font-medium px-3 py-1">
                  Last clinical note
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium mb-2.5">
                Patient
              </p>
              <div className="flex items-start gap-2.5 text-[14px] text-clinical-ink">
                <CheckCircle2 className="h-4 w-4 text-[#848484] mt-0.5 shrink-0" strokeWidth={1.75} />
                <span>{patientName}</span>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium mb-2.5">
                Focus
              </p>
              <div className="flex items-start gap-2.5 text-[14px] text-clinical-ink">
                <AlertCircle className="h-4 w-4 text-[#E67E22] mt-0.5 shrink-0" strokeWidth={1.75} />
                <span>{patient.condition || "Generate a recap before the session starts."}</span>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            {error}
          </div>
        )}

        {showPatientLink && (
          <div className="pt-2 mt-auto">
            <Link href={`/patients/${patient.id}`} className="block pointer-events-auto">
              <Button variant="outline" className="w-full bg-white justify-center gap-2 h-11 text-clinical-ink font-medium border-clinical-border">
                Open patient card
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {!isRevealed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2.5 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all rounded-full px-6 bg-clinical-brand text-white font-medium"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isGenerating ? "Generating recap..." : "Generate Recap"}
          </Button>
        </div>
      )}
    </CardContent>
  );
}
