# Pipeline RAG (Retrieval-Augmented Generation)

## 1. Pendahuluan

Dokumen ini menjelaskan implementasi pipeline Retrieval-Augmented Generation (RAG) secara komprehensif, mencakup alur proses dari input hingga output, serta detail setiap komponen pipeline.

---

## 2. Overview Pipeline

### 2.1 Alur Proses Utama

```
┌────────────────────────────────────────────────────────────────────────┐
│                           USER QUERY                                    │
│                    "Bagaimana prosedur pengajuan cuti?"                │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        1. INPUT PROCESSING                              │
│  • Language detection                                                   │
│  • Query expansion with synonyms                                        │
│  • Input guardrails check                                               │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            Agentic Mode                    Standard Mode
                    │                               │
                    ▼                               ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│   2a. AGENTIC PLANNING       │  │   2b. DIRECT RETRIEVAL       │
│  • Decompose query           │  │  • Single hybrid search      │
│  • Plan tool execution       │  │  • Rerank results            │
│  • Parallel tool calls       │  │                              │
└──────────────────────────────┘  └──────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        3. HYBRID RETRIEVAL                              │
│  • Vector search (pgvector, cosine similarity)                         │
│  • BM25 keyword search (term frequency)                                │
│  • Reciprocal Rank Fusion (RRF)                                        │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        4. RERANKING                                     │
│  • Strategy selection (cross_encoder | llm | ensemble)                 │
│  • Score recalculation                                                 │
│  • Top-K selection                                                     │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        5. CONTEXT BUILDING                              │
│  • Format retrieved chunks                                              │
│  • Citation numbering                                                   │
│  • Prompt construction                                                  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        6. LLM GENERATION                                │
│  • Context-augmented prompt                                             │
│  • Streaming response                                                   │
│  • Indonesian language enforcement                                      │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        7. OUTPUT PROCESSING                             │
│  • Output guardrails check                                              │
│  • Citation attachment                                                  │
│  • Response streaming                                                   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           RESPONSE                                      │
│  Answer + Sources + Metadata                                           │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Mode Operasi

| Mode             | Kondisi Aktivasi                      | Karakteristik                                   |
| ---------------- | ------------------------------------- | ----------------------------------------------- |
| **Agentic RAG**  | `useAgenticMode: true`                | Multi-step, parallel tools, query decomposition |
| **Standard RAG** | `useRag: true, useAgenticMode: false` | Single retrieval, direct generation             |
| **Direct Mode**  | `useRag: false`                       | No retrieval, pure LLM                          |

---

## 3. Document Processing (Pemrosesan Dokumen)

### 3.1 Overview

Document processing adalah tahap pra-retrieval yang mempersiapkan dokumen untuk pencarian. Proses ini diimplementasikan di `src/lib/rag/document-processor.ts` dan `src/lib/rag/chunking.ts`.

### 3.2 Pipeline Pemrosesan

```
Raw Document (PDF/DOCX/TXT/MD)
            │
            ▼
    ┌───────────────┐
    │ Text Extraction│
    │  • pdf-parse   │
    │  • mammoth     │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ Normalization │
    │  • Wide space  │
    │  • Line breaks │
    │  • OCR cleanup │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ Language      │
    │ Detection     │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ Strategy      │
    │ Selection     │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │   Chunking    │
    │ + Quality     │
    │   Scoring     │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │  Embedding    │
    │  Generation   │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │   Storage     │
    │  (pgvector)   │
    └───────────────┘
```

### 3.3 Strategi Chunking

#### 3.3.1 Recursive Chunking

**Mekanisme**: Split berdasarkan hierarki separator dengan overlap.

```typescript
const SEPARATORS = [
    "\n\n\n",  // Major sections
    "\n\n",    // Paragraphs
    "\n",      // Line breaks
    ". ",      // Sentences
    " ",       // Words
    "",        // Characters (fallback)
];

// Default configuration
chunkSize: 1000,
chunkOverlap: 200,
```

**Best For**: Dokumen general, struktur tidak diketahui.

#### 3.3.2 Semantic Chunking

**Mekanisme**: Split berdasarkan perubahan topik (embedding similarity).

```
Algoritma:
1. Tokenize sentences
2. Generate sliding window embeddings
3. Calculate sentence-to-sentence similarity
4. Split at similarity drop > threshold

