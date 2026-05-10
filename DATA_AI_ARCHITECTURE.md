# Data Layer and AI Layer Architecture

This document explains the current architecture, the main design decisions, what was tried, and what we learned while building the data layer and AI layer of PsychAI.

## Goals

PsychAI is designed as a local-first clinical workspace for psychologists. The main product goal is to make session documentation, patient history retrieval, and pre-session preparation faster without sending sensitive clinical data to external services.

The architecture therefore optimizes for:

- Local execution.
- Explicit clinician approval before notes become part of the confirmed record.
- Simple inspectable persistence during MVP development.
- Replaceable AI providers and models.
- Good-enough performance on consumer hardware.

## High-Level Flow

```text
Frontend
  -> Backend FastAPI
    -> SQLite clinical database
    -> AI Service FastAPI
      -> whisper.cpp for speech-to-text
      -> Ollama for LLM generation
      -> Ollama embeddings for semantic search
      -> SQLite vector index for retrieval
```

The frontend never talks directly to Ollama or whisper.cpp. It talks to the backend. The backend owns clinical records and calls the AI service when transcription, note generation, embedding, indexing, or retrieval is needed.

## Data Layer

### Current Storage

The backend uses SQLite through SQLModel.

Core tables:

- `Patient`
- `TherapySession`
- `TrainingPair`

`Patient` stores demographic/contact fields, clinical intake fields, status, and generated patient history reports.

`TherapySession` stores scheduled sessions, transcripts, AI clinical notes, approval status, timestamps, and patient linkage.

`TrainingPair` stores transcript/final-note pairs produced when a clinician confirms a session note. These pairs are intended for future LoRA fine-tuning.

### Patient Status Model

The original model only had `is_active: bool`, which was not expressive enough for the product state we wanted to demo.

We added:

```text
status: "Active" | "Discharged" | "On hold"
```

`is_active` is still kept for backward compatibility, but `status` is now the more realistic product field.

### Demo Dataset

The local seed data was replaced with a more realistic deterministic dataset:

- 20 patients.
- 10 active, 6 discharged, 4 on hold.
- 70 past transcribed sessions.
- 20 transcribed sessions not confirmed.
- 10 transcribed sessions without AI summaries.
- 20 future calendar appointments across this week and next week for the 10 active patients.
- Session transcripts around 2500 characters.

This gives the UI realistic density for dashboard, patient timeline, pending notes, calendar, and RAG workflows.

### Scheduling vs Clinical Sessions

For MVP simplicity, scheduled appointments and completed sessions are both represented by `TherapySession`.

The practical distinction is:

- Future appointment: no transcript yet.
- Completed/transcribed session: has `transcript`.
- AI-generated note: has `clinical_note`.
- Confirmed record: `approved = true`.

This avoided adding a separate appointment table too early. The tradeoff is that UI counts must be careful. For example, “pending notes” should count only sessions that have a transcript and no clinical note, not future appointments.

### Session Approval

When a clinician confirms a note:

1. The edited final note is saved.
2. The session is marked approved.
3. A `TrainingPair` is created if a transcript exists.
4. Patient history regeneration is queued in the background.

This keeps training data tied to clinician-approved output rather than raw AI drafts.

### Schema Migration Strategy

For local development, lightweight SQLite migrations are handled in `ensure_schema_columns()`. This is intentionally simple and avoids bringing in Alembic during the MVP phase.

This is acceptable for a local prototype, but a production version should use explicit migrations.

## AI Layer

### Service Boundary

The AI layer lives in `ai/` and exposes a FastAPI service under `/ai/v1`.

The backend calls the AI service through `backend/ai_client.py`.

The service boundary is useful because:

- Backend business logic stays separate from model/runtime concerns.
- Ollama, whisper.cpp, vector indexing, and model profiles can evolve independently.
- Docker can allocate model-specific volumes and GPU resources to the AI side.

### Model Stack

Current stack:

- Speech-to-text: `whisper.cpp`
- LLM default: `qwen2.5:3b-instruct`
- LLM fallback: `phi3:mini`
- Embeddings: `nomic-embed-text`
- Runtime: Ollama
- Vector index: SQLite-backed vector chunks

### Transcription

The transcription provider wraps `whisper.cpp` and outputs a normalized `Transcript` object:

- `raw_text`
- language
- timestamped segments
- provider metadata

This keeps the rest of the app independent from whisper.cpp JSON output details.

### Clinical Note Generation

Clinical note generation uses Ollama `/api/generate` in JSON mode with a structured schema.

The prompt asks the model to:

- Stay grounded in the transcript.
- Separate reported facts, observations, and hypotheses.
- Avoid unsupported diagnosis.
- Track uncertainty.
- Return a structured clinical note.

The backend saves the structured note text into the session record.

### Semantic Search and RAG

The RAG pipeline is split into separate steps:

1. Compose source text from intake, transcript, clinical note, or manual notes.
2. Chunk text into overlapping sections.
3. Generate embeddings through Ollama.
4. Upsert chunks and vectors into the vector index.
5. Search by patient and query vector.
6. Optionally ask the LLM to answer using retrieved chunks.

