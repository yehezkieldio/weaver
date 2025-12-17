# Pipeline Evaluasi (Evaluation Pipeline)

## 1. Pendahuluan

Dokumen ini menjelaskan alur proses evaluasi secara mendetail, mencakup tahapan preprocessing, pengukuran metrik, agregasi hasil, dan pelaporan.

---

## 2. Overview Pipeline

### 2.1 Diagram Alur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EVALUATION PIPELINE                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        1. INITIALIZATION                                 │
│  • Create evaluation run record                                          │
│  • Load evaluation questions                                             │
│  • Configure pipeline parameters                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        2. PER-QUESTION EVALUATION                        │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  For each question:                                                │  │
│  │                                                                    │  │
│  │  2a. RAG Pipeline Execution                                        │  │
│  │      • Retrieve contexts                                           │  │
│  │      • Generate answer (RAG mode)                                  │  │
│  │      • Track latency                                               │  │
│  │                                                                    │  │
│  │  2b. Non-RAG Baseline Execution                                    │  │
│  │      • Generate answer (direct LLM)                                │  │
│  │      • Track latency                                               │  │
│  │                                                                    │  │
│  │  2c. Metric Calculation                                            │  │
│  │      • Core RAGAS metrics                                          │  │
│  │      • Hallucination metrics                                       │  │
│  │      • Retrieval metrics                                           │  │
│  │                                                                    │  │
│  │  2d. Store Results                                                 │  │
│  │      • Update evaluation_questions table                           │  │
│  │      • Update run progress                                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        3. AGGREGATION                                    │
│  • Calculate mean metrics                                                │
│  • Calculate standard deviations                                         │
│  • Generate summary statistics                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        4. STATISTICAL ANALYSIS                           │
│  • Paired t-tests (RAG vs Non-RAG)                                       │
│  • Confidence intervals                                                  │
│  • Effect size calculation                                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        5. REPORTING                                      │
│  • Generate markdown report                                              │
│  • Visualize results                                                     │
│  • Store in database                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Initialization Phase

### 3.1 Evaluation Run Creation

```typescript
// API: POST /api/evaluation
const evaluationRun = await db.insert(evaluationRuns).values({
    name: params.name,
    description: params.description,
    status: "pending",
    totalQuestions: params.questionCount,
    completedQuestions: 0,
    retrievalStrategy: params.retrievalStrategy || "hybrid",
    chunkingStrategy: params.chunkingStrategy || "recursive",
    useAgenticMode: params.useAgenticMode ?? true,
    useReranker: params.useReranker ?? true,
    rerankerStrategy: params.rerankerStrategy || "ensemble",
    enableGuardrails: params.enableGuardrails ?? true,
    language: params.language || "id",
    evaluationMode: params.evaluationMode || "quick",
}).returning();
```

### 3.2 Question Loading

```typescript
// Load from predefined academic questions
import { ACADEMIC_QUESTIONS } from "@/lib/evaluation-questions";

const questions = ACADEMIC_QUESTIONS
    .filter(q => q.language === language || q.language === "id")
    .slice(0, evaluationMode === "quick" ? 5 : 50);
```

### 3.3 Configuration Parameters

| Parameter           | Options                                            | Default   |
| ------------------- | -------------------------------------------------- | --------- |
| `retrievalStrategy` | vector, keyword, hybrid                            | hybrid    |
| `chunkingStrategy`  | recursive, semantic, sentence_window, hierarchical | recursive |
| `useAgenticMode`    | true, false                                        | true      |
| `useReranker`       | true, false                                        | true      |
| `rerankerStrategy`  | cross_encoder, llm, ensemble                       | ensemble  |
| `enableGuardrails`  | true, false                                        | true      |
| `evaluationMode`    | quick (5Q), production (50Q)                       | quick     |

---

## 4. Per-Question Evaluation

### 4.1 RAG Pipeline Execution

