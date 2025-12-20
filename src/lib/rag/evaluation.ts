/**
 * @fileoverview RAGAS Metrics and Ablation Studies for RAG Evaluation
 *
 * WHY RAGAS Metrics:
 * - Standard RAG evaluation framework from "RAGAS: Automated Evaluation of RAG" (Shahul et al., 2023)
 * - LLM-based metrics eliminate need for manual labeling
 * - Comprehensive coverage: faithfulness, relevancy, precision, recall
 * - Research-backed correlation with human judgments (0.8-0.9 Pearson correlation)
 *
 * WHY Ablation Studies:
 * - Identify which components contribute to performance (vector vs BM25 vs reranking)
 * - Quantify impact of design decisions (chunking strategy, reranker choice)
 * - Enable evidence-based optimization (not just intuition)
 * - Required for academic publication of research findings
 *
 * Key Metrics Implemented:
 * 1. Core RAGAS: faithfulness, answer relevancy, context precision/recall, correctness
 * 2. Domain-Specific: academic rigor, citation accuracy, terminology correctness
 * 3. Hallucination: hallucination rate, factual consistency, source attribution, contradiction score
 * 4. Retrieval Quality: NDCG, MRR, Precision@K
 * 5. Efficiency: latency breakdown, token usage, throughput
 *
 * Research Foundation:
 * - RAGAS: "Automated Evaluation of Retrieval-Augmented Generation" (Shahul et al., 2023)
 * - NDCG: "Cumulated Gain-Based Evaluation of IR Techniques" (Järvelin & Kekäläinen, 2002)
 * - Faithfulness: NLI-based approach from "TRUE: Re-evaluating Factual Consistency" (Honovich et al., 2022)
 */

import { cosineSimilarity, generateObject, generateText } from "ai";
import consola from "consola";
import { z } from "zod";
import { CHAT_MODEL, JUDGE_MODEL, telemetryConfig } from "@/lib/ai";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { runAgenticRag } from "./agentic-rag";
import { buildRagPrompt, SYSTEM_PROMPTS } from "./context-builder";
import { getCachedEmbedding } from "./evaluation-utils";
import { hybridRetrieve } from "./hybrid-retrieval";
import type { RerankerStrategy } from "./reranker";

// Set consola level to show more debug info during evaluation
// Level 4 = debug, Level 3 = info, Level 5 = verbose
consola.level = 4;

/**
 * Comprehensive evaluation metrics for RAG systems
 *
 * WHY So Many Metrics:
 * - No single metric captures all aspects of RAG quality
 * - Different stakeholders care about different metrics (researchers vs users vs operators)
 * - Tradeoffs exist (latency vs quality, recall vs precision)
 * - Academic research requires rigorous multi-faceted evaluation
 *
 * Metric Categories:
 * 1. **Core RAGAS** (standard RAG evaluation)
 * 2. **Domain-Specific** (Indonesian university context)
 * 3. **Hallucination Detection** (critical for academic trust)
 * 4. **Retrieval Quality** (how good is document selection?)
 * 5. **Efficiency** (latency, throughput, cost)
 *
 * @property faithfulness - Are claims grounded in retrieved sources? (0-1)
 * @property answerRelevancy - Does answer match query intent? (0-1)
 * @property contextPrecision - Are retrieved chunks relevant to query? (0-1)
 * @property contextRecall - Are all relevant facts retrieved? (0-1)
 * @property answerCorrectness - Semantic + factual similarity to ground truth (0-1)
 * @property academicRigor - Quality of academic language and argumentation (0-1)
 * @property citationAccuracy - Are citations correct and verifiable? (0-1)
 * @property terminologyCorrectness - Proper use of technical terms? (0-1)
 * @property hallucinationRate - Proportion of fabricated information (0-1, lower is better)
 * @property factualConsistency - NLI-based consistency with sources (0-1)
 * @property sourceAttribution - Are claims properly attributed? (0-1)
 * @property contradictionScore - Presence of logical contradictions (0-1, higher is better)
 * @property retrievalNdcg - NDCG@K for retrieval quality (0-1)
 * @property retrievalMrr - Mean Reciprocal Rank (0-1)
 * @property retrievalPrecision - Precision@K for retrieval (0-1)
 * @property totalLatencyMs - End-to-end latency (milliseconds)
 * @property retrievalLatencyMs - Time for retrieval phase (milliseconds)
 * @property rerankingLatencyMs - Time for reranking phase (milliseconds)
 * @property generationLatencyMs - Time for LLM generation (milliseconds)
 * @property agentReasoningLatencyMs - Time for agentic planning/reasoning (milliseconds)
 * @property tokenEfficiency - Output tokens / input tokens ratio
 * @property tokensPerSecond - Throughput metric
 * @property toolCallLatencyMs - Time spent in tool executions (agentic mode)
 * @property planningLatencyMs - Time spent in query planning (agentic mode)
 * @property synthesisLatencyMs - Time spent synthesizing final answer (agentic mode)
 * @property totalAgentSteps - Number of steps in agentic workflow
 * @property avgStepLatencyMs - Average latency per agentic step
 */
export interface EvaluationMetrics {
    // Core RAGAS metrics
    faithfulness: number;
    answerRelevancy: number;
    contextPrecision: number;
    contextRecall: number;
    contextRelevancy: number; // NEW: RAGAS Context Relevancy metric
    answerCorrectness: number;
    // Domain-specific metrics (Indonesian university information)
    citationAccuracy: number;
    // Hallucination-specific metrics
    hallucinationRate: number;
    factualConsistency: number;
    sourceAttribution: number;
    contradictionScore: number;
    // Retrieval quality metrics
    retrievalNdcg: number;
    retrievalMrr: number;
    retrievalPrecision: number;
    // Latency and efficiency metrics
    totalLatencyMs: number;
    retrievalLatencyMs: number;
    rerankingLatencyMs: number;
    generationLatencyMs: number;
    agentReasoningLatencyMs: number;
    tokenEfficiency: number;
    tokensPerSecond: number;
    // Agentic-specific latency
    toolCallLatencyMs: number;
    planningLatencyMs: number;
    synthesisLatencyMs: number;
    totalAgentSteps: number;
    avgStepLatencyMs: number;
}

// Top-level regex used for token splitting to avoid re-creating the literal repeatedly
export const WHITESPACE_REGEX = /\s+/;

// Zod schemas for structured LLM outputs
const GroundingMetricsSchema = z.object({
    faithfulness: z.number().min(0).max(1).describe("How much of the answer is supported by context (0-1)"),
    hallucinationRate: z.number().min(0).max(1).describe("Proportion of fabricated information (0=none, 1=all)"),
    factualConsistency: z.number().min(0).max(1).describe("NLI-based consistency score (0-1)"),
    sourceAttribution: z.number().min(0).max(1).describe("How well claims are attributed to sources (0-1)"),
    contradictionScore: z.number().min(0).max(1).describe("Freedom from contradictions (1=no contradictions)"),
});

const ContextQualityMetricsSchema = z.object({
    contextPrecision: z.number().min(0).max(1).describe("Proportion of retrieved chunks that are relevant (0-1)"),
    contextRecall: z.number().min(0).max(1).describe("Proportion of ground truth info covered by contexts (0-1)"),
    contextRelevancy: z.number().min(0).max(1).describe("Average relevance of all chunks to query (0-1)"),
});

const SingleScoreSchema = z.object({
    score: z.number().min(0).max(1).describe("Evaluation score between 0 and 1"),
});

const ClaimsArraySchema = z.object({
    claims: z.array(z.string()).describe("Array of factual claims extracted from the answer"),
});

const SyntheticQuestionsSchema = z.object({
    questions: z.array(z.string()).describe("Array of synthetic questions that could be answered by this answer"),
});