This split made benchmarking easier because embedding cost and vector-search cost can be measured independently.

### Vector Store

The current persistent vector store is SQLite.

Vectors are stored as JSON and searched with brute-force cosine similarity in Python. This is simple and inspectable, but it scales linearly with chunk count.

Benchmark results showed this clearly:

- 100 chunks: about 30 ms.
- 500 chunks: about 154 ms.
- 1000 chunks: about 313 ms.
- 2500 chunks: about 772 ms.
- 5000 chunks: about 1.55 s.

This is acceptable for small patient-level indexes, but not ideal for larger historical corpora. A future version should consider `sqlite-vec`, FAISS, LanceDB, or HNSW-based search.

## Design Decisions

### Local-First Instead of Cloud AI

Clinical transcripts and notes are sensitive. The architecture keeps inference local by default. This is slower and more operationally complex than cloud APIs, but it better matches the privacy goal.

### Backend Owns Clinical Truth

The AI service generates suggestions. The backend stores clinical records.

This distinction matters because AI output should not become authoritative until the clinician confirms it.

### Deterministic Demo Data

The seed dataset is deterministic instead of random. This makes demos, screenshots, regression checks, and benchmark comparisons easier.

### Keep MVP Storage Simple

SQLite was chosen for:

- Easy local setup.
- Easy Docker volume persistence.
- Easy reset during development.
- Low operational burden.

The tradeoff is limited migration and vector-search sophistication.

### Separate AI Model Profiles

The AI service uses model profiles such as `qwen` and `phi`. This makes it easy to switch models without changing backend or frontend flows.

## What We Tried

### LLM Throughput Benchmarks

We benchmarked Ollama generation throughput for `qwen2.5:3b-instruct` and `phi3:mini`.

With realistic prompt size:

- `qwen2.5:3b-instruct`: about 220 tokens/sec.
- `phi3:mini`: about 148 tokens/sec.

`qwen2.5:3b-instruct` was both faster and more stable in this environment, so it is the better default.

### Semantic Search Benchmarks

Semantic search was measured end-to-end:

```text
query -> embedding -> vector search -> top-k results
```

Warm queries were usually around 20-30 ms. The first cold query was slower due to model/runtime warm-up.

### Pure Vector Search Benchmarks

We also measured vector search without embedding generation by using synthetic vectors. This isolated the cost of SQLite fetch, JSON vector decoding, and cosine similarity.

The result showed linear scaling. This confirmed the current vector store is fine for MVP patient-level search but should be replaced or optimized for larger datasets.

### Realistic Seed Data

We replaced sparse/random mock data with denser clinical demo data. This revealed UI issues that were hidden with small datasets, such as:

- Future appointments being counted as pending notes.
- New sessions pre-filling transcript from intake notes.
- Patient status needing more than a boolean.

## What We Learned

### Qwen Is the Better Default

On the tested local setup, `qwen2.5:3b-instruct` outperformed `phi3:mini` in throughput despite being the model we expected to be heavier.

The lesson is to benchmark actual deployment hardware instead of assuming model speed from model size alone.

### Prompt Ingestion Is Not the Bottleneck

Ollama reported very high prompt token/sec after warm-up. The main user-visible cost is generation time, not prompt ingestion.

For UI latency, the important number is generated tokens/sec and end-to-end endpoint time.

### Cold Starts Need Separate Reporting

The first query or first generation after model load can be much slower. For product UX, cold-start and warm-path metrics should be reported separately.

### Future Appointments Need Different UI Semantics

Using `TherapySession` for both appointments and completed sessions works, but only if the UI derives state from content:

- no transcript means scheduled/not started;
- transcript but no clinical note means note pending;
- clinical note but not approved means generated draft;
- approved means confirmed record.

### Current Vector Search Is Transparent but Not Scalable

SQLite + JSON vectors + Python cosine similarity is excellent for understanding and debugging. It is not the final search architecture for large datasets.

The next likely improvement is an indexed vector backend.

### Approval Is the Right Boundary for Training Data

Raw AI drafts are not good training targets. Clinician-confirmed notes are better because they encode the user's preferred clinical style and corrections.

That is why `TrainingPair` is created at confirmation time.

## Current Limitations

- No production migration system yet.
- Scheduled appointments and clinical sessions share one table.
- Vector search is brute-force.
- Training workflow is still experimental.
- `react-markdown` must be installed in `node_modules` for frontend typecheck/build to pass.
- No full automated end-to-end test suite yet.

## Near-Term Improvements

- Add explicit session lifecycle status instead of deriving state from nullable fields.
- Add Alembic or another migration tool.
- Replace brute-force vector search with an indexed vector store.
- Add benchmark output plots for LLM, STT, semantic search, and vector search.
- Add endpoint-level performance logging around note generation and RAG.
- Add tests for approval flow, training-pair creation, and pending-note counts.