semanticThreshold: 0.5  // Split when similarity < 0.5
semanticWindowSize: 3   // Window size for averaging
```

**Best For**: Dokumen naratif, konten esai.

#### 3.3.3 Sentence Window Chunking

**Mekanisme**: Kalimat sebagai unit dengan konteks surrounding.

```
     ┌─────────────────────────────────────────┐
     │         Sentence Window Context          │
     │  ┌───────┐ ┌───────┐ ┌───────┐          │
     │  │Prev-1 │ │Current│ │Next+1 │          │
     │  └───────┘ └───────┘ └───────┘          │
     │          ▲                               │
     │          │                               │
     │     Anchor sentence                      │
     │     (for retrieval)                      │
     └─────────────────────────────────────────┘

windowSize: 3  // 1 sentence before + current + 1 after
```

**Best For**: Dokumen padat informasi, definisi.

#### 3.3.4 Hierarchical Chunking

**Mekanisme**: Parent-child relationship untuk ekspansi konteks.

```
Parent Chunk (1000 chars)
├── Child Chunk 1 (250 chars)
├── Child Chunk 2 (250 chars)
├── Child Chunk 3 (250 chars)
└── Child Chunk 4 (250 chars)

levels: 2
```

**Best For**: Dokumen panjang dengan struktur hierarkis.

### 3.4 Chunk Quality Scoring

```typescript
function calculateChunkQuality(content: string): number {
    const metrics = {
        informationDensity: uniqueWords / totalWords,      // 0-1
        structuralImportance: hasHeading ? 1 : 0,          // 0-1
        citationPresence: hasCitation ? 1 : 0,             // 0-1
        keywordConcentration: academicTerms / totalWords,  // 0-1
        completeness: completeSentences / totalSentences,  // 0-1
    };

    return (
        0.3 * informationDensity +
        0.2 * structuralImportance +
        0.2 * citationPresence +
        0.2 * keywordConcentration +
        0.1 * completeness
    );
}
```

### 3.5 Embedding Generation

```typescript
// Model: text-embedding-3-small (1536 dimensions)
// Batch processing untuk efisiensi

async function createChunkRecords(documentId, chunks) {
    const BATCH_SIZE = 50;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const embeddings = await generateEmbeddings(
            batch.map(c => c.content)
        );
        // Store in database
    }
}
```

---

## 4. Hybrid Retrieval (Retrieval Hybrid)

### 4.1 Overview

Hybrid retrieval menggabungkan kekuatan vector search (semantik) dan keyword search (eksak) untuk mengatasi keterbatasan masing-masing metode.

**Lokasi**: `src/lib/rag/hybrid-retrieval.ts`

### 4.2 Arsitektur

```
                        Query
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐
    │  Vector Search  │     │  BM25 Search    │
    │                 │     │                 │
    │ • Embed query   │     │ • Tokenize      │
    │ • Cosine sim    │     │ • Stem (ID)     │
    │ • Top-K         │     │ • TF-IDF + BM25 │
    └────────┬────────┘     └────────┬────────┘
             │                       │
             └───────────┬───────────┘
                         │
                         ▼
               ┌─────────────────┐
               │  Reciprocal     │
               │  Rank Fusion    │
               │    (RRF)        │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │  Quality-       │
               │  Weighted       │
               │  Scoring        │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │  Context        │
               │  Expansion      │
               │  (Optional)     │
               └────────┬────────┘
                        │
                        ▼
                Retrieved Chunks
```

### 4.3 Vector Search

#### 4.3.1 Query Embedding

```typescript
const queryEmbedding = await generateEmbedding(query);
// Returns: number[1536]
```

#### 4.3.2 Similarity Search (pgvector)

```sql
-- Cosine distance operator: <=>
SELECT
    id,
    content,
    document_id,
    1 - (embedding <=> $1) as similarity