```typescript
async function executeRagPipeline(
    question: string,
    groundTruth: string,
    options: EvaluationOptions
): Promise<{
    answer: string;
    contexts: string[];
    latencyMs: number;
    agentSteps?: number;
}> {
    const latencyTracker = createLatencyTracker();
    latencyTracker.start();

    // 1. Retrieve contexts
    const retrievalResults = await hybridRetrieve(question, {
        strategy: options.retrievalStrategy,
        topK: 10,
        useReranker: options.useReranker,
        rerankerStrategy: options.rerankerStrategy,
    });
    latencyTracker.mark("retrieval");

    // 2. Generate answer
    let answer: string;
    let agentSteps: number | undefined;

    if (options.useAgenticMode) {
        const result = await runAgenticRag(question, {
            sessionId: generateId(),
            language: "id",
        });
        answer = result.answer;
        agentSteps = result.steps.length;
        latencyTracker.mark("generation");
    } else {
        const context = buildRagPrompt(question, retrievalResults);
        const { text } = await generateText({
            model: CHAT_MODEL,
            prompt: context,
        });
        answer = text;
        latencyTracker.mark("generation");
    }

    return {
        answer,
        contexts: retrievalResults.map(r => r.content),
        latencyMs: latencyTracker.getTotalMs(),
        agentSteps,
    };
}
```

### 4.2 Non-RAG Baseline Execution

```typescript
async function executeNonRagBaseline(
    question: string
): Promise<{
    answer: string;
    latencyMs: number;
}> {
    const start = Date.now();

    const { text } = await generateText({
        model: CHAT_MODEL,
        system: SYSTEM_PROMPTS.indonesian,
        prompt: question,
    });

    return {
        answer: text,
        latencyMs: Date.now() - start,
    };
}
```

### 4.3 Metric Calculation

```typescript
async function calculateAllMetrics(
    question: string,
    groundTruth: string,
    ragAnswer: string,
    nonRagAnswer: string,
    contexts: string[],
    retrievedIds: string[],
    relevantIds: Set<string>
): Promise<{
    ragMetrics: Partial<EvaluationMetrics>;
    nonRagMetrics: Partial<EvaluationMetrics>;
}> {
    // Parallel metric calculation for efficiency
    const [
        faithfulness,
        answerRelevancy,
        contextPrecision,
        contextRecall,
        contextRelevancy,
        answerCorrectness,
        hallucinationRate,
        factualConsistency,
        sourceAttribution,
        contradictionScore,
        citationAccuracy,
        nonRagRelevancy,
        nonRagCorrectness,
        nonRagHallucination,
    ] = await Promise.all([
        calculateFaithfulness(ragAnswer, contexts),
        calculateAnswerRelevancy(question, ragAnswer),
        calculateContextPrecision(question, contexts, groundTruth),
        calculateContextRecall(groundTruth, contexts),
        calculateContextRelevancy(question, contexts),
        calculateAnswerCorrectness(ragAnswer, groundTruth),
        calculateHallucinationRate(ragAnswer, contexts),
        calculateFactualConsistency(ragAnswer, contexts),
        calculateSourceAttribution(ragAnswer, contexts),
        calculateContradictionScore(ragAnswer, contexts),
        calculateCitationAccuracy(ragAnswer, contexts),
        calculateAnswerRelevancy(question, nonRagAnswer),
        calculateAnswerCorrectness(nonRagAnswer, groundTruth),
        calculateHallucinationRate(nonRagAnswer, []),
    ]);

    // Retrieval metrics
    const retrievalNdcg = calculateNDCG(retrievedIds, relevantIds);
    const retrievalMrr = calculateMRR(retrievedIds, relevantIds);
    const retrievalPrecision = calculatePrecisionAtK(retrievedIds, relevantIds, 5);

    return {
        ragMetrics: {
            faithfulness,
            answerRelevancy,
            contextPrecision,
            contextRecall,
            contextRelevancy,
            answerCorrectness,
            hallucinationRate,
            factualConsistency,
            sourceAttribution,
            contradictionScore,
            citationAccuracy,
            retrievalNdcg,
            retrievalMrr,
            retrievalPrecision,
        },
        nonRagMetrics: {
            answerRelevancy: nonRagRelevancy,
            answerCorrectness: nonRagCorrectness,
            hallucinationRate: nonRagHallucination,
        },
    };
}
```

