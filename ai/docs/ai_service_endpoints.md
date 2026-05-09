# Endpoint servizio AI

Per avviare tutta la pipeline da una repo appena clonata, vedi `docs/run_pipeline.md`.

Questa specifica descrive gli endpoint interni che il backend applicativo usera per parlare con il layer AI. La UI non deve chiamare direttamente questi endpoint.

## Principi

- Il servizio AI e locale e offline.
- Il backend e proprietario di pazienti, sedute, permessi, stato e persistenza relazionale.
- Il servizio AI riceve input gia autorizzati dal backend.
- Il servizio AI restituisce output validati, ma non decide da solo quando una seduta e chiusa.
- Le scritture su vector DB devono essere richieste dal backend.
- Ogni endpoint deve restituire errori espliciti e payload JSON validi.

## Convenzioni

Base path suggerito:

```text
/ai/v1
```

Avvio locale previsto:

```bash
python scripts/run_ai_service.py --host 127.0.0.1 --port 8010
```

Avvio Docker con Ollama in container e GPU NVIDIA:

```bash
docker compose up --build
```

Avvio Docker usando Ollama gia attivo sull'host:

```bash
docker compose -f docker-compose.host-ollama.yml up --build
```

Per abilitare `whisper.cpp`:

```bash
export WHISPER_CPP_EXECUTABLE=/path/to/whisper-cli
export WHISPER_CPP_MODEL_PATH=/path/to/ggml-base.bin
export WHISPER_CPP_LANGUAGE=it
python scripts/check_whisper_cpp.py
python scripts/run_ai_service.py --host 127.0.0.1 --port 8010
```

Header opzionali:

```text
X-Request-Id: uuid
X-Local-Only: true
```

Campi comuni:

- `patient_id`: id paziente gestito dal backend.
- `session_id`: id seduta gestito dal backend.
- `source_id`: id sorgente indicizzabile gestito dal backend.
- `model_profile`: `qwen` oppure `phi`.
- `source_type`: tipo di contenuto indicizzabile.

## Source Type

Valori ammessi:

```text
session_transcript
clinical_summary
voice_annotation
written_annotation
manual_clinical_note
closure_note
```

## 1. Health e modelli

### GET `/ai/v1/health`

Verifica che il servizio AI sia vivo.

Response:

```json
{
  "status": "ok",
  "offline_mode": true
}
```

### GET `/ai/v1/models`

Restituisce profili e modelli configurati.

Response:

```json
{
  "default_profile": "qwen",
  "profiles": [
    {
      "name": "qwen",
      "llm": "qwen2.5:3b-instruct",
      "embedding": "nomic-embed-text",
      "stt": "whisper.cpp base"
    },
    {
      "name": "phi",
      "llm": "phi3:mini",
      "embedding": "nomic-embed-text",
      "stt": "whisper.cpp base"
    }
  ]
}
```

### POST `/ai/v1/models/check`

Verifica che i modelli locali richiesti siano disponibili.

Request:

```json
{
  "model_profile": "qwen",
  "require_stt": true,
  "require_embeddings": true
}
```

Response:

```json
{
  "ok": true,
  "missing": [],
  "available": [
    "qwen2.5:3b-instruct",
    "nomic-embed-text"
  ]
}
```

## 2. Nodo trascrizionale

### POST `/ai/v1/transcriptions`

Trascrive un file audio locale gia accessibile dal servizio AI.

Request:

```json
{
  "patient_id": "patient_001",
  "session_id": "session_001",
  "audio_path": "/local/path/session_001.wav",
  "language": "it",
  "speaker_mode": "single_speaker",
  "model": "base"
}
```

Response:

```json
{
  "transcript_id": "transcript_001",
  "patient_id": "patient_001",
  "session_id": "session_001",
  "raw_text": "Testo trascritto...",
  "language": "it",
  "segments": [
    {
      "start_seconds": 0.0,
      "end_seconds": 4.2,
      "text": "Testo del segmento",
      "speaker_label": null
    }
  ],
  "metadata": {
    "provider": "whisper_cpp",
    "model": "base"
  }
}
```

