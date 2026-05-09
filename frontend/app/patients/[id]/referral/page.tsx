import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Lock,
  ShieldCheck,
  Sparkles,
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
import { getPatient } from "@/lib/api";

export default async function ReferralLetterPage({
  params,
}: {
  params: { id: string };
}) {
  let patient: any;
  try {
    patient = await getPatient(params.id);
  } catch {
    notFound();
  }

  const reason = patient.condition
    ? `Specialist consultation for ${patient.condition.toLowerCase()}.`
    : "Specialist consultation based on current clinical presentation.";
  const intake = patient.intake_notes || "No intake notes recorded yet.";
  const body = `Dear Colleague,

I am writing to refer ${patient.name}, currently followed in our clinical workspace.

Reason for referral: ${reason}

Current context:
${intake}

This draft is generated from backend patient data only. Session summaries, RAG citations, consent checks, and PDF export will be connected once the referral endpoint is added to the AI service.

Kind regards,
Clinical team`;

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
            Drafted from real backend patient data
          </p>
        </div>
        <Button variant="outline" disabled>
          <ShieldCheck className="h-4 w-4" />
          Review workflow pending
        </Button>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <Lock className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-900">
            Manual revision required
          </p>
          <p className="text-xs mt-0.5 text-amber-800">
            This page no longer uses mock data. Export and clinical approval are
            intentionally disabled until the referral AI endpoint exists.
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
              <CardDescription>Read-only prototype output</CardDescription>
            </div>
            <Badge variant="outline">
              <Sparkles className="h-3 w-3" /> Backend data
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#848484] font-medium">
                Reason for referral
              </label>
              <div className="mt-2 rounded-md border border-clinical-border bg-white px-3 py-2 text-sm text-clinical-ink">
                {reason}
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#848484] font-medium">
                Letter body
              </label>
              <pre className="mt-2 min-h-[420px] whitespace-pre-wrap rounded-md border border-clinical-border bg-white p-4 text-sm leading-relaxed text-clinical-ink font-sans">
                {body}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source record</CardTitle>
            <CardDescription>Backend patient #{patient.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-clinical-ink">
            <div>
              <p className="text-xs text-[#848484]">Name</p>
              <p className="font-medium">{patient.name}</p>
            </div>
            <div>
              <p className="text-xs text-[#848484]">Age</p>
              <p>{patient.age ?? "Not recorded"}</p>
            </div>
            <div>
              <p className="text-xs text-[#848484]">Condition</p>
              <p>{patient.condition || "Not recorded"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
