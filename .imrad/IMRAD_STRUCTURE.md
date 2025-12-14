# Panduan Penulisan IMRAD Paper
# Sistem Agentic RAG untuk Layanan Akademik

> **CATATAN**: Dokumen ini memberikan outline, snippets, dan helpers untuk menulis paper IMRAD di Microsoft Word. TIDAK PERLU menulis full academic text di sini - hanya bullet points, struktur, dan suggestions.

---

## 📋 STRUKTUR IMRAD OVERVIEW

| Bagian           | Proporsi | Halaman (15 hal) | Focus                                                 |
| ---------------- | -------- | ---------------- | ----------------------------------------------------- |
| **Introduction** | 15-20%   | 2-3 halaman      | Latar belakang → Gap → RQ → Tujuan                    |
| **Methods**      | 25-30%   | 4-5 halaman      | Arsitektur → Implementasi → Evaluasi → Statistik      |
| **Results**      | 25-30%   | 4-5 halaman      | Descriptive stats → Tests → Ablation → Visualizations |
| **Discussion**   | 20-25%   | 3-4 halaman      | Interpretasi → Comparison → Limitations → Future Work |

---

# I. INTRODUCTION (Pendahuluan)

## 1.1 STRUKTUR INTRODUCTION

### Flow Narasi (Funnel Approach)
```
LUAS:     Konteks Umum (AI & Layanan Akademik)
   ↓
MEDIUM:   Masalah Spesifik (Halusinasi LLM, Lexical Gap)
   ↓
SEMPIT:   Gap Penelitian (Tidak ada Agentic RAG di Indonesia)
   ↓
TARGET:   Tujuan Penelitian & Kontribusi Kami
```

---

## 1.2 PARAGRAF PEMBUKA (Opening Hook)

### Contoh Snippet 1: Technology-First
```
Perkembangan Large Language Models (LLM) seperti GPT-4 telah merevolusi
sistem tanya-jawab otomatis dalam berbagai domain. Namun, LLM generik
menghadapi dua keterbatasan fundamental: (1) kecenderungan menghasilkan
informasi yang tidak akurat (halusinasi), dan (2) ketidaktahuan terhadap
konteks lokal spesifik seperti kebijakan institusi akademik.
```

### Contoh Snippet 2: Problem-First
```
Layanan informasi akademik di perguruan tinggi Indonesia menghadapi tantangan
skalabilitas. Pertumbuhan populasi mahasiswa tidak diimbangi dengan penambahan
staf administrasi, menyebabkan keterlambatan respons dan inefisiensi komunikasi.
Large Language Models (LLM) menawarkan solusi, namun rentan menghasilkan
informasi tidak akurat tanpa grounding pada dokumen faktual.
```

### Helper untuk Word:
- **Font**: Times New Roman 12pt, line spacing 1.5
- **Indentasi paragraf**: 1.25 cm (first line indent)
- **Alignment**: Justified

---

## 1.3 ELEMEN WAJIB INTRODUCTION

### A. Latar Belakang (Background)

**Bullet Points yang Harus Dicakup:**
- [ ] AI/LLM revolution dalam QA systems
- [ ] Tantangan layanan akademik (manual, tidak scalable)
- [ ] RAG sebagai solusi (definisi singkat)
- [ ] Keterbatasan RAG tradisional (vector-only vs keyword-only trade-off)
- [ ] Emergence of Agentic AI (multi-step reasoning)

**Paragraph Structure Suggestion:**
```
¶1: AI & LLM context + Academic service challenges
¶2: RAG definition & advantages (reducing hallucination)
¶3: Limitations of conventional RAG (lexical gap, semantic drift)
¶4: Agentic RAG emerging paradigm (multi-step, tools)
```

**Citations to Include:**
- Lewis et al. (2020) - RAG original paper
- Es et al. (2023) - RAGAS evaluation framework
- Singh et al. (2025) - Agentic RAG survey

---

### B. Rumusan Masalah (Problem Statement)

