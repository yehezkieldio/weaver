/**
 * @fileoverview Batch Upload API Route
 *
 * Creates a batch upload session that accepts multiple files at once,
 * returning a batch ID for polling progress.
 *
 * This replaces the per-file SSE approach to avoid browser connection limits.
 */

import { db } from "@/lib/db";
import { documents, type NewDocument } from "@/lib/db/schema";
import { BatchManager } from "@/lib/rag/batch-manager";
import type { ChunkingStrategy } from "@/lib/rag/chunking";
import { extractTextFromFile } from "@/lib/rag/document-processor";
import type { AcademicDocumentType } from "@/lib/rag/university-domain";
import { detectDocumentType, extractAcademicKeywords, extractCourseInfo } from "@/lib/rag/university-domain";
import { detectDocumentLanguage } from "@/lib/rag/utils/language";
import type { ExtendedDocumentType } from "@/lib/types";

const FILE_NAME_EXTENSION_REGEX = /\.[^/.]+$/;

export interface BatchUploadResponse {
    success: boolean;
    batchId: string;
    documents: Array<{
        id: string;
        fileName: string;
        status: "pending" | "processing" | "completed" | "failed";
        error?: string;
    }>;
    message: string;
}

/**
 * POST /api/documents/batch
 *
 * Upload multiple documents and start batch processing.
 * Returns a batch ID that can be used to poll for progress.
 */
export async function POST(request: Request): Promise<Response> {
    try {
        const formData = await request.formData();
        const files = formData.getAll("files") as File[];
        const category = formData.get("category") as string | null;
        const tags = formData.get("tags") as string | null;
        const chunkingStrategy = (formData.get("chunkingStrategy") as ChunkingStrategy) || "recursive";
        const documentType = (formData.get("documentType") as string) || "auto";
        const languageHint = (formData.get("languageHint") as "auto" | "en" | "id") || "auto";

        if (files.length === 0) {
            return Response.json({ error: "No files provided" }, { status: 400 });
        }

        const allowedTypes = ["application/pdf", "text/plain", "text/markdown"];
        const uploadedDocs: Array<{
            id: string;
            fileName: string;
            fileSize: number;
            status: "pending" | "processing" | "completed" | "failed";
            error?: string;
        }> = [];

        // Upload all files and create document records
        for (const file of files) {
            const fileExt = file.name.split(".").pop()?.toLowerCase();
            if (!(allowedTypes.includes(file.type) || ["pdf", "txt", "md"].includes(fileExt || ""))) {
                uploadedDocs.push({
                    id: "",
                    fileName: file.name,
                    fileSize: file.size,
                    status: "failed",
                    error: `Unsupported file type: ${fileExt}`,
                });
                continue;
            }

            try {
                const extractionResult = await extractTextFromFile(file);
                const content = extractionResult.text;

                const detectedType =
                    documentType === "auto"
                        ? await detectDocumentType(content)
                        : (documentType as AcademicDocumentType);
                const detectedLanguage = languageHint === "auto" ? detectDocumentLanguage(content) : languageHint;

                const courseInfo = extractCourseInfo(content);
                const keywords = await extractAcademicKeywords(content);
                const mappedDocType = detectedType as ExtendedDocumentType;

                const newDoc: NewDocument = {
                    title: file.name.replace(FILE_NAME_EXTENSION_REGEX, ""),
                    fileName: file.name,
                    fileType: fileExt || file.type,
                    fileSize: file.size,
                    content,
                    metadata: {
                        category: category || undefined,
                        tags: tags ? tags.split(",").map((t) => t.trim()) : undefined,
                        documentType: mappedDocType,
                        courseCode: courseInfo.courseCode,
                        department: courseInfo.courseName,
                        keywords,
                        pages: extractionResult.metadata?.pages,
                        wordCount: extractionResult.metadata?.wordCount,
                    },
                    chunkingStrategy,
                    processingStatus: "pending",
                };

                const [insertedDoc] = await db.insert(documents).values(newDoc).returning();

                uploadedDocs.push({
                    id: insertedDoc.id,
                    fileName: file.name,
                    fileSize: file.size,
                    status: "pending",
                });
            } catch (error) {
                uploadedDocs.push({
                    id: "",
                    fileName: file.name,
                    fileSize: file.size,
                    status: "failed",
                    error: error instanceof Error ? error.message : "Upload failed",
                });
            }
        }

        // Create batch and start processing
        const validDocs = uploadedDocs.filter((doc) => doc.id && doc.status === "pending");
        if (validDocs.length === 0) {
            return Response.json({
                success: false,
                batchId: "",
                documents: uploadedDocs,
                message: "No valid documents to process",
            } as BatchUploadResponse);
        }

        const batchId = BatchManager.createBatch(
            validDocs.map((doc) => ({ documentId: doc.id, fileSize: doc.fileSize })),
            { chunkingStrategy, language: languageHint === "auto" ? undefined : languageHint }
        );

        // Start batch processing in background (non-blocking)
        BatchManager.startBatch(batchId).catch((error) => {
            console.error(`[batch/route] Batch ${batchId} processing error:`, error);
        });

        return Response.json({
            success: true,
            batchId,
            documents: uploadedDocs,
            message: `Batch upload started with ${validDocs.length} documents`,
        } as BatchUploadResponse);
    } catch (error) {
        console.error("[batch/route] Upload error:", error);
        return Response.json(
            { error: error instanceof Error ? error.message : "Batch upload failed" },
            { status: 500 }
        );
    }
}
