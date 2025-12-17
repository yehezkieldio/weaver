# Ringkasan Eksekutif: Academic Research RAG Chatbot

## 1. Identitas Proyek

**Nama Sistem**: Academic Research RAG Chatbot
**Domain**: Sistem Informasi Akademik Universitas Indonesia
**Tipe Sistem**: Retrieval-Augmented Generation (RAG) dengan Kapabilitas Agentic
**Bahasa Target**: Bahasa Indonesia

---

## 2. Tujuan Sistem

Academic Research RAG Chatbot adalah sistem kecerdasan buatan yang dirancang untuk menyediakan layanan informasi akademik kepada civitas akademika universitas di Indonesia. Sistem ini mengintegrasikan teknologi Large Language Model (LLM) dengan mekanisme retrieval berbasis dokumen untuk menghasilkan jawaban yang akurat, faktual, dan dapat dipertanggungjawabkan.

### 2.1 Pernyataan Masalah

Perguruan tinggi di Indonesia menghadapi tantangan signifikan dalam penyampaian informasi akademik:

1. **Fragmentasi Informasi**: Informasi tersebar di berbagai dokumen (buku pedoman, peraturan akademik, RPS, kalender akademik) dengan format dan lokasi yang berbeda-beda.

2. **Akses Terbatas**: Mahasiswa dan dosen seringkali kesulitan menemukan informasi spesifik dalam dokumen yang panjang dan kompleks.

3. **Keterbatasan Layanan**: Unit layanan informasi memiliki jam operasional terbatas dan kapasitas yang tidak sebanding dengan jumlah permintaan.

4. **Bahasa dan Terminologi**: Dokumen akademik menggunakan terminologi khusus (NIM, SKS, IPK, UKT, SNBP, SNBT) yang memerlukan pemahaman kontekstual.

5. **Akurasi dan Kepercayaan**: Jawaban dari sistem AI konvensional seringkali mengandung halusinasi (informasi yang tidak faktual), yang sangat problematik dalam konteks akademik.

---

## 3. Solusi yang Ditawarkan

Sistem ini mengatasi masalah di atas melalui arsitektur RAG yang diperkuat dengan:

| Komponen                       | Fungsi                            | Manfaat                                                  |
| ------------------------------ | --------------------------------- | -------------------------------------------------------- |
| **Hybrid Retrieval**           | Kombinasi vector search + BM25    | Mengatasi keterbatasan single-method retrieval           |
| **Agentic RAG**                | Multi-step reasoning dengan tools | Menjawab pertanyaan kompleks yang memerlukan dekomposisi |
| **Multi-Strategy Reranking**   | Cross-encoder, LLM, ensemble      | Presisi retrieval yang lebih tinggi                      |
| **Domain-Specific Processing** | Pemahaman dokumen Indonesia       | Terminologi dan pola akademik lokal                      |
| **Guardrails System**          | Deteksi PII, injection, sentiment | Keamanan dan kepatuhan privasi                           |
| **RAGAS Evaluation**           | Metrik evaluasi standar           | Pengukuran kualitas akademis                             |

---

## 4. Posisi dalam Lanskap Penelitian

### 4.1 Kontribusi Ilmiah

Sistem ini berkontribusi pada beberapa area penelitian:

1. **Retrieval-Augmented Generation**: Implementasi RAG untuk domain bahasa Indonesia dengan karakteristik morfologi dan sintaksis yang unik.

2. **Agentic AI Systems**: Penerapan paradigma agentic untuk tugas information retrieval dengan multi-step reasoning.

3. **Domain-Specific NLP**: Pengembangan modul pemrosesan khusus untuk dokumen akademik Indonesia (stemming, sinonim, pola administratif).

4. **LLM Evaluation**: Framework evaluasi komprehensif berbasis RAGAS dengan metrik khusus domain.

### 4.2 Referensi Penelitian Utama

Sistem ini dibangun berdasarkan fondasi penelitian berikut:

- **RAGAS** (Shahul et al., 2023): "Automated Evaluation of Retrieval-Augmented Generation"
- **TRUE** (Honovich et al., 2022): "Re-evaluating Factual Consistency Evaluation"
- **NDCG** (Järvelin & Kekäläinen, 2002): "Cumulated Gain-Based Evaluation of IR Techniques"
- **Okapi BM25** (Robertson et al., 1994): "Okapi at TREC-3"

---

## 5. Arsitektur Tingkat Tinggi

