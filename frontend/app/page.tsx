import Link from "next/link";
import {
  ArrowRight,
  Clock,
  FileCheck2,
  Sparkles,
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
import { DashboardPreSessionRecap } from "./DashboardPreSessionRecap";

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
  const nextSession = recent[0] || null;
  const nextPatient = nextSession ? patientById.get(nextSession.patient_id) : null;

  const stats = [
    { label: "Patients", value: patients.length, icon: Users },
    { label: "Notes pending", value: pendingNotes.length, icon: FileCheck2 }
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
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
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
                      <div className="h-9 w-9 rounded-lg bg-clinical-soft flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-[#848484]" strokeWidth={1.75} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="flex-1 flex flex-col">
          <CardHeader className="flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-[18px]">Today's appointments</CardTitle>
              <CardDescription className="mt-1">
                {recent.length} sessions · click any row to open the patient card
              </CardDescription>
            </div>
            <Link href="/calendar">
              <Button variant="ghost" size="sm" className="text-[#848484] hover:text-clinical-ink">
                Open calendar <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
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
                {recent.map((session, index) => {
                  const patient = patientById.get(session.patient_id);
                  const sessionDate = new Date(session.date);
                  const duration = 50; 
                  const isTelehealth = index % 2 === 1;
                  return (
                    <li key={session.id}>
                      <Link
                        href={`/patients/${session.patient_id}/sessions/${session.id}`}
                        className="flex items-center gap-4 p-4 hover:bg-clinical-soft/60 transition-colors"
                      >
                        <div className="w-20 shrink-0 text-center flex flex-col items-center justify-center gap-1">
                          <p className="text-[14px] font-bold text-clinical-ink leading-none">
                            {sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(' ', '\n')}
                          </p>
                          <p className="text-[11px] text-[#848484] leading-none">
                            {duration} min
                          </p>
                        </div>
                        <div className="h-10 w-10 shrink-0 rounded-full bg-clinical-soft flex items-center justify-center text-xs font-bold text-clinical-ink">
                          {(patient?.name || "PT").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex items-center gap-2">
                            <p className="text-[15px] font-medium text-clinical-ink">
                              {patient?.name || `Patient ${session.patient_id}`}
                            </p>
                          </div>
                          <p className="text-xs text-[#848484] mt-1 truncate">
                            {patient?.condition || "Generalised anxiety, perfectionism at work"}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-[#848484] shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        </div>

        <Card className="bg-gradient-to-br from-[#FCFBFE] to-clinical-soft/40 border-clinical-border flex flex-col h-full">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="primary" className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold tracking-wider">
                <Sparkles className="h-3 w-3" />
                PRE-SESSION RECAP
              </Badge>
            </div>
            {recent.length > 0 ? (
              <>
                <CardTitle className="text-[18px]">{nextPatient?.name || "Amelia Thornton"}</CardTitle>
                <CardDescription className="flex items-center gap-1.5 mt-1.5 text-[13px]">
                  <Clock className="h-3 w-3" strokeWidth={1.75} />
                  {new Date(nextSession.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · 50 min · CBT with exposure — weekly
                </CardDescription>
              </>
            ) : (
               <CardTitle className="text-lg">No upcoming sessions</CardTitle>
            )}
          </CardHeader>
          <DashboardPreSessionRecap
            patient={nextPatient || null}
            session={nextSession}
            patientCount={patients.length}
          />
        </Card>
      </div>
    </div>
  );
}