### 4.4 Result Storage

```typescript
await db.update(evaluationQuestions)
    .set({
        ragAnswer,
        nonRagAnswer,
        retrievedContexts: contexts,

        // Core RAGAS metrics
        ragFaithfulness: ragMetrics.faithfulness,
        ragAnswerRelevancy: ragMetrics.answerRelevancy,
        ragContextPrecision: ragMetrics.contextPrecision,
        ragContextRecall: ragMetrics.contextRecall,
        ragContextRelevancy: ragMetrics.contextRelevancy,
        ragAnswerCorrectness: ragMetrics.answerCorrectness,

        // Hallucination metrics
        ragHallucinationRate: ragMetrics.hallucinationRate,
        ragFactualConsistency: ragMetrics.factualConsistency,
        ragSourceAttribution: ragMetrics.sourceAttribution,
        ragContradictionScore: ragMetrics.contradictionScore,

        // Domain metrics
        ragCitationAccuracy: ragMetrics.citationAccuracy,

        // Retrieval metrics
        retrievalNdcg: ragMetrics.retrievalNdcg,
        retrievalMrr: ragMetrics.retrievalMrr,
        retrievalPrecision: ragMetrics.retrievalPrecision,

        // Non-RAG baselines
        nonRagAnswerRelevancy: nonRagMetrics.answerRelevancy,
        nonRagAnswerCorrectness: nonRagMetrics.answerCorrectness,
        nonRagHallucinationRate: nonRagMetrics.hallucinationRate,

        // Latency
        ragLatencyMs: ragLatency,
        nonRagLatencyMs: nonRagLatency,
        ragRetrievalLatencyMs: latencyProfile.retrieval,
        ragRerankingLatencyMs: latencyProfile.reranking,
        ragGenerationLatencyMs: latencyProfile.generation,
    })
    .where(eq(evaluationQuestions.id, questionId));

// Update progress
await db.update(evaluationRuns)
    .set({ completedQuestions: sql`${evaluationRuns.completedQuestions} + 1` })
    .where(eq(evaluationRuns.id, runId));
```

---

## 5. Agregation Phase

### 5.1 Mean Calculation

```typescript
function aggregateMetrics(
    questionResults: EvaluationQuestion[]
): AggregatedMetrics {
    const metrics = [
        'ragFaithfulness',
        'ragAnswerRelevancy',
        'ragContextPrecision',
        'ragContextRecall',
        // ... more metrics
    ];

    const aggregated: Record<string, { mean: number; stdDev: number }> = {};

    for (const metric of metrics) {
        const values = questionResults
            .map(q => q[metric])
            .filter((v): v is number => v !== null);

        if (values.length > 0) {
            aggregated[metric] = {
                mean: values.reduce((a, b) => a + b, 0) / values.length,
                stdDev: calculateStdDev(values),
            };
        }
    }

    return aggregated;
}
```

### 5.2 Summary Statistics

```typescript
interface EvaluationSummary {
    totalQuestions: number;
    completedQuestions: number;

    ragMetrics: {
        faithfulness: { mean: number; stdDev: number };
        answerRelevancy: { mean: number; stdDev: number };
        // ... more
    };

    nonRagMetrics: {
        answerRelevancy: { mean: number; stdDev: number };
        answerCorrectness: { mean: number; stdDev: number };
        hallucinationRate: { mean: number; stdDev: number };
    };

    latencyStats: {
        ragMean: number;
        ragP95: number;
        nonRagMean: number;
    };

    improvement: {
        relevancy: number;      // RAG - NonRAG
        correctness: number;
        hallucination: number;  // NonRAG - RAG (lower is better for hallucination)
    };
}
```

