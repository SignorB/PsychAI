import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ClipboardCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPatients, getSessions } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  let sessions: any[] = [];
  let patients: any[] = [];

  try {
    const [sessionsData, patientsData] = await Promise.all([
      getSessions(),
      getPatients(),
    ]);
    sessions = sessionsData.sessions || [];
    patients = patientsData.patients || [];
  } catch (error) {
    console.error("Failed to fetch pending sessions:", error);
  }

  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const open = sessions.filter((session) => !session.clinical_note);
  const generated = sessions.filter((session) => session.clinical_note);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">
            Sessions to close
          </h1>
          <p className="text-sm text-[#848484] mt-1">
            Real sessions from the local backend, no mock patient links.
          </p>
        </div>
        <Badge variant="warning" className="h-8 px-3 text-xs">
          <AlertTriangle className="h-3.5 w-3.5" /> {open.length} open
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Open" value={open.length} icon={ClipboardCheck} />
        <StatCard label="Generated" value={generated.length} icon={CheckCircle2} />
        <StatCard label="Total" value={sessions.length} icon={Clock} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session queue</CardTitle>
          <CardDescription>
            Generate an AI note from each session page, then ask patient history.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#848484]">
              No sessions available.
            </div>
          ) : (
            <ul className="divide-y divide-clinical-border">
              {sessions.map((session) => {
                const patient = patientById.get(session.patient_id);
                return (
                  <li key={session.id} className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-clinical-soft flex items-center justify-center text-xs font-bold text-clinical-ink">
                      {(patient?.name || "PT").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-clinical-ink">
                        {patient?.name || `Patient ${session.patient_id}`}
                      </p>
                      <p className="text-xs text-[#848484] mt-0.5">
                        {new Date(session.date).toLocaleString()}
                      </p>
                    </div>
                    {session.clinical_note ? (
                      <Badge variant="success">Generated</Badge>
                    ) : (
                      <Badge variant="warning">Needs note</Badge>
                    )}
                    <Link href={`/patients/${session.patient_id}/sessions/${session.id}`}>
                      <Button variant="outline" size="sm">
                        Open <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: any;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-xs text-[#848484]">{label}</p>
          <p className="text-2xl font-bold text-clinical-ink mt-1">{value}</p>
        </div>
        <div className="h-9 w-9 rounded-lg bg-clinical-soft flex items-center justify-center">
          <Icon className="h-4 w-4 text-[#848484]" strokeWidth={1.75} />
        </div>
      </CardContent>
    </Card>
  );
}
