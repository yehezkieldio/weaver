# Rencana Publikasi Ilmiah Komprehensif
# Sistem Agentic Retrieval-Augmented Generation (RAG) untuk Layanan Akademik

---

## 1. INFORMASI DASAR PENELITIAN

### 1.1 Judul Publikasi
**Implementasi Agentic Retrieval-Augmented Generation (RAG) untuk Otomatisasi Layanan Mahasiswa di Universitas Mulia**

### 1.2 Jenis Penelitian
- **Kategori**: Penelitian Eksperimental Terapan
- **Pendekatan**: Research and Development (R&D)
- **Metodologi Pengembangan**: Rapid Application Development (RAD)
- **Metode Analisis**: Kuantitatif Eksperimental dengan Studi Ablasi Otomatis

---

## 2. LATAR BELAKANG DAN KONTEKS PENELITIAN

### 2.1 Problematika Layanan Akademik
Layanan informasi akademik di perguruan tinggi Indonesia menghadapi berbagai tantangan struktural:
- **Ketergantungan Manual**: Sistem tradisional bergantung pada staf administrasi untuk menjawab pertanyaan mahasiswa secara berulang
- **Inefisiensi Komunikasi**: Waktu respons lambat dan inkonsisten, terutama di luar jam kerja
- **Skalabilitas Terbatas**: Pertumbuhan populasi mahasiswa tidak diimbangi dengan penambahan sumber daya layanan
- **Fragmentasi Informasi**: Dokumen akademik tersebar di berbagai sumber tanpa sistem terpusat

###2.2 Keterbatasan Large Language Models (LLM) Standar
LLM generik seperti GPT-4 memiliki limitasi fundamental dalam konteks akademik:
- **Halusinasi**: Kecenderungan menghasilkan informasi yang terdengar masuk akal namun faktual tidak akurat
- **Knowledge Cut-off**: Pengetahuan terbatas pada data pelatihan (tidak mengetahui kebijakan/aturan lokal institusi)
- **Lexical Gap**: Gagal mengenali terminologi spesifik domain (contoh: "KRS", "Cuti Akademik", "SKS")
- **Konteks Lokal**: Tidak memahami nuansa kebijakan institusi spesifik (misal: peraturan akademik Universitas Mulia)

### 2.3 Keterbatasan RAG Konvensional
Sistem Retrieval-Augmented Generation standar memiliki trade-off yang signifikan:

| Metode Retrieval                    | Kelebihan                              | Kelemahan                                                                    |
| ----------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| **Dense Retrieval (Vector Search)** | Memahami makna semantik query          | Lexical gap: gagal pada kata kunci spesifik ("KRS" vs "Kartu Rencana Studi") |
| **Sparse Retrieval (BM25/FTS)**     | Menangkap kata kunci eksak             | Gagal pada query sinonim/parafrase                                           |
| **Single-Step RAG**                 | Latensi rendah, implementasi sederhana | Gagal pada query multi-langkah ("Bandingkan X dan Y")                        |

### 2.4 Gap Penelitian
Tidak ada penelitian di Indonesia yang mengimplementasikan:
1. **Hybrid Retrieval** dengan Okapi BM25 di application layer (bukan database-native FTS)
2. **Agentic RAG** dengan multi-step reasoning dan tool orchestration
3. **Ablation study** sistematis untuk membandingkan 13 konfigurasi berbeda
4. **Evaluasi RAGAS** untuk domain akademik bilingual (Indonesia-Inggris)

---

## 3. RUMUSAN MASALAH

### 3.1 Pertanyaan Penelitian Utama (Research Questions)

**RQ1**: Seberapa signifikan peningkatan akurasi sistem RAG dibandingkan dengan baseline Non-RAG dalam metrik Faithfulness dan Answer Relevancy?

**RQ2**: Apakah pendekatan Hybrid Retrieval (Vector + BM25 + RRF) lebih efektif dibandingkan single-method retrieval (Vector-only atau BM25-only) dalam hal Precision@K dan Recall@K?

**RQ3**: Bagaimana trade-off antara akurasi dan latensi pada sistem Agentic RAG dibandingkan dengan Traditional RAG?

**RQ4**: Bagaimana kontribusi individual setiap komponen sistem (chunking strategy, reranking method, agent configuration) terhadap performa keseluruhan berdasarkan ablation study?

**RQ5**: Seberapa efektif sistem dalam menangani query berbahasa Indonesia dengan berbagai tingkat kompleksitas (simple vs complex)?

---

## 4. TUJUAN PENELITIAN

### 4.1 Tujuan Umum
Mengembangkan dan mengevaluasi sistem Agentic Retrieval-Augmented Generation (RAG) untuk otomatisasi layanan mahasiswa yang akurat, andal, dan dapat direplikasi dalam konteks perguruan tinggi Indonesia.

