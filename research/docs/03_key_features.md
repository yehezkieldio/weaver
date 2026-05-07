# Fitur-Fitur Utama

## 1. Pendahuluan

Dokumen ini menjelaskan fitur-fitur utama Weaver secara komprehensif. Setiap fitur dijelaskan dalam konteks fungsionalitas, relevansi terhadap tujuan penelitian, dan detail implementasi teknis.

---

## 2. Hybrid Retrieval System

### 2.1 Deskripsi Fitur

Hybrid Retrieval mengkombinasikan dua paradigma pencarian yang saling melengkapi:
1. **Vector Search**: Pencarian berbasis kemiripan semantik menggunakan embedding
2. **BM25 Keyword Search**: Pencarian berbasis term frequency dengan normalisasi dokumen

### 2.2 Relevansi Penelitian

| Aspek               | Relevansi                                                                 |
| ------------------- | ------------------------------------------------------------------------- |
| **RQ1**             | Menjawab pertanyaan efektivitas hybrid vs single-method                   |
| **Gap**             | Mengatasi "semantic gap" di mana vector search gagal untuk term spesifik  |
| **Academic Domain** | Terminologi akademik (NIM, SKS) memerlukan exact match yang BM25 sediakan |

### 2.3 Implementasi Teknis

**Lokasi**: `src/lib/rag/hybrid-retrieval.ts`

#### 2.3.1 Vector Search
```typescript
// Embedding generation menggunakan text-embedding-3-small (1536 dimensi)
const queryEmbedding = await generateEmbedding(query);

// Similarity search dengan pgvector
SELECT *, 1 - (embedding <=> $1) as similarity
FROM document_chunks
ORDER BY embedding <=> $1
LIMIT $2
```

#### 2.3.2 BM25 Scoring

Formula Okapi BM25+:

$$BM25+(D, Q) = \sum_{i=1}^{n} IDF(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot (1 - b + b \cdot \frac{|D|}{avgdl})} + \delta$$

Di mana:
- $k_1 = 1.2$ (saturation parameter)
- $b = 0.75$ (length normalization)
- $\delta = 1$ (delta untuk BM25+)

#### 2.3.3 Reciprocal Rank Fusion (RRF)

$$RRF(d) = \sum_{r \in R} \frac{1}{k + rank_r(d)}$$

Di mana $k = 60$ adalah konstanta RRF.

**Konfigurasi Default**:
```typescript
const DEFAULT_OPTIONS = {
    topK: 10,
    minScore: 0.01,
    vectorWeight: 0.6,
    bm25Weight: 0.4,
    qualityWeight: 0.15,
    strategy: "hybrid",
    rrfK: 60,
};
```

---

## 3. Agentic RAG Mode

### 3.1 Deskripsi Fitur

Agentic RAG memungkinkan sistem untuk melakukan reasoning multi-langkah dengan kemampuan:
- Merencanakan strategi jawaban
- Mendekomposisi query kompleks
- Menggunakan tools secara paralel
- Memverifikasi klaim sebelum sintesis

### 3.2 Relevansi Penelitian

| Aspek               | Relevansi                                                    |
| ------------------- | ------------------------------------------------------------ |
| **RQ2**             | Mengevaluasi benefit agentic approach untuk query kompleks   |
| **H4**              | Menguji hipotesis peningkatan kualitas dengan agentic mode   |
| **Complex Queries** | Pertanyaan akademik seringkali memerlukan multiple retrieval |

### 3.3 Implementasi Teknis

**Lokasi**: `src/lib/rag/agentic-rag.ts`

#### 3.3.1 Available Tools

| Tool                | Fungsi                            | Use Case                            |
| ------------------- | --------------------------------- | ----------------------------------- |
| `search_documents`  | Hybrid retrieval dengan query     | Mencari informasi di knowledge base |
| `expand_query`      | Query expansion dengan sinonim    | Meningkatkan recall                 |
| `decompose_query`   | Dekomposisi menjadi sub-questions | Query kompleks                      |
| `verify_claim`      | NLI-based claim verification      | Validasi sebelum output             |
| `synthesize_answer` | Sintesis dari multiple sources    | Jawaban komprehensif                |

