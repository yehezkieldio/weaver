import { describe, expect, it, mock } from "bun:test";
import { hybridRetrieve } from "@/lib/rag/hybrid-retrieval";

// Mock external embedding calls so this test does not require API credentials.
mock.module("@/lib/ai/embeddings", () => ({
    generateEmbedding: async (_text: string) => ({ embedding: new Array(1536).fill(0.1) }),
}));

// Mock the database module to verify retrieval flow without requiring a live Postgres instance.

// Mock results for DB queries
const mockVectorResults = [
    {
        chunkId: "chunk-1",
        documentId: "doc-1",
        content: "This is a test document about computer science.",
        metadata: { qualityScore: 0.8 },
        embedding: new Array(1536).fill(0.1),
        documentTitle: "Intro to CS",
        vectorScore: 0.9,
    },
];

const mockKeywordResults = [
    {
        chunkId: "chunk-1",
        documentId: "doc-1",
        content: "This is a test document about computer science.",
        metadata: { qualityScore: 0.8 },
        embedding: new Array(1536).fill(0.1),
        documentTitle: "Intro to CS",
    },
    {
        chunkId: "chunk-2",
        documentId: "doc-2",
        content: "Another document about history.",
        metadata: { qualityScore: 0.5 },
        embedding: new Array(1536).fill(0.05),
        documentTitle: "History 101",
    },
];

// Mock the db module
mock.module("@/lib/db", () => ({
    db: {
        select: () => ({
            from: () => ({
                innerJoin: () => ({
                    where: () => ({
                        orderBy: () => ({
                            limit: () => Promise.resolve(mockVectorResults),
                        }),
                        limit: () => Promise.resolve(mockKeywordResults),
                    }),
                }),
            }),
        }),
    },
}));

describe("Hybrid Retrieval Integration", () => {
    it("should combine vector and keyword results", async () => {
        const query = "computer science";
        const results = await hybridRetrieve(query, {
            strategy: "hybrid",
            topK: 5,
            minScore: 0,
            useReranker: false, // Disable reranker to avoid mocking it too
        });

        expect(results.length).toBeGreaterThan(0);

        // Verify scoring logic (fusion)
        // Results should have scores and be properly structured
        for (const result of results) {
            expect(result.fusedScore).toBeGreaterThanOrEqual(0);
            expect(result).toHaveProperty("documentTitle");
            expect(result).toHaveProperty("content");
        }
    });

    it("should return properly structured results", async () => {
        const results = await hybridRetrieve("academic query", {
            strategy: "hybrid",
            topK: 5,
            minScore: 0,
            useReranker: false,
        });

        // Verify results have proper structure with all required fields
        for (const result of results) {
            expect(result).toHaveProperty("chunkId");
            expect(result).toHaveProperty("documentId");
            expect(result).toHaveProperty("documentTitle");
            expect(result).toHaveProperty("content");
            expect(result).toHaveProperty("fusedScore");
            expect(result.fusedScore).toBeGreaterThanOrEqual(0);
        }
    });
});
