# Skema Database (Database Schema)

## 1. Pendahuluan

Dokumen ini menjelaskan struktur database yang digunakan oleh Weaver.

**Lokasi**: `src/lib/db/schema.ts`
**ORM**: Drizzle
**Database**: PostgreSQL dengan ekstensi pgvector

---

## 2. Overview Tabel

```
┌──────────────────┐     ┌──────────────────┐
│    documents     │────>│  document_chunks │
└──────────────────┘     └──────────────────┘
                               │
                               ▼
                         (embedding 1536-d)

┌──────────────────┐     ┌──────────────────┐
│  chat_sessions   │────>│  chat_messages   │
└──────────────────┘     └──────────────────┘
        │
        ├─────────────>  agent_steps
        └─────────────>  guardrail_logs

┌──────────────────┐     ┌──────────────────┐
│ evaluation_runs  │────>│evaluation_questions│
└──────────────────┘     └──────────────────┘
                               │
                               ▼
                         human_annotations

┌──────────────────┐     ┌──────────────────┐
│ ablation_studies │────>│statistical_analyses│
└──────────────────┘     └──────────────────┘
```

---

## 3. Tabel Documents

### 3.1 Deskripsi
Menyimpan dokumen original yang di-upload dengan metadata pemrosesan.

### 3.2 Kolom

| Kolom              | Tipe      | Deskripsi                                      |
| ------------------ | --------- | ---------------------------------------------- |
| `id`               | UUID (PK) | Identifier unik                                |
| `title`            | TEXT      | Judul dokumen                                  |
| `fileName`         | TEXT      | Nama file asli                                 |
| `fileType`         | TEXT      | Tipe file (pdf, txt, md, docx)                 |
| `fileSize`         | INTEGER   | Ukuran file (bytes)                            |
| `content`          | TEXT      | Teks yang diekstrak                            |
| `metadata`         | JSONB     | Metadata dokumen                               |
| `processingStatus` | TEXT      | Status: pending, processing, completed, failed |
| `processingError`  | TEXT      | Pesan error jika gagal                         |
| `chunkingStrategy` | TEXT      | Strategi chunking yang digunakan               |
| `createdAt`        | TIMESTAMP | Waktu upload                                   |
| `updatedAt`        | TIMESTAMP | Waktu update terakhir                          |

---

## 4. Tabel Document Chunks

### 4.1 Deskripsi
Menyimpan potongan dokumen yang sudah diproses dengan embedding untuk retrieval.

### 4.2 Kolom

| Kolom         | Tipe         | Deskripsi                                |
| ------------- | ------------ | ---------------------------------------- |
| `id`          | UUID (PK)    | Identifier unik                          |
| `documentId`  | UUID (FK)    | Reference ke documents                   |
| `content`     | TEXT         | Konten chunk                             |
| `chunkIndex`  | INTEGER      | Urutan chunk dalam dokumen               |
| `startOffset` | INTEGER      | Posisi awal dalam dokumen                |
| `endOffset`   | INTEGER      | Posisi akhir dalam dokumen               |
| `metadata`    | JSONB        | Metadata chunk (section, headings, page) |
| `embedding`   | VECTOR(1536) | Embedding dari text-embedding-3-small    |
| `keywords`    | TEXT[]       | Extracted keywords untuk BM25            |
| `createdAt`   | TIMESTAMP    | Waktu pembuatan                          |

### 4.3 Index

- **GIN Index**: Untuk full-text search (trigram)
- **Vector Index**: Untuk similarity search (pgvector)

---

## 5. Tabel Chat Sessions

### 5.1 Deskripsi
Menyimpan sesi percakapan pengguna dengan konfigurasi.

### 5.2 Kolom

