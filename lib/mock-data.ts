export type Patient = {
  id: string;
  name: string;
  initials: string;
  age: number;
  gender: "Female" | "Male" | "Non-binary";
  pronouns: string;
  email: string;
  phone: string;
  occupation: string;
  primaryConcern: string;
  diagnosis: string[];
  modality: string;
  status: "Active" | "On hold" | "Discharged";
  startedOn: string; // ISO date
  nextAppointment?: string; // ISO date-time
  totalSessions: number;
  intakeNotes: string;
  riskFlags: ("suicidal ideation" | "self-harm" | "substance use" | "trauma")[];
  openItems: string[];
  unresolved: string[];
  themes: string[];
};

export type Session = {
  id: string;
  patientId: string;
  date: string; // ISO date-time
  durationMin: number;
  modality: string;
  approved: boolean;
  transcript: { t: string; speaker: "Therapist" | "Patient"; text: string }[];
  note: {
    reason: string;
    content: string;
    observations: string;
    plan: string;
  };
  highlights: string[];
  freeNotes: string;
};

export type Appointment = {
  id: string;
  patientId: string;
  date: string; // ISO date-time
  durationMin: number;
  type: "First intake" | "Follow-up" | "Couples" | "Assessment";
  location: "In-person" | "Telehealth";
  status: "Confirmed" | "Pending" | "Tentative";
};

const today = new Date();
const iso = (d: Date) => d.toISOString();
const at = (offsetDays: number, h: number, m = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(h, m, 0, 0);
  return iso(d);
};
const dateOnly = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return iso(d).slice(0, 10);
};