const ClaimVerificationSchema = z.object({
    supported: z.boolean().describe("Whether the claim is supported by the context"),
});

// Helper: aggregate latency and token metrics into a compact object
function aggregateLatencyAndTokenMetrics(
    latencyTracker: ReturnType<typeof createLatencyTracker> | undefined,
    answer: string,
    contexts: string[]
) {
    const profile = latencyTracker?.getProfile();
    const totalLatencyMs = profile?.totalMs || 0;
    const retrievalLatencyMs = latencyTracker?.getPhaseLatency("retrieval") || 0;
    const rerankingLatencyMs = latencyTracker?.getPhaseLatency("reranking") || 0;
    const generationLatencyMs = latencyTracker?.getPhaseLatency("generation") || 0;
    const agentReasoningLatencyMs = latencyTracker?.getPhaseLatency("planning") || 0;
    const toolCallLatencyMs = latencyTracker?.getPhaseLatency("tool_call") || 0;
    const planningLatencyMs = latencyTracker?.getPhaseLatency("planning") || 0;
    const synthesisLatencyMs = latencyTracker?.getPhaseLatency("synthesis") || 0;

    const breakdown = latencyTracker?.getBreakdown() || [];
    const totalAgentSteps = breakdown.filter((b) => ["tool_call", "planning", "synthesis"].includes(b.phase)).length;
    const avgStepLatencyMs =
        totalAgentSteps > 0 ? (toolCallLatencyMs + planningLatencyMs + synthesisLatencyMs) / totalAgentSteps : 0;

    const answerTokens = answer.split(WHITESPACE_REGEX).filter(Boolean).length;
    const contextTokens = contexts.join(" ").split(WHITESPACE_REGEX).filter(Boolean).length;
    const tokensPerSecond = totalLatencyMs > 0 ? (answerTokens / totalLatencyMs) * 1000 : 0;
    const tokenEfficiency = contextTokens > 0 ? answerTokens / contextTokens : 0;

    return {
        totalLatencyMs,
        retrievalLatencyMs,
        rerankingLatencyMs,
        generationLatencyMs,
        agentReasoningLatencyMs,
        toolCallLatencyMs,
        planningLatencyMs,
        synthesisLatencyMs,
        totalAgentSteps,
        avgStepLatencyMs,
        tokensPerSecond,
        tokenEfficiency,
    };
}

export interface LatencyBreakdown {
    timestamp: number;
    phase: "retrieval" | "reranking" | "generation" | "tool_call" | "planning" | "synthesis" | "guardrails";
    durationMs: number;
    metadata?: {
        toolName?: string;
        stepIndex?: number;
        tokensGenerated?: number;
        documentsProcessed?: number;
    };
}

export interface LatencyProfile {
    breakdown: LatencyBreakdown[];
    totalMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    avgMs: number;
    stdDevMs: number;
}

export function createLatencyTracker() {
    const breakdown: LatencyBreakdown[] = [];
    let startTime = Date.now();

    return {
        start() {
            startTime = Date.now();
        },

        mark(phase: LatencyBreakdown["phase"], metadata?: LatencyBreakdown["metadata"]) {
            const now = Date.now();
            breakdown.push({
                timestamp: now,
                phase,
                durationMs: now - startTime,
                metadata,
            });
            startTime = now;
        },

        getBreakdown(): LatencyBreakdown[] {
            return breakdown;
        },

        getTotalMs(): number {
            return breakdown.reduce((sum, b) => sum + b.durationMs, 0);
        },

        getPhaseLatency(phase: LatencyBreakdown["phase"]): number {
            return breakdown.filter((b) => b.phase === phase).reduce((sum, b) => sum + b.durationMs, 0);
        },

        getProfile(): LatencyProfile {
            const durations = breakdown.map((b) => b.durationMs).sort((a, b) => a - b);
            const totalMs = this.getTotalMs();
            const avgMs = durations.length > 0 ? totalMs / durations.length : 0;

            // Calculate standard deviation
            const variance = durations.reduce((sum, d) => sum + (d - avgMs) ** 2, 0) / durations.length;
            const stdDevMs = Math.sqrt(variance);

            return {
                breakdown,
                totalMs,
                p50Ms: durations[Math.floor(durations.length * 0.5)] || 0,
                p95Ms: durations[Math.floor(durations.length * 0.95)] || 0,
                p99Ms: durations[Math.floor(durations.length * 0.99)] || 0,
                avgMs,
                stdDevMs,
            };
        },
    };
}

export interface AblationConfig {
    name: string;
    description: string;
    useRag: boolean;
    useReranker: boolean;
    rerankerStrategy?: RerankerStrategy;
    retrievalStrategy: "vector" | "keyword" | "hybrid";
    chunkingStrategy: "recursive" | "semantic" | "sentence_window" | "hierarchical";
    useAgenticMode: boolean;
    useGuardrails: boolean;
    topK: number;
    language: "en" | "id" | "auto";
}

export interface AblationResult {
    config: AblationConfig;
    metrics: EvaluationMetrics;
    latencyProfile: LatencyProfile;
    sampleResults: {
        question: string;
        answer: string;
        groundTruth: string;
        contexts: string[];
        latencyMs: number;
    }[];
    /** Per-question metrics for statistical analysis (ANOVA requires arrays, not averages) */
    perQuestionMetrics: EvaluationMetrics[];
}

// Language detection helper - always returns Indonesian
function detectLanguage(_text: string): "id" {
    return "id";
}

// ============================================================================
// BATCHED METRIC CALCULATIONS
// ============================================================================
// These functions batch multiple related metrics into single LLM calls to reduce
// API overhead by ~80%. Each batch returns a JSON object with all related scores.

/**
 * Batched Grounding Metrics Calculation
 *
 * WHY BATCH: Previously 4 separate LLM calls for these related metrics.
 * Now 1 call returns all grounding-related scores in a single JSON response.
 *
 * Metrics included:
 * - faithfulness: Are claims grounded in retrieved sources? (0-1)
 * - hallucinationRate: Proportion of fabricated information (0-1, lower is better)
 * - factualConsistency: NLI-based consistency with sources (0-1)
 * - sourceAttribution: Are claims properly attributed? (0-1)
 * - contradictionScore: Absence of logical contradictions (0-1, higher is better)
 */
export interface GroundingMetrics {
    faithfulness: number;
    hallucinationRate: number;
    factualConsistency: number;
    sourceAttribution: number;
    contradictionScore: number;
}