---

## 6. Ablation Study Pipeline

### 6.1 Overview

Ablation study mengevaluasi kontribusi setiap komponen dengan menjalankan evaluasi pada multiple konfigurasi.

### 6.2 Configuration Generation

```typescript
const ABLATION_CONFIGS: AblationConfig[] = [
    {
        name: "Baseline (No RAG)",
        useRag: false,
        useReranker: false,
        retrievalStrategy: "hybrid",
        chunkingStrategy: "recursive",
        useAgenticMode: false,
        useGuardrails: false,
        topK: 0,
    },
    {
        name: "Vector Only",
        useRag: true,
        useReranker: false,
        retrievalStrategy: "vector",
        chunkingStrategy: "recursive",
        useAgenticMode: false,
        useGuardrails: false,
        topK: 10,
    },
    {
        name: "BM25 Only",
        useRag: true,
        useReranker: false,
        retrievalStrategy: "keyword",
        chunkingStrategy: "recursive",
        useAgenticMode: false,
        useGuardrails: false,
        topK: 10,
    },
    {
        name: "Hybrid (No Reranking)",
        useRag: true,
        useReranker: false,
        retrievalStrategy: "hybrid",
        chunkingStrategy: "recursive",
        useAgenticMode: false,
        useGuardrails: false,
        topK: 10,
    },
    {
        name: "Hybrid + Reranking",
        useRag: true,
        useReranker: true,
        rerankerStrategy: "cross_encoder",
        retrievalStrategy: "hybrid",
        chunkingStrategy: "recursive",
        useAgenticMode: false,
        useGuardrails: false,
        topK: 10,
    },
    {
        name: "Full System (Agentic)",
        useRag: true,
        useReranker: true,
        rerankerStrategy: "ensemble",
        retrievalStrategy: "hybrid",
        chunkingStrategy: "recursive",
        useAgenticMode: true,
        useGuardrails: true,
        topK: 10,
    },
];
```

### 6.3 Ablation Execution

```typescript
async function runAblationStudy(
    questions: EvaluationQuestion[],
    configs: AblationConfig[]
): Promise<AblationResult[]> {
    const results: AblationResult[] = [];

    for (const config of configs) {
        console.log(`[Ablation] Running config: ${config.name}`);

        const configResults: EvaluationMetrics[] = [];
        const sampleResults: AblationResult['sampleResults'] = [];

        for (const question of questions) {
            const result = await executeRagPipeline(question, config);
            const metrics = await calculateAllMetrics(result);

            configResults.push(metrics);
            sampleResults.push({
                question: question.question,
                answer: result.answer,
                groundTruth: question.groundTruth,
                contexts: result.contexts,
                latencyMs: result.latencyMs,
            });
        }

        results.push({
            config,
            metrics: aggregateMetrics(configResults),
            perQuestionMetrics: configResults,  // For ANOVA
            sampleResults,
        });
    }

    return results;
}
```

### 6.4 Per-Question Metrics Storage

```typescript
// CRITICAL: Store per-question metrics for valid ANOVA
// ANOVA requires individual data points, not aggregated means

interface AblationResultWithPerQuestion {
    configName: string;
    metrics: Record<string, number>;  // Aggregated means
    perQuestionMetrics: Array<{
        faithfulness: number;
        answerRelevancy: number;
        // ... all metrics per question
    }>;
}
```

---

## 7. Reporting

### 7.1 Markdown Report Generation

```typescript
function generateEvaluationReport(
    summary: EvaluationSummary,
    language: "en" | "id"
): string {
    const template = language === "id" ? `
# Laporan Evaluasi RAG

## Ringkasan
- Total Pertanyaan: ${summary.totalQuestions}
- Pertanyaan Selesai: ${summary.completedQuestions}

