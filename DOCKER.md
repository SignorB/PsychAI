# Docker compose unico

Questo compose avvia tutta la pipeline in una sola rete Docker:

- `frontend`: unico servizio esposto all'esterno su `3000`
- `backend`: FastAPI interno su `backend:8000`
- `ai-service`: servizio AI interno su `ai-service:8010`
- `ollama`: runtime modelli interno su `ollama:11434`

Il browser chiama solo il frontend. Le chiamate API passano da:

```text
browser -> frontend /api/backend/* -> backend -> ai-service -> ollama
```

## Avvio

Da root repo:

```bash
cd /home/gio/psychord
docker compose up --build
```

Poi apri:

```text
http://home:3000
```

oppure:

```text
http://IP_LAN_DELLA_MACCHINA:3000
```

Non serve esporre `8000`, `8010` o `11434` sulla rete locale.

## GPU

Ollama usa la GPU tramite NVIDIA Container Toolkit. Verifica host:

```bash
docker run --rm --gpus all nvidia/cuda:12.8.0-base-ubuntu24.04 nvidia-smi
```

Se questo comando fallisce, il problema e nel setup Docker/NVIDIA host, non nel compose.

## Download modelli

Al primo avvio `ai-service` aspetta Ollama e scarica:

- `qwen2.5:3b-instruct`
- `phi3:mini`
- `nomic-embed-text`
- `ggml-base.bin` per whisper.cpp

I modelli restano nei volumi Docker:

- `ollama-data`
- `whisper-models`

## Vector index persistente

La ricerca avanzata usa embeddings locali e salva l'indice in SQLite dentro il
volume Docker:

- `vector-index`

Il file interno e:

```text
/data/vector_index.sqlite
```

Per popolare o aggiornare l'indice apri la pagina:

```text
http://home:3000/search
```

e usa `Build / refresh index`. L'indice viene aggiornato con `INSERT OR REPLACE`,
quindi puoi rilanciare il refresh senza duplicare chunk gia indicizzati.

## Debug opzionale

Se vuoi ispezionare un servizio interno:

```bash
docker compose logs -f backend
docker compose logs -f ai-service
docker compose logs -f ollama
```

Per chiamare il backend dal container frontend:

```bash
docker compose exec frontend node -e "fetch('http://backend:8000/health').then(r=>r.text()).then(console.log)"
```

Per chiamare AI dal container backend:

```bash
docker compose exec backend python -c "import urllib.request; print(urllib.request.urlopen('http://ai-service:8010/ai/v1/health').read().decode())"
```
