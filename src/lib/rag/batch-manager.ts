/**
 * @fileoverview In-Memory Batch Manager for Document Processing
 *
 * Manages batch upload sessions with:
 * - Concurrent processing limits based on file size
 * - Cancellation support
 * - Progress tracking without per-file SSE connections
 *
 * Note: Batches are stored in-memory and will be lost on server restart.
 * This is acceptable since batches are short-lived (minutes, not hours).
 */

import { type ProcessingOptions, type ProcessingResult, processDocument } from "./document-processor";

type FileSizeCategory = "small" | "medium" | "large";

interface BatchDocument {
    documentId: string;
    fileSize: number;
    category: FileSizeCategory;
    status: "pending" | "processing" | "completed" | "failed";
    progress: number;
    error?: string;
    result?: ProcessingResult;
}

interface BatchState {
    batchId: string;
    documents: BatchDocument[];
    options: ProcessingOptions;
    cancelled: boolean;
    startedAt: number;
    processingCount: number;
}

export interface BatchProgressResponse {
    batchId: string;
    status: "pending" | "processing" | "completed" | "cancelled";
    totalDocuments: number;
    completedDocuments: number;
    failedDocuments: number;
    processingDocuments: number;
    progress: number;
    estimatedTimeMs?: number;
    items: Array<{
        documentId: string;
        fileName?: string;
        status: BatchDocument["status"];
        progress: number;
        error?: string;
    }>;
}

const SIZE_THRESHOLDS = {
    small: 1024 * 1024, // < 1MB
    medium: 5 * 1024 * 1024, // 1-5MB
};

const MAX_CONCURRENT = 2;

function categorizeBySize(fileSize: number): FileSizeCategory {
    if (fileSize < SIZE_THRESHOLDS.small) return "small";
    if (fileSize < SIZE_THRESHOLDS.medium) return "medium";
    return "large";
}

// In-memory batch storage
const batches = new Map<string, BatchState>();

// Cleanup old batches after 30 minutes
const BATCH_TTL_MS = 30 * 60 * 1000;

function cleanupOldBatches(): void {
    const now = Date.now();
    for (const [batchId, batch] of batches.entries()) {
        if (now - batch.startedAt > BATCH_TTL_MS) {
            batches.delete(batchId);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupOldBatches, 5 * 60 * 1000);

export const BatchManager = {
    /**
     * Create a new batch for document processing
     */
    createBatch(
        documents: Array<{ documentId: string; fileSize: number }>,
        options: Omit<ProcessingOptions, "enableProgressTracking"> = {}
    ): string {
        const batchId = crypto.randomUUID();

        const batchDocs: BatchDocument[] = documents.map((doc) => ({
            documentId: doc.documentId,
            fileSize: doc.fileSize,
            category: categorizeBySize(doc.fileSize),
            status: "pending",
            progress: 0,
        }));

        // Sort by size (smaller first for quick wins)
        batchDocs.sort((a, b) => a.fileSize - b.fileSize);

        batches.set(batchId, {
            batchId,
            documents: batchDocs,
            options: { ...options, enableProgressTracking: true },
            cancelled: false,
            startedAt: Date.now(),
            processingCount: 0,
        });

        return batchId;
    },

    /**
     * Start processing a batch (call this in background)
     */
    async startBatch(batchId: string): Promise<void> {
        const batch = batches.get(batchId);
        if (!batch) return;

        const processNext = async (): Promise<void> => {
            const currentBatch = batches.get(batchId);
            if (!currentBatch || currentBatch.cancelled) return;

            // Find next pending document
            const nextDoc = currentBatch.documents.find((doc) => doc.status === "pending");
            if (!nextDoc) return;

            // Check concurrency limit
            if (currentBatch.processingCount >= MAX_CONCURRENT) return;

            // Start processing
            currentBatch.processingCount += 1;
            nextDoc.status = "processing";
            nextDoc.progress = 10;

            try {
                const result = await processDocument(nextDoc.documentId, currentBatch.options);

                nextDoc.result = result;
                nextDoc.status = result.success ? "completed" : "failed";
                nextDoc.progress = result.success ? 100 : 0;
                if (!result.success) {
                    nextDoc.error = result.error;
                }
            } catch (error) {
                nextDoc.status = "failed";
                nextDoc.error = error instanceof Error ? error.message : "Unknown error";
                nextDoc.progress = 0;
            }

            currentBatch.processingCount -= 1;

            // Process next document
            if (!currentBatch.cancelled) {
                await processNext();
            }
        };

        // Start concurrent processes
        const initialBatch = Math.min(MAX_CONCURRENT, batch.documents.length);
        await Promise.all(Array.from({ length: initialBatch }, () => processNext()));
    },

    /**
     * Get batch progress
     */
    getBatchProgress(batchId: string): BatchProgressResponse | null {
        const batch = batches.get(batchId);
        if (!batch) return null;

        const completed = batch.documents.filter((doc) => doc.status === "completed").length;
        const failed = batch.documents.filter((doc) => doc.status === "failed").length;
        const processing = batch.documents.filter((doc) => doc.status === "processing").length;
        const total = batch.documents.length;

        const progress = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

        // Calculate ETA
        const elapsed = Date.now() - batch.startedAt;
        const estimatedTimeMs = progress > 0 ? Math.round((elapsed / progress) * (100 - progress)) : undefined;

        // Determine overall status
        let status: BatchProgressResponse["status"];
        if (batch.cancelled) {
            status = "cancelled";
        } else if (completed + failed === total) {
            status = "completed";
        } else if (processing > 0 || completed > 0 || failed > 0) {
            status = "processing";
        } else {
            status = "pending";
        }

        return {
            batchId,
            status,
            totalDocuments: total,
            completedDocuments: completed,
            failedDocuments: failed,
            processingDocuments: processing,
            progress,
            estimatedTimeMs,
            items: batch.documents.map((doc) => ({
                documentId: doc.documentId,
                status: doc.status,
                progress: doc.progress,
                error: doc.error,
            })),
        };
    },

    /**
     * Cancel a batch
     */
    cancelBatch(batchId: string): boolean {
        const batch = batches.get(batchId);
        if (!batch) return false;

        batch.cancelled = true;
        return true;
    },

    /**
     * Check if batch exists
     */
    hasBatch(batchId: string): boolean {
        return batches.has(batchId);
    },
};
