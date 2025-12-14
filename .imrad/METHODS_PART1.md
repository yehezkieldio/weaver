# METODE PENELITIAN (METHODS) - BAGIAN 1
# Desain Penelitian dan Arsitektur Sistem

---

## 2.1 Pendekatan dan Jenis Penelitian

Penelitian ini menggunakan pendekatan **Research and Development (R&D)** yang berfokus pada pengembangan produk teknologi baru melalui siklus iteratif: analisis kebutuhan, perancangan, implementasi, pengujian, dan evaluasi. Pendekatan R&D dipilih karena tujuan penelitian adalah menghasilkan artefak fungsional (sistem Agentic RAG) yang dapat diterapkan dalam konteks nyata (layanan akademik perguruan tinggi).

Dalam kerangka R&D, penelitian ini mengadopsi model pengembangan **Rapid Application Development (RAD)** (Martin, 1991) yang menekankan:
1. **Iterasi Cepat**: Siklus pengembangan pendek (4 minggu) dengan deliverables fungsional di setiap iterasi
2. **Prototipe Fungsional**: Setiap fase menghasilkan prototipe yang dapat diuji dan dievaluasi
3. **Feedback Loop Pendek**: Hasil evaluasi segera diintegrasikan ke iterasi berikutnya

Jenis penelitian ini termasuk **Penelitian Eksperimental Terapan** dengan karakteristik:
- **Manipulasi Variabel**: Konfigurasi sistem (retrieval strategy, reranking method, chunking strategy, agent mode) dimanipulasi secara sistematis
- **Pengukuran Outcome**: Metrik evaluasi (Faithfulness, Answer Relevancy, Precision, Recall) diukur untuk setiap konfigurasi
- **Kontrol Variabel Pengganggu**: Ablation study mengisolasi kontribusi setiap komponen

---

## 2.2 Lokasi dan Waktu Penelitian

**Lokasi**: Universitas Mulia, Balikpapan, Kalimantan Timur, Indonesia

**Waktu Pelaksanaan**: 4 minggu (28 hari) dengan breakdown sebagai berikut:

| Minggu | Hari  | Aktivitas                    | Deliverable                                              |
| ------ | ----- | ---------------------------- | -------------------------------------------------------- |
| **1**  | 1-7   | Foundation & Core RAG        | Database schema, document ingestion, basic RAG, chat UI  |
| **2**  | 8-14  | Advanced Retrieval & Agentic | Hybrid retrieval (BM25+RRF), reranking, agentic workflow |
| **3**  | 15-21 | Optimization & Safety        | Semantic chunking, guardrails, domain tuning             |
| **4**  | 22-28 | Evaluation & Analysis        | RAGAS framework, ablation study, statistical analysis    |

---

## 2.3 Subjek dan Objek Penelitian

### 2.3.1 Subjek Penelitian

**Knowledge Base (Corpus)**:
- **Sumber**: Dokumen akademik resmi Universitas Mulia
- **Jenis Dokumen**: Panduan akademik, regulasi, silabus, SOP administratif, panduan penulisan skripsi
- **Format**: PDF, TXT, Markdown (MD)
- **Jumlah Dokumen**: 50-100 dokumen
- **Total Token**: ~500.000 tokens (estimasi)
- **Bahasa**: Bilingual Indonesia-Inggris (mayoritas Indonesia)

**Test Questions Dataset**:
- **Jumlah**: 40 pertanyaan (memenuhi n > 30 untuk signifikansi statistik)
- **Sumber**: Dikembangkan berdasarkan FAQ mahasiswa dan expert judgment dari staf akademik
- **Karakteristik**: Tabel 2.1

**Tabel 2.1. Karakteristik Test Questions Dataset**

| Kategori               | Jumlah | Persentase | Contoh Pertanyaan                                      |
| ---------------------- | ------ | ---------- | ------------------------------------------------------ |
| `academic_process`     | 8      | 20%        | "Bagaimana prosedur pengisian KRS?"                    |
| `research_methodology` | 10     | 25%        | "Apa perbedaan metodologi kuantitatif dan kualitatif?" |
| `academic_writing`     | 8      | 20%        | "Bagaimana cara menulis sitasi APA?"                   |
| `university_policy`    | 8      | 20%        | "Apa persyaratan untuk pengajuan cuti akademik?"       |
| `general_academic`     | 6      | 15%        | "Apa itu SKS?"                                         |
| **Total**              | **40** | **100%**   | -                                                      |

