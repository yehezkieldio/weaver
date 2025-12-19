/**
 * @fileoverview Batch Status API Route
 *
 * Provides batch progress polling endpoint and batch cancellation.
 * Single endpoint replaces N SSE connections.
 */

import { BatchManager } from "@/lib/rag/batch-manager";

/**
 * GET /api/documents/batch/[batchId]
 *
 * Poll for batch processing progress.
 * Returns status of all documents in the batch.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ batchId: string }> }): Promise<Response> {
    const { batchId } = await params;

    const progress = BatchManager.getBatchProgress(batchId);

    if (!progress) {
        return Response.json({ error: "Batch not found" }, { status: 404 });
    }

    return Response.json(progress);
}

/**
 * DELETE /api/documents/batch/[batchId]
 *
 * Cancel a batch processing job.
 * Pending documents will remain in pending status.
 */
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ batchId: string }> }
): Promise<Response> {
    const { batchId } = await params;

    const cancelled = BatchManager.cancelBatch(batchId);

    if (!cancelled) {
        return Response.json({ error: "Batch not found or already completed" }, { status: 404 });
    }

    return Response.json({ success: true, message: "Batch cancelled" });
}