**Struktur Alert Box di Word:**
> ⚠️ **MASALAH UTAMA**:
> 1. **Lexical Gap**: RAG berbasis vektor gagal menangkap kata kunci spesifik (contoh: "KRS")
> 2. **Semantic Drift**: Keyword search BM25 gagal memahami sinonim/parafrase
> 3. **Multi-Step Queries**: Single-step RAG gagal pada query "Bandingkan X dan Y"

**Helper untuk Word:**
- Insert Text Box dengan shading (Light Gray)
- Border: 1pt solid line
- Font: Bold untuk judul masalah

---

### C. Research Gap (Kesenjangan Penelitian)

**Comparison Table untuk Word:**
| Penelitian Sebelumnya                 | Limitasi                  | Kontribusi Kami          |
| ------------------------------------- | ------------------------- | ------------------------ |
| Dense Retrieval (Karpukhin et al.)    | Vector-only, lexical gap  | **Hybrid** Vector + BM25 |
| Keyword Search (Robertson & Zaragoza) | No semantic understanding | **RRF Fusion**           |
| Traditional RAG (Lewis et al.)        | Single-step               | **Agentic Multi-Step**   |
| RAGAS Evaluation (Es et al.)          | English-only              | **Bilingual ID/EN**      |

**Formatting di Word:**
- Insert Table: Style "Grid Table 4 - Accent 1"
- Header row: Bold, filled background
- Highlight "Kontribusi Kami" column dengan warna berbeda

---

### D. Research Questions (Pertanyaan Penelitian)

**Numbered List Formatting:**
```
RQ1. Seberapa signifikan peningkatan akurasi sistem RAG dibandingkan
     baseline Non-RAG dalam metrik Faithfulness dan Answer Relevancy?

RQ2. Apakah pendekatan Hybrid Retrieval (Vector + BM25 + RRF) lebih
     efektif dibandingkan single-method dalam hal Precision@K dan Recall@K?

RQ3. Bagaimana trade-off antara akurasi dan latensi pada Agentic RAG
     dibandingkan Traditional RAG?

RQ4. Bagaimana kontribusi individual setiap komponen (chunking, reranking,
     agent) terhadap performa keseluruhan berdasarkan ablation study?
```

**Helper untuk Word:**
- Gunakan Numbering dengan format "RQ1.", "RQ2.", dst
- Font: **Bold** untuk "RQ1", regular untuk pertanyaan
- Indentasi hanging: 1 cm

---

### E. Tujuan Penelitian (Research Objectives)

**Struktur Nested List:**
```
TUJUAN UMUM:
Mengembangkan dan mengevaluasi sistem Agentic RAG untuk otomatisasi
layanan akademik yang akurat dan andal.

TUJUAN KHUSUS:
1. Merancang arsitektur Hybrid Retrieval (Vector + BM25 + RRF)
2. Mengimplementasikan Agentic Workflow dengan multi-step reasoning
3. Mengembangkan sistem evaluasi otomatis berbasis RAGAS
4. Melakukan ablation study sistematis (13 konfigurasi)
5. Menganalisis performa dengan statistical tests (t-test, ANOVA)
```

**Helper untuk Word:**
- Tujuan Umum: dalam kotak teks (Text Box) dengan border
- Tujuan Khusus: bullet list dengan numbering
- Highlight keywords: **Bold** untuk "Hybrid Retrieval", "Agentic Workflow", dll

---

### F. Hipotesis (Optional tapi Recommended)

**Table Format:**
| Hipotesis | H₀ (Null)                          | H₁ (Alternatif)                         |
| --------- | ---------------------------------- | --------------------------------------- |
| **H1**    | Tidak ada perbedaan RAG vs Non-RAG | RAG > Non-RAG (p<0.05, d>0.8)           |
| **H2**    | Hybrid = Single-method             | Hybrid > Single-method                  |
| **H3**    | Agentic = Traditional              | Agentic > Traditional (complex queries) |

---

## 1.4 DIAGRAM SUGGESTIONS FOR INTRODUCTION