**Distribusi Kompleksitas**:
| Kompleksitas | Jumlah | Persentase | Karakteristik                                        |
| ------------ | ------ | ---------- | ---------------------------------------------------- |
| Simple       | 16     | 40%        | Single-fact lookup, jawaban langsung dari satu chunk |
| Medium       | 16     | 40%        | Multi-fact, memerlukan sintesis dari 2-3 chunk       |
| Complex      | 8      | 20%        | Multi-step reasoning, memerlukan dekomposisi query   |

### 2.3.2 Objek Penelitian

Objek penelitian adalah **sistem Agentic RAG** dengan variabel-variabel berikut:

**Variabel Independen (Faktor yang Dimanipulasi)**:
1. **Retrieval Strategy**: Non-RAG, Vector-only, BM25-only, Hybrid
2. **Reranking Method**: None, Cross-Encoder, LLM Listwise, Ensemble
3. **Chunking Strategy**: Fixed, Recursive, Semantic, Sentence-window
4. **Agent Configuration**: Single-step, Multi-step (Agentic)
5. **Guardrails**: On/Off

**Variabel Dependen (Outcome yang Diukur)**:
1. **Faithfulness** (0-1): Proporsi klaim yang didukung konteks
2. **Answer Relevancy** (0-1): Relevansi jawaban terhadap pertanyaan
3. **Context Precision** (0-1): Presisi dokumen yang diambil
4. **Context Recall** (0-1): Recall dokumen relevan
5. **Precision@K** (0-1): Presisi pada K dokumen teratas
6. **Recall@K** (0-1): Recall pada K dokumen teratas
7. **NDCG** (0-1): Normalized Discounted Cumulative Gain
8. **MRR** (0-1): Mean Reciprocal Rank
9. **Hallucination Rate** (0-1): Proporsi klaim tanpa supporting evidence
10. **Total Latency** (ms): Waktu respons end-to-end
11. **Latency Breakdown** (ms): Per-phase latency (retrieval, reranking, generation, agent)

---

## 2.4 Arsitektur Sistem

Sistem mengimplementasikan arsitektur **4-layer pipeline** yang dirancang untuk mengatasi keterbatasan RAG konvensional. Diagram 2.1 mengilustrasikan arsitektur keseluruhan.

### Diagram 2.1. Arsitektur Sistem 4-Layer Agentic RAG

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE LAYER                                │
│  ┌─────────────────┐  ┌─────────────────────┐  ┌───────────────────────────┐    │
│  │  Chat Interface │  │ Knowledge Base Mgmt │  │   Evaluation Dashboard   │    │
│  │      (/)        │  │     (/manage)       │  │      (/evaluation)       │    │
│  └────────┬────────┘  └──────────┬──────────┘  └─────────────┬─────────────┘    │
└───────────┼─────────────────────┼────────────────────────────┼──────────────────┘
            │                     │                            │
            ▼                     ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER (Next.js 15)                              │
