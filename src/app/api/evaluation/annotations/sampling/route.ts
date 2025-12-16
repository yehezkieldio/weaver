/**
 * @fileoverview API Route: Annotation Sampling Strategy
 *
 * WHY This Endpoint Exists:
 * - Provides intelligent question selection for human annotation
 * - Ensures coverage across difficulty levels and automated score ranges
 * - Prioritizes questions not yet annotated
 * - Enables stratified sampling for representative evaluation
 *
 * Sampling Strategy:
 * 1. Stratified by difficulty (easy/medium/hard distribution)
 * 2. Score distribution (include both high and low automated scores)
 * 3. Category coverage (ensure all categories represented)
 * 4. Prioritize unannotated questions
 */

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { evaluationQuestions, humanAnnotations } from "@/lib/db/schema";

interface SampledQuestion {
    id: string;
    question: string;
    groundTruth: string;
    ragAnswer: string | null;
    retrievedContexts: string[] | null;
    difficulty: "easy" | "medium" | "hard" | "unknown";
    automatedScores: {
        faithfulness: number | null;
        relevancy: number | null;
        correctness: number | null;
        hallucinationRate: number | null;
    };
    annotationCount: number;
    priority: "high" | "medium" | "low";
}

type QuestionRecord = typeof evaluationQuestions.$inferSelect;

