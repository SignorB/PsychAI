"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Plus, Filter, ArrowRight, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { patients } from "@/lib/mock-data";

export default function PatientsPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "On hold" | "Discharged">("All");

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchesQ =
        !q ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.primaryConcern.toLowerCase().includes(q.toLowerCase()) ||
        p.diagnosis.join(" ").toLowerCase().includes(q.toLowerCase());
      const matchesStatus = statusFilter === "All" || p.status === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [q, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">
            Patients
          </h1>
          <p className="text-sm text-[#848484] mt-1">
            {patients.length} active records · all data stored on this device
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" strokeWidth={2} />
          New patient
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between flex-wrap gap-3">
          <div className="relative flex-1 max-w-md min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#848484]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, concern, or diagnosis…"
              className="w-full h-10 pl-9 pr-3 rounded-md bg-clinical-soft border border-transparent text-sm text-clinical-ink placeholder:text-[#848484] focus:outline-none focus:bg-white focus:border-clinical-border"
            />
          </div>
          <div className="flex items-center gap-1 bg-clinical-soft p-1 rounded-md">
            {(["All", "Active", "On hold", "Discharged"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 h-8 text-xs rounded-md font-medium transition ${
                  statusFilter === s
                    ? "bg-white text-clinical-ink shadow-sm"
                    : "text-[#848484] hover:text-clinical-ink"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[#848484] border-b border-clinical-border">
                  <th className="font-medium px-5 py-3">Patient</th>
                  <th className="font-medium px-3 py-3 hidden md:table-cell">Concern</th>
                  <th className="font-medium px-3 py-3 hidden lg:table-cell">Modality</th>
                  <th className="font-medium px-3 py-3">Sessions</th>
                  <th className="font-medium px-3 py-3 hidden md:table-cell">Status</th>
                  <th className="font-medium px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-clinical-border last:border-0 hover:bg-clinical-soft/60 transition"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/patients/${p.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="h-9 w-9 rounded-full bg-clinical-soft flex items-center justify-center text-[11px] font-bold text-clinical-ink">
                          {p.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-clinical-ink">
                              {p.name}
                            </span>
                            {p.riskFlags.length > 0 && (
                              <AlertTriangle
                                className="h-3.5 w-3.5 text-amber-600"
                                strokeWidth={2}
                              />
                            )}
                          </div>
                          <p className="text-[11px] text-[#848484]">
                            {p.age} · {p.pronouns}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell text-[#848484] max-w-[280px] truncate">
                      {p.primaryConcern}
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell text-[#848484]">
                      {p.modality}
                    </td>
                    <td className="px-3 py-3 text-clinical-ink font-medium">
                      {p.totalSessions}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <Badge
                        variant={
                          p.status === "Active"
                            ? "success"
                            : p.status === "On hold"
                            ? "warning"
                            : "outline"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/patients/${p.id}`}
                        className="inline-flex items-center text-xs text-[#848484] hover:text-clinical-ink"
                      >
                        Open <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#848484]">
                      No patients match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