## Metrik RAG
| Metrik           | Mean                                                  | Std Dev                                                 |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| Faithfulness     | ${summary.ragMetrics.faithfulness.mean.toFixed(4)}    | ${summary.ragMetrics.faithfulness.stdDev.toFixed(4)}    |
| Answer Relevancy | ${summary.ragMetrics.answerRelevancy.mean.toFixed(4)} | ${summary.ragMetrics.answerRelevancy.stdDev.toFixed(4)} |
...

## Perbandingan RAG vs Non-RAG
| Metrik    | RAG                                                   | Non-RAG                                                  | Peningkatan                                 |
| --------- | ----------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------- |
| Relevancy | ${summary.ragMetrics.answerRelevancy.mean.toFixed(4)} | ${summary.nonRagMetrics.answerRelevancy.mean.toFixed(4)} | ${summary.improvement.relevancy.toFixed(4)} |
...
    ` : `...English version...`;

    return template;
}
```

### 7.2 Statistical Report

```typescript
function generateStatisticalReport(
    comparisons: RAGComparisonResult[],
    ablationAnalysis: AblationAnalysis,
    language: "en" | "id"
): string {
    // See 08_statistical_analysis.md for details
}
```

---

## 8. Human Annotation Integration

### 8.1 Annotation Workflow

```
1. Evaluation Run Complete
         │
         ▼
2. Export Questions for Annotation
   (selected sample or all)
         │
         ▼
3. Human Annotators Rate
   • Faithfulness (1-5)
   • Relevancy (1-5)
   • Correctness (1-5)
   • Hallucination (Y/N)
         │
         ▼
4. Import Annotations
         │
         ▼
5. Correlation Analysis
   • Pearson (linear)
   • Spearman (rank)
   • Cohen's Kappa (agreement)
```

### 8.2 Annotation Schema

```typescript
interface HumanAnnotation {
    evaluationQuestionId: string;
    annotatorId: string;

    // 1-5 Likert scale
    faithfulnessRating?: number;
    relevancyRating?: number;
    correctnessRating?: number;

    // Binary
    hasHallucination?: boolean;
    hallucinationNotes?: string;

    // Overall
    overallQuality?: number;
    annotationTimeMs?: number;
    notes?: string;
}
```

### 8.3 Correlation Calculation

```typescript
function calculateCorrelation(
    automatedScores: number[],
    humanScores: number[]
): {
    pearson: { r: number; pValue: number };
    spearman: { rho: number; pValue: number };
} {
    return {
        pearson: pearsonCorrelation(automatedScores, humanScores),
        spearman: spearmanCorrelation(automatedScores, humanScores),
    };
}
```

---

## 9. Error Handling

### 9.1 Retry Logic

```typescript
async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000
): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            console.warn(`Attempt ${attempt} failed, retrying...`);
            await sleep(delayMs * attempt);
        }
    }
    throw new Error("Unreachable");
}
```

### 9.2 Graceful Degradation

```typescript
async function calculateMetricSafely(
    metricFn: () => Promise<number>,
    defaultValue = 0
): Promise<number> {
    try {
        return await withRetry(metricFn);
    } catch (error) {
        console.error(`Metric calculation failed: ${error}`);
        return defaultValue;
    }
}
```

### 9.3 Status Update on Failure

```typescript
try {
    await runEvaluation(runId);
    await db.update(evaluationRuns)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(evaluationRuns.id, runId));
} catch (error) {
    await db.update(evaluationRuns)
        .set({
            status: "failed",
            // Store error for debugging
        })
        .where(eq(evaluationRuns.id, runId));
    throw error;
}
```

---

## 10. Referensi Silang

| Dokumen                                                    | Konten             |
| ---------------------------------------------------------- | ------------------ |
| [06_evaluation_framework.md](./06_evaluation_framework.md) | Definisi metrik    |
| [08_statistical_analysis.md](./08_statistical_analysis.md) | Analisis statistik |
| [09_database_schema.md](./09_database_schema.md)           | Schema penyimpanan |

---

*Dokumen ini merupakan bagian dari dokumentasi teknis Academic Research RAG Chatbot.*
