import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, ShieldCheck, Cpu, HardDrive } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">Settings</h1>
        <p className="text-sm text-[#848484] mt-1">Local model & privacy controls</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Cpu className="h-4 w-4" /> Local model</CardTitle>
            <CardDescription>Inference runs entirely on this device</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="LLM" value="llama-3.1-8b-instruct (Q4_K_M)" />
            <Row label="STT" value="whisper-large-v3 (local)" />
            <Row label="Embeddings" value="bge-base-en-v1.5" />
            <Row label="Vector store" value="ChromaDB · 12 patients indexed" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Privacy posture</CardTitle>
            <CardDescription>What leaves this device</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Audio uploads" value={<Badge variant="success">Disabled</Badge>} />
            <Row label="Telemetry" value={<Badge variant="success">Disabled</Badge>} />
            <Row label="Model updates" value={<Badge variant="info">Manual only</Badge>} />
            <Row label="Encryption at rest" value={<Badge variant="success">AES-256</Badge>} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HardDrive className="h-4 w-4" /> Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-clinical-soft rounded-full overflow-hidden">
              <div className="h-full bg-clinical-ink" style={{ width: "32%" }} />
            </div>
            <p className="text-xs text-[#848484] mt-2">14.2 GB used of 45 GB allocated · 12 patients · 89 sessions · 142 transcripts</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-clinical-border bg-clinical-soft/40 p-4 flex items-start gap-3">
        <Lock className="h-5 w-5 text-clinical-ink mt-0.5" />
        <div>
          <p className="text-sm font-bold text-clinical-ink">Support, not replacement</p>
          <p className="text-xs text-[#848484] mt-1 leading-relaxed max-w-2xl">
            PsychAI exists to free your attention during sessions, not to replace your clinical judgement. Every note and letter requires explicit approval before it joins the patient record.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[#848484] text-xs uppercase tracking-wider">{label}</span>
      <span className="text-clinical-ink font-medium text-sm">{value}</span>
    </div>
  );
}