### Diagram 1: "Funnel of Research Focus"
```
┌────────────────────────────────────────┐
│  AI & LLM in Education                 │ (GENERAL CONTEXT)
│  ┌──────────────────────────────────┐  │
│  │ RAG Systems                      │  │ (DOMAIN)
│  │  ┌────────────────────────────┐  │  │
│  │  │ Hybrid Retrieval           │  │  │ (SPECIFIC CONTRIBUTION)
│  │  │  ┌──────────────────────┐  │  │  │
│  │  │  │ Agentic RAG (Kami)   │  │  │  │ (OUR WORK)
│  │  │  └──────────────────────┘  │  │  │
│  │  └────────────────────────────┘  │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**How to create in Word:**
- Insert → SmartArt → Process → "Funnel"
- 4 levels dengan text seperti di atas

---

### Diagram 2: "Problem Space"
Venn diagram showing overlap:
- Circle 1: "Vector Search Strengths" (Semantic understanding)
- Circle 2: "Keyword Search Strengths" (Exact matches)
- **INTERSECTION**: "Hybrid Approach (Kami)" ✅

**How to create in Word:**
- Insert → SmartArt → Relationship → "Basic Venn"
- Label circles dan highlight intersection

---

## 1.5 CHECKLIST INTRODUCTION

Sebelum finalize Introduction, pastikan:
- [ ] Opening hook menarik (problem atau technology angle)
- [ ] Latar belakang comprehensive (4-5 paragraf)
- [ ] Definisi RAG jelas dengan citasi (Lewis et al., 2020)
- [ ] Keterbatasan RAG tradisional dijelaskan
- [ ] Research gap identified (tabel comparison)
- [ ] RQ1-RQ4 stated clearly
- [ ] Tujuan umum dan khusus explicit
- [ ] Hipotesis (optional) ditulis
- [ ] Flow narasi logis (wide → narrow → specific)
- [ ] Citations proper (minimal 8-10 citations di Introduction)

---

# II. METHODS (Metode)

## 2.1 STRUKTUR METHODS

### Subsections yang Harus Ada:
```
2.1 System Architecture      (Arsitektur 4-Layer + diagram)
2.2 Dataset & Knowledge Base  (Corpus, test questions)
2.3 Implementation Details    (Stack, parameters)
2.4 Evaluation Protocol       (RAGAS, ablation study)
2.5 Statistical Analysis      (t-test, ANOVA, effect size)
```

---

## 2.2 SYSTEM ARCHITECTURE

### Diagram Utama: "4-Layer Architecture"

**SANGAT PENTING**: Buat diagram flowchart vertikal dengan 4 layer:

```
┌─────────────────────────────────────────────────────────────┐
│ USER QUERY                                                  │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: DOMAIN-AWARE INGESTION                            │
│  • Hierarchical & Semantic Chunking (threshold = 0.5)       │
│  • Structure Detection (Abstract, Metodologi, Hasil)        │
│  • Language Detection (ID/EN)                               │
│  • ASCII Report Parser                                      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: HYBRID RETRIEVAL                                  │
│  ① pgvector Cosine Distance → Top 30 Candidates            │
│  ② In-Memory Okapi BM25 (k1=1.2, b=0.75) → BM25 Scores     │
│  ③ Reciprocal Rank Fusion (k=60) → Fused Ranking           │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: NEURAL RERANKING                                  │
│  • Cross-Encoder: ms-marco-TinyBERT-L-2-v2                  │
│  • LLM Listwise: GPT-4.1-mini JSON ranking                  │
│  • Ensemble: Weighted (α=0.6, β=0.4)                        │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: AGENTIC ORCHESTRATION                             │
│  • Tools: search_documents, decompose_query, verify_claim   │
│  • ReAct Pattern (max 5 steps)                              │
│  • Input Guardrails: PII, Prompt Injection                  │
│  • Output Guardrails: Hallucination check, Citation verify  │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ FINAL ANSWER (with citations)                              │
└─────────────────────────────────────────────────────────────┘
```

**How to create in Word:**
- Insert → SmartArt → Process → "Basic Process" (pilih vertical)
- Atau manual dengan Shapes: Rectangle untuk boxes, Arrow untuk connectors
- **Colors**: Gunakan gradient fill berbeda untuk setiap layer
- **Border**: 2pt solid untuk emphasis

---

### Paragraph Explaining Each Layer

**Template Snippet:**
```
Sistem kami mengimplementasikan arsitektur 4-layer yang dirancang untuk
mengatasi keterbatasan RAG tradisional:

Layer 1 (Domain-Aware Ingestion) menangani heterogenitas dokumen akademik
melalui semantic chunking. Berbeda dengan fixed-window splitting, kami
menghitung cosine similarity antar kalimat berurutan dan membuat chunk
baru ketika similarity < threshold (0.5).

Layer 2 (Hybrid Retrieval) menggunakan strategi "Vector-First Candidate
Generation". pgvector melakukan semantic search untuk menghasilkan 30
kandidat teratas (oversampling 3×K), kemudian Okapi BM25 in-memory
melakukan keyword scoring pada candidate pool. Reciprocal Rank Fusion
(RRF) menggabungkan kedua ranking dengan formula: ...
```

---

## 2.3 TECHNICAL METHODS - FORMULAS

### Formula 1: Okapi BM25

**Di Word, gunakan Equation Editor:**
```
Insert → Equation → Professional

BM25(D, Q) = Σ IDF(qᵢ) · [f(qᵢ, D) · (k₁ + 1)] /
                        [f(qᵢ, D) + k₁ · (1 - b + b · |D| / avgdl)]
```

**Explanation Table:**
| Parameter | Nilai | Deskripsi                         |
| --------- | ----- | --------------------------------- |
| k₁        | 1.2   | Term frequency saturation         |
| b         | 0.75  | Length normalization              |
| f(qᵢ, D)  | -     | Frekuensi term qᵢ dalam dokumen D |
| \|D\|     | -     | Panjang dokumen (tokens)          |
| avgdl     | -     | Rata-rata panjang dokumen korpus  |

---

### Formula 2: Reciprocal Rank Fusion (RRF)

**Equation:**
```
RRF(d) = Σ [1 / (k + r(d))]
        r∈R

