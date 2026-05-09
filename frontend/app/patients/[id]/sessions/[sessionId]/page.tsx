"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Mic,
  Save,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPatient, getPatientSession, generateSessionNote, askPatient } from "@/lib/api";

type Patient = {
  id: number;
  name: string;
  condition: string;
  intake_notes?: string;
};

type TherapySession = {
  id: number;
  date: string;
  transcript?: string;
  clinical_note?: string;
  patient_id: number;
};

type GeneratedNote = {
  themes?: { title: string; evidence: string[] }[];
  symptoms?: { name: string; confidence: string }[];
  structured_note?: string;
  next_session_recap?: {
    open_points: string[];
    suggested_followups: string[];
    patient_words_to_revisit: string[];
  };
  uncertainties?: string[];
};

export default function SessionDetailPage() {
  const params = useParams<{ id: string; sessionId: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [session, setSession] = useState<TherapySession | null>(null);
  const [transcript, setTranscript] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [generated, setGenerated] = useState<GeneratedNote | null>(null);
  const [ragQuestion, setRagQuestion] = useState("Cosa va ripreso nella prossima seduta?");
  const [ragAnswer, setRagAnswer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [patientData, sessionData] = await Promise.all([
          getPatient(params.id),
          getPatientSession(params.id, params.sessionId),
        ]);
        setPatient(patientData);
        setSession(sessionData);
        setTranscript(sessionData.transcript || patientData.intake_notes || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [params.id, params.sessionId]);

  const dateLabel = useMemo(() => {
    if (!session?.date) return "";
    return new Date(session.date).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [session?.date]);

  async function handleGenerate() {
    if (!session) return;
    setIsGenerating(true);
    setError("");
    try {
      const response = await generateSessionNote(params.id, params.sessionId, {
        transcript,
        manual_notes: manualNote ? [manualNote] : [],
      });
      setSession(response.session);
      setGenerated(response.ai_note);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate note");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleAsk() {
    setIsAsking(true);
    setError("");
    try {
      const response = await askPatient(params.id, ragQuestion);
      setRagAnswer(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to query patient history");
    } finally {
      setIsAsking(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#848484]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading session...
      </div>
    );
  }

  if (!patient || !session) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        {error || "Session not found"}
      </div>
    );
  }

  const noteText = generated?.structured_note || session.clinical_note || "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-xs text-[#848484]">
        <Link href="/patients" className="hover:text-clinical-ink flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          Patients
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/patients/${patient.id}`} className="hover:text-clinical-ink">
          {patient.name}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-clinical-ink font-medium">Session</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#848484]">
            Session note
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-clinical-ink mt-0.5">
            {dateLabel}
          </h1>
          <p className="text-sm text-[#848484] mt-1">
            {patient.name} · {patient.condition}
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating || !transcript.trim()}>
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isGenerating ? "Generating..." : "Generate AI note"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-[#848484]" />
                Transcript input
              </CardTitle>
              <CardDescription>
                For now this is editable text. Later it will be populated by Whisper.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                className="w-full min-h-[220px] rounded-md border border-clinical-border bg-white p-3 text-sm text-clinical-ink placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-clinical-border resize-y"
                placeholder="Paste or type the session transcript..."
              />
              <p className="mt-2 text-xs text-[#848484]">{transcript.length} characters</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual note</CardTitle>
              <CardDescription>
                Optional clinician note merged into the AI draft request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={manualNote}
                onChange={(event) => setManualNote(event.target.value)}
                className="w-full min-h-[120px] rounded-md border border-clinical-border bg-white p-3 text-sm text-clinical-ink placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-clinical-border resize-y"
                placeholder="Add clinical context before generating..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#848484]" />
                AI-drafted clinical note
              </CardTitle>
              <CardDescription>
                Generated by backend via local AI service.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {noteText ? (
                <p className="text-sm leading-relaxed text-clinical-ink whitespace-pre-wrap">
                  {noteText}
                </p>
              ) : (
                <p className="text-sm text-[#848484]">
                  No AI note yet. Generate one from the transcript above.
                </p>
              )}
              {generated?.uncertainties && generated.uncertainties.length > 0 && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs font-medium text-amber-900">Uncertainties</p>
                  <ul className="mt-1 space-y-1 text-xs text-amber-800">
                    {generated.uncertainties.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Extracted themes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {generated?.themes?.length ? (
                generated.themes.map((theme) => (
                  <Badge key={theme.title} variant="info">
                    {theme.title}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-[#848484]">Generate a note to see themes.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Symptoms / observations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {generated?.symptoms?.length ? (
                generated.symptoms.map((symptom) => (
                  <div key={symptom.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-clinical-ink">{symptom.name}</span>
                    <Badge variant="outline">{symptom.confidence}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#848484]">Generate a note to see observations.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ask patient history</CardTitle>
              <CardDescription>
                Uses the vector index populated when notes are generated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={ragQuestion}
                onChange={(event) => setRagQuestion(event.target.value)}
                className="w-full min-h-[80px] rounded-md border border-clinical-border bg-white p-3 text-sm text-clinical-ink focus:outline-none focus:ring-2 focus:ring-clinical-border resize-y"
              />
              <Button variant="outline" className="w-full" onClick={handleAsk} disabled={isAsking || !ragQuestion.trim()}>
                {isAsking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isAsking ? "Asking..." : "Ask"}
              </Button>
              {ragAnswer && (
                <div className="rounded-md bg-clinical-soft p-3 text-sm text-clinical-ink">
                  <p>{ragAnswer.answer}</p>
                  {ragAnswer.citations?.length > 0 && (
                    <p className="mt-2 text-xs text-[#848484]">
                      Citations: {ragAnswer.citations.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
