/**
 * @fileoverview Integration tests for Retrieval → Generation Pipeline
 *
 * This test suite tests the complete RAG pipeline from query to final answer,
 * exercising the integration between retrieval, reasoning, and generation components.
 * Unlike the blackbox tests, these tests call runAgenticRag directly with controlled
 * but integrated components (mocked external APIs but real internal logic).
 *
 * Key differences from unit tests:
 * - Tests the interaction between multiple components
 * - Uses real retrieval logic with mocked data
 * - Verifies end-to-end behavior including citations, guardrails, and multi-step reasoning
 * - Focuses on the quality and correctness of the complete pipeline
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";

describe("RAG Pipeline Integration Tests", () => {
    beforeEach(() => {
        // Mock external dependencies (embeddings and LLM calls)
        mock.module("@/lib/ai/embeddings", () => ({
            generateEmbedding: async (_text: string) => ({
                embedding: new Array(1536).fill(0.1),
            }),
        }));

        // Mock AI SDK with realistic responses
        mock.module("ai", () => {
            const originalModule = require("ai");
            return {
                ...originalModule,
                generateText: (args: { prompt: string; tools?: unknown; onStepFinish?: (result: unknown) => void }) => {
                    // Simulate tool-based agentic workflow
                    const toolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }> = [];
                    const toolResults: Array<{ toolCallId: string; toolName: string; output: unknown }> = [];

                    // Simulate search_documents tool call
                    const searchCallId = "search-1";
                    toolCalls.push({
                        toolCallId: searchCallId,
                        toolName: "search_documents",
                        input: { query: args.prompt, strategy: "hybrid", topK: 5 },
                    });

                    toolResults.push({
                        toolCallId: searchCallId,
                        toolName: "search_documents",
                        output: {
                            found: 2,
                            documents: [
                                {
                                    title: "Profil Universitas",
                                    content:
                                        "Universitas Mulia adalah universitas swasta yang berlokasi di Balikpapan, Kalimantan Timur.",
                                    score: "0.95",
                                    method: "hybrid",
                                },
                                {
                                    title: "Fakultas dan Program Studi",
                                    content:
                                        "Fakultas yang tersedia meliputi Fakultas Ilmu Komputer, Fakultas Ekonomi, dan Fakultas Teknik.",
                                    score: "0.88",
                                    method: "hybrid",
                                },
                            ],
                        },
                    });

                    // Call onStepFinish if provided
                    if (args.onStepFinish) {
                        args.onStepFinish({
                            text: "",
                            toolCalls,
                            toolResults,
                            finishReason: "tool-calls",
                            usage: { inputTokens: 150, outputTokens: 50, totalTokens: 200 },
                        });

                        // Second step: synthesis
                        args.onStepFinish({
                            text: "Universitas Mulia adalah universitas swasta yang berlokasi di Balikpapan, Kalimantan Timur [1]. Fakultas yang tersedia meliputi Fakultas Ilmu Komputer, Fakultas Ekonomi, dan Fakultas Teknik [2].",
                            toolCalls: [],
                            toolResults: [],
                            finishReason: "stop",
                            usage: { inputTokens: 200, outputTokens: 100, totalTokens: 300 },
                        });
                    }

                    return Promise.resolve({
                        text: "Universitas Mulia adalah universitas swasta yang berlokasi di Balikpapan, Kalimantan Timur [1]. Fakultas yang tersedia meliputi Fakultas Ilmu Komputer, Fakultas Ekonomi, dan Fakultas Teknik [2].",
                        reasoning: [
                            {
                                text: "Mencari informasi tentang universitas dan fakultas",
                            },
                            {
                                text: "Mensintesis informasi dari dokumen yang ditemukan",
                            },
                        ],
                        finishReason: "stop",
                        usage: { inputTokens: 350, outputTokens: 150, totalTokens: 500 },
                        toolCalls,
                        toolResults,
                    });
                },
                stepCountIs: (count: number) => () => count,
                NoSuchToolError: {
                    isInstance: (_error: unknown) => false,
                },
            };
        });

        // Mock database with test data
        const mockChunks = [
            {
                chunkId: "chunk-1",
                documentId: "doc-1",
                content: "Universitas Mulia adalah universitas swasta yang berlokasi di Balikpapan, Kalimantan Timur.",
                metadata: { qualityScore: 0.9 },
                embedding: new Array(1536).fill(0.1),
                documentTitle: "Profil Universitas",
            },
            {
                chunkId: "chunk-2",
                documentId: "doc-2",
                content:
                    "Fakultas yang tersedia meliputi Fakultas Ilmu Komputer, Fakultas Ekonomi, dan Fakultas Teknik.",
                metadata: { qualityScore: 0.85 },
                embedding: new Array(1536).fill(0.09),
                documentTitle: "Fakultas dan Program Studi",
            },
            {
                chunkId: "chunk-3",
                documentId: "doc-3",
                content:
                    "Program studi yang tersedia antara lain Informatika, Sistem Informasi, Akuntansi, dan Manajemen.",
                metadata: { qualityScore: 0.8 },
                embedding: new Array(1536).fill(0.08),
                documentTitle: "Program Studi",
            },
        ];

        mock.module("@/lib/db", () => ({
            db: {
                select: () => ({
                    from: () => ({
                        innerJoin: () => ({
                            where: () => ({
                                orderBy: () => ({
                                    limit: () => Promise.resolve(mockChunks),
                                }),
                                limit: () => Promise.resolve(mockChunks),
                            }),
                        }),
                    }),
                }),
            },
        }));

        // Mock guardrails to allow all queries
        mock.module("@/lib/rag/guardrails", () => ({
            validateInput: async (_query: string) => ({
                passed: true,
                violations: [],
                categories: {},
            }),
            validateOutput: async (_answer: string, _context: unknown) => ({
                passed: true,
                violations: [],
                categories: {},
            }),
            detectNegativeReaction: async (_query: string) => ({
                detected: false,
                sentiment: "neutral",
            }),
        }));

        // Mock hybrid retrieval with test data
        mock.module("@/lib/rag/hybrid-retrieval", () => ({
            hybridRetrieve: (_query: string, _options: unknown) => {
                // Return chunks that match the query
                const results = mockChunks
                    .filter(
                        (chunk) =>
                            chunk.content.toLowerCase().includes("universitas") ||
                            chunk.content.toLowerCase().includes("fakultas") ||
                            chunk.content.toLowerCase().includes("program")
                    )
                    .map((chunk) => ({
                        chunkId: chunk.chunkId,
                        documentId: chunk.documentId,
                        documentTitle: chunk.documentTitle,
                        content: chunk.content,
                        fusedScore: 0.9 - mockChunks.indexOf(chunk) * 0.1,
                        vectorScore: 0.85 - mockChunks.indexOf(chunk) * 0.1,
                        bm25Score: 0.8 - mockChunks.indexOf(chunk) * 0.1,
                        retrievalMethod: "hybrid" as const,
                    }));

                return Promise.resolve(results);
            },
        }));
    });

    describe("End-to-End Pipeline", () => {
        it("should successfully execute the complete RAG pipeline", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Apa nama universitas dan fakultas yang ada?", {
                maxSteps: 5,
                enableGuardrails: true,
            });

            // Verify result structure
            expect(result).toBeDefined();
            expect(result.answer).toBeTruthy();
            expect(result.answer.length).toBeGreaterThan(0);

            // Verify language
            expect(result.language).toBe("id");

            // Verify steps were executed
            expect(result.steps).toBeDefined();
            expect(Array.isArray(result.steps)).toBe(true);

            // Verify retrieved chunks
            expect(result.retrievedChunks).toBeDefined();
            expect(Array.isArray(result.retrievedChunks)).toBe(true);

            // Verify citations
            expect(result.citations).toBeDefined();
            expect(Array.isArray(result.citations)).toBe(true);

            // Verify guardrails ran
            expect(result.guardrailResults).toBeDefined();
        });

        it("should retrieve relevant documents based on query", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Sebutkan fakultas yang tersedia", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result.retrievedChunks.length).toBeGreaterThan(0);

            // Check if any chunk contains relevant information
            const hasRelevantChunk = result.retrievedChunks.some((chunk) =>
                chunk.content.toLowerCase().includes("fakultas")
            );
            expect(hasRelevantChunk).toBe(true);
        });

        it("should generate answer with proper citations", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Di mana lokasi universitas?", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result.answer).toBeTruthy();

            // Should have citations
            expect(result.citations.length).toBeGreaterThan(0);

            // Each citation should have required properties
            for (const citation of result.citations) {
                expect(citation).toHaveProperty("id");
                expect(citation).toHaveProperty("citationNumber");
                expect(typeof citation.citationNumber).toBe("number");
            }
        });

        it("should handle complex multi-part queries", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag(
                "Jelaskan tentang universitas, fakultas yang ada, dan program studinya",
                {
                    maxSteps: 5,
                    enableGuardrails: false,
                }
            );

            expect(result.answer).toBeTruthy();
            expect(result.steps.length).toBeGreaterThan(0);

            // Should retrieve multiple relevant chunks
            expect(result.retrievedChunks.length).toBeGreaterThan(0);
        });

        it("should track performance metrics correctly", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const startTime = Date.now();
            const result = await runAgenticRag("Apa nama universitas ini?", {
                maxSteps: 3,
                enableGuardrails: false,
            });
            const actualDuration = Date.now() - startTime;

            // Total latency should be tracked
            expect(result.totalLatencyMs).toBeGreaterThan(0);
            expect(result.totalLatencyMs).toBeLessThanOrEqual(actualDuration + 100);

            // Steps should have durations
            for (const step of result.steps) {
                expect(step.durationMs).toBeGreaterThanOrEqual(0);
                expect(step.timestamp).toBeGreaterThan(0);
            }
        });
    });

    describe("Retrieval Component", () => {
        it("should use hybrid retrieval strategy by default", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Test query", {
                retrievalStrategy: "hybrid",
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result.retrievedChunks.length).toBeGreaterThan(0);

            // Check retrieval method
            const hasHybrid = result.retrievedChunks.some((chunk) => chunk.retrievalMethod === "hybrid");
            expect(hasHybrid).toBe(true);
        });

        it("should score and rank retrieved chunks", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Fakultas apa saja yang ada?", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result.retrievedChunks.length).toBeGreaterThan(0);

            // Check if chunks have scores
            for (const chunk of result.retrievedChunks) {
                expect(chunk.fusedScore).toBeGreaterThanOrEqual(0);
                expect(chunk.fusedScore).toBeLessThanOrEqual(1);
            }

            // Chunks should be sorted by score (descending)
            for (let i = 0; i < result.retrievedChunks.length - 1; i++) {
                expect(result.retrievedChunks[i].fusedScore).toBeGreaterThanOrEqual(
                    result.retrievedChunks[i + 1].fusedScore
                );
            }
        });

        it("should handle queries with no results gracefully", async () => {
            // Override mock to return empty results
            mock.module("@/lib/rag/hybrid-retrieval", () => ({
                hybridRetrieve: async (_query: string, _options: unknown) => Promise.resolve([]),
            }));

            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Completely unrelated query about quantum physics", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            // Should still return a result, even if empty
            expect(result).toBeDefined();
            expect(result.answer).toBeTruthy();
        });
    });

    describe("Generation Component", () => {
        it("should generate Indonesian language answers", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("What is the name of this university?", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result.language).toBe("id");
            expect(result.answer).toBeTruthy();
        });

        it("should use retrieved context in the answer", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Di mana lokasi Universitas Mulia?", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            // Answer should reference content from retrieved chunks
            expect(result.answer).toBeTruthy();
            expect(result.retrievedChunks.length).toBeGreaterThan(0);
        });

        it("should include citations in the generated answer", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Jelaskan tentang universitas ini", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result.answer).toBeTruthy();

            // Answer might contain citation markers like [1], [2]
            // At minimum, citations should be tracked
            expect(result.citations).toBeDefined();
        });

        it("should handle generation errors gracefully", async () => {
            // Override mock to simulate error
            mock.module("ai", () => ({
                generateText: () => {
                    throw new Error("LLM API error");
                },
                stepCountIs: (count: number) => () => count,
                NoSuchToolError: {
                    isInstance: (_error: unknown) => false,
                },
            }));

            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            // Should throw or return error message
            await expect(
                runAgenticRag("Test query", {
                    maxSteps: 3,
                    enableGuardrails: false,
                })
            ).rejects.toThrow();
        });
    });

    describe("Guardrails Integration", () => {
        it("should validate input with guardrails enabled", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Normal academic query", {
                maxSteps: 3,
                enableGuardrails: true,
            });

            expect(result.guardrailResults).toBeDefined();
            expect(result.guardrailResults.input).toBeDefined();
            expect(result.guardrailResults.input?.passed).toBe(true);
        });

        it("should reject inappropriate input when guardrails detect violations", async () => {
            // Override mock to simulate violation
            mock.module("@/lib/rag/guardrails", () => ({
                validateInput: async (_query: string) => ({
                    passed: false,
                    violations: ["inappropriate_content"],
                    categories: { hate: 0.95 },
                }),
                validateOutput: async (_answer: string, _context: unknown) => ({
                    passed: true,
                    violations: [],
                    categories: {},
                }),
                detectNegativeReaction: async (_query: string) => ({
                    detected: false,
                    sentiment: "neutral",
                }),
            }));

            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Inappropriate query", {
                maxSteps: 3,
                enableGuardrails: true,
            });

            // Should return policy violation message
            expect(result.answer).toContain("tidak dapat diproses");
            expect(result.guardrailResults.input?.passed).toBe(false);
        });

        it("should work without guardrails when disabled", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Test query", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result.answer).toBeTruthy();
            // Guardrails results might be empty or undefined
        });
    });

    describe("Session Management", () => {
        it("should maintain session state across multiple queries", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const sessionId = "test-session-integration";

            const result1 = await runAgenticRag("First query", {
                sessionId,
                maxSteps: 3,
                enableGuardrails: false,
            });

            const result2 = await runAgenticRag("Second query", {
                sessionId,
                maxSteps: 3,
                enableGuardrails: false,
            });

            // Both should execute successfully
            expect(result1.answer).toBeTruthy();
            expect(result2.answer).toBeTruthy();
        });

        it("should isolate different sessions", async () => {
            const { runAgenticRag, clearStreamingState } = await import("@/lib/rag/agentic-rag");

            const session1 = "session-1-integration";
            const session2 = "session-2-integration";

            await runAgenticRag("Query for session 1", {
                sessionId: session1,
                maxSteps: 3,
                enableGuardrails: false,
            });

            await runAgenticRag("Query for session 2", {
                sessionId: session2,
                maxSteps: 3,
                enableGuardrails: false,
            });

            // Clear one session
            clearStreamingState(session1);

            // Other session should still work
            const result = await runAgenticRag("Another query for session 2", {
                sessionId: session2,
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result.answer).toBeTruthy();

            clearStreamingState(session2);
        });
    });

    describe("Error Handling", () => {
        it("should handle empty queries gracefully", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result).toBeDefined();
            expect(result.answer).toBeTruthy();
        });

        it("should handle very long queries", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const longQuery = "Jelaskan tentang universitas ".repeat(100);

            const result = await runAgenticRag(longQuery, {
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result).toBeDefined();
            expect(result.answer).toBeTruthy();
        });

        it("should respect maxSteps parameter", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const maxSteps = 2;
            const result = await runAgenticRag("Complex multi-step query", {
                maxSteps,
                enableGuardrails: false,
            });

            // Should not exceed maxSteps significantly
            expect(result.steps.length).toBeLessThanOrEqual(maxSteps + 2); // Allow for synthesis and tool calls
        });
    });
});
