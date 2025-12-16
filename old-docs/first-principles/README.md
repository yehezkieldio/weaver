# Dokumentasi Codebase - Academic Research RAG Chatbot

Dokumentasi teknis dalam Bahasa Indonesia untuk sistem Academic Research RAG Chatbot. Dokumen-dokumen ini disusun secara hierarkis dari komponen fundamental hingga lapisan aplikasi.

---

## Daftar Dokumen

### Fase 1: Fondasi Inti

| No  | Dokumen                                            | Deskripsi                                                   |
| --- | -------------------------------------------------- | ----------------------------------------------------------- |
| 01  | [Ikhtisar Arsitektur](./01-ikhtisar-arsitektur.md) | Overview arsitektur sistem, alur data, dan pola desain      |
| 02  | [Infrastruktur Data](./02-infrastruktur-data.md)   | Skema database PostgreSQL, tipe TypeScript, dan penyimpanan |
| 03  | [Modul AI & Embedding](./03-modul-ai-embedding.md) | Konfigurasi model, generasi embedding, dan integrasi AI     |

### Fase 2: Pipeline RAG

| No  | Dokumen                                          | Deskripsi                                               |
| --- | ------------------------------------------------ | ------------------------------------------------------- |
| 04  | [Pemrosesan Dokumen](./04-pemrosesan-dokumen.md) | Strategi chunking, handler format, dan quality scoring  |
| 05  | [Sistem Retrieval](./05-sistem-retrieval.md)     | Hybrid retrieval (Vector + BM25), RRF fusion, reranking |
| 06  | [Agentic RAG](./06-agentic-rag.md)               | Multi-step reasoning, tool definitions, streaming       |

### Fase 3: Domain & Keamanan

| No  | Dokumen                                              | Deskripsi                                              |
| --- | ---------------------------------------------------- | ------------------------------------------------------ |
| 07  | [Domain Universitas](./07-domain-universitas.md)     | Intelijen domain Indonesia, ekspansi sinonim, metadata |
| 08  | [Guardrails & Keamanan](./08-guardrails-keamanan.md) | Deteksi PII, injection protection, validasi topik      |

### Fase 4: Evaluasi & Analisis

| No  | Dokumen                                          | Deskripsi                                                 |
| --- | ------------------------------------------------ | --------------------------------------------------------- |
| 09  | [Metrik Evaluasi](./09-metrik-evaluasi.md)       | Framework RAGAS, metrik domain-specific, ablation studies |
| 10  | [Analisis Statistik](./10-analisis-statistik.md) | t-test, ANOVA, effect size, confidence interval           |

### Fase 5: Lapisan Aplikasi

| No  | Dokumen                                      | Deskripsi                                            |
| --- | -------------------------------------------- | ---------------------------------------------------- |
| 11  | [API Endpoints](./11-api-endpoints.md)       | REST API untuk chat, documents, sessions, evaluation |
| 12  | [State Management](./12-state-management.md) | Zustand stores, persistence, sinkronisasi            |

---

## Panduan Membaca

### Untuk Pemahaman Umum

Mulai dengan membaca dokumen secara berurutan dari 01 hingga 12 untuk pemahaman holistik.

### Untuk Developer Baru

1. Baca [01-ikhtisar-arsitektur.md](./01-ikhtisar-arsitektur.md) untuk gambaran besar
2. Baca [02-infrastruktur-data.md](./02-infrastruktur-data.md) untuk memahami struktur data
3. Pilih dokumen spesifik sesuai area yang akan dikerjakan

### Untuk Kontributor Fitur Tertentu

| Area                      | Dokumen Relevan                                        |
| ------------------------- | ------------------------------------------------------ |
| Menambah format file baru | [04-pemrosesan-dokumen.md](./04-pemrosesan-dokumen.md) |
| Meningkatkan retrieval    | [05-sistem-retrieval.md](./05-sistem-retrieval.md)     |
| Menambah tool agentic     | [06-agentic-rag.md](./06-agentic-rag.md)               |
| Menambah metrik evaluasi  | [09-metrik-evaluasi.md](./09-metrik-evaluasi.md)       |
| Menambah API endpoint     | [11-api-endpoints.md](./11-api-endpoints.md)           |

---

## Konvensi Dokumentasi

### Struktur Dokumen

Setiap dokumen mengikuti struktur:

1. **Pendahuluan**: Deskripsi singkat dan konteks
2. **Arsitektur/Diagram**: Visualisasi dengan Mermaid
3. **Detail Teknis**: Penjelasan implementasi dengan code snippets
4. **Referensi Terkait**: Link ke dokumen terkait

### Gaya Penulisan

- Bahasa Indonesia formal akademis
- Terminologi teknis dipertahankan dalam bahasa asli (e.g., "embedding", "retrieval")
- Code snippets menggunakan TypeScript
- Diagram menggunakan Mermaid

---

## Referensi Penelitian

Sistem ini mengimplementasikan konsep dari:

- **RAGAS**: Shahul et al. (2023). "Automated Evaluation of Retrieval-Augmented Generation"
- **BM25+**: Robertson & Zaragoza (2009). "The Probabilistic Relevance Framework"
- **RRF**: Cormack et al. (2009). "Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods"
- **Sentence Transformers**: Reimers & Gurevych (2019). "Sentence-BERT"

---

## Pemeliharaan Dokumentasi

Dokumentasi ini harus diperbarui ketika:

1. Ada perubahan signifikan pada arsitektur
2. API endpoint berubah
3. Strategi baru ditambahkan (chunking, retrieval, reranking)
4. Metrik evaluasi baru diimplementasikan
