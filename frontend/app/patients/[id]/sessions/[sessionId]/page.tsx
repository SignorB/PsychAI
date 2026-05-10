"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Mic,
  Sparkles,
  AlertTriangle,
  Square,
  Upload,
  CheckCircle2,
  Pencil,
  Save,
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
import { cn } from "@/lib/utils";
import {
  getPatient,
  getPatientSession,
  generateSessionNote,
  updateSessionNote,
  transcribeSessionAudio,
  approveSession,
} from "@/lib/api";

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
  approved?: boolean;
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
  const [generated, setGenerated] = useState<GeneratedNote | null>(null);
  // editableNote: the text shown in the editable textarea; starts from generated/saved note
  const [editableNote, setEditableNote] = useState("");
  const [noteIsEdited, setNoteIsEdited] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
        const existingNote = sessionData.clinical_note || "";
        setEditableNote(existingNote);
        setNoteIsEdited(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [params.id, params.sessionId]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

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
      });
      setSession(response.session);
      setGenerated(response.ai_note);
      const newNote = response.ai_note?.structured_note || response.session.clinical_note || "";
      setEditableNote(newNote);
      setNoteIsEdited(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate note");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveNote() {
    if (!session) return;
    setIsSavingNote(true);
    setError("");
    try {
      const updated = await updateSessionNote(params.id, params.sessionId, editableNote);
      setSession(updated);
      setNoteIsEdited(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setIsSavingNote(false);
    }
  }

  async function handleApprove() {
    // If the note has been edited but not saved yet, save first
    if (noteIsEdited && editableNote) {
      setIsSavingNote(true);
      try {
        await updateSessionNote(params.id, params.sessionId, editableNote);
        setNoteIsEdited(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save note before confirming");
        setIsSavingNote(false);
        return;
      }
      setIsSavingNote(false);
    }

    setIsApproving(true);
    setError("");
    try {
      const updatedSession = await approveSession(params.id, params.sessionId);
      setSession(updatedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve session");
    } finally {
      setIsApproving(false);
    }
  }

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Audio recording is not available in this browser or origin. Use audio upload instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = "audio/webm;codecs=opus";
      const recorder = new MediaRecorder(
        stream,
        MediaRecorder.isTypeSupported(preferredType) ? { mimeType: preferredType } : undefined
      );
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    setIsRecording(false);
  }

  async function submitAudio(blob: Blob, filename: string) {
    setIsTranscribing(true);
    setError("");
    try {
      const response = await transcribeSessionAudio(params.id, params.sessionId, blob, {
        filename,
        append: Boolean(transcript.trim()),
      });
      setSession(response.session);
      setTranscript(response.session.transcript || response.transcription?.raw_text || "");
      setGenerated(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transcribe audio");
    } finally {
      setIsTranscribing(false);
    }
  }

  async function handleTranscribeRecording() {
    if (!audioBlob) return;
    await submitAudio(audioBlob, "session-recording.webm");
  }

  async function handleAudioFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    await submitAudio(file, file.name);
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

  const hasNote = Boolean(editableNote);

  return (
    <div className="flex flex-col h-full gap-6">
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
          {((generated?.themes?.length ?? 0) > 0 || (generated?.symptoms?.length ?? 0) > 0) && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {generated?.themes?.map((theme: any) => (
                <Badge key={theme.title} variant="outline" className="bg-clinical-soft/50 text-[#848484] border-[#e2e2e2] font-medium px-2.5 py-0.5 text-[11px]">
                  {theme.title}
                </Badge>
              ))}
              {generated?.symptoms?.map((symptom: any) => (
                <Badge key={symptom.name} variant="outline" className="bg-clinical-soft/50 text-[#848484] border-[#e2e2e2] font-medium px-2.5 py-0.5 text-[11px]">
                  {symptom.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {!session.approved ? (
            <Button
              onClick={handleApprove}
              disabled={isApproving || isSavingNote || !hasNote}
              variant="outline"
              className="text-amber-600 border-amber-200 hover:bg-amber-100"
            >
              {isApproving || isSavingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2"/>}
              {isApproving || isSavingNote ? "Saving..." : "Confirm note"}
            </Button>
          ) : (
            <Button
              onClick={handleApprove}
              disabled={isApproving}
              variant="outline"
              className="flex items-center justify-center px-4 h-10 rounded-md bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 transition"
            >
              {isApproving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {isApproving ? "Reverting..." : "Confirmed"}
            </Button>
          )}
          <Button onClick={handleGenerate} disabled={isGenerating || !transcript.trim() || session.approved}>
            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {isGenerating ? "Generating..." : "Generate AI note"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0">
        <div className="grid lg:grid-cols-2 gap-6 h-full">
        {/* Transcription card */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-[#848484]" />
              Voice transcription
            </CardTitle>
            <CardDescription>
              Record or upload audio, then transcribe it with local Whisper.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {!isRecording ? (
                <Button variant="outline" onClick={startRecording} disabled={isTranscribing || session.approved}>
                  <Mic className="h-4 w-4" /> Record
                </Button>
              ) : (
                <Button variant="destructive" onClick={stopRecording} disabled={session.approved}>
                  <Square className="h-4 w-4" /> Stop
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleTranscribeRecording}
                disabled={!audioBlob || isRecording || isTranscribing || session.approved}
              >
                {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isTranscribing ? "Transcribing..." : "Transcribe"}
              </Button>
              <label className={cn("inline-flex items-center justify-center gap-2 h-9 rounded-md border border-clinical-border bg-white px-3 text-sm font-medium text-clinical-ink hover:bg-clinical-soft cursor-pointer", (isTranscribing || isRecording || session.approved) && "opacity-50 pointer-events-none")}>
                <Upload className="h-4 w-4" />
                Upload audio
                <input
                  type="file"
                  accept="audio/*"
                  className="sr-only"
                  onChange={handleAudioFile}
                  disabled={isTranscribing || isRecording || session.approved}
                />
              </label>
              {isRecording && (
                <span className="inline-flex items-center gap-2 text-xs text-red-700">
                  <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                  Recording
                </span>
              )}
            </div>

            {audioUrl && (
              <audio controls src={audioUrl} className="w-full" />
            )}

            <textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              disabled={session.approved}
              className="w-full flex-1 rounded-md border border-clinical-border bg-white p-3 text-sm text-clinical-ink placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-clinical-border resize-none disabled:opacity-50 disabled:bg-clinical-soft/50"
              placeholder="Paste or type the session transcript..."
            />
            <p className="text-xs text-[#848484]">{transcript.length} characters</p>
          </CardContent>
        </Card>

        {/* AI Clinical Note — editable */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#848484]" />
                  AI-drafted clinical note
                </CardTitle>
                <CardDescription className="mt-1">
                  {session.approved
                    ? "Confirmed — the note is locked."
                    : hasNote
                    ? "Edit the note below, then confirm to save it."
                    : "Generate a note from the transcript above, then edit and confirm."}
                </CardDescription>
              </div>
              {!session.approved && hasNote && noteIsEdited && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  className="shrink-0"
                >
                  {isSavingNote ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSavingNote ? "Saving..." : "Save draft"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto flex flex-col gap-4">
            {session.approved ? (
              // Read-only when confirmed
              <p className="text-sm leading-relaxed text-clinical-ink whitespace-pre-wrap">
                {editableNote || "No note."}
              </p>
            ) : hasNote ? (
              // Editable textarea
              <div className="relative flex flex-col flex-1">
                <textarea
                  value={editableNote}
                  onChange={(e) => {
                    setEditableNote(e.target.value);
                    setNoteIsEdited(true);
                  }}
                  className="w-full flex-1 rounded-md border border-clinical-border bg-white p-3 text-sm text-clinical-ink placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-clinical-border resize-none"
                  placeholder="The AI note will appear here..."
                />
                {noteIsEdited && (
                  <span className="absolute top-2 right-3 flex items-center gap-1 text-[11px] text-amber-600">
                    <Pencil className="h-3 w-3" /> Unsaved changes
                  </span>
                )}
              </div>
            ) : (
              // Empty state
              <div className="flex flex-col flex-1 items-center justify-center py-10 text-center text-sm text-[#848484] border border-dashed border-clinical-border rounded-md">
                <Sparkles className="h-6 w-6 mb-3 text-[#c8c8c8]" />
                No AI note yet. Generate one from the transcript above.
              </div>
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
        </div>{/* end grid */}
      </div>
    </div>
  );
}
