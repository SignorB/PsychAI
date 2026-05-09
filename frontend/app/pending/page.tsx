"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Filter,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getPatient, patients, sessions } from "@/lib/mock-data";

type Pending = {
  id: string;
  patientId: string;
  date: string;
  durationMin: number;
  reason: string;
  highlights: string[];
  ageDays: number;
  modality: string;
};

function buildPending(): Pending[] {
  // Synthesize 3 pending session reviews tied to known patients.
  const today = new Date();
  const back = (days: number, h = 10) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
  };
  const list: Pending[] = [
    {
      id: "p-pending-001",
      patientId: "p-005",
      date: back(1, 10),
      durationMin: 50,
      reason:
        "Follow-up — exposure plan for tutorials; review panic frequency and avoidance log.",
      highlights: [
        "Attended 1 full tutorial without leaving",
        "Two micro-panic episodes (rated 4/10)",
        "Strong therapeutic alliance",
      ],
      ageDays: 1,
      modality: "CBT with exposure",
    },
    {
      id: "p-pending-002",
      patientId: "p-009",
      date: back(2, 14),
      durationMin: 50,
      reason:
        "IPT follow-up — role transition; partner conflict around return-to-work date.",
      highlights: [
        "Tearfulness when discussing childcare logistics",
        "Identified two protective routines",
        "No safety concerns",
      ],
      ageDays: 2,
      modality: "IPT",
    },
    {
      id: "p-pending-003",
      patientId: "p-012",
      date: back(4, 9, 30),
      durationMin: 50,
      reason:
        "ERP follow-up — hierarchy item #4 attempted; reassurance-seeking from mother decreasing.",
      highlights: [
        "ERP item #4 completed 4/7 days",
        "Reassurance calls down from 6 to 2/day",
        "SSRI dose stable",
      ],
      ageDays: 4,
      modality: "ERP",
    },
    // Already approved — for archive tab.
    ...sessions
      .filter((s) => s.approved)
      .map<Pending>((s) => ({
        id: `done-${s.id}`,
        patientId: s.patientId,
        date: s.date,
        durationMin: s.durationMin,
        reason: s.note.reason,
        highlights: s.highlights,
        ageDays: Math.max(
          1,
          Math.round((+today - +new Date(s.date)) / 86400000)
        ),
        modality: s.modality,
      })),
  ];
  return list;
}

export default function PendingPage() {
  const all = useMemo(buildPending, []);
  const [closed, setClosed] = useState<Set<string>>(new Set());

  const open = all.filter(
    (p) => !p.id.startsWith("done-") && !closed.has(p.id)
  );
  const overdue = open.filter((p) => p.ageDays >= 3);
  const recent = open.filter((p) => p.ageDays < 3);
  const archive = all.filter(
    (p) => p.id.startsWith("done-") || closed.has(p.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">
            Sessions to close
          </h1>
          <p className="text-sm text-[#848484] mt-1">
            Review and approve AI-drafted notes still awaiting your sign-off
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="h-8 px-3 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" /> {open.length} open
          </Badge>
          {overdue.length > 0 && (
            <Badge variant="danger" className="h-8 px-3 text-xs">
              {overdue.length} overdue
            </Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Open"
          value={open.length}
          tone="default"
          icon={ClipboardCheck}
        />
        <StatCard
          label="Overdue (≥3 days)"
          value={overdue.length}
          tone="danger"
          icon={AlertTriangle}
        />
        <StatCard
          label="Approved this week"
          value={archive.length}
          tone="success"
          icon={CheckCircle2}
        />
        <StatCard
          label="Avg. close time"
          value="1.4 d"
          tone="default"
          icon={Clock}
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All open ({open.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
          <TabsTrigger value="recent">Recent ({recent.length})</TabsTrigger>
          <TabsTrigger value="archive">
            Archive ({archive.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <PendingList items={open} onClose={(id) => setClosed(new Set([...closed, id]))} />
        </TabsContent>
        <TabsContent value="overdue">
          <PendingList items={overdue} onClose={(id) => setClosed(new Set([...closed, id]))} />
        </TabsContent>
        <TabsContent value="recent">
          <PendingList items={recent} onClose={(id) => setClosed(new Set([...closed, id]))} />
        </TabsContent>
        <TabsContent value="archive">
          <PendingList items={archive} archived />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  tone: "default" | "danger" | "success";
  icon: any;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-xs text-[#848484]">{label}</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              tone === "danger"
                ? "text-rose-700"
                : tone === "success"
                ? "text-emerald-700"
                : "text-clinical-ink"
            }`}
          >
            {value}
          </p>
        </div>
        <div
          className={`h-9 w-9 rounded-lg flex items-center justify-center ${
            tone === "danger"
              ? "bg-rose-50"
              : tone === "success"
              ? "bg-emerald-50"
              : "bg-clinical-soft"
          }`}
        >
          <Icon
            className={`h-4 w-4 ${
              tone === "danger"
                ? "text-rose-700"
                : tone === "success"
                ? "text-emerald-700"
                : "text-[#848484]"
            }`}
            strokeWidth={1.75}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PendingList({
  items,
  archived,
  onClose,
}: {
  items: Pending[];
  archived?: boolean;
  onClose?: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-clinical-ink">
            All caught up
          </p>
          <p className="text-xs text-[#848484] mt-1">
            No sessions waiting in this view.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((p) => {
        const patient = getPatient(p.patientId);
        if (!patient) return null;
        const isOverdue = p.ageDays >= 3 && !archived;
        return (
          <Card
            key={p.id}
            className={isOverdue ? "border-rose-200 bg-rose-50/30" : ""}
          >
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-11 w-11 rounded-full bg-clinical-soft flex items-center justify-center text-xs font-bold text-clinical-ink shrink-0">
                    {patient.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-clinical-ink">
                        {patient.name}
                      </p>
                      <Badge variant="outline">{p.modality}</Badge>
                      {archived ? (
                        <Badge variant="success">
                          <CheckCircle2 className="h-3 w-3" /> Approved
                        </Badge>
                      ) : isOverdue ? (
                        <Badge variant="danger">
                          <AlertTriangle className="h-3 w-3" /> {p.ageDays} days old
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          <Clock className="h-3 w-3" /> {p.ageDays}d ago
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#848484] mt-1">
                      {new Date(p.date).toLocaleString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {p.durationMin} min
                    </p>
                    <p className="text-sm text-clinical-ink mt-2 leading-relaxed">
                      {p.reason}
                    </p>
                    {p.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {p.highlights.map((h) => (
                          <Badge key={h} variant="info">
                            <Sparkles className="h-2.5 w-2.5" /> {h}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex md:flex-col items-stretch gap-2 md:w-44 shrink-0">
                  <Link
                    href={
                      p.id.startsWith("done-")
                        ? `/patients/${patient.id}/sessions/${p.id.replace(
                            "done-",
                            ""
                          )}`
                        : `/patients/${patient.id}`
                    }
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full">
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  {!archived && onClose && (
                    <Button
                      variant="success"
                      className="flex-1"
                      onClick={() => onClose(p.id)}
                    >
                      <ShieldCheck className="h-4 w-4" /> Approve
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
