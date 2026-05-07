/**
 * @fileoverview API Route: Evaluation Management
 *
 * WHY This Endpoint Exists:
 * - Manages evaluation runs for RAG system testing and benchmarking
 * - Supports RAGAS metrics calculation (faithfulness, relevancy, precision, recall)
 * - Enables comparative analysis between RAG and non-RAG responses
 * - Facilitates academic research and ablation studies
 *
 * Request/Response Flow:
 * - GET: Retrieve all evaluation runs with metadata
 * - POST: Create new evaluation run with questions and configuration
 */

import { avg, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { evaluationQuestions, evaluationRuns } from "@/lib/db/schema";

/**
 * GET /api/evaluation
 *
 * WHY: Lists all evaluation runs for dashboard display
 * - Orders by creation date for chronological view
 * - Includes run status and configuration for filtering
 * - Calculates aggregate metrics for comparison charts
 *
 * Response:
 * - Success (200): { runs: EvaluationRun[] }
 * - Error (500): { error: string }
 *
 * @returns JSON response with evaluation runs array including metrics
 */
export async function GET() {
    try {
        const runs = await db.select().from(evaluationRuns).orderBy(desc(evaluationRuns.createdAt));

        // Calculate aggregate metrics for all runs efficiently using SQL Group By
        const metrics = await db
            .select({
                runId: evaluationQuestions.runId,
                ragFaithfulness: avg(evaluationQuestions.ragFaithfulness),
                ragAnswerRelevancy: avg(evaluationQuestions.ragAnswerRelevancy),
                ragContextPrecision: avg(evaluationQuestions.ragContextPrecision),
                ragContextRecall: avg(evaluationQuestions.ragContextRecall),
                ragAnswerCorrectness: avg(evaluationQuestions.ragAnswerCorrectness),
                nonRagAnswerRelevancy: avg(evaluationQuestions.nonRagAnswerRelevancy),
                nonRagAnswerCorrectness: avg(evaluationQuestions.nonRagAnswerCorrectness),
                ragHallucinationRate: avg(evaluationQuestions.ragHallucinationRate),
                nonRagHallucinationRate: avg(evaluationQuestions.nonRagHallucinationRate),
                ragFactualConsistency: avg(evaluationQuestions.ragFactualConsistency),
                ragSourceAttribution: avg(evaluationQuestions.ragSourceAttribution),
                ragLatencyMs: avg(evaluationQuestions.ragLatencyMs),
            })
            .from(evaluationQuestions)
            .groupBy(evaluationQuestions.runId);

        // Map metrics to runs
        const runsWithMetrics = runs.map((run) => {
            const runMetrics = metrics.find((m) => m.runId === run.id);

            if (!runMetrics) {
                return run;
            }

            // Convert string results from avg() to numbers if necessary (depends on driver)
            const parseMetric = (val: unknown) =>
                typeof val === "string" ? Number.parseFloat(val) : (val as number) || 0;

            return {
                ...run,
                aggregateMetrics: {
                    rag: {
                        faithfulness: parseMetric(runMetrics.ragFaithfulness),
                        answerRelevancy: parseMetric(runMetrics.ragAnswerRelevancy),
                        contextPrecision: parseMetric(runMetrics.ragContextPrecision),
                        contextRecall: parseMetric(runMetrics.ragContextRecall),
                        answerCorrectness: parseMetric(runMetrics.ragAnswerCorrectness),
                    },
                    nonRag: {
                        answerRelevancy: parseMetric(runMetrics.nonRagAnswerRelevancy),
                        answerCorrectness: parseMetric(runMetrics.nonRagAnswerCorrectness),
                    },
                    avgHallucinationRate: parseMetric(runMetrics.ragHallucinationRate),
                    nonRagHallucinationRate: parseMetric(runMetrics.nonRagHallucinationRate),
                    avgFactualConsistency: parseMetric(runMetrics.ragFactualConsistency),
                    avgSourceAttribution: parseMetric(runMetrics.ragSourceAttribution),
                    avgLatencyMs: parseMetric(runMetrics.ragLatencyMs),
                },
            };
        });

        return Response.json({ runs: runsWithMetrics });
    } catch (error) {
        console.error("Failed to fetch evaluation runs:", error);
        return Response.json({ error: "Failed to fetch evaluation runs" }, { status: 500 });
    }
}

/**
 * POST /api/evaluation
 *
 * WHY: Creates evaluation run with test questions and configuration
 * - Supports batch question import for systematic testing
 * - Configures RAG parameters for controlled experiments
 * - Enables reproducible evaluation across different configurations
 *
 * Request Body:
 * - name: string - Evaluation run name
 * - description?: string - Run description and purpose
 * - questions?: Array<{ question: string, groundTruth: string }> - Test questions
 * - useAgenticMode: boolean - Enable agentic RAG (default: true)
 * - retrievalStrategy: "vector" | "keyword" | "hybrid" - Retrieval method (default: "hybrid")
 * - chunkingStrategy: string - Text chunking algorithm (default: "recursive")
 * - enableGuardrails: boolean - Enable safety checks (default: true)
 *
 * Response:
 * - Success (200): { run: EvaluationRun } - Created run with ID
 * - Error (500): { error: string } - Creation failure
 *
 * @param request - Next.js request with JSON body
 * @returns JSON response with created evaluation run
 */
export async function POST(request: Request) {
    try {
        const {
            name,
            description,
            questions,
            useAgenticMode = true,
            retrievalStrategy = "hybrid",
            chunkingStrategy = "recursive",
            enableGuardrails = true,
            useReranker = true,
            rerankerStrategy = "ensemble",
            language = "id",
            evaluationMode = "quick",
        } = await request.json();

        console.log("Creating evaluation run:", {
            name,
            questionCount: questions?.length || 0,
            useAgenticMode,
            retrievalStrategy,
            chunkingStrategy,
            useReranker,
            rerankerStrategy,
            evaluationMode,
        });

        // Create evaluation run with configuration
        const [run] = await db
            .insert(evaluationRuns)
            .values({
                name,
                description,
                totalQuestions: questions?.length || 0,
                status: "pending",
                useAgenticMode,
                retrievalStrategy,
                chunkingStrategy,
                useReranker,
                rerankerStrategy,
                enableGuardrails,
                language,
                evaluationMode,
            })
            .returning();

        console.log("Evaluation run created:", run.id);

        // Insert questions if provided
        if (questions?.length > 0) {
            interface EvaluationQuestionInput {
                question: string;
                groundTruth: string;
                relevantChunkIds?: string[] | null;
                category?: string | null;
                difficulty?: string | null;
                language?: string | null;
            }

            const questionRows: (typeof evaluationQuestions.$inferInsert)[] = questions.map(
                (q: EvaluationQuestionInput) => ({
                    runId: run.id,
                    question: q.question,
                    groundTruth: q.groundTruth,
                    relevantChunkIds: q.relevantChunkIds || null,
                    category: q.category || null,
                    difficulty: q.difficulty || null,
                    questionLanguage: q.language || null,
                })
            );

            await db.insert(evaluationQuestions).values(questionRows);
            console.log(`Inserted ${questions.length} questions`);
        }

        return Response.json({ run });
    } catch (error) {
        console.error("Error creating evaluation run:", error);
        return Response.json(
            { error: error instanceof Error ? error.message : "Failed to create evaluation run" },
            { status: 500 }
        );
    }
}
