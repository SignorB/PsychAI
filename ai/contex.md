# Progetto: AI Offline per Psicologi (Hackathon 24h)

## 🎯 Missione
Esistiamo per sollevare gli psicologi liberi professionisti dal carico della burocrazia clinica. Ogni seduta genera ore di documentazione scritta a memoria, con il rischio di perdere dettagli fondamentali. Poiché i dati clinici sono estremamente sensibili, l'unica soluzione legale e sicura è un'architettura **100% locale (On-Device)**.

## 👤 Utente Target
- **Chi è:** Psicologo libero professionista (30–55 anni).
- **Contesto:** Studio privato, 10–30 pazienti a settimana.
- **Problema:** Perdita di tempo (1-2 ore al giorno) e stress cognitivo dovuto alla redazione manuale di note, referti e lettere di referral.

---

## 🛠️ Architettura Tecnica (100% Offline)

### 1. Il Cuore AI (Modelli)
- **Speech-to-Text:** `Whisper.cpp` (Modello `base` o `small`).
    - *Strategia:* Elaborazione batch a fine seduta per massima precisione (Diarization testuale via LLM).
- **LLM (Reasoning & Parsing):** `Llama-3-8B-Instruct` o `Phi-3-Mini` (Quantizzazione GGUF 4-bit).
    - *Engine:* **Ollama** per gestire l'inferenza locale via API REST.
- **Embedding (RAG):** `nomic-embed-text` o `mxbai-embed-large` via Ollama.

### 2. Lo Stack Software
- **Frontend UI:** `Streamlit` o `Gradio` (Python-based). Semplice, veloce, reattivo.
- **Backend API:** `FastAPI` (Python). Coordina la comunicazione tra UI, Whisper e Ollama.
- **Database Relazionale:** `SQLite`. Un singolo file locale per gestire anagrafiche e note.
- **Vector Database:** `ChromaDB` (Persistent Client). Per la ricerca semantica e lo storico dei pazienti.

---

## ✅ Flusso Operativo (Demo MVP)

1. **Registrazione:** Lo psicologo avvia la registrazione (simulata o reale di 30s).
2. **Trascrizione:** `Whisper.cpp` genera il testo grezzo della seduta.
3. **Structured Parsing:** L'LLM riceve il testo e lo trasforma in un oggetto JSON rigido (tramite Pydantic) contenente:
    - Temi trattati.
    - Sintomi rilevati.
    - Nota clinica strutturata.
    - Recap per la seduta successiva.
4. **Aggiornamento DB:** FastAPI scrive i dati nel file `pazienti.db`.
5. **Visualizzazione:** La UI di Streamlit mostra istantaneamente la scheda paziente aggiornata.

---

## 💡 Strategie Chiave per le 24 Ore

### No Fine-Tuning
In un hackathon, l'addestramento è un rischio inutile. Usiamo l'**In-Context Learning**:
- **Prompt Engineering:** Istruzioni di sistema granulari per forzare lo stile clinico.
- **Few-Shot:** Fornire all'LLM 2-3 esempi di "Trascrizione -> Nota Clinica" nel prompt.

### JSON Mode
Utilizzare l'output JSON forzato di Ollama per evitare errori di parsing e garantire che il frontend riceva dati sempre validi per le tabelle SQLite.

### RAG (Retrieval-Augmented Generation)
Per rispondere a domande come *"Cosa ha detto Marco sulla sua famiglia mesi fa?"*:
- Dividere i testi in chunk.
- Convertire in vettori con il modello di embedding.
- Cercare in `ChromaDB` e passare solo i pezzi rilevanti all'LLM.

---

## 🏆 Perché è una soluzione vincente (Brief MSI)
- **"Cut the Cord":** Il locale non è un'ottimizzazione, è un **obbligo di legge** (GDPR/Segreto professionale).
- **Privacy-by-Design:** I dati non lasciano mai il laptop dello psicologo.
- **Airplane Mode Test:** La demo funziona perfettamente con il Wi-Fi spento, dimostrando l'indipendenza totale dal cloud.

## ⚠️ Fuori Scope (Roadmap Futura)
- Analisi dei trend tra più pazienti.
- Summarization di paper accademici dal web.
- Fatturazione e gestione calendario.
- Burnout monitoring.