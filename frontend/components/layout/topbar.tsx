"use client";

import { Search, Mic, ShieldCheck } from "lucide-react";

export function Topbar() {
  return (
    <header className="h-16 border-b border-clinical-border bg-white/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="h-full px-6 lg:px-8 flex items-center justify-between gap-4 max-w-[1400px] mx-auto w-full">
        <div className="flex-1 max-w-md relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#848484]"
            strokeWidth={1.75}
          />
          <input
            placeholder="Search patients, sessions, notes…"
            className="w-full h-10 pl-9 pr-3 rounded-md bg-clinical-soft border border-transparent text-sm text-clinical-ink placeholder:text-[#848484] focus:outline-none focus:bg-white focus:border-clinical-border"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-clinical-soft text-[11px] text-[#848484]">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
            Local model · llama-3.1-8b
          </div>
          <button className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-md text-sm font-medium hover:opacity-90 transition text-[#ffffff] bg-[#6E5AA8]">
            <Mic className="h-4 w-4" strokeWidth={1.75} />
            Start session
          </button>
          <div className="h-9 w-9 rounded-full bg-clinical-soft border border-clinical-border flex items-center justify-center text-xs font-bold text-clinical-ink">
            EM
          </div>
        </div>
      </div>
    </header>
  );
}