#### 3.3.2 Workflow Execution

```
1. Query Analysis
   └── Determine complexity
   └── Plan tool usage

2. Parallel Tool Execution
   ├── search_documents (query_1)
   ├── search_documents (query_2)
   └── expand_query (original)

3. Context Aggregation
   └── Deduplicate results
   └── Citation management

4. Answer Synthesis
   └── Synthesize from all sources
   └── Enforce Indonesian language

5. Verification
   └── verify_claim (critical facts)
   └── Guardrails check
```

#### 3.3.3 Citation Manager

```typescript
class CitationManager {
    private citations = new Map<string, number>();
    private nextId = 1;

    assignCitation(chunkId: string): number {
        if (!this.citations.has(chunkId)) {
            this.citations.set(chunkId, this.nextId++);
        }
        return this.citations.get(chunkId)!;
    }
}
```

---

## 4. Multi-Strategy Reranking

### 4.1 Deskripsi Fitur

Reranking mengurutkan ulang hasil retrieval untuk meningkatkan precision. Sistem menyediakan multiple strategi dengan trade-off berbeda.

### 4.2 Relevansi Penelitian

| Aspek        | Relevansi                                            |
| ------------ | ---------------------------------------------------- |
| **RQ3**      | Identifikasi strategi reranking optimal              |
| **H3**       | Menguji peningkatan precision tanpa degradasi recall |
| **Ablation** | Komponen kritis untuk ablation study                 |

### 4.3 Implementasi Teknis

**Lokasi**: `src/lib/rag/reranker.ts`

#### 4.3.1 Strategi Tersedia

| Strategi        | Model                                      | Latency | Akurasi  |
| --------------- | ------------------------------------------ | ------- | -------- |
| `cross_encoder` | TinyBERT (Xenova/ms-marco-TinyBERT-L-2-v2) | ~100ms  | 80-85%   |
| `llm`           | GPT-4o-mini (pointwise)                    | ~3-5s   | 90-95%   |
| `llm_listwise`  | GPT-4o-mini (listwise)                     | ~2-3s   | 88-92%   |
| `cohere`        | Pairwise comparison                        | ~1-2s   | 85-90%   |
| `ensemble`      | Weighted fusion                            | ~3-5s   | 92-95%   |
| `none`          | Skip reranking                             | 0ms     | baseline |

#### 4.3.2 Ensemble Fusion

```typescript
// Default ensemble weights
const ensembleWeights = {
    crossEncoder: 0.4,
    llm: 0.4,
    original: 0.2,
};

// Fusion formula
finalScore =
    weights.crossEncoder * crossEncoderScore +
    weights.llm * llmScore +
    weights.original * originalFusedScore;
```

---

## 5. Document Processing Pipeline

### 5.1 Deskripsi Fitur

Pipeline pemrosesan dokumen yang mendukung multiple format dan strategi chunking.

### 5.2 Relevansi Penelitian

| Aspek      | Relevansi                                        |
| ---------- | ------------------------------------------------ |
| **RQ4**    | Pengaruh karakteristik dokumen terhadap chunking |
| **H5**     | Menguji semantic vs recursive chunking           |
| **Domain** | Dokumen akademik memiliki struktur spesifik      |

### 5.3 Implementasi Teknis

**Lokasi**: `src/lib/rag/document-processor.ts`, `src/lib/rag/chunking.ts`

#### 5.3.1 Format yang Didukung

| Format | Parser    | Catatan            |
| ------ | --------- | ------------------ |
| PDF    | pdf-parse | OCR supported      |
| DOCX   | mammoth   | Preserve structure |
| TXT    | Native    | Plain text         |
| MD     | Native    | Markdown parsing   |

#### 5.3.2 Strategi Chunking

| Strategi          | Mekanisme                                  | Best For                        |
| ----------------- | ------------------------------------------ | ------------------------------- |
| `recursive`       | Character-based dengan separator hierarchy | General text, unknown structure |
| `semantic`        | Embedding similarity-based boundaries      | Narrative content               |
| `sentence_window` | Sentence + surrounding context             | Dense information               |
| `hierarchical`    | Parent-child relationship                  | Long, structured documents      |

