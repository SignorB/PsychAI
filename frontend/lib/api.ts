const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getPatients() {
  const res = await fetch(`${API_URL}/patients`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch patients");
  return res.json();
}

export async function getSessions() {
  const res = await fetch(`${API_URL}/sessions`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

export async function getPatient(patientId: string) {
  const res = await fetch(`${API_URL}/patients/${patientId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch patient");
  return res.json();
}

export async function getPatientSessions(patientId: string) {
  const res = await fetch(`${API_URL}/patients/${patientId}/sessions`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch patient sessions");
  return res.json();
}

export async function createPatientSession(patientId: string) {
  const res = await fetch(`${API_URL}/patients/${patientId}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}