| Kolom               | Tipe      | Deskripsi               |
| ------------------- | --------- | ----------------------- |
| `id`                | UUID (PK) | Identifier unik         |
| `title`             | TEXT      | Judul sesi              |
| `useRag`            | BOOLEAN   | Apakah RAG aktif        |
| `useAgenticMode`    | BOOLEAN   | Apakah mode agentic     |
| `retrievalStrategy` | TEXT      | vector, keyword, hybrid |
| `createdAt`         | TIMESTAMP | Waktu pembuatan         |
| `updatedAt`         | TIMESTAMP | Waktu update            |

---

## 6. Tabel Chat Messages

### 6.1 Deskripsi
Menyimpan pesan individual dalam sesi chat.

### 6.2 Kolom

| Kolom                 | Tipe      | Deskripsi                  |
| --------------------- | --------- | -------------------------- |
| `id`                  | UUID (PK) | Identifier unik            |
| `sessionId`           | UUID (FK) | Reference ke chat_sessions |
| `role`                | TEXT      | user, assistant, system    |
| `content`             | TEXT      | Isi pesan                  |
| `retrievedChunks`     | JSONB     | Chunk yang di-retrieve     |
| `ragEnabled`          | BOOLEAN   | RAG aktif untuk pesan ini  |
| `agenticMode`         | BOOLEAN   | Mode agentic aktif         |
| `agentStepsCount`     | INTEGER   | Jumlah langkah agen        |
| `guardrailsTriggered` | JSONB     | Guardrails yang trigger    |
| `latencyMs`           | INTEGER   | Waktu respons              |
| `tokenCount`          | INTEGER   | Jumlah token               |
| `createdAt`           | TIMESTAMP | Waktu pembuatan            |

---

## 7. Tabel Agent Steps

### 7.1 Deskripsi
Menyimpan trace eksekusi langkah-langkah agen untuk debugging dan evaluasi.

### 7.2 Kolom

| Kolom        | Tipe      | Deskripsi                                  |
| ------------ | --------- | ------------------------------------------ |
| `id`         | UUID (PK) | Identifier unik                            |
| `sessionId`  | UUID (FK) | Reference ke chat_sessions                 |
| `messageId`  | UUID      | Reference ke chat_messages                 |
| `stepIndex`  | INTEGER   | Urutan langkah                             |
| `stepType`   | TEXT      | tool_call, reasoning, retrieval, synthesis |
| `toolName`   | TEXT      | Nama tool yang digunakan                   |
| `toolInput`  | JSONB     | Input ke tool                              |
| `toolOutput` | JSONB     | Output dari tool                           |
| `reasoning`  | TEXT      | Penjelasan reasoning                       |
| `durationMs` | INTEGER   | Durasi langkah                             |
| `createdAt`  | TIMESTAMP | Waktu eksekusi                             |

---

## 8. Tabel Guardrail Logs

### 8.1 Deskripsi
Menyimpan log semua event guardrails untuk audit dan analisis.

### 8.2 Kolom

| Kolom           | Tipe      | Deskripsi                   |
| --------------- | --------- | --------------------------- |
| `id`            | UUID (PK) | Identifier unik             |
| `sessionId`     | UUID (FK) | Reference ke chat_sessions  |
| `messageId`     | UUID      | Reference ke message        |
| `guardrailType` | TEXT      | Tipe guardrail yang trigger |
| `triggered`     | BOOLEAN   | Apakah guardrail trigger    |
| `severity`      | TEXT      | low, medium, high, critical |
| `details`       | JSONB     | Detail pelanggaran          |
| `createdAt`     | TIMESTAMP | Waktu event                 |

---

## 9. Tabel Evaluation Runs

### 9.1 Deskripsi
Menyimpan konfigurasi dan status run evaluasi.

### 9.2 Kolom

