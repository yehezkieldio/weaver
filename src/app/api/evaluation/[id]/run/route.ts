/**
 * @fileoverview API Route: Run Evaluation
 *
 * WHY This Endpoint Exists:\n * - Executes evaluation runs to measure RAG system performance
 * - Calculates RAGAS metrics (faithfulness, answer relevancy, context precision/recall, correctness)
 * - Measures hallucination rates and domain-specific academic quality metrics
 * - Compares RAG vs non-RAG responses to quantify improvement
 * - Tracks detailed latency metrics for performance optimization
 *
 * Request/Response Flow:
 * 1. Update run status to \"running\"
 * 2. For each question:
 *    a. Generate RAG response with context retrieval and reranking
 *    b. Generate non-RAG response for comparison
 *    c. Calculate all RAGAS and hallucination metrics
 *    d. Track latency breakdown (retrieval, reranking, generation)
 *    e. Update question record with results
 *    f. Update run progress
 * 3. Mark run as \"completed\" with final statistics
 *
 * WHY This Design:
 * - Sequential processing ensures consistent resource usage
 * - Progress tracking allows UI to show real-time status
 * - Comprehensive metrics enable academic research and ablation studies
 * - Latency breakdown helps identify performance bottlenecks
 */

import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { CHAT_MODEL, telemetryConfig } from "@/lib/ai";
import { db } from "@/lib/db";
import { evaluationQuestions, evaluationRuns } from "@/lib/db/schema";
import { ACADEMIC_QUESTIONS } from "@/lib/evaluation-questions";
import { buildRagPrompt, retrieveContext, SYSTEM_PROMPTS } from "@/lib/rag/context-builder";
import {
    calculateAllMetrics,
    calculateAnswerCorrectness,
    calculateAnswerRelevancy,
    calculateHallucinationRate,
    createLatencyTracker,
} from "@/lib/rag/evaluation";
import { calculateETA, DEFAULT_CONCURRENCY, processBatches } from "@/lib/rag/evaluation-utils";