export async function calculateGroundingMetricsBatched(answer: string, contexts: string[]): Promise<GroundingMetrics> {
    const defaultMetrics: GroundingMetrics = {
        faithfulness: 0,
        hallucinationRate: 1,
        factualConsistency: 0,
        sourceAttribution: 0,
        contradictionScore: 0,
    };

    if (!answer || contexts.length === 0) {
        console.warn("[calculateGroundingMetricsBatched] WARNING: Returning defaults - empty answer or contexts", {
            hasAnswer: !!answer,
            answerLength: answer?.length || 0,
            contextsCount: contexts.length,
        });
        consola.debug("[calculateGroundingMetricsBatched] Skipping - empty answer or contexts");
        return defaultMetrics;
    }

    const contextText = contexts.join("\n\n---\n\n");

    try {
        consola.debug(
            `[calculateGroundingMetricsBatched] Evaluating grounding metrics - answer: ${answer.length} chars, contexts: ${contexts.length}`
        );

        const { object } = await generateObject({
            model: JUDGE_MODEL,
            schema: GroundingMetricsSchema,
            prompt: `Anda adalah evaluator untuk sistem RAG (Retrieval-Augmented Generation). Evaluasi jawaban berikut berdasarkan konteks yang tersedia.

**KONTEKS SUMBER:**
${contextText}

**JAWABAN YANG DIEVALUASI:**
${answer}

**TUGAS:** Evaluasi 5 metrik grounding berikut dan berikan skor 0-1 untuk masing-masing:

1. **faithfulness**: Seberapa besar klaim dalam jawaban didukung oleh konteks? (1.0 = semua klaim didukung, 0.0 = tidak ada yang didukung)

2. **hallucinationRate**: Seberapa banyak informasi yang dibuat-buat/tidak ada dalam konteks? (0.0 = tidak ada halusinasi, 1.0 = sepenuhnya halusinasi)

3. **factualConsistency**: Menggunakan pendekatan NLI - apakah jawaban konsisten dengan konteks? (1.0 = entailment penuh, 0.5 = netral, 0.0 = kontradiksi)

4. **sourceAttribution**: Apakah klaim-klaim penting diatribusikan dengan benar ke sumber? (1.0 = atribusi sempurna, 0.0 = tidak ada atribusi)

5. **contradictionScore**: Apakah jawaban bebas dari kontradiksi internal dan dengan konteks? (1.0 = tidak ada kontradiksi, 0.0 = kontradiksi berat)`,
            temperature: 0.1,
        });

        const result: GroundingMetrics = {
            faithfulness: clampScore(object.faithfulness),
            hallucinationRate: clampScore(object.hallucinationRate),
            factualConsistency: clampScore(object.factualConsistency),
            sourceAttribution: clampScore(object.sourceAttribution),
            contradictionScore: clampScore(object.contradictionScore),
        };

        consola.debug(`result: ${JSON.stringify(result)}`);

        consola.debug(
            `[calculateGroundingMetricsBatched] Result - faithfulness: ${result.faithfulness.toFixed(3)}, hallucination: ${result.hallucinationRate.toFixed(3)}`
        );

        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[calculateGroundingMetricsBatched] CRITICAL ERROR:", errorMessage);
        console.error("[calculateGroundingMetricsBatched] Stack:", error instanceof Error ? error.stack : "No stack");
        console.error(
            "[calculateGroundingMetricsBatched] Input - answer length:",
            answer.length,
            "contexts:",
            contexts.length
        );
        consola.error("[calculateGroundingMetricsBatched] Error:", error);
        return defaultMetrics;
    }
}

/**
 * Batched Context Quality Metrics Calculation
 *
 * WHY BATCH: Previously 3 separate LLM calls for context evaluation.
 * Now 1 call evaluates all context-related metrics together.
 *
 * Metrics included:
 * - contextPrecision: Are retrieved chunks relevant to query? (0-1)
 * - contextRecall: Are all relevant facts retrieved? (0-1)
 * - contextRelevancy: Average relevance of all chunks to query (0-1)
 */
export interface ContextQualityMetrics {
    contextPrecision: number;
    contextRecall: number;
    contextRelevancy: number;
}

export async function calculateContextMetricsBatched(
    question: string,
    contexts: string[],
    groundTruth: string
): Promise<ContextQualityMetrics> {
    const defaultMetrics: ContextQualityMetrics = {
        contextPrecision: 0,
        contextRecall: 0,
        contextRelevancy: 0,
    };

    if (!question || contexts.length === 0) {
        console.warn("[calculateContextMetricsBatched] WARNING: Returning defaults - empty question or contexts", {
            hasQuestion: !!question,
            questionLength: question?.length || 0,
            contextsCount: contexts.length,
        });
        consola.debug("[calculateContextMetricsBatched] Skipping - empty question or contexts");
        return defaultMetrics;
    }

    try {
        consola.debug(
            `[calculateContextMetricsBatched] Evaluating context metrics - question: ${question.length} chars, contexts: ${contexts.length}`
        );

        const { object } = await generateObject({
            model: JUDGE_MODEL,
            schema: ContextQualityMetricsSchema,
            prompt: `Anda adalah evaluator untuk sistem RAG. Evaluasi kualitas konteks yang diambil untuk menjawab pertanyaan.

**PERTANYAAN:**
${question}

**JAWABAN BENAR (Ground Truth):**
${groundTruth || "(Tidak tersedia)"}

**KONTEKS YANG DIAMBIL:**
${contexts.map((c, i) => `[${i + 1}] ${c.substring(0, 500)}${c.length > 500 ? "..." : ""}`).join("\n\n")}

**TUGAS:** Evaluasi 3 metrik kualitas konteks berikut:

1. **contextPrecision**: Berapa proporsi konteks yang relevan untuk menjawab pertanyaan? (1.0 = semua relevan, 0.0 = tidak ada yang relevan)

2. **contextRecall**: Berapa persen informasi dari jawaban benar yang tercakup dalam konteks? (1.0 = semua tercakup, 0.0 = tidak ada yang tercakup)

3. **contextRelevancy**: Rata-rata relevansi semua konteks terhadap pertanyaan (1.0 = sangat relevan, 0.0 = tidak relevan)`,
            temperature: 0.1,
        });

        const result: ContextQualityMetrics = {
            contextPrecision: clampScore(object.contextPrecision),
            contextRecall: clampScore(object.contextRecall),
            contextRelevancy: clampScore(object.contextRelevancy),
        };

        consola.debug(
            `[calculateContextMetricsBatched] Result - precision: ${result.contextPrecision.toFixed(3)}, recall: ${result.contextRecall.toFixed(3)}, relevancy: ${result.contextRelevancy.toFixed(3)}`
        );

        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[calculateContextMetricsBatched] CRITICAL ERROR:", errorMessage);
        console.error("[calculateContextMetricsBatched] Stack:", error instanceof Error ? error.stack : "No stack");
        console.error(
            "[calculateContextMetricsBatched] Input - question length:",
            question.length,
            "contexts:",
            contexts.length,
            "groundTruth length:",
            groundTruth.length
        );
        consola.error("[calculateContextMetricsBatched] Error:", error);
        return defaultMetrics;
    }
}

/**
 * Helper function to clamp score between 0 and 1
 */
function clampScore(score: unknown): number {
    const num = Number(score);
    if (Number.isNaN(num)) return 0;
    return Math.max(0, Math.min(1, num));
}

// ============================================================================
// INDIVIDUAL METRIC CALCULATIONS (kept for backward compatibility)
// ============================================================================

// Core RAGAS Metrics

/**
 * RAGAS-Faithful Faithfulness Calculation
 *
 * This implementation follows the original RAGAS paper (Shahul et al., 2023):
 * 1. Decompose the answer into individual factual claims
 * 2. Check each claim against the context using NLI (entailment)
 * 3. Return the proportion of claims that are supported
 *
 * WHY this approach:
 * - More granular than single-score LLM judgment
 * - Each claim is independently verified
 * - Aligns with academic NLI-based factuality research
 */