#### 5.3.3 Chunk Quality Scoring

```typescript
function calculateChunkQuality(content: string, activeHeading?: string) {
    const metrics = {
        informationDensity: uniqueWords / totalWords,
        structuralImportance: headingScore + listScore,
        citationPresence: citationCount > 0 ? 1 : 0,
        keywordConcentration: academicTermCount / totalWords,
        completeness: sentenceCompleteness,
    };

    const score =
        0.3 * metrics.informationDensity +
        0.2 * metrics.structuralImportance +
        0.2 * metrics.citationPresence +
        0.2 * metrics.keywordConcentration +
        0.1 * metrics.completeness;

    return { score, metrics };
}
```

---

## 6. University Domain Processing

### 6.1 Deskripsi Fitur

Modul khusus untuk memahami dan memproses dokumen akademik Indonesia dengan pola dan terminologi unik.

### 6.2 Relevansi Penelitian

| Aspek      | Relevansi                                         |
| ---------- | ------------------------------------------------- |
| **Gap**    | Mengatasi keterbatasan NLP untuk bahasa Indonesia |
| **Domain** | Terminologi administratif universitas             |
| **Recall** | Query expansion meningkatkan recall 20-30%        |

### 6.3 Implementasi Teknis

**Lokasi**: `src/lib/rag/university-domain.ts`

#### 6.3.1 Kategori Dokumen Didukung

| #   | Kategori               | Contoh Dokumen                    |
| --- | ---------------------- | --------------------------------- |
| 1   | Informasi Akademik     | CPL, kurikulum, kalender akademik |
| 2   | Administrasi Mahasiswa | Pendaftaran, cuti, wisuda         |
| 3   | Keuangan               | UKT, beasiswa, cicilan            |
| 4   | Fasilitas              | Laboratorium, perpustakaan        |
| 5   | Kemahasiswaan          | Organisasi, kegiatan              |
| 6   | Pascasarjana           | Tesis, disertasi                  |
| 7   | Penelitian             | Hibah, publikasi                  |
| 8   | Pengabdian             | KKN, community service            |
| 9   | Kerjasama              | MoU, pertukaran                   |
| 10  | Kepegawaian            | Rekrutmen, jabatan fungsional     |
| 11  | Peraturan              | SK Rektor, Statuta                |
| 12  | Umum                   | Informasi umum                    |

#### 6.3.2 Synonym Expansion

```typescript
const SYNONYM_GROUPS: SynonymGroup[] = [
    {
        terms: ["prosedur", "tata cara", "mekanisme", "alur", "proses", "langkah"],
        context: "administration",
    },
    {
        terms: ["biaya", "tarif", "pembayaran", "uang", "dana"],
        context: "finance",
    },
    {
        terms: ["daftar", "registrasi", "pendaftaran", "mendaftar"],
        context: "student_affairs",
    },
    // ... more groups
];
```

#### 6.3.3 Indonesian Stemming

```typescript
function stemIndonesian(word: string): string {
    // Remove common suffixes
    let stem = word
        .replace(/kan$/, "")
        .replace(/an$/, "")
        .replace(/i$/, "");

    // Remove common prefixes
    stem = stem
        .replace(/^me(ng?|n|m|ny)?/, "")
        .replace(/^di/, "")
        .replace(/^ber/, "")
        .replace(/^ter/, "")
        .replace(/^per/, "");

    return stem;
}
```

---

## 7. Guardrails System

### 7.1 Deskripsi Fitur

Sistem keamanan komprehensif untuk:
- Deteksi PII (Personally Identifiable Information)
- Pencegahan prompt injection
- Filter konten berbahaya
- Deteksi reaksi negatif pengguna

### 7.2 Relevansi Penelitian

| Aspek          | Relevansi                                          |
| -------------- | -------------------------------------------------- |
| **H6**         | Menguji pengaruh guardrails terhadap hallucination |
| **Compliance** | Kepatuhan privasi data mahasiswa                   |
| **Safety**     | Pencegahan penyalahgunaan sistem                   |

### 7.3 Implementasi Teknis

**Lokasi**: `src/lib/rag/guardrails.ts`

#### 7.3.1 Jenis Guardrail