FROM document_chunks
WHERE 1 - (embedding <=> $1) > $2  -- minScore threshold
ORDER BY embedding <=> $1
LIMIT $3;  -- topK
```

### 4.4 BM25 Keyword Search

#### 4.4.1 Formula Okapi BM25+

$$BM25+(q, D) = \sum_{i=1}^{n} IDF(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot (1 - b + b \cdot \frac{|D|}{avgdl})} + \delta$$

**Parameter**:
- $k_1 = 1.2$: Term frequency saturation
- $b = 0.75$: Length normalization factor
- $\delta = 1$: Delta untuk BM25+ (mengatasi negative scores)

#### 4.4.2 IDF Calculation

$$IDF(q_i) = \log\left(\frac{N - n(q_i) + 0.5}{n(q_i) + 0.5} + 1\right)$$

Di mana:
- $N$: Total dokumen
- $n(q_i)$: Dokumen mengandung term $q_i$

#### 4.4.3 Indonesian Tokenization

```typescript
function tokenize(text: string, language: "id"): string[] {
    return text
        .toLowerCase()
        .replace(/[^\w\s\u00C0-\u024F]/g, " ")  // Remove special chars
        .split(/\s+/)
        .filter(token => !INDONESIAN_STOPWORDS.has(token))
        .map(token => stemIndonesian(token));
}
```

### 4.5 Reciprocal Rank Fusion (RRF)

#### 4.5.1 Formula

$$RRF(d) = \sum_{r \in R} \frac{1}{k + rank_r(d)}$$

Di mana:
- $R$: Set of rankings (vector, BM25)
- $k = 60$: Konstanta RRF (default)
- $rank_r(d)$: Rank dokumen $d$ dalam ranking $r$

#### 4.5.2 Implementasi

```typescript
function reciprocalRankFusion(
    rankings: { id: string; rank: number }[][],
    k = 60
): Map<string, number> {
    const scores = new Map<string, number>();

    for (const ranking of rankings) {
        for (const { id, rank } of ranking) {
            const current = scores.get(id) || 0;
            scores.set(id, current + 1 / (k + rank));
        }
    }

    return scores;
}
```

### 4.6 Final Score Calculation

```typescript
// Weighted combination
const finalScore =
    vectorWeight * vectorScore +      // 0.6
    bm25Weight * bm25Score +          // 0.4
    qualityWeight * qualityScore;     // 0.15 bonus

// Default weights
const DEFAULT_OPTIONS = {
    vectorWeight: 0.6,
    bm25Weight: 0.4,
    qualityWeight: 0.15,
};
```

### 4.7 Context Expansion

Untuk hierarchical chunking, parent chunks dapat di-expand:

```typescript
if (useContextExpansion && chunk.metadata?.parentChunkId) {
    const parentChunk = await fetchParentChunk(chunk.metadata.parentChunkId);
    chunk.expandedContext = parentChunk.content;
}
```

---

## 5. Reranking System (Sistem Reranking)

### 5.1 Overview

Reranking mengurutkan ulang hasil retrieval untuk meningkatkan precision. First-stage retrieval optimasi recall, reranking optimasi precision.

**Lokasi**: `src/lib/rag/reranker.ts`

### 5.2 Arsitektur

```
Initial Retrieval Results (Top-K)
            │
            ▼
    ┌───────────────────┐
    │ Strategy Selection │
    │                   │
    │ cross_encoder     │───► TinyBERT scoring
    │ llm               │───► GPT-4o pointwise
    │ llm_listwise      │───► GPT-4o listwise
    │ cohere            │───► Pairwise comparison
    │ ensemble          │───► Weighted fusion
    │ none              │───► Skip (baseline)
    └───────────────────┘
            │
            ▼
    ┌───────────────────┐
    │   Score Mapping   │
    │   (0-1 scale)     │
    └───────────────────┘
            │
            ▼
    ┌───────────────────┐
    │   Selection       │
    │   (topK, minScore)│
    └───────────────────┘
            │
            ▼
    Reranked Results