export async function calculateFaithfulness(answer: string, contexts: string[]): Promise<number> {
    consola.debug(
        `[calculateFaithfulness] RAGAS-faithful calculation - answer: ${answer.length} chars, contexts: ${contexts.length}`
    );
    if (!answer || contexts.length === 0) {
        consola.debug("[calculateFaithfulness] Skipping - empty answer or contexts");
        return 0;
    }

    try {
        // Step 1: Decompose answer into individual claims
        consola.debug("[calculateFaithfulness] Step 1: Decomposing answer into claims");
        const { object: claimsResult } = await generateObject({
            model: JUDGE_MODEL,
            schema: ClaimsArraySchema,
            prompt: `Pecah jawaban berikut menjadi klaim-klaim faktual individual. Setiap klaim harus merupakan pernyataan tunggal yang dapat diverifikasi.

Jawaban: ${answer}

Ekstrak klaim-klaim faktual dari jawaban. Jika tidak ada klaim faktual, kembalikan array kosong.`,
            temperature: 0.1,
        });

        const claims = claimsResult.claims;

        if (claims.length === 0) {
            consola.debug("[calculateFaithfulness] No claims found, returning 1.0");
            return 1.0; // No claims to verify = faithful by default
        }

        consola.debug(`[calculateFaithfulness] Step 2: Verifying ${claims.length} claims against context`);

        // Step 2: Check each claim against contexts using NLI
        const contextText = contexts.join("\n\n");
        let supportedCount = 0;

        // Process claims in parallel for efficiency (batch of 5)
        const batchSize = 5;
        for (let i = 0; i < claims.length; i += batchSize) {
            const batch = claims.slice(i, i + batchSize);
            const results = await Promise.all(
                batch.map(async (claim) => {
                    const { object } = await generateObject({
                        model: JUDGE_MODEL,
                        schema: ClaimVerificationSchema,
                        prompt: `Konteks:\n${contextText}\n\nKlaim: ${claim}\n\nApakah klaim ini DIDUKUNG oleh konteks? Tentukan apakah klaim didukung (true) atau tidak didukung (false) berdasarkan informasi dalam konteks.`,
                        temperature: 0.1,
                    });
                    return object.supported;
                })
            );
            supportedCount += results.filter(Boolean).length;
        }

        const result = supportedCount / claims.length;
        consola.debug(
            `[calculateFaithfulness] Result: ${result.toFixed(3)} (${supportedCount}/${claims.length} claims supported)`
        );
        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        consola.error(
            `[calculateFaithfulness] FAILED - answer length: ${answer.length}, contexts: ${contexts.length}, error: ${errorMessage}`
        );
        return 0;
    }
}

/**
 * RAGAS-Faithful Answer Relevancy Calculation
 *
 * This implementation follows the original RAGAS paper (Shahul et al., 2023):
 * 1. Generate N synthetic questions from the answer
 * 2. Compute embeddings for original question and synthetic questions
 * 3. Return average cosine similarity between original and synthetic questions
 *
 * WHY this approach:
 * - Tests if the answer could have been generated from the question
 * - More robust than direct answer-question embedding comparison
 * - Captures semantic alignment between question intent and answer content
 *
 * @param question - The original user question
 * @param answer - The generated answer
 * @param numQuestions - Number of synthetic questions to generate (default: 3)
 */
export async function calculateAnswerRelevancy(question: string, answer: string, numQuestions = 3): Promise<number> {
    if (!(question && answer)) return 0;

    try {
        consola.debug(
            `[calculateAnswerRelevancy] RAGAS-faithful calculation - generating ${numQuestions} synthetic questions`
        );

        // Step 1: Generate N synthetic questions from the answer
        const { object: questionsResult } = await generateObject({
            model: JUDGE_MODEL,
            schema: SyntheticQuestionsSchema,
            prompt: `Berdasarkan jawaban berikut, hasilkan ${numQuestions} pertanyaan yang kemungkinan besar dijawab oleh jawaban ini.

Jawaban: ${answer}

Hasilkan ${numQuestions} pertanyaan dalam Bahasa Indonesia yang bisa dijawab oleh jawaban di atas.`,
            temperature: 0.3,
        });

        const syntheticQuestions = questionsResult.questions;

        if (syntheticQuestions.length === 0) {
            consola.debug("[calculateAnswerRelevancy] No synthetic questions generated, using fallback");
            const [questionEmbed, answerEmbed] = await Promise.all([
                getCachedEmbedding(question),
                getCachedEmbedding(answer),
            ]);
            return cosineSimilarity(questionEmbed.embedding, answerEmbed.embedding);
        }

        // Step 2: Compute embeddings for all questions (using cache for efficiency)
        consola.debug(
            `[calculateAnswerRelevancy] Computing embeddings for ${syntheticQuestions.length} synthetic questions`
        );
        const [originalEmbed, ...syntheticEmbeds] = await Promise.all([
            getCachedEmbedding(question),
            ...syntheticQuestions.map((q: string) => getCachedEmbedding(q)),
        ]);

        // Step 3: Calculate average cosine similarity
        const similarities = syntheticEmbeds.map((e: { embedding: number[] }) =>
            cosineSimilarity(originalEmbed.embedding, e.embedding)
        );

        const avgSimilarity = similarities.reduce((a: number, b: number) => a + b, 0) / similarities.length;
        consola.debug(
            `[calculateAnswerRelevancy] Result: ${avgSimilarity.toFixed(3)} (avg of ${similarities.length} similarities)`
        );

        return avgSimilarity;
    } catch (error) {
        consola.error("[calculateAnswerRelevancy] Calculation error:", error);
        return 0;
    }
}

export async function calculateContextPrecision(
    question: string,
    contexts: string[],
    groundTruth: string
): Promise<number> {
    if (!question || contexts.length === 0 || !groundTruth) return 0;

    try {
        const { object } = await generateObject({
            model: JUDGE_MODEL,
            schema: SingleScoreSchema,
            prompt: `Anda mengevaluasi presisi konteks yang diambil untuk menjawab pertanyaan.

Pertanyaan: ${question}

Jawaban Benar: ${groundTruth}

Konteks yang Diambil:
${contexts.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")}

Tugas: Untuk setiap konteks, tentukan apakah mengandung informasi yang berguna untuk menjawab pertanyaan dengan benar.
Hitung berapa banyak konteks yang relevan dan bagi dengan total konteks.
Berikan skor antara 0 dan 1.`,
            temperature: 0.1,
        });

        return clampScore(object.score);
    } catch (error) {
        consola.error("Context precision calculation error:", error);
        return 0;
    }
}

export async function calculateContextRecall(groundTruth: string, contexts: string[]): Promise<number> {
    if (!groundTruth || contexts.length === 0) return 0;

    try {
        const { object } = await generateObject({
            model: JUDGE_MODEL,
            schema: SingleScoreSchema,
            prompt: `Anda mengevaluasi recall dari konteks yang diambil.

Jawaban Benar: ${groundTruth}

Konteks yang Diambil:
${contexts.join("\n\n")}

Tugas: Tentukan berapa persen informasi dalam jawaban benar yang tercakup oleh konteks yang diambil.
Berikan skor antara 0 dan 1:
- 1.0 = Semua informasi dalam jawaban benar ada di konteks
- 0.0 = Tidak ada informasi dari jawaban benar di konteks`,
            temperature: 0.1,
        });

        return clampScore(object.score);
    } catch (error) {
        consola.error("Context recall calculation error:", error);
        return 0;
    }
}

/**
 * NEW: RAGAS Context Relevancy Calculation
 *
 * This metric was MISSING from the original implementation.
 * It measures how relevant each retrieved context chunk is to the query.
 *
 * WHY this metric matters:
 * - Context Precision tells us if relevant chunks rank higher
 * - Context Relevancy tells us the absolute relevance of all chunks
 * - Low relevancy = retrieval is returning irrelevant documents
 *
 * @param question - The user query
 * @param contexts - Array of retrieved context chunks
 * @returns Average relevancy score (0-1)
 */
