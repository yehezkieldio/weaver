import { and, isNotNull, sql } from "drizzle-orm";
import { generateEmbedding } from "../src/lib/ai/embeddings";
import { db } from "../src/lib/db";
import { documentChunks, documents } from "../src/lib/db/schema";

async function testVectorSearch() {
    console.log("=== Testing Vector Search ===\n");

    // Test query
    const query = "Apa visi dan misi Universitas Mulia?";

    console.log(`Test query: "${query}"\n`);

    // Generate embedding for query
    console.log("1. Generating query embedding...");
    try {
        const { embedding: queryEmbedding } = await generateEmbedding(query);
        console.log(`   Embedding generated, dimensions: ${queryEmbedding.length}`);

        const queryVector = `[${queryEmbedding.join(",")}]`;

        // First, check if chunks have embeddings
        console.log("\n2. Checking chunks with embeddings...");
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(documentChunks)
            .where(isNotNull(documentChunks.embedding));
        console.log(`   Chunks with embeddings: ${countResult[0]?.count}`);

        // Check if documents are completed
        console.log("\n3. Checking completed documents...");
        const docsResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(documents)
            .where(sql`${documents.processingStatus} = 'completed'`);
        console.log(`   Completed documents: ${docsResult[0]?.count}`);

        // Check the JOIN condition
        console.log("\n4. Testing JOIN query (without vector comparison)...");
        const joinTest = await db
            .select({
                chunkId: documentChunks.id,
                documentId: documentChunks.documentId,
                docTitle: documents.title,
            })
            .from(documentChunks)
            .innerJoin(documents, sql`${documentChunks.documentId} = ${documents.id}`)
            .where(and(isNotNull(documentChunks.embedding), sql`${documents.processingStatus} = 'completed'`))
            .limit(3);
        console.log(`   Joined results: ${joinTest.length}`);
        if (joinTest.length > 0) {
            console.log(`   Sample: ${JSON.stringify(joinTest[0])}`);
        }

        // Now run the actual vector search
        console.log("\n5. Running vector search query...");
        const results = await db
            .select({
                chunkId: documentChunks.id,
                documentId: documentChunks.documentId,
                content: documentChunks.content,
                documentTitle: documents.title,
                vectorScore: sql<number>`1 - (${documentChunks.embedding} <=> ${queryVector}::vector)`,
            })
            .from(documentChunks)
            .innerJoin(documents, sql`${documentChunks.documentId} = ${documents.id}`)
            .where(and(isNotNull(documentChunks.embedding), sql`${documents.processingStatus} = 'completed'`))
            .orderBy(sql`${documentChunks.embedding} <=> ${queryVector}::vector`)
            .limit(5);

        console.log(`\n   Vector search results: ${results.length}`);
        for (const r of results) {
            console.log(`   - Score: ${r.vectorScore?.toFixed(4)}, Doc: ${r.documentTitle?.substring(0, 40)}`);
            console.log(`     Content: ${r.content?.substring(0, 80)}...`);
        }
    } catch (error) {
        console.error("Error:", error);
    }

    process.exit(0);
}

testVectorSearch();