/**
 * GET /api/evaluation/annotations/sampling
 *
 * Get suggested questions for annotation based on stratified sampling.
 *
 * Query Parameters:
 * - runId: string (required) - Evaluation run to sample from
 * - count?: number - Target number of questions (default: 30)
 * - annotatorId?: string - Exclude questions already annotated by this annotator
 * - strategy?: "stratified" | "random" | "outliers" - Sampling strategy (default: stratified)
 *
 * Response:
 * - Success (200): {
 *     questions: SampledQuestion[],
 *     sampling: { total, sampled, byDifficulty, byScoreRange },
 *     coverage: { annotated, pending, percentComplete }
 *   }
 * - Error (400): { error: string } - Missing runId
 * - Error (500): { error: string } - Database error
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const runId = searchParams.get("runId");
        const targetCount = Math.min(50, Math.max(5, Number(searchParams.get("count")) || 30));
        const annotatorId = searchParams.get("annotatorId");
        const strategy = searchParams.get("strategy") || "stratified";

        if (!runId) {
            return Response.json({ error: "runId is required" }, { status: 400 });
        }

        // Get all questions for this run
        const allQuestions = await db.select().from(evaluationQuestions).where(eq(evaluationQuestions.runId, runId));

        if (allQuestions.length === 0) {
            return Response.json({
                questions: [],
                sampling: { total: 0, sampled: 0, byDifficulty: {}, byScoreRange: {} },
                coverage: { annotated: 0, pending: 0, percentComplete: 0 },
            });
        }

        // Get existing annotations for this run
        const existingAnnotations = await db
            .select({
                questionId: humanAnnotations.evaluationQuestionId,
                annotatorId: humanAnnotations.annotatorId,
            })
            .from(humanAnnotations)
            .where(
                sql`${humanAnnotations.evaluationQuestionId} IN (${sql.raw(allQuestions.map((q) => `'${q.id}'`).join(","))})`
            );

        // Count annotations per question
        const annotationCounts: Record<string, number> = {};
        const annotatedByUser: Set<string> = new Set();

        for (const annotation of existingAnnotations) {
            annotationCounts[annotation.questionId] = (annotationCounts[annotation.questionId] || 0) + 1;
            if (annotatorId && annotation.annotatorId === annotatorId) {
                annotatedByUser.add(annotation.questionId);
            }
        }

        // Classify questions by difficulty based on automated scores
        const classifyDifficulty = (q: QuestionRecord): "easy" | "medium" | "hard" | "unknown" => {
            const correctness = q.ragAnswerCorrectness;
            if (correctness === null || correctness === undefined) return "unknown";
            if (correctness >= 0.7) return "easy"; // High correctness = easy question
            if (correctness >= 0.4) return "medium";
            return "hard"; // Low correctness = hard question
        };

        // Classify score range for outlier detection
        const classifyScoreRange = (q: QuestionRecord): "high" | "medium" | "low" | "unknown" => {
            const scores = [q.ragFaithfulness, q.ragAnswerRelevancy, q.ragAnswerCorrectness].filter(
                (s): s is number => s !== null && s !== undefined
            );

            if (scores.length === 0) return "unknown";
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

            if (Number.isNaN(avgScore)) return "unknown";
            if (avgScore >= 0.7) return "high";
            if (avgScore >= 0.4) return "medium";
            return "low";
        };

        // Calculate priority
        const calculatePriority = (q: QuestionRecord, annotationCount: number): "high" | "medium" | "low" => {
            // Not yet annotated = highest priority
            if (annotationCount === 0) {
                // Outliers get higher priority
                const scoreRange = classifyScoreRange(q);
                if (scoreRange === "low" || scoreRange === "high") return "high";
                return "medium";
            }
            // Already annotated once but could use more for reliability
            if (annotationCount === 1) return "medium";
            // Already has multiple annotations
            return "low";
        };

        // Build sampled question objects
        const sampledQuestions: SampledQuestion[] = allQuestions
            .filter((q) => !annotatedByUser.has(q.id)) // Exclude already annotated by this user
            .map((q) => ({
                id: q.id,
                question: q.question,
                groundTruth: q.groundTruth,
                ragAnswer: q.ragAnswer,
                retrievedContexts: q.retrievedContexts,
                difficulty: classifyDifficulty(q),
                automatedScores: {
                    faithfulness: q.ragFaithfulness,
                    relevancy: q.ragAnswerRelevancy,
                    correctness: q.ragAnswerCorrectness,
                    hallucinationRate: q.ragHallucinationRate,
                },
                annotationCount: annotationCounts[q.id] || 0,
                priority: calculatePriority(q, annotationCounts[q.id] || 0),
            }));

        // Apply sampling strategy
        let selectedQuestions: SampledQuestion[];

        if (strategy === "outliers") {
            // Prioritize questions with extreme scores
            selectedQuestions = sampledQuestions
                .sort((a, b) => {
                    const aScore = a.automatedScores.correctness ?? 0.5;
                    const bScore = b.automatedScores.correctness ?? 0.5;
                    // Sort by distance from 0.5 (extremes first)
                    return Math.abs(bScore - 0.5) - Math.abs(aScore - 0.5);
                })
                .slice(0, targetCount);
        } else if (strategy === "random") {
            // Random shuffle
            selectedQuestions = [...sampledQuestions].sort(() => Math.random() - 0.5).slice(0, targetCount);
        } else {
            // Stratified by difficulty and priority (default)
            const byDifficultyGroups: Record<string, SampledQuestion[]> = {
                easy: [],
                medium: [],
                hard: [],
                unknown: [],
            };

            for (const q of sampledQuestions) {
                byDifficultyGroups[q.difficulty].push(q);
            }

            // Sort each difficulty group by priority
            for (const key of Object.keys(byDifficultyGroups)) {
                byDifficultyGroups[key].sort((a, b) => {
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                });
            }

            // Select proportionally from each difficulty
            const targetPerDifficulty = Math.ceil(targetCount / 3);
            selectedQuestions = [
                ...byDifficultyGroups.easy.slice(0, targetPerDifficulty),
                ...byDifficultyGroups.medium.slice(0, targetPerDifficulty),
                ...byDifficultyGroups.hard.slice(0, targetPerDifficulty),
                ...byDifficultyGroups.unknown.slice(0, Math.ceil(targetPerDifficulty / 2)),
            ].slice(0, targetCount);
        }

        // Calculate coverage statistics
        const annotatedCount = Object.keys(annotationCounts).length;
        const totalCount = allQuestions.length;

        // Calculate distribution statistics
        const byDifficulty: Record<string, number> = {};
        const byScoreRange: Record<string, number> = {};

        for (const q of selectedQuestions) {
            byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
            const foundQuestion = allQuestions.find((aq) => aq.id === q.id);
            if (foundQuestion) {
                const scoreRange = classifyScoreRange(foundQuestion);
                byScoreRange[scoreRange] = (byScoreRange[scoreRange] || 0) + 1;
            }
        }

        return Response.json({
            questions: selectedQuestions,
            sampling: {
                total: sampledQuestions.length,
                sampled: selectedQuestions.length,
                strategy,
                byDifficulty,
                byScoreRange,
            },
            coverage: {
                annotated: annotatedCount,
                pending: totalCount - annotatedCount,
                total: totalCount,
                percentComplete: Math.round((annotatedCount / totalCount) * 100),
            },
        });
    } catch (error) {
        console.error("[GET /api/evaluation/annotations/sampling] Error:", error);
        return Response.json({ error: "Failed to get sampling suggestions" }, { status: 500 });
    }
}