export async function calculateContextRelevancy(question: string, contexts: string[]): Promise<number> {
    if (!question || contexts.length === 0) return 0;

    try {
        consola.debug(`[calculateContextRelevancy] Evaluating ${contexts.length} contexts for query relevancy`);

        // Evaluate each context's relevance to the question in parallel
        const relevancePromises = contexts.map(async (context) => {
            const { object } = await generateObject({
                model: JUDGE_MODEL,
                schema: SingleScoreSchema,
                prompt: `Pertanyaan: ${question}

Konteks yang diambil: ${context.substring(0, 1000)}

Seberapa relevan konteks ini untuk menjawab pertanyaan?
Berikan skor 0-1 di mana:
- 1.0 = Sangat relevan, berisi informasi langsung untuk menjawab
- 0.5 = Cukup relevan, berisi informasi terkait
- 0.0 = Tidak relevan sama sekali`,
                temperature: 0.1,
            });

            return clampScore(object.score);
        });

        const relevanceScores = await Promise.all(relevancePromises);
        const avgRelevancy = relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length;

        consola.debug(
            `[calculateContextRelevancy] Result: ${avgRelevancy.toFixed(3)} (avg of ${relevanceScores.length} contexts)`
        );
        return avgRelevancy;
    } catch (error) {
        consola.error("[calculateContextRelevancy] Calculation error:", error);
        return 0;
    }
}

export async function calculateAnswerCorrectness(answer: string, groundTruth: string): Promise<number> {
    if (!(answer && groundTruth)) return 0;

    try {
        const [answerEmbed, truthEmbed] = await Promise.all([
            generateEmbedding(answer),
            generateEmbedding(groundTruth),
        ]);

        const semanticSimilarity = cosineSimilarity(answerEmbed.embedding, truthEmbed.embedding);

        const { object } = await generateObject({
            model: JUDGE_MODEL,
            schema: SingleScoreSchema,
            prompt: `Anda membandingkan dua jawaban untuk kebenaran faktual.

Jawaban yang Dihasilkan: ${answer}

Jawaban Benar: ${groundTruth}

Tugas: Evaluasi seberapa benar secara faktual jawaban yang dihasilkan dibandingkan dengan jawaban benar.
Pertimbangkan akurasi faktual dan kelengkapan.
Berikan skor antara 0 dan 1.`,
            temperature: 0.1,
        });

        const validFactualScore = clampScore(object.score);

        return semanticSimilarity * 0.3 + validFactualScore * 0.7;
    } catch (error) {
        consola.error("Answer correctness calculation error:", error);
        return 0;
    }
}

export async function calculateCitationAccuracy(answer: string, contexts: string[]): Promise<number> {
    if (!answer || contexts.length === 0) return 0;

    try {
        const { object } = await generateObject({
            model: JUDGE_MODEL,
            schema: SingleScoreSchema,
            prompt: `Evaluasi akurasi sitasi dan referensi dalam jawaban berikut.

Jawaban: ${answer}

Konteks sumber: ${contexts.join("\n\n")}

Kriteria:
1. Apakah klaim-klaim utama memiliki dukungan dari konteks?
2. Apakah atribusi sumber dilakukan dengan benar?
3. Apakah tidak ada fabrikasi referensi?
4. Apakah kutipan akurat terhadap sumber asli?

Berikan skor 0-1.`,
            temperature: 0.1,
        });

        return clampScore(object.score);
    } catch (error) {
        consola.error("Citation accuracy calculation error:", error);
        return 0;
    }
}

export async function calculateHallucinationRate(answer: string, contexts: string[]): Promise<number> {
    if (!answer) return 1; // No answer = 100% hallucination

    try {
        // Different prompt depending on whether contexts are available
        const hasContexts = contexts && contexts.length > 0 && contexts.some((c) => c.trim().length > 0);

        const prompt = hasContexts
            ? `Analisis jawaban berikut untuk mendeteksi halusinasi (informasi yang dibuat-buat atau tidak akurat).

Jawaban: ${answer}

Konteks yang tersedia: ${contexts.join("\n\n")}

Identifikasi:
1. Fakta yang tidak ada dalam konteks dan tidak dapat diverifikasi
2. Klaim yang bertentangan dengan konteks
3. Detail spesifik (angka, nama, tanggal) yang tidak didukung
4. Generalisasi berlebihan tanpa dasar

Berikan TINGKAT HALUSINASI 0-1 (0 = tidak ada halusinasi, 1 = sepenuhnya halusinasi).`
            : `Analisis jawaban berikut untuk mendeteksi halusinasi (informasi yang dibuat-buat atau tidak akurat).
TIDAK ADA konteks yang tersedia - jawaban ini dibuat tanpa RAG.

Jawaban: ${answer}

Identifikasi potensi halusinasi:
1. Fakta spesifik yang tidak dapat diverifikasi (angka, nama, tanggal, URL)
2. Klaim yang terlalu pasti tentang informasi yang memerlukan sumber
3. Detail teknis yang mungkin dibuat-buat
4. Generalisasi berlebihan

PENTING: Jawaban tanpa konteks cenderung memiliki LEBIH BANYAK halusinasi.
Berikan TINGKAT HALUSINASI 0-1 (0 = tidak ada halusinasi, 1 = sepenuhnya halusinasi).
Untuk jawaban tanpa konteks yang mengandung klaim spesifik, berikan skor lebih tinggi (0.4-0.8).`;

        const { object } = await generateObject({
            model: JUDGE_MODEL,
            schema: SingleScoreSchema,
            prompt,
            temperature: 0.1,
        });

        return clampScore(object.score);
    } catch (error) {
        consola.error("Hallucination rate calculation error:", error);
        return 0.5;
    }
}

export async function calculateFactualConsistency(answer: string, contexts: string[]): Promise<number> {
    if (!answer || contexts.length === 0) return 0;

    try {
        // Use NLI-style approach: check if answer is entailed by contexts
        const { object } = await generateObject({
            model: JUDGE_MODEL,
            schema: SingleScoreSchema,
            prompt: `Evaluasi konsistensi faktual menggunakan pendekatan Natural Language Inference.

Premis (Konteks):
${contexts.join("\n\n")}

Hipotesis (Jawaban): ${answer}

Tentukan hubungan:
- ENTAILMENT (1.0): Jawaban sepenuhnya didukung oleh konteks
- NEUTRAL (0.5): Jawaban tidak bertentangan tapi tidak sepenuhnya didukung
- CONTRADICTION (0.0): Jawaban bertentangan dengan konteks

Berikan skor 0-1 berdasarkan tingkat entailment.`,
            temperature: 0.1,
        });

        return clampScore(object.score);
    } catch (error) {
        consola.error("Factual consistency calculation error:", error);
        return 0.5;
    }
}

export async function calculateSourceAttribution(answer: string, contexts: string[]): Promise<number> {
    if (!answer || contexts.length === 0) return 0;

    try {
        // Check if claims are properly attributed to sources
        const { object } = await generateObject({
            model: JUDGE_MODEL,
            schema: SingleScoreSchema,
            prompt: `Evaluasi atribusi sumber dalam jawaban.

Jawaban: ${answer}

Sumber yang tersedia: ${contexts.length} konteks

Kriteria:
1. Apakah klaim-klaim penting diatribusikan ke sumber?
2. Apakah tidak ada klaim tanpa sumber yang seharusnya memiliki sumber?
3. Apakah atribusi akurat (tidak salah mengaitkan)?
4. Apakah pembaca dapat memverifikasi klaim dari sumber?

Berikan skor 0-1.`,
            temperature: 0.1,
        });

        return clampScore(object.score);
    } catch (error) {
        consola.error("Source attribution calculation error:", error);
        return 0.5;
    }
}

export async function calculateContradictionScore(answer: string, contexts: string[]): Promise<number> {
    if (!answer || contexts.length === 0) return 0;

    try {
        const { object } = await generateObject({
            model: JUDGE_MODEL,
            schema: SingleScoreSchema,
            prompt: `Deteksi kontradiksi dalam jawaban terhadap konteks sumber.

Jawaban: ${answer}

Konteks:
${contexts.join("\n\n")}

Identifikasi kontradiksi:
1. Kontradiksi langsung dengan fakta dalam konteks
2. Inkonsistensi logis
3. Angka atau data yang bertentangan
4. Pernyataan yang saling bertentangan dalam jawaban itu sendiri

Berikan skor KEBEBASAN KONTRADIKSI 0-1 (1 = tidak ada kontradiksi, 0 = kontradiksi berat).`,
            temperature: 0.1,
        });

        return clampScore(object.score);
    } catch (error) {
        consola.error("Contradiction score calculation error:", error);
        return 0.5;
    }
}

