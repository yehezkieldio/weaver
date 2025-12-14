/**
 * @fileoverview Progress Tracker for Document Processing
 *
 * Provides real-time progress tracking for document processing operations.
 * Progress is persisted to database for SSE streaming and page refresh recovery.
 *
 * Key Features:
 * - Granular stage tracking (extract, detect, chunk, embed, store)
 * - Estimated time remaining based on file size and historical averages
 * - Database persistence for cross-request visibility
 * - SSE-compatible event emission
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documentProcessingProgress, documents } from "@/lib/db/schema";
import type { ProcessingArtifact, ProcessingProgressEvent, ProcessingStage } from "@/lib/types";

/**
 * Average processing rates based on empirical measurements (ms per KB)
 * Used for time estimation calculations
 */
const STAGE_RATES: Record<ProcessingStage, number> = {
    pending: 0,
    extracting: 0.5, // 0.5ms per KB for PDF extraction
    detecting_language: 0.01, // Very fast language detection
    chunking: 0.2, // 0.2ms per KB for chunking
    embedding: 2.0, // 2ms per KB for embedding generation (slowest)
    storing: 0.1, // 0.1ms per KB for database insertion
    completed: 0,
    failed: 0,
};

/**
 * Cumulative progress percentage for each stage completion
 */
const STAGE_PROGRESS: Record<ProcessingStage, number> = {
    pending: 0,
    extracting: 15,
    detecting_language: 20,
    chunking: 35,
    embedding: 90,
    storing: 100,
    completed: 100,
    failed: 0,
};

/**
 * Human-readable stage descriptions
 */
const STAGE_MESSAGES: Record<ProcessingStage, string> = {
    pending: "Waiting to start...",
    extracting: "Extracting text from document...",
    detecting_language: "Detecting document language...",
    chunking: "Creating document chunks...",
    embedding: "Generating embeddings...",
    storing: "Storing chunks in database...",
    completed: "Processing completed",
    failed: "Processing failed",
};

/**
 * ProgressTracker class for managing document processing progress
 *
 * Usage:
 * ```typescript
 * const tracker = await ProgressTracker.create(documentId, fileSize);
 * await tracker.updateStage('extracting');
 * await tracker.updateProgress('embedding', 60, 145); // 60 of 145 embeddings
 * await tracker.complete();
 * ```
 */
export class ProgressTracker {
    private readonly documentId: string;
    private readonly fileSize: number;
    private readonly startTime: number;
    private currentStage: ProcessingStage = "pending";

    private constructor(documentId: string, fileSize: number) {
        this.documentId = documentId;
        this.fileSize = fileSize;
        this.startTime = Date.now();
    }

    /**
     * Create a new progress tracker and initialize database record
     */
    static async create(documentId: string, fileSize: number): Promise<ProgressTracker> {
        const tracker = new ProgressTracker(documentId, fileSize);

        // Upsert progress record (delete existing if any, then insert)
        await db.delete(documentProcessingProgress).where(eq(documentProcessingProgress.documentId, documentId));

        await db.insert(documentProcessingProgress).values({
            documentId,
            stage: "pending",
            progress: 0,
            message: STAGE_MESSAGES.pending,
            estimatedTimeMs: tracker.calculateTotalEstimate(),
            startedAt: new Date(),
            updatedAt: new Date(),
        });

        return tracker;
    }

    /**
     * Calculate total estimated processing time based on file size
     */
    private calculateTotalEstimate(): number {
        const fileSizeKb = this.fileSize / 1024;
        let totalMs = 0;

        for (const stage of ["extracting", "detecting_language", "chunking", "embedding", "storing"] as const) {
            totalMs += fileSizeKb * STAGE_RATES[stage];
        }

        // Add 20% buffer for variability
        return Math.round(totalMs * 1.2);
    }

    /**
     * Calculate remaining time based on current stage and progress
     */
    private calculateRemainingTime(currentProgress: number): number {
        const elapsed = Date.now() - this.startTime;

        if (currentProgress <= 0) {
            return this.calculateTotalEstimate();
        }

        // Use elapsed time to project remaining time
        const estimatedTotal = (elapsed / currentProgress) * 100;
        return Math.round(Math.max(0, estimatedTotal - elapsed));
    }

