"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  MapPin,
  Clock,
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
import { appointments, getPatient } from "@/lib/mock-data";

const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i); // 8am - 6pm
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7; // monday=0
  const result = new Date(d);
  result.setDate(d.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type Availability = Record<string, { start: string; end: string; on: boolean }>;
const defaultAvailability: Availability = {
  Mon: { start: "08:00", end: "17:00", on: true },
  Tue: { start: "09:00", end: "18:00", on: true },
  Wed: { start: "08:00", end: "13:00", on: true },
  Thu: { start: "09:00", end: "18:00", on: true },
  Fri: { start: "08:00", end: "15:00", on: true },
  Sat: { start: "10:00", end: "14:00", on: false },
  Sun: { start: "10:00", end: "14:00", on: false },
};

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [availability, setAvailability] = useState<Availability>(defaultAvailability);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  const monthLabel = `${weekStart.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })}`;

  function shift(weeks: number) {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + weeks * 7);
    setWeekStart(next);
  }

  function appointmentsFor(day: Date) {
    return appointments.filter((a) => sameDay(new Date(a.date), day));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">
            Calendar
          </h1>
          <p className="text-sm text-[#848484] mt-1">
            Weekly view · click an appointment to open the patient card
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> New appointment
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{monthLabel}</CardTitle>
              <CardDescription>
                Week of{" "}
                {weekStart.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => shift(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={() => shift(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Day headers */}
              <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-clinical-border">
                <div />
                {days.map((d, i) => {
                  const isToday = sameDay(d, new Date());
                  return (
                    <div
                      key={i}
                      className="px-2 py-3 text-center border-l border-clinical-border"
                    >
                      <p className="text-[11px] uppercase tracking-wider text-[#848484]">
                        {DAYS[i]}
                      </p>
                      <p
                        className={`mt-0.5 text-sm font-bold ${
                          isToday ? "text-clinical-ink" : "text-[#848484]"
                        }`}
                      >
                        <span
                          className={`inline-flex items-center justify-center h-7 w-7 rounded-full ${
                            isToday ? "bg-clinical-ink text-white" : ""
                          }`}
                        >
                          {d.getDate()}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
              {/* Grid */}
              <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))]">
                {/* Hour column */}
                <div className="border-r border-clinical-border">
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="h-16 px-2 py-1 text-[10px] text-[#848484] text-right"
                    >
                      {h}:00
                    </div>
                  ))}
                </div>
                {days.map((d, i) => {
                  const dayAppts = appointmentsFor(d);
                  const dayName = DAYS[i];
                  const avail = availability[dayName];
                  return (
                    <div
                      key={i}
                      className="relative border-l border-clinical-border"
                      style={{ height: HOURS.length * 64 }}
                    >
                      {/* hour rows */}
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className="absolute left-0 right-0 border-t border-clinical-border/60"
                          style={{ top: (h - HOURS[0]) * 64 }}
                        />
                      ))}
                      {/* availability shading */}
                      {avail?.on && (() => {
                        const [sh, sm] = avail.start.split(":").map(Number);
                        const [eh, em] = avail.end.split(":").map(Number);
                        const top = Math.max(0, (sh + sm / 60 - HOURS[0]) * 64);
                        const bottom = Math.max(top, (eh + em / 60 - HOURS[0]) * 64);
                        return (
                          <div
                            className="absolute left-0 right-0 bg-emerald-50/50 border-l-2 border-emerald-200"
                            style={{ top, height: bottom - top }}
                          />
                        );
                      })()}
                      {/* appointments */}
                      {dayAppts.map((a) => {
                        const start = new Date(a.date);
                        const minutes =
                          start.getHours() * 60 + start.getMinutes();
                        const top = ((minutes - HOURS[0] * 60) / 60) * 64;
                        const height = (a.durationMin / 60) * 64;
                        const p = getPatient(a.patientId);
                        if (!p || top < 0 || top > HOURS.length * 64) return null;
                        return (
                          <Link
                            key={a.id}
                            href={`/patients/${p.id}`}
                            className="absolute left-1 right-1 rounded-md bg-white border border-clinical-border hover:border-[#848484]/60 hover:shadow-sm transition p-2 overflow-hidden"
                            style={{ top, height }}
                          >
                            <p className="text-[11px] font-medium text-clinical-ink truncate">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-[#848484] flex items-center gap-1 mt-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {start.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            {height >= 48 && (
                              <p className="text-[10px] text-[#848484] mt-0.5 flex items-center gap-1">
                                {a.location === "Telehealth" ? (
                                  <Video className="h-2.5 w-2.5" />
                                ) : (
                                  <MapPin className="h-2.5 w-2.5" />
                                )}
                                {a.location}
                              </p>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly availability</CardTitle>
              <CardDescription>
                Hours patients can request appointments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DAYS.map((day) => {
                const a = availability[day];
                return (
                  <div
                    key={day}
                    className="flex items-center gap-2 text-xs"
                  >
                    <label className="flex items-center gap-2 w-20 shrink-0">
                      <input
                        type="checkbox"
                        checked={a.on}
                        onChange={(e) =>
                          setAvailability({
                            ...availability,
                            [day]: { ...a, on: e.target.checked },
                          })
                        }
                      />
                      <span className="font-medium text-clinical-ink">
                        {day}
                      </span>
                    </label>
                    <input
                      type="time"
                      value={a.start}
                      disabled={!a.on}
                      onChange={(e) =>
                        setAvailability({
                          ...availability,
                          [day]: { ...a, start: e.target.value },
                        })
                      }
                      className="flex-1 min-w-0 h-9 px-2 rounded-md border border-clinical-border bg-white text-xs text-clinical-ink disabled:bg-clinical-soft disabled:text-[#848484]"
                    />
                    <span className="text-[#848484]">–</span>
                    <input
                      type="time"
                      value={a.end}
                      disabled={!a.on}
                      onChange={(e) =>
                        setAvailability({
                          ...availability,
                          [day]: { ...a, end: e.target.value },
                        })
                      }
                      className="flex-1 min-w-0 h-9 px-2 rounded-md border border-clinical-border bg-white text-xs text-clinical-ink disabled:bg-clinical-soft disabled:text-[#848484]"
                    />
                  </div>
                );
              })}
              <Button className="w-full mt-2">Save availability</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-clinical-ink">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-emerald-100 border border-emerald-200" />
                Available hours
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-white border border-clinical-border" />
                Booked appointment
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
