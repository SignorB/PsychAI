import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Video,
  MapPin,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Activity,
  Users,
  FileCheck2,
  Mic,
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
  getTodayAppointments,
  patients,
  sessions,
} from "@/lib/mock-data";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const todays = getTodayAppointments();
  const upcoming = appointments
    .filter((a) => new Date(a.date) > new Date())
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const next = upcoming[0];
  const nextPatient = next ? getPatient(next.patientId) : null;

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const stats = [
    { label: "Sessions today", value: todays.length, icon: CalendarDays },
    { label: "Active patients", value: patients.filter((p) => p.status === "Active").length, icon: Users },
    { label: "Notes pending approval", value: 2, icon: FileCheck2 },
    { label: "Avg. session length", value: "52m", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#848484]">
            {dateLabel}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-clinical-ink mt-0.5">
            Good morning, Dr. Marlowe
          </h1>
          <p className="text-sm text-[#848484] mt-1">
            Your day at a glance — every note is reviewed by you before it's
            saved.
          </p>
        </div>
        <Button>
          <Mic className="h-4 w-4" strokeWidth={1.75} />
          Start next session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="hover:border-[#848484]/40 transition">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[#848484]">{s.label}</p>
                    <p className="text-2xl font-bold text-clinical-ink mt-1">
                      {s.value}
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
        {/* Today's appointments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Today&apos;s appointments</CardTitle>
              <CardDescription>
                {todays.length} sessions · click any row to open the patient card
              </CardDescription>
            </div>
            <Link href="/calendar">
              <Button variant="ghost" size="sm">
                Open calendar
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-clinical-border">
              {todays.map((appt) => {
                const p = getPatient(appt.patientId);
                if (!p) return null;
                return (
                  <li key={appt.id}>
                    <Link
                      href={`/patients/${p.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-clinical-soft/60 transition-colors"
                    >
                      <div className="w-16 shrink-0 text-center">
                        <p className="text-sm font-bold text-clinical-ink">
                          {formatTime(appt.date)}
                        </p>
                        <p className="text-[11px] text-[#848484]">
                          {appt.durationMin} min
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-clinical-soft flex items-center justify-center text-xs font-bold text-clinical-ink">
                        {p.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-clinical-ink">
                            {p.name}
                          </p>
                          <Badge variant="outline">{appt.type}</Badge>
                        </div>
                        <p className="text-xs text-[#848484] mt-0.5 truncate">
                          {p.primaryConcern}
                        </p>
                      </div>
                      <div className="hidden md:flex items-center gap-1.5 text-xs text-[#848484]">
                        {appt.location === "Telehealth" ? (
                          <Video className="h-3.5 w-3.5" strokeWidth={1.75} />
                        ) : (
                          <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                        {appt.location}
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#848484]" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Pre-session recap */}
        {next && nextPatient && (
          <Card className="bg-gradient-to-br from-white to-clinical-soft/50 border-clinical-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-clinical-ink" strokeWidth={1.75} />
                <Badge variant="primary">PRE-SESSION RECAP</Badge>
              </div>
              <CardTitle className="mt-2">{nextPatient.name}</CardTitle>
              <CardDescription className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" strokeWidth={1.75} />
                {formatTime(next.date)} · {next.durationMin} min ·{" "}
                {nextPatient.modality}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium">
                  Themes from last 3 sessions
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {nextPatient.themes.map((t) => (
                    <Badge key={t} variant="default">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium">
                  Open items
                </p>
                <ul className="mt-2 space-y-1.5">
                  {nextPatient.openItems.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-xs text-clinical-ink leading-relaxed"
                    >
                      <CheckCircle2
                        className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#848484]"
                        strokeWidth={1.75}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium">
                  Unresolved
                </p>
                <ul className="mt-2 space-y-1.5">
                  {nextPatient.unresolved.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-xs text-clinical-ink leading-relaxed"
                    >
                      <AlertCircle
                        className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600"
                        strokeWidth={1.75}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <Link href={`/patients/${nextPatient.id}`} className="block">
                <Button variant="outline" className="w-full">
                  Open patient card
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>

              <p className="text-[10px] text-[#848484] text-center pt-1">
                Generated locally via RAG · {patients.length} patients indexed
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent session notes</CardTitle>
          <CardDescription>
            AI-drafted notes awaiting or completed approval
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-clinical-border">
            {sessions.slice(0, 4).map((s) => {
              const p = getPatient(s.patientId);
              if (!p) return null;
              return (
                <li key={s.id}>
                  <Link
                    href={`/patients/${p.id}/sessions/${s.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-clinical-soft/60 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-clinical-soft flex items-center justify-center text-xs font-bold text-clinical-ink">
                      {p.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-clinical-ink">
                        {p.name}
                      </p>
                      <p className="text-xs text-[#848484] mt-0.5 truncate">
                        {s.note.reason}
                      </p>
                    </div>
                    <p className="text-xs text-[#848484] hidden sm:block">
                      {new Date(s.date).toLocaleDateString()}
                    </p>
                    {s.approved ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        <AlertCircle className="h-3 w-3" />
                        Awaiting approval
                      </Badge>
                    )}
                    <ArrowRight className="h-4 w-4 text-[#848484]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
