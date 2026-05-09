"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Filter, ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createPatient } from "@/lib/api";

export default function PatientsClient({ initialPatients }: { initialPatients: any[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "On hold" | "Discharged">("All");

  // State for new patient modal
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    age: "",
    condition: "",
    intake_notes: ""
  });

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createPatient({
        name: newPatient.name,
        age: parseInt(newPatient.age) || 0,
        condition: newPatient.condition,
        intake_notes: newPatient.intake_notes
      });
      setIsNewPatientOpen(false);
      setNewPatient({ name: "", age: "", condition: "", intake_notes: "" });
      router.refresh(); // Tells Next.js to re-fetch Server Components
    } catch (err) {
      console.error(err);
      alert("Failed to create patient. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    if (!initialPatients || initialPatients.length === 0) return [];
    return initialPatients.filter((p) => {
      const name = p.name || `Patient ${p.patient_id || p.id}`;
      const concern = p.primaryConcern || p.condition || "";
      const diagnosis = p.diagnosis || [];
      const status = p.is_active === false ? "Discharged" : "Active";

      const matchesQ =
        !q ||
        name.toLowerCase().includes(q.toLowerCase()) ||
        concern.toLowerCase().includes(q.toLowerCase()) ||
        diagnosis.join(" ").toLowerCase().includes(q.toLowerCase());
      const matchesStatus = statusFilter === "All" || status === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [initialPatients, q, statusFilter]);

  const newPatientModal = (
    <Dialog open={isNewPatientOpen} onOpenChange={setIsNewPatientOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreatePatient} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-clinical-ink">Name</label>
            <input
              required
              type="text"
              value={newPatient.name}
              onChange={e => setNewPatient({...newPatient, name: e.target.value})}
              className="w-full h-10 px-3 rounded-md bg-white border border-clinical-border text-sm text-clinical-ink focus:outline-none focus:border-[#848484]"
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-clinical-ink">Age</label>
            <input
              required
              type="number"
              value={newPatient.age}
              onChange={e => setNewPatient({...newPatient, age: e.target.value})}
              className="w-full h-10 px-3 rounded-md bg-white border border-clinical-border text-sm text-clinical-ink focus:outline-none focus:border-[#848484]"
              placeholder="e.g. 35"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-clinical-ink">Condition / Primary Concern</label>
            <input
              required
              type="text"
              value={newPatient.condition}
              onChange={e => setNewPatient({...newPatient, condition: e.target.value})}
              className="w-full h-10 px-3 rounded-md bg-white border border-clinical-border text-sm text-clinical-ink focus:outline-none focus:border-[#848484]"
              placeholder="e.g. Social Anxiety"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-clinical-ink">Intake Notes</label>
            <textarea
              rows={4}
              value={newPatient.intake_notes}
              onChange={e => setNewPatient({...newPatient, intake_notes: e.target.value})}
              className="w-full py-2 px-3 rounded-md bg-white border border-clinical-border text-sm text-clinical-ink focus:outline-none focus:border-[#848484] resize-none"
              placeholder="Initial observations..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsNewPatientOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isSubmitting ? "Saving..." : "Add Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (!initialPatients || initialPatients.length === 0) {
    return (
      <div className="space-y-6">
        {newPatientModal}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">
              Patients
            </h1>
            <p className="text-sm text-[#848484] mt-1">
              0 active records
            </p>
          </div>
          <Button onClick={() => setIsNewPatientOpen(true)}>
            <Plus className="h-4 w-4 mr-2" strokeWidth={2} />
            New patient
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center p-12 mt-12 bg-clinical-soft/30 border border-dashed border-clinical-border rounded-xl">
          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border border-clinical-border shadow-sm mb-4">
            <Search className="h-5 w-5 text-[#848484]" />
          </div>
          <h3 className="text-lg font-medium text-clinical-ink">No patients found</h3>
          <p className="text-sm text-[#848484] mt-1 mb-6 text-center max-w-sm">
            It looks like you haven't added any patients yet. Add your first patient to start tracking their progress and sessions.
          </p>
          <Button onClick={() => setIsNewPatientOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Patient
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {newPatientModal}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">
            Patients
          </h1>
          <p className="text-sm text-[#848484] mt-1">
            {initialPatients.length} active records · all data stored on this device
          </p>
        </div>
        <Button onClick={() => setIsNewPatientOpen(true)}>
          <Plus className="h-4 w-4 mr-2" strokeWidth={2} />
          New patient
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between flex-wrap gap-3">
          <div className="relative flex-1 max-w-md min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#848484]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, concern, or diagnosis…"
              className="w-full h-10 pl-9 pr-3 rounded-md bg-clinical-soft border border-transparent text-sm text-clinical-ink placeholder:text-[#848484] focus:outline-none focus:bg-white focus:border-clinical-border"
            />
          </div>
          <div className="flex items-center gap-1 bg-clinical-soft p-1 rounded-md">
            {(["All", "Active", "On hold", "Discharged"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 h-8 text-xs rounded-md font-medium transition ${
                  statusFilter === s
                    ? "bg-white text-clinical-ink shadow-sm"
                    : "text-[#848484] hover:text-clinical-ink"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[#848484] border-b border-clinical-border">
                  <th className="font-medium px-5 py-3">Patient</th>
                  <th className="font-medium px-3 py-3 hidden md:table-cell">Concern</th>
                  <th className="font-medium px-3 py-3">Sessions</th>
                  <th className="font-medium px-3 py-3 hidden md:table-cell">Status</th>
                  <th className="font-medium px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const id = p.id || p.patient_id;
                  const name = p.name || `Patient ${id}`;
                  const initials = p.initials || name.substring(0, 2).toUpperCase() || "PT";
                  const status = p.is_active === false ? "Discharged" : "Active";
                  const totalSessions = p.total_sessions ?? p.sessions?.length ?? 0;
                  const riskFlags = p.riskFlags || [];
                  const age = p.age || "N/A";
                  const pronouns = p.pronouns || "N/A";
                  
                  return (
                    <tr
                      key={id}
                      className="border-b border-clinical-border last:border-0 hover:bg-clinical-soft/60 transition"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/patients/${id}`}
                          className="flex items-center gap-3"
                        >
                          <div className="h-9 w-9 rounded-full bg-clinical-soft flex items-center justify-center text-[11px] font-bold text-clinical-ink">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-clinical-ink">
                                {name}
                              </span>
                              {riskFlags.length > 0 && (
                                <AlertTriangle
                                  className="h-3.5 w-3.5 text-amber-600"
                                  strokeWidth={2}
                                />
                              )}
                            </div>
                            <p className="text-[11px] text-[#848484]">
                              {age} yrs · {pronouns}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell text-[#848484] max-w-[280px] truncate">
                        {p.primaryConcern || p.condition || "Not specified"}
                      </td>
                      <td className="px-3 py-3 text-clinical-ink font-medium">
                        {totalSessions}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <Badge
                          variant={
                            status === "Active"
                              ? "success"
                              : status === "On hold"
                              ? "warning"
                              : "outline"
                          }
                        >
                          {status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/patients/${id}`}
                          className="inline-flex items-center text-xs text-[#848484] hover:text-clinical-ink"
                        >
                          Open <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-[#848484]">
                      No patients match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
