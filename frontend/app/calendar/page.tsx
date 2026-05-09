import { getSessions } from "@/lib/api";
import CalendarClient from "./CalendarClient";

export default async function CalendarPage() {
  let sessions = [];
  try {
    const data = await getSessions();
    sessions = data.sessions || [];
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
  }

  return <CalendarClient initialSessions={sessions} />;
}