### 4.2 Tujuan Khusus
1. **Merancang arsitektur Hybrid Retrieval** yang menggabungkan Vector Search (pgvector) dengan Okapi BM25 in-memory menggunakan Reciprocal Rank Fusion (RRF)
2. **Mengimplementasikan Agentic Workflow** dengan multi-step reasoning menggunakan AI SDK 5.x dan tool orchestration
3. **Mengembangkan sistem evaluasi otomatis** berbasis RAGAS (Faithfulness, Answer Relevancy, Context Precision/Recall) dengan LLM-as-a-Judge
4. **Melakukan ablation study sistematis** terhadap 13 konfigurasi berbeda untuk mengidentifikasi kontribusi setiap komponen
5. **Menganalisis performa secara statistik** menggunakan Paired t-test, One-way ANOVA, Cohen's d, dan Confidence Intervals
6. **Memvalidasi efektivitas sistem** pada domain akademik bilingual (Indonesia-Inggris) dengan berbagai tingkat kompleksitas query

---

## 5. HIPOTESIS PENELITIAN

### 5.1 Hipotesis Utama

**H₁ (RAG vs Non-RAG)**
- **H₀**: Tidak ada perbedaan yang signifikan antara sistem RAG dan Non-RAG dalam metrik Faithfulness
- **H₁**: Sistem RAG menghasilkan skor Faithfulness yang secara signifikan lebih tinggi (p < 0.05, d > 0.8) dibandingkan Non-RAG

**H₂ (Hybrid vs Single-Method)**
- **H₀**: Tidak ada perbedaan yang signifikan antara Hybrid Retrieval dan single-method (Vector-only atau BM25-only)
- **H₁**: Hybrid Retrieval menghasilkan Precision@K dan Recall@K yang secara signifikan lebih tinggi (p < 0.05)

**H₃ (Agentic vs Traditional RAG)**
- **H₀**: Tidak ada perbedaan yang signifikan antara Agentic RAG dan Traditional RAG dalam menangani query kompleks
- **H₁**: Agentic RAG menghasilkan Answer Relevancy lebih tinggi untuk query kompleks meskipun dengan trade-off latensi

**H₄ (Reranking Impact)**
- **H₀**: Reranking tidak memberikan kontribusi yang signifikan terhadap kualitas hasil retrieval
- **H₁**: Sistem dengan Neural Reranking (Cross-Encoder atau LLM) menghasilkan Context Precision lebih tinggi dibandingkan tanpa reranking

---

## 6. ARSITEKTUR SISTEM

### 6.1 Gambaran Umum: Arsitektur 4-Layer

Sistem mengimplementasikan pipeline multi-stage Agentic RAG yang terdiri dari empat lapisan pemrosesan:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Layer 1: Domain-Aware Ingestion                           │
│  • Hierarchical & Semantic Chunking (threshold similarity = 0.5)             │
│  • Structure Detection (Abstract, Metodologi, Hasil, Pembahasan)             │
│  • Language Detection (Indonesian/English pattern matching)                  │
│  • ASCII Report Parser untuk dokumen terstruktur                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│      Layer 2: Hybrid Retrieval (Vector-First + Local BM25 + RRF)            │
│  • Candidate Generation: pgvector cosine distance → Top 30 chunks           │
│  • In-Memory BM25: Okapi BM25 (k1=1.2, b=0.75) pada candidate pool          │
│  • Reciprocal Rank Fusion: RRF(k=60) dengan weighted fusion                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│          Layer 3: Neural Reranking (Cross-Encoder + LLM Listwise)           │
│  • Cross-Encoder: ms-marco-TinyBERT-L-2-v2 untuk query-passage scoring      │
│  • LLM Listwise: GPT-4.1-mini dengan JSON-structured ranking                │
│  • Ensemble: Weighted combination (α=0.6 cross, β=0.4 LLM)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│          Layer 4: Agentic Orchestration & Guardrails                        │
│  • Tools: search_documents, expand_query, decompose_query, verify_claim     │
│  • ReAct Pattern: Reasoning → Action → Observation (max 5 steps)            │
│  • Input Guardrails: PII detection, Prompt Injection prevention             │
│  • Output Guardrails: Hallucination check, Citation verification            │
│  • Negative Reaction Handler: Sentiment analysis untuk escalation           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Justifikasi Arsitektur Teknis

#### 6.2.1 Mengapa Vector-First + Local BM25 (bukan Postgres FTS)?
**Permasalahan Postgres FTS**:
- Vendor lock-in: Logika keyword scoring terikat dengan database engine
- Migrasi sulit: Pindah dari Postgres ke Qdrant/Milvus akan kehilangan kemampuan FTS

**Solusi Vector-First + Local BM25**:
- **Database Agility**: BM25 diimplementasikan di application layer (TypeScript), sehingga vector store dapat di-swap tanpa kehilangan kapabilitas keyword search
- **Local IDF**: Menghitung IDF dari candidate pool (bukan global corpus), mengurangi overhead komputasi update
- **Semantic Neighborhood**: Vector search mendefinisikan "lingkungan semantik", BM25 melakukan discriminate specificity di dalam lingkungan tersebut

