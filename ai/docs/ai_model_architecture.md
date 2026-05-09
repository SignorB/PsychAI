# Architettura modelli AI

Obiettivo: definire il cuore AI offline dell'MVP senza vincolare ancora grafica e backend. Questa architettura assume esecuzione locale, nessun invio dati in rete e modelli sostituibili tramite configurazione.

La specifica funzionale completa dei flussi MVP e dei confini con il backend futuro e in `docs/mvp_pipeline_spec.md`.

## Pipeline principale

1. **Audio sessione**
   - Input: file audio locale (`wav`, `mp3`, `m4a`).
   - Output: metadati audio minimi e percorso file.

2. **Trascrizione**
   - Engine previsto: `whisper.cpp`.
   - Modello target: `base` per laptop con 8 GB VRAM, `small` solo se la qualita audio lo richiede.
   - Output: `Transcript`, con testo grezzo, segmenti temporali e lingua rilevata.

3. **Parsing clinico strutturato**
   - Engine previsto: Ollama.
   - Modello default: `qwen2.5:3b-instruct`.
   - Modello fallback: `phi3:mini`.
   - Input: trascrizione grezza + prompt clinico + schema JSON atteso.
   - Output: `ClinicalSessionNote`.

4. **Embedding per storico paziente**
   - Engine previsto: Ollama embeddings.
   - Modello target: `nomic-embed-text`.
   - Input: chunk testuali della seduta e delle note.
   - Output: vettori + metadati per futura persistenza in ChromaDB.

5. **Query RAG**
   - Input: domanda clinica, id paziente, chunk recuperati.
   - Output: risposta con citazioni interne ai chunk.

## Moduli

- `src/ai_models/schemas.py`: contratti dati validabili.
- `src/ai_models/model_config.py`: configurazione dei modelli locali.
- `src/ai_models/profiles.py`: profili modello piccoli per 8 GB VRAM.
- `src/ai_models/factory.py`: costruzione della pipeline Ollama.
- `src/ai_models/prompts.py`: prompt system/user versionati.
- `src/ai_models/providers.py`: interfacce per motori locali.
- `src/ai_models/pipeline.py`: orchestrazione pura della pipeline AI.
- `src/ai_models/chunking.py`: chunking testuale per embedding/RAG.
- `src/ai_models/vector_store.py`: vector store in memoria per smoke test.

## Scelte MVP

- Nessun fine tuning.
- JSON rigido validato lato Python.
- Prompt in italiano, tono clinico neutro, senza diagnosi non supportate.
- Backend e UI potranno usare la pipeline senza conoscere i dettagli dei modelli.
- Ogni adapter reale dovra essere locale e testabile in airplane mode.

## Guardrail clinici

- Separare fatti riportati, osservazioni e ipotesi.
- Evitare diagnosi definitive se non esplicitamente presenti.
- Segnalare incertezze o parti poco chiare della trascrizione.
- Non inventare dati anagrafici, sintomi o eventi.
- Conservare solo dati necessari alla nota clinica.