Weighted RRF(d) = α · [1/(k + r_vector(d))] + β · [1/(k + r_BM25(d))]
```

**Parameter Table:**
| Parameter         | Nilai Default | Justifikasi                       |
| ----------------- | ------------- | --------------------------------- |
| k                 | 60            | Smoothing constant (standard)     |
| α (vector weight) | 0.6           | Prioritize semantic understanding |
| β (BM25 weight)   | 0.4           | Balance with keyword precision    |

---

### Formula 3: Cosine Similarity

```
cosine(A, B) = (A · B) / (||A|| · ||B||)
```

**Implementation Details:**
- Embedding model: `text-embedding-3-small` (Azure OpenAI)
- Dimensionality: 1536-d
- Database: PostgreSQL pgvector extension
- Distance metric: `<=>` (cosine distance = 1 - cosine similarity)

---

## 2.4 DATASET & KNOWLEDGE BASE

### Table 1: Korpus Dokumen

| Karakteristik  | Nilai             | Deskripsi                 |
| -------------- | ----------------- | ------------------------- |
| Sumber         | Universitas Mulia | Dokumen akademik internal |
| Jumlah Dokumen | 50-100            | PDF, TXT, MD              |
| Total Tokens   | ~500K             | Approximate               |
| Bahasa         | ID/EN (bilingual) | Mayoritas Indonesia       |
| Chunk Count    | ~5000             | Post semantic chunking    |
| Avg Chunk Size | 312 tokens        | Range: 100-600            |

### Table 2: Test Questions Dataset

| Kategori               | Jumlah | Persentase | Complexity    |
| ---------------------- | ------ | ---------- | ------------- |
| `academic_process`     | 8      | 20%        | Simple-Medium |
| `research_methodology` | 10     | 25%        | Medium-Hard   |
| `academic_writing`     | 8      | 20%        | Medium        |
| `university_policy`    | 8      | 20%        | Simple-Medium |
| `general_academic`     | 6      | 15%        | Simple        |
| **TOTAL**              | **40** | **100%**   | Mixed         |

**Complexity Distribution:**
- Simple (40%): Single-fact lookup
- Medium (40%): Multi-fact reasoning
- Complex (20%): Multi-step decomposition

---

## 2.5 ABLATION STUDY CONFIGURATIONS

**CRITICAL TABLE** (harus ada di Methods):

| Config | RAG | Retrieval | Rerank   | Chunking  | Agent | Description               |
| ------ | --- | --------- | -------- | --------- | ----- | ------------------------- |
| **C0** | ❌   | -         | -        | -         | ❌     | Baseline (No RAG)         |
| **C1** | ✅   | vector    | ❌        | recursive | ❌     | Vector-only               |
| **C2** | ✅   | keyword   | ❌        | recursive | ❌     | BM25-only                 |
| **C3** | ✅   | hybrid    | ❌        | recursive | ❌     | Hybrid no rerank          |
| **C4** | ✅   | hybrid    | cross    | recursive | ❌     | + Cross-Encoder           |
| **C5** | ✅   | hybrid    | llm      | recursive | ❌     | + LLM Rerank              |
| **C6** | ✅   | hybrid    | ensemble | recursive | ❌     | + Ensemble                |
| **C7** | ✅   | hybrid    | ensemble | semantic  | ❌     | + Semantic Chunk          |
| **C8** | ✅   | hybrid    | ensemble | semantic  | ✅     | + Agentic (no guardrails) |
| **C9** | ✅   | hybrid    | ensemble | semantic  | ✅     | **Full System**           |

**Formatting in Word:**
- Insert Table, apply "Grid Table 4 - Accent 1" style
- Merge cells untuk header jika perlu
- Highlight C9 (Full System) dengan bold + background color
- Gunakan emoji checkmark (✅) dan cross (❌) untuk clarity

---

## 2.6 EVALUATION PROTOCOL

### Subsection 2.6.1: RAGAS Metrics

**Table of Metrics:**
| Metrik                | Formula                                     | Range | Deskripsi                       |
| --------------------- | ------------------------------------------- | ----- | ------------------------------- |
| **Faithfulness**      | \|Claims_supported\| / \|Claims_total\|     | 0-1   | LLM verifikasi klaim vs konteks |
| **Answer Relevancy**  | (1/n) Σ cosine(E_q, E_qi')                  | 0-1   | Reverse QA approach             |
| **Context Precision** | \|Relevant@K\| / K                          | 0-1   | Presisi retrieval               |
| **Context Recall**    | \|Relevant_retrieved\| / \|Relevant_total\| | 0-1   | Recall retrieval                |

**Explanation Paragraph Snippet:**
```
Kami menggunakan kerangka kerja RAGAS (Retrieval-Augmented Generation
Assessment) yang dikembangkan oleh Es et al. (2023) untuk evaluasi
otomatis. Faithfulness mengukur proporsi klaim dalam jawaban yang
didukung oleh konteks yang diambil. Proses ini dilakukan dengan LLM-as-a-Judge:
GPT-4.1-mini mengekstrak klaim dari jawaban, kemudian memverifikasi setiap
klaim terhadap dokumen retrieval menggunakan Natural Language Inference (NLI).
```

---

### Subsection 2.6.2: LLM-as-a-Judge

**Alert Box di Word:**
> ℹ️ **CATATAN METODOLOGI**:
> Kami menggunakan model yang sama (GPT-4.1-mini) untuk:
> - **Generasi**: Menghasilkan jawaban chatbot
> - **Evaluasi**: Menjadi judge untuk metrik RAGAS
>
> **Mitigasi Bias**: Fokus pada *relative gain* antar konfigurasi,
> bukan nilai absolut. Semua konfigurasi di-evaluate dengan judge yang sama.

---

## 2.7 STATISTICAL ANALYSIS

### Subsection 2.7.1: Hypothesis Testing

**Table: Statistical Tests**
| Test                   | Tujuan         | Kapan Digunakan          | Formula                    |
| ---------------------- | -------------- | ------------------------ | -------------------------- |
| **Paired t-test**      | RAG vs Non-RAG | 2 kondisi berpasangan    | t = mean(D) / (SD(D)/√n)   |
| **Independent t-test** | Antar config   | 2 grup independen        | t = (M₁-M₂) / SE_pooled    |
| **One-way ANOVA**      | Multi-config   | > 2 grup                 | F = MS_between / MS_within |
| **Tukey HSD**          | Post-hoc       | Setelah ANOVA signifikan | -                          |

---

### Subsection 2.7.2: Effect Size

**Equations dengan explanation:**

**Cohen's d** (untuk 2-grup comparison):
```
d = (M₁ - M₂) / SD_pooled

