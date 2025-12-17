# Kerangka Evaluasi (Evaluation Framework)

## 1. Pendahuluan

Dokumen ini menjelaskan kerangka evaluasi yang digunakan untuk mengukur performa sistem RAG. Framework ini berbasis RAGAS (Retrieval-Augmented Generation Assessment) dengan ekstensi untuk domain akademik Indonesia.

**Lokasi**: `src/lib/rag/evaluation.ts`

---

## 2. Overview Metrik

### 2.1 Kategorisasi Metrik

```
┌────────────────────────────────────────────────────────────────────────┐
│                       EVALUATION METRICS                                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    CORE RAGAS METRICS                            │  │
│  │  • Faithfulness        • Context Precision   • Context Relevancy │  │
│  │  • Answer Relevancy    • Context Recall      • Answer Correctness│  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                  HALLUCINATION METRICS                           │  │
│  │  • Hallucination Rate   • Source Attribution                     │  │
│  │  • Factual Consistency  • Contradiction Score                    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                  RETRIEVAL QUALITY METRICS                       │  │
│  │  • NDCG@K              • Precision@K                             │  │
│  │  • MRR (Mean Reciprocal Rank)                                    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                  DOMAIN-SPECIFIC METRICS                         │  │
│  │  • Citation Accuracy                                              │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                  EFFICIENCY METRICS                              │  │
│  │  • Total Latency       • Generation Latency   • Tokens/Second    │  │
│  │  • Retrieval Latency   • Planning Latency     • Avg Step Latency │  │
│  │  • Reranking Latency   • Synthesis Latency    • Token Efficiency │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Interface Metrik

```typescript
export interface EvaluationMetrics {
    // Core RAGAS metrics
    faithfulness: number;           // 0-1
    answerRelevancy: number;        // 0-1
    contextPrecision: number;       // 0-1
    contextRecall: number;          // 0-1
    contextRelevancy: number;       // 0-1
    answerCorrectness: number;      // 0-1

    // Domain-specific
    citationAccuracy: number;       // 0-1

    // Hallucination metrics
    hallucinationRate: number;      // 0-1 (lower is better)
    factualConsistency: number;     // 0-1
    sourceAttribution: number;      // 0-1
    contradictionScore: number;     // 0-1 (higher = no contradictions)

    // Retrieval quality
    retrievalNdcg: number;          // 0-1
    retrievalMrr: number;           // 0-1
    retrievalPrecision: number;     // 0-1

    // Efficiency
    totalLatencyMs: number;
    retrievalLatencyMs: number;
    rerankingLatencyMs: number;
    generationLatencyMs: number;
    agentReasoningLatencyMs: number;
    toolCallLatencyMs: number;
    planningLatencyMs: number;
    synthesisLatencyMs: number;
    totalAgentSteps: number;
    avgStepLatencyMs: number;
    tokenEfficiency: number;
    tokensPerSecond: number;
}
```

---

## 3. Core RAGAS Metrics

### 3.1 Faithfulness

#### 3.1.1 Definisi

Faithfulness mengukur proporsi klaim dalam jawaban yang didukung oleh konteks yang di-retrieve.

#### 3.1.2 Formula

$$Faithfulness = \frac{|Claims_{supported}|}{|Claims_{total}|}$$

#### 3.1.3 Algoritma RAGAS-Faithful

```
Input: answer, contexts[]
Output: faithfulness score (0-1)

1. DECOMPOSE answer into individual claims
   claims[] = LLM.decompose(answer)

2. For each claim in claims:
   supported = LLM.verify(claim, contexts)
   if supported:
       supported_count++

