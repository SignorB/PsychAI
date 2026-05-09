# Run pipeline AI

Questa guida parte da una repo appena clonata e porta a un servizio AI locale funzionante.

## Prerequisiti

Sul computer host servono:

- Docker Engine;
- Docker Compose;
- driver NVIDIA aggiornati se vuoi usare GPU;
- NVIDIA Container Toolkit se vuoi usare Ollama in Docker con GPU.

Verifica GPU host:

```bash
nvidia-smi
```

Verifica GPU dentro Docker:

```bash
docker run --rm --gpus all nvidia/cuda:12.9.0-base-ubuntu22.04 nvidia-smi
```

Se questo comando mostra la GPU, Docker e configurato correttamente.

## Avvio consigliato: tutto in Docker

Da root progetto:

```bash
docker compose up --build
```

Il servizio AI sara esposto su:

```text
http://127.0.0.1:8010
```

Ollama gira in container e viene raggiunto internamente da `ai-service` su:

```text
http://ollama:11434
```

La porta `11434` non viene esposta sull'host per evitare conflitti con eventuali Ollama locali.

## Download modelli

Di default il container `ai-service` scarica automaticamente:

- `qwen2.5:3b-instruct`;
- `phi3:mini`;
- `nomic-embed-text`;
- `ggml-base.bin` per `whisper.cpp`.

Il primo avvio puo richiedere diversi minuti. I modelli restano nei volumi Docker e non vengono riscaricati agli avvii successivi.

Verifica modelli Ollama:

```bash
docker compose exec ollama ollama list
```

## Modello whisper.cpp

L'immagine Docker contiene il binario `whisper-cli`. Il modello `ggml-base.bin` viene scaricato automaticamente nel volume `whisper-models`.

Se vuoi evitare download automatici e copiare un modello gia presente sull'host:

```bash
docker run --rm \
  -v gdghack_whisper-models:/models/whisper \
  -v /home/gio/tools/whisper.cpp/models:/host-models:ro \
  alpine cp /host-models/ggml-base.bin /models/whisper/ggml-base.bin
```

## Smoke test

Suite automatica con misure di latenza:

```bash
python scripts/run_api_smoke_tests.py --base-url http://127.0.0.1:8010
```

Suite automatica includendo anche la trascrizione audio:

```bash
mkdir -p data/audio
cp ~/tools/whisper.cpp/samples/jfk.wav data/audio/jfk.wav
python scripts/run_api_smoke_tests.py \
  --base-url http://127.0.0.1:8010 \
  --audio-path /data/audio/jfk.wav
```

Test HTTP opzionali con pytest contro un servizio gia avviato:

```bash
RUN_AI_SERVICE_HTTP_TESTS=1 \
AI_SERVICE_BASE_URL=http://127.0.0.1:8010 \
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 \
python -m pytest tests/test_ai_service_http_contract.py
```

Health:

```bash
curl http://127.0.0.1:8010/ai/v1/health
```

Modelli configurati:

```bash
curl http://127.0.0.1:8010/ai/v1/models
```

Check modelli:

```bash
curl -X POST http://127.0.0.1:8010/ai/v1/models/check \
  -H "Content-Type: application/json" \
  -d '{"model_profile":"qwen","require_stt":true,"require_embeddings":true}'
```

Risultato atteso:

```json
{
  "ok": true,
  "missing": [],
  "available": [
    "nomic-embed-text",
    "qwen2.5:3b-instruct"
  ]
}
```

Parsing clinico:

```bash
curl -X POST http://127.0.0.1:8010/ai/v1/session-notes/draft \
  -H "Content-Type: application/json" \
  -d '{
    "model_profile": "qwen",
    "patient_id": "paziente_demo_001",
    "session_id": "sessione_demo_001",
    "transcript": {
      "raw_text": "La paziente riferisce difficolta a dormire da circa tre settimane. Dice che il lavoro e diventato piu pressante dopo un cambio di responsabile. Riporta pensieri ricorrenti la sera e tensione fisica alle spalle. Non emergono riferimenti a ideazione suicidaria. Vorrebbe riprendere una routine di camminate e monitorare il sonno prima della prossima seduta.",
      "language": "it",
      "segments": []
    },
    "manual_notes": [],
    "retrieved_context": []
  }'
```