export const patients: Patient[] = [
  {
    id: "p-001",
    name: "Eleanor Whitfield",
    initials: "EW",
    age: 34,
    gender: "Female",
    pronouns: "she/her",
    email: "eleanor.w@example.com",
    phone: "+1 (415) 555-0142",
    occupation: "Product designer",
    primaryConcern: "Generalised anxiety, perfectionism at work",
    diagnosis: ["GAD (F41.1)", "Burnout (Z73.0)"],
    modality: "CBT — weekly",
    status: "Active",
    startedOn: "2024-09-12",
    nextAppointment: at(0, 9, 0),
    totalSessions: 14,
    intakeNotes:
      "Eleanor presented with persistent worry, difficulty sleeping, and overinvestment in work outcomes. Reports a recent promotion that intensified self-imposed standards. No active suicidal ideation. History of one mild depressive episode at age 26.",
    riskFlags: [],
    openItems: [
      "Behavioural experiment: leaving work by 6:30pm three nights this week",
      "Track perfectionism triggers in thought-record app",
    ],
    unresolved: [
      "Conflict with manager regarding scope of new role",
      "Reluctance to discuss relationship with father",
    ],
    themes: ["Perfectionism", "Imposter feelings", "Boundary setting"],
  },
  {
    id: "p-002",
    name: "Marcus Chen",
    initials: "MC",
    age: 41,
    gender: "Male",
    pronouns: "he/him",
    email: "m.chen@example.com",
    phone: "+1 (415) 555-0177",
    occupation: "Software engineer",
    primaryConcern: "Recurrent depressive episodes, low motivation",
    diagnosis: ["MDD recurrent (F33.1)"],
    modality: "CBT + behavioural activation — bi-weekly",
    status: "Active",
    startedOn: "2024-04-03",
    nextAppointment: at(0, 11, 0),
    totalSessions: 22,
    intakeNotes:
      "Marcus reports a 6-month low mood with anhedonia and social withdrawal following a divorce. Sleep onset insomnia. Currently on sertraline 100mg (prescribed by GP). Denies SI but reports passive thoughts of 'not waking up' last month.",
    riskFlags: ["suicidal ideation"],
    openItems: [
      "Re-introduce two pleasant activities per week",
      "Continue sleep hygiene log",
    ],
    unresolved: [
      "Co-parenting communication with ex-partner",
      "Hesitancy to re-engage social network",
    ],
    themes: ["Anhedonia", "Avoidance", "Self-criticism"],
  },
  {
    id: "p-003",
    name: "Sofía Reyes",
    initials: "SR",
    age: 28,
    gender: "Female",
    pronouns: "she/her",
    email: "sofia.reyes@example.com",
    phone: "+1 (415) 555-0188",
    occupation: "Nurse, ICU",
    primaryConcern: "Post-traumatic stress following workplace incident",
    diagnosis: ["PTSD (F43.1)"],
    modality: "EMDR — weekly",
    status: "Active",
    startedOn: "2025-01-22",
    nextAppointment: at(0, 13, 30),
    totalSessions: 9,
    intakeNotes:
      "Sofía witnessed the death of a paediatric patient 8 months ago. Intrusive imagery, hypervigilance on shift, avoidance of paediatric ward. Resilient pre-morbid functioning. Strong family support.",
    riskFlags: ["trauma"],
    openItems: ["Continue resourcing exercises", "Begin EMDR phase 4 next session"],
    unresolved: ["Disclosure to partner about flashbacks"],
    themes: ["Hypervigilance", "Survivor guilt", "Avoidance"],
  },
  {
    id: "p-004",
    name: "Jonas Albrecht",
    initials: "JA",
    age: 52,
    gender: "Male",
    pronouns: "he/him",
    email: "j.albrecht@example.com",
    phone: "+1 (415) 555-0103",
    occupation: "Architect",
    primaryConcern: "Marital difficulties, anger regulation",
    diagnosis: ["Adjustment disorder (F43.2)"],
    modality: "Couples-informed individual — weekly",
    status: "Active",
    startedOn: "2024-11-08",
    nextAppointment: at(0, 15, 0),
    totalSessions: 11,
    intakeNotes:
      "Jonas referred by GP after escalating arguments at home. Reports irritability and emotional shutdown. No history of violence. Open to exploring family-of-origin patterns.",
    riskFlags: [],
    openItems: ["Practice 'time-out' technique with spouse"],
    unresolved: ["Shame around father's drinking"],
    themes: ["Emotional regulation", "Communication", "Family-of-origin"],
  },
  {
    id: "p-005",
    name: "Amelia Thornton",
    initials: "AT",
    age: 19,
    gender: "Female",
    pronouns: "she/her",
    email: "a.thornton@example.com",
    phone: "+1 (415) 555-0211",
    occupation: "University student",
    primaryConcern: "Social anxiety, panic episodes on campus",
    diagnosis: ["Social anxiety disorder (F40.10)", "Panic disorder (F41.0)"],
    modality: "CBT with exposure — weekly",
    status: "Active",
    startedOn: "2025-02-10",
    nextAppointment: at(1, 10, 0),
    totalSessions: 6,
    intakeNotes:
      "Amelia reports panic attacks before lectures, avoidance of group work, fear of judgement. Lives in dorm. No substance use. Strong therapeutic alliance forming.",
    riskFlags: [],
    openItems: ["Attend one tutorial without leaving early"],
    unresolved: ["Disclosure to academic advisor"],
    themes: ["Avoidance", "Catastrophic thinking", "Self-image"],
  },
  {
    id: "p-006",
    name: "Devon Parker",
    initials: "DP",
    age: 37,
    gender: "Non-binary",
    pronouns: "they/them",
    email: "devon.p@example.com",
    phone: "+1 (415) 555-0166",
    occupation: "Freelance illustrator",
    primaryConcern: "Identity exploration, low self-worth",
    diagnosis: ["Persistent depressive disorder (F34.1)"],
    modality: "Schema therapy — weekly",
    status: "Active",
    startedOn: "2024-07-19",
    nextAppointment: at(1, 12, 0),
    totalSessions: 18,
    intakeNotes:
      "Devon entered therapy following a creative block and recurring feelings of emptiness. Mapping early maladaptive schemas: defectiveness/shame and emotional deprivation prominent.",
    riskFlags: [],
    openItems: ["Continue mode dialogue homework"],
    unresolved: ["Parental disclosure of identity"],
    themes: ["Defectiveness schema", "Inner critic", "Authenticity"],
  },
  {
    id: "p-007",
    name: "Priya Raman",
    initials: "PR",
    age: 46,
    gender: "Female",
    pronouns: "she/her",
    email: "p.raman@example.com",
    phone: "+1 (415) 555-0199",
    occupation: "Surgeon",
    primaryConcern: "Sleep disturbance, work-related stress",
    diagnosis: ["Insomnia disorder (G47.00)", "Adjustment disorder"],
    modality: "CBT-I — weekly",
    status: "Active",
    startedOn: "2025-03-05",
    nextAppointment: at(2, 8, 30),
    totalSessions: 4,
    intakeNotes:
      "Priya reports 3 months of fragmented sleep, on-call rotation, two cups of espresso after 4pm. Excellent insight, motivated for behavioural change.",
    riskFlags: [],
    openItems: ["Maintain stimulus-control protocol", "Caffeine cut-off 2pm"],
    unresolved: [],
    themes: ["Sleep restriction", "Workload boundaries"],
  },
  {
    id: "p-008",
    name: "Liam O'Sullivan",
    initials: "LO",
    age: 24,
    gender: "Male",
    pronouns: "he/him",
    email: "liam.os@example.com",
    phone: "+1 (415) 555-0150",
    occupation: "Bartender, musician",
    primaryConcern: "Alcohol use, mood swings",
    diagnosis: ["Alcohol use disorder, mild (F10.10)"],
    modality: "Motivational interviewing + CBT — weekly",
    status: "On hold",
    startedOn: "2024-12-01",
    totalSessions: 8,
    intakeNotes:
      "Liam ambivalent about reducing alcohol use. Frequent late nights tied to work. Family history of dependence. Currently between sessions; pending re-engagement.",
    riskFlags: ["substance use"],
    openItems: ["Decisional balance worksheet"],
    unresolved: ["Mother's hospitalisation last spring"],
    themes: ["Ambivalence", "Identity & music scene", "Family history"],
  },
  {
    id: "p-009",
    name: "Hannah Berg",
    initials: "HB",
    age: 31,
    gender: "Female",
    pronouns: "she/her",
    email: "h.berg@example.com",
    phone: "+1 (415) 555-0122",
    occupation: "Lawyer",
    primaryConcern: "Postpartum mood, identity shift",
    diagnosis: ["Postpartum depression (F53.0)"],
    modality: "IPT — weekly",
    status: "Active",
    startedOn: "2025-01-05",
    nextAppointment: at(2, 14, 0),
    totalSessions: 7,
    intakeNotes:
      "Hannah, 5 months postpartum, reports tearfulness, ambivalence about returning to work, feelings of inadequacy as a mother. No SI. Supportive partner.",
    riskFlags: [],
    openItems: ["Schedule 'protected time' twice/week"],
    unresolved: ["Career trajectory and partnership timeline"],
    themes: ["Role transition", "Identity", "Self-compassion"],
  },
  {
    id: "p-010",
    name: "Tomás Aguilar",
    initials: "TA",
    age: 58,
    gender: "Male",
    pronouns: "he/him",
    email: "t.aguilar@example.com",
    phone: "+1 (415) 555-0190",
    occupation: "Retired teacher",
    primaryConcern: "Grief following loss of spouse",
    diagnosis: ["Prolonged grief disorder (F43.81)"],
    modality: "Grief-focused therapy — bi-weekly",
    status: "Active",
    startedOn: "2024-10-21",
    nextAppointment: at(3, 10, 30),
    totalSessions: 12,
    intakeNotes:
      "Tomás lost his wife of 32 years to cancer 14 months ago. Reports yearning, avoidance of shared spaces, slow re-engagement with grandchildren. Resilient values orientation.",
    riskFlags: [],
    openItems: ["Continue letter to deceased exercise"],
    unresolved: ["Visit to gravesite with family"],
    themes: ["Yearning", "Meaning making", "Continuing bonds"],
  },
  {
    id: "p-011",
    name: "Isabelle Moreau",
    initials: "IM",
    age: 26,
    gender: "Female",
    pronouns: "she/her",
    email: "i.moreau@example.com",
    phone: "+1 (415) 555-0112",
    occupation: "Marketing associate",
    primaryConcern: "Body image, restrictive eating tendencies",
    diagnosis: ["OSFED — atypical anorexia nervosa"],
    modality: "CBT-E — weekly",
    status: "Active",
    startedOn: "2025-02-18",
    nextAppointment: at(3, 13, 0),
    totalSessions: 5,
    intakeNotes:
      "Isabelle restricts intake during weekdays, weight in normal range. Body checking behaviours daily. Co-managed with dietitian. No purging.",
    riskFlags: [],
    openItems: ["Regular eating pattern: 3 meals + 2 snacks"],
    unresolved: ["Disclosure to family"],
    themes: ["Body image", "Control", "Perfectionism"],
  },
  {
    id: "p-012",
    name: "Noah Kapoor",
    initials: "NK",
    age: 22,
    gender: "Male",
    pronouns: "he/him",
    email: "n.kapoor@example.com",
    phone: "+1 (415) 555-0173",
    occupation: "Graduate student",
    primaryConcern: "Obsessive-compulsive symptoms",
    diagnosis: ["OCD (F42.2)"],
    modality: "ERP — weekly",
    status: "Active",
    startedOn: "2024-12-12",
    nextAppointment: at(4, 9, 30),
    totalSessions: 10,
    intakeNotes:
      "Noah reports contamination obsessions, hand-washing rituals up to 40x/day. High insight. Family supportive. SSRI titration ongoing with psychiatrist.",
    riskFlags: [],
    openItems: ["ERP hierarchy item #4 daily"],
    unresolved: ["Reassurance-seeking from mother"],
    themes: ["Contamination", "Reassurance-seeking", "Tolerating uncertainty"],
  },
];

