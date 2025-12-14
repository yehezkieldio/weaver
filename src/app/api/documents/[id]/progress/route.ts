/**
 * @fileoverview SSE Endpoint for Document Processing Progress
 *
 * Provides real-time progress updates for document processing via Server-Sent Events.
 * Clients connect to this endpoint and receive progress updates until processing completes or fails.
 *
 * Features:
 * - Real-time stage updates (extracting, chunking, embedding, etc.)
 * - Progress percentage and ETA
 * - Auto-closes on completion or failure
 * - Heartbeat to keep connection alive
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documentProcessingProgress, documents } from "@/lib/db/schema";
import type { ProcessingProgressEvent, ProcessingStage } from "@/lib/types";

/**
 * GET /api/documents/[id]/progress
 *
 * SSE endpoint that streams document processing progress.
 * Polls database every 500ms and sends updates when progress changes.
 *
 * @param request - Request object
 * @param params - Route params containing document ID
 * @returns SSE stream of progress events
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
    const { id: documentId } = await params;

    // Validate document exists
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);

    if (!doc) {
        return new Response(JSON.stringify({ error: "Document not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    let isActive = true;
    let lastProgress = -1;

    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: ProcessingProgressEvent) => {
                const data = `data: ${JSON.stringify(event)}\n\n`;
                controller.enqueue(encoder.encode(data));
            };

            const sendHeartbeat = () => {
                controller.enqueue(encoder.encode(": heartbeat\n\n"));
            };

            // Poll for progress updates
            const pollInterval = setInterval(async () => {
                if (!isActive) {
                    clearInterval(pollInterval);
                    return;
                }

                try {
                    const [progress] = await db
                        .select()
                        .from(documentProcessingProgress)
                        .where(eq(documentProcessingProgress.documentId, documentId))
                        .limit(1);

                    if (progress && progress.progress !== lastProgress) {
                        lastProgress = progress.progress;

                        const event: ProcessingProgressEvent = {
                            documentId,
                            stage: progress.stage as ProcessingStage,
                            progress: progress.progress,
                            message: progress.message ?? "",
                            estimatedTimeMs: progress.estimatedTimeMs ?? undefined,
                            stageProgress: progress.stageProgress ?? undefined,
                        };

                        sendEvent(event);

                        // Close stream if completed or failed
                        if (progress.stage === "completed" || progress.stage === "failed") {
                            isActive = false;
                            clearInterval(pollInterval);
                            controller.close();
                            return;
                        }
                    }
                } catch {
                    // On error, send heartbeat to keep connection alive
                    sendHeartbeat();
                }
            }, 500);

            // Heartbeat every 15 seconds to prevent timeout
            const heartbeatInterval = setInterval(() => {
                if (isActive) {
                    sendHeartbeat();
                } else {
                    clearInterval(heartbeatInterval);
                }
            }, 15_000);

            // Handle client disconnect
            request.signal.addEventListener("abort", () => {
                isActive = false;
                clearInterval(pollInterval);
                clearInterval(heartbeatInterval);
            });

            // Send initial progress immediately
            const [initialProgress] = await db
                .select()
                .from(documentProcessingProgress)
                .where(eq(documentProcessingProgress.documentId, documentId))
                .limit(1);

            if (initialProgress) {
                lastProgress = initialProgress.progress;
                sendEvent({
                    documentId,
                    stage: initialProgress.stage as ProcessingStage,
                    progress: initialProgress.progress,
                    message: initialProgress.message ?? "",
                    estimatedTimeMs: initialProgress.estimatedTimeMs ?? undefined,
                    stageProgress: initialProgress.stageProgress ?? undefined,
                });

                // If already completed or failed, close immediately
                if (initialProgress.stage === "completed" || initialProgress.stage === "failed") {
                    isActive = false;
                    clearInterval(pollInterval);
                    clearInterval(heartbeatInterval);
                    controller.close();
                }
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
