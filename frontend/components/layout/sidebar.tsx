"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  SearchCheck,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
};

const nav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/search", label: "Advanced search", icon: SearchCheck },
  { href: "/pending", label: "Sessions to close", icon: ClipboardCheck },
];

export function Sidebar({ pendingCount }: { pendingCount?: number }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 bg-clinical-brand sticky top-4 h-[calc(100vh-2rem)] rounded-2xl m-4 transition-all duration-300 ease-in-out overflow-hidden shadow-sm",
        isCollapsed ? "w-[80px]" : "w-64"
      )}
    >
      <div className={cn("py-4 border-b border-white/10 flex items-center transition-all", isCollapsed ? "px-0 justify-center" : "px-4")}>
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="PsychAI"
            width={42}
            height={42}
            className="h-10 w-10 rounded-lg shrink-0"
            priority
          />
          {!isCollapsed && (
            <div>
              <div className="font-bold text-[20px] tracking-tight text-white whitespace-nowrap">
                PsychAI
              </div>
            </div>
          )}
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto overflow-x-hidden">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-md text-sm transition-colors relative",
                isCollapsed ? "justify-center h-10 w-full" : "px-3 py-2.5 gap-3",
                active
                  ? "bg-white/15 text-white font-semibold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
              {!isCollapsed && (item.href === "/pending" && pendingCount ? (
                <Badge variant="primary" className="h-5 min-w-5 justify-center px-1.5 shrink-0">
                  {pendingCount}
                </Badge>
              ) : item.badge ? (
                <Badge variant="primary" className="h-5 min-w-5 justify-center px-1.5 shrink-0">
                  {item.badge}
                </Badge>
              ) : null)}
              {isCollapsed && ((item.href === "/pending" && pendingCount) || item.badge) && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-500" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 flex flex-col gap-1">
        <Link
          href="/settings"
          title={isCollapsed ? "Settings" : undefined}
          className={cn(
            "flex items-center rounded-md text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors",
            isCollapsed ? "justify-center h-10 w-full" : "px-3 py-2.5 gap-3"
          )}
        >
          <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          {!isCollapsed && <span className="truncate">Settings</span>}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "flex items-center rounded-md text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors mt-2",
            isCollapsed ? "justify-center h-10 w-full" : "px-3 py-2.5 gap-3"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          ) : (
            <>
              <ChevronLeft className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              <span className="truncate">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