export function calculateNDCG(retrievedIds: string[], relevantIds: Set<string>, k?: number): number {
    const results = k ? retrievedIds.slice(0, k) : retrievedIds;
    if (results.length === 0 || relevantIds.size === 0) return 0;

    let dcg = 0;
    results.forEach((id, idx) => {
        if (relevantIds.has(id)) {
            // Formula: rel_i / log2(i + 1). In code: 1 / log2(idx + 2)
            dcg += 1 / Math.log2(idx + 2);
        }
    });

    // Ideal DCG: Assume the top N results were all relevant (where N = size of relevant set)
    let idcg = 0;
    const maxPossibleRelevant = Math.min(relevantIds.size, results.length);
    for (let i = 0; i < maxPossibleRelevant; i++) {
        idcg += 1 / Math.log2(i + 2);
    }

    return idcg > 0 ? dcg / idcg : 0;
}

export function calculateMRR(retrievedIds: string[], relevantIds: Set<string>): number {
    for (let i = 0; i < retrievedIds.length; i++) {
        if (relevantIds.has(retrievedIds[i])) {
            return 1 / (i + 1);
        }
    }
    return 0;
}

export function calculateRetrievalPrecision(retrievedIds: string[], relevantIds: Set<string>, k?: number): number {
    const results = k ? retrievedIds.slice(0, k) : retrievedIds;
    const relevant = results.filter((id) => relevantIds.has(id)).length;
    return results.length > 0 ? relevant / results.length : 0;
}

export async function calculateAllMetrics(
    question: string,
    answer: string,
    contexts: string[],
    groundTruth: string,
    retrievedIds?: string[],
    relevantIds?: Set<string>,
    _domain?: string,
    latencyTracker?: ReturnType<typeof createLatencyTracker>
): Promise<EvaluationMetrics> {
    console.log(
        `[calculateAllMetrics] Starting - question: "${question.substring(0, 60)}...", answer: ${answer.length} chars, contexts: ${contexts.length}`
    );
    consola.debug(
        `[calculateAllMetrics] Starting BATCHED metric calculation - question: "${question.substring(0, 60)}...", answer length: ${answer.length}`
    );

    // OPTIMIZATION: Use batched LLM calls to reduce API overhead by ~80%
    // Previously: 11 separate LLM calls
    // Now: 4 LLM calls (grounding batch, context batch, answer relevancy, answer correctness)
    console.log("[calculateAllMetrics] Calling batched metrics functions...");
    const [groundingMetrics, contextMetrics, answerRelevancy, answerCorrectness, citationAccuracy] = await Promise.all([
        // Batch 1: Grounding metrics (faithfulness, hallucination, consistency, attribution, contradiction)
        calculateGroundingMetricsBatched(answer, contexts),
        // Batch 2: Context metrics (precision, recall, relevancy)
        calculateContextMetricsBatched(question, contexts, groundTruth),
        // Individual: Answer relevancy (uses embeddings, not easily batchable)
        calculateAnswerRelevancy(question, answer),
        // Individual: Answer correctness (compares to ground truth)
        calculateAnswerCorrectness(answer, groundTruth),
        // Individual: Citation accuracy
        calculateCitationAccuracy(answer, contexts),
    ]);

    console.log(
        `[calculateAllMetrics] Batched results - faithfulness: ${groundingMetrics.faithfulness}, hallucinationRate: ${groundingMetrics.hallucinationRate}, contextPrecision: ${contextMetrics.contextPrecision}`
    );
    consola.debug(
        `[calculateAllMetrics] Batched metrics calculated - faithfulness: ${groundingMetrics.faithfulness.toFixed(3)}, relevancy: ${answerRelevancy.toFixed(3)}`
    );

    // Calculate retrieval metrics if IDs provided and relevantIds is non-empty
    // When relevantIds is undefined or empty, we can't calculate retrieval quality metrics
    const hasRetrievalGroundTruth = retrievedIds && retrievedIds.length > 0 && relevantIds && relevantIds.size > 0;

    // Debug: Log the IDs being compared to understand matching issues
    if (hasRetrievalGroundTruth) {
        const relevantArray = Array.from(relevantIds);
        const matchingIds = retrievedIds.filter((id) => relevantIds.has(id));
        console.log("[calculateAllMetrics] Retrieval IDs debug:");
        console.log(`  - Retrieved IDs (${retrievedIds.length}): ${retrievedIds.slice(0, 3).join(", ")}...`);
        console.log(`  - Relevant IDs (${relevantArray.length}): ${relevantArray.slice(0, 3).join(", ")}...`);
        console.log(`  - Matching IDs: ${matchingIds.length} matches`);
        if (matchingIds.length === 0) {
            console.log("  - WARNING: No overlap between retrieved and relevant chunk IDs!");
        }
    }

    const retrievalNdcg = hasRetrievalGroundTruth ? calculateNDCG(retrievedIds, relevantIds) : -1;
    const retrievalMrr = hasRetrievalGroundTruth ? calculateMRR(retrievedIds, relevantIds) : -1;
    const retrievalPrecision = hasRetrievalGroundTruth ? calculateRetrievalPrecision(retrievedIds, relevantIds) : -1;
    consola.debug(
        `[calculateAllMetrics] Retrieval metrics - hasGroundTruth: ${hasRetrievalGroundTruth}, NDCG: ${retrievalNdcg.toFixed(3)}, MRR: ${retrievalMrr.toFixed(3)}, Precision: ${retrievalPrecision.toFixed(3)}`
    );

    // Get latency & token metrics using a helper to keep this function compact
    const {
        totalLatencyMs,
        retrievalLatencyMs,
        rerankingLatencyMs,
        generationLatencyMs,
        agentReasoningLatencyMs,
        toolCallLatencyMs,
        planningLatencyMs,
        synthesisLatencyMs,
        totalAgentSteps,
        avgStepLatencyMs,
        tokensPerSecond,
        tokenEfficiency,
    } = aggregateLatencyAndTokenMetrics(latencyTracker, answer, contexts);

    consola.debug(
        `[calculateAllMetrics] Latency metrics - total: ${totalLatencyMs}ms, generation: ${generationLatencyMs}ms, hallucination rate: ${groundingMetrics.hallucinationRate.toFixed(3)}`
    );

    return {
        // Unpack grounding metrics from batch
        faithfulness: groundingMetrics.faithfulness,
        hallucinationRate: groundingMetrics.hallucinationRate,
        factualConsistency: groundingMetrics.factualConsistency,
        sourceAttribution: groundingMetrics.sourceAttribution,
        contradictionScore: groundingMetrics.contradictionScore,
        // Unpack context metrics from batch
        contextPrecision: contextMetrics.contextPrecision,
        contextRecall: contextMetrics.contextRecall,
        contextRelevancy: contextMetrics.contextRelevancy,
        // Individual metrics
        answerRelevancy,
        answerCorrectness,
        citationAccuracy,
        // Retrieval metrics
        retrievalNdcg,
        retrievalMrr,
        retrievalPrecision,
        // Latency metrics
        totalLatencyMs,
        retrievalLatencyMs,
        rerankingLatencyMs,
        generationLatencyMs,
        agentReasoningLatencyMs,
        tokenEfficiency,
        tokensPerSecond,
        toolCallLatencyMs,
        planningLatencyMs,
        synthesisLatencyMs,
        totalAgentSteps,
        avgStepLatencyMs,
    };
}