```
┌────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                            │
│                    (Chat Interface, Evaluation Dashboard)          │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                          API LAYER                                 │
│              (Next.js API Routes, Chat Endpoints)                  │
└────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GUARDRAILS    │    │   RAG PIPELINE  │    │   EVALUATION    │
│                 │    │                 │    │                 │
│ • PII Detection │    │ • Agentic Mode  │    │ • RAGAS Metrics │
│ • Injection     │    │ • Standard Mode │    │ • Ablation      │
│ • Toxicity      │    │ • Direct Mode   │    │ • Statistical   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                       RETRIEVAL LAYER                              │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Vector Search│  │ BM25 Keyword │  │   Reranker   │             │
│  │  (pgvector)  │  │   Search     │  │  (Ensemble)  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                   │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Documents   │  │    Chunks    │  │  Embeddings  │             │
│  │   (Raw)      │  │  (Processed) │  │   (1536-d)   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└────────────────────────────────────────────────────────────────────┘
```

---

## 6. Kapabilitas Utama

### 6.1 Mode Operasi

| Mode             | Deskripsi                                           | Use Case                                        |
| ---------------- | --------------------------------------------------- | ----------------------------------------------- |
| **Agentic RAG**  | Multi-step reasoning dengan parallel tool execution | Pertanyaan kompleks yang memerlukan dekomposisi |
| **Standard RAG** | Single-pass retrieval + generation                  | Pertanyaan faktual langsung                     |
| **Direct Mode**  | LLM tanpa retrieval                                 | Pertanyaan umum, komparasi                      |

### 6.2 Strategi Retrieval

| Strategi    | Komponen                        | Kelebihan              |
| ----------- | ------------------------------- | ---------------------- |
| **Vector**  | text-embedding-3-small (1536-d) | Pencocokan semantik    |
| **Keyword** | BM25+ dengan stemming Indonesia | Term-specific matching |
| **Hybrid**  | RRF fusion (vector + BM25)      | Best of both worlds    |

### 6.3 Strategi Reranking

| Strategi          | Model           | Latensi | Akurasi |
| ----------------- | --------------- | ------- | ------- |
| **cross_encoder** | TinyBERT        | ~100ms  | 80-85%  |
| **llm**           | GPT-4o-mini     | ~3-5s   | 90-95%  |
| **llm_listwise**  | GPT-4o-mini     | ~2-3s   | 88-92%  |
| **cohere**        | Pairwise        | ~1-2s   | 85-90%  |
| **ensemble**      | Weighted fusion | ~3-5s   | 92-95%  |

---

## 7. Metrik Evaluasi

Sistem mengimplementasikan framework evaluasi berbasis RAGAS:

### 7.1 Core RAGAS Metrics
- **Faithfulness**: Proporsi klaim yang didukung oleh konteks
- **Answer Relevancy**: Kesesuaian jawaban dengan pertanyaan
- **Context Precision**: Relevansi chunk yang di-retrieve
- **Context Recall**: Kelengkapan informasi yang di-retrieve
- **Context Relevancy**: Relevansi absolut setiap chunk

### 7.2 Hallucination Metrics
- **Hallucination Rate**: Proporsi informasi yang difabrikasi
- **Factual Consistency**: Konsistensi NLI dengan sumber
- **Source Attribution**: Kualitas atribusi sumber
- **Contradiction Score**: Deteksi kontradiksi internal

### 7.3 Retrieval Quality Metrics
- **NDCG@K**: Normalized Discounted Cumulative Gain
- **MRR**: Mean Reciprocal Rank
- **Precision@K**: Precision pada K dokumen teratas

---

## 8. Validasi Statistik

Sistem menyediakan analisis statistik rigorus untuk validasi hasil:

- **Paired t-test**: Perbandingan kondisi berpasangan
- **Independent t-test**: Perbandingan grup independen
- **One-way ANOVA**: Perbandingan 3+ konfigurasi
- **Bootstrap CI**: Interval kepercayaan non-parametrik
- **Effect Size**: Cohen's d, Eta-squared
- **Assumption Testing**: Shapiro-Wilk, Levene's test

---

## 9. Referensi Silang

Untuk detail lebih lanjut, lihat dokumen berikut:

| Dokumen                                                    | Konten                        |
| ---------------------------------------------------------- | ----------------------------- |
| [02_research_context.md](./02_research_context.md)         | Konteks penelitian dan tujuan |
| [03_key_features.md](./03_key_features.md)                 | Fitur-fitur utama             |
| [04_system_architecture.md](./04_system_architecture.md)   | Arsitektur sistem             |
| [05_rag_pipeline.md](./05_rag_pipeline.md)                 | Pipeline RAG                  |
| [06_evaluation_framework.md](./06_evaluation_framework.md) | Kerangka evaluasi             |
| [07_evaluation_pipeline.md](./07_evaluation_pipeline.md)   | Pipeline evaluasi             |
| [08_statistical_analysis.md](./08_statistical_analysis.md) | Analisis statistik            |
| [09_database_schema.md](./09_database_schema.md)           | Skema database                |

---

*Dokumen ini dihasilkan sebagai bagian dari dokumentasi teknis Academic Research RAG Chatbot.*
