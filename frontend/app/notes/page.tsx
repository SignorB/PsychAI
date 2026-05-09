"use client";

import { useMemo, useState } from "react";
import {
  Lock,
  Mic,
  Plus,
  Save,
  Search,
  Square,
  StickyNote,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  hasAudio?: boolean;
};

const SEED: Note[] = [
  {
    id: "n-local-001",
    title: "Clinical reflection",
    body:
      "Local scratch note. Patient linking will be wired to backend records once the annotation endpoint is finalized.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(SEED);
  const [activeId, setActiveId] = useState<string>(SEED[0].id);
  const [recording, setRecording] = useState(false);
  const [q, setQ] = useState("");

  const active = notes.find((note) => note.id === activeId) || notes[0];

  const filtered = useMemo(
    () =>
      notes
        .filter(
          (note) =>
            !q ||
            note.title.toLowerCase().includes(q.toLowerCase()) ||
            note.body.toLowerCase().includes(q.toLowerCase())
        )
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [notes, q]
  );

  function update(patch: Partial<Note>) {
    setNotes((all) =>
      all.map((note) =>
        note.id === activeId
          ? { ...note, ...patch, updatedAt: new Date().toISOString() }
          : note
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
    if (notes.length === 1) return;
    const remaining = notes.filter((note) => note.id !== id);
    setNotes(remaining);
    if (id === activeId) setActiveId(remaining[0].id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">
            Free notes
          </h1>
          <p className="text-sm text-[#848484] mt-1">
            Local note workspace. Backend patient linking comes next.
          </p>
        </div>
        <Button onClick={createNote}>
          <Plus className="h-4 w-4" /> New note
        </Button>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <Card className="h-fit">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#848484]" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search notes..."
                className="w-full h-9 pl-9 pr-3 rounded-md bg-clinical-soft border border-transparent text-sm placeholder:text-[#848484] focus:outline-none focus:bg-white focus:border-clinical-border"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-clinical-border max-h-[640px] overflow-y-auto">
              {filtered.map((note) => {
                const isActive = note.id === activeId;
                return (
                  <li key={note.id}>
                    <button
                      onClick={() => setActiveId(note.id)}
                      className={`w-full text-left px-4 py-3 transition ${
                        isActive ? "bg-clinical-soft" : "hover:bg-clinical-soft/60"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <StickyNote className="h-4 w-4 text-[#848484] mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-clinical-ink truncate">
                            {note.title || "Untitled"}
                          </p>
                          <p className="text-xs text-[#848484] mt-0.5 line-clamp-2">
                            {note.body || "Empty note"}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {note.hasAudio && <Badge variant="outline">Audio</Badge>}
                            <span className="text-[10px] text-[#848484]">
                              {new Date(note.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <input
              value={active.title}
              onChange={(event) => update({ title: event.target.value })}
              className="flex-1 text-lg font-bold tracking-tight text-clinical-ink bg-transparent focus:outline-none"
              placeholder="Note title..."
            />
            <div className="flex items-center gap-2">
              <Button
                variant={recording ? "destructive" : "outline"}
                size="sm"
                onClick={() => {
                  setRecording((value) => !value);
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteNote(active.id)}
                aria-label="Delete note"
                disabled={notes.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={active.body}
              onChange={(event) => update({ body: event.target.value })}
              placeholder="Write clinical thoughts, reminders, or a voice annotation transcript..."
              className="w-full min-h-[420px] rounded-md border border-clinical-border bg-white p-4 text-sm leading-relaxed text-clinical-ink focus:outline-none focus:ring-2 focus:ring-clinical-border"
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-clinical-border pt-4">
              <div className="flex items-center gap-2 text-xs text-[#848484]">
                <Lock className="h-3.5 w-3.5" />
                Stored in browser state only in this prototype
              </div>
              <Button variant="outline">
                <Save className="h-4 w-4" /> Save locally
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
