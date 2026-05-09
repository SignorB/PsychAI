import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getSessions } from "@/lib/api";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "PsychAI — On-device AI for Psychologists",
  description:
    "A 100% local AI assistant that frees clinicians from documentation so they can focus on human connection.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let pendingCount = 0;
  try {
    const data = await getSessions();
    const sessions = data.sessions || [];
    pendingCount = sessions.filter((s: any) => !s.clinical_note).length;
  } catch (error) {
    console.error("Failed to fetch sessions for sidebar:", error);
  }

  return (
    <html lang="en" className={dmSans.variable}>
      <body className="font-sans bg-clinical-surface min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar pendingCount={pendingCount} />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar />
            <main className="flex-1 p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
