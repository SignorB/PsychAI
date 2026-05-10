# Benchmarking local AI stack

Run these commands from the repository root.

## Rebuild ai-service after script changes

```bash
docker compose build ai-service
docker compose up -d ai-service
```

## LLM + semantic search + pure vector search

```bash
docker compose exec ai-service python scripts/benchmark_ai_stack.py \
  --ollama-base-url http://ollama:11434 \
  --ai-service-url http://127.0.0.1:8010 \
  --output-prefix /tmp/psychai_benchmark
```

Outputs:

- `/tmp/psychai_benchmark.csv`
- `/tmp/psychai_benchmark.jsonl`

Copy the CSV to the host if needed:

```bash
docker compose cp ai-service:/tmp/psychai_benchmark.csv ./psychai_benchmark.csv
```

## Whisper.cpp

Whisper needs a real audio file inside the container. Uploaded session audio is stored in the shared `/data/audio` volume.

List available files:

```bash
docker compose exec ai-service find /data/audio -type f
```

Run Whisper benchmark on one or more files:

```bash
docker compose exec ai-service python scripts/benchmark_ai_stack.py \
  --no-bench-llm \
  --no-bench-semantic-e2e \
  --no-bench-vector-search \
  --bench-whisper \
  --whisper-audio /data/audio/session-recording.webm \
  --output-prefix /tmp/psychai_whisper_benchmark
```

Key metric:

- `realtime_factor`: audio seconds processed per wall-clock second. Higher is better.

## Recommended final run

```bash
docker compose exec ai-service python scripts/benchmark_ai_stack.py \
  --ollama-base-url http://ollama:11434 \
  --ai-service-url http://127.0.0.1:8010 \
  --llm-runs 10 \
  --llm-num-predict 512 \
  --llm-prompt-repeat 40 \
  --semantic-runs 10 \
  --vector-runs 30 \
  --vector-counts 100 500 1000 2500 5000 \
  --output-prefix /tmp/psychai_final_benchmark
```