```

### 5.3 Strategi Reranking

#### 5.3.1 Cross-Encoder (TinyBERT)

**Model**: `Xenova/ms-marco-TinyBERT-L-2-v2`

```typescript
async function crossEncoderScore(
    query: string,
    passages: string[]
): Promise<number[]> {
    const classifier = await getPipeline();
    const scores: number[] = [];

    for (const passage of passages) {
        const result = await classifier({
            text: query,
            text_pair: passage,
        });
        // Sigmoid for 0-1 normalization
        scores.push(1 / (1 + Math.exp(-result.score)));
    }

    return scores;
}
```

**Karakteristik**:
- Latency: ~100ms
- Akurasi: 80-85%
- Best for: Production, high-throughput

#### 5.3.2 LLM Pointwise

```typescript
async function llmRerank(
    query: string,
    passages: { content: string }[],
    language: "id"
): Promise<{ score: number; reasoning?: string }[]> {
    const results = await Promise.all(
        passages.map(async (p) => {
            const { text } = await generateText({
                model: CHAT_MODEL,
                prompt: `Query: ${query}
                         Passage: ${p.content}

                         Rate relevance 0-10. Answer: score`,
            });
            return { score: parseFloat(text) / 10 };
        })
    );
    return results;
}
```

**Karakteristik**:
- Latency: ~3-5s
- Akurasi: 90-95%
- Best for: Quality-critical, small candidate sets

#### 5.3.3 LLM Listwise

```typescript
async function llmListwiseRerank(
    query: string,
    passages: { content: string; id: string }[]
): Promise<Map<string, { score: number }>> {
    const { text } = await generateText({
        prompt: `Query: ${query}

                 Documents:
                 ${passages.map((p, i) => `[${i}] ${p.content}`).join('\n')}

                 Rank all documents by relevance. Return JSON array of indices.`,
    });

    // Parse ranking and convert to scores
    const ranking = JSON.parse(text);
    return ranking.map((idx, rank) => ({
        id: passages[idx].id,
        score: 1 - (rank / ranking.length),
    }));
}
```

**Karakteristik**:
- Latency: ~2-3s
- Akurasi: 88-92%
- Best for: Comparative ranking

#### 5.3.4 Cohere-Style Pairwise

```typescript
async function cohereStyleRerank(
    query: string,
    passages: { content: string; id: string }[]
): Promise<Map<string, number>> {
    const wins = new Map<string, number>();

    // Pairwise comparisons
    for (let i = 0; i < passages.length; i++) {
        for (let j = i + 1; j < passages.length; j++) {
            const winner = await comparePassages(
                query,
                passages[i],
                passages[j]
            );
            wins.set(winner, (wins.get(winner) || 0) + 1);
        }
    }

    // Normalize to 0-1 scores
    const maxWins = passages.length - 1;
    return new Map(
        [...wins.entries()].map(([id, w]) => [id, w / maxWins])
    );
}
```

#### 5.3.5 Ensemble

```typescript
async function applyEnsembleStrategy(
    query: string,
    results: RetrievalResult[],
    opts: RerankerOptions
): Promise<void> {
    const weights = opts.ensembleWeights || {
        crossEncoder: 0.4,
        llm: 0.4,
        original: 0.2,
    };

    const [crossScores, llmScores] = await Promise.all([
        crossEncoderScore(query, results.map(r => r.content)),
        llmRerank(query, results, opts.language),
    ]);

    results.forEach((r, i) => {
        r.rerankedScore =
            weights.crossEncoder * crossScores[i] +
            weights.llm * llmScores[i].score +
            weights.original * r.fusedScore;
    });
}
```

### 5.4 Konfigurasi Default

```typescript
const DEFAULT_RERANKER_OPTIONS = {
    strategy: "cross_encoder",
    topK: 5,
    minScore: 0.3,
    llmDetailedScoring: true,
    ensembleWeights: {
        crossEncoder: 0.4,
        llm: 0.4,
        original: 0.2,
    },
};
```

---

## 6. Agentic RAG System

### 6.1 Overview

Agentic RAG memungkinkan sistem untuk melakukan reasoning multi-langkah dengan kemampuan planning, tool execution, dan synthesis.

**Lokasi**: `src/lib/rag/agentic-rag.ts`

### 6.2 Arsitektur

```
                        User Query
                            │
                            ▼
                ┌───────────────────────┐
                │   Agent Controller    │
                │   (LLM + Tools)       │
                └───────────┬───────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ search_docs   │  │ decompose_    │  │ verify_claim  │
