/**
 * @fileoverview API Route: Human Annotations
 *
 * WHY This Endpoint Exists:
 * - Collect human annotations for LLM-as-judge validation
 * - Enable correlation analysis between automated and human metrics
 * - Support inter-rater reliability calculations
 *
 * POST: Submit new human annotation for an evaluation question
 * GET: List annotations with optional filters (runId, annotatorId)
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { evaluationQuestions, humanAnnotations } from "@/lib/db/schema";

/**
 * POST /api/evaluation/annotations
 *
 * Submit a new human annotation for an evaluation question.
 *
 * Request Body:
 * - evaluationQuestionId: string - ID of the question being annotated
 * - annotatorId: string - Pseudonymous annotator identifier
 * - faithfulnessRating: number (1-5) - How well answer sticks to sources
 * - relevancyRating: number (1-5) - How well answer addresses question
 * - correctnessRating: number (1-5) - Factual accuracy vs ground truth
 * - hasHallucination: boolean - Did the answer contain fabricated info?
 * - hallucinationNotes?: string - Optional explanation
 * - overallQuality?: number (1-5) - Overall answer quality
 * - annotationTimeMs?: number - Time spent annotating
 * - notes?: string - General observations
 *
 * Response:
 * - Success (201): { success: true, annotation: HumanAnnotation }
 * - Error (400): { error: string } - Validation failure
 * - Error (500): { error: string } - Database error
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate required fields
        const {
            evaluationQuestionId,
            annotatorId,
            faithfulnessRating,
            relevancyRating,
            correctnessRating,
            hasHallucination,
        } = body;

        if (!(evaluationQuestionId && annotatorId)) {
            return Response.json({ error: "evaluationQuestionId and annotatorId are required" }, { status: 400 });
        }

        // Validate rating ranges (1-5)
        const validateRating = (rating: unknown, name: string): number | null => {
            if (rating === null || rating === undefined) return null;
            const num = Number(rating);
            if (Number.isNaN(num) || num < 1 || num > 5) {
                throw new Error(`${name} must be between 1 and 5`);
            }
            return num;
        };

        let validatedFaithfulness: number | null;
        let validatedRelevancy: number | null;
        let validatedCorrectness: number | null;
        let validatedOverallQuality: number | null;

        try {
            validatedFaithfulness = validateRating(faithfulnessRating, "faithfulnessRating");
            validatedRelevancy = validateRating(relevancyRating, "relevancyRating");
            validatedCorrectness = validateRating(correctnessRating, "correctnessRating");
            validatedOverallQuality = validateRating(body.overallQuality, "overallQuality");
        } catch (validationError) {
            return Response.json({ error: (validationError as Error).message }, { status: 400 });
        }

        // Verify the evaluation question exists
        const [question] = await db
            .select()
            .from(evaluationQuestions)
            .where(eq(evaluationQuestions.id, evaluationQuestionId));

        if (!question) {
            return Response.json({ error: "Evaluation question not found" }, { status: 404 });
        }

        // Insert the annotation
        const [annotation] = await db
            .insert(humanAnnotations)
            .values({
                evaluationQuestionId,
                annotatorId,
                faithfulnessRating: validatedFaithfulness,
                relevancyRating: validatedRelevancy,
                correctnessRating: validatedCorrectness,
                hasHallucination: hasHallucination ?? null,
                hallucinationNotes: body.hallucinationNotes ?? null,
                overallQuality: validatedOverallQuality,
                annotationTimeMs: body.annotationTimeMs ?? null,
                notes: body.notes ?? null,
            })
            .returning();

        console.log(`[Annotations] New annotation submitted by ${annotatorId} for question ${evaluationQuestionId}`);

        return Response.json({ success: true, annotation }, { status: 201 });
    } catch (error) {
        console.error("[POST /api/evaluation/annotations] Error:", error);
        return Response.json({ error: "Failed to submit annotation" }, { status: 500 });
    }
}

/**
 * GET /api/evaluation/annotations
 *
 * List annotations with optional filters.
 *
 * Query Parameters:
 * - runId?: string - Filter by evaluation run ID
 * - annotatorId?: string - Filter by annotator ID
 * - questionId?: string - Filter by specific question ID
 *
 * Response:
 * - Success (200): { annotations: HumanAnnotation[], summary: { total, byAnnotator, byQuestion } }
 * - Error (500): { error: string } - Database error
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const runId = searchParams.get("runId");
        const annotatorId = searchParams.get("annotatorId");
        const questionId = searchParams.get("questionId");

        // Build query conditions
        const conditions: (typeof eq extends (...args: infer P) => infer R ? R : never)[] = [];

        if (annotatorId) {
            conditions.push(eq(humanAnnotations.annotatorId, annotatorId));
        }

        if (questionId) {
            conditions.push(eq(humanAnnotations.evaluationQuestionId, questionId));
        }

        // If runId is provided, we need to get question IDs for that run first
        let questionIds: string[] = [];
        if (runId) {
            const questions = await db
                .select({ id: evaluationQuestions.id })
                .from(evaluationQuestions)
                .where(eq(evaluationQuestions.runId, runId));
            questionIds = questions.map((q) => q.id);

            if (questionIds.length > 0) {
                conditions.push(inArray(humanAnnotations.evaluationQuestionId, questionIds));
            } else {
                // No questions for this run, return empty
                return Response.json({
                    annotations: [],
                    summary: { total: 0, byAnnotator: {}, byQuestion: {} },
                });
            }
        }

        // Execute query
        const annotations = await db
            .select()
            .from(humanAnnotations)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(humanAnnotations.createdAt);

        // Calculate summary statistics
        const byAnnotator: Record<string, number> = {};
        const byQuestion: Record<string, number> = {};

        for (const annotation of annotations) {
            byAnnotator[annotation.annotatorId] = (byAnnotator[annotation.annotatorId] || 0) + 1;
            byQuestion[annotation.evaluationQuestionId] = (byQuestion[annotation.evaluationQuestionId] || 0) + 1;
        }

        return Response.json({
            annotations,
            summary: {
                total: annotations.length,
                byAnnotator,
                byQuestion,
                uniqueAnnotators: Object.keys(byAnnotator).length,
                questionsAnnotated: Object.keys(byQuestion).length,
            },
        });
    } catch (error) {
        console.error("[GET /api/evaluation/annotations] Error:", error);
        return Response.json({ error: "Failed to fetch annotations" }, { status: 500 });
    }
}
