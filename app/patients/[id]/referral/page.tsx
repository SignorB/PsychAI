"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Sparkles,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Download,
  ShieldCheck,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPatient } from "@/lib/mock-data";

export default function ReferralLetterPage() {
  const params = useParams<{ id: string }>();
  const patient = getPatient(params.id);
  if (!patient) notFound();

  const [revised, setRevised] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [recipient, setRecipient] = useState("Dr. R. Imani, Consultant Psychiatrist");
  const [reason, setReason] = useState(
    `Co-management for ${patient.primaryConcern.toLowerCase()} in the context of ${patient.diagnosis.join(", ")}.`
  );
  const [body, setBody] = useState(
    `Dear Colleague,\n\nI am writing to refer ${patient.name} (${patient.age}, ${patient.pronouns}), currently under my care for ${patient.modality.toLowerCase()}. ${patient.name} initially presented with ${patient.primaryConcern.toLowerCase()}, with working diagnoses of ${patient.diagnosis.join(", ")}.\n\nOver the course of ${patient.totalSessions} sessions we have observed steady engagement in therapy. Working themes have included ${patient.themes.join(", ").toLowerCase()}. Open clinical questions remain regarding ${patient.unresolved[0] ?? "ongoing symptom management"}.\n\nI would value your assessment regarding pharmacological optimisation and any specialist input you feel appropriate. Full session history and structured notes are available on request, with the patient's consent.\n\nThank you for your time.\n\nKind regards,\nDr. Eve Marlowe, Clinical Psychologist`
  );

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
        <span className="text-clinical-ink font-medium">Referral letter</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">
            Referral letter
          </h1>
          <p className="text-sm text-[#848484] mt-1">
            For {patient.name} · drafted from {patient.totalSessions} sessions of clinical context
          </p>
        </div>
        <div className="flex gap-2">
          {!revised ? (
            <Button onClick={() => setRevised(true)}>
              <ShieldCheck className="h-4 w-4" />
              Mark as revised
            </Button>
          ) : (
            <Button variant="success" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          )}
        </div>
      </div>

      {/* Mandatory revision banner */}
      <div
        className={`rounded-xl border p-4 flex items-start gap-3 ${
          revised
            ? "bg-emerald-50 border-emerald-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        {revised ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
        ) : (
          <Lock className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
        )}
        <div className="flex-1">
          <p
            className={`text-sm font-bold ${
              revised ? "text-emerald-900" : "text-amber-900"
            }`}
          >
            {revised ? "Revision complete" : "Mandatory revision required"}
          </p>
          <p
            className={`text-xs mt-0.5 ${
              revised ? "text-emerald-800" : "text-amber-800"
            }`}
          >
            {revised
              ? "You confirmed the contents of this letter. PDF export is now enabled."
              : "Please carefully review every line of the AI-drafted letter before exporting. PDF export is locked until revision is confirmed."}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#848484]" />
                Letter draft
              </CardTitle>
              <CardDescription>Edit any field below</CardDescription>
            </div>
            <Badge variant="outline">
              <Sparkles className="h-3 w-3" /> AI draft
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Recipient">
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-clinical-border bg-white text-sm text-clinical-ink focus:outline-none focus:ring-2 focus:ring-clinical-border"
              />
            </Field>
            <Field label="Reason for referral">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-clinical-border bg-white text-sm text-clinical-ink focus:outline-none focus:ring-2 focus:ring-clinical-border"
              />
            </Field>
            <Field label="Letter body">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full min-h-[420px] rounded-md border border-clinical-border bg-white p-3 text-sm leading-relaxed text-clinical-ink focus:outline-none focus:ring-2 focus:ring-clinical-border font-mono"
              />
            </Field>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sources used</CardTitle>
              <CardDescription>RAG context (local)</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-clinical-ink">
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#848484] mt-1.5 shrink-0" />
                  Intake notes ({new Date(patient.startedOn).toLocaleDateString()})
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#848484] mt-1.5 shrink-0" />
                  Last 4 session summaries
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#848484] mt-1.5 shrink-0" />
                  Risk & safety screen
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#848484] mt-1.5 shrink-0" />
                  Working themes index
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Patient consent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-start gap-2 text-xs text-clinical-ink">
                <input type="checkbox" defaultChecked className="mt-0.5" />
                Patient has provided informed consent for this referral.
              </label>
              <label className="flex items-start gap-2 text-xs text-clinical-ink">
                <input type="checkbox" className="mt-0.5" />
                Include full session history with the recipient.
              </label>
            </CardContent>
          </Card>

          <div className="rounded-xl border border-clinical-border bg-clinical-soft/40 p-4">
            <div className="flex items-center gap-2 text-[11px] font-medium text-clinical-ink">
              <Lock className="h-3 w-3" /> LOCAL EXPORT
            </div>
            <p className="text-xs text-[#848484] mt-1.5 leading-relaxed">
              The PDF will be rendered on this device. You decide where it goes.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-clinical-ink" />
            Export referral as PDF
          </DialogTitle>
          <DialogDescription>
            Choose where to save the file. Nothing is uploaded.
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <div className="rounded-md border border-clinical-border bg-clinical-soft/50 p-3 text-xs text-[#848484] flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            Reminder: PHI in this letter must be transmitted to the recipient
            using a HIPAA-compliant channel of your choosing.
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setExportOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setExportOpen(false)}>
            <Download className="h-4 w-4" /> Save PDF
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-[#848484] font-medium block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
