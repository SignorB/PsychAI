"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Mic,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ShieldCheck,
  FileText,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPatient, getSession } from "@/lib/mock-data";

export default function SessionDetailPage() {
  const params = useParams<{ id: string; sessionId: string }>();
  const patient = getPatient(params.id);
  const session = getSession(params.sessionId);
  if (!patient || !session) notFound();

  const [approved, setApproved] = useState(session.approved);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [freeNotes, setFreeNotes] = useState(session.freeNotes);

  const dateLabel = useMemo(
    () =>
      new Date(session.date).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [session.date]
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#848484]">
            Session note
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-clinical-ink mt-0.5">
            {dateLabel}
          </h1>
          <p className="text-sm text-[#848484] mt-1">
            {patient.name} · {session.durationMin} min · {session.modality}
          </p>
        </div>
        <div className="flex gap-2">
          {approved ? (
            <Badge variant="success" className="h-9 px-3 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approved & saved
            </Badge>
          ) : (
            <Button onClick={() => setConfirmOpen(true)}>
              <ShieldCheck className="h-4 w-4" />
              Approve & save note
            </Button>
          )}
        </div>
      </div>

      {/* Mandatory approval banner */}
      {!approved && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" strokeWidth={1.75} />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">
              Mandatory approval required
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              This AI-drafted note has not yet been reviewed. Nothing is
              committed to the patient record until you explicitly approve it.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="note">
            <TabsList>
              <TabsTrigger value="note">Structured note</TabsTrigger>
              <TabsTrigger value="transcript">
                Transcript ({session.transcript.length})
              </TabsTrigger>
              <TabsTrigger value="raw">My notes</TabsTrigger>
            </TabsList>

            <TabsContent value="note">
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#848484]" />
                      AI-drafted clinical note
                    </CardTitle>
                    <CardDescription>
                      Generated locally · review and edit before approval
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Draft v1</Badge>
                </CardHeader>
                <CardContent className="space-y-5">
                  <NoteSection
                    label="Reason for session"
                    value={session.note.reason}
                  />
                  <NoteSection
                    label="Content"
                    value={session.note.content}
                  />
                  <NoteSection
                    label="Observations"
                    value={session.note.observations}
                  />
                  <NoteSection
                    label="Therapeutic plan"
                    value={session.note.plan}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transcript">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-[#848484]" />
                    Raw transcript
                  </CardTitle>
                  <CardDescription>
                    Speech-to-text processed on-device · never leaves this machine
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                  {session.transcript.map((line, i) => (
                    <div key={i} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-[11px] font-mono text-[#848484] w-16 shrink-0 pt-0.5">
                        {line.t}
                      </span>
                      <div className="flex-1">
                        <p
                          className={`text-[11px] font-medium uppercase tracking-wider ${
                            line.speaker === "Therapist"
                              ? "text-clinical-ink"
                              : "text-[#848484]"
                          }`}
                        >
                          {line.speaker}
                        </p>
                        <p className="text-clinical-ink mt-0.5">{line.text}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="raw">
              <Card>
                <CardHeader>
                  <CardTitle>Free notes</CardTitle>
                  <CardDescription>
                    Your own observations · stays separate from the AI draft
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={freeNotes}
                    onChange={(e) => setFreeNotes(e.target.value)}
                    placeholder="Type or dictate your private observations…"
                    className="w-full min-h-[220px] rounded-md border border-clinical-border bg-white p-3 text-sm text-clinical-ink placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-clinical-border resize-y"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-[#848484]">
                      Auto-saved locally · {freeNotes.length} characters
                    </p>
                    <Button variant="outline" size="sm">
                      <Mic className="h-3.5 w-3.5" /> Voice memo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-white to-clinical-soft/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-clinical-ink" />
                Highlights & themes
              </CardTitle>
              <CardDescription>
                Surfaced from this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {session.highlights.map((h) => (
                  <li key={h} className="flex gap-2 text-sm text-clinical-ink leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#848484] mt-2 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/patients/${patient.id}/referral`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4" />
                  Generate referral letter
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start">
                <Save className="h-4 w-4" />
                Export note as PDF
              </Button>
            </CardContent>
          </Card>

          <div className="rounded-xl border border-clinical-border bg-clinical-soft/40 p-4">
            <div className="flex items-center gap-2 text-[11px] font-medium text-clinical-ink">
              <Lock className="h-3 w-3" /> ON-DEVICE PROCESSING
            </div>
            <p className="text-xs text-[#848484] mt-1.5 leading-relaxed">
              Transcript and AI draft were generated by your local model. No
              audio, text, or metadata has been sent off this device.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Approve clinical note
          </DialogTitle>
          <DialogDescription>
            By approving, you confirm you have reviewed the AI-drafted note and
            take clinical responsibility for its accuracy. The note will be
            committed to {patient.name}&apos;s record.
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <div className="rounded-md border border-clinical-border bg-clinical-soft/50 p-3 text-xs text-[#848484] flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            This action cannot be undone from this view. You may still edit the
            note from the patient&apos;s session history.
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={() => {
              setApproved(true);
              setConfirmOpen(false);
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirm approval
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function NoteSection({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium">
        {label}
      </p>
      <p className="text-sm text-clinical-ink mt-1.5 leading-relaxed">{value}</p>
    </div>
  );
}