    /**
     * Update the current processing stage
     */
    async updateStage(stage: ProcessingStage, customMessage?: string): Promise<ProcessingProgressEvent> {
        this.currentStage = stage;
        const progress = STAGE_PROGRESS[stage];
        const message = customMessage ?? STAGE_MESSAGES[stage];
        const estimatedTimeMs = this.calculateRemainingTime(progress);

        await db
            .update(documentProcessingProgress)
            .set({
                stage,
                progress,
                message,
                estimatedTimeMs,
                updatedAt: new Date(),
            })
            .where(eq(documentProcessingProgress.documentId, this.documentId));

        // Update lastSuccessfulStage on documents table if not failed
        if (stage !== "failed" && stage !== "pending") {
            await db
                .update(documents)
                .set({
                    lastSuccessfulStage: stage,
                    updatedAt: new Date(),
                })
                .where(eq(documents.id, this.documentId));
        }

        return {
            documentId: this.documentId,
            stage,
            progress,
            message,
            estimatedTimeMs,
        };
    }

    /**
     * Update progress within a stage (e.g., embedding 60/145)
     */
    async updateProgress(
        stage: ProcessingStage,
        current: number,
        total: number,
        customMessage?: string
    ): Promise<ProcessingProgressEvent> {
        this.currentStage = stage;

        // Calculate progress within the stage range
        const stageStart = STAGE_PROGRESS[this.getPreviousStage(stage)] ?? 0;
        const stageEnd = STAGE_PROGRESS[stage];
        const stageRange = stageEnd - stageStart;
        const stageProgress = total > 0 ? (current / total) * stageRange : 0;
        const progress = Math.round(stageStart + stageProgress);

        const message = customMessage ?? `${STAGE_MESSAGES[stage].replace("...", "")} (${current}/${total})...`;
        const estimatedTimeMs = this.calculateRemainingTime(progress);

        await db
            .update(documentProcessingProgress)
            .set({
                stage,
                progress,
                message,
                estimatedTimeMs,
                stageProgress: { current, total },
                updatedAt: new Date(),
            })
            .where(eq(documentProcessingProgress.documentId, this.documentId));

        return {
            documentId: this.documentId,
            stage,
            progress,
            message,
            estimatedTimeMs,
            stageProgress: { current, total },
        };
    }

    /**
     * Get the previous stage in the pipeline
     */
    private getPreviousStage(stage: ProcessingStage): ProcessingStage {
        const stages: ProcessingStage[] = [
            "pending",
            "extracting",
            "detecting_language",
            "chunking",
            "embedding",
            "storing",
            "completed",
        ];
        const idx = stages.indexOf(stage);
        return idx > 0 ? stages[idx - 1] : "pending";
    }

    /**
     * Mark processing as completed
     */
    async complete(): Promise<ProcessingProgressEvent> {
        const event = await this.updateStage("completed", "Processing completed successfully");

        // Update document status
        await db
            .update(documents)
            .set({
                processingStatus: "completed",
                lastSuccessfulStage: "completed",
                updatedAt: new Date(),
            })
            .where(eq(documents.id, this.documentId));

        return event;
    }

    /**
     * Mark processing as failed
     */
    async fail(error: string): Promise<ProcessingProgressEvent> {
        await db
            .update(documentProcessingProgress)
            .set({
                stage: "failed",
                message: `Processing failed: ${error}`,
                updatedAt: new Date(),
            })
            .where(eq(documentProcessingProgress.documentId, this.documentId));

        await db
            .update(documents)
            .set({
                processingStatus: "failed",
                processingError: error,
                updatedAt: new Date(),
            })
            .where(eq(documents.id, this.documentId));

        return {
            documentId: this.documentId,
            stage: "failed",
            progress: STAGE_PROGRESS[this.currentStage],
            message: `Processing failed: ${error}`,
            error,
        };
    }

    /**
     * Save intermediate artifacts for partial recovery
     */
    async saveArtifact(artifact: Partial<ProcessingArtifact>): Promise<void> {
        const [doc] = await db.select().from(documents).where(eq(documents.id, this.documentId)).limit(1);

        const existingArtifacts = (doc?.processingArtifacts ?? {}) as ProcessingArtifact;
        const mergedArtifacts: ProcessingArtifact = {
            ...existingArtifacts,
            ...artifact,
        };

        await db
            .update(documents)
            .set({
                processingArtifacts: mergedArtifacts,
                updatedAt: new Date(),
            })
            .where(eq(documents.id, this.documentId));
    }

    /**
     * Get current progress from database (for SSE endpoint)
     */
    static async getProgress(documentId: string): Promise<ProcessingProgressEvent | null> {
        const [progress] = await db
            .select()
            .from(documentProcessingProgress)
            .where(eq(documentProcessingProgress.documentId, documentId))
            .limit(1);

        if (!progress) {
            return null;
        }

        return {
            documentId,
            stage: progress.stage as ProcessingStage,
            progress: progress.progress,
            message: progress.message ?? "",
            estimatedTimeMs: progress.estimatedTimeMs ?? undefined,
            stageProgress: progress.stageProgress ?? undefined,
        };
    }
}