│               │  │   query       │  │               │
│ • Query       │  │               │  │ • Claim       │
│ • Strategy    │  │ • Question    │  │ • Context     │
│ • TopK        │  │ • MaxSubs     │  │               │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   Context Aggregation │
                │   + Citation Mgmt     │
                └───────────┬───────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   synthesize_answer   │
                │   (Final Generation)  │
                └───────────┬───────────┘
                            │
                            ▼
                        Response
```

### 6.3 Available Tools

#### 6.3.1 search_documents

```typescript
const searchTool = tool({
    description: "Mencari dokumen di knowledge base",
    parameters: z.object({
        query: z.string().describe("Query pencarian"),
        strategy: z.enum(["vector", "keyword", "hybrid"]).optional(),
        topK: z.number().optional().default(5),
    }),
    execute: async ({ query, strategy, topK }) => {
        const results = await hybridRetrieve(query, {
            strategy: strategy || "hybrid",
            topK: topK || 5,
            useReranker: true,
        });

        // Update streaming state with chunks
        streamingState?.retrievedChunks.push(...results);

        return results.map(r => ({
            content: r.content.slice(0, 500),
            source: r.documentTitle,
            score: r.fusedScore,
        }));
    },
});
```

#### 6.3.2 expand_query

```typescript
const expandQueryTool = tool({
    description: "Ekspansi query dengan sinonim akademik",
    parameters: z.object({
        query: z.string(),
    }),
    execute: async ({ query }) => {
        const expanded = expandQueryWithSynonyms(query);
        const indonesianExpanded = expandQueryIndonesian(query);

        return {
            original: query,
            variations: [...new Set([...expanded, ...indonesianExpanded])],
        };
    },
});
```

#### 6.3.3 decompose_query

```typescript
const decomposeQueryTool = tool({
    description: "Pecah query kompleks menjadi sub-pertanyaan",
    parameters: z.object({
        query: z.string(),
        maxSubQuestions: z.number().optional().default(3),
    }),
    execute: async ({ query, maxSubQuestions }) => {
        const { text } = await generateText({
            model: CHAT_MODEL,
            prompt: `Pecah pertanyaan berikut menjadi ${maxSubQuestions} sub-pertanyaan yang dapat dijawab secara independen:

                     Pertanyaan: ${query}

                     Kembalikan sebagai JSON array.`,
        });

        return JSON.parse(text);
    },
});
```

#### 6.3.4 verify_claim

```typescript
const verifyClaimTool = tool({
    description: "Verifikasi klaim terhadap konteks",
    parameters: z.object({
        claim: z.string(),
        context: z.string(),
    }),
    execute: async ({ claim, context }) => {
        const { text } = await generateText({
            model: CHAT_MODEL,
            prompt: `Verifikasi apakah klaim berikut DIDUKUNG oleh konteks:

                     Klaim: ${claim}
                     Konteks: ${context}

                     Jawab: DIDUKUNG, TIDAK_DIDUKUNG, atau TIDAK_CUKUP_INFORMASI`,
        });

        return {
            claim,
            verdict: text.trim(),
            supported: text.includes("DIDUKUNG") && !text.includes("TIDAK"),
        };
    },
});
```

#### 6.3.5 synthesize_answer

```typescript
const synthesizeAnswerTool = tool({
    description: "Sintesis jawaban dari multiple sources",
    parameters: z.object({
        question: z.string(),
        sources: z.array(z.object({
            content: z.string(),
            title: z.string(),
        })),
    }),
    execute: async ({ question, sources }) => {
        const { text } = await generateText({
            model: CHAT_MODEL,
            prompt: `Berdasarkan sumber-sumber berikut, jawab pertanyaan dalam Bahasa Indonesia:

                     Pertanyaan: ${question}

                     Sumber:
                     ${sources.map((s, i) => `[${i+1}] ${s.title}: ${s.content}`).join('\n\n')}

                     Sertakan nomor sitasi [n] untuk setiap klaim.`,
        });

        return text;
    },
});
```

### 6.4 Execution Flow

```typescript
const result = await generateText({
    model: CHAT_MODEL,
    system: AGENTIC_SYSTEM_PROMPT,
    messages: conversationHistory,
    tools: {
        search_documents: searchTool,
        expand_query: expandQueryTool,
        decompose_query: decomposeQueryTool,
        verify_claim: verifyClaimTool,
        synthesize_answer: synthesizeAnswerTool,
    },
    maxSteps: 10,
    toolChoice: "auto",

    // Track each step
    onStepFinish: (step) => {
        agentSteps.push({
            stepIndex: step.stepIndex,
            stepType: step.toolCalls ? "tool_call" : "reasoning",
            toolName: step.toolCalls?.[0]?.toolName,
            toolOutput: step.toolResults,
            durationMs: step.durationMs,
        });
    },
});
```

### 6.5 Citation Management

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

    getCitations(): Array<{
        id: string;
        documentTitle: string;
        citationNumber: number;
    }> {
        // Return sorted by citation number
    }

    clear(): void {
        this.citations.clear();
        this.nextId = 1;
    }
}
```