export const appointments: Appointment[] = [
  { id: "a-1", patientId: "p-001", date: at(0, 9, 0), durationMin: 50, type: "Follow-up", location: "In-person", status: "Confirmed" },
  { id: "a-2", patientId: "p-002", date: at(0, 11, 0), durationMin: 50, type: "Follow-up", location: "Telehealth", status: "Confirmed" },
  { id: "a-3", patientId: "p-003", date: at(0, 13, 30), durationMin: 60, type: "Follow-up", location: "In-person", status: "Confirmed" },
  { id: "a-4", patientId: "p-004", date: at(0, 15, 0), durationMin: 50, type: "Follow-up", location: "In-person", status: "Confirmed" },
  { id: "a-5", patientId: "p-005", date: at(1, 10, 0), durationMin: 50, type: "Follow-up", location: "Telehealth", status: "Confirmed" },
  { id: "a-6", patientId: "p-006", date: at(1, 12, 0), durationMin: 50, type: "Follow-up", location: "In-person", status: "Confirmed" },
  { id: "a-7", patientId: "p-007", date: at(2, 8, 30), durationMin: 50, type: "Follow-up", location: "Telehealth", status: "Confirmed" },
  { id: "a-8", patientId: "p-009", date: at(2, 14, 0), durationMin: 50, type: "Follow-up", location: "In-person", status: "Pending" },
  { id: "a-9", patientId: "p-010", date: at(3, 10, 30), durationMin: 50, type: "Follow-up", location: "In-person", status: "Confirmed" },
  { id: "a-10", patientId: "p-011", date: at(3, 13, 0), durationMin: 50, type: "Follow-up", location: "Telehealth", status: "Confirmed" },
  { id: "a-11", patientId: "p-012", date: at(4, 9, 30), durationMin: 50, type: "Follow-up", location: "In-person", status: "Confirmed" },
  { id: "a-12", patientId: "p-001", date: at(7, 9, 0), durationMin: 50, type: "Follow-up", location: "In-person", status: "Tentative" },
  { id: "a-13", patientId: "p-008", date: at(5, 16, 0), durationMin: 50, type: "Follow-up", location: "In-person", status: "Tentative" },
];

