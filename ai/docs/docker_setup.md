# Docker setup

Guida rapida completa: `docs/run_pipeline.md`.

## Obiettivo

Eseguire il servizio AI in container e, se richiesto, eseguire Ollama in container con accesso alla GPU NVIDIA.

## Prerequisiti GPU NVIDIA

Sul sistema host servono:

- driver NVIDIA compatibili con la RTX 5070;
- Docker Engine;
- NVIDIA Container Toolkit;
- Docker configurato per esporre GPU ai container.

Verifica host:

```bash
nvidia-smi
docker run --rm --gpus all nvidia/cuda:12.9.0-base-ubuntu22.04 nvidia-smi
```

Se il secondo comando mostra la GPU, Docker puo usarla.

## Opzione A: Ollama in Docker con GPU

Avvio:

```bash
docker compose up --build
```

Al primo avvio `ai-service` scarica automaticamente i modelli Ollama richiesti e il modello `whisper.cpp base` nei volumi Docker.

Verifica:

```bash
curl http://127.0.0.1:8010/ai/v1/health
curl http://127.0.0.1:8010/ai/v1/models
curl -X POST http://127.0.0.1:8010/ai/v1/models/check \
  -H "Content-Type: application/json" \
  -d '{"model_profile":"qwen","require_stt":false,"require_embeddings":true}'
```

## Opzione B: AI service in Docker, Ollama sull'host

Se Ollama funziona gia bene sull'host, questa opzione e piu semplice.

Avvio:

```bash
docker compose -f docker-compose.host-ollama.yml up --build
```

Il servizio AI chiamera:

```text
http://host.docker.internal:11434
```

## Modello whisper.cpp

L'immagine contiene il binario `whisper-cli`, ma non include il modello per evitare immagini pesanti.

Scarica il modello sul volume:

```bash
docker compose run --rm ai-service python -c "print('container ready')"
docker run --rm -v gdghack_whisper-models:/models/whisper alpine ls /models/whisper
```

Metodo semplice: copia il modello gia scaricato sull'host nel volume montando temporaneamente la cartella:

```bash
docker run --rm \
  -v gdghack_whisper-models:/models/whisper \
  -v /home/gio/tools/whisper.cpp/models:/host-models:ro \
  alpine cp /host-models/ggml-base.bin /models/whisper/ggml-base.bin
```

Poi verifica:

```bash
curl -X POST http://127.0.0.1:8010/ai/v1/models/check \
  -H "Content-Type: application/json" \
  -d '{"model_profile":"qwen","require_stt":true,"require_embeddings":true}'
```

## Nota su RTX 5070

La GPU non viene "installata" nel container: il container usa il driver del kernel host tramite NVIDIA Container Toolkit. Per questo il requisito vero e avere driver host aggiornati e `docker run --gpus all ... nvidia-smi` funzionante.

Nel nostro setup:

- `ollama` usa la GPU se il runtime NVIDIA la espone;
- `ai-service` non richiede GPU;
- `whisper.cpp base` gira su CPU nel container.