| Kolom                | Tipe      | Deskripsi                           |
| -------------------- | --------- | ----------------------------------- |
| `id`                 | UUID (PK) | Identifier unik                     |
| `name`               | TEXT      | Nama evaluasi                       |
| `description`        | TEXT      | Deskripsi                           |
| `status`             | TEXT      | pending, running, completed, failed |
| `totalQuestions`     | INTEGER   | Jumlah pertanyaan total             |
| `completedQuestions` | INTEGER   | Pertanyaan yang sudah selesai       |
| `retrievalStrategy`  | TEXT      | Strategi retrieval                  |
| `chunkingStrategy`   | TEXT      | Strategi chunking                   |
| `useAgenticMode`     | BOOLEAN   | Mode agentic                        |
| `useReranker`        | BOOLEAN   | Gunakan reranker                    |
| `rerankerStrategy`   | TEXT      | Strategi reranker                   |
| `enableGuardrails`   | BOOLEAN   | Guardrails aktif                    |
| `language`           | TEXT      | Bahasa evaluasi                     |
| `evaluationMode`     | TEXT      | quick, production                   |
| `createdAt`          | TIMESTAMP | Waktu pembuatan                     |
| `completedAt`        | TIMESTAMP | Waktu selesai                       |

---

## 10. Tabel Evaluation Questions

### 10.1 Deskripsi
Menyimpan hasil evaluasi per pertanyaan dengan semua metrik.

### 10.2 Kolom Utama

| Kategori         | Kolom                                  |
| ---------------- | -------------------------------------- |
| **Identifikasi** | id, runId, question, groundTruth       |
| **Jawaban**      | ragAnswer, nonRagAnswer                |
| **Konteks**      | retrievedContexts, relevantChunkIds    |
| **Metadata**     | category, difficulty, questionLanguage |

### 10.3 Kolom Metrik RAG

| Kolom                   | Tipe | Deskripsi           |
| ----------------------- | ---- | ------------------- |
| `ragFaithfulness`       | REAL | Skor faithfulness   |
| `ragAnswerRelevancy`    | REAL | Relevansi jawaban   |
| `ragContextPrecision`   | REAL | Presisi konteks     |
| `ragContextRecall`      | REAL | Recall konteks      |
| `ragContextRelevancy`   | REAL | Relevansi konteks   |
| `ragAnswerCorrectness`  | REAL | Kebenaran jawaban   |
| `ragCitationAccuracy`   | REAL | Akurasi sitasi      |
| `ragHallucinationRate`  | REAL | Tingkat halusinasi  |
| `ragFactualConsistency` | REAL | Konsistensi faktual |
| `ragSourceAttribution`  | REAL | Atribusi sumber     |
| `ragContradictionScore` | REAL | Skor kontradiksi    |

### 10.4 Kolom Metrik Retrieval

| Kolom                | Tipe | Deskripsi            |
| -------------------- | ---- | -------------------- |
| `retrievalNdcg`      | REAL | NDCG score           |
| `retrievalMrr`       | REAL | Mean Reciprocal Rank |
| `retrievalPrecision` | REAL | Precision@K          |

### 10.5 Kolom Latency

| Kolom                    | Tipe    | Deskripsi             |
| ------------------------ | ------- | --------------------- |
| `ragLatencyMs`           | INTEGER | Total latency RAG     |
| `nonRagLatencyMs`        | INTEGER | Total latency Non-RAG |
| `ragRetrievalLatencyMs`  | INTEGER | Latency retrieval     |
| `ragRerankingLatencyMs`  | INTEGER | Latency reranking     |
| `ragGenerationLatencyMs` | INTEGER | Latency generation    |

---

## 11. Tabel Ablation Studies

### 11.1 Deskripsi
Menyimpan hasil studi ablation dengan multiple konfigurasi.

### 11.2 Kolom

| Kolom            | Tipe      | Deskripsi                    |
| ---------------- | --------- | ---------------------------- |
| `id`             | UUID (PK) | Identifier unik              |
| `name`           | TEXT      | Nama studi                   |
| `description`    | TEXT      | Deskripsi                    |
| `status`         | TEXT      | Status studi                 |
| `configurations` | JSONB     | Array konfigurasi yang diuji |
| `results`        | JSONB     | Array hasil per konfigurasi  |
| `report`         | TEXT      | Laporan markdown             |
| `createdAt`      | TIMESTAMP | Waktu pembuatan              |
| `completedAt`    | TIMESTAMP | Waktu selesai                |