Note:

- `transcript_id` puo essere generato dal backend o dal servizio AI. Per MVP e preferibile che lo generi il backend.
- L'audio non viene salvato dal servizio AI come record clinico definitivo.

### POST `/ai/v1/transcriptions/normalize`

Normalizza una trascrizione gia esistente senza rieseguire STT.

Request:

```json
{
  "transcript": {
    "raw_text": " testo  con spazi...",
    "language": "it",
    "segments": []
  }
}
```

Response:

```json
{
  "raw_text": "testo con spazi...",
  "language": "it",
  "segments": []
}
```

### POST `/ai/v1/transcriptions/speakers`

Assegna o rifinisce etichette speaker A/B dove possibile.

Request:

```json
{
  "strategy": "multi_speaker_a_b",
  "transcript": {
    "raw_text": "A: ... B: ...",
    "language": "it",
    "segments": []
  }
}
```

Response:

```json
{
  "raw_text": "A: ... B: ...",
  "language": "it",
  "segments": [
    {
      "start_seconds": 0.0,
      "end_seconds": 5.0,
      "text": "...",
      "speaker_label": "A"
    }
  ],
  "uncertainties": []
}
```

## 3. Nodo parsing seduta

### POST `/ai/v1/session-notes/draft`

Genera una bozza di nota clinica strutturata da una trascrizione.

Request:

```json
{
  "model_profile": "qwen",
  "patient_id": "patient_001",
  "session_id": "session_001",
  "transcript": {
    "raw_text": "Trascrizione della seduta...",
    "language": "it",
    "segments": []
  },
  "manual_notes": [
    "Nota aggiunta dallo psicologo prima del parsing"
  ],
  "retrieved_context": []
}
```

Response:

```json
{
  "patient_id": "patient_001",
  "session_id": "session_001",
  "themes": [
    {
      "title": "Difficolta a dormire",
      "evidence": ["difficolta a dormire da tre settimane"]
    }
  ],
  "symptoms": [
    {
      "name": "difficolta a dormire",
      "reported_by_patient": true,
      "evidence": ["difficolta a dormire"],
      "confidence": "medium"
    }
  ],
  "structured_note": "Nota clinica strutturata...",
  "next_session_recap": {
    "open_points": [],
    "suggested_followups": ["monitorare il sonno"],
    "patient_words_to_revisit": []
  },
  "uncertainties": [],
  "safety_flags": [],
  "source_transcript_excerpt": []
}
```

Note:

- Questo endpoint produce una bozza. Il backend deve salvarla come draft e mostrarla alla UI.
- La conferma finale e responsabilita del backend.

### POST `/ai/v1/session-notes/validate`

Valida e ripulisce una nota clinica modificata manualmente.

Request:

```json
{
  "patient_id": "patient_001",
  "session_id": "session_001",
  "transcript_text": "Trascrizione originale...",
  "clinical_note": {
    "patient_id": "patient_001",
    "session_id": "session_001",
    "themes": [],
    "symptoms": [],
    "structured_note": "Nota modificata...",
    "next_session_recap": {
      "open_points": [],
      "suggested_followups": [],
      "patient_words_to_revisit": []
    },
    "uncertainties": [],
    "safety_flags": [],
    "source_transcript_excerpt": []
  }
}
```

Response:

```json
{
  "valid": true,
  "clinical_note": {
    "patient_id": "patient_001",
    "session_id": "session_001",
    "themes": [],
    "symptoms": [],
    "structured_note": "Nota modificata...",
    "next_session_recap": {
      "open_points": [],
      "suggested_followups": [],
      "patient_words_to_revisit": []
    },
    "uncertainties": [],
    "safety_flags": [],
    "source_transcript_excerpt": []
  },
  "warnings": []
}
```

