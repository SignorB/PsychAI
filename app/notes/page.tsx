"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  StickyNote,
  Mic,
  Square,
  Save,
  Link2,
  Plus,
  Search,
  Trash2,
  Calendar,
  User as UserIcon,
  Lock,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { appointments, getPatient, patients } from "@/lib/mock-data";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  linkedPatientId?: string;
  linkedAppointmentId?: string;
  hasAudio?: boolean;
};

const SEED: Note[] = [
  {
    id: "n-001",
    title: "Reflection — Eleanor's perfectionism pattern",
    body:
      "Notice the recurring 'all-or-nothing' framing right before meetings with her manager. Worth introducing a behavioural experiment around micro-imperfections (typos in non-critical emails) to test catastrophic predictions.\n\nFollow up: bring up self-compassion module next session.",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    linkedPatientId: "p-001",
    hasAudio: false,
  },
  {
    id: "n-002",
    title: "Voice memo — Marcus, post-session",
    body:
      "He brightened visibly when describing his son's match. Small but real shift. Watch for autumn dip — pre-emptively reinforce activity scheduling.",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    linkedPatientId: "p-002",
    hasAudio: true,
  },
  {
    id: "n-003",
    title: "Supervision prep",
    body:
      "Cases to bring to Friday's supervision: Sofía (EMDR phasing question), Liam (re-engagement strategy after 4-week break).",
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(SEED);
  const [activeId, setActiveId] = useState<string>(SEED[0].id);
  const [recording, setRecording] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [q, setQ] = useState("");

  const active = notes.find((n) => n.id === activeId)!;

  const filtered = useMemo(
    () =>
      notes
        .filter(
          (n) =>
            !q ||
            n.title.toLowerCase().includes(q.toLowerCase()) ||
            n.body.toLowerCase().includes(q.toLowerCase())
        )
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [notes, q]
  );

  function update(patch: Partial<Note>) {
    setNotes((all) =>
      all.map((n) =>
        n.id === activeId
          ? { ...n, ...patch, updatedAt: new Date().toISOString() }
          : n
      )
    );
  }

  function createNote() {
    const id = `n-${Date.now()}`;
    const now = new Date().toISOString();
    const fresh: Note = {
      id,
      title: "Untitled note",
      body: "",
      createdAt: now,
      updatedAt: now,
    };
    setNotes((all) => [fresh, ...all]);
    setActiveId(id);
  }

  function deleteNote(id: string) {
    setNotes((all) => all.filter((n) => n.id !== id));
    if (id === activeId && notes.length > 1) {
      const next = notes.find((n) => n.id !== id);
      if (next) setActiveId(next.id);
    }
  }

  const linkedPatient = active.linkedPatientId
    ? getPatient(active.linkedPatientId)
    : null;
  const linkedAppt = active.linkedAppointmentId
    ? appointments.find((a) => a.id === active.linkedAppointmentId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">
            Free notes
          </h1>
          <p className="text-sm text-[#848484] mt-1">
            Capture thoughts by keyboard or voice · link any note to a patient or session
          </p>
        </div>
        <Button onClick={createNote}>
          <Plus className="h-4 w-4" /> New note
        </Button>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Notes list */}
        <Card className="h-fit">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#848484]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search notes…"
                className="w-full h-9 pl-9 pr-3 rounded-md bg-clinical-soft border border-transparent text-sm placeholder:text-[#848484] focus:outline-none focus:bg-white focus:border-clinical-border"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-clinical-border max-h-[640px] overflow-y-auto">
              {filtered.map((n) => {
                const p = n.linkedPatientId ? getPatient(n.linkedPatientId) : null;
                const isActive = n.id === activeId;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => setActiveId(n.id)}
                      className={`w-full text-left px-4 py-3 transition ${
                        isActive
                          ? "bg-clinical-soft"
                          : "hover:bg-clinical-soft/60"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-clinical-ink truncate">
                              {n.title || "Untitled"}
                            </p>
                            {n.hasAudio && (
                              <Mic className="h-3 w-3 text-[#848484] shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-[#848484] mt-0.5 line-clamp-2">
                            {n.body || "Empty note"}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {p && (
                              <Badge variant="info">
                                <UserIcon className="h-2.5 w-2.5" /> {p.name.split(" ")[0]}
                              </Badge>
                            )}
                            <span className="text-[10px] text-[#848484]">
                              {new Date(n.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-4 py-8 text-xs text-[#848484] text-center">
                  No notes match your search.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Editor */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <input
                value={active.title}
                onChange={(e) => update({ title: e.target.value })}
                className="flex-1 text-lg font-bold tracking-tight text-clinical-ink bg-transparent focus:outline-none"
                placeholder="Note title…"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant={recording ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => {
                    setRecording((r) => !r);
                    if (!recording) update({ hasAudio: true });
                  }}
                >
                  {recording ? (
                    <>
                      <Square className="h-3.5 w-3.5" /> Stop
                    </>
                  ) : (
                    <>
                      <Mic className="h-3.5 w-3.5" /> Dictate
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
                  <Link2 className="h-3.5 w-3.5" /> Link
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteNote(active.id)}
                  aria-label="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recording && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 flex items-center gap-2 text-xs text-rose-800">
                  <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                  Recording on-device · {Math.floor(Math.random() * 30) + 5}s
                </div>
              )}

              {(linkedPatient || linkedAppt) && (
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-md bg-clinical-soft/60 border border-clinical-border">
                  <span className="text-[11px] uppercase tracking-wider text-[#848484]">
                    Linked to
                  </span>
                  {linkedPatient && (
                    <Link href={`/patients/${linkedPatient.id}`}>
                      <Badge variant="info" className="cursor-pointer hover:opacity-80">
                        <UserIcon className="h-3 w-3" /> {linkedPatient.name}
                      </Badge>
                    </Link>
                  )}
                  {linkedAppt && (
                    <Badge variant="default">
                      <Calendar className="h-3 w-3" />
                      {new Date(linkedAppt.date).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Badge>
                  )}
                  <button
                    onClick={() =>
                      update({
                        linkedPatientId: undefined,
                        linkedAppointmentId: undefined,
                      })
                    }
                    className="ml-auto text-[11px] text-[#848484] hover:text-clinical-ink"
                  >
                    Unlink
                  </button>
                </div>
              )}

              <textarea
                value={active.body}
                onChange={(e) => update({ body: e.target.value })}
                placeholder="Start typing or press Dictate to capture by voice…"
                className="w-full min-h-[420px] rounded-md border border-clinical-border bg-white p-4 text-sm leading-relaxed text-clinical-ink placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-clinical-border resize-y"
              />

              <div className="flex items-center justify-between text-xs text-[#848484]">
                <span className="flex items-center gap-2">
                  <Lock className="h-3 w-3" /> Stored locally · auto-saved
                </span>
                <span>
                  {active.body.length} characters · updated{" "}
                  {new Date(active.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Link dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Link this note
          </DialogTitle>
          <DialogDescription>
            Connect this note to a patient and, optionally, a specific session.
          </DialogDescription>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#848484] font-medium">
              Patient
            </label>
            <select
              value={active.linkedPatientId ?? ""}
              onChange={(e) =>
                update({
                  linkedPatientId: e.target.value || undefined,
                  linkedAppointmentId: undefined,
                })
              }
              className="mt-1.5 w-full h-10 px-3 rounded-md border border-clinical-border bg-white text-sm text-clinical-ink"
            >
              <option value="">— No patient —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#848484] font-medium">
              Appointment (optional)
            </label>
            <select
              value={active.linkedAppointmentId ?? ""}
              onChange={(e) =>
                update({ linkedAppointmentId: e.target.value || undefined })
              }
              disabled={!active.linkedPatientId}
              className="mt-1.5 w-full h-10 px-3 rounded-md border border-clinical-border bg-white text-sm text-clinical-ink disabled:bg-clinical-soft disabled:text-[#848484]"
            >
              <option value="">— No appointment —</option>
              {appointments
                .filter((a) => a.patientId === active.linkedPatientId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.date).toLocaleString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {a.type}
                  </option>
                ))}
            </select>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setLinkOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setLinkOpen(false)}>
            <Save className="h-4 w-4" /> Save link
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
