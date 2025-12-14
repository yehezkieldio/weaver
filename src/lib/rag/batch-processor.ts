/**
 * @fileoverview Batch Processor for Multiple Document Uploads
 *
 * Implements intelligent batch processing for bulk document uploads with:
 * - File size categorization (small/medium/large)
 * - Sliding window queue for parallel processing
 * - Priority queue (small files first for quick wins)
 *
 * Key Features:
 * - Process ~3 documents concurrently
 * - Prioritize smaller documents for faster initial feedback
 * - Report overall batch progress
 */

import { type ProcessingOptions, type ProcessingResult, processDocument } from "./document-processor";

/**
 * File size categories for processing prioritization
 */
export type FileSizeCategory = "small" | "medium" | "large";

/**
 * Document entry in the batch queue
 */
export interface BatchQueueItem {
    documentId: string;
    fileSize: number;
    category: FileSizeCategory;
    status: "pending" | "processing" | "completed" | "failed";
    result?: ProcessingResult;
    error?: string;
}

/**
 * Batch processing progress event
 */
export interface BatchProgressEvent {
    batchId: string;
    totalDocuments: number;
    completedDocuments: number;
    failedDocuments: number;
    processingDocuments: number;
    progress: number; // 0-100
    estimatedTimeMs?: number;
    items: Array<{
        documentId: string;
        status: BatchQueueItem["status"];
        progress?: number;
    }>;
}

/**
 * Size thresholds for file categorization (in bytes)
 */
const SIZE_THRESHOLDS = {
    small: 1024 * 1024, // < 1MB
    medium: 5 * 1024 * 1024, // 1-5MB
    // large: > 5MB
};

/**
 * Concurrent processing limits by category
 */
const CONCURRENCY_LIMITS = {
    small: 3,
    medium: 2,
    large: 1,
};

/**
 * Categorize file by size
 */
export function categorizeBySize(fileSize: number): FileSizeCategory {
    if (fileSize < SIZE_THRESHOLDS.small) return "small";
    if (fileSize < SIZE_THRESHOLDS.medium) return "medium";
    return "large";
}

/**
 * BatchProcessor class for managing parallel document processing
 *
 * Usage:
 * ```typescript
 * const processor = new BatchProcessor();
 * processor.addDocument(docId1, fileSize1);
 * processor.addDocument(docId2, fileSize2);
 * await processor.processAll((progress) => console.log(progress));
 * ```
 */
export class BatchProcessor {
    private readonly batchId: string;
    private readonly queue: BatchQueueItem[] = [];
    private readonly startTime: number;
    private processingCount = 0;
    private readonly maxConcurrent: number;

    constructor(maxConcurrent = 3) {
        this.batchId = crypto.randomUUID();
        this.startTime = Date.now();
        this.maxConcurrent = maxConcurrent;
    }

    /**
     * Add a document to the batch queue
     */
    addDocument(documentId: string, fileSize: number): void {
        const category = categorizeBySize(fileSize);
        this.queue.push({
            documentId,
            fileSize,
            category,
            status: "pending",
        });
    }

    /**
     * Get the batch ID
     */
    getBatchId(): string {
        return this.batchId;
    }

    /**
     * Get current batch progress
     */
    getProgress(): BatchProgressEvent {
        const completed = this.queue.filter((item) => item.status === "completed").length;
        const failed = this.queue.filter((item) => item.status === "failed").length;
        const processing = this.queue.filter((item) => item.status === "processing").length;
        const total = this.queue.length;

        const progress = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

        // Estimate remaining time based on elapsed time and progress
        const elapsed = Date.now() - this.startTime;
        const estimatedTimeMs = progress > 0 ? Math.round((elapsed / progress) * (100 - progress)) : undefined;

        return {
            batchId: this.batchId,
            totalDocuments: total,
            completedDocuments: completed,
            failedDocuments: failed,
            processingDocuments: processing,
            progress,
            estimatedTimeMs,
            items: this.queue.map((item) => ({
                documentId: item.documentId,
                status: item.status,
            })),
        };
    }

    /**
     * Sort queue by priority (small files first, then by size)
     */
    private sortQueue(): void {
        const categoryOrder: Record<FileSizeCategory, number> = {
            small: 0,
            medium: 1,
            large: 2,
        };

        this.queue.sort((a, b) => {
            // First by category
            const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category];
            if (categoryDiff !== 0) return categoryDiff;
            // Then by size within category
            return a.fileSize - b.fileSize;
        });
    }

    /**
     * Process all documents in the queue with sliding window concurrency
     *
     * @param onProgress - Callback for progress updates
     * @param options - Processing options to pass to each document
     * @returns Final batch progress
     */
    async processAll(
        onProgress?: (progress: BatchProgressEvent) => void,
        options: Omit<ProcessingOptions, "enableProgressTracking"> = {}
    ): Promise<BatchProgressEvent> {
        // Sort queue by priority
        this.sortQueue();

        // Process with sliding window
        const processNext = async (): Promise<void> => {
            // Find next pending item
            const nextItem = this.queue.find((item) => item.status === "pending");
            if (!nextItem) return;

            // Check concurrency limit
            if (this.processingCount >= this.maxConcurrent) return;

            // Start processing
            this.processingCount += 1;
            nextItem.status = "processing";

            // Notify progress
            onProgress?.(this.getProgress());

            try {
                const result = await processDocument(nextItem.documentId, {
                    ...options,
                    enableProgressTracking: true,
                });

                nextItem.result = result;
                nextItem.status = result.success ? "completed" : "failed";
                if (!result.success) {
                    nextItem.error = result.error;
                }
            } catch (error) {
                nextItem.status = "failed";
                nextItem.error = error instanceof Error ? error.message : "Unknown error";
            }

            this.processingCount -= 1;

            // Notify progress
            onProgress?.(this.getProgress());

            // Process next item
            await processNext();
        };

        // Start initial batch of concurrent processes
        const initialBatch = Math.min(this.maxConcurrent, this.queue.length);
        await Promise.all(Array.from({ length: initialBatch }, () => processNext()));

        // Wait for all to complete
        while (this.queue.some((item) => item.status === "pending" || item.status === "processing")) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        return this.getProgress();
    }

    /**
     * Get results for all processed documents
     */
    getResults(): Array<{ documentId: string; success: boolean; error?: string; chunksCreated?: number }> {
        return this.queue.map((item) => ({
            documentId: item.documentId,
            success: item.status === "completed",
            error: item.error,
            chunksCreated: item.result?.chunksCreated,
        }));
    }
}
