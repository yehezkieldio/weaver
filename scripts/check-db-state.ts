import { count, isNotNull, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { documentChunks, documents } from "../src/lib/db/schema";

async function check() {
    console.log("=== Checking Database State ===\n");

    // Check documents by status
    const docs = await db
        .select({
            status: documents.processingStatus,
            count: count(),
        })
        .from(documents)
        .groupBy(documents.processingStatus);
    console.log("Documents by status:", docs);

    // Check total chunks
    const chunks = await db.select({ count: count() }).from(documentChunks);
    console.log("Total chunks:", chunks[0]?.count ?? 0);

    // Check chunks with embeddings
    const chunksWithEmbedding = await db
        .select({ count: count() })
        .from(documentChunks)
        .where(isNotNull(documentChunks.embedding));
    console.log("Chunks with embeddings:", chunksWithEmbedding[0]?.count ?? 0);

    // Check a sample chunk to see if embedding exists
    const sampleChunk = await db
        .select({
            id: documentChunks.id,
            content: documentChunks.content,
            hasEmbedding: sql<boolean>`embedding IS NOT NULL`,
        })
        .from(documentChunks)
        .limit(1);
    console.log(
        "\nSample chunk:",
        sampleChunk[0]
            ? {
                  id: sampleChunk[0].id,
                  contentPreview: sampleChunk[0].content?.substring(0, 100),
                  hasEmbedding: sampleChunk[0].hasEmbedding,
              }
            : "No chunks found"
    );

    process.exit(0);
}

check().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