Indicizzazione nel vector store in memoria:

```bash
curl -X POST http://127.0.0.1:8010/ai/v1/vector-index/index-source \
  -H "Content-Type: application/json" \
  -d '{
    "model_profile": "qwen",
    "patient_id": "paziente_demo_001",
    "source_id": "sessione_demo_001",
    "source_type": "clinical_summary",
    "text": "La paziente riferisce difficolta a dormire da circa tre settimane. Il lavoro e diventato piu pressante dopo un cambio di responsabile. Vorrebbe riprendere camminate e monitorare il sonno.",
    "metadata": {
      "session_id": "sessione_demo_001"
    }
  }'
```

Domanda RAG:

```bash
curl -X POST http://127.0.0.1:8010/ai/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "model_profile": "qwen",
    "patient_id": "paziente_demo_001",
    "question": "Cosa e emerso sul sonno?",
    "top_k": 5,
    "filters": {}
  }'
```

Test trascrizione whisper.cpp:

```bash
mkdir -p data/audio
cp ~/tools/whisper.cpp/samples/jfk.wav data/audio/jfk.wav

curl -X POST http://127.0.0.1:8010/ai/v1/transcriptions \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "paziente_demo_001",
    "session_id": "sessione_audio_001",
    "audio_path": "/data/audio/jfk.wav",
    "language": "en",
    "speaker_mode": "single_speaker",
    "model": "base"
  }'
```

Se il test fallisce con `libwhisper.so.1: cannot open shared object file`, ricostruisci l'immagine:

```bash
docker compose build --no-cache ai-service
docker compose up
```

## GPU

Ollama carica i modelli in GPU solo quando arriva una richiesta. All'avvio vede la GPU, ma non alloca subito VRAM.

Per monitorare:

```bash
watch -n 1 nvidia-smi
```

Poi lancia una richiesta a `/ai/v1/session-notes/draft`.

Per tenere i modelli caricati piu a lungo, modifica `docker-compose.yml`:

```yaml
ollama:
  environment:
    OLLAMA_KEEP_ALIVE: 30m
```

## Modalita alternativa: Ollama sull'host

Se Ollama e gia installato e funzionante sull'host:

```bash
docker compose -f docker-compose.host-ollama.yml up --build
```

In questa modalita:

- `ai-service` gira in Docker;
- Ollama gira sull'host;
- la GPU e gestita dall'Ollama host;
- il container chiama `http://host.docker.internal:11434`.
- di default `ai-service` prova comunque a scaricare i modelli mancanti sull'Ollama host.

## Disabilitare bootstrap automatico

Nel `docker-compose.yml` puoi impostare:

```yaml
environment:
  BOOTSTRAP_OLLAMA: "false"
  BOOTSTRAP_WHISPER_MODEL: "false"
```

## Stop

Ferma i container:

```bash
docker compose down
```

Ferma e cancella anche i volumi modello:

```bash
docker compose down -v
```

Usa `-v` solo se vuoi riscaricare modelli Ollama e modello Whisper.

## Troubleshooting

Porta `8010` occupata:

```bash
ss -ltnp | grep 8010
```

Porta `11434` occupata:

- con `docker-compose.yml` non dovrebbe essere un problema, perché Ollama container non espone `11434` sull'host;
- se usi la modalita host, assicurati che Ollama host sia quello desiderato.

GPU non visibile:

```bash
docker run --rm --gpus all nvidia/cuda:12.9.0-base-ubuntu22.04 nvidia-smi
```

Se fallisce, il problema e fuori dalla repo: driver host, Docker o NVIDIA Container Toolkit.