3. Return supported_count / len(claims)
```

#### 3.1.4 Implementasi

```typescript
export async function calculateFaithfulness(
    answer: string,
    contexts: string[]
): Promise<number> {
    // Step 1: Decompose into claims
    const { text: claimsText } = await generateText({
        model: JUDGE_MODEL,
        prompt: `Pecah jawaban berikut menjadi klaim-klaim faktual individual...`,
    });

    const claims = extractJsonArray(claimsText) || [answer];

    // Step 2: Verify each claim
    let supportedCount = 0;
    for (const claim of claims) {
        const { text } = await generateText({
            model: JUDGE_MODEL,
            prompt: `Konteks: ${contexts.join('\n')}\n
                     Klaim: ${claim}\n
                     Apakah klaim ini DIDUKUNG? Jawab: ya/tidak`,
        });
        if (text.toLowerCase().includes("ya")) {
            supportedCount++;
        }
    }

    return supportedCount / claims.length;
}
```

#### 3.1.5 Interpretasi

| Score   | Interpretasi                             |
| ------- | ---------------------------------------- |
| 0.9-1.0 | Excellent - hampir semua klaim didukung  |
| 0.7-0.9 | Good - mayoritas klaim didukung          |
| 0.5-0.7 | Moderate - sebagian klaim tidak didukung |
| < 0.5   | Poor - banyak klaim tanpa dukungan       |

---

### 3.2 Answer Relevancy

#### 3.2.1 Definisi

Answer Relevancy mengukur seberapa relevan jawaban terhadap pertanyaan asli menggunakan synthetic question generation.

#### 3.2.2 Algoritma RAGAS-Faithful

```
Input: question, answer
Output: relevancy score (0-1)

1. GENERATE N synthetic questions from answer
   synthetic_questions[] = LLM.generate_questions(answer, N=3)

2. EMBED original question
   q_embed = embed(question)

3. EMBED each synthetic question
   for sq in synthetic_questions:
       sq_embed = embed(sq)
       similarities.append(cosine_similarity(q_embed, sq_embed))