// Predefined ablation configurations
export const ABLATION_CONFIGS: AblationConfig[] = [
    {
        name: "baseline_no_rag",
        description: "Baseline tanpa RAG - LLM murni",
        useRag: false,
        useReranker: false,
        retrievalStrategy: "vector",
        chunkingStrategy: "recursive",
        useAgenticMode: false,
        useGuardrails: false,
        topK: 5,
        language: "auto",
    },
    {
        name: "vector_only",
        description: "Hanya vector similarity search",
        useRag: true,
        useReranker: false,
        retrievalStrategy: "vector",
        chunkingStrategy: "recursive",
        useAgenticMode: false,
        useGuardrails: false,
        topK: 5,
        language: "auto",
    },
    {
        name: "bm25_only",
        description: "Hanya Okapi BM25 keyword search",
        useRag: true,
        useReranker: false,
        retrievalStrategy: "keyword",
        chunkingStrategy: "recursive",
        useAgenticMode: false,
        useGuardrails: false,
        topK: 5,
        language: "auto",
    },
    {
        name: "hybrid_no_rerank",
        description: "Hybrid retrieval tanpa re-ranking",
        useRag: true,
        useReranker: false,
        retrievalStrategy: "hybrid",
        chunkingStrategy: "recursive",
        useAgenticMode: false,
        useGuardrails: false,
        topK: 5,
        language: "auto",
    },
    {
        name: "hybrid_cross_encoder",
        description: "Hybrid dengan Cross-Encoder re-ranking",
        useRag: true,
        useReranker: true,
        rerankerStrategy: "cross_encoder",
        retrievalStrategy: "hybrid",
        chunkingStrategy: "recursive",
        useAgenticMode: false,
        useGuardrails: false,
        topK: 5,
        language: "auto",
    },
    {
        name: "hybrid_llm_rerank",
        description: "Hybrid dengan LLM-based re-ranking",
        useRag: true,
        useReranker: true,
        rerankerStrategy: "llm",
        retrievalStrategy: "hybrid",
        chunkingStrategy: "recursive",
        useAgenticMode: false,
        useGuardrails: false,
        topK: 5,
        language: "auto",
    },
    {
        name: "hybrid_ensemble_rerank",
        description: "Hybrid dengan Ensemble re-ranking",
        useRag: true,
        useReranker: true,
        rerankerStrategy: "ensemble",
        retrievalStrategy: "hybrid",
        chunkingStrategy: "recursive",
        useAgenticMode: false,
        useGuardrails: false,
        topK: 5,
        language: "auto",
    },
    {
        name: "agentic_mode",
        description: "Agentic RAG dengan multi-step reasoning",
        useRag: true,
        useReranker: true,
        rerankerStrategy: "ensemble",
        retrievalStrategy: "hybrid",
        chunkingStrategy: "recursive",
        useAgenticMode: true,
        useGuardrails: false,
        topK: 5,
        language: "auto",
    },
    {
        name: "full_system",
        description: "Full system dengan semua fitur",
        useRag: true,
        useReranker: true,
        rerankerStrategy: "ensemble",
        retrievalStrategy: "hybrid",
        chunkingStrategy: "semantic",
        useAgenticMode: true,
        useGuardrails: true,
        topK: 5,
        language: "auto",
    },
];

// Run ablation study
/**
 * Run an ablation study comparing different RAG configurations.
 * This function uses the actual RAG pipeline (agentic or standard) based on config settings.
 *
 * @param questions - Array of evaluation questions with ground truth answers
 * @param configs - RAG configurations to test (defaults to ABLATION_CONFIGS)
 * @param options - Optional settings for progress callbacks
 * @returns Array of ablation results with metrics for each configuration
 */
export async function runAblationStudy(
    questions: { question: string; groundTruth: string }[],
    configs: AblationConfig[] = ABLATION_CONFIGS,
    options: {
        onProgress?: (configIndex: number, questionIndex: number, totalConfigs: number, totalQuestions: number) => void;
    } = {}
): Promise<AblationResult[]> {
    const results: AblationResult[] = [];
    const { onProgress } = options;

    consola.debug(
        `[runAblationStudy] Starting ablation study with ${configs.length} configs and ${questions.length} questions`
    );

    for (let configIdx = 0; configIdx < configs.length; configIdx++) {
        const config = configs[configIdx];
        consola.debug(`[runAblationStudy] Testing config ${configIdx + 1}/${configs.length}: ${config.name}`);

        const latencyTracker = createLatencyTracker();
        latencyTracker.start();

        const sampleResults: AblationResult["sampleResults"] = [];
        const allMetrics: EvaluationMetrics[] = [];

        for (let qIdx = 0; qIdx < questions.length; qIdx++) {
            const { question, groundTruth } = questions[qIdx];
            const questionStartTime = Date.now();

            consola.debug(
                `[runAblationStudy] [${config.name}] Question ${qIdx + 1}/${questions.length}: "${question.substring(0, 50)}..."`
            );

            // Report progress if callback provided
            onProgress?.(configIdx, qIdx, configs.length, questions.length);

            let answer: string;
            let contexts: string[];
            let retrievedIds: string[] | undefined;

            try {
                // Execute the actual RAG pipeline based on configuration
                const pipelineResult = await executeRagPipeline(question, config, latencyTracker);
                answer = pipelineResult.answer;
                contexts = pipelineResult.contexts;
                retrievedIds = pipelineResult.retrievedIds;

                consola.debug(
                    `[runAblationStudy] [${config.name}] Answer generated - length: ${answer.length}, contexts: ${contexts.length}`
                );
            } catch (error) {
                consola.error(`[runAblationStudy] [${config.name}] Error processing question:`, error);
                // On error, use empty results but continue with study
                answer = `[Error] Failed to generate answer for: ${question}`;
                contexts = [];
                retrievedIds = undefined;
            }

            const questionLatencyMs = Date.now() - questionStartTime;

            // Calculate all RAGAS metrics using the actual LLM-based evaluation
            const metrics = await calculateAllMetrics(
                question,
                answer,
                contexts,
                groundTruth,
                retrievedIds,
                undefined, // relevantIds - would need ground truth relevance labels
                "akademik/universitas",
                latencyTracker
            );

            allMetrics.push(metrics);
            sampleResults.push({ question, answer, groundTruth, contexts, latencyMs: questionLatencyMs });
        }

        // Average metrics across all questions for this config
        const avgMetrics = averageMetrics(allMetrics);

        results.push({
            config,
            metrics: avgMetrics,
            latencyProfile: latencyTracker.getProfile(),
            sampleResults,
            perQuestionMetrics: allMetrics, // Store per-question data for ANOVA
        });

        consola.debug(
            `[runAblationStudy] Config ${config.name} completed - avgFaithfulness: ${avgMetrics.faithfulness.toFixed(3)}, avgCorrectness: ${avgMetrics.answerCorrectness.toFixed(3)}`
        );
    }

    consola.debug(`[runAblationStudy] Ablation study completed - ${results.length} configurations tested`);
    return results;
}

/**
 * Execute the RAG pipeline for a single question based on the ablation config.
 * Routes to either agentic RAG, standard RAG, or baseline LLM based on settings.
 */