---

## 12. Tabel Statistical Analyses

### 12.1 Deskripsi
Menyimpan hasil analisis statistik untuk validasi signifikansi.

### 12.2 Kolom

| Kolom             | Tipe      | Deskripsi                                            |
| ----------------- | --------- | ---------------------------------------------------- |
| `id`              | UUID (PK) | Identifier unik                                      |
| `evaluationRunId` | UUID (FK) | Reference ke evaluation_runs                         |
| `ablationStudyId` | UUID (FK) | Reference ke ablation_studies                        |
| `analysisType`    | TEXT      | paired_ttest, independent_ttest, anova, bootstrap_ci |
| `metricName`      | TEXT      | Nama metrik yang dianalisis                          |
| `results`         | JSONB     | Hasil analisis                                       |
| `reportEn`        | TEXT      | Laporan dalam Bahasa Inggris                         |
| `reportId`        | TEXT      | Laporan dalam Bahasa Indonesia                       |
| `createdAt`       | TIMESTAMP | Waktu analisis                                       |

---

## 13. Tabel Human Annotations

### 13.1 Deskripsi
Menyimpan anotasi manusia untuk validasi metrik otomatis.

### 13.2 Kolom

| Kolom                  | Tipe      | Deskripsi                         |
| ---------------------- | --------- | --------------------------------- |
| `id`                   | UUID (PK) | Identifier unik                   |
| `evaluationQuestionId` | UUID (FK) | Reference ke evaluation_questions |
| `annotatorId`          | TEXT      | ID annotator (pseudonymous)       |
| `faithfulnessRating`   | INTEGER   | Rating 1-5                        |
| `relevancyRating`      | INTEGER   | Rating 1-5                        |
| `correctnessRating`    | INTEGER   | Rating 1-5                        |
| `hasHallucination`     | BOOLEAN   | Ada halusinasi?                   |
| `hallucinationNotes`   | TEXT      | Catatan halusinasi                |
| `overallQuality`       | INTEGER   | Kualitas overall 1-5              |
| `annotationTimeMs`     | INTEGER   | Waktu anotasi                     |
| `notes`                | TEXT      | Catatan umum                      |
| `createdAt`            | TIMESTAMP | Waktu anotasi                     |

---

## 14. Relasi dan Constraint

### 14.1 Foreign Keys dengan Cascade Delete

| Parent               | Child                | On Delete |
| -------------------- | -------------------- | --------- |
| documents            | document_chunks      | CASCADE   |
| chat_sessions        | chat_messages        | CASCADE   |
| chat_sessions        | agent_steps          | CASCADE   |
| chat_sessions        | guardrail_logs       | CASCADE   |
| evaluation_runs      | evaluation_questions | CASCADE   |
| evaluation_questions | human_annotations    | CASCADE   |

### 14.2 Unique Constraints

- `document_processing_progress.documentId` (UNIQUE)

---

## 15. Desain Keputusan

### 15.1 Mengapa JSONB untuk Metadata?

- Fleksibilitas evolusi schema tanpa migrasi
- Dokumen berbeda punya field berbeda
- Query nested properties dengan PostgreSQL JSONB operators

### 15.2 Mengapa 1536 Dimensi Vector?

- Sesuai dengan output text-embedding-3-small
- Balance antara kualitas dan kecepatan
- 3x lebih cepat dari text-embedding-3-large

### 15.3 Mengapa GIN Index untuk Content?

- Mendukung pg_trgm untuk fuzzy search
- Efisien untuk BM25 keyword matching
- Bisa dikombinasikan dengan vector search

---

*Dokumen ini merupakan bagian dari dokumentasi teknis Weaver.*
