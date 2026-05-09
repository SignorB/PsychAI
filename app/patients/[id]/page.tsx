import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  Cake,
  Calendar,
  AlertTriangle,
  FileText,
  Mic,
  ChevronRight,
  CheckCircle2,
  Clock,
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
import { getPatient, getPatientSessions, patients } from "@/lib/mock-data";

export function generateStaticParams() {
  return patients.map((p) => ({ id: p.id }));
}

export default function PatientCard({ params }: { params: { id: string } }) {
  const p = getPatient(params.id);
  if (!p) notFound();
  const patientSessions = getPatientSessions(params.id);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[#848484]">
        <Link href="/patients" className="hover:text-clinical-ink flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          Patients
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-clinical-ink font-medium">{p.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-clinical-soft border border-clinical-border flex items-center justify-center text-lg font-bold text-clinical-ink">
            {p.initials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">
                {p.name}
              </h1>
              <Badge variant={p.status === "Active" ? "success" : "warning"}>
                {p.status}
              </Badge>
              {p.riskFlags.length > 0 && (
                <Badge variant="warning">
                  <AlertTriangle className="h-3 w-3" />
                  Risk flag
                </Badge>
              )}
            </div>
            <p className="text-sm text-[#848484] mt-1">
              {p.age} · {p.pronouns} · {p.occupation}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-[#848484]">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> {p.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {p.phone}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/patients/${p.id}/referral`}>
            <Button variant="outline">
              <FileText className="h-4 w-4" />
              Referral letter
            </Button>
          </Link>
          <Button>
            <Mic className="h-4 w-4" />
            Start session
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">
            Sessions ({patientSessions.length})
          </TabsTrigger>
          <TabsTrigger value="clinical">Clinical data</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Initial intake</CardTitle>
                <CardDescription>
                  Recorded {new Date(p.startedOn).toLocaleDateString()} · {p.totalSessions} sessions to date
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm leading-relaxed text-clinical-ink">
                  {p.intakeNotes}
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium">
                      Diagnosis
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.diagnosis.map((d) => (
                        <Badge key={d} variant="default">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium">
                      Modality
                    </p>
                    <p className="mt-2 text-sm text-clinical-ink">{p.modality}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium">
                    Working themes
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.themes.map((t) => (
                      <Badge key={t} variant="info">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Open items</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {p.openItems.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2 text-sm text-clinical-ink leading-relaxed"
                      >
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-[#848484]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {p.unresolved.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Unresolved</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {p.unresolved.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2 text-sm text-clinical-ink leading-relaxed"
                        >
                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {p.nextAppointment && (
                <Card className="bg-clinical-soft/50 border-dashed">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-[#848484]" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#848484]">
                        Next appointment
                      </p>
                      <p className="text-sm font-medium text-clinical-ink">
                        {new Date(p.nextAppointment).toLocaleString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Timeline tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Session history</CardTitle>
              <CardDescription>
                Click any session to view the transcript and AI-drafted note
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative">
                {patientSessions.length === 0 && (
                  <p className="px-5 py-12 text-center text-sm text-[#848484]">
                    No completed sessions yet.
                  </p>
                )}
                <ol className="relative px-6 py-4">
                  <span className="absolute left-[34px] top-6 bottom-6 w-px bg-clinical-border" />
                  {patientSessions.map((s) => (
                    <li key={s.id} className="relative pl-10 pb-6 last:pb-0">
                      <span className="absolute left-[26px] top-1.5 h-3 w-3 rounded-full bg-white border-2 border-[#848484]" />
                      <Link
                        href={`/patients/${p.id}/sessions/${s.id}`}
                        className="block rounded-lg border border-clinical-border p-4 hover:border-[#848484]/40 hover:bg-clinical-soft/50 transition"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-clinical-ink">
                                {new Date(s.date).toLocaleDateString(undefined, {
                                  weekday: "long",
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                              <span className="text-xs text-[#848484]">·</span>
                              <span className="text-xs text-[#848484] flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {s.durationMin} min
                              </span>
                            </div>
                            <p className="text-xs text-[#848484] mt-1 max-w-2xl line-clamp-2">
                              {s.note.reason}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {s.approved ? (
                              <Badge variant="success">Approved</Badge>
                            ) : (
                              <Badge variant="warning">Awaiting approval</Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-[#848484]" />
                          </div>
                        </div>
                        {s.highlights.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-clinical-border">
                            {s.highlights.map((h) => (
                              <Badge key={h} variant="info">
                                {h}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinical data tab */}
        <TabsContent value="clinical">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Demographics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row icon={<Cake className="h-4 w-4" />} label="Age" value={`${p.age}`} />
                <Row label="Gender" value={`${p.gender} (${p.pronouns})`} />
                <Row icon={<Briefcase className="h-4 w-4" />} label="Occupation" value={p.occupation} />
                <Row icon={<Mail className="h-4 w-4" />} label="Email" value={p.email} />
                <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={p.phone} />
                <Row icon={<Calendar className="h-4 w-4" />} label="Started care" value={new Date(p.startedOn).toLocaleDateString()} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk & safety</CardTitle>
                <CardDescription>Reviewed each session</CardDescription>
              </CardHeader>
              <CardContent>
                {p.riskFlags.length === 0 ? (
                  <p className="text-sm text-[#848484]">
                    No active risk flags. Routine safety screen at next session.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {p.riskFlags.map((r) => (
                      <li
                        key={r}
                        className="flex items-center gap-2 text-sm text-clinical-ink capitalize"
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[#848484] flex items-center gap-2 text-xs uppercase tracking-wider">
        {icon}
        {label}
      </span>
      <span className="text-clinical-ink text-sm font-medium text-right">
        {value}
      </span>
    </div>
  );
}
