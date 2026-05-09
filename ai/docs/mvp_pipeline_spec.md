# Specifica MVP: pipeline AI e integrazione backend

Questa specifica definisce il comportamento atteso dei nodi AI e il modo in cui il backend futuro dovra orchestrare persistenza, stato paziente e interazione con la UI.

Il contratto degli endpoint interni esposti dal servizio AI al backend e descritto in `docs/ai_service_endpoints.md`.

## Obiettivo MVP

Consentire allo psicologo di:

1. aggiungere annotazioni vocali o scritte a una scheda paziente;
2. trascrivere una seduta o meeting clinico;
3. generare un summary strutturato della seduta;
4. aggiungere o modificare note manuali;
5. chiudere la seduta/paziente aggiornando database relazionale e vector DB locale;
6. fare ricerca semantica sullo storico del paziente.

Tutto deve funzionare offline. I dati clinici non devono uscire dal dispositivo.

## Nodi AI

### 1. Nodo Trascrizionale

Responsabilita: trasformare audio locale in testo strutturato.

Modello target:

- `whisper.cpp base` per MVP leggero;
- `whisper.cpp small` se la qualita audio richiede piu accuratezza.

Input:

- `audio_path`;
- `patient_id`;
- `session_id`;
- opzioni lingua;
- modalita speaker:
  - `single_speaker`;
  - `multi_speaker_unknown`;
  - `multi_speaker_a_b`.

Output:

- `Transcript`;
- testo grezzo;
- segmenti temporali;
- eventuale `speaker_label`;
- metadati audio e modello.

Supporto multiutente A/B:

- MVP base: etichette euristiche `A`/`B` se gia fornite dal processo di registrazione o da segmenti separati.
- MVP realistico: Whisper produce segmenti temporali, il nodo parsing puo inferire turni testuali dove possibile.
- Fuori MVP: diarizzazione audio robusta con modello dedicato speaker diarization.

Funzioni base:

- `transcribe_audio(audio_path, options) -> Transcript`
- `normalize_transcript(transcript) -> Transcript`
- `assign_speaker_labels(transcript, strategy) -> Transcript`

Confine backend:

- il nodo non salva nel DB;
- restituisce `Transcript`;
- il backend decide se salvare audio, trascrizione grezza e metadati.

### 2. Nodo Parsing Trascrizioni Meeting

Responsabilita: trasformare una trascrizione in oggetti clinici strutturati.

Modello target:

- default: `qwen2.5:3b-instruct`;
- fallback: `phi3:mini`;
- structured output via schema Pydantic.

Input:

- `patient_id`;
- `session_id`;
- `Transcript`;
- contesto opzionale paziente recuperato dal backend/RAG;
- note manuali opzionali dello psicologo.

Output:

- `ClinicalSessionNote`;
- temi trattati;
- sintomi o osservazioni riportate;
- nota clinica strutturata;
- recap per prossima seduta;
- incertezze;
- safety flags;
- estratti sorgente.

Funzioni base:

- `parse_session_transcript(patient_id, session_id, transcript) -> ClinicalSessionNote`
- `merge_manual_notes(clinical_note, manual_notes) -> ClinicalSessionNoteDraft`
- `validate_clinical_note(note, transcript) -> ClinicalSessionNote`
- `sanitize_negated_risks(note, transcript) -> ClinicalSessionNote`

Confine backend:

- il nodo non decide lo stato della seduta;
- produce una bozza validata;
- il backend presenta la bozza alla UI e salva solo dopo conferma o chiusura.

### 3. Nodo Embedding

Responsabilita: preparare lo storico testuale per ricerca semantica.

Modello target:

- `nomic-embed-text`.

Input:

- testo da indicizzare;
- `patient_id`;
- `source_id`;
- `source_type`;
- metadati clinici minimi;
- configurazione chunking.

Output:

- chunk testuali;
- vettori embedding;
- metadati per vector DB.

Funzioni base:

- `chunk_text(patient_id, source_id, text, config) -> list[TextChunk]`
- `embed_chunks(chunks) -> list[EmbeddingRecord]`
- `build_vector_write_plan(chunks, vectors) -> VectorWritePlan`
- `semantic_search(patient_id, question, top_k) -> list[RetrievedChunk]`

Scrittura vector DB:

- Il nodo embedding deve sapere generare chunk e vettori.
- La scrittura nel vector DB puo essere fatta da un adapter del nodo (`VectorStore.upsert`), ma deve essere invocata dal backend dentro un flusso controllato.
- Il backend resta proprietario della transazione logica: prima salva record relazionale, poi indicizza nel vector DB, poi marca la seduta come indicizzata.

Motivo: SQLite e vector DB devono rimanere coerenti. Il nodo AI non deve decidere da solo quando una seduta e ufficialmente chiusa.

### 4. Nodo Ricerca Semantica / RAG

Responsabilita: rispondere a domande sullo storico del paziente usando solo chunk recuperati.

Input:

- `patient_id`;
- domanda;
- `top_k`;
- eventuali filtri: data, tipo fonte, sessione.

Output:

- `RAGAnswer`;
- risposta;
- citazioni chunk;
- incertezze.

Funzioni base:

- `retrieve_patient_context(patient_id, question, filters) -> list[RetrievedChunk]`
- `answer_patient_question(patient_id, question) -> RAGAnswer`
- `validate_rag_citations(answer, retrieved_chunks) -> RAGAnswer`

Confine backend:

- il backend autorizza la query sul paziente corretto;
- il nodo RAG non accede a pazienti diversi;
- le citazioni devono essere chunk id realmente recuperati.

## Flussi UI Previsti

### Flusso A: Annotazione Vocale Rapida

1. UI registra audio breve.
2. Backend crea `annotation_id`.
3. Nodo trascrizionale produce `Transcript`.
4. Backend salva trascrizione come annotazione paziente.
5. Alla chiusura, backend invia testo al nodo embedding.
6. Vector DB viene aggiornato con `source_type=voice_annotation`.

Funzioni coinvolte:

- `transcribe_audio`
- `save_patient_annotation`
- `index_patient_source`

### Flusso B: Annotazione Scritta

1. UI invia testo scritto.
2. Backend salva annotazione come bozza o nota confermata.
3. Alla chiusura, backend invia testo al nodo embedding.
4. Vector DB viene aggiornato con `source_type=written_annotation`.

Funzioni coinvolte:

- `save_patient_annotation`
- `index_patient_source`

### Flusso C: Trascrizione Seduta / Meeting

1. UI carica o registra audio seduta.
2. Backend crea `session_id`.
3. Nodo trascrizionale produce `Transcript`.
4. Backend salva trascrizione grezza.
5. Nodo parsing produce `ClinicalSessionNote`.
6. UI mostra bozza allo psicologo.
7. Psicologo corregge o aggiunge note.
8. Backend salva nota clinica finale.

Funzioni coinvolte:

- `transcribe_audio`
- `parse_session_transcript`
- `save_transcript`
- `save_clinical_note_draft`
- `approve_clinical_note`

### Flusso D: Chiusura Seduta/Paziente

1. UI invia comando di chiusura.
2. Backend compone il testo indicizzabile:
   - trascrizione;
   - summary;
   - note manuali;
   - decisioni/recap.
3. Nodo embedding genera chunk e vettori.
4. Backend salva o aggiorna vector DB.
5. Backend marca la seduta come `closed` e `indexed`.

Funzioni coinvolte:

- `compose_indexable_session_text`
- `index_patient_source`
- `close_session`

### Flusso E: Domanda Sullo Storico Paziente

1. UI invia domanda.
2. Backend verifica `patient_id`.
3. Nodo embedding genera embedding della domanda.
4. Vector DB recupera chunk rilevanti.
5. Nodo RAG genera risposta citata.
6. Backend restituisce risposta e citazioni alla UI.

Funzioni coinvolte:

- `semantic_search`
- `answer_patient_question`
- `validate_rag_citations`

## Contratti Dati Minimi

### SourceType

- `session_transcript`
- `clinical_summary`
- `voice_annotation`
- `written_annotation`
- `manual_clinical_note`
- `closure_note`

### Source Lifecycle

- `draft`: creato ma non confermato;
- `confirmed`: confermato dallo psicologo;
- `indexed`: presente nel vector DB;
- `closed`: parte di una seduta chiusa.

### Record relazionale futuro

Il backend dovra avere almeno:

- `patients`;
- `sessions`;
- `transcripts`;
- `clinical_notes`;
- `annotations`;
- `vector_sources`;
- `rag_queries` opzionale per audit locale.

### Metadati chunk

Ogni chunk deve includere:

- `chunk_id`;
- `patient_id`;
- `source_id`;
- `source_type`;
- `session_id` opzionale;
- `created_at`;
- `model`;
- `text_hash` opzionale;
- range caratteri o timestamp sorgente.

## API Backend Future

Endpoint indicativi:

- `POST /patients/{patient_id}/annotations/text`
- `POST /patients/{patient_id}/annotations/audio`
- `POST /patients/{patient_id}/sessions`
- `POST /sessions/{session_id}/transcribe`
- `POST /sessions/{session_id}/parse`
- `PATCH /sessions/{session_id}/clinical-note`
- `POST /sessions/{session_id}/close`
- `POST /patients/{patient_id}/ask`

Il backend non deve esporre direttamente Ollama o Whisper alla UI. La UI parla solo con endpoint applicativi.

## Stato Attuale Nel Codice

Gia presente:

- profili `qwen` e `phi`;
- provider Ollama per LLM ed embedding;
- parsing trascrizione in `ClinicalSessionNote`;
- chunking;
- vector store in memoria;
- RAG con citazioni validate;
- smoke test su fixture.

Da implementare:

- adapter reale `whisper.cpp`;
- schemi per annotazioni, source lifecycle e source type;
- persistenza SQLite;
- ChromaDB persistente;
- service layer backend;
- endpoint FastAPI;
- UI.

## Decisioni Architetturali

- Il layer AI deve essere stateless dove possibile.
- Il backend e proprietario dello stato clinico e della coerenza tra SQLite e vector DB.
- Il nodo embedding puo scrivere su un vector store tramite adapter, ma non decide autonomamente quando farlo.
- La UI non modifica direttamente il vector DB.
- Ogni output LLM clinico deve essere validato da schema e guardrail deterministici.
