# METODE PENELITIAN (METHODS) - BAGIAN 2
# Protokol Evaluasi, Ablation Study, dan Analisis Statistik

---

## 2.9 Protokol Evaluasi

### 2.9.1 Framework RAGAS (Retrieval-Augmented Generation Assessment)

Evaluasi menggunakan framework **RAGAS** (Es et al., 2023) yang dirancang khusus untuk sistem RAG. RAGAS menyediakan metrik-metrik yang mengukur dimensi-dimensi kritis kualitas RAG tanpa memerlukan ground truth manusia untuk setiap iterasi.

**Diagram 2.5. Komponen Evaluasi RAGAS**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAGAS EVALUATION PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐                                                            │
│  │   Question   │                                                            │
│  │      (Q)     │                                                            │
│  └──────┬───────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                ┌──────────────┐                           │
│  │   Retriever  │───────────────▶│   Context    │                           │
│  │   (Hybrid)   │                │     (C)      │                           │
│  └──────────────┘                └───────┬──────┘                           │
│                                          │                                   │
│                                          ▼                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         GENERATOR (LLM)                               │   │
│  │                        ┌──────────────┐                               │   │
│  │                        │    Answer    │                               │   │
│  │                        │      (A)     │                               │   │
│  │                        └──────────────┘                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────METRICS────────────────────────────────┐ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │ │
│  │  │  FAITHFULNESS   │  │ ANSWER RELEVANCY│  │  CONTEXT PRECISION     │ │ │
│  │  │                 │  │                 │  │                         │ │ │
│  │  │  A grounded in  │  │  A relevant to  │  │  C contains relevant   │ │ │
│  │  │  C?             │  │  Q?             │  │  chunks for Q?         │ │ │
│  │  │                 │  │                 │  │                         │ │ │
│  │  │  Claims in A    │  │  Reverse QA:    │  │  Precision of          │ │ │
│  │  │  supported by C │  │  Generate Qs    │  │  retrieved docs        │ │ │
│  │  │                 │  │  from A         │  │                         │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │                       CONTEXT RECALL                             │   │ │
│  │  │                                                                   │   │ │
│  │  │  All relevant information in ground truth covered by C?          │   │ │
│  │  │                                                                   │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.9.2 Metrik Evaluasi Utama

#### A. Faithfulness (Kesetiaan terhadap Konteks)

**Definisi**: Proporsi klaim dalam jawaban yang dapat diverifikasi dari retrieved context.

**Formula**:

$$Faithfulness = \frac{|Claims_{supported}|}{|Claims_{total}|}$$

**Perhitungan**:
1. **Claim Extraction**: LLM mengekstrak klaim faktual dari jawaban
2. **Claim Verification**: Setiap klaim di-verify terhadap context menggunakan Natural Language Inference (NLI)
3. **Aggregation**: Hitung proporsi klaim yang didukung

**Contoh**:
```
Answer: "KRS dapat diisi melalui portal akademik [1]. Periode pengisian adalah
         minggu pertama setiap semester [2]. Mahasiswa wajib mengisi minimal
         12 SKS [tidak ada referensi]."

Claims extracted:
1. "KRS dapat diisi melalui portal akademik" → Supported by [1] ✓
2. "Periode pengisian adalah minggu pertama" → Supported by [2] ✓
3. "Mahasiswa wajib mengisi minimal 12 SKS" → Not in context ✗

Faithfulness = 2/3 = 0.67
```

#### B. Answer Relevancy (Relevansi Jawaban)

**Definisi**: Seberapa relevan jawaban terhadap pertanyaan original.

**Formula**:

$$Answer\_Relevancy = \frac{1}{N} \sum_{i=1}^{N} cosine(E_q, E_{q_i'})$$

di mana:
- $E_q$ = embedding pertanyaan original
- $E_{q_i'}$ = embedding pertanyaan yang di-generate dari jawaban (reverse QA)
- $N$ = jumlah pertanyaan yang di-generate (default: 3)

**Perhitungan**:
1. **Reverse Question Generation**: LLM generate N pertanyaan yang dapat dijawab oleh answer
2. **Embedding**: Embed original question dan generated questions
3. **Similarity**: Hitung rata-rata cosine similarity

**Intuisi**: Jika jawaban relevan, pertanyaan yang di-generate dari jawaban akan mirip dengan pertanyaan original.

#### C. Context Precision (Presisi Konteks)

**Definisi**: Proporsi dokumen retrieved yang relevan untuk menjawab pertanyaan.

**Formula**:

$$Context\_Precision = \frac{|Relevant_{retrieved@K}|}{K}$$

**Perhitungan**: LLM menilai relevansi setiap chunk retrieved terhadap pertanyaan (binary: relevant/not relevant).

#### D. Context Recall (Recall Konteks)

**Definisi**: Proporsi informasi relevan yang berhasil di-retrieve.

**Formula**:

$$Context\_Recall = \frac{|Relevant_{retrieved}|}{|Relevant_{total}|}$$

**Perhitungan**: Memerlukan ground truth (dokumen relevan yang diketahui). Untuk setiap klaim dalam ground truth answer, verifikasi apakah ada supporting context di retrieved chunks.

### 2.9.3 Metrik Retrieval Tambahan

**Tabel 2.7. Metrik Retrieval Quality**

| Metrik          | Formula                                                     | Interpretasi                   |
| --------------- | ----------------------------------------------------------- | ------------------------------ |
| **Precision@K** | $\frac{TP}{TP + FP}$ pada top-K                             | Presisi dokumen retrieval      |
| **Recall@K**    | $\frac{TP}{TP + FN}$ pada top-K                             | Recall dokumen retrieval       |
| **F1-Score**    | $2 \cdot \frac{Precision \cdot Recall}{Precision + Recall}$ | Harmonic mean P dan R          |
| **NDCG@K**      | $\frac{DCG_K}{IDCG_K}$                                      | Normalized ranking quality     |
| **MRR**         | $\frac{1}{rank_{first\_relevant}}$                          | Posisi dokumen relevan pertama |

**Formula NDCG**:

$$DCG_K = \sum_{i=1}^{K} \frac{2^{rel_i} - 1}{\log_2(i + 1)}$$

$$NDCG_K = \frac{DCG_K}{IDCG_K}$$

di mana $IDCG_K$ adalah DCG dari ideal ranking.

### 2.9.4 Metrik Hallucination

**Tabel 2.8. Metrik Deteksi Halusinasi**

| Metrik                  | Range               | Definisi                                 |
| ----------------------- | ------------------- | ---------------------------------------- |
| **Hallucination Rate**  | 0-1 (lower better)  | Proporsi klaim tanpa supporting evidence |
| **Factual Consistency** | 0-1 (higher better) | NLI-based consistency dengan context     |
| **Source Attribution**  | 0-1 (higher better) | Proporsi klaim dengan proper citation    |
| **Contradiction Score** | 0-1 (lower better)  | Jumlah kontradiksi dalam jawaban         |

**Formula Hallucination Rate**:

$$Hallucination\_Rate = 1 - Faithfulness = \frac{|Claims_{unsupported}|}{|Claims_{total}|}$$

### 2.9.5 Metrik Latency

**Tabel 2.9. Breakdown Latency**

| Fase                 | Metrik                    | Target            |
| -------------------- | ------------------------- | ----------------- |
| Embedding Generation | `embeddingLatencyMs`      | < 100ms           |
| Vector Search        | `vectorSearchLatencyMs`   | < 50ms            |
| BM25 Scoring         | `bm25LatencyMs`           | < 30ms            |
| Reranking            | `rerankingLatencyMs`      | < 500ms           |
| LLM Generation       | `generationLatencyMs`     | < 2000ms          |
| Agent Reasoning      | `agentReasoningLatencyMs` | < 1000ms per step |
| **Total (RAG)**      | `totalLatencyMs`          | < 3000ms          |
| **Total (Agentic)**  | `totalLatencyMs`          | < 5000ms          |

---

## 2.10 Ablation Study

### 2.10.1 Tujuan Ablation Study

Ablation study bertujuan memahami **kontribusi individual** setiap komponen terhadap performa keseluruhan sistem dengan cara menghapus atau memodifikasi komponen secara sistematis.

**Research Questions yang Dijawab**:
1. Berapa besar kontribusi RAG dibandingkan Non-RAG?
2. Apakah Hybrid Retrieval lebih baik dari single-method?
3. Apakah Reranking memberikan nilai tambah signifikan?
4. Apakah Semantic Chunking lebih baik dari Recursive?
5. Apakah Agentic mode worth the latency trade-off?

### 2.10.2 Konfigurasi Ablation (13 Configurations)

**Tabel 2.10. Ablation Study Configurations**

| ID      | Configuration Name | RAG | Retrieval | Rerank   | Chunk     | Agent | Guard | Deskripsi              |
| ------- | ------------------ | --- | --------- | -------- | --------- | ----- | ----- | ---------------------- |
| **C0**  | Baseline (No RAG)  | ❌   | -         | -        | -         | ❌     | ❌     | LLM tanpa retrieval    |
| **C1**  | Vector Only        | ✅   | vector    | ❌        | recursive | ❌     | ❌     | Dense retrieval only   |
| **C2**  | BM25 Only          | ✅   | keyword   | ❌        | recursive | ❌     | ❌     | Sparse retrieval only  |
| **C3**  | Hybrid (No Rerank) | ✅   | hybrid    | ❌        | recursive | ❌     | ❌     | Vector + BM25 + RRF    |
| **C4**  | Hybrid + Cross     | ✅   | hybrid    | cross    | recursive | ❌     | ❌     | + Cross-Encoder rerank |
| **C5**  | Hybrid + LLM       | ✅   | hybrid    | llm      | recursive | ❌     | ❌     | + LLM Listwise rerank  |
| **C6**  | Hybrid + Ensemble  | ✅   | hybrid    | ensemble | recursive | ❌     | ❌     | + Ensemble rerank      |
| **C7**  | Semantic Chunk     | ✅   | hybrid    | ensemble | semantic  | ❌     | ❌     | + Semantic chunking    |
| **C8**  | Agentic (No Guard) | ✅   | hybrid    | ensemble | semantic  | ✅     | ❌     | + Multi-step agent     |
| **C9**  | Full System        | ✅   | hybrid    | ensemble | semantic  | ✅     | ✅     | Semua komponen aktif   |
| **C10** | Indonesian Opt     | ✅   | hybrid    | ensemble | semantic  | ✅     | ✅     | Tuned for ID language  |
| **C11** | Fixed Chunk        | ✅   | hybrid    | cross    | fixed     | ❌     | ❌     | Fixed 512 token chunks |
| **C12** | Sentence Window    | ✅   | hybrid    | cross    | sentence  | ❌     | ❌     | Sentence-window chunk  |

**Diagram 2.6. Ablation Tree**

```
                                   Baseline (C0)
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              Vector (C1)          BM25 (C2)          Hybrid (C3)
                                                           │
                              ┌────────────────────────────┼─────────────────────┐
                              ▼                            ▼                     ▼
                       + Cross (C4)                  + LLM (C5)          + Ensemble (C6)
                                                                               │
                                                                ┌──────────────┴──────────────┐
                                                                ▼                             ▼
                                                  + Semantic Chunk (C7)               Fixed/Sentence (C11, C12)
                                                                │
                                                                ▼
                                                    + Agentic (C8)
                                                                │
                                                                ▼
                                                    + Guardrails (C9)
                                                                │
                                                                ▼
                                                      Indonesian Opt (C10)
```

### 2.10.3 Prosedur Eksekusi Ablation

```
FOR each configuration C in [C0, C1, ..., C12]:
    FOR each question Q in test_questions:
        1. Configure system with C settings
        2. Execute query Q
        3. Capture:
           - Generated answer A
           - Retrieved chunks (if RAG enabled)
           - Latency breakdown
           - Agent steps (if agentic enabled)
        4. Calculate RAGAS metrics for (Q, A, C)
        5. Store results
    END FOR
END FOR

Aggregate results per configuration
Run statistical tests
```

---

## 2.11 Analisis Statistik

### 2.11.1 Uji Prasyarat

Sebelum melakukan uji statistik inferensial, dilakukan uji prasyarat:

**A. Uji Normalitas (Shapiro-Wilk)**
- **H₀**: Data terdistribusi normal
- **H₁**: Data tidak terdistribusi normal
- **Keputusan**: Jika p > 0.05, asumsi normalitas terpenuhi

**B. Uji Homogenitas Varians (Levene's Test)**
- **H₀**: Varians antar grup homogen
- **H₁**: Varians antar grup tidak homogen
- **Keputusan**: Jika p > 0.05, asumsi homogenitas terpenuhi

Jika asumsi tidak terpenuhi, gunakan non-parametric alternatives (Mann-Whitney U, Kruskal-Wallis).

### 2.11.2 Paired t-Test (RAG vs Non-RAG)

**Tujuan**: Membandingkan dua kondisi berpasangan (C0 vs C9 pada test questions yang sama).

**Asumsi**:
- Data berpasangan (same questions across conditions)
- Normalitas differences

**Formula**:

$$t = \frac{\bar{D}}{SE_D} = \frac{\bar{D}}{S_D / \sqrt{n}}$$

di mana:
- $\bar{D}$ = mean of differences
- $S_D$ = standard deviation of differences
- $n$ = number of pairs

**Degrees of Freedom**: $df = n - 1$

**Hipotesis**:
- $H_0: \mu_D = 0$ (tidak ada perbedaan)
- $H_1: \mu_D \neq 0$ (ada perbedaan)

**Keputusan**: Tolak $H_0$ jika $p < \alpha$ (α = 0.05)

**Format Pelaporan**:
> "Paired t-test menunjukkan perbedaan signifikan dalam Faithfulness antara Full RAG (M = 0.847, SD = 0.089) dan Non-RAG (M = 0.623, SD = 0.142), t(39) = 8.234, p < 0.001, d = 1.89."

### 2.11.3 Independent Samples t-Test

**Tujuan**: Membandingkan dua grup independen.

**Formula**:

$$t = \frac{\bar{X}_1 - \bar{X}_2}{SE_{pooled}}$$

$$SE_{pooled} = S_p \sqrt{\frac{1}{n_1} + \frac{1}{n_2}}$$

$$S_p = \sqrt{\frac{(n_1-1)S_1^2 + (n_2-1)S_2^2}{n_1 + n_2 - 2}}$$

**Degrees of Freedom**: $df = n_1 + n_2 - 2$

### 2.11.4 One-Way ANOVA

**Tujuan**: Membandingkan >2 grup (C1 vs C2 vs C3 vs ... vs C12).

**Formula**:

$$F = \frac{MS_{between}}{MS_{within}}$$

$$MS_{between} = \frac{SS_{between}}{df_{between}} = \frac{\sum n_i(\bar{X}_i - \bar{X}_{..})^2}{k-1}$$

$$MS_{within} = \frac{SS_{within}}{df_{within}} = \frac{\sum\sum(X_{ij} - \bar{X}_i)^2}{N-k}$$

di mana:
- $k$ = jumlah grup
- $N$ = total observations
- $\bar{X}_i$ = mean grup i
- $\bar{X}_{..}$ = grand mean

**Hipotesis**:
- $H_0: \mu_1 = \mu_2 = ... = \mu_k$ (semua mean sama)
- $H_1$: Minimal satu mean berbeda

**Format Pelaporan**:
> "One-way ANOVA menunjukkan perbedaan signifikan antar konfigurasi untuk Faithfulness, F(12, 507) = 42.31, p < 0.001, η² = 0.50."

### 2.11.5 Post-Hoc Test: Tukey HSD

**Tujuan**: Setelah ANOVA signifikan, identifikasi pasangan grup mana yang berbeda.

**Formula** (Tukey's Honestly Significant Difference):

$$HSD = q_{\alpha, k, df_w} \cdot \sqrt{\frac{MS_{within}}{n}}$$

di mana $q$ adalah studentized range statistic.

**Multiple Comparison Correction**: Tukey HSD mengontrol family-wise error rate.

### 2.11.6 Effect Size

**A. Cohen's d (untuk perbandingan 2 grup)**

$$d = \frac{\bar{X}_1 - \bar{X}_2}{S_{pooled}}$$

**Interpretasi**:
| d   | Interpretasi  |
| --- | ------------- |
| 0.2 | Small effect  |
| 0.5 | Medium effect |
| 0.8 | Large effect  |

**B. η² (Eta Squared) untuk ANOVA**

$$\eta^2 = \frac{SS_{between}}{SS_{total}}$$

**Interpretasi**:
| η²   | Interpretasi  |
| ---- | ------------- |
| 0.01 | Small effect  |
| 0.06 | Medium effect |
| 0.14 | Large effect  |

**C. ω² (Omega Squared) - Less Biased**

$$\omega^2 = \frac{SS_{between} - (k-1) \cdot MS_{within}}{SS_{total} + MS_{within}}$$

### 2.11.7 Confidence Intervals

**95% Confidence Interval untuk Mean**:

$$CI_{95\%} = \bar{X} \pm t_{\alpha/2, df} \cdot SE$$

$$SE = \frac{S}{\sqrt{n}}$$

**Format Pelaporan**:
> "Faithfulness Full RAG: M = 0.847, 95% CI [0.822, 0.872]"

---

## 2.12 Stack Teknologi

### 2.12.1 Frontend

**Tabel 2.11. Frontend Technology Stack**

| Komponen    | Teknologi            | Versi  | Justifikasi                              |
| ----------- | -------------------- | ------ | ---------------------------------------- |
| Framework   | Next.js              | 15.x   | App Router, Server Components, Streaming |
| UI Library  | React                | 19.x   | Latest features (concurrent rendering)   |
| Styling     | Tailwind CSS         | 4.x    | Utility-first, rapid prototyping         |
| Components  | shadcn/ui            | Latest | Accessible, customizable primitives      |
| State       | Zustand              | 5.x    | Lightweight, no boilerplate              |
| Persistence | Immer + localStorage | -      | Immutable updates, client persistence    |
| Charts      | Recharts             | Latest | Evaluation visualization                 |

### 2.12.2 Backend

**Tabel 2.12. Backend Technology Stack**

| Komponen     | Teknologi              | Versi  | Justifikasi                                 |
| ------------ | ---------------------- | ------ | ------------------------------------------- |
| Runtime      | Bun                    | 1.x    | Fast package manager, TypeScript native     |
| AI SDK       | Vercel AI SDK          | 5.x    | Tool orchestration, streaming, typed errors |
| LLM Provider | Azure OpenAI           | -      | Enterprise SLA, data residency              |
| Chat Model   | GPT-4.1-mini           | -      | Cost-effective reasoning                    |
| Embedding    | text-embedding-3-small | 1536-d | High quality, low cost                      |
| Database     | PostgreSQL             | 15+    | ACID, JSON support, extensions              |
| Vector Ext   | pgvector               | 0.5+   | Native vector similarity search             |
| ORM          | Drizzle ORM            | Latest | Type-safe, zero overhead                    |

### 2.12.3 Database Schema

**Diagram 2.7. Entity Relationship Diagram (ERD)**

```
┌─────────────────────────┐
│       documents         │
├─────────────────────────┤
│ id          UUID (PK)   │
│ title       TEXT        │
│ content     TEXT        │
│ file_type   TEXT        │
│ file_size   INTEGER     │
│ status      TEXT        │
│ created_at  TIMESTAMP   │
│ updated_at  TIMESTAMP   │
│ metadata    JSONB       │
└───────────┬─────────────┘
            │
            │ 1:N
            │
┌───────────▼─────────────┐
│    document_chunks      │
├─────────────────────────┤
│ id           UUID (PK)  │
│ document_id  UUID (FK)  │
│ content      TEXT       │
│ embedding    VECTOR(1536)
│ chunk_index  INTEGER    │
│ metadata     JSONB      │
│ quality_score FLOAT     │
│ created_at   TIMESTAMP  │
└─────────────────────────┘

┌─────────────────────────┐     ┌─────────────────────────┐
│     chat_sessions       │     │   evaluation_sessions   │
├─────────────────────────┤     ├─────────────────────────┤
│ id         UUID (PK)    │     │ id            UUID (PK) │
│ title      TEXT         │     │ name          TEXT      │
│ messages   JSONB        │     │ status        TEXT      │
│ created_at TIMESTAMP    │     │ metrics       JSONB     │
│ updated_at TIMESTAMP    │     │ ablation_results JSONB  │
└─────────────────────────┘     │ created_at    TIMESTAMP │
                                └─────────────────────────┘
```

### 2.12.4 Konfigurasi Hyperparameter

**Tabel 2.13. System Hyperparameters**

| Komponen      | Parameter        | Nilai Default | Justifikasi                       |
| ------------- | ---------------- | ------------- | --------------------------------- |
| **LLM**       | temperature      | 0.7           | Balance creativity vs consistency |
|               | max_tokens       | 2048          | Sufficient for detailed answers   |
| **BM25**      | k₁               | 1.2           | TF saturation (Robertson, 2009)   |
|               | b                | 0.75          | Length normalization              |
|               | δ (BM25+)        | 1             | Lower-bound modification          |
| **RRF**       | k                | 60            | Smoothing constant                |
|               | α (vector)       | 0.6           | Semantic emphasis                 |
|               | β (BM25)         | 0.4           | Keyword balance                   |
| **Retrieval** | topK             | 10            | Final results                     |
|               | candidateK       | 30            | 3× oversampling                   |
| **Chunking**  | threshold        | 0.5           | Semantic similarity cutoff        |
|               | minSize          | 100 tokens    | Avoid fragmentation               |
|               | maxSize          | 600 tokens    | Context length                    |
| **Agentic**   | maxSteps         | 5             | Depth vs latency                  |
| **Reranker**  | rerankerTopK     | 5             | Final refined results             |
|               | rerankerMinScore | 0.3           | Quality threshold                 |

---

## 2.13 Limitasi Penelitian

### 2.13.1 Limitasi Metodologis

**L1: LLM-as-a-Judge Self-Preference Bias**
- **Deskripsi**: Menggunakan GPT-4.1-mini untuk generasi dan evaluasi dapat menyebabkan bias
- **Dampak**: Potential overestimation skor untuk output yang mirip dengan preference model
- **Mitigasi**: Fokus pada **relative comparison** antar konfigurasi, bukan absolute values

**L2: Dataset Size**
- **Deskripsi**: Knowledge base terbatas (~500K tokens, 50-100 dokumen)
- **Dampak**: Mungkin tidak representative untuk corpus sangat besar
- **Mitigasi**: Corpus representative untuk domain target; scalability tested up to 500K

**L3: Test Questions Sample**
- **Deskripsi**: 40 test questions (n=40 per configuration)
- **Dampak**: Sufficient untuk statistical significance (n>30) tapi limited diversity
- **Mitigasi**: Questions di-design dengan expert judgment; cover 5 categories

### 2.13.2 Limitasi Teknis

**L4: Latency Trade-off**
- **Deskripsi**: Agentic mode significantly slower (~340% latency increase)
- **Dampak**: May not suitable untuk real-time applications dengan strict latency requirements
- **Mitigasi**: Documented trade-off; fallback to non-agentic untuk simple queries

**L5: Local IDF Approximation**
- **Deskripsi**: BM25 IDF dihitung dari candidate pool (30 chunks), bukan global corpus
- **Dampak**: May differ from theoretical optimal Global IDF
- **Mitigasi**: Empirically validated; vector search pre-filters to semantic neighborhood

**L6: Single LLM Provider**
- **Deskripsi**: Dependency pada Azure OpenAI (GPT-4.1-mini)
- **Dampak**: Results may not generalize ke provider lain (Anthropic, Google)
- **Mitigasi**: Architecture agnostic; dapat swap model dengan minimal code change

### 2.13.3 Limitasi Generalisasi

**L7: Domain Specificity**
- **Deskripsi**: Fokus pada domain akademik Indonesia
- **Dampak**: Transfer ke domain lain (medical, legal) memerlukan validasi
- **Mitigasi**: Architecture documented; domain-specific logic isolated in `university-domain.ts`

**L8: Language Specificity**
- **Deskripsi**: Optimized untuk bilingual Indonesia-English
- **Dampak**: Performa mungkin berbeda untuk bahasa lain
- **Mitigasi**: Language detection dan stemming modular; dapat di-extend

---

## 2.14 Etika Penelitian

### 2.14.1 Data Privacy

- Dokumen akademik adalah dokumen publik/internal tanpa PII mahasiswa individual
- Tidak ada data personal yang dikumpulkan selama evaluasi
- PII guardrails aktif untuk mencegah leak data sensitif

### 2.14.2 Transparency

- Kode sumber akan di-open source
- Dokumentasi lengkap disediakan untuk replikasi
- Semua konfigurasi dan parameter didokumentasikan

### 2.14.3 Responsible AI

- Guardrails untuk content safety (toxicity, harmful content)
- Hallucination mitigation melalui grounding dan verification
- Citation requirements untuk setiap klaim

---

**Referensi Metode ini merujuk pada daftar pustaka di bagian akhir paper.**

**Lanjutan**: Hasil (Results) dan Pembahasan (Discussion) akan disajikan pada bagian berikutnya setelah data evaluasi dikumpulkan.