#### 6.2.2 Mengapa Agentic RAG (bukan Single-Step)?
Query akademik sering bersifat multi-faceted. Contoh:
- **Simple Query**: "Apa itu KRS?" → Single-step retrieval cukup
- **Complex Query**: "Bandingkan metodologi kuantitatif dan kualitatif, kapan sebaiknya menggunakan masing-masing?" → Memerlukan:
  1. Dekomposisi query menjadi 2 sub-questions
  2. Parallel retrieval untuk 2 topik berbeda
  3. Synthesis jawaban koheren

**Kontribusi Agentic**:
- **Query Decomposition**: Memecah query kompleks menjadi sub-questions
- **Parallel Execution**: Mengambil informasi berbeda secara paralel
- **Self-Correction**: Verify claim sebelum menyajikan jawaban

---

## 7. METODOLOGI PENELITIAN

### 7.1 Pendekatan Penelitian
Penelitian ini menggunakan kombinasi **Research and Development (R&D)** dan **Rapid Application Development (RAD)**:
- **R&D**: Pengembangan produk/sistem baru dengan validasi melalui pengujian sistematis
- **RAD**: Iterasi cepat dengan prototipe fungsional di setiap fase (4-week sprint cycle)

### 7.2 Timeline Pengembangan (4 Minggu)

#### Minggu 1: Foundation & Core RAG Pipeline
| Hari | Aktivitas                                                         | Deliverable             |
| ---- | ----------------------------------------------------------------- | ----------------------- |
| 1-2  | Database schema design (Drizzle ORM + pgvector extension)         | `schema.ts`, migrations |
| 3-4  | Document ingestion pipeline (PDF/TXT/MD parsing, chunking)        | `document-processor.ts` |
| 5-7  | Basic RAG implementation (vector search, simple prompt) + Chat UI | Working prototype       |

#### Minggu 2: Advanced Retrieval & Agentic Workflow
| Hari  | Aktivitas                                                       | Deliverable           |
| ----- | --------------------------------------------------------------- | --------------------- |
| 8-9   | Hybrid retrieval implementation (BM25 + RRF fusion)             | `hybrid-retrieval.ts` |
| 10-11 | Neural reranking module (cross-encoder, LLM listwise, ensemble) | `reranker.ts`         |
| 12-14 | Agentic RAG dengan AI SDK 5.x tools (`search_documents`, etc.)  | `agentic-rag.ts`      |

#### Minggu 3: Optimization & Safety
| Hari  | Aktivitas                                                        | Deliverable            |
| ----- | ---------------------------------------------------------------- | ---------------------- |
| 15-16 | Advanced chunking (semantic, recursive, sentence-window)         | `chunking.ts`          |
| 17-18 | Guardrails implementation (PII, prompt injection, hallucination) | `guardrails.ts`        |
| 19-21 | University domain tuning (terminology, negative reactions)       | `university-domain.ts` |