/**
 * POST /api/evaluation/[id]/run
 *
 * WHY Long-Running Process:
 * - Each question requires 2 LLM calls (RAG + non-RAG) plus metric calculations
 * - RAGAS metrics involve additional LLM calls for faithfulness and relevancy scoring
 * - Can take 5-15 minutes for 20-50 questions depending on model latency
 *
 * Path Parameters:
 * - id: string - Evaluation run ID
 *
 * Response:
 * - Success (200): { success: true, completedQuestions: number }
 * - Error (500): { error: string } - Execution failure
 *
 * Metrics Calculated (per question):
 * - Core RAGAS: faithfulness, answer relevancy, context precision/recall, answer correctness
 * - Hallucination: hallucination rate, factual consistency, source attribution, contradiction score
 * - Domain-specific: academic rigor, citation accuracy, terminology correctness
 * - Retrieval: NDCG, MRR, precision
 * - Latency: retrieval, reranking, generation, agent reasoning, tool calls, tokens/sec
 *
 * @param _request - Next.js request object (unused)
 * @param params - Route parameters with evaluation run ID
 * @returns JSON response with completion status and question count
 * @throws Error - When evaluation execution fails, updates run status to \"failed\"
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Fetch the evaluation run configuration from database
        const [run] = await db.select().from(evaluationRuns).where(eq(evaluationRuns.id, id));
        if (!run) {
            return Response.json({ error: "Evaluation run not found" }, { status: 404 });
        }

        // Use stored configuration or defaults
        const evaluationMode = (run.evaluationMode as "quick" | "production") || "quick";
        const retrievalStrategy = (run.retrievalStrategy as "vector" | "keyword" | "hybrid") || "hybrid";
        const useReranker = run.useReranker ?? true;
        const rerankerStrategy =
            (run.rerankerStrategy as "ensemble" | "cross_encoder" | "llm" | "cohere") || "cross_encoder";
        const useAgenticMode = run.useAgenticMode ?? false;

        // Determine question count based on mode
        // QUICK MODE: 5 questions for fast iteration and development testing
        // PRODUCTION MODE: 50 questions for statistical significance and academic publication
        const questionCount = evaluationMode === "quick" ? 5 : 50;

        console.log(
            `[Evaluation Run] Starting evaluation run: ${id} (mode: ${evaluationMode}, questions: ${questionCount})`
        );
        console.log(
            `[Evaluation Run] Config - strategy: ${retrievalStrategy}, reranker: ${useReranker}, rerankerStrategy: ${rerankerStrategy}, agenticMode: ${useAgenticMode}`
        );

        // Update run status
        await db.update(evaluationRuns).set({ status: "running" }).where(eq(evaluationRuns.id, id));

        // Seed this run with the predefined ACADEMIC_QUESTIONS based on mode
        // Delete any previous questions for the run and insert the canonical set so downstream analysis is consistent
        await db.delete(evaluationQuestions).where(eq(evaluationQuestions.runId, id));

        // Select first N questions based on evaluation mode
        const selectedQuestions = ACADEMIC_QUESTIONS.slice(0, questionCount);

        const insertedQuestions: (typeof evaluationQuestions.$inferSelect)[] = [];
        for (const q of selectedQuestions) {
            const [inserted] = await db
                .insert(evaluationQuestions)
                .values({
                    runId: id,
                    question: q.question,
                    groundTruth: q.groundTruth,
                    relevantChunkIds: q.relevantChunkIds || null,
                    category: q.category || null,
                    difficulty: q.difficulty || null,
                    questionLanguage: q.language || null,
                })
                .returning();

            insertedQuestions.push(inserted);
        }

        // Update run metadata to reflect the seeded questions
        await db
            .update(evaluationRuns)
            .set({ totalQuestions: insertedQuestions.length })
            .where(eq(evaluationRuns.id, id));

        const questions = insertedQuestions;

        console.log(
            `[Evaluation Run] Seeded run ${id} with ${questions.length} predefined questions (${evaluationMode} mode)`
        );

        console.log(`[Evaluation Run] Processing ${questions.length} questions in batches of ${DEFAULT_CONCURRENCY}`);

        let completedCount = 0;
        let errorCount = 0;
        const startTime = Date.now();
        const questionTimings: number[] = [];

        // Process questions in parallel batches
        await processBatches(
            questions,
            async (question, index) => {
                const questionStartTime = Date.now();
                try {
                    console.log(
                        `[Evaluation Run] Question ${index + 1}/${questions.length}: ${question.question.substring(0, 50)}...`
                    );

                    // Create latency tracker for detailed timing
                    const latencyTracker = createLatencyTracker();
                    latencyTracker.start();

                    // Generate RAG response
                    const ragStartTime = Date.now();

                    latencyTracker.mark("retrieval");
                    // Use stored configuration for retrieval
                    const contextResult = await retrieveContext(question.question, {
                        topK: 5,
                        minSimilarity: 0.3, // Lower threshold for better recall
                        strategy: retrievalStrategy,
                        useReranker,
                        rerankerStrategy,
                    });

                    const ragPrompt = buildRagPrompt(SYSTEM_PROMPTS.rag, contextResult.context, question.question);

                    latencyTracker.mark("generation");
                    const ragResponse = await generateText({
                        model: CHAT_MODEL,
                        prompt: ragPrompt,
                        temperature: 0.3,
                        experimental_telemetry: telemetryConfig,
                    });
                    const ragLatency = Date.now() - ragStartTime;

                    // Generate non-RAG response
                    const nonRagStartTime = Date.now();
                    const nonRagResponse = await generateText({
                        model: CHAT_MODEL,
                        system: SYSTEM_PROMPTS.nonRag,
                        prompt: question.question,
                        temperature: 0.3,
                        experimental_telemetry: telemetryConfig,
                    });
                    const nonRagLatency = Date.now() - nonRagStartTime;

                    // Calculate RAGAS metrics for RAG response (includes all hallucination metrics)
                    const ragMetrics = await calculateAllMetrics(
                        question.question,
                        ragResponse.text,
                        contextResult.chunks.map((c) => c.content),
                        question.groundTruth,
                        contextResult.chunks.map((c) => c.chunkId), // retrievedIds
                        question.relevantChunkIds ? new Set(question.relevantChunkIds) : undefined, // relevantIds from ground truth labels
                        "universitas-mulia",
                        latencyTracker
                    );

                    // Calculate metrics for non-RAG response
                    const nonRagRelevancy = await calculateAnswerRelevancy(question.question, nonRagResponse.text);
                    const nonRagCorrectness = await calculateAnswerCorrectness(
                        nonRagResponse.text,
                        question.groundTruth
                    );
                    const nonRagHallucination = await calculateHallucinationRate(nonRagResponse.text, []); // No context for non-RAG

                    // Update question with all results including hallucination and domain metrics
                    await db
                        .update(evaluationQuestions)
                        .set({
                            ragAnswer: ragResponse.text,
                            nonRagAnswer: nonRagResponse.text,
                            retrievedContexts: contextResult.chunks.map((c) => c.content),
                            relevantChunkIds: question.relevantChunkIds || null,
                            // Core RAGAS metrics
                            ragFaithfulness: ragMetrics.faithfulness,
                            ragAnswerRelevancy: ragMetrics.answerRelevancy,
                            ragContextPrecision: ragMetrics.contextPrecision,
                            ragContextRecall: ragMetrics.contextRecall,
                            ragContextRelevancy: ragMetrics.contextRelevancy, // NEW: RAGAS Context Relevancy
                            ragAnswerCorrectness: ragMetrics.answerCorrectness,
                            // Non-RAG metrics
                            nonRagAnswerRelevancy: nonRagRelevancy,
                            nonRagAnswerCorrectness: nonRagCorrectness,
                            nonRagHallucinationRate: nonRagHallucination,
                            // Domain-specific metrics
                            ragCitationAccuracy: ragMetrics.citationAccuracy,
                            // Hallucination metrics
                            ragHallucinationRate: ragMetrics.hallucinationRate,
                            ragFactualConsistency: ragMetrics.factualConsistency,
                            ragSourceAttribution: ragMetrics.sourceAttribution,
                            ragContradictionScore: ragMetrics.contradictionScore,
                            // Retrieval metrics
                            retrievalNdcg: ragMetrics.retrievalNdcg,
                            retrievalMrr: ragMetrics.retrievalMrr,
                            retrievalPrecision: ragMetrics.retrievalPrecision,
                            // Latency metrics
                            ragLatencyMs: ragLatency,
                            nonRagLatencyMs: nonRagLatency,
                            ragRetrievalLatencyMs: Math.round(ragMetrics.retrievalLatencyMs),
                            ragRerankingLatencyMs: Math.round(ragMetrics.rerankingLatencyMs),
                            ragGenerationLatencyMs: Math.round(ragMetrics.generationLatencyMs),
                            ragAgentReasoningLatencyMs: Math.round(ragMetrics.agentReasoningLatencyMs),
                            ragPlanningLatencyMs: Math.round(ragMetrics.planningLatencyMs),
                            ragSynthesisLatencyMs: Math.round(ragMetrics.synthesisLatencyMs),
                            ragAvgStepLatencyMs: Math.round(ragMetrics.avgStepLatencyMs),
                            ragToolCallLatencyMs: Math.round(ragMetrics.toolCallLatencyMs),
                            ragTokensPerSecond: ragMetrics.tokensPerSecond,
                            // Metadata
                            retrievalMethod: contextResult.retrievalStrategy,
                        })
                        .where(eq(evaluationQuestions.id, question.id));

                    completedCount += 1;
                    const questionLatency = Date.now() - questionStartTime;
                    questionTimings.push(questionLatency);

                    // Update run progress with enhanced metrics
                    const elapsedMs = Date.now() - startTime;
                    const eta = calculateETA(completedCount, questions.length, elapsedMs);

                    await db
                        .update(evaluationRuns)
                        .set({ completedQuestions: completedCount })
                        .where(eq(evaluationRuns.id, id));

                    console.log(
                        `[Evaluation Run] Question ${index + 1} completed - faithfulness: ${ragMetrics.faithfulness.toFixed(3)}, correctness: ${ragMetrics.answerCorrectness.toFixed(3)}, ETA: ${Math.round(eta / 1000)}s`
                    );
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`[Evaluation Run] FAILED Question ${question.id}: ${errorMessage}`);
                    errorCount += 1;
                    // Continue processing other questions even if one fails
                }
            },
            DEFAULT_CONCURRENCY
        );

        // Mark run as completed with summary
        await db
            .update(evaluationRuns)
            .set({
                status: "completed",
                completedAt: new Date(),
                completedQuestions: completedCount,
            })
            .where(eq(evaluationRuns.id, id));

        console.log(
            `[Evaluation Run] Completed - ${completedCount}/${questions.length} questions processed, ${errorCount} errors`
        );

        return Response.json({
            success: true,
            completedQuestions: completedCount,
            errorCount,
            totalQuestions: questions.length,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Evaluation Run] CRITICAL ERROR: ${errorMessage}`);

        // Ensure run is marked as failed even on unexpected errors
        try {
            const { id } = await params;
            await db.update(evaluationRuns).set({ status: "failed" }).where(eq(evaluationRuns.id, id));
        } catch (updateError) {
            console.error("[Evaluation Run] Failed to update run status:", updateError);
        }

        return Response.json({ error: "Evaluation failed", details: errorMessage }, { status: 500 });
    }
}
