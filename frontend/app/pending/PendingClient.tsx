"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  Search,
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

export default function PendingClient({
  initialSessions,
  patients,
}: {
  initialSessions: any[];
  patients: any[];
}) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "Generated">("All");

  // Create a patient map for quick lookup
  const patientById = useMemo(() => {
    return new Map(patients.map((patient) => [patient.id, patient]));
  }, [patients]);

  const filteredSessions = useMemo(() => {
    return initialSessions.filter((session) => {
      const patient = patientById.get(session.patient_id);
      const name = patient?.name || `Patient ${session.patient_id}`;
      
      const matchesQ = !q || name.toLowerCase().includes(q.toLowerCase());
      
      const isGenerated = !!session.clinical_note;
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Open" && !isGenerated) ||
        (statusFilter === "Generated" && isGenerated);

      return matchesQ && matchesStatus;
    });
  }, [initialSessions, patientById, q, statusFilter]);

  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
      const aPending = !a.clinical_note;
      const bPending = !b.clinical_note;
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [filteredSessions]);

  const open = initialSessions.filter((session) => !session.clinical_note);
  const generated = initialSessions.filter((session) => session.clinical_note);

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
        <StatCard label="Total" value={initialSessions.length} icon={Clock} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between flex-wrap gap-3 pb-4">
          <div className="space-y-1">
            <CardTitle>Session queue</CardTitle>
            <CardDescription>
              Generate an AI note from each session page, then ask patient history.
            </CardDescription>
          </div>
        </CardHeader>
        
        {/* FILTER CONTROLS */}
        <div className="px-6 pb-4 border-b border-clinical-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md min-w-[220px] w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#848484]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by patient name…"
              className="w-full h-10 pl-9 pr-3 rounded-md bg-clinical-soft border border-transparent text-sm text-clinical-ink placeholder:text-[#848484] focus:outline-none focus:bg-white focus:border-clinical-border transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 bg-clinical-soft p-1 rounded-md w-full sm:w-auto">
            {(["All", "Open", "Generated"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 h-8 text-xs rounded-md font-medium transition flex-1 sm:flex-none ${
                  statusFilter === s
                    ? "bg-white text-clinical-ink shadow-sm"
                    : "text-[#848484] hover:text-clinical-ink"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-0">
          {sortedSessions.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#848484]">
              No sessions match your filters.
            </div>
          ) : (
            <ul className="divide-y divide-clinical-border">
              {sortedSessions.map((session) => {
                const patient = patientById.get(session.patient_id);
                return (
                  <li key={session.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-clinical-soft/60 transition">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-clinical-soft flex items-center justify-center text-xs font-bold text-clinical-ink shrink-0 border border-clinical-border">
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
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 pl-14 sm:pl-0">
                      {session.clinical_note ? (
                        <Badge variant="success">Generated</Badge>
                      ) : (
                        <Badge variant="warning">Needs note</Badge>
                      )}
                      <Link href={`/patients/${session.patient_id}/sessions/${session.id}`}>
                        <Button variant="outline" size="sm">
                          Open <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
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