│  ┌─────────────────┐  ┌─────────────────────┐  ┌───────────────────────────┐    │
│  │   /api/chat     │  │  /api/documents/*   │  │     /api/evaluation/*     │    │
│  │  (streamText)   │  │  (Upload/Process)   │  │   (Metrics/Ablation)      │    │
│  └────────┬────────┘  └──────────┬──────────┘  └─────────────┬─────────────┘    │
└───────────┼─────────────────────┼────────────────────────────┼──────────────────┘
            │                     │                            │
            ▼                     ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         RAG PIPELINE (Core Engine)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 1: DOMAIN-AWARE INGESTION                                          │   │
│  │ ┌────────────────┐ ┌─────────────────┐ ┌──────────────┐ ┌─────────────┐  │   │
│  │ │ Document Parse │→│ Semantic Chunk  │→│ Lang Detect  │→│   Embed     │  │   │
│  │ │ (PDF/TXT/MD)   │ │ (threshold=0.5) │ │ (ID/EN)      │ │ (1536-d)    │  │   │
│  │ └────────────────┘ └─────────────────┘ └──────────────┘ └─────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                     ↓                                            │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 2: HYBRID RETRIEVAL (Vector-First + Local BM25 + RRF)              │   │
│  │ ┌──────────────────┐ ┌─────────────────┐ ┌───────────────────────────┐   │   │
│  │ │ pgvector Search  │→│ In-Memory BM25  │→│ Reciprocal Rank Fusion    │   │   │
│  │ │ Top-30 Candidates│ │ (k₁=1.2, b=0.75)│ │ (k=60, α=0.6, β=0.4)      │   │   │
│  │ └──────────────────┘ └─────────────────┘ └───────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                     ↓                                            │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 3: NEURAL RERANKING                                                │   │
│  │ ┌──────────────────┐ ┌─────────────────┐ ┌───────────────────────────┐   │   │
│  │ │  Cross-Encoder   │ │  LLM Listwise   │ │      Ensemble             │   │   │
│  │ │ (TinyBERT-L-2)   │ │ (GPT-4.1-mini)  │ │ (α=0.6, β=0.4)            │   │   │
│  │ └──────────────────┘ └─────────────────┘ └───────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                     ↓                                            │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 4: AGENTIC ORCHESTRATION & GUARDRAILS                              │   │
│  │ ┌─────────────┐ ┌─────────────────┐ ┌──────────────┐ ┌────────────────┐  │   │
│  │ │   Tools     │ │  ReAct Agent    │ │   Input      │ │    Output      │  │   │
│  │ │ search,     │ │  (max 5 steps)  │ │ Guardrails   │ │  Guardrails    │  │   │
│  │ │ decompose,  │ │  (AI SDK 5.x)   │ │ (PII, Inject)│ │ (Halluc, Cite) │  │   │
│  │ │ verify      │ │                 │ │              │ │                │  │   │
│  │ └─────────────┘ └─────────────────┘ └──────────────┘ └────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────┬───────────────────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER (PostgreSQL + pgvector)                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │  documents   │  │ document_chunks  │  │ chat_sessions │  │ eval_sessions  │  │
│  │  (metadata)  │  │ (content+embed)  │  │  (history)    │  │  (metrics)     │  │
│  └──────────────┘  └──────────────────┘  └───────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2.5 Layer 1: Domain-Aware Ingestion

### 2.5.1 Document Parsing

Sistem mendukung tiga format dokumen utama dengan parser spesifik:

| Format       | Library/Method                         | Kapabilitas                                 |
| ------------ | -------------------------------------- | ------------------------------------------- |
| **PDF**      | `pdf-parse` + OCR fallback             | Ekstraksi teks, OCR untuk scanned documents |
| **TXT**      | Native parsing + ASCII report detector | Plain text, structured ASCII tables         |
| **Markdown** | `marked` parser                        | Headers, lists, code blocks                 |

**ASCII Report Parser**: Untuk file `.txt` yang mengandung tabel ASCII terstruktur, sistem mendeteksi dan mengkonversi ke format natural language sentences untuk menghindari token wastage.

### 2.5.2 Semantic Chunking

Berbeda dengan fixed-size chunking yang memotong dokumen setiap N tokens, semantic chunking mempertahankan koherensi topik dalam setiap chunk.

**Algoritma Semantic Chunking**:

```
Input: Document D = [S₁, S₂, ..., Sₙ] (sequence of sentences)
Output: Chunks C = [C₁, C₂, ..., Cₘ]

1. Embed each sentence: E = [embed(S₁), embed(S₂), ..., embed(Sₙ)]
2. Initialize: current_chunk = [S₁], chunks = []
3. For i = 2 to n:
   a. similarity = cosine(E[i-1], E[i])
   b. If similarity < THRESHOLD (0.5):
      - Append current_chunk to chunks
      - current_chunk = [Sᵢ]
   c. Else:
      - Append Sᵢ to current_chunk
4. Enforce min/max size constraints (100-600 tokens)
5. Return chunks
```

**Diagram 2.2. Flowchart Semantic Chunking**

```
┌─────────────┐
│  Document   │
└──────┬──────┘
       ▼
┌─────────────────────┐
│  Sentence Split     │
│  (NLTK/SpaCy)       │
└──────┬──────────────┘
       ▼
┌─────────────────────┐
│  Embed Each Sentence│
│  (text-embedding-   │
│   3-small, 1536-d)  │
└──────┬──────────────┘
       ▼
┌─────────────────────┐
│ Calculate Similarity│
│ sim(Sᵢ₋₁, Sᵢ)       │
└──────┬──────────────┘
       ▼
   ┌───────────┐
   │ sim < 0.5?│
   └─────┬─────┘
    YES  │  NO
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌─────────────┐
│New     │ │Add to       │
│Chunk   │ │Current Chunk│
└───┬────┘ └──────┬──────┘
    │             │
    └──────┬──────┘
           ▼
┌─────────────────────┐
│ Enforce Size        │
│ (100-600 tokens)    │
└──────┬──────────────┘
       ▼
┌─────────────────────┐
│  Output Chunks      │
└─────────────────────┘
```

**Justifikasi Threshold = 0.5**:
- Threshold < 0.3: Terlalu sensitif, menghasilkan chunks terlalu kecil
- Threshold > 0.7: Terlalu lenient, chunks berisi topik heterogen
- Threshold = 0.5: Balance optimal berdasarkan empirical testing (Kamradt, 2024)

### 2.5.3 Language Detection

Sistem mendeteksi bahasa pada level chunk untuk penanganan yang tepat (stemming, stopwords).

**Algoritma Language Detection**:
```python
def detect_language(text: str) -> "en" | "id":
    indonesian_patterns = [
        r'\b(ber|meng|di|ter|ke|se)[a-z]+',  # Prefixes
        r'\b[a-z]+(kan|an|i)\b',               # Suffixes
        r'\b(yang|dan|atau|dengan|untuk|dari)\b'  # Common words
    ]

    id_matches = sum(len(re.findall(p, text)) for p in indonesian_patterns)
    en_ratio = len(re.findall(r'\b(the|is|are|was|were|have|has)\b', text))

    return "id" if id_matches > en_ratio else "en"
```

### 2.5.4 Embedding Generation

**Model**: `text-embedding-3-small` (Azure OpenAI)
**Dimensi**: 1536
**Batch Size**: 100 chunks per API call (untuk efisiensi)

Embedding disimpan di kolom `embedding` tabel `document_chunks` dengan tipe `vector(1536)` (pgvector extension).

---

## 2.6 Layer 2: Hybrid Retrieval

### 2.6.1 Strategi Vector-First Candidate Generation

Arsitektur retrieval menggunakan strategi **Vector-First**:
1. **Vector Search (High Recall)**: pgvector menghasilkan candidate pool 3×K (30 chunks untuk K=10)
2. **BM25 Scoring (High Precision)**: In-memory BM25 melakukan keyword scoring pada candidates
3. **RRF Fusion**: Menggabungkan kedua rankings menjadi unified ranking

**Diagram 2.3. Hybrid Retrieval Pipeline**

```
                          Query
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
    ┌───────────────┐               ┌───────────────┐
    │ Embed Query   │               │ Tokenize &    │
    │ (1536-d vec)  │               │ Stem Query    │
    └───────┬───────┘               └───────┬───────┘
            │                               │
            ▼                               │
    ┌───────────────┐                       │
    │ pgvector      │                       │
    │ Cosine Search │                       │
    │ ORDER BY <=>  │                       │
    │ LIMIT 30      │                       │
    └───────┬───────┘                       │
            │                               │
            ▼                               ▼
    ┌───────────────────────────────────────────┐
    │         Candidate Pool (30 chunks)         │
    └───────────────────┬───────────────────────┘
                        │
                        ▼
    ┌───────────────────────────────────────────┐
    │         In-Memory Okapi BM25               │
    │     Calculate BM25 score per chunk         │
    │     using Local IDF (on 30 candidates)     │
    └───────────────────┬───────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
┌───────────────┐               ┌───────────────┐
│ Vector Ranking│               │ BM25 Ranking  │
│ (by cos sim)  │               │ (by BM25 score│
└───────┬───────┘               └───────┬───────┘
        │                               │
        └───────────────┬───────────────┘
                        ▼
    ┌───────────────────────────────────────────┐
    │     Reciprocal Rank Fusion (RRF)           │
    │     RRF(d) = α/(k+r_vec) + β/(k+r_bm25)    │
    │     k=60, α=0.6, β=0.4                     │
    └───────────────────┬───────────────────────┘
                        │
                        ▼
    ┌───────────────────────────────────────────┐
    │           Top-K Results (K=10)             │
    └───────────────────────────────────────────┘
```

### 2.6.2 Vector Search dengan pgvector

**SQL Query**:
```sql
SELECT
    chunk_id,
    document_id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as cosine_similarity
FROM document_chunks
WHERE embedding IS NOT NULL
ORDER BY embedding <=> query_embedding
LIMIT 30;  -- Oversample 3×K
```

**Operator `<=>`**: Cosine distance (1 - cosine similarity). Semakin kecil distance, semakin relevan.

**Index**: HNSW (Hierarchical Navigable Small World) untuk approximate nearest neighbor search dengan kompleksitas O(log n).

### 2.6.3 Okapi BM25 In-Memory

**Formula BM25**:

$$BM25(D, Q) = \sum_{i=1}^{n} IDF(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{avgdl}\right)}$$

**IDF (Inverse Document Frequency)**:

$$IDF(q_i) = \ln\left(\frac{N - n(q_i) + 0.5}{n(q_i) + 0.5} + 1\right)$$

**BM25+ Modification** (Lv & Zhai, 2011):

$$BM25^+(D, Q) = \sum_{i=1}^{n} IDF(q_i) \cdot \left[\frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{avgdl}\right)} + \delta\right]$$

**Tabel 2.2. Parameter BM25**

| Parameter | Nilai | Justifikasi                                                                  |
| --------- | ----- | ---------------------------------------------------------------------------- |
| k₁        | 1.2   | Term frequency saturation untuk dokumen panjang (Robertson & Zaragoza, 2009) |
| b         | 0.75  | Length normalization standar                                                 |
| δ         | 1     | BM25+ lower-bound modification                                               |

**Local IDF Approach**:
Berbeda dengan implementasi BM25 tradisional yang menghitung IDF dari **entire corpus** (memerlukan inverted index), kami menghitung IDF dari **candidate pool** (30 chunks hasil vector search). Justifikasi:

1. **Reduced Computational Overhead**: Tidak perlu maintain global inverted index
2. **Semantic Neighborhood**: Vector search sudah mendefinisikan "lingkungan semantik" yang relevan; BM25 berfungsi sebagai discriminator dalam neighborhood tersebut
3. **Adaptive IDF**: IDF berubah sesuai konteks query (different queries have different candidate pools)

**Implementasi TypeScript**:
```typescript
function calculateOkapiBM25(
    queryTerms: string[],
    docTerms: string[],
    avgDocLength: number,
    docFrequencies: Map<string, number>,
    totalDocs: number,
    queryTermFreqs: Map<string, number>
): number {
    const docLength = docTerms.length;
    let score = 0;

    for (const term of queryTerms) {
        const tf = docTerms.filter(t => t === term).length;
        if (tf === 0) continue;

        const df = docFrequencies.get(term) || 0;
        const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);

        const numerator = tf * (BM25_K1 + 1);
        const denominator = tf + BM25_K1 * (1 - BM25_B + BM25_B * docLength / avgDocLength);

        score += idf * (numerator / denominator + BM25_DELTA);
    }

    return score;
}
```

### 2.6.4 Reciprocal Rank Fusion (RRF)

**Formula RRF**:

$$RRF(d) = \sum_{r \in R} \frac{1}{k + r(d)}$$

di mana:
- $R$ = set of rankings (Vector ranking, BM25 ranking)
- $r(d)$ = rank of document $d$ in ranking $r$
- $k$ = smoothing constant (default: 60)

**Weighted RRF**:

$$RRF_{weighted}(d) = \alpha \cdot \frac{1}{k + r_{vector}(d)} + \beta \cdot \frac{1}{k + r_{BM25}(d)}$$

**Tabel 2.3. Parameter RRF**

| Parameter        | Nilai | Justifikasi                                       |
| ---------------- | ----- | ------------------------------------------------- |
| k                | 60    | Smoothing constant standar (Cormack et al., 2009) |
| α (vectorWeight) | 0.6   | Prioritize semantic understanding                 |
| β (bm25Weight)   | 0.4   | Balance keyword precision                         |

**Keunggulan RRF**:
1. **Parameter-Free**: Hanya memerlukan konstanta k
2. **Rank-Based**: Tidak memerlukan normalization skor (berbeda heterogeneous scores)
3. **Proven Effectiveness**: Sering mengungguli metode fusion kompleks (Cormack et al., 2009)

**Implementasi**:
```typescript
function reciprocalRankFusion(
    rankings: { id: string; rank: number }[][],
    k = 60
): Map<string, number> {
    const fusedScores = new Map<string, number>();

    for (const ranking of rankings) {
        for (const { id, rank } of ranking) {
            const current = fusedScores.get(id) || 0;
            fusedScores.set(id, current + 1 / (k + rank));
        }
    }

    return fusedScores;
}
```

---

## 2.7 Layer 3: Neural Reranking

Setelah RRF fusion, hasil di-rerank menggunakan neural models untuk meningkatkan presisi.

### 2.7.1 Cross-Encoder Reranking

**Model**: `ms-marco-TinyBERT-L-2-v2`
**Approach**: Pointwise scoring—setiap pasangan (query, document) di-score independently.

**Keunggulan Cross-Encoder vs Bi-Encoder**:
- **Bi-Encoder**: Encode query dan document secara terpisah, lalu hitung similarity. Fast (precomputed doc embeddings) tapi less accurate.
- **Cross-Encoder**: Encode [query, document] bersama dengan cross-attention. Lebih akurat tapi computationally expensive.

**Trade-off**: Cross-encoder hanya digunakan untuk reranking (10-30 candidates), bukan full corpus search.

### 2.7.2 LLM Listwise Reranking

**Model**: `GPT-4.1-mini` (Azure OpenAI)
**Approach**: Listwise ranking—LLM menerima list dokumen dan menghasilkan ranking lengkap dengan reasoning.

**Prompt Template**:
```
Anda akan diberikan sebuah query dan daftar dokumen.
Berikan ranking dokumen berdasarkan relevansi dengan query.

Query: {query}

Documents:
1. {doc_1}
2. {doc_2}
...
10. {doc_10}

Output format (JSON):
{
  "ranking": [3, 1, 5, 2, ...],  // Document indices by relevance
  "reasoning": "Dokumen 3 paling relevan karena..."
}
```

**Keunggulan LLM Listwise**:
1. **Global Context**: LLM melihat semua dokumen sekaligus, memahami relative relevance
2. **Explainability**: Reasoning disertakan untuk transparency
3. **Zero-shot**: Tidak perlu fine-tuning untuk domain baru

### 2.7.3 Ensemble Reranking

Menggabungkan cross-encoder dan LLM scores:

$$score_{ensemble}(d) = \alpha_{cross} \cdot score_{cross}(d) + \alpha_{llm} \cdot score_{llm}(d)$$

**Parameter**:
- $\alpha_{cross}$ = 0.6 (cross-encoder weight)
- $\alpha_{llm}$ = 0.4 (LLM weight)

**Justifikasi**:
- Cross-encoder memberikan signal kuat untuk lexical/semantic relevance
- LLM memberikan signal untuk reasoning-based relevance
- Ensemble mengurangi variance dan meningkatkan robustness

---

## 2.8 Layer 4: Agentic Orchestration & Guardrails

### 2.8.1 Agentic Workflow dengan ReAct Pattern

Sistem mengimplementasikan **ReAct (Reason + Act)** pattern (Yao et al., 2023) menggunakan Vercel AI SDK 5.x.

**Komponen Agent**:
1. **LLM Core**: GPT-4.1-mini sebagai reasoning engine
2. **Tools**: Fungsi eksternal yang dapat dipanggil agent
3. **Memory**: Conversation history dan retrieved context
4. **Stopping Condition**: `stepCountIs(5)` - maksimal 5 reasoning steps

**Tools yang Diimplementasikan**:

**Tabel 2.4. Agent Tools**

| Tool                | Schema                                                                     | Fungsi                                            |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| `search_documents`  | `{ query: string, strategy: "vector"\|"keyword"\|"hybrid", topK: number }` | Melakukan hybrid retrieval                        |
| `expand_query`      | `{ query: string }`                                                        | Ekspansi query dengan sinonim akademik (ID/EN)    |
| `decompose_query`   | `{ query: string, maxSubQuestions: number }`                               | Dekomposisi query kompleks menjadi sub-questions  |
| `verify_claim`      | `{ claim: string, context: string }`                                       | Verifikasi klaim terhadap context menggunakan NLI |
| `synthesize_answer` | `{ question: string, sources: Source[] }`                                  | Sintesis jawaban dengan citation                  |

**Diagram 2.4. ReAct Agent Flow**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER QUERY                                    │
│  "Bandingkan metodologi kuantitatif dan kualitatif untuk skripsi"   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: THOUGHT                                                      │
│ "Query ini memerlukan perbandingan dua metodologi. Saya perlu       │
│  mendekomposisi menjadi sub-questions."                             │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: ACTION                                                       │
│ Tool: decompose_query                                                │
│ Input: { query: "Bandingkan...", maxSubQuestions: 3 }               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: OBSERVATION                                                  │
│ SubQuestions: [                                                      │
│   "Apa karakteristik metodologi kuantitatif?",                      │
│   "Apa karakteristik metodologi kualitatif?",                       │
│   "Kapan sebaiknya menggunakan masing-masing?"                      │
│ ]                                                                    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: THOUGHT                                                      │
│ "Saya akan melakukan parallel search untuk ketiga sub-questions."   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: ACTIONS (Parallel)                                           │
│ Tool: search_documents × 3                                           │
│ Inputs: [                                                            │
│   { query: "karakteristik metodologi kuantitatif", ... },           │
│   { query: "karakteristik metodologi kualitatif", ... },            │
│   { query: "pemilihan metodologi penelitian", ... }                 │
│ ]                                                                    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: OBSERVATIONS                                                 │
│ Retrieved chunks for each sub-question                              │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: THOUGHT                                                      │
│ "Saya sudah memiliki informasi lengkap. Synthesize jawaban."        │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: ACTION                                                       │
│ Tool: synthesize_answer                                              │
│ Input: { question: "Bandingkan...", sources: [...] }                │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FINAL ANSWER                                    │
│ "Metodologi kuantitatif berfokus pada pengukuran numerik... [1]     │
│  Sementara metodologi kualitatif menekankan pemahaman... [2]        │
│  Untuk skripsi Anda, pertimbangkan... [3]"                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.8.2 Input Guardrails

Sistem menerapkan validasi input sebelum processing:

**Tabel 2.5. Input Guardrails**

| Guardrail            | Deteksi                                          | Aksi                       |
| -------------------- | ------------------------------------------------ | -------------------------- |
| **PII Detection**    | NIK, SSN, Credit Card, Email, Phone              | Block & warning            |
| **Prompt Injection** | "Ignore previous instructions", "You are now..." | Block & warning            |
| **Toxicity**         | Hate speech, profanity, harmful content          | Block & warning            |
| **Off-Topic**        | Non-academic queries                             | Redirect to academic scope |

### 2.8.3 Output Guardrails

Validasi output sebelum delivery ke user:

**Tabel 2.6. Output Guardrails**

| Guardrail                 | Metode                                   | Aksi                    |
| ------------------------- | ---------------------------------------- | ----------------------- |
| **Hallucination Check**   | Verify claims vs retrieved context (NLI) | Self-correction loop    |
| **Citation Verification** | Check citation references exist          | Add missing citations   |
| **Negative Reaction**     | Sentiment analysis pada user messages    | Escalation trigger      |
| **Language Consistency**  | Detect language mismatch                 | Force Indonesian output |

---

**Lanjutan di METHODS_PART2.md**: Protokol Evaluasi, Ablation Study, Analisis Statistik, Stack Teknologi, dan Limitasi Penelitian.