4. Return mean(similarities)
```

#### 3.2.3 Formula

$$AnswerRelevancy = \frac{1}{N} \sum_{i=1}^{N} cos(embed(Q), embed(Q_i^{synth}))$$

Di mana $Q_i^{synth}$ adalah pertanyaan sintetis ke-i yang dihasilkan dari jawaban.

#### 3.2.4 Implementasi

```typescript
export async function calculateAnswerRelevancy(
    question: string,
    answer: string,
    numQuestions = 3
): Promise<number> {
    // Generate synthetic questions
    const { text } = await generateText({
        model: JUDGE_MODEL,
        prompt: `Berdasarkan jawaban berikut, hasilkan ${numQuestions} pertanyaan...`,
    });

    const syntheticQuestions = extractJsonArray(text);

    // Compute embeddings
    const [originalEmbed, ...syntheticEmbeds] = await Promise.all([
        getCachedEmbedding(question),
        ...syntheticQuestions.map(q => getCachedEmbedding(q)),
    ]);

    // Calculate average similarity
    const similarities = syntheticEmbeds.map(e =>
        cosineSimilarity(originalEmbed.embedding, e.embedding)
    );

    return similarities.reduce((a, b) => a + b, 0) / similarities.length;
}
```

---

### 3.3 Context Precision

#### 3.3.1 Definisi

Context Precision mengukur proporsi konteks yang diambil yang benar-benar relevan untuk menjawab pertanyaan.

#### 3.3.2 Formula

$$ContextPrecision = \frac{|Contexts_{relevant}|}{|Contexts_{retrieved}|}$$

#### 3.3.3 Implementasi

```typescript
export async function calculateContextPrecision(
    question: string,
    contexts: string[],
    groundTruth: string
): Promise<number> {
    const { text } = await generateText({
        model: JUDGE_MODEL,
        prompt: `Pertanyaan: ${question}
                 Jawaban Benar: ${groundTruth}

                 Konteks yang Diambil:
                 ${contexts.map((c, i) => `[${i + 1}] ${c}`).join('\n')}

                 Untuk setiap konteks, tentukan apakah relevan.
                 Hitung: relevan / total. Jawab dengan angka 0-1.`,
    });

    return parseFloat(text.trim());
}
```

---

### 3.4 Context Recall

#### 3.4.1 Definisi

Context Recall mengukur proporsi informasi dari ground truth yang tercakup dalam konteks yang diambil.

#### 3.4.2 Formula

$$ContextRecall = \frac{|GroundTruth_{covered}|}{|GroundTruth_{total}|}$$

#### 3.4.3 Implementasi

```typescript
export async function calculateContextRecall(
    groundTruth: string,
    contexts: string[]
): Promise<number> {
    const { text } = await generateText({
        model: JUDGE_MODEL,
        prompt: `Jawaban Benar: ${groundTruth}

                 Konteks yang Diambil:
                 ${contexts.join('\n\n')}

                 Berapa persen informasi dalam jawaban benar
                 yang tercakup oleh konteks? Jawab 0-1.`,
    });

    return parseFloat(text.trim());
}
```

---

### 3.5 Context Relevancy

#### 3.5.1 Definisi

Context Relevancy mengukur relevansi absolut setiap chunk terhadap query (berbeda dengan precision yang biner).

#### 3.5.2 Formula

$$ContextRelevancy = \frac{1}{|C|} \sum_{c \in C} relevance(q, c)$$

Di mana $relevance(q, c)$ adalah skor 0-1 untuk setiap chunk.

#### 3.5.3 Implementasi

```typescript
export async function calculateContextRelevancy(
    question: string,
    contexts: string[]
): Promise<number> {
    const relevanceScores = await Promise.all(
        contexts.map(async (context) => {
            const { text } = await generateText({
                model: JUDGE_MODEL,
                prompt: `Pertanyaan: ${question}
                         Konteks: ${context.substring(0, 1000)}

                         Seberapa relevan konteks ini? Skor 0-1.`,
            });
            return parseFloat(text.trim());
        })
    );

    return relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length;
}
```

---

### 3.6 Answer Correctness

#### 3.6.1 Definisi

Answer Correctness mengukur kebenaran faktual dan semantik jawaban dibandingkan ground truth.

#### 3.6.2 Formula

$$AnswerCorrectness = \alpha \cdot SemanticSim + (1-\alpha) \cdot FactualScore$$

Di mana $\alpha = 0.3$ (semantic weight) dan $(1-\alpha) = 0.7$ (factual weight).

#### 3.6.3 Implementasi

```typescript
export async function calculateAnswerCorrectness(
    answer: string,
    groundTruth: string
): Promise<number> {
    // Semantic similarity via embeddings
    const [answerEmbed, truthEmbed] = await Promise.all([
        generateEmbedding(answer),
        generateEmbedding(groundTruth),
    ]);
    const semanticSimilarity = cosineSimilarity(
        answerEmbed.embedding,
        truthEmbed.embedding
    );

    // Factual correctness via LLM
    const { text } = await generateText({
        model: JUDGE_MODEL,
        prompt: `Jawaban yang Dihasilkan: ${answer}
                 Jawaban Benar: ${groundTruth}

                 Evaluasi kebenaran faktual. Skor 0-1.`,
    });
    const factualScore = parseFloat(text.trim());

    // Weighted combination
    return 0.3 * semanticSimilarity + 0.7 * factualScore;
}
```

---

## 4. Hallucination Metrics

### 4.1 Hallucination Rate

#### 4.1.1 Definisi

Proporsi informasi dalam jawaban yang tidak didukung oleh konteks atau difabrikasi.

#### 4.1.2 Formula

$$HallucinationRate = \frac{|Claims_{unsupported}|}{|Claims_{total}|}$$

**Note**: Idealnya mendekati 0.

#### 4.1.3 Implementasi

```typescript
export async function calculateHallucinationRate(
    answer: string,
    contexts: string[]
): Promise<number> {
    const { text } = await generateText({
        model: JUDGE_MODEL,
        prompt: `Jawaban: ${answer}

                 Konteks tersedia: ${contexts.join('\n')}

                 Identifikasi:
                 1. Fakta tidak ada dalam konteks
                 2. Klaim bertentangan dengan konteks
                 3. Detail spesifik tidak didukung

                 Berikan TINGKAT HALUSINASI 0-1.`,
    });

    return parseFloat(text.trim());
}
```

---

### 4.2 Factual Consistency

#### 4.2.1 Definisi

Konsistensi faktual menggunakan pendekatan Natural Language Inference (NLI) untuk menentukan apakah jawaban di-entail oleh konteks.

#### 4.2.2 Interpretasi NLI

| Verdict       | Score | Deskripsi                              |
| ------------- | ----- | -------------------------------------- |
| ENTAILMENT    | 1.0   | Jawaban sepenuhnya didukung            |
| NEUTRAL       | 0.5   | Tidak bertentangan tapi tidak didukung |
| CONTRADICTION | 0.0   | Jawaban bertentangan dengan konteks    |

---

### 4.3 Source Attribution

#### 4.3.1 Definisi

Mengukur seberapa baik klaim-klaim dalam jawaban diatribusikan ke sumber yang tepat.

#### 4.3.2 Kriteria

1. Klaim penting diatribusikan ke sumber
2. Tidak ada klaim tanpa sumber yang seharusnya ada
3. Atribusi akurat (tidak salah mengaitkan)
4. Pembaca dapat memverifikasi klaim

---

### 4.4 Contradiction Score

#### 4.4.1 Definisi

Mengukur kebebasan dari kontradiksi internal maupun dengan sumber. Score tinggi = tidak ada kontradiksi.

---

## 5. Retrieval Quality Metrics

### 5.1 NDCG (Normalized Discounted Cumulative Gain)

#### 5.1.1 Definisi

NDCG mengukur kualitas ranking dengan mempertimbangkan posisi dokumen relevan.

#### 5.1.2 Formula

$$DCG@K = \sum_{i=1}^{K} \frac{rel_i}{\log_2(i + 1)}$$

$$IDCG@K = \sum_{i=1}^{|REL|} \frac{1}{\log_2(i + 1)}$$

$$NDCG@K = \frac{DCG@K}{IDCG@K}$$

Di mana $rel_i = 1$ jika dokumen di posisi $i$ relevan, 0 jika tidak.

#### 5.1.3 Implementasi

```typescript
export function calculateNDCG(
    retrievedIds: string[],
    relevantIds: Set<string>,
    k?: number
): number {
    const results = k ? retrievedIds.slice(0, k) : retrievedIds;

    let dcg = 0;
    let idcg = 0;
    const relevantCount = Math.min(relevantIds.size, results.length);

    results.forEach((id, idx) => {
        const rel = relevantIds.has(id) ? 1 : 0;
        dcg += rel / Math.log2(idx + 2);  // +2 because idx is 0-based
    });

    for (let i = 0; i < relevantCount; i++) {
        idcg += 1 / Math.log2(i + 2);
    }

    return idcg > 0 ? dcg / idcg : 0;
}
```

---

### 5.2 MRR (Mean Reciprocal Rank)

#### 5.2.1 Definisi

MRR mengukur posisi dokumen relevan pertama dalam ranking.

#### 5.2.2 Formula

$$MRR = \frac{1}{rank_{first\_relevant}}$$

#### 5.2.3 Implementasi

```typescript
export function calculateMRR(
    retrievedIds: string[],
    relevantIds: Set<string>
): number {
    for (let i = 0; i < retrievedIds.length; i++) {
        if (relevantIds.has(retrievedIds[i])) {
            return 1 / (i + 1);
        }
    }
    return 0;
}
```

---

### 5.3 Precision@K

#### 5.3.1 Definisi

Proporsi dokumen relevan dalam K dokumen teratas.

#### 5.3.2 Formula

$$Precision@K = \frac{|Relevant \cap Retrieved@K|}{K}$$

#### 5.3.3 Implementasi

```typescript
export function calculatePrecisionAtK(
    retrievedIds: string[],
    relevantIds: Set<string>,
    k: number
): number {
    const topK = retrievedIds.slice(0, k);
    const relevantInTopK = topK.filter(id => relevantIds.has(id)).length;
    return relevantInTopK / k;
}
```

---

## 6. Efficiency Metrics

### 6.1 Latency Tracking

#### 6.1.1 Fase yang Dilacak

| Fase         | Deskripsi                     |
| ------------ | ----------------------------- |
| `retrieval`  | Vector search + BM25 + fusion |
| `reranking`  | Cross-encoder/LLM scoring     |
| `generation` | LLM inference                 |
| `planning`   | Agentic query planning        |
| `tool_call`  | Tool execution                |
| `synthesis`  | Final answer synthesis        |
| `guardrails` | Safety checks                 |

#### 6.1.2 Latency Tracker

```typescript
export function createLatencyTracker() {
    const breakdown: LatencyBreakdown[] = [];
    let startTime = Date.now();

    return {
        start() { startTime = Date.now(); },

        mark(phase: string, metadata?: object) {
            const now = Date.now();
            breakdown.push({
                timestamp: now,
                phase,
                durationMs: now - startTime,
                metadata,
            });
            startTime = now;
        },

        getProfile(): LatencyProfile {
            const durations = breakdown.map(b => b.durationMs).sort();
            return {
                breakdown,
                totalMs: durations.reduce((a, b) => a + b, 0),
                p50Ms: durations[Math.floor(durations.length * 0.5)],
                p95Ms: durations[Math.floor(durations.length * 0.95)],
                p99Ms: durations[Math.floor(durations.length * 0.99)],
                avgMs: durations.reduce((a, b) => a + b, 0) / durations.length,
            };
        },
    };
}
```

### 6.2 Token Efficiency

#### 6.2.1 Formula

$$TokenEfficiency = \frac{|Tokens_{output}|}{|Tokens_{context}|}$$

Rasio ini menunjukkan seberapa efisien sistem menggunakan konteks.

### 6.3 Throughput

$$TokensPerSecond = \frac{|Tokens_{output}|}{Latency_{ms}} \times 1000$$

---

## 7. Matriks Metrik-Tujuan

| Metrik             | T1  | T2  | RQ1 | RQ2 | RQ3 | RQ4 | RQ5 |
| ------------------ | --- | --- | --- | --- | --- | --- | --- |
| Faithfulness       | ✓   |     |     |     |     |     | ✓   |
| Answer Relevancy   | ✓   |     |     |     |     |     | ✓   |
| Context Precision  |     |     | ✓   |     | ✓   |     |     |
| Context Recall     |     |     | ✓   |     |     | ✓   |     |
| Context Relevancy  |     |     | ✓   |     |     |     |     |
| Answer Correctness | ✓   |     |     | ✓   |     |     |     |
| Hallucination Rate |     | ✓   |     |     |     |     | ✓   |
| NDCG               |     |     | ✓   |     | ✓   |     |     |
| Latency            |     |     |     |     | ✓   |     |     |

---

## 8. Referensi Silang

| Dokumen                                                    | Konten             |
| ---------------------------------------------------------- | ------------------ |
| [07_evaluation_pipeline.md](./07_evaluation_pipeline.md)   | Pipeline evaluasi  |
| [08_statistical_analysis.md](./08_statistical_analysis.md) | Analisis statistik |
| [02_research_context.md](./02_research_context.md)         | Tujuan penelitian  |

---

*Dokumen ini merupakan bagian dari dokumentasi teknis Academic Research RAG Chatbot.*
