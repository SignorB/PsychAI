"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Lock,
  Settings,
  SearchCheck,
  ClipboardCheck,
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

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-clinical-border bg-white">
      <div className="px-6 py-6 border-b border-clinical-border">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="PsychAI"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg"
            priority
          />
          <div>
            <div className="font-bold text-[15px] tracking-tight text-clinical-ink">
              PsychAI
            </div>
            <div className="text-[11px] text-[#848484] -mt-0.5">
              Local · Private · Secure
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                active
                  ? "bg-clinical-soft text-clinical-ink font-medium"
                  : "text-[#848484] hover:bg-clinical-soft hover:text-clinical-ink"
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/pending" && pendingCount ? (
                <Badge variant="primary" className="h-5 min-w-5 justify-center px-1.5">
                  {pendingCount}
                </Badge>
              ) : item.badge ? (
                <Badge variant="primary" className="h-5 min-w-5 justify-center px-1.5">
                  {item.badge}
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-clinical-border space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-[#848484] hover:bg-clinical-soft hover:text-clinical-ink"
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
          Settings
        </Link>
        <div className="mt-3 mx-1 px-3 py-3 rounded-lg bg-clinical-soft border border-clinical-border">
          <div className="flex items-center gap-2 text-[11px] font-medium text-clinical-ink">
            <Lock className="h-3 w-3" strokeWidth={2} />
            ON-DEVICE
          </div>
          <p className="text-[11px] text-[#848484] mt-1 leading-snug">
            All processing runs locally. No data leaves this machine.
          </p>
        </div>
      </div>
    </aside>
  );
}