SD_pooled = √[((n₁-1)·SD₁² + (n₂-1)·SD₂²) / (n₁+n₂-2)]
```

**Interpretasi:**
- d = 0.2: Small effect
- d = 0.5: Medium effect
- d = 0.8: Large effect

**η² (Eta Squared)** (untuk ANOVA):
```
η² = SS_between / SS_total
```

**Interpretasi:**
- η² = 0.01: Small effect
- η² = 0.06: Medium effect
- η² = 0.14: Large effect

---

### Subsection 2.7.3: Confidence Intervals

```
95% CI = M ± t_critical(α=0.05, df) · SE

SE = SD / √n
```

**Reporting Template:**
> "Faithfulness untuk Full System (C9): M = 0.847, 95% CI [0.822, 0.872]"

---

## 2.8 IMPLEMENTATION DETAILS

**Table: Technology Stack**
| Layer    | Komponen     | Teknologi              | Versi/Config      |
| -------- | ------------ | ---------------------- | ----------------- |
| Frontend | Framework    | Next.js                | 15.x (App Router) |
|          | UI Library   | React                  | 19.x              |
|          | Styling      | Tailwind CSS           | 4.x               |
|          | State        | Zustand                | 5.x               |
| Backend  | Runtime      | Bun                    | 1.x               |
|          | AI SDK       | Vercel AI SDK          | 5.x               |
|          | LLM Provider | Azure OpenAI           | -                 |
|          | Chat Model   | GPT-4.1-mini           | temp=0.7          |
|          | Embedding    | text-embedding-3-small | 1536-d            |
| Database | RDBMS        | PostgreSQL             | 15+               |
|          | Vector Ext   | pgvector               | 0.5+              |
|          | ORM          | Drizzle ORM            | Latest            |

---

## 2.9 PARAMETER CONFIGURATIONS

**Table: Hyperparameters**
| Komponen      | Parameter  | Nilai      | Justifikasi                   |
| ------------- | ---------- | ---------- | ----------------------------- |
| **BM25**      | k₁         | 1.2        | TF saturation for long docs   |
|               | b          | 0.75       | Standard length normalization |
| **RRF**       | k          | 60         | Standard smoothing constant   |
|               | α (vector) | 0.6        | Prioritize semantic           |
|               | β (BM25)   | 0.4        | Balance keyword               |
| **Retrieval** | topK       | 10         | Final results                 |
|               | candidateK | 30         | 3× oversampling               |
| **Chunking**  | threshold  | 0.5        | Semantic similarity cutoff    |
|               | minSize    | 100 tokens | Avoid too small               |
|               | maxSize    | 600 tokens | Avoid too large               |
| **Agentic**   | maxSteps   | 5          | Balance depth vs latency      |

---

## 2.10 DIAGRAMS TO INCLUDE IN METHODS

### Diagram 1: "Hybrid Retrieval Pipeline" (MUST HAVE)
```
Query
  │
  ├─► [Vector Search] ──► Top 30 Candidates ──┐
  │                                            │
  └─► [Tokenize & Stem] ──► BM25 Terms ───────┤
                                               ↓
                                          [RRF Fusion]
                                               ↓
                                          Top 10 Fused
```

**How to create:** SmartArt → Process → "Converging Radial"

---

### Diagram 2: "Semantic Chunking Algorithm"
```
Flowchart:
[Document] → [Sentence Split] → [Embed Each Sentence]
                                        ↓
                                [Calculate Similarity(i, i+1)]
                                        ↓
                               [Similarity < 0.5?]
                                   /          \
                                 YES           NO
                                  ↓             ↓
                          [New Chunk]   [Add to Current Chunk]
                                  ↓             ↓
                              [Enforce Min/Max Size]
                                        ↓
                                   [Output Chunks]
