const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL;
const INTERNAL_API_URL = process.env.INTERNAL_API_URL;
const API_PORT = process.env.NEXT_PUBLIC_API_PORT || "8000";

function getApiUrl() {
  if (typeof window !== "undefined") {
    if (CONFIGURED_API_URL) return CONFIGURED_API_URL;
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
  }
  if (INTERNAL_API_URL) return INTERNAL_API_URL;
  if (CONFIGURED_API_URL?.startsWith("http")) return CONFIGURED_API_URL;
  return `http://localhost:${API_PORT}`;
}

export async function getPatients() {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/patients`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch patients");
  return res.json();
}

export async function getSessions() {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/sessions`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

export async function getPatient(patientId: string) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/patients/${patientId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch patient");
  return res.json();
}

export async function getPatientSessions(patientId: string) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/patients/${patientId}/sessions`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch patient sessions");
  return res.json();
}

export async function getPatientSession(patientId: string, sessionId: string) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/patients/${patientId}/sessions/${sessionId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch patient session");
  return res.json();
}

export async function createPatient(payload: {
  name: string;
  surname?: string;
  age: number;
  condition: string;
  address?: string;
  email?: string;
  phone?: string;
  status?: "Active" | "On hold" | "Discharged";
  is_active?: boolean;
  referral_letter?: string;
  intake_notes?: string;
}) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/patients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create patient");
  return res.json();
}

export async function createPatientSession(patientId: string, payload?: {
  date: string;
  start_time: string;
  end_time?: string;
}) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/patients/${patientId}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export async function generateSessionNote(
  patientId: string,
  sessionId: string,
  payload: {
    transcript?: string;
    model_profile?: string;
  }
) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/patients/${patientId}/sessions/${sessionId}/generate-note`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_profile: "qwen",
      ...payload,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to generate note: ${text}`);
  }
  return res.json();
}

export async function updateSessionNote(
  patientId: string,
  sessionId: string,
  clinicalNote: string,
) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/patients/${patientId}/sessions/${sessionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ clinical_note: clinicalNote }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to save note: ${text}`);
  }
  return res.json();
}

export async function generatePreSessionRecap(patientId: string, sessionId: string) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/patients/${patientId}/sessions/${sessionId}/pre-session-recap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_profile: "qwen",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to generate pre-session recap: ${text}`);
  }
  return res.json();
}

export async function transcribeSessionAudio(
  patientId: string,
  sessionId: string,
  audio: Blob,
  options: {
    filename?: string;
    append?: boolean;
  } = {}
) {
  const API_URL = getApiUrl();
  const formData = new FormData();
  formData.append("audio", audio, options.filename || "session-recording.webm");
  formData.append("append", options.append ? "true" : "false");

  const res = await fetch(`${API_URL}/patients/${patientId}/sessions/${sessionId}/transcribe`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to transcribe audio: ${text}`);
  }
  return res.json();
}

export async function askPatient(patientId: string, question: string) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/patients/${patientId}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      model_profile: "qwen",
      top_k: 5,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to ask patient history: ${text}`);
  }
  return res.json();
}

export async function reindexSearchSources() {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/search/reindex`, {
    method: "POST",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to reindex search sources: ${text}`);
  }
  return res.json();
}

export async function semanticSearch(payload: {
  query: string;
  patient_id?: number;
  top_k?: number;
  model_profile?: string;
}) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/search/semantic`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_profile: "qwen",
      top_k: 10,
      ...payload,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to run semantic search: ${text}`);
  }
  return res.json();
}

export async function approveSession(patientId: string, sessionId: string) {
  const API_URL = getApiUrl();
  const res = await fetch(`${API_URL}/patients/${patientId}/sessions/${sessionId}/approve`, {
    method: "POST",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to approve session: ${text}`);
  }
  return res.json();
}
