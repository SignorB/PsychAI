import { getPatients, getSessions } from "@/lib/api";
import PendingClient from "./PendingClient";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  let sessions: any[] = [];
  let patients: any[] = [];

  try {
    const [sessionsData, patientsData] = await Promise.all([
      getSessions(),
      getPatients(),
    ]);
    sessions = sessionsData.sessions || [];
    patients = patientsData.patients || [];
  } catch (error) {
    console.error("Failed to fetch pending sessions:", error);
  }

  return <PendingClient initialSessions={sessions} patients={patients} />;
}
