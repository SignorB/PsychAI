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
  ChevronRight,
  CheckCircle2,
  Clock,
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
import { getPatient, getPatientSessions } from "@/lib/api";
import StartSessionButton from "./StartSessionButton";
import { DashboardPreSessionRecap } from "../../DashboardPreSessionRecap";

export default async function PatientCard({ params }: { params: { id: string } }) {
  let pData: any = null;
  let sessionsData: any = { sessions: [] };

  try {
    const [patientRes, sessionsRes] = await Promise.all([
      getPatient(params.id),
      getPatientSessions(params.id),
    ]);
    pData = patientRes;
    sessionsData = sessionsRes;
  } catch (error) {
    console.error("Failed to load patient data:", error);
    notFound();
  }

  if (!pData) notFound();

  // Handle missing fields with safe fallbacks
  const patientSessions = sessionsData.sessions || [];
  const pId = pData.id || pData.patient_id || params.id;
  const pName = pData.name || `Patient ${pId}`;
  const pInitials =
    pData.initials ||
    pName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join("")
      .toUpperCase() ||
    "PT";
  const pStatus = pData.status || "Active";
  const pRiskFlags = pData.riskFlags || [];
  const pAge = pData.age || "N/A";
  const pPronouns = pData.pronouns || "N/A";
  const pOccupation = pData.occupation || "N/A";
  const pEmail = pData.email || "No email";
  const pPhone = pData.phone || "No phone";
  const pStartedOn = pData.startedOn || new Date().toISOString();
  const pTotalSessions = patientSessions.length;
  const pIntakeNotes =
    pData.intake_notes || pData.intakeNotes || "No intake notes available.";
  const pHistoryReport = pData.patient_history_report || "";
  const pHistoryReportGeneratedAt = pData.patient_history_report_generated_at || "";
  const pDiagnosis = pData.diagnosis || (pData.condition ? [pData.condition] : []);
  const pModality = pData.modality || "Not specified";
  const pThemes = pData.themes || [];
  const pOpenItems = pData.openItems || [];
  const pUnresolved = pData.unresolved || [];
  
  const now = new Date();
  const upcomingSessions = patientSessions
    .filter((s: any) => new Date(s.date) > now)
    .sort((a: any, b: any) => +new Date(a.date) - +new Date(b.date));
  const nextSession = upcomingSessions.length > 0 ? upcomingSessions[0] : null;
  const pNextAppointment = pData.nextAppointment || (nextSession ? nextSession.date : null);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[#848484]">
        <Link href="/patients" className="hover:text-clinical-ink flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          Patients
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-clinical-ink font-medium">{pName}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-clinical-soft border border-clinical-border flex items-center justify-center text-lg font-bold text-clinical-ink">
            {pInitials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">
                {pName}
              </h1>
              <Badge variant={pStatus === "Active" ? "success" : "warning"}>
                {pStatus}
              </Badge>
              {pRiskFlags.length > 0 && (
                <Badge variant="warning">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Risk flag
                </Badge>
              )}
            </div>
            <p className="text-sm text-[#848484] mt-1">
              {pAge} years old
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-[#848484]">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> {pEmail}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {pPhone}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/patients/${pId}/referral`}>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Referral letter
            </Button>
          </Link>
          <StartSessionButton patientId={pId} />
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
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                <CardTitle>Initial intake</CardTitle>
                <CardDescription>
                  Recorded {new Date(pStartedOn).toLocaleDateString()} · {pTotalSessions} sessions to date
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm leading-relaxed text-clinical-ink">
                  {pIntakeNotes}
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium">
                      Diagnosis
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {pDiagnosis.length > 0 ? pDiagnosis.map((d: string) => (
                        <Badge key={d} variant="default">
                          {d}
                        </Badge>
                      )) : <span className="text-sm text-[#848484]">None specified</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium">
                      Modality
                    </p>
                    <p className="mt-2 text-sm text-clinical-ink">{pModality}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#848484] font-medium">
                    Working themes
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {pThemes.length > 0 ? pThemes.map((t: string) => (
                      <Badge key={t} variant="info">
                        {t}
                      </Badge>
                    )) : <span className="text-sm text-[#848484]">No themes identified</span>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="primary" className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold tracking-wider">
                    <Sparkles className="h-3 w-3" />
                    AI SUMMARY
                  </Badge>
                </div>
                <CardTitle>Patient history</CardTitle>
                <CardDescription>
                  Synthesized from initial intake and {pTotalSessions} session notes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pHistoryReport ? (
                  <div className="space-y-3">
                    <p className="text-sm leading-relaxed text-clinical-ink whitespace-pre-wrap">
                      {pHistoryReport}
                    </p>
                    {pHistoryReportGeneratedAt && (
                      <p className="text-[11px] text-[#848484]">
                        Updated {new Date(pHistoryReportGeneratedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-[#848484]">
                    The longitudinal patient history report will be generated after a session note is confirmed by the clinician.
                  </p>
                )}
              </CardContent>
            </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Open items</CardTitle>
                </CardHeader>
                <CardContent>
                  {pOpenItems.length > 0 ? (
                    <ul className="space-y-2">
                      {pOpenItems.map((item: string, i: number) => (
                        <li
                          key={i}
                          className="flex gap-2 text-sm text-clinical-ink leading-relaxed"
                        >
                          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-[#848484]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[#848484]">No open items.</p>
                  )}
                </CardContent>
              </Card>

              {pUnresolved.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Unresolved</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {pUnresolved.map((item: string, i: number) => (
                        <li
                          key={i}
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

              <Card className="bg-gradient-to-br from-[#FCFBFE] to-clinical-soft/40 border-clinical-border flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="primary" className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold tracking-wider">
                      <Sparkles className="h-3 w-3" />
                      PRE-SESSION RECAP
                    </Badge>
                  </div>
                  <CardTitle className="text-[18px]">Next Appointment</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 mt-1.5 text-[13px]">
                    <Calendar className="h-3 w-3" strokeWidth={1.75} />
                    {pNextAppointment ? (
                      <>
                        {new Date(pNextAppointment).toLocaleString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" "}· 50 min
                      </>
                    ) : (
                      "Not scheduled yet"
                    )}
                  </CardDescription>
                </CardHeader>
                  <DashboardPreSessionRecap
                    patient={{
                      id: Number(pId),
                      name: pData.name,
                      surname: pData.surname,
                      condition: pData.condition,
                    }}
                    session={nextSession}
                    showPatientLink={false}
                    className="min-h-[260px]"
                  />
                </Card>
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
                  <div className="flex flex-col items-center justify-center p-12 bg-clinical-soft/30 border-y border-dashed border-clinical-border">
                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border border-clinical-border shadow-sm mb-4">
                      <Clock className="h-5 w-5 text-[#848484]" />
                    </div>
                    <h3 className="text-lg font-medium text-clinical-ink">No sessions yet</h3>
                    <p className="text-sm text-[#848484] mt-1 mb-6 text-center max-w-sm">
                      This patient hasn't had any sessions yet. Start a new session to record the conversation and generate clinical notes.
                    </p>
                    <StartSessionButton patientId={pId} />
                  </div>
                )}
                {patientSessions.length > 0 && (
                  <ol className="relative px-6 py-4">
                    <span className="absolute left-[34px] top-6 bottom-6 w-px bg-clinical-border" />
                    {patientSessions.map((s: any) => (
                      <li key={s.id} className="relative pl-10 pb-6 last:pb-0">
                        <span className="absolute left-[26px] top-1.5 h-3 w-3 rounded-full bg-white border-2 border-[#848484]" />
                        <Link
                          href={`/patients/${pId}/sessions/${s.id}`}
                          className="block rounded-lg border border-clinical-border p-4 hover:border-[#848484]/40 hover:bg-clinical-soft/50 transition"
                        >
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-clinical-ink">
                                  {new Date(s.date || new Date()).toLocaleDateString(undefined, {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </p>
                                <span className="text-xs text-[#848484]">·</span>
                                <span className="text-xs text-[#848484] flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {s.durationMin || 60} min
                                </span>
                              </div>
                              <p className="text-xs text-[#848484] mt-1 max-w-2xl line-clamp-2">
                                {s.clinical_note || s.note?.reason || "No summary available"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {s.clinical_note || s.approved ? (
                                <Badge variant="success">Approved</Badge>
                              ) : (
                                <Badge variant="warning">Awaiting approval</Badge>
                              )}
                              <ChevronRight className="h-4 w-4 text-[#848484]" />
                            </div>
                          </div>
                          {s.highlights && s.highlights.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-clinical-border">
                              {s.highlights.map((h: string) => (
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
                )}
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
                <Row icon={<Cake className="h-4 w-4" />} label="Age" value={`${pAge}`} />
                <Row label="Gender" value={`${pData.gender || 'Unknown'} (${pPronouns})`} />
                <Row icon={<Briefcase className="h-4 w-4" />} label="Occupation" value={pOccupation} />
                <Row icon={<Mail className="h-4 w-4" />} label="Email" value={pEmail} />
                <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={pPhone} />
                <Row icon={<Calendar className="h-4 w-4" />} label="Started care" value={new Date(pStartedOn).toLocaleDateString()} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk & safety</CardTitle>
                <CardDescription>Reviewed each session</CardDescription>
              </CardHeader>
              <CardContent>
                {pRiskFlags.length === 0 ? (
                  <p className="text-sm text-[#848484]">
                    No active risk flags. Routine safety screen at next session.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {pRiskFlags.map((r: string) => (
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
