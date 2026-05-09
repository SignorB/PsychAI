# PsychAI

Frontend for **PsychAI** — a 100% on-device AI assistant for psychologists. Built with Next.js (App Router), Tailwind CSS, and shadcn-style UI primitives. The backend (FastAPI + Ollama + Vector DB) is intentionally not part of this codebase — all data here is realistic mock data for demos.

## Stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS + DM Sans
- Lucide React icons
- Local UI primitives in `components/ui` (Card, Button, Badge, Tabs, Dialog) — shadcn style

## Routes
- `/` — Today's dashboard with appointments and pre-session RAG recap
- `/patients` — Searchable, filterable patient list
- `/patients/[id]` — Patient card (overview, session timeline, clinical data)
- `/patients/[id]/sessions/[sessionId]` — Transcript + AI clinical note + mandatory approval flow
- `/patients/[id]/referral` — AI-drafted referral letter with mandatory revision before PDF export
- `/calendar` — Weekly calendar grid + weekly availability editor
- `/settings` — Local model & privacy posture

## Run
- `npm run dev` (port 5000, host 0.0.0.0)

## User preferences
- Typography: DM Sans (400 / 500 / 700)
- Base accent: `#848484`
- Vibe: clinical, minimalist, "Support, not replacement"