```

**How to create:** Insert → Shapes → Flowchart shapes

---

### Diagram 3: "Database Schema ERD"
```
┌──────────────┐         ┌──────────────────┐
│  documents   │ 1─────∞ │ document_chunks  │
├──────────────┤         ├──────────────────┤
│ id (PK)      │         │ id (PK)          │
│ title        │         │ document_id (FK) │
│ content      │         │ content          │
│ file_type    │         │ embedding (vector[1536]) │
│ metadata     │         │ metadata         │
└──────────────┘         └──────────────────┘

┌──────────────────┐     ┌──────────────────────┐
│  chat_sessions   │     │ evaluation_sessions  │
├──────────────────┤     ├──────────────────────┤
│ id (PK)          │     │ id (PK)              │
│ title            │     │ name                 │
│ messages (jsonb) │     │ metrics (jsonb)      │
│ created_at       │     │ ablation_results     │
└──────────────────┘     └──────────────────────┘
```

**How to create:** Insert → SmartArt → Hierarchy atau manual dengan Tables + lines

---

## 2.11 CHECKLIST METHODS SECTION

Sebelum finalize Methods, pastikan:
- [ ] Arsitektur 4-layer dijelaskan dengan diagram
- [ ] Formula BM25, RRF, Cosine Similarity dituliskan (Equation Editor)
- [ ] Dataset characteristics (knowledge base + test questions) explained
- [ ] Ablation study configurations table (13 configs)
- [ ] RAGAS metrics defined dengan formula
- [ ] LLM-as-a-Judge approach justified
- [ ] Statistical tests explained (paired t-test, ANOVA, effect size)
- [ ] Technology stack table complete
- [ ] Hyperparameters documented dengan justifikasi
- [ ] Minimum 3 diagrams (architecture, hybrid retrieval, ERD)
- [ ] Reproducibility: semua parameter tertulis

---

# III. FORMATTING HELPERS FOR MICROSOFT WORD

## 3.1 GENERAL FORMATTING

**Margins:**
- Top: 3 cm
- Bottom: 3 cm
- Left: 4 cm
- Right: 3 cm

**Font:**
- Body: Times New Roman 12pt
- Headings:
  - Level 1: 14pt Bold
  - Level 2: 13pt Bold
  - Level 3: 12pt Bold
- Line Spacing: 1.5
- Paragraph Spacing: 6pt after

**Page Numbering:**
- Bottom center
- Format: Arabic numerals (1, 2, 3)

---

## 3.2 TABLES

**Best Practices:**
- Use "Grid Table 4 - Accent 1" style
- Header row: Bold + Filled background
- Borders: 1pt untuk clarity
- Caption: Above table ("Tabel 1. ...")
  - Font: 11pt Italic
  - Alignment: Left

**Caption Numbering:**
- Insert → Caption → Label "Tabel"
- Auto-numbering: Tabel 1, Tabel 2, etc.

---

## 3.3 FIGURES & DIAGRAMS

**Positioning:**
- Insert → Picture / SmartArt
- Wrap Text: "Top and Bottom"
- Alignment: Center

**Caption:**
- Below figure ("Gambar 1. ...")
- Font: 11pt Italic
- Alignment: Center

**Recommended Diagram Tools:**
1. **SmartArt**: For standard flows (Process, Cycle, Hierarchy)
2. **Shapes**: For custom flowcharts
3. **Visio** (if available): For complex ERDs
4. **Draw.io** (free): Export as PNG, insert

---

## 3.4 EQUATIONS

**Equation Editor:**
- Insert → Equation → Professional format
- Font: Cambria Math (default)
- Numbering: Right-aligned in parentheses (1), (2), etc.

**Example Layout:**
```
[Equation centered]                                    (1)

Formula explanation paragraph below...
```

---

## 3.5 CITATIONS & REFERENCES

**In-Text Citation Style (APA 7th):**
- Single author: (Lewis, 2020)
- Two authors: (Robertson & Zaragoza, 2009)
- Three+ authors: (Es et al., 2023)

**Reference List Format:**
```
Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., ...
    & Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive
    NLP tasks. *Advances in Neural Information Processing Systems*, *33*,
    9459-9474.

