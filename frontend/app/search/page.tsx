import Link from "next/link";
import { ArrowRight, FileText, Search, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPatients, getSessions } from "@/lib/api";

export default async function AdvancedSearchPage() {
  const [patientsData, sessionsData] = await Promise.all([
    getPatients(),
    getSessions(),
  ]);
  const patients = patientsData.patients || [];
  const sessions = sessionsData.sessions || [];
  const patientById = new Map(patients.map((patient: any) => [patient.id, patient]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">
          Search
        </h1>
        <p className="text-sm text-[#848484] mt-1">
          Backend data index for patients and sessions
        </p>
      </div>

      <div className="rounded-md border border-clinical-border bg-clinical-soft/50 p-4 flex items-start gap-3">
        <Search className="h-4 w-4 text-[#848484] mt-0.5" />
        <div>
          <p className="text-sm font-medium text-clinical-ink">
            Semantic search will use the AI vector index.
          </p>
          <p className="text-xs text-[#848484] mt-1">
            For now this page only lists real backend records, avoiding stale mock
            patient IDs.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#848484]" />
              Patients
            </CardTitle>
            <CardDescription>{patients.length} records</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-clinical-border">
              {patients.map((patient: any) => (
                <li key={patient.id}>
                  <Link
                    href={`/patients/${patient.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-clinical-soft/60 transition"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-clinical-ink truncate">
                        {patient.name}
                      </p>
                      <p className="text-xs text-[#848484] truncate">
                        {patient.condition || patient.intake_notes || "No condition recorded"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#848484] shrink-0" />
                  </Link>
                </li>
              ))}
              {patients.length === 0 && (
                <li className="px-4 py-8 text-xs text-[#848484] text-center">
                  No patients in the backend database yet.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#848484]" />
              Sessions
            </CardTitle>
            <CardDescription>{sessions.length} records</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-clinical-border">
              {sessions.map((session: any) => {
                const patient = patientById.get(session.patient_id);
                return (
                  <li key={session.id}>
                    <Link
                      href={`/patients/${session.patient_id}/sessions/${session.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-clinical-soft/60 transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-clinical-ink truncate">
                            Session #{session.id}
                          </p>
                          {session.clinical_note && (
                            <Badge variant="outline">AI note</Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#848484] truncate">
                          {patient?.name || `Patient ${session.patient_id}`} ·{" "}
                          {session.date || "No date"}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#848484] shrink-0" />
                    </Link>
                  </li>
                );
              })}
              {sessions.length === 0 && (
                <li className="px-4 py-8 text-xs text-[#848484] text-center">
                  No sessions in the backend database yet.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