---

## 7. Standard RAG (RAG Standar)

### 7.1 Overview

Standard RAG adalah mode operasi dengan single retrieval pass tanpa agentic capabilities. Mode ini lebih cepat untuk pertanyaan sederhana.

### 7.2 Pipeline

```typescript
async function standardRagPipeline(
    query: string,
    options: RagOptions
): Promise<RagResponse> {
    // 1. Retrieve
    const chunks = await hybridRetrieve(query, {
        topK: options.topK || 10,
        strategy: options.retrievalStrategy || "hybrid",
    });

    // 2. Rerank
    const reranked = await rerank(query, chunks, {
        strategy: options.rerankerStrategy || "cross_encoder",
        topK: 5,
    });

    // 3. Build context
    const context = buildRagPrompt(query, reranked);

    // 4. Generate
    const { textStream } = await streamText({
        model: CHAT_MODEL,
        system: SYSTEM_PROMPTS.indonesian,
        prompt: context,
    });

    return {
        stream: textStream,
        chunks: reranked,
    };
}
```

### 7.3 Perbandingan dengan Agentic

| Aspek              | Standard RAG   | Agentic RAG              |
| ------------------ | -------------- | ------------------------ |
| **Retrieval**      | Single pass    | Multiple adaptive        |
| **Query handling** | As-is          | Decomposition, expansion |
| **Latency**        | ~2-5s          | ~5-15s                   |
| **Complexity**     | Simple queries | Complex, multi-faceted   |
| **Tools**          | None           | 5 specialized tools      |

---

## 8. Direct Mode (Mode Langsung)

### 8.1 Overview

Direct mode bypass retrieval sepenuhnya, menggunakan pure LLM generation tanpa context augmentation.

### 8.2 Use Cases

1. **Pertanyaan umum** yang tidak memerlukan knowledge base
2. **Komparasi** atau analisis tanpa fakta spesifik
3. **Baseline** untuk evaluasi RAG effectiveness

### 8.3 Implementasi

```typescript
async function directModePipeline(
    messages: Message[]
): Promise<Response> {
    const { textStream } = await streamText({
        model: CHAT_MODEL,
        system: SYSTEM_PROMPTS.indonesian,
        messages: messages,
    });

    return new Response(textStream, {
        headers: { 'Content-Type': 'text/event-stream' },
    });
}
```

---

## 9. Referensi Silang

| Dokumen                                                    | Konten Terkait         |
| ---------------------------------------------------------- | ---------------------- |
| [04_system_architecture.md](./04_system_architecture.md)   | Arsitektur keseluruhan |
| [03_key_features.md](./03_key_features.md)                 | Detail fitur           |
| [06_evaluation_framework.md](./06_evaluation_framework.md) | Metrik evaluasi        |

---

*Dokumen ini merupakan bagian dari dokumentasi teknis Academic Research RAG Chatbot.*
