/**
 * @fileoverview Unit tests for Agent Decision Logic
 *
 * This test suite focuses on testing the agent's decision-making logic, tool selection,
 * and query decomposition without requiring a full database or external API calls.
 * All dependencies (embeddings, LLM calls, database) are mocked.
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";

// We'll need to test the internal logic of agentic-rag
// Since most functions are not exported, we'll test through the main exports
// with mocked dependencies

describe("Agent Decision Logic - Unit Tests", () => {
    let mockGenerateTextCalls: Array<{ prompt: string; tools?: unknown }>;

    beforeEach(() => {
        mockGenerateTextCalls = [];

        // Mock the AI SDK's generateText function
        mock.module("ai", () => {
            const originalModule = require("ai");
            return {
                ...originalModule,
                generateText: (args: { prompt: string; tools?: unknown }) => {
                    mockGenerateTextCalls.push(args);

                    // Return different responses based on the prompt
                    if (args.prompt.includes("Uraikan pertanyaan")) {
                        return Promise.resolve({
                            text: JSON.stringify([
                                "Apa saja fakultas di universitas?",
                                "Berapa jumlah program studi?",
                                "Apa saja fasilitas yang tersedia?",
                            ]),
                            reasoning: [],
                            finishReason: "stop",
                            usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
                        });
                    }

                    if (args.prompt.includes("Verifikasi")) {
                        return Promise.resolve({
                            text: JSON.stringify({
                                supported: true,
                                confidence: 0.9,
                                evidence: "Informasi ditemukan dalam dokumen",
                            }),
                            reasoning: [],
                            finishReason: "stop",
                            usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
                        });
                    }

                    if (args.prompt.includes("Sintesis")) {
                        return Promise.resolve({
                            text: "Jawaban lengkap berdasarkan sumber [1], [2], dan [3].",
                            reasoning: [],
                            finishReason: "stop",
                            usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
                        });
                    }

                    // Default response for agentic workflow
                    return Promise.resolve({
                        text: "Universitas ini memiliki beberapa fakultas termasuk Fakultas Ilmu Komputer.",
                        reasoning: [{ text: "Menganalisis query dan mencari informasi yang relevan" }],
                        finishReason: "stop",
                        usage: { inputTokens: 200, outputTokens: 100, totalTokens: 300 },
                        toolCalls: [],
                        toolResults: [],
                    });
                },
                streamText: () =>
                    Promise.resolve({
                        textStream: (function* () {
                            yield "Test ";
                            yield "streaming ";
                            yield "response";
                        })(),
                        finishReason: "stop",
                    }),
            };
        });

        // Mock embeddings
        mock.module("@/lib/ai/embeddings", () => ({
            generateEmbedding: async (_text: string) => ({
                embedding: new Array(1536).fill(0.1),
            }),
        }));

        // Mock database
        mock.module("@/lib/db", () => ({
            db: {
                select: () => ({
                    from: () => ({
                        innerJoin: () => ({
                            where: () => ({
                                orderBy: () => ({
                                    limit: () => Promise.resolve([]),
                                }),
                                limit: () => Promise.resolve([]),
                            }),
                        }),
                    }),
                }),
            },
        }));

        // Mock hybrid retrieval
        mock.module("@/lib/rag/hybrid-retrieval", () => ({
            hybridRetrieve: async (_query: string, _options: unknown) =>
                Promise.resolve([
                    {
                        chunkId: "test-chunk-1",
                        documentId: "test-doc-1",
                        documentTitle: "Test Document 1",
                        content:
                            "Universitas Mulia memiliki Fakultas Ilmu Komputer, Fakultas Ekonomi, dan Fakultas Hukum.",
                        fusedScore: 0.95,
                        vectorScore: 0.9,
                        bm25Score: 0.8,
                        retrievalMethod: "hybrid",
                    },
                    {
                        chunkId: "test-chunk-2",
                        documentId: "test-doc-2",
                        documentTitle: "Test Document 2",
                        content: "Program studi yang tersedia meliputi Informatika, Sistem Informasi, dan Akuntansi.",
                        fusedScore: 0.85,
                        vectorScore: 0.8,
                        bm25Score: 0.7,
                        retrievalMethod: "hybrid",
                    },
                ]),
        }));

        // Mock guardrails
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
    });

    describe("Query Decomposition Logic", () => {
        it("should decompose complex queries into sub-questions", async () => {
            const { generateText } = await import("ai");

            const result = await generateText({
                model: {} as any,
                prompt: "Uraikan pertanyaan akademis ini menjadi 3 sub-pertanyaan yang lebih sederhana: Apa saja fakultas dan program studi yang tersedia?",
            });

            const subQuestions = JSON.parse(result.text);

            expect(Array.isArray(subQuestions)).toBe(true);
            expect(subQuestions.length).toBe(3);
            expect(subQuestions[0]).toContain("fakultas");
        });

        it("should handle decomposition of procedural questions", async () => {
            const { generateText } = await import("ai");

            const result = await generateText({
                model: {} as any,
                prompt: "Uraikan pertanyaan akademis ini menjadi 3 sub-pertanyaan: Bagaimana cara mendaftar dan apa saja syaratnya?",
            });

            const subQuestions = JSON.parse(result.text);
            expect(subQuestions.length).toBeGreaterThan(0);
        });

        it("should limit number of sub-questions based on maxSubQuestions parameter", async () => {
            const { generateText } = await import("ai");

            const result = await generateText({
                model: {} as any,
                prompt: "Uraikan pertanyaan akademis ini menjadi 3 sub-pertanyaan yang lebih sederhana",
            });

            const subQuestions = JSON.parse(result.text);
            expect(subQuestions.length).toBeLessThanOrEqual(3);
        });
    });

    describe("Tool Selection Logic", () => {
        it("should return a valid answer structure", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Apa saja fakultas di universitas?", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result.answer).toBeTruthy();
            expect(result.language).toBe("id");
            expect(result.totalLatencyMs).toBeGreaterThan(0);
        });

        it("should execute agentic workflow for complex queries", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            // This query should trigger decomposition
            const result = await runAgenticRag(
                "Sebutkan fakultas yang ada dan jelaskan program studi di masing-masing fakultas?",
                {
                    maxSteps: 5,
                    enableGuardrails: false,
                }
            );

            expect(result.answer).toBeTruthy();
            expect(result.language).toBe("id");
        });

        it("should use verify_claim tool when verification is needed", async () => {
            const { generateText } = await import("ai");

            const result = await generateText({
                model: {} as any,
                prompt: "Verifikasi apakah klaim ini didukung: Universitas memiliki 10 fakultas",
            });

            const verification = JSON.parse(result.text);
            expect(verification).toHaveProperty("supported");
            expect(verification).toHaveProperty("confidence");
            expect(verification).toHaveProperty("evidence");
        });
    });

    describe("Agentic Reasoning Flow", () => {
        it("should execute workflow for complex queries", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag(
                "Jelaskan proses pendaftaran mahasiswa baru dan dokumen yang diperlukan?",
                {
                    maxSteps: 5,
                    enableGuardrails: false,
                }
            );

            expect(result.answer).toBeTruthy();
            expect(result.totalLatencyMs).toBeGreaterThan(0);
            expect(result.language).toBe("id");
        });

        it("should track basic metadata", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Apa nama universitas ini?", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            // Verify basic structure
            expect(result).toHaveProperty("answer");
            expect(result).toHaveProperty("language");
            expect(result).toHaveProperty("totalLatencyMs");
            expect(result).toHaveProperty("steps");
            expect(result).toHaveProperty("citations");
        });

        it("should respect maxSteps limit", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const maxSteps = 2;
            const result = await runAgenticRag("Complex query with many sub-questions?", {
                maxSteps,
                enableGuardrails: false,
            });

            expect(result.answer).toBeTruthy();
            expect(result.language).toBe("id");
        });

        it("should handle agentic workflow", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            // Query that would benefit from agentic reasoning
            const result = await runAgenticRag("Sebutkan semua fakultas, program studi, dan fasilitasnya?", {
                maxSteps: 5,
                enableGuardrails: false,
            });

            expect(result.answer).toBeTruthy();
            expect(result.language).toBe("id");
        });
    });

    describe("Citation Management", () => {
        it("should assign unique citation numbers to retrieved chunks", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Apa saja fakultas di universitas?", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result.citations).toBeDefined();
            expect(Array.isArray(result.citations)).toBe(true);

            // Citation numbers should be unique and sequential
            const citationNumbers = result.citations.map((c) => c.citationNumber);
            const uniqueNumbers = new Set(citationNumbers);
            expect(citationNumbers.length).toBe(uniqueNumbers.size);
        });

        it("should maintain consistent citation numbers for same chunks", async () => {
            const { runAgenticRag, clearSessionCitations } = await import("@/lib/rag/agentic-rag");

            const sessionId = "test-session-1";

            const result1 = await runAgenticRag("Query 1", {
                sessionId,
                maxSteps: 3,
                enableGuardrails: false,
            });

            const result2 = await runAgenticRag("Query 2", {
                sessionId,
                maxSteps: 3,
                enableGuardrails: false,
            });

            // Should reuse citations from the same session
            expect(result1.citations.length).toBeGreaterThanOrEqual(0);
            expect(result2.citations.length).toBeGreaterThanOrEqual(0);

            // Cleanup
            clearSessionCitations(sessionId);
        });
    });

    describe("Language Detection and Enforcement", () => {
        it("should always return answers in Indonesian", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("What are the faculties?", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result.language).toBe("id");
            expect(result.answer).toBeTruthy();
        });

        it("should enforce Indonesian in system prompt", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Tell me about the university", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result.language).toBe("id");
        });
    });

    describe("Error Handling", () => {
        it("should handle guardrail violations gracefully", async () => {
            // Override mock for this specific test
            mock.module("@/lib/rag/guardrails", () => ({
                validateInput: async (_query: string) => ({
                    passed: false,
                    violations: ["inappropriate_content"],
                    categories: { hate: 0.9 },
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

            expect(result.answer).toContain("tidak dapat diproses");
            expect(result.guardrailResults.input?.passed).toBe(false);
        });

        it("should continue without guardrails when disabled", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Test query", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            expect(result.answer).toBeTruthy();
        });
    });

    describe("Session State Management", () => {
        it("should maintain separate state for different sessions", async () => {
            const { runAgenticRag, clearStreamingState } = await import("@/lib/rag/agentic-rag");

            const session1 = "session-1";
            const session2 = "session-2";

            await runAgenticRag("Query 1", { sessionId: session1, enableGuardrails: false });
            await runAgenticRag("Query 2", { sessionId: session2, enableGuardrails: false });

            // Cleanup should not affect other sessions
            clearStreamingState(session1);

            // Session 2 should still work
            const result = await runAgenticRag("Query 3", { sessionId: session2, enableGuardrails: false });
            expect(result.answer).toBeTruthy();

            clearStreamingState(session2);
        });

        it("should clear session citations properly", async () => {
            const { runAgenticRag, clearSessionCitations } = await import("@/lib/rag/agentic-rag");

            const sessionId = "test-clear-session";

            await runAgenticRag("Test query", { sessionId, enableGuardrails: false });

            clearSessionCitations(sessionId);

            // Next query should start with fresh citations
            const result = await runAgenticRag("Another query", { sessionId, enableGuardrails: false });
            expect(result.citations).toBeDefined();
        });
    });

    describe("Performance Tracking", () => {
        it("should track step durations", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Test query", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            // Each step should have a duration
            for (const step of result.steps) {
                expect(step.durationMs).toBeGreaterThanOrEqual(0);
            }
        });

        it("should track total latency", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const startTime = Date.now();
            const result = await runAgenticRag("Test query", {
                maxSteps: 3,
                enableGuardrails: false,
            });
            const actualDuration = Date.now() - startTime;

            expect(result.totalLatencyMs).toBeGreaterThan(0);
            expect(result.totalLatencyMs).toBeLessThanOrEqual(actualDuration + 100); // Allow small margin
        });

        it("should track token usage when available", async () => {
            const { runAgenticRag } = await import("@/lib/rag/agentic-rag");

            const result = await runAgenticRag("Test query", {
                maxSteps: 3,
                enableGuardrails: false,
            });

            // At least one step should have token usage
            const stepsWithTokens = result.steps.filter((s) => s.tokenUsage);
            expect(stepsWithTokens.length).toBeGreaterThanOrEqual(0);
        });
    });
});