## 4. Nodo annotazioni

### POST `/ai/v1/annotations/audio/transcribe`

Trascrive una annotazione vocale breve.

Request:

```json
{
  "patient_id": "patient_001",
  "annotation_id": "annotation_001",
  "audio_path": "/local/path/annotation_001.wav",
  "language": "it"
}
```

Response:

```json
{
  "annotation_id": "annotation_001",
  "transcript": {
    "raw_text": "Annotazione trascritta...",
    "language": "it",
    "segments": []
  }
}
```

### POST `/ai/v1/annotations/normalize`

Normalizza una annotazione scritta o trascritta.

Request:

```json
{
  "patient_id": "patient_001",
  "annotation_id": "annotation_001",
  "text": "nota libera..."
}
```

Response:

```json
{
  "annotation_id": "annotation_001",
  "normalized_text": "nota libera...",
  "warnings": []
}
```

## 5. Nodo embedding e indicizzazione

### POST `/ai/v1/embeddings/chunks`

Divide un testo in chunk indicizzabili.

Request:

```json
{
  "patient_id": "patient_001",
  "source_id": "source_001",
  "source_type": "clinical_summary",
  "text": "Testo da indicizzare...",
  "chunk_size_chars": 1400,
  "chunk_overlap_chars": 180,
  "metadata": {
    "session_id": "session_001"
  }
}
```

Response:

```json
{
  "chunks": [
    {
      "chunk_id": "source_001:0000",
      "patient_id": "patient_001",
      "source_id": "source_001",
      "text": "Testo da indicizzare...",
      "metadata": {
        "source_type": "clinical_summary",
        "session_id": "session_001",
        "start_char": 0,
        "end_char": 23
      }
    }
  ]
}
```

### POST `/ai/v1/embeddings`

Genera embedding per testi o chunk. Non scrive nel vector DB.

Request:

```json
{
  "model_profile": "qwen",
  "texts": [
    "Testo da vettorizzare"
  ]
}
```

Response:

```json
{
  "model": "nomic-embed-text",
  "vectors": [
    [0.0123, -0.0456]
  ]
}
```

### POST `/ai/v1/vector-index/upsert`

Scrive chunk e vettori nel vector store configurato.

Request:

```json
{
  "patient_id": "patient_001",
  "source_id": "source_001",
  "source_type": "clinical_summary",
  "chunks": [
    {
      "chunk_id": "source_001:0000",
      "patient_id": "patient_001",
      "source_id": "source_001",
      "text": "Testo indicizzato...",
      "metadata": {
        "session_id": "session_001"
      }
    }
  ],
  "vectors": [
    [0.0123, -0.0456]
  ]
}
```

Response:

```json
{
  "indexed": true,
  "source_id": "source_001",
  "chunk_count": 1
}
```

Uso consigliato:

1. backend salva fonte in SQLite;
2. backend chiama chunking/embedding;
3. backend chiama upsert vector DB;
4. backend marca la fonte come `indexed`.

### POST `/ai/v1/vector-index/index-source`

Endpoint compatto: chunking + embedding + upsert in una chiamata.

Request:

```json
{
  "model_profile": "qwen",
  "patient_id": "patient_001",
  "source_id": "source_001",
  "source_type": "closure_note",
  "text": "Testo finale della chiusura seduta...",
  "metadata": {
    "session_id": "session_001"
  }
}
```

Response:

```json
{
  "indexed": true,
  "source_id": "source_001",
  "chunk_count": 1,
  "chunk_ids": ["source_001:0000"]
}
```

Nota:

- Questo endpoint e comodo per MVP.
- In produzione locale e preferibile usare gli step separati se serve maggiore controllo transazionale.

## 6. Nodo ricerca semantica e RAG

### POST `/ai/v1/search/semantic`

Esegue ricerca semantica nello storico di un paziente.

Request:

```json
{
  "model_profile": "qwen",
  "patient_id": "patient_001",
  "query": "Cosa e emerso sul sonno?",
  "top_k": 5,
  "filters": {
    "source_type": ["clinical_summary", "closure_note"],
    "session_id": null
  }
}
```

Response:

```json
{
  "results": [
    {
      "chunk": {
        "chunk_id": "source_001:0000",
        "patient_id": "patient_001",
        "source_id": "source_001",
        "text": "Testo rilevante...",
        "metadata": {
          "source_type": "clinical_summary"
        }
      },
      "score": 0.82
    }
  ]
}
```

### POST `/ai/v1/rag/answer`

Genera una risposta usando chunk gia recuperati dal backend.

Request:

```json
{
  "model_profile": "qwen",
  "patient_id": "patient_001",
  "question": "Cosa e emerso sul sonno?",
  "retrieved_chunks": [
    {
      "chunk": {
        "chunk_id": "source_001:0000",
        "patient_id": "patient_001",
        "source_id": "source_001",
        "text": "La paziente riferisce difficolta a dormire...",
        "metadata": {}
      },
      "score": 0.82
    }
  ]
}
```

Response:

```json
{
  "answer": "La paziente riferisce difficolta a dormire...",
  "citations": ["source_001:0000"],
  "uncertainties": []
}
```

### POST `/ai/v1/rag/query`

Endpoint compatto: embedding domanda + semantic search + risposta RAG.

Request:

```json
{
  "model_profile": "qwen",
  "patient_id": "patient_001",
  "question": "Quali temi vanno ripresi nella prossima seduta?",
  "top_k": 5,
  "filters": {}
}
```

Response:

```json
{
  "answer": "Vanno ripresi sonno e routine di camminate.",
  "citations": ["source_001:0000"],
  "uncertainties": [],
  "retrieved_chunk_ids": ["source_001:0000"]
}
```

## 7. Chiusura seduta

### POST `/ai/v1/sessions/compose-indexable-text`

Compone il testo finale da indicizzare per una seduta chiusa. Non scrive su DB.

Request:

```json
{
  "patient_id": "patient_001",
  "session_id": "session_001",
  "transcript_text": "Trascrizione...",
  "clinical_summary": "Summary clinico...",
  "manual_notes": [
    "Nota manuale"
  ],
  "closure_note": "Nota finale di chiusura"
}
```

Response:

```json
{
  "source_type": "closure_note",
  "text": "Testo composto e pronto per indicizzazione...",
  "sections": [
    {
      "name": "clinical_summary",
      "start_char": 0,
      "end_char": 120
    }
  ]
}
```

Uso backend:

1. backend riceve conferma chiusura dalla UI;
2. backend chiama `compose-indexable-text`;
3. backend salva/aggiorna record relazionale;
4. backend chiama `index-source`;
5. backend marca seduta come `closed` e `indexed`.

## Errori

Formato errore comune:

```json
{
  "error": {
    "code": "MODEL_NOT_AVAILABLE",
    "message": "Il modello qwen2.5:3b-instruct non e disponibile localmente.",
    "details": {}
  }
}
```

Codici principali:

- `MODEL_NOT_AVAILABLE`
- `INVALID_SCHEMA`
- `TRANSCRIPTION_FAILED`
- `LLM_JSON_INVALID`
- `EMBEDDING_FAILED`
- `VECTOR_STORE_FAILED`
- `INVALID_PATIENT_SCOPE`
- `CITATION_VALIDATION_FAILED`

## Endpoint MVP minimi

Per partire velocemente servono solo questi:

1. `GET /ai/v1/health`
2. `GET /ai/v1/models`
3. `POST /ai/v1/transcriptions`
4. `POST /ai/v1/session-notes/draft`
5. `POST /ai/v1/vector-index/index-source`
6. `POST /ai/v1/rag/query`

Gli altri endpoint servono a rendere il sistema piu controllabile quando separeremo bene backend, DB e vector DB.
