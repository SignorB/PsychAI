"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  Calendar,
  User as UserIcon,
  FileText,
  StickyNote,
  ArrowRight,
  X,
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
import {
  appointments,
  getPatient,
  patients,
  sessions,
} from "@/lib/mock-data";

type ResultKind = "patient" | "event" | "document";

type Result = {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
  date?: string;
  patientId?: string;
  tags: string[];
};

const ALL_TAGS = [
  "Anxiety",
  "Depression",
  "PTSD",
  "OCD",
  "Grief",
  "Couples",
  "CBT",
  "EMDR",
  "Schema",
  "Risk flag",
];

export default function AdvancedSearchPage() {
  const [q, setQ] = useState("");
  const [kinds, setKinds] = useState<Record<ResultKind, boolean>>({
    patient: true,
    event: true,
    document: true,
  });
  const [tags, setTags] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [patientFilter, setPatientFilter] = useState("");

  const all: Result[] = useMemo(() => {
    const out: Result[] = [];

    patients.forEach((p) => {
      out.push({
        id: `pat-${p.id}`,
        kind: "patient",
        title: p.name,
        subtitle: p.primaryConcern,
        meta: `${p.totalSessions} sessions · ${p.modality}`,
        href: `/patients/${p.id}`,
        patientId: p.id,
        tags: [...p.themes, ...(p.riskFlags.length ? ["Risk flag"] : [])],
      });
    });

    appointments.forEach((a) => {
      const p = getPatient(a.patientId);
      if (!p) return;
      out.push({
        id: `evt-${a.id}`,
        kind: "event",
        title: `${a.type} · ${p.name}`,
        subtitle: `${a.location} · ${a.durationMin} min · ${a.status}`,
        meta: new Date(a.date).toLocaleString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        href: `/patients/${p.id}`,
        date: a.date,
        patientId: p.id,
        tags: [a.type, a.location],
      });
    });

    sessions.forEach((s) => {
      const p = getPatient(s.patientId);
      if (!p) return;
      out.push({
        id: `doc-${s.id}`,
        kind: "document",
        title: `Session note — ${p.name}`,
        subtitle: s.note.reason,
        meta: `${new Date(s.date).toLocaleDateString()} · ${
          s.approved ? "Approved" : "Awaiting approval"
        }`,
        href: `/patients/${p.id}/sessions/${s.id}`,
        date: s.date,
        patientId: p.id,
        tags: [s.modality, ...s.highlights.slice(0, 1)],
      });
    });

    return out;
  }, []);

  const filtered = useMemo(() => {
    return all.filter((r) => {
      if (!kinds[r.kind]) return false;
      if (patientFilter && r.patientId !== patientFilter) return false;
      if (q) {
        const hay = `${r.title} ${r.subtitle} ${r.meta} ${r.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (tags.length) {
        const lower = r.tags.map((t) => t.toLowerCase());
        if (!tags.every((t) => lower.some((l) => l.includes(t.toLowerCase()))))
          return false;
      }
      if (from && r.date && new Date(r.date) < new Date(from)) return false;
      if (to && r.date && new Date(r.date) > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [all, q, kinds, tags, from, to, patientFilter]);

  const counts = useMemo(
    () => ({
      patient: filtered.filter((r) => r.kind === "patient").length,
      event: filtered.filter((r) => r.kind === "event").length,
      document: filtered.filter((r) => r.kind === "document").length,
    }),
    [filtered]
  );

  const activeFilters =
    (q ? 1 : 0) +
    tags.length +
    (from ? 1 : 0) +
    (to ? 1 : 0) +
    (patientFilter ? 1 : 0) +
    Object.values(kinds).filter((v) => !v).length;

  function reset() {
    setQ("");
    setKinds({ patient: true, event: true, document: true });
    setTags([]);
    setFrom("");
    setTo("");
    setPatientFilter("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">
          Advanced search
        </h1>
        <p className="text-sm text-[#848484] mt-1">
          Search across patients, events, and documents · all queries run on-device
        </p>
      </div>

      {/* Search bar */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#848484]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search names, themes, diagnoses, transcripts, notes…"
              className="w-full h-11 pl-10 pr-3 rounded-md bg-clinical-soft border border-transparent text-sm text-clinical-ink placeholder:text-[#848484] focus:outline-none focus:bg-white focus:border-clinical-border"
            />
          </div>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="h-3.5 w-3.5" /> Clear ({activeFilters})
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Filters */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Type */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium mb-2">
                Result type
              </p>
              <div className="space-y-1.5">
                {([
                  ["patient", "Patients", UserIcon],
                  ["event", "Events", Calendar],
                  ["document", "Documents", FileText],
                ] as const).map(([k, label, Icon]) => (
                  <label
                    key={k}
                    className="flex items-center gap-2 text-sm text-clinical-ink"
                  >
                    <input
                      type="checkbox"
                      checked={kinds[k]}
                      onChange={(e) =>
                        setKinds({ ...kinds, [k]: e.target.checked })
                      }
                    />
                    <Icon className="h-3.5 w-3.5 text-[#848484]" />
                    <span className="flex-1">{label}</span>
                    <span className="text-[10px] text-[#848484]">
                      {counts[k]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium mb-2">
                Date range
              </p>
              <div className="space-y-2">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full h-9 px-2 rounded-md border border-clinical-border bg-white text-xs text-clinical-ink"
                />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full h-9 px-2 rounded-md border border-clinical-border bg-white text-xs text-clinical-ink"
                />
              </div>
            </div>

            {/* Patient */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium mb-2">
                Patient
              </p>
              <select
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-clinical-border bg-white text-xs text-clinical-ink"
              >
                <option value="">All patients</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium mb-2">
                Themes & tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TAGS.map((t) => {
                  const active = tags.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() =>
                        setTags(
                          active ? tags.filter((x) => x !== t) : [...tags, t]
                        )
                      }
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                        active
                          ? "bg-clinical-ink text-white border-clinical-ink"
                          : "bg-white text-[#848484] border-clinical-border hover:text-clinical-ink"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#848484]">
              <span className="font-medium text-clinical-ink">
                {filtered.length}
              </span>{" "}
              results · {counts.patient} patients · {counts.event} events ·{" "}
              {counts.document} documents
            </p>
            {q && (
              <Badge variant="info">
                <Sparkles className="h-3 w-3" /> Semantic match
              </Badge>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <Search className="h-8 w-8 text-[#848484] mx-auto mb-2" />
                  <p className="text-sm text-clinical-ink font-medium">
                    No results
                  </p>
                  <p className="text-xs text-[#848484] mt-1">
                    Try widening your filters or clearing the date range.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-clinical-border">
                  {filtered.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={r.href}
                        className="flex items-start gap-4 p-4 hover:bg-clinical-soft/60 transition"
                      >
                        <div className="h-9 w-9 rounded-md bg-clinical-soft flex items-center justify-center shrink-0">
                          {r.kind === "patient" && (
                            <UserIcon className="h-4 w-4 text-[#848484]" />
                          )}
                          {r.kind === "event" && (
                            <Calendar className="h-4 w-4 text-[#848484]" />
                          )}
                          {r.kind === "document" && (
                            <FileText className="h-4 w-4 text-[#848484]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-clinical-ink truncate">
                              {r.title}
                            </p>
                            <Badge
                              variant={
                                r.kind === "patient"
                                  ? "info"
                                  : r.kind === "event"
                                  ? "default"
                                  : "outline"
                              }
                            >
                              {r.kind}
                            </Badge>
                          </div>
                          <p className="text-xs text-[#848484] mt-0.5 line-clamp-1">
                            {r.subtitle}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[11px] text-[#848484]">
                              {r.meta}
                            </span>
                            {r.tags.slice(0, 3).map((t) => (
                              <Badge key={t} variant="outline">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-[#848484] mt-1" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
