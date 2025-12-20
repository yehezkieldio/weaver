import { retrieveContext } from "../src/lib/rag/context-builder";

async function testRetrieveContext() {
    console.log("=== Testing retrieveContext ===\n");

    // Test query
    const query = "Apa visi dan misi Universitas Mulia?";

    console.log(`Test query: "${query}"\n`);

    try {
        console.log("1. Calling retrieveContext...");
        const result = await retrieveContext(query, {
            topK: 5,
            minSimilarity: 0.3,
            strategy: "hybrid",
            useReranker: true,
            rerankerStrategy: "cross_encoder",
        });

        console.log("\n2. Results:");
        console.log(`   Context length: ${result.context.length}`);
        console.log(`   Chunks count: ${result.chunks.length}`);
        console.log(`   Tokens estimate: ${result.totalTokensEstimate}`);
        console.log(`   Strategy: ${result.retrievalStrategy}`);
        console.log(`   Language: ${result.language}`);

        if (result.chunks.length > 0) {
            console.log("\n3. First 3 chunks:");
            for (const [idx, chunk] of result.chunks.slice(0, 3).entries()) {
                console.log(`\n   Chunk ${idx + 1}:`);
                console.log(`   - ID: ${chunk.chunkId.substring(0, 8)}...`);
                console.log(`   - Doc: ${chunk.documentTitle}`);
                console.log(`   - Similarity: ${chunk.similarity?.toFixed(4)}`);
                console.log(`   - Content: ${chunk.content.substring(0, 100)}...`);
            }
        } else {
            console.log("\n   NO CHUNKS RETRIEVED!");
        }
    } catch (error) {
        console.error("Error:", error);
    }

    process.exit(0);
}

testRetrieveContext();