| Jenis                   | Deteksi                        | Aksi                 |
| ----------------------- | ------------------------------ | -------------------- |
| `pii_detection`         | Email, telepon, NIK, NIM       | Block + sanitize     |
| `injection_detection`   | "Ignore previous instructions" | Block                |
| `topic_restriction`     | Off-topic queries              | Redirect             |
| `toxicity_detection`    | Hate speech, harassment        | Block                |
| `academic_integrity`    | Cheating requests              | Redirect             |
| `negative_reaction`     | Frustration, confusion         | Acknowledge + adjust |
| `citation_verification` | Claim without source           | Flag                 |

#### 7.3.2 PII Patterns (Indonesia)

```typescript
const PII_PATTERNS = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b(\+?62|0)[\s-]?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g,
    nik: /\b\d{16}\b/g,  // NIK Indonesia (16 digit)
    nim: /\b\d{10,14}\b/g,  // NIM (10-14 digit)
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
};
```

---

## 8. RAGAS Evaluation Framework

### 8.1 Deskripsi Fitur

Framework evaluasi otomatis berbasis RAGAS (Shahul et al., 2023) untuk mengukur kualitas sistem RAG.

### 8.2 Relevansi Penelitian

| Aspek        | Relevansi                                      |
| ------------ | ---------------------------------------------- |
| **RQ5**      | Validasi metrik otomatis vs human judgment     |
| **Academic** | Menyediakan metrik kuantitatif untuk publikasi |
| **Ablation** | Basis perbandingan antar konfigurasi           |

### 8.3 Implementasi Teknis

**Lokasi**: `src/lib/rag/evaluation.ts`

Detail lengkap tersedia di [06_evaluation_framework.md](./06_evaluation_framework.md).

---

## 9. Statistical Analysis Pipeline

### 9.1 Deskripsi Fitur

Pipeline analisis statistik untuk validasi signifikansi hasil evaluasi dengan:
- Assumption testing otomatis
- Adaptive test selection (parametric/non-parametric)
- Effect size calculation
- Bilingual reporting (EN/ID)

### 9.2 Relevansi Penelitian

| Aspek               | Relevansi                                    |
| ------------------- | -------------------------------------------- |
| **Academic**        | Memenuhi standar publikasi ilmiah            |
| **Rigor**           | Menghindari kesimpulan dari random variation |
| **Reproducibility** | Dokumentasi lengkap untuk replikasi          |

### 9.3 Implementasi Teknis

**Lokasi**: `src/lib/statistics/statistical-analysis.ts`

Detail lengkap tersedia di [08_statistical_analysis.md](./08_statistical_analysis.md).

---

## 10. Matriks Fitur-Tujuan

| Fitur                    | T1  | T2  | T3  | T4  | T5  | RQ1 | RQ2 | RQ3 | RQ4 | RQ5 |
| ------------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hybrid Retrieval         | ✓   |     | ✓   | ✓   |     | ✓   |     |     |     |     |
| Agentic RAG              | ✓   |     |     | ✓   |     |     | ✓   |     |     |     |
| Multi-Strategy Reranking | ✓   |     |     | ✓   |     |     |     | ✓   |     |     |
| Document Processing      | ✓   |     |     | ✓   |     |     |     |     | ✓   |     |
| University Domain        | ✓   |     |     |     |     |     |     |     | ✓   |     |
| Guardrails               |     | ✓   |     | ✓   |     |     |     |     |     |     |
| RAGAS Evaluation         | ✓   | ✓   |     | ✓   | ✓   |     |     |     |     | ✓   |
| Statistical Analysis     |     |     | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |

---

## 11. Referensi Silang

| Dokumen                                                    | Konten Terkait          |
| ---------------------------------------------------------- | ----------------------- |
| [05_rag_pipeline.md](./05_rag_pipeline.md)                 | Detail implementasi RAG |
| [06_evaluation_framework.md](./06_evaluation_framework.md) | Metrik evaluasi         |
| [08_statistical_analysis.md](./08_statistical_analysis.md) | Analisis statistik      |
| [09_database_schema.md](./09_database_schema.md)           | Struktur data           |

---

*Dokumen ini merupakan bagian dari dokumentasi teknis Weaver.*