async function executeRagPipeline(
    question: string,
    config: AblationConfig,
    latencyTracker: ReturnType<typeof createLatencyTracker>
): Promise<{ answer: string; contexts: string[]; retrievedIds: string[] }> {
    // Baseline: No RAG - pure LLM response
    if (!config.useRag) {
        consola.debug(`[executeRagPipeline] Using baseline (no RAG) for: ${config.name}`);
        latencyTracker.mark("generation");

        const { text } = await generateText({
            model: CHAT_MODEL,
            system: SYSTEM_PROMPTS.nonRag,
            prompt: question,
            temperature: 0.3,
            experimental_telemetry: telemetryConfig,
        });

        return { answer: text, contexts: [], retrievedIds: [] };
    }

    // Agentic RAG mode: Use the full agentic pipeline with tools
    if (config.useAgenticMode) {
        consola.debug(`[executeRagPipeline] Using agentic RAG for: ${config.name}`);
        latencyTracker.mark("planning");

        const agenticResult = await runAgenticRag(question, {
            sessionId: crypto.randomUUID(),
            retrievalStrategy: config.retrievalStrategy,
            enableGuardrails: config.useGuardrails,
            maxSteps: 5,
            useReranker: config.useReranker,
            rerankerStrategy: config.rerankerStrategy as RerankerStrategy | undefined,
        });

        latencyTracker.mark("synthesis", { tokensGenerated: agenticResult.answer.length });

        const contexts = agenticResult.retrievedChunks.map((c) => c.content);
        const retrievedIds = agenticResult.retrievedChunks.map((c) => c.chunkId);

        return { answer: agenticResult.answer, contexts, retrievedIds };
    }

    // Standard RAG mode: Retrieval + Generation
    consola.debug(`[executeRagPipeline] Using standard RAG for: ${config.name}`);

    // Step 1: Retrieval
    latencyTracker.mark("retrieval", { documentsProcessed: config.topK });

    const retrievalResults = await hybridRetrieve(question, {
        strategy: config.retrievalStrategy,
        topK: config.topK,
        language: config.language,
        useReranker: config.useReranker,
        rerankerStrategy: config.rerankerStrategy as RerankerStrategy | undefined,
    });

    const contexts = retrievalResults.map((r) => r.content);
    const retrievedIds = retrievalResults.map((r) => r.chunkId);

    // Step 2: Mark re-ranking completion
    // NOTE: Re-ranking already happened inside hybridRetrieve when config.useReranker=true.
    // This marker captures the point after retrieval+reranking is complete.
    // TODO: Pass latencyTracker to hybridRetrieve for granular reranking latency tracking.
    if (config.useReranker) {
        latencyTracker.mark("reranking", { documentsProcessed: retrievalResults.length });
    }

    // Step 3: Build context string and generate response
    // NOTE: Previously called retrieveContext here which was DUPLICATE retrieval.
    // Now we build the context directly from hybridRetrieve results.
    const contextString = contexts.join("\n\n---\n\n");

    latencyTracker.mark("generation");

    const ragPrompt = buildRagPrompt(SYSTEM_PROMPTS.rag, contextString, question);

    const ragResponse = await generateText({
        model: CHAT_MODEL,
        prompt: ragPrompt,
        temperature: 0.3,
        experimental_telemetry: telemetryConfig,
    });

    return { answer: ragResponse.text, contexts, retrievedIds };
}

function defaultZeroMetrics(): EvaluationMetrics {
    return {
        faithfulness: 0,
        answerRelevancy: 0,
        contextPrecision: 0,
        contextRecall: 0,
        contextRelevancy: 0, // NEW: RAGAS Context Relevancy
        answerCorrectness: 0,
        citationAccuracy: 0,
        hallucinationRate: 0,
        factualConsistency: 0,
        sourceAttribution: 0,
        contradictionScore: 0,
        retrievalNdcg: 0,
        retrievalMrr: 0,
        retrievalPrecision: 0,
        totalLatencyMs: 0,
        retrievalLatencyMs: 0,
        rerankingLatencyMs: 0,
        generationLatencyMs: 0,
        agentReasoningLatencyMs: 0,
        tokenEfficiency: 0,
        tokensPerSecond: 0,
        toolCallLatencyMs: 0,
        planningLatencyMs: 0,
        synthesisLatencyMs: 0,
        totalAgentSteps: 0,
        avgStepLatencyMs: 0,
    };
}

function averageMetrics(metricsArray: EvaluationMetrics[]): EvaluationMetrics {
    if (metricsArray.length === 0) return defaultZeroMetrics();

    const keys = Object.keys(metricsArray[0]) as (keyof EvaluationMetrics)[];
    const sum: Record<string, number> = {};
    for (const k of keys) sum[k as string] = 0;

    for (const m of metricsArray) {
        for (const k of keys) {
            sum[k as string] += Number(m[k]) || 0;
        }
    }

    const n = metricsArray.length;
    const avgMetrics = {} as EvaluationMetrics;
    for (const k of keys) avgMetrics[k] = sum[k as string] / n;
    return avgMetrics;
}

// Generate ablation study report
export function generateAblationReport(results: AblationResult[]): string {
    let report = "# Laporan Studi Ablasi RAG\n\n";
    report += `Tanggal: ${new Date().toISOString()}\n\n`;

    // 1. Primary Metrics
    report += "## 1. Primary Metrics (Kualitas & Akurasi)\n";
    report += "Metrik utama yang menentukan keberhasilan output chatbot untuk pengguna akademik.\n\n";
    report += "| Konfigurasi | Correctness | Faithfulness | Relevancy | Citation Acc | Hallucination |\n";
    report += "|-------------|-------------|--------------|-----------|--------------|---------------|\n";

    for (const result of results) {
        report += `| ${result.config.name} | `;
        report += `${(result.metrics.answerCorrectness * 100).toFixed(1)}% | `;
        report += `${(result.metrics.faithfulness * 100).toFixed(1)}% | `;
        report += `${(result.metrics.answerRelevancy * 100).toFixed(1)}% | `;
        report += `${(result.metrics.citationAccuracy * 100).toFixed(1)}% | `;
        report += `${(result.metrics.hallucinationRate * 100).toFixed(1)}% |\n`;
    }

    // 2. Secondary Metrics
    report += "\n## 2. Secondary Metrics (Kualitas Retrieval & Konteks)\n";
    report += "Diagnostik kinerja komponen retrieval dan kualitas konteks yang diambil.\n\n";
    report += "| Konfigurasi | Ctx Precision | Ctx Recall | Ctx Relevancy | Retrieval NDCG | Fact Consistency |\n";
    report += "|-------------|---------------|------------|---------------|----------------|------------------|\n";

    for (const result of results) {
        report += `| ${result.config.name} | `;
        report += `${(result.metrics.contextPrecision * 100).toFixed(1)}% | `;
        report += `${(result.metrics.contextRecall * 100).toFixed(1)}% | `;
        report += `${(result.metrics.contextRelevancy * 100).toFixed(1)}% | `;
        report += `${(result.metrics.retrievalNdcg * 100).toFixed(1)}% | `;
        report += `${(result.metrics.factualConsistency * 100).toFixed(1)}% |\n`;
    }

    // 3. Supporting Analysis
    report += "\n## 3. Supporting Analysis (Efisiensi & Latensi)\n";
    report += "Analisis operasional sistem, breakdown latensi, dan penggunaan resource.\n\n";
    report += "| Konfigurasi | Total Latency | Gen Latency | Ret Latency | Tokens/Sec | Agent Steps |\n";
    report += "|-------------|---------------|-------------|-------------|------------|-------------|\n";

    for (const result of results) {
        report += `| ${result.config.name} | `;
        report += `${result.metrics.totalLatencyMs.toFixed(0)}ms | `;
        report += `${result.metrics.generationLatencyMs.toFixed(0)}ms | `;
        report += `${result.metrics.retrievalLatencyMs.toFixed(0)}ms | `;
        report += `${result.metrics.tokensPerSecond.toFixed(1)} | `;
        report += `${result.metrics.totalAgentSteps} |\n`;
    }

    return report;
}
