import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileCheck2,
  Mic,
  Users,
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
import { getPatients, getSessions } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let patients: any[] = [];
  let sessions: any[] = [];

  try {
    const [patientsData, sessionsData] = await Promise.all([
      getPatients(),
      getSessions(),
    ]);
    patients = patientsData.patients || [];
    sessions = sessionsData.sessions || [];
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
  }

  const pendingNotes = sessions.filter((session) => !session.clinical_note);
  const recent = [...sessions]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 5);
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));

  const stats = [
    { label: "Patients", value: patients.length, icon: Users },
    { label: "Sessions", value: sessions.length, icon: CalendarDays },
    { label: "Notes pending", value: pendingNotes.length, icon: FileCheck2 },
    { label: "Generated notes", value: sessions.length - pendingNotes.length, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#848484]">
            Local clinical workspace
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-clinical-ink mt-0.5">
            PsychAI dashboard
          </h1>
        </div>
        <Link href="/patients">
          <Button>
            <Mic className="h-4 w-4" strokeWidth={1.75} />
            Start from patient card
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover:border-[#848484]/40 transition">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[#848484]">{stat.label}</p>
                    <p className="text-2xl font-bold text-clinical-ink mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div className="h-9 w-9 rounded-lg bg-clinical-soft flex items-center justify-center">
                    <Icon className="h-4 w-4 text-[#848484]" strokeWidth={1.75} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent sessions</CardTitle>
              <CardDescription>
                Open a real backend session and generate an AI note.
              </CardDescription>
            </div>
            <Link href="/pending">
              <Button variant="ghost" size="sm">
                Sessions to close <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <div className="p-10 text-center text-sm text-[#848484]">
                No sessions yet. Open a patient and start one.
              </div>
            ) : (
              <ul className="divide-y divide-clinical-border">
                {recent.map((session) => {
                  const patient = patientById.get(session.patient_id);
                  return (
                    <li key={session.id}>
                      <Link
                        href={`/patients/${session.patient_id}/sessions/${session.id}`}
                        className="flex items-center gap-4 p-4 hover:bg-clinical-soft/60 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-full bg-clinical-soft flex items-center justify-center text-xs font-bold text-clinical-ink">
                          {(patient?.name || "PT").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-clinical-ink">
                            {patient?.name || `Patient ${session.patient_id}`}
                          </p>
                          <p className="text-xs text-[#848484] mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(session.date).toLocaleString()}
                          </p>
                        </div>
                        {session.clinical_note ? (
                          <Badge variant="success">Generated</Badge>
                        ) : (
                          <Badge variant="warning">Needs note</Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-[#848484]" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-clinical-border last:border-0 pb-2 last:pb-0">
      <span className="text-[#848484]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
