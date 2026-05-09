import { getSessions, getPatients } from "@/lib/api";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  let sessions = [];
  let patients = [];
  try {
    const [sessionsData, patientsData] = await Promise.all([
      getSessions(),
      getPatients()
    ]);
    sessions = sessionsData.sessions || [];
    patients = patientsData.patients || [];
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }

  return <CalendarClient initialSessions={sessions} initialPatients={patients} />;
}