Es, S., James, J., Espinosa-Anke, L., & Schockaert, S. (2023). RAGAS:
    Automated evaluation of retrieval augmented generation. *arXiv preprint
    arXiv:2309.15217*.
```

**Formatting:**
- Hanging indent: 1.27 cm
- Line spacing: 1.5
- Alphabetical order by first author surname

---

## 3.6 SECTION NUMBERING

**Multilevel List:**
1. Introduction
   1.1 Background
   1.2 Problem Statement
2. Methods
   2.1 System Architecture
   2.2 Dataset
   2.3 Evaluation
3. Results
   ...

**How to set up:**
- Home → Multilevel List → Define New Multilevel List
- Level 1: 1, 2, 3
- Level 2: 1.1, 1.2, 1.3
- Level 3: 1.1.1, 1.1.2

---

# IV. CONTENT SUGGESTIONS (SNIPPETS)

## 4.1 TRANSITION SENTENCES (Between Sections)

**Introduction → Methods:**
```
"Untuk menjawab pertanyaan penelitian di atas, kami mengembangkan sistem
Agentic RAG dengan arsitektur 4-layer yang akan dijelaskan pada bagian
berikut."
```

**Methods → Results:**
```
"Hasil evaluasi terhadap 40 test questions dengan 13 konfigurasi ablation
disajikan pada bagian berikut."
```

---

## 4.2 METHODOLOGICAL JUSTIFICATIONS (Snippets)

**Mengapa Vector-First?**
```
"Kami memilih strategi Vector-First Candidate Generation karena semantic
search memiliki recall tinggi (mampu menangkap variasi frasa), sementara
BM25 pada candidate pool memberikan precision untuk keyword eksak.
Pendekatan ini menghindari trade-off antara semantic understanding dan
lexical precision yang dialami oleh single-method retrieval."
```

**Mengapa Semantic Chunking?**
```
"Berbeda dengan fixed-window chunking (misal 512 tokens), semantic chunking
mempertahankan koherensi topik di dalam setiap chunk. Kami menghitung
cosine similarity antara sentence embeddings berurutan; ketika similarity
turun di bawah threshold (0.5), ini mengindikasikan pergeseran topik dan
memicu pembuatan chunk baru."
```

---

# V. CHECKLIST AKHIR SEBELUM SUBMISSION

## Introduction
- [ ] Opening hook menarik (1 paragraf)
- [ ] Background comprehensive (4-5 paragraf)
- [ ] Research gap identified dengan comparison table
- [ ] RQ1-RQ4 ditulis clearly
- [ ] Tujuan penelitian (umum + khusus)
- [ ] Minimal 8-10 citations
- [ ] Diagram "Funnel of Focus" atau Venn diagram

## Methods
- [ ] Arsitektur 4-layer dengan diagram vertikal
- [ ] Formula BM25, RRF, Cosine (Equation Editor)
- [ ] Dataset table (knowledge base + test questions)
- [ ] Ablation study configurations table (13 configs)
- [ ] RAGAS metrics explained
- [ ] LLM-as-a-Judge justified
- [ ] Statistical tests (t-test, ANOVA, Cohen's d)
- [ ] Technology stack table
- [ ] Hyperparameters documented
- [ ] ERD database schema
- [ ] Reproducibility details

## Formatting
- [ ] Margins benar (4cm left, 3cm others)
- [ ] Font Times New Roman 12pt
- [ ] Line spacing 1.5
- [ ] Multilevel numbering (1, 1.1, 1.1.1)
- [ ] Table captions above tables
- [ ] Figure captions below figures
- [ ] Equations numbered
- [ ] Citations APA 7th style
- [ ] Reference list hanging indent

---

**CATATAN AKHIR**: Dokumen ini adalah **HELPER**, bukan paper final. Gunakan snippets, tables, dan formatting guides ini untuk menulis di Microsoft Word. Focus pada clarity, reproducibility, dan academic rigor.