#### Minggu 4: Evaluation & Statistical Analysis
| Hari  | Aktivitas                                                              | Deliverable               |
| ----- | ---------------------------------------------------------------------- | ------------------------- |
| 22-23 | RAGAS evaluation framework (faithfulness, relevancy, precision/recall) | `evaluation.ts`           |
| 24-25 | Ablation study framework (13 configurations)                           | Evaluation dashboard      |
| 26-27 | Statistical analysis module (t-test, ANOVA, Cohen's d)                 | `statistical-analysis.ts` |
| 28    | Documentation, polishing, deployment preparation                       | Master report             |

---

## 8. DESAIN EKSPERIMEN

### 8.1 Variabel Penelitian

#### 8.1.1 Variabel Independen (Faktor yang Dimanipulasi)

**A. Retrieval Strategy**
- Non-RAG (baseline: LLM tanpa augmentation)
- Vector-only (pgvector cosine similarity)
- BM25-only (in-memory Okapi BM25)
- Hybrid (Vector + BM25 + RRF)

**B. Re-ranking Method**
- None (tanpa reranking)
- Cross-encoder (ms-marco-TinyBERT-L-2-v2)
- LLM Listwise (GPT-4.1-mini structured output)
- Ensemble (weighted combination)

**C. Chunking Strategy**
- Fixed (512 tokens dengan overlap 128)
- Recursive (hierarchical splitting berdasarkan delimiters)
- Semantic (similarity-based splitting dengan threshold 0.5)
- Sentence-window (kalimat dengan context window)

**D. Agent Configuration**
- Single-step (traditional RAG tanpa tool orchestration)
- Multi-step (agentic dengan max 5 reasoning steps)

#### 8.1.2 Variabel Dependen (Metrik Evaluasi)

**A. Core RAGAS Metrics**
| Metrik                | Formula                                     | Range | Interpretasi                          |
| --------------------- | ------------------------------------------- | ----- | ------------------------------------- |
| **Faithfulness**      | \|Claims_supported\| / \|Claims_total\|     | 0-1   | Proporsi klaim yang didukung konteks  |
| **Answer Relevancy**  | (1/n) Σ cosine(E_q, E_qi')                  | 0-1   | Relevansi jawaban terhadap pertanyaan |
| **Context Precision** | \|Relevant_retrieved@K\| / K                | 0-1   | Presisi dokumen yang diambil          |
| **Context Recall**    | \|Relevant_retrieved\| / \|Relevant_total\| | 0-1   | Recall dokumen relevan                |

**B. Retrieval Quality Metrics**
| Metrik          | Deskripsi                             | Formula                   |
| --------------- | ------------------------------------- | ------------------------- |
| **Precision@K** | Proporsi dokumen relevan dalam top-K  | TP / (TP + FP)            |
| **Recall@K**    | Proporsi relevan yang terambil        | TP / (TP + FN)            |
| **NDCG**        | Normalized Discounted Cumulative Gain | Σ (2^rel - 1) / log₂(i+1) |
| **MRR**         | Mean Reciprocal Rank                  | 1 / rank_first_relevant   |

**C. Hallucination Detection**
| Metrik               | Range               | Deskripsi                                |
| -------------------- | ------------------- | ---------------------------------------- |
| `hallucinationRate`  | 0-1 (lower better)  | Proporsi klaim tanpa supporting evidence |
| `factualConsistency` | 0-1 (higher better) | NLI-based consistency check              |
| `sourceAttribution`  | 0-1 (higher better) | Proper citation presence                 |
| `contradictionScore` | 0-1 (lower better)  | Kontradiksi antar klaim                  |

**D. Latency Breakdown**
| Metrik                    | Unit | Target                 |
| ------------------------- | ---- | ---------------------- |
| `retrievalLatencyMs`      | ms   | < 100ms                |
| `rerankingLatencyMs`      | ms   | < 500ms                |
| `generationLatencyMs`     | ms   | < 2000ms               |
| `agentReasoningLatencyMs` | ms   | < 1000ms               |
| `totalLatencyMs`          | ms   | < 5000ms (for agentic) |

---

## 9. ABLATION STUDY

### 9.1 Tujuan Ablation Study
Memahami kontribusi individual setiap komponen terhadap performa keseluruhan sistem dengan cara menghapus atau memodifikasi komponen secara sistematis.

### 9.2 Konfigurasi Ablation (13 Configurations)

| Config ID | Name                    | RAG | Retrieval | Rerank   | Chunking        | Agent | Guardrails |
| --------- | ----------------------- | --- | --------- | -------- | --------------- | ----- | ---------- |
| **C0**    | Baseline (No RAG)       | ❌   | -         | -        | -               | ❌     | ❌          |
| **C1**    | Vector Only             | ✅   | vector    | ❌        | recursive       | ❌     | ❌          |
| **C2**    | BM25 Only               | ✅   | keyword   | ❌        | recursive       | ❌     | ❌          |
| **C3**    | Hybrid (No Rerank)      | ✅   | hybrid    | ❌        | recursive       | ❌     | ❌          |
| **C4**    | Hybrid + Cross-Encoder  | ✅   | hybrid    | cross    | recursive       | ❌     | ❌          |
| **C5**    | Hybrid + LLM Rerank     | ✅   | hybrid    | llm      | recursive       | ❌     | ❌          |
| **C6**    | Hybrid + Ensemble       | ✅   | hybrid    | ensemble | recursive       | ❌     | ❌          |
| **C7**    | Semantic Chunking       | ✅   | hybrid    | ensemble | semantic        | ❌     | ❌          |
| **C8**    | Agentic (No Guardrails) | ✅   | hybrid    | ensemble | semantic        | ✅     | ❌          |
| **C9**    | Full System             | ✅   | hybrid    | ensemble | semantic        | ✅     | ✅          |
| **C10**   | Indonesian Optimized    | ✅   | hybrid    | ensemble | semantic        | ✅     | ✅          |
| **C11**   | Fixed Chunking Baseline | ✅   | hybrid    | cross    | fixed           | ❌     | ❌          |
| **C12**   | Sentence-Window         | ✅   | hybrid    | cross    | sentence_window | ❌     | ❌          |

### 9.3 Hipotesis Ablation
- **C1 vs C2**: Hybrid lebih baik dari single-method
- **C3 vs C4-C6**: Reranking meningkatkan precision
- **C6 vs C7**: Semantic chunking lebih baik dari recursive
- **C7 vs C9**: Agentic mode meningkatkan relevancy untuk query kompleks
- **C8 vs C9**: Guardrails mengurangi hallucination tanpa degradasi signifikan pada akurasi

---

## 10. DATASET DAN PROTOKOL EVALUASI

### 10.1 Knowledge Base Corpus
- **Sumber**: Dokumen akademik Universitas Mulia (regulasi, panduan, silabus)
- **Jumlah Dokumen**: 50-100 dokumen (PDF, TXT, MD)
- **Total Tokens**: ~500K tokens
- **Chunk Count**: ~5000 chunks (setelah semantic chunking)

### 10.2 Test Questions Dataset
- **Jumlah Pertanyaan**: 30-50 questions (untuk signifikansi statistik n > 30)
- **Kategori**:
  - `academic_process` (20%): KRS, wisuda, cuti, dll.
  - `research_methodology` (25%): Metodologi penelitian, statistik
  - `academic_writing` (20%): Penulisan skripsi, sitasi
  - `university_policy` (20%): Peraturan akademik, beasiswa
  - `general_academic` (15%): Umum

- **Tingkat Kompleksitas**:
  - Simple (40%): Single-fact lookup ("Apa itu KRS?")
  - Medium (40%): Multi-fact ("Bagaimana proses pengajuan cuti?")
  - Complex (20%): Multi-step reasoning ("Bandingkan metodologi X dan Y")

- **Bahasa**: 100% Indonesian (sesuai dengan domain target)

### 10.3 Protokol Evaluasi
1. **Load Test Dataset**: Muat 30-50 pertanyaan dengan ground truth (jika tersedia)
2. **Run Ablation Configs**: Untuk setiap konfigurasi C0-C12:
   - Generate jawaban untuk semua test questions
   - Capture latency breakdown (retrieval, reranking, generation, agent)
   - Save agent steps dan retrieved chunks
3. **Calculate RAGAS Metrics**: Untuk setiap (question, answer) pair:
   - Faithfulness: LLM-as-a-Judge verify claims
   - Answer Relevancy: Cosine similarity generated_questions vs original
   - Context Precision/Recall: Ground truth relevance labels
4. **Aggregate Statistics**: Per configuration:
   - Mean, Median, SD, 95% CI
   - Visualisasi distribusi (box plots)
5. **Statistical Testing**: Bandingkan konfigurasi dengan paired t-test dan ANOVA

---

## 11. ANALISIS STATISTIK

### 11.1 Uji Hipotesis

#### 11.1.1 Paired t-Test (RAG vs Non-RAG)
**Tujuan**: Membandingkan 2 kondisi berpasangan (C0 vs C9 pada test questions yang sama)

**Formula**:
```
t = (mean_diff) / (SD_diff / √n)
df = n - 1
```

**Contoh Pelaporan**:
> "Sistem Full RAG (C9) menunjukkan peningkatan signifikan dalam Faithfulness (M = 0.847, SD = 0.089) dibandingkan Baseline Non-RAG (C0) (M = 0.623, SD = 0.142), t(49) = 8.234, p < 0.001, d = 1.89 (large effect)."

#### 11.1.2 One-Way ANOVA (Perbandingan Antar Konfigurasi)
**Tujuan**: Membandingkan > 2 grup independen (C1, C2, C3, ..., C12)

**Formula**:
```
F = (Between-group variance) / (Within-group variance)
F = (SSbetween / df_between) / (SSwithin / df_within)
```

**Post-Hoc**: Tukey HSD untuk multiple comparisons jika ANOVA signifikan (p < 0.05)

#### 11.1.3 Effect Size

**Cohen's d** (untuk perbedaan 2 grup):
```
d = (M₁ - M₂) / SD_pooled
```
Interpretasi: 0.2 (small), 0.5 (medium), 0.8 (large)

**η² (Eta Squared)** (untuk ANOVA):
```
η² = SSbetween / SStotal
```
Interpretasi: 0.01 (small), 0.06 (medium), 0.14 (large)

### 11.2 Confidence Intervals
Semua metrik dilaporkan dengan 95% CI:
```
CI = M ± (t_critical * SE)
SE = SD / √n
```

Contoh: Faithfulness: M = 0.847, 95% CI [0.822, 0.872]

---

## 12. VALIDITAS DAN RELIABILITAS

### 12.1 Validitas

**Validitas Konstruk**
- Metrik RAGAS (Faithfulness, Answer Relevancy) tervalidasi oleh literatur (Es et al., 2023)
- Precision@K, Recall@K, NDCG adalah metrik standar retrieval

**Validitas Internal**
- Ablation study mengontrol variabel pengganggu dengan mengubah satu komponen setiap kali
- Randomisasi urutan test questions untuk menghindari order effects
- Menggunakan model LLM yang sama (GPT-4.1-mini) untuk semua konfigurasi

**Validitas Eksternal**
- Domain: Spesifik untuk sistem akademik Indonesia (limited generalizability)
- Dataset: Dokumen Universitas Mulia (dapat direplikasi di institusi lain dengan dokumen serupa)

### 12.2 Reliabilitas

**Konsistensi**
- Model dan hyperparameters tetap (temperature = 0.7 untuk reproducibility)
- Environment stabil (Azure OpenAI dengan deployment yang sama)

**Replikabilitas**
- Kode open source dan terdokumentasi
- Konfigurasi eksperimen tertulis dalam JSON
- Seed untuk randomness tetap

---

## 13. METODE TEKNIS (TECHNICAL METHODS)

### 13.1 Okapi BM25

**Formula Lengkap**:
```
BM25(D, Q) = Σ IDF(qᵢ) · [f(qᵢ, D) · (k₁ + 1)] / [f(qᵢ, D) + k₁ · (1 - b + b · |D| / avgdl)]
```

**IDF Component**:
```
IDF(qᵢ) = ln[(N - n(qᵢ) + 0.5) / (n(qᵢ) + 0.5) + 1]
```

Keterangan:
- `f(qᵢ, D)`: Frekuensi term qᵢ dalam dokumen D
- `k₁ = 1.2`: Term frequency saturation parameter
- `b = 0.75`: Length normalization parameter
- `|D|`: Panjang dokumen D (dalam tokens)
- `avgdl`: Rata-rata panjang dokumen dalam korpus
- `N`: Total dokumen
- `n(qᵢ)`: Jumlah dokumen yang mengandung qᵢ

**Local IDF**: Kami menghitung IDF dari candidate pool (30 chunks dari vector search), bukan global corpus.

### 13.2 Reciprocal Rank Fusion (RRF)

**Formula**:
```
RRF(d) = Σ [1 / (k + r(d))]
         r ∈ R
```

**Weighted RRF** (untuk vector dan BM25):
```
RRF_weighted(d) = α · [1 / (k + r_vector(d))] + β · [1 / (k + r_bm25(d))]
```

Parameter:
- `k = 60`: Smoothing constant (standard)
- `α = 0.6`: Bobot vector ranking
- `β = 0.4`: Bobot BM25 ranking

### 13.3 Cosine Similarity (Vector Search)

**Formula**:
```
cosine(A, B) = (A · B) / (||A|| · ||B||)
```

Implementasi:
- Embedding model: `text-embedding-3-small` (1536 dimensi)
- Distance metric pgvector: `<=>` (cosine distance = 1 - cosine similarity)

### 13.4 Semantic Chunking

**Algoritma**:
1. Embed setiap kalimat dengan sentence embedding model
2. Hitung cosine similarity kalimat berurutan: `sim(S_i, S_{i+1})`
3. Jika `sim < threshold (0.5)`: buat chunk baru
4. Else: gabungkan ke chunk saat ini
5. Enforce min/max chunk size (100-600 tokens)

### 13.5 RAGAS Metrics Calculation

**Faithfulness** (LLM-as-a-Judge):
```
1. Extract claims dari generated answer (LLM-based)
2. Verify setiap claim terhadap retrieved context (NLI model)
3. Faithfulness = |Claims_supported| / |Claims_total|
```

**Answer Relevancy**:
```
1. Generate N pertanyaan balik dari answer (reverse QA)
2. Embed original question dan generated questions
3. Answer Relevancy = (1/N) Σ cosine(E_q, E_qi')
```

---

## 14. STACK TEKNOLOGI

### 14.1 Frontend Stack
| Komponen    | Teknologi            | Versi  | Justifikasi                              |
| ----------- | -------------------- | ------ | ---------------------------------------- |
| Framework   | Next.js              | 15.x   | App Router, server components, streaming |
| UI Library  | React                | 19.x   | Latest features (concurrent rendering)   |
| Styling     | Tailwind CSS         | 4.x    | Utility-first, rapid prototyping         |
| Components  | shadcn/ui            | Latest | Accessible, customizable primitives      |
| State       | Zustand              | 5.x    | Lightweight, no boilerplate              |
| Persistence | Immer + localStorage | -      | Immutable updates, client persistence    |

### 14.2 Backend Stack
| Komponen         | Teknologi              | Versi  | Justifikasi                                 |
| ---------------- | ---------------------- | ------ | ------------------------------------------- |
| Runtime          | Bun                    | 1.x    | Fast package manager, TypeScript native     |
| AI SDK           | Vercel AI SDK          | 5.x    | Tool orchestration, streaming, typed errors |
| LLM Provider     | Azure OpenAI           | -      | Enterprise SLA, data residency              |
| Chat Model       | GPT-4.1-mini           | -      | Cost-effective, reasoning capability        |
| Embedding        | text-embedding-3-small | 1536d  | High quality, low cost                      |
| Database         | PostgreSQL             | 15+    | ACID, JSON support, extensions              |
| Vector Extension | pgvector               | 0.5+   | Native vector similarity search             |
| ORM              | Drizzle ORM            | Latest | Type-safe, zero overhead, migrations        |

### 14.3 Evaluation & Analysis
| Komponen          | Implementasi          | Justifikasi                         |
| ----------------- | --------------------- | ----------------------------------- |
| RAGAS Metrics     | Custom TypeScript     | LLM-as-a-Judge dengan GPT-4.1-mini  |
| Statistical Tests | Custom implementation | Paired t-test, ANOVA, Cohen's d, CI |
| Visualization     | Chart.js / Recharts   | Interactive dashboards              |

### 14.4 Deployment
- **Hosting**: Vercel (frontend + API routes)
- **Database**: Supabase/Railway PostgreSQL (pgvector support)
- **Monitoring**: Vercel Analytics + AI SDK Telemetry

---

## 15. LIMITASI DAN MITIGASI

### 15.1 Limitasi Penelitian

**L1: LLM-as-a-Judge Bias**
- **Deskripsi**: Menggunakan model yang sama (GPT-4.1-mini) untuk generasi dan evaluasi dapat menyebabkan self-preference bias
- **Mitigasi**: Fokus pada **relative gain** antar konfigurasi, bukan nilai absolut. Semua konfigurasi di-judge dengan evaluator yang sama.

**L2: Dataset Size**
- **Deskripsi**: Knowledge base terbatas pada dokumen Universitas Mulia (~500K tokens)
- **Mitigasi**: Corpus representative untuk domain akademik Indonesia. Sistem dapat direplikasi dengan corpus lain.

**L3: Generalisasi**
- **Deskripsi**: Hasil spesifik untuk domain akademik bilingual (Indonesia-Inggris)
- **Mitigasi**: Dokumentasi detail untuk transfer learning ke domain lain. Arsitektur agnostic terhadap domain.

**L4: Latency Agentic**
- **Deskripsi**: Sistem agentic memiliki latensi tinggi (~4-5 detik) dibandingkan traditional RAG (~2 detik)
- **Mitigasi**: Trade-off yang disadari. Untuk query simple, sistem dapat fallback ke non-agentic mode.

**L5: Local IDF vs Global IDF**
- **Deskripsi**: BM25 dihitung dari candidate pool (30 chunks), bukan full corpus
- **Mitigasi**: Vector-first strategy memastikan candidate pool representative. Overhead update jauh lebih rendah.

### 15.2 Pembelaan Desain (Research Justifications)

**Q1: Mengapa bukan Postgres Full-Text Search (tsvector)?**
> Dengan mengimplementasikan BM25 di application layer, sistem mencapai **database agility**. Vector store dapat di-swap (misal dari Postgres ke Qdrant atau Milvus) tanpa kehilangan kapabilitas keyword-search, karena logika keyword adalah bagian dari kode aplikasi, bukan database engine. Ini penting untuk long-term maintainability dan vendor independence.

**Q2: Mengapa Local IDF (bukan Global IDF)?**
> Global IDF memerlukan pemeliharaan inverted index dari seluruh korpus, yang mahal secara komputasi untuk di-update setiap kali ada dokumen baru. Pendekatan **Local IDF** kami memanfaatkan vector engine untuk mendefinisikan 'semantic neighborhood', kemudian menggunakan BM25 untuk discriminate specificity di dalam neighborhood tersebut. Ini mendekati perilaku global search dengan overhead jauh lebih rendah.

**Q3: Mengapa Agentic RAG (bukan Traditional RAG)?**
> Query akademik sering bersifat multi-faceted. RAG standar gagal pada query 'Bandingkan dan Kontras'. Dekomposisi agentic kami memungkinkan sistem mengambil informasi yang berbeda (misal 'Metodologi X' dan 'Metodologi Y') secara paralel, mensintesis jawaban koheren yang tidak dapat dicapai oleh single-step retrieval.

**Q4: Mengapa GPT-4.1-mini (bukan GPT-4o)?**
> GPT-4.1-mini memiliki cost/performance ratio optimal untuk production deployment. Benchmarking internal menunjukkan degradasi akurasi minimal (~2-3%) dibandingkan GPT-4o, namun dengan cost reduction ~70% dan latency improvement ~40%.

---

## 16. KONTRIBUSI PENELITIAN

### 16.1 Kontribusi Teoritis

**1. Framework Agentic RAG untuk Domain Akademik Bilingual**
- Pertama kali mengkombinasikan agentic workflow dengan hybrid retrieval untuk konteks Indonesia
- Demonstrasi empiris trade-off akurasi vs latensi pada sistem agentic

**2. Vector-First + Local BM25 Paradigm**
- Alternatif praktis terhadap database-native FTS dengan vendor agility
- Validasi pendekatan Local IDF pada dataset akademik

**3. Ablation Study Methodology**
- Kerangka kerja sistematis untuk evaluasi RAG dengan 13 konfigurasi
- Template reproducible untuk penelitian RAG selanjutnya

### 16.2 Kontribusi Praktis

**1. Production-Ready Chatbot System**
- Implementasi lengkap dengan guardrails, monitoring, dan evaluation
- Dapat di-deploy di institusi akademik lain dengan minimal kustomisasi

**2. Database-Agnostic Architecture**
- Tidak terikat vendor (dapat menggunakan Postgres, Qdrant, Milvus, dll.)
- Logika bisnis terpisah dari infrastructure layer

**3. Open Documentation & Codebase**
- 13 master report files dengan total ~100KB dokumentasi
- Kode terbuka untuk replikasi dan extension

---

## 17. PUBLIKASI TARGET

### 17.1 Journal Target
- **Primer**: Jurnal Nasional Terakreditasi Sinta 2-3 (Teknik Informatika/Ilmu Komputer)
- **Sekunder**: Proceedings Konferensi Nasional (SEMNASTEK, KOMMIT, dll.)
- **Aspirasional**: IEEE Access / Scopus Q3-Q4 (jika hasil signifikan)

### 17.2 Format Publikasi
- **IMRAD Structure**: Introduction, Methods, Results, And Discussion
- **Bahasa**: Bahasa Indonesia (untuk jurnal nasional)
- **Panjang**: 6000-8000 kata (~12-15 halaman)

---

## 18. TIMELINE PENULISAN

| Fase                       | Durasi   | Deliverable                            |
| -------------------------- | -------- | -------------------------------------- |
| Finalisasi Implementasi    | Week 1-4 | Sistem functional + ablation complete  |
| Data Collection & Analysis | Week 5   | Evaluation results, statistical tests  |
| Drafting IMRAD             | Week 6-7 | Pendahuluan, Metode, Hasil, Pembahasan |
| Revision & Polish          | Week 8   | Final draft                            |
| Submission                 | Week 9   | Submit ke jurnal target                |

---

## 19. REFERENSI UTAMA

1. **Lewis, P., et al. (2020)**. "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." *NeurIPS 2020*.

2. **Es, S., et al. (2023)**. "RAGAS: Automated Evaluation of Retrieval Augmented Generation." *arXiv:2309.15217*.

3. **Singh, A., et al. (2025)**. "Agentic Retrieval-Augmented Generation: A Survey on Agentic RAG." *arXiv preprint*.

4. **Robertson, S., & Zaragoza, H. (2009)**. "The Probabilistic Relevance Framework: BM25 and Beyond." *Foundations and Trends in Information Retrieval*.

5. **Sawarkar, S., et al. (2024)**. "Blended RAG: Improving RAG Accuracy with Semantic Search and Hybrid Query-Based Retrievers." *arXiv:2404.07220*.

6. **Yang, S., et al. (2024)**. "From RAG to Agentic RAG." *Medium*.

---

## 20. CATATAN IMPLEMENTASI

### 20.1 File Kode Utama

| File                                         | LOC  | Deskripsi                                  |
| -------------------------------------------- | ---- | ------------------------------------------ |
| `src/lib/rag/agentic-rag.ts`                 | 831  | Agent tools, workflow, streaming           |
| `src/lib/rag/hybrid-retrieval.ts`            | 889  | Vector + BM25 + RRF                        |
| `src/lib/rag/evaluation.ts`                  | 1280 | RAGAS metrics, ablation configs            |
| `src/lib/rag/guardrails.ts`                  | 986  | PII, prompt injection, hallucination check |
| `src/lib/rag/reranker.ts`                    | 675  | Cross-encoder, LLM, ensemble               |
| `src/lib/rag/chunking.ts`                    | 913  | Semantic, recursive, sentence-window       |
| `src/lib/rag/university-domain.ts`           | 1899 | Domain-specific logic, negative reactions  |
| `src/lib/statistics/statistical-analysis.ts` | 856  | Paired t-test, ANOVA, Cohen's d, CI        |

**Total LOC**: ~8328 lines (core RAG pipeline + evaluation)

### 20.2 Database Schema Utama

```typescript
// documents: Master table untuk dokumen
// document_chunks: Chunks dengan pgvector embeddings
// chat_sessions: Riwayat percakapan
// evaluation_sessions: Hasil evaluasi dan ablation study
```

### 20.3 Environment Variables
```env
DATABASE_URL=postgresql://...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_RESOURCE_NAME=...
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4-1-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small
```

---

## 21. APPENDIX: FORMULA LENGKAP

### A.1 Cohen's d (Effect Size)
```
d = (M₁ - M₂) / SD_pooled

SD_pooled = √[((n₁-1)·SD₁² + (n₂-1)·SD₂²) / (n₁ + n₂ - 2)]
```

### A.2 Paired t-Test
```
t = mean(D) / (SD(D) / √n)
df = n - 1

D = differences between paired samples
```

### A.3 One-Way ANOVA
```
F = MS_between / MS_within

MS_between = SS_between / df_between
MS_within = SS_within / df_within

df_between = k - 1
df_within = N - k

SS_total = Σ(X_ij - X̄..)²
SS_between = Σ n_i(X̄_i - X̄..)²
SS_within = SS_total - SS_between
```

### A.4 95% Confidence Interval
```
CI = M ± t_critical(α=0.05, df) · SE

SE = SD / √n
```

### A.5 NDCG (Normalized Discounted Cumulative Gain)
```
DCG@K = Σ (2^rel_i - 1) / log₂(i + 1)
       i=1 to K

NDCG@K = DCG@K / IDCG@K

IDCG@K = DCG of ideal ranking
```

---

**Dokumen ini adalah rencana komprehensif yang mencakup semua aspek penelitian, implementasi, evaluasi, dan analisis statistik untuk sistem Agentic RAG Chatbot Akademik. Silakan gunakan sebagai referensi untuk penulisan IMRAD paper dan dokumentasi penelitian.**
