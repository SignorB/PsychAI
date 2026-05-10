# Assessment integrazione frontend/backend/AI

## Stato attuale

### AI service (`ai/`)

Gia disponibile:

- FastAPI su `/ai/v1`;
- Ollama integration;
- `qwen2.5:3b-instruct`;
- `phi3:mini`;
- `nomic-embed-text`;
- whisper.cpp adapter;
- endpoint parsing nota clinica;
- endpoint embedding/vector in memoria;
- endpoint RAG.

### Backend (`backend/`)

Prima dell'integrazione:

- CRUD base pazienti;
- CRUD base sessioni;
- SQLite locale;
- nessun collegamento verso `ai-service`.

Ora collegato:

- `GET /health`: include stato `ai-service`;
- `GET /patients/{patient_id}/sessions/{session_id}`;
- `POST /patients/{patient_id}/sessions/{session_id}/generate-note`;
- `POST /patients/{patient_id}/ask`;
- client interno `backend/ai_client.py`.

Flusso attuale:

```text
frontend session page
-> backend /generate-note
-> ai-service /session-notes/draft
-> backend salva clinical_note
-> ai-service /vector-index/index-source
-> frontend mostra nota, temi, sintomi
```

### Frontend (`frontend/`)

Prima dell'integrazione:

- dashboard e molte pagine usavano `mock-data`;
- lista pazienti usava gia il backend;
- pagina sessione usava ancora mock.

Ora collegato:

- `lib/api.ts` ha client per:
  - creare paziente;
  - creare sessione;
  - leggere sessione;
  - generare nota AI;
  - fare domanda RAG;
- `StartSessionButton` crea sessione reale e redirige alla pagina sessione;
- pagina sessione reale legge backend, permette editing transcript, genera nota AI e interroga storico paziente.

## Cosa manca

Priorita 1:

- endpoint backend per upload audio e trascrizione via `ai-service`;
- persistenza di note manuali separate dalla nota AI;
- stato sessione: `draft`, `generated`, `approved`, `indexed`, `closed`.

Priorita 2:

- sostituire mock-data da dashboard/search/notes con backend reale;
- endpoint backend per annotazioni scritte/vocali;
- ChromaDB persistente al posto del vector store in memoria.

Priorita 3:

- gestione errori UI migliore di `alert`;
- approvazione nota clinica;
- chiusura seduta;
- test end-to-end con backend + ai-service + frontend.

## Come provarlo ora

1. Avvia AI service:

```bash
cd ai
docker compose up --build
```

2. Avvia backend:

```bash
cd backend
AI_SERVICE_URL=http://127.0.0.1:8010 ./.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```

3. Avvia frontend con Node >= 18.17:

```bash
cd frontend
npm run dev -- --hostname 0.0.0.0
```

4. Apri:

```text
http://127.0.0.1:3000/patients
```

5. Apri un paziente, crea una sessione, genera la nota AI.

Per usare il sistema da un altro device nella stessa rete, apri il frontend usando
l'IP LAN della macchina, per esempio:

```text
http://192.168.1.50:3000/patients
```

Il frontend chiamera automaticamente il backend sullo stesso host alla porta
`8000`, quindi il browser usera `http://192.168.1.50:8000`. Se devi forzare un
host diverso:

```bash
cd frontend
NEXT_PUBLIC_API_URL=http://192.168.1.50:8000 npm run dev -- --hostname 0.0.0.0
```

Il backend accetta di default origin localhost e reti private `10.x.x.x`,
`172.16-31.x.x`, `192.168.x.x`. Per una rete diversa puoi passare:

```bash
BACKEND_CORS_ORIGINS=http://my-host:3000 \
AI_SERVICE_URL=http://127.0.0.1:8010 \
./.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```
