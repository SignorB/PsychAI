import { getPatients } from "@/lib/api";
import PatientsClient from "./PatientsClient";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  let patients = [];
  try {
    const data = await getPatients();
    patients = data.patients || [];
  } catch (error) {
    console.error("Failed to fetch patients:", error);
  }

  return <PatientsClient initialPatients={patients} />;
}
