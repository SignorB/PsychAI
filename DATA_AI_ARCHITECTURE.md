# Data Layer and AI Layer Architecture

## Goals

PsychAI is designed as a local-first clinical workspace for psychologists. The main product goal is to make session documentation, patient history retrieval, and pre-session preparation faster without sending sensitive clinical data to external services.

The architecture therefore optimizes for:

- Local execution of open weight ai models.
- Explicit clinician approval before notes become part of the confirmed record.
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
      -> Vector index for retrieval
```

The system is deliberately split into two backend processes:

- `backend/`: product API and clinical data ownership.
- `ai/`: model runtime, transcription, embeddings, generation, and retrieval primitives.

This split is not only organizational. It protects the clinical domain from model-runtime churn. The product backend can keep stable concepts like patients, sessions, approvals, and reports while the AI service can change model names, inference runtimes, vector indexes, and prompt formats.

## Data Layer

### Backend Technology Choice

The data layer uses FastAPI, SQLModel, and SQLite.

FastAPI was chosen because the project already has Python-heavy AI components. Keeping the backend in Python reduces integration friction with the AI service, avoids a second language runtime for domain APIs, and makes it easy to share Pydantic-style request/response validation.

SQLModel was chosen over raw SQLAlchemy because the schema is still evolving quickly. It gives us:

- typed Python models;
- Pydantic-compatible serialization;
- simple relationships between patients and sessions;
- less boilerplate than a full repository pattern during MVP work.

SQLite was chosen because the product is local-first. The database can live inside a Docker volume or as a local file, is easy to reset, and has no separate server process. For the current scale of one clinician, tens of patients, and hundreds or low thousands of sessions, SQLite is a pragmatic fit.

The tradeoff is that SQLite plus ad-hoc migrations is not a final multi-user architecture. If the product grows into a synchronized or team-based deployment, the natural migration path is PostgreSQL with explicit migrations.

### Clinical Record Ownership

The backend is the owner of clinical truth. The AI service never directly mutates the clinical database.

This design keeps the following boundary clear:

```text
AI service = suggestions, transformations, retrieval primitives
Backend = patient records, session lifecycle, approvals, training data eligibility
```

That boundary is important because generated content is not automatically a clinical record. A note becomes durable clinical data only after it is saved or confirmed through the backend workflow.

### Current Domain Model

The core model is intentionally compact:

- `Patient`: identity, contact fields, clinical status, intake notes, generated history report.
- `TherapySession`: appointment/session date, transcript, clinical note, approval status, patient link.
- `TrainingPair`: transcript plus clinician-confirmed final note for later LoRA fine-tuning.

We currently use one `TherapySession` table for both scheduled appointments and completed sessions. This avoids premature complexity, but the UI must infer state carefully:

- no transcript: scheduled appointment or not started yet;
- transcript but no clinical note: note generation pending;
- clinical note but not approved: AI draft or edited draft;
- approved: confirmed clinical record.

This explains why pending-note counters explicitly filter for `transcript && !clinical_note`. Without that condition, future appointments would look like missing notes.

### Patient Status

The first version had only `is_active: bool`. That was too narrow for a realistic clinical workspace because not every non-active patient is discharged.

We added a string `status` field with:

- `Active`
- `Discharged`
- `On hold`

`is_active` is still kept for backward compatibility and quick filtering, but `status` is the more meaningful product field. This is a deliberate transitional design: it avoids breaking existing UI/API paths while allowing richer state.

### Session Approval and Training Data

The approval endpoint does more than toggle a boolean.

When confirming a session:

1. The final edited clinical note is written to the session.
2. `approved` is set to true.
3. A `TrainingPair` is created if a transcript exists.
4. Patient history regeneration is scheduled.

This is an implementation detail with product significance. We only want clinician-approved notes to become training examples. Raw model output is not a good LoRA target because it may include formatting mistakes, missing context, or clinical wording the user would not actually write.

### Migrations

Current migrations are lightweight and local:

```text
create_all()
ensure_schema_columns()
```

This approach is intentionally simple for an MVP. It works well when the database is local, resettable, and controlled by one developer. It is not enough for production-grade schema evolution.

The expected next step is Alembic or another explicit migration tool once the data model stabilizes.

## AI Layer
### Service Boundary

The AI layer lives in `ai/` and exposes a FastAPI service under `/ai/v1`.

The service boundary is useful because:

- Backend business logic stays separate from model/runtime concerns.
- Ollama, whisper.cpp, vector indexing, and model profiles can evolve independently.
- Docker can allocate model-specific volumes and GPU resources to the AI side.

The AI service is built around provider interfaces rather than direct calls scattered through the codebase. For example, LLM generation, embeddings, speech-to-text, and vector storage are all accessed behind small provider classes. This makes it possible to replace Ollama, whisper.cpp, or the vector store without rewriting product endpoints.

### Model Stack

Current stack:

- Speech-to-text: `whisper.cpp`
- LLM default: `qwen2.5:3b-instruct`
- LLM fallback: `phi3:mini`
- Embeddings: `nomic-embed-text`
- Runtime: Ollama

The model stack is optimized for local execution on consumer hardware rather than maximum benchmark quality. The constraint is not only VRAM, but also operational simplicity: the models need to be easy to pull, run, swap, and benchmark in Docker.

### Why Ollama

Ollama was chosen as the local LLM runtime because it gives us a stable HTTP interface over open-weight models. The app does not need to manage model loading, quantization files, GPU allocation, or prompt invocation directly.

The important implementation benefit is that Ollama returns generation timing metadata:

- `eval_count`
- `eval_duration`
- `prompt_eval_count`
- `prompt_eval_duration`
- `total_duration`

That made it possible to measure token/sec directly and compare model profiles with the same prompt.

### Why qwen2.5:3b-instruct

`qwen2.5:3b-instruct` is the default because benchmark results on the target setup were strong:

- around 220 generated tokens/sec on realistic prompts;
- more stable throughput than `phi3:mini`;
- suitable instruction-following behavior for structured clinical notes.

`phi3:mini` remains useful as a fallback profile, but the measurements do not support making it the default on this machine.

### Why whisper.cpp

`whisper.cpp` was selected for transcription because it is local, mature, scriptable, and easy to run in Docker. It also produces JSON output with segments, which lets us keep timestamps and metadata.

The provider wraps whisper.cpp output into a normalized `Transcript` object. This isolates the rest of the stack from whisper.cpp-specific JSON details and leaves room to swap in another STT provider later.

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

### Structured Output Strategy

The system asks the LLM for JSON matching a Pydantic schema instead of free-form prose only.

The reason is reliability. The frontend and backend need predictable fields for:

- themes;
- symptoms;
- structured clinical note;
- next-session recap;
- uncertainties.

Free-form text is easier to generate, but harder to validate and harder to build product features on top of. Schema-constrained JSON lets the backend reject malformed output early and keeps the UI stable.

The tradeoff is that JSON mode can sometimes reduce model fluency or fail if the model emits invalid JSON. That is why model choice and prompt design matter.

### Semantic Search and RAG

The RAG pipeline is split into separate steps:

1. Compose source text from intake, transcript, clinical note, or manual notes.
2. Chunk text into overlapping sections.
3. Generate embeddings through Ollama.
4. Upsert chunks and vectors into the vector index.
5. Search by patient and query vector.
6. Optionally ask the LLM to answer using retrieved chunks.

This split made benchmarking easier because embedding cost and vector-search cost can be measured independently.

### Chunking Strategy

The current chunking strategy is character-based with overlap.

This is not the most semantically advanced approach, but it is predictable and fast. For therapy notes and transcripts, overlap is important because clinically relevant context often spans adjacent sentences or speaker turns.

The current approach favors:

- deterministic chunk counts;
- easy debugging;
- no tokenizer dependency;
- simple indexing.

The future improvement would be token-aware chunking or section-aware chunking that treats transcript, clinical summary, risk notes, and plan as separate semantic sections.

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

## Deployment and Runtime Design

Docker Compose separates runtime concerns:

- frontend container for Next.js;
- backend container for clinical API and SQLite database volume;
- ai-service container for FastAPI model orchestration;
- ollama container for model serving;
- optional LoRA trainer container.

The AI service and Ollama have their own volumes for models, audio, and vector indexes. This matters because model files and vector indexes are large runtime artifacts, not source code.

The backend database is also in a volume. This is why resetting the Docker database requires clearing the backend volume or explicitly running the seeder inside the backend container.

## Design Decisions

### Local-First Instead of Cloud AI

Clinical transcripts and notes are sensitive. The architecture keeps inference local by default. This is slower and more operationally complex than cloud APIs, but it better matches the privacy goal.

### Backend Owns Clinical Truth

The AI service generates suggestions. The backend stores clinical records.

This distinction matters because AI output should not become authoritative until the clinician confirms it.

### Separate Backend and AI Service

Keeping backend and AI service separate adds Docker complexity, but it prevents the product API from being tightly coupled to the model runtime.

The alternative would be a single FastAPI process that owns both database and model execution. That would be simpler initially, but harder to operate once model loading, GPU memory, long-running transcription, and training jobs enter the picture.

### JSON Contracts Between Services

The backend talks to the AI service over JSON HTTP endpoints rather than importing AI modules directly.

This gives us:

- a stable service boundary;
- easier Docker deployment;
- language/runtime flexibility later;
- clear failure handling when AI service is unavailable.

The cost is some duplicated schemas and explicit client code in `backend/ai_client.py`.

### Clinician-in-the-Loop by Default

The system intentionally avoids fully automatic clinical record creation. AI drafts are useful, but confirmation is the boundary where generated output becomes part of the record.

This decision influences the data model, UI state, training workflow, and patient history generation.

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

### Current Vector Search Is Transparent but Not Scalable

SQLite + JSON vectors + Python cosine similarity is excellent for understanding and debugging. It is not the final search architecture for large datasets.

The next likely improvement is an indexed vector backend.

### Service Boundaries Help Benchmarking

Because generation, embedding, vector search, and transcription are separate service functions, we could benchmark them independently.

This made the performance story clearer:

- LLM generation is fast enough for interactive note drafting.
- Semantic search end-to-end is fast after warm-up.
- Brute-force vector search is the scaling bottleneck.
- Whisper performance still needs measurement on representative audio files.

### Approval Is the Right Boundary for Training Data

Raw AI drafts are not good training targets. Clinician-confirmed notes are better because they encode the user's preferred clinical style and corrections.

That is why `TrainingPair` is created at confirmation time.