export const sessions: Session[] = [
  {
    id: "s-001",
    patientId: "p-001",
    date: at(-7, 9, 0),
    durationMin: 50,
    modality: "CBT",
    approved: true,
    transcript: [
      { t: "00:00:12", speaker: "Therapist", text: "Welcome back, Eleanor. How has the week been since we last spoke?" },
      { t: "00:00:20", speaker: "Patient", text: "Honestly, exhausting. The promotion went through, and now I feel like I'm constantly proving I deserve it." },
      { t: "00:00:38", speaker: "Therapist", text: "That makes sense — a new role often reactivates old standards. Can you walk me through a moment this week when you noticed that pressure?" },
      { t: "00:01:02", speaker: "Patient", text: "Tuesday. I stayed until 9pm rewriting a deck because I imagined the team would think it was sloppy. Nobody asked me to." },
      { t: "00:01:24", speaker: "Therapist", text: "What went through your mind right before you decided to stay?" },
      { t: "00:01:30", speaker: "Patient", text: "If this isn't perfect, they'll regret promoting me." },
      { t: "00:01:45", speaker: "Therapist", text: "That's a powerful thought. Let's place it on a thought record together." },
      { t: "00:02:10", speaker: "Patient", text: "I know it's catastrophising. But in the moment it feels true." },
      { t: "00:02:30", speaker: "Therapist", text: "Of course — the body believes what the mind insists on. What evidence do we have for and against it?" },
      { t: "00:03:05", speaker: "Patient", text: "Against: I've had three positive reviews. For: my manager hasn't checked in much." },
      { t: "00:03:20", speaker: "Therapist", text: "Silence from leadership is ambiguous data, not negative data. Could we design a small experiment around that this week?" },
    ],
    note: {
      reason:
        "Scheduled follow-up to review week's affect, sleep, and behavioural experiments around perfectionism following recent promotion.",
      content:
        "Patient described a high-pressure week marked by extended work hours and a thought pattern of 'if this isn't perfect, they'll regret promoting me.' Engaged collaboratively with thought-record process. Sleep averaged 5.5 hours/night. Continues to use grounding exercises before bed. No SI/HI.",
      observations:
        "Affect: anxious but congruent. Eye contact stable. Insight strong. Engaged readily with cognitive restructuring. Mild physical tension noted in shoulders.",
      plan:
        "1) Behavioural experiment: leave office by 18:30 three nights this week and log outcome. 2) Continue thought records (target: 3 entries). 3) Re-introduce 20-minute walk pre-dinner. 4) Next session in 7 days; re-evaluate sleep and consider sleep-hygiene module.",
    },
    highlights: [
      "Catastrophic thought: 'they'll regret promoting me'",
      "Sleep declining — 5.5 hr average",
      "Strong engagement with thought records",
    ],
    freeNotes:
      "Consider introducing self-compassion module next session. Eleanor responsive to behavioural experiments — keep momentum.",
  },
  {
    id: "s-002",
    patientId: "p-001",
    date: at(-14, 9, 0),
    durationMin: 50,
    modality: "CBT",
    approved: true,
    transcript: [
      { t: "00:00:08", speaker: "Therapist", text: "Good morning. Last week we discussed the upcoming promotion announcement. How did that go?" },
      { t: "00:00:18", speaker: "Patient", text: "It happened. I was relieved for about ten minutes, then panic kicked in." },
    ],
    note: {
      reason: "Follow-up — anticipatory anxiety around promotion announcement.",
      content:
        "Promotion confirmed. Initial relief gave way to anticipatory anxiety. Discussed cognitive distortions and re-framed evidence base.",
      observations: "Mood: anxious. Affect reactive but appropriate. Good rapport.",
      plan: "Introduce thought-record exercise. Re-evaluate sleep next session.",
    },
    highlights: ["Promotion confirmed", "Anticipatory anxiety pattern"],
    freeNotes: "",
  },
  {
    id: "s-003",
    patientId: "p-002",
    date: at(-14, 11, 0),
    durationMin: 50,
    modality: "CBT + BA",
    approved: true,
    transcript: [
      { t: "00:00:10", speaker: "Therapist", text: "Hi Marcus. How was the week?" },
      { t: "00:00:18", speaker: "Patient", text: "Quieter. I went to my son's football match — first one in months." },
      { t: "00:00:32", speaker: "Therapist", text: "That's significant. What did you notice in your body before going?" },
      { t: "00:00:45", speaker: "Patient", text: "Heavy. I almost cancelled twice. But I told myself I'd just go for the first half." },
    ],
    note: {
      reason: "Bi-weekly follow-up; review behavioural activation plan.",
      content:
        "Marcus attended son's football match — first social activity in 6 weeks. Reports passive enjoyment. Sleep onset still 60-90 minutes. Continues sertraline 100mg.",
      observations: "Mood: low but reactive. Brightened when discussing son. No SI.",
      plan: "Add second pleasant activity this week (coffee with brother). Continue sleep log. Re-evaluate medication response with GP at week 12.",
    },
    highlights: [
      "First social activity in 6 weeks — football match",
      "Passive thoughts of 'not waking up' resolved",
      "Sleep onset remains delayed",
    ],
    freeNotes: "Behavioural activation gaining traction. Watch for autumn seasonal dip.",
  },
];

export function getPatient(id: string) {
  return patients.find((p) => p.id === id);
}

export function getPatientSessions(id: string) {
  return sessions
    .filter((s) => s.patientId === id)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getSession(id: string) {
  return sessions.find((s) => s.id === id);
}

export function getTodayAppointments() {
  const t = new Date();
  return appointments
    .filter((a) => {
      const d = new Date(a.date);
      return (
        d.getDate() === t.getDate() &&
        d.getMonth() === t.getMonth() &&
        d.getFullYear() === t.getFullYear()
      );
    })
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

export { dateOnly };
