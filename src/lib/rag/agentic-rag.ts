/**
 * @fileoverview Agentic RAG (Retrieval-Augmented Generation) Pipeline
 *
 * WHY Agentic Mode:
 * - Multi-step reasoning: Breaks down complex university queries into manageable sub-questions
 * - Tool-based retrieval: Uses specialized tools (search, query expansion, decomposition, verification)
 * - Self-correcting: Can refine searches and verify claims against sources
 * - Better for complex queries: Procedural questions, multi-part inquiries, fact-checking scenarios
 *
 * WHY vs Standard RAG:
 * - Standard RAG: Single retrieval → generation (fast, good for simple queries)
 * - Agentic RAG: Planning → Multi-step retrieval → Tool execution → Synthesis (thorough, better accuracy)
 *
 * Research Context:
 * This implementation is designed for Indonesian university information systems, covering:
 * - Administrative procedures and regulations
 * - Academic policies, curriculum, and course information
 * - Student services, facilities, and campus resources
 * - Research documents (thesis, dissertations, papers) as a specialized subset
 *
 * The agentic approach significantly improves answer quality for multi-hop questions common in
 * university contexts (e.g., "What are the steps to apply for cuti akademik and what documents
 * are needed?") while maintaining citation accuracy and reducing hallucinations.
 *
 * Key Features:
 * - Parallel tool execution for efficiency (avoid sequential bottleneck)
 * - Citation management with unique numbering
 * - Guardrail integration for safety and quality
 * - Streaming support for real-time responses
 * - Language enforcement (always Indonesian)
 */

import { generateText, NoSuchToolError, stepCountIs, streamText, tool } from "ai";
import consola from "consola";
import { z } from "zod";
import { CHAT_MODEL, telemetryConfig } from "@/lib/ai";
import { detectNegativeReaction, type GuardrailResult, validateInput, validateOutput } from "./guardrails";
import { hybridRetrieve, type RetrievalResult } from "./hybrid-retrieval";
import type { RerankerStrategy } from "./reranker";
import { detectQueryLanguage, expandQueryIndonesian, expandQueryWithSynonyms } from "./university-domain";

// ==================== Types ====================

/**
 * Represents a single step in the agentic workflow
 *
 * @property stepIndex - Sequential index of this step in the workflow
 * @property stepType - Type of operation performed (reasoning, tool_call, retrieval, synthesis, reranking, planning)
 * @property toolName - Name of the tool called (if stepType is tool_call)
 * @property toolInput - Input parameters passed to the tool
 * @property toolOutput - Result returned by the tool
 * @property reasoning - Text explanation of reasoning (for synthesis/reasoning steps)
 * @property durationMs - Time taken for this step in milliseconds
 * @property timestamp - Unix timestamp when step started
 * @property tokenUsage - LLM token consumption for this step
 */
export interface AgentStep {
    stepIndex: number;
    stepType: "reasoning" | "tool_call" | "retrieval" | "synthesis" | "reranking" | "planning";
    toolName?: string;
    toolInput?: Record<string, unknown>;
    toolOutput?: unknown;
    reasoning?: string;
    durationMs: number;
    timestamp: number;
    tokenUsage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
}

/**
 * Aggregated latency breakdown for agentic RAG execution
 * Used by evaluation to track time spent in each phase
 */
export interface AgenticLatencyBreakdown {
    planningMs: number;
    reasoningMs: number;
    toolCallMs: number;
    synthesisMs: number;
    retrievalMs: number;
    rerankingMs: number;
    totalMs: number;
}

/**
 * Result of the agentic RAG pipeline execution
 *
 * @property answer - Final generated answer in Indonesian
 * @property steps - Array of all agent steps taken during execution
 * @property retrievedChunks - All document chunks retrieved across all searches
 * @property citations - Unique citations with assigned numbers for source attribution
 * @property guardrailResults - Safety and quality validation results
 * @property language - Always "id" (Indonesian) for this system
 * @property totalLatencyMs - Total time taken for the entire pipeline
 * @property latencyBreakdown - Aggregated latency by phase for evaluation metrics
 * @property reasoning - Optional array of reasoning steps from the LLM
 */
export interface AgenticRagResult {
    answer: string;
    steps: AgentStep[];
    retrievedChunks: RetrievalResult[];
    citations: Array<{ id: string; documentTitle: string; citationNumber: number }>;
    guardrailResults: {
        input?: GuardrailResult;
        output?: GuardrailResult;
        negativeReaction?: Awaited<ReturnType<typeof detectNegativeReaction>>;
    };
    language: "id";
    totalLatencyMs: number;
    latencyBreakdown: AgenticLatencyBreakdown;
    reasoning?: string[];
}

interface StreamingState {
    retrievedChunks: RetrievalResult[];
    citationManager: CitationManager;
}

// ==================== Citation Manager ====================

class CitationManager {
    private readonly citations = new Map<string, number>();
    private nextId = 1;

    assignCitation(chunkId: string): number {
        const existing = this.citations.get(chunkId);
        if (existing) {
            return existing;
        }

        const citationNumber = this.nextId;
        this.nextId += 1;
        this.citations.set(chunkId, citationNumber);
        return citationNumber;
    }

    getCitations(): Array<{ id: string; documentTitle: string; citationNumber: number }> {
        const results: Array<{ id: string; documentTitle: string; citationNumber: number }> = [];
        for (const [id, num] of this.citations.entries()) {
            results.push({
                id,
                documentTitle: "",
                citationNumber: num,
            });
        }
        return results;
    }

    clear(): void {
        this.citations.clear();
        this.nextId = 1;
    }
}

// Global session state storage
const sessionStates = new Map<string, StreamingState>();

export function clearSessionCitations(sessionId: string): void {
    sessionStates.delete(sessionId);
}

export function clearStreamingState(sessionId: string): void {
    sessionStates.delete(sessionId);
}

function getOrCreateStreamingState(sessionId: string): StreamingState {
    let state = sessionStates.get(sessionId);
    if (!state) {
        state = {
            retrievedChunks: [],
            citationManager: new CitationManager(),
        };
        sessionStates.set(sessionId, state);
    }
    return state;
}

// ==================== System Prompt ====================

const AGENTIC_SYSTEM_PROMPT = `Anda adalah asisten penelitian akademis canggih dengan akses ke alat-alat khusus.

Kemampuan Anda:
1. Mencari dokumen menggunakan pengambilan hibrida (Okapi BM25 + kesamaan vektor)
2. Memperluas kueri dengan sinonim akademis
3. Menguraikan pertanyaan akademis kompleks menjadi sub-pertanyaan yang lebih sederhana
4. Memverifikasi fakta terhadap sumber yang diambil
5. Mensintesis informasi dari beberapa dokumen

Pedoman:
- Selalu kutip sumber dengan format [1], [2], [3]
- Akui ketidakpastian ketika informasi tidak lengkap
- Gunakan terminologi akademis yang sesuai
- Selalu jawab dalam Bahasa Indonesia
- Verifikasi klaim penting dengan alat verify_claim

PENTING - Eksekusi Alat Paralel:
- Untuk kueri kompleks, PERTAMA gunakan decompose_query untuk memecah pertanyaan
- Setelah dekomposisi, Anda HARUS memanggil search_documents untuk SEMUA sub-pertanyaan DALAM SATU GILIRAN
- Panggil beberapa alat search_documents secara bersamaan (paralel) - JANGAN panggil satu per satu
- Contoh: Jika ada 3 sub-pertanyaan, buat 3 panggilan search_documents dalam respons yang sama
- Eksekusi paralel ini secara signifikan mengurangi latensi dan meningkatkan waktu respons`;

// ==================== Tool Creation Functions ====================

function createSearchTool(language: "id", streamingState?: StreamingState) {
    return tool({
        description:
            "Cari basis pengetahuan untuk dokumen yang relevan menggunakan pengambilan hibrida (Okapi BM25 + kesamaan vektor). Gunakan untuk setiap sub-pertanyaan setelah dekomposisi.",
        inputSchema: z.object({
            query: z.string().describe("The search query"),
            strategy: z.enum(["vector", "keyword", "hybrid"]).default("hybrid"),
            topK: z.number().min(1).max(20).default(5),
        }),
        execute: async ({ query, strategy, topK }) => {
            consola.debug(
                `[searchTool] Executing search - query: "${query.substring(0, 80)}...", strategy: ${strategy}, topK: ${topK}`
            );
            const results = await hybridRetrieve(query, {
                strategy,
                topK,
                language,
                useReranker: true,
                rerankerStrategy: "cross_encoder",
            });
            consola.debug(
                `[searchTool] Retrieved ${results.length} results with average score ${(results.reduce((sum, r) => sum + r.fusedScore, 0) / results.length).toFixed(3)}`
            );

            // Add to streaming state if available
            if (streamingState) {
                let newChunks = 0;
                for (const result of results) {
                    // Avoid duplicates
                    const exists = streamingState.retrievedChunks.some((c) => c.chunkId === result.chunkId);
                    if (!exists) {
                        streamingState.retrievedChunks.push(result);
                        streamingState.citationManager.assignCitation(result.chunkId);
                        newChunks += 1;
                    }
                }
                consola.debug(
                    `[searchTool] Added ${newChunks} new chunks to streaming state (total: ${streamingState.retrievedChunks.length})`
                );
            }

            return {
                found: results.length,
                documents: results.map((r) => ({
                    title: r.documentTitle,
                    content: r.content.substring(0, 500) + (r.content.length > 500 ? "..." : ""),
                    score: r.fusedScore.toFixed(3),
                    method: r.retrievalMethod,
                })),
            };
        },
    });
}

function createExpandQueryTool(language: "id") {
    return tool({
        description: "Perluas kueri dengan sinonim akademis untuk meningkatkan cakupan pengambilan",
        inputSchema: z.object({
            query: z.string(),
        }),
        execute: ({ query }) => {
            const expandedQueries = language === "id" ? expandQueryIndonesian(query) : expandQueryWithSynonyms(query);
            return {
                originalQuery: query,
                language,
                expandedQueries: expandedQueries.slice(0, 5),
            };
        },
    });
}

function createDecomposeQueryTool(language: "id") {
    return tool({
        description:
            "Uraikan pertanyaan akademis kompleks menjadi sub-pertanyaan yang lebih sederhana. PENTING: Setelah menggunakan tool ini, panggil search_documents untuk SEMUA sub-pertanyaan SECARA BERSAMAAN dalam satu giliran (paralel).",
        inputSchema: z.object({
            query: z.string(),
            maxSubQuestions: z.number().min(2).max(5).default(3),
        }),
        execute: async ({ query, maxSubQuestions }) => {
            const { text } = await generateText({
                model: CHAT_MODEL,
                prompt: `Uraikan pertanyaan akademis ini menjadi ${maxSubQuestions} sub-pertanyaan yang lebih sederhana yang bersama-sama menjawab pertanyaan asli. Jawab dalam Bahasa Indonesia.

Pertanyaan: ${query}

Kembalikan hanya array JSON berisi sub-pertanyaan.`,
                temperature: 0.3,
                experimental_telemetry: telemetryConfig,
            });

            try {
                const subQuestions = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
                return {
                    subQuestions,
                    language,
                    nextAction:
                        "CRITICAL: Call search_documents for ALL sub-questions IN PARALLEL (multiple tool calls in the same response). Do NOT call them one at a time.",
                };
            } catch {
                return {
                    subQuestions: [query],
                    language,
                    nextAction: "Call search_documents for this question.",
                };
            }
        },
    });
}

function createVerifyClaimTool() {
    return tool({
        description: "Verifikasi klaim terhadap dokumen yang diambil untuk mencegah halusinasi",
        inputSchema: z.object({
            claim: z.string(),
            context: z.string(),
        }),
        execute: async ({ claim, context }) => {
            const { text } = await generateText({
                model: CHAT_MODEL,
                prompt: `Verifikasi apakah klaim ini didukung oleh konteks. Jawab dalam Bahasa Indonesia.

Klaim: ${claim}

Konteks: ${context}

Jawab dengan JSON: { "supported": boolean, "confidence": number (0-1), "evidence": string }`,
                temperature: 0.1,
                experimental_telemetry: telemetryConfig,
            });

            try {
                return JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
            } catch {
                return { supported: false, confidence: 0, evidence: "Tidak dapat memverifikasi" };
            }
        },
    });
}

function createSynthesizeAnswerTool() {
    return tool({
        description: "Sintesis jawaban akhir dari beberapa sumber dengan kutipan yang tepat",
        inputSchema: z.object({
            question: z.string(),
            sources: z.array(
                z.object({
                    title: z.string(),
                    content: z.string(),
                })
            ),
        }),
        execute: async ({ question, sources }) => {
            const sourcesText = sources.map((s, i) => `[${i + 1}] ${s.title}:\n${s.content}`).join("\n\n");

            const { text } = await generateText({
                model: CHAT_MODEL,
                prompt: `Sintesis jawaban komprehensif dalam Bahasa Indonesia untuk pertanyaan ini menggunakan sumber-sumber yang disediakan. Sertakan kutipan [1], [2], dst.

Pertanyaan: ${question}

Sumber:
${sourcesText}`,
                temperature: 0.3,
                experimental_telemetry: telemetryConfig,
            });

            return { synthesizedAnswer: text, sourceCount: sources.length };
        },
    });
}

function createAgentTools(language: "id", streamingState?: StreamingState) {
    return {
        search_documents: createSearchTool(language, streamingState),
        expand_query: createExpandQueryTool(language),
        decompose_query: createDecomposeQueryTool(language),
        verify_claim: createVerifyClaimTool(),
        synthesize_answer: createSynthesizeAnswerTool(),
    };
}

// ==================== Main Agent Functions ====================

export async function runAgenticRag(
    query: string,
    options: {
        sessionId?: string;
        retrievalStrategy?: "vector" | "keyword" | "hybrid";
        enableGuardrails?: boolean;
        maxSteps?: number;
        rerankerStrategy?: RerankerStrategy;
        useReranker?: boolean;
        streamCallback?: (step: AgentStep) => void;
    } = {}
): Promise<AgenticRagResult> {
    const {
        sessionId = crypto.randomUUID(),
        retrievalStrategy = "hybrid",
        enableGuardrails = true,
        maxSteps = 5,
        streamCallback,
    } = options;

    consola.debug(
        `[runAgenticRag] Starting agentic RAG pipeline - sessionId: ${sessionId}, strategy: ${retrievalStrategy}, guardrails: ${enableGuardrails}`
    );
    consola.debug(`[runAgenticRag] Query: ${query.substring(0, 100)}...`);

    const startTime = Date.now();
    const language = "id" as const; // Always Indonesian
    const streamingState = getOrCreateStreamingState(sessionId);
    consola.debug(`[runAgenticRag] Using language: ${language}`);

    // Validate input
    consola.debug(`[runAgenticRag] Starting input validation with guardrails enabled: ${enableGuardrails}`);
    const { passed, steps, guardrailResults } = await validateInputWithGuardrails(query, enableGuardrails);
    consola.debug(
        `[runAgenticRag] Input validation result: passed=${passed}, violations=${guardrailResults.input?.violations.length || 0}`
    );

    if (!passed) {
        consola.warn("[runAgenticRag] Input validation failed - returning early with policy violation message");
        return {
            answer: "Maaf, permintaan Anda tidak dapat diproses karena melanggar kebijakan konten.",
            steps: [],
            retrievedChunks: [],
            citations: [],
            guardrailResults,
            language: "id",
            totalLatencyMs: Date.now() - startTime,
            latencyBreakdown: createEmptyLatencyBreakdown(Date.now() - startTime),
        };
    }

    // Create tools with streaming state
    const agentTools = createAgentTools(language, streamingState);

    try {
        consola.debug(`[runAgenticRag] Executing agent workflow with maxSteps: ${maxSteps}`);
        const result = await executeAgentWorkflow(
            query,
            language,
            agentTools,
            streamingState,
            maxSteps,
            sessionId,
            retrievalStrategy,
            steps,
            streamCallback
        );
        consola.debug(
            `[runAgenticRag] Agent workflow completed - steps: ${steps.length}, retrieved chunks: ${streamingState.retrievedChunks.length}`
        );

        // Validate output
        if (enableGuardrails) {
            const outputValidation = await validateOutput(result.text, {
                retrievedChunks: streamingState.retrievedChunks.map((c) => c.content),
                query,
            });
            guardrailResults.output = outputValidation;
        }

        calculateStepDurations(steps);
        const totalLatencyMs = Date.now() - startTime;

        consola.debug(`[runAgenticRag] Pipeline completed successfully in ${totalLatencyMs}ms`);
        consola.debug(
            `[runAgenticRag] Answer length: ${result.text.length}, citations: ${streamingState.citationManager.getCitations().length}`
        );
        consola.debug(`[runAgenticRag] Answer Preview: ${result.text.substring(0, 50)}...`);

        // Calculate latency breakdown from steps
        const latencyBreakdown = calculateLatencyBreakdown(steps, totalLatencyMs);
        consola.debug(
            `[runAgenticRag] Latency breakdown - planning: ${latencyBreakdown.planningMs}ms, synthesis: ${latencyBreakdown.synthesisMs}ms, toolCall: ${latencyBreakdown.toolCallMs}ms`
        );

        return {
            answer: result.text,
            steps,
            retrievedChunks: streamingState.retrievedChunks,
            citations: streamingState.citationManager.getCitations(),
            guardrailResults,
            language,
            totalLatencyMs,
            latencyBreakdown,
            reasoning: result.reasoning?.map((r) => r.text) || undefined,
        };
    } catch (error) {
        consola.error("[runAgenticRag] Error in agent workflow:", error);
        return handleAgentError(error, language, steps, streamingState, guardrailResults, startTime);
    }
}

async function validateInputWithGuardrails(
    query: string,
    enableGuardrails: boolean
): Promise<{
    passed: boolean;
    steps: AgentStep[];
    guardrailResults: AgenticRagResult["guardrailResults"];
}> {
    const steps: AgentStep[] = [];
    const guardrailResults: AgenticRagResult["guardrailResults"] = {};

    if (enableGuardrails) {
        const inputValidation = await validateInput(query);
        guardrailResults.input = inputValidation;

        if (!inputValidation.passed) {
            return { passed: false, steps, guardrailResults };
        }

        const negativeReaction = await detectNegativeReaction(query);
        if (negativeReaction.detected) {
            guardrailResults.negativeReaction = negativeReaction;
        }
    }

    return { passed: true, steps, guardrailResults };
}

async function executeAgentWorkflow(
    query: string,
    language: "id",
    agentTools: ReturnType<typeof createAgentTools>,
    streamingState: StreamingState,
    maxSteps: number,
    sessionId: string,
    retrievalStrategy: string,
    steps: AgentStep[],
    streamCallback?: (step: AgentStep) => void
) {
    // Enforce response language explicitly in the system prompt
    const systemWithLanguage = `${AGENTIC_SYSTEM_PROMPT}\n\n[PENEGAK BAHASA] Selalu jawab HANYA dalam Bahasa Indonesia.`;

    // Log language + top chunk languages to help debug accidental language switching
    consola.debug(`[executeAgentWorkflow] Expected response language: ${language}`);
    consola.debug(
        `[executeAgentWorkflow] Top retrieved chunk languages: ${streamingState.retrievedChunks
            .slice(0, 5)
            .map((c) => detectQueryLanguage(c.content))
            .join(", ")}`
    );

    const result = await generateText({
        model: CHAT_MODEL,
        system: systemWithLanguage,
        prompt: `${query}`,
        tools: agentTools,
        stopWhen: stepCountIs(maxSteps),
        temperature: 0.3,
        experimental_telemetry: {
            ...telemetryConfig,
            functionId: "agentic-rag",
            metadata: {
                ...telemetryConfig.metadata,
                language,
                retrievalStrategy,
                sessionId: sessionId || "anonymous",
            },
        },
        onStepFinish: (stepResult) => {
            processStepFinish(stepResult, steps, streamingState, streamCallback);
        },
    });

    // If the model answered using the wrong language, try a forced re-synthesis
    try {
        const detected = detectQueryLanguage(result.text || "");
        if (detected && detected !== language) {
            consola.warn(
                `[executeAgentWorkflow] Language mismatch detected: expected=${language}, actual=${detected}. Attempting forced re-synthesis.`
            );

            const sourcesText = streamingState.retrievedChunks
                .slice(0, 10)
                .map((s, i) => `[${i + 1}] ${s.documentTitle}:\n${s.content}`)
                .join("\n\n");

            try {
                const { text: synthText } = await generateText({
                    model: CHAT_MODEL,
                    system: systemWithLanguage,
                    prompt: `Sintesis jawaban komprehensif dalam Bahasa Indonesia untuk pertanyaan ini menggunakan sumber-sumber yang disediakan. Sertakan kutipan [1], [2], dst.\n\nPertanyaan: ${query}\n\nSumber:\n${sourcesText}`,
                    temperature: 0.3,
                    experimental_telemetry: telemetryConfig,
                });

                if (synthText && synthText.trim().length > 0) {
                    consola.debug("[executeAgentWorkflow] Forced re-synthesis succeeded; using synthesized answer.");
                    const newResult = { ...result, text: synthText } as typeof result;
                    return newResult;
                }
            } catch (synthErr) {
                consola.error("[executeAgentWorkflow] Forced re-synthesis failed:", synthErr);
            }
        }
    } catch (err) {
        consola.error("[executeAgentWorkflow] Failed to detect language of model output:", err);
    }

    return result;
}

function processStepFinish(
    stepResult: {
        text: string;
        toolCalls?: Array<{
            toolCallId: string;
            toolName: string;
            input: unknown;
        }>;
        toolResults?: Array<{
            toolCallId: string;
            toolName: string;
            output: unknown;
        }>;
        finishReason: string;
        usage?: {
            inputTokens?: number;
            outputTokens?: number;
            totalTokens?: number;
        };
    },
    steps: AgentStep[],
    streamingState: StreamingState,
    streamCallback?: (step: AgentStep) => void
): void {
    const { text, toolCalls, toolResults, finishReason, usage } = stepResult;
    consola.debug(
        `[processStepFinish] Processing step - finishReason: ${finishReason}, toolCalls: ${toolCalls?.length || 0}, tokens: ${usage?.totalTokens || 0}`
    );

    // Record tool calls
    if (toolCalls && toolCalls.length > 0) {
        consola.debug(`[processStepFinish] Recording ${toolCalls.length} tool calls`);
        for (const call of toolCalls) {
            const toolResult = toolResults?.find((r) => r.toolCallId === call.toolCallId);
            consola.debug(
                `[processStepFinish] Tool: ${call.toolName} - input: ${JSON.stringify(call.input).substring(0, 100)}...`
            );
            const agentStep: AgentStep = {
                stepIndex: steps.length,
                stepType: "tool_call",
                toolName: call.toolName,
                toolInput: call.input as Record<string, unknown>,
                toolOutput: toolResult?.output,
                durationMs: 0,
                timestamp: Date.now(),
                tokenUsage: usage
                    ? {
                          inputTokens: usage.inputTokens ?? 0,
                          outputTokens: usage.outputTokens ?? 0,
                          totalTokens: usage.totalTokens ?? 0,
                      }
                    : undefined,
            };
            steps.push(agentStep);
            streamCallback?.(agentStep);

            // Collect retrieved chunks from search results
            collectSearchResults(call, toolResult, streamingState);
        }
    }

    // Record reasoning/synthesis steps
    if (text && finishReason === "stop") {
        const synthesisStep: AgentStep = {
            stepIndex: steps.length,
            stepType: "synthesis",
            reasoning: text.substring(0, 200),
            durationMs: 0,
            timestamp: Date.now(),
            tokenUsage: usage
                ? {
                      inputTokens: usage.inputTokens ?? 0,
                      outputTokens: usage.outputTokens ?? 0,
                      totalTokens: usage.totalTokens ?? 0,
                  }
                : undefined,
        };
        steps.push(synthesisStep);
        streamCallback?.(synthesisStep);
    }
}

function collectSearchResults(
    call: { toolName: string; toolCallId: string; input: unknown },
    toolResult: { toolCallId: string; toolName: string; output: unknown } | undefined,
    streamingState: StreamingState
): void {
    if (call.toolName === "search_documents" && toolResult?.output) {
        const searchResult = toolResult.output as {
            documents?: Array<{ title: string; content: string; score: string }>;
        };
        if (searchResult.documents) {
            for (const doc of searchResult.documents) {
                const chunkId = crypto.randomUUID();
                const result: RetrievalResult = {
                    chunkId,
                    documentId: crypto.randomUUID(),
                    documentTitle: doc.title,
                    content: doc.content,
                    fusedScore: Number.parseFloat(doc.score),
                    vectorScore: 0,
                    bm25Score: 0,
                    retrievalMethod: "hybrid",
                };

                // Avoid duplicates
                const exists = streamingState.retrievedChunks.some((c) => c.content === result.content);
                if (!exists) {
                    streamingState.retrievedChunks.push(result);
                    streamingState.citationManager.assignCitation(chunkId);
                }
            }
        }
    }
}

function calculateStepDurations(steps: AgentStep[]): void {
    for (let i = 0; i < steps.length; i++) {
        if (i < steps.length - 1) {
            steps[i].durationMs = steps[i + 1].timestamp - steps[i].timestamp;
        } else {
            steps[i].durationMs = Date.now() - steps[i].timestamp;
        }
    }
}

/**
 * Calculate aggregated latency breakdown from steps
 *
 * WHY: Evaluation metrics need to know time spent in each phase (planning, synthesis, tool calls)
 * The agentic mode previously returned 0 for these because latencies weren't aggregated properly.
 *
 * APPROACH:
 * - Tool calls and retrieval: Summed from step durations
 * - Reranking: Currently not tracked separately (happens inside search_documents)
 * - Synthesis: Calculated as residual = totalMs - (planning + toolCall + retrieval + reranking)
 * - Planning & Reasoning: Estimated from first step duration (LLM thinking time)
 *
 * @param steps - Array of completed agent steps with durations
 * @param totalMs - Total execution time in milliseconds
 * @returns Aggregated latency breakdown by phase
 */
function calculateLatencyBreakdown(steps: AgentStep[], totalMs: number): AgenticLatencyBreakdown {
    let planningMs = 0;
    let reasoningMs = 0;
    let toolCallMs = 0;
    let synthesisMs = 0;
    let retrievalMs = 0;
    let rerankingMs = 0;

    // Sum up actual tracked step durations
    for (const step of steps) {
        switch (step.stepType) {
            case "planning":
                planningMs += step.durationMs;
                break;
            case "reasoning":
                reasoningMs += step.durationMs;
                break;
            case "tool_call":
                toolCallMs += step.durationMs;
                // If tool is search_documents, also count as retrieval
                if (step.toolName === "search_documents") {
                    retrievalMs += step.durationMs;
                }
                break;
            case "synthesis":
                // Don't use step.durationMs - it's unreliable (calculated after workflow)
                // Will calculate as residual below
                break;
            case "retrieval":
                retrievalMs += step.durationMs;
                break;
            case "reranking":
                rerankingMs += step.durationMs;
                break;
            default:
                // Unknown step type - ignore for latency calculation
                break;
        }
    }

    // Estimate planning from first step if no explicit planning steps exist
    if (planningMs === 0 && steps.length > 0) {
        const firstStep = steps[0];
        if (firstStep.stepType === "tool_call" && firstStep.durationMs > 0) {
            // First tool call includes implicit planning (LLM reasoning before calling tool)
            // Estimate planning as 20-30% of first step duration
            planningMs = Math.round(firstStep.durationMs * 0.25);
        }
    }

    // Estimate reasoning if no explicit reasoning steps
    // Reasoning is the LLM "thinking" time between tool calls
    if (reasoningMs === 0 && toolCallMs > 0) {
        // Rough estimate: 10-15% of tool call time is spent on reasoning/planning
        reasoningMs = Math.round(toolCallMs * 0.12);
    }

    // Calculate synthesis as residual time
    // Synthesis = Total - (Planning + Reasoning + Tool Execution + Retrieval overhead)
    const trackedMs = planningMs + reasoningMs + toolCallMs;
    synthesisMs = Math.max(0, totalMs - trackedMs);

    // Ensure synthesis is at least 100ms if there are tool calls
    // (It takes time to generate the final answer)
    if (steps.length > 0 && synthesisMs < 100) {
        // Likely case: tool calls were faster than expected or synthesis wasn't tracked
        // Allocate at least 10% of total time to synthesis
        synthesisMs = Math.max(synthesisMs, Math.round(totalMs * 0.1));
    }

    return {
        planningMs,
        reasoningMs,
        toolCallMs,
        synthesisMs,
        retrievalMs,
        rerankingMs, // Currently 0 - not separately tracked
        totalMs,
    };
}

/**
 * Create empty latency breakdown for error/early-exit cases
 */
function createEmptyLatencyBreakdown(totalMs: number): AgenticLatencyBreakdown {
    return {
        planningMs: 0,
        reasoningMs: 0,
        toolCallMs: 0,
        synthesisMs: 0,
        retrievalMs: 0,
        rerankingMs: 0,
        totalMs,
    };
}

function handleAgentError(
    error: unknown,
    _language: "id",
    steps: AgentStep[],
    streamingState: StreamingState,
    guardrailResults: AgenticRagResult["guardrailResults"],
    startTime: number
): AgenticRagResult {
    const totalLatencyMs = Date.now() - startTime;
    if (NoSuchToolError.isInstance(error)) {
        consola.error("Tool not found:", error.toolName);
        return {
            answer: "Maaf, terjadi kesalahan: alat yang diminta tidak tersedia.",
            steps,
            retrievedChunks: streamingState.retrievedChunks,
            citations: streamingState.citationManager.getCitations(),
            guardrailResults,
            language: "id",
            totalLatencyMs,
            latencyBreakdown: createEmptyLatencyBreakdown(totalLatencyMs),
        };
    }

    throw error;
}

// ==================== Streaming Version ====================

export async function streamAgenticRag(
    query: string,
    options: {
        sessionId?: string;
        retrievalStrategy?: "vector" | "keyword" | "hybrid";
        enableGuardrails?: boolean;
        maxSteps?: number;
        useReranker?: boolean;
        rerankerStrategy?: RerankerStrategy;
    } = {}
) {
    const {
        sessionId = crypto.randomUUID(),
        retrievalStrategy = "hybrid",
        enableGuardrails = true,
        maxSteps = 5,
    } = options;

    const language = "id" as const; // Always Indonesian
    const streamingState = getOrCreateStreamingState(sessionId);
    const steps: AgentStep[] = [];

    // Input validation
    if (enableGuardrails) {
        const inputValidation = await validateInput(query);
        if (!inputValidation.passed) {
            throw new Error("Validasi input gagal");
        }
    }

    // Initial retrieval for context
    const initialResults = await hybridRetrieve(query, {
        strategy: retrievalStrategy,
        topK: 5,
        language,
        useReranker: true,
        rerankerStrategy: "cross_encoder",
    });

    // Add to streaming state
    for (const result of initialResults) {
        streamingState.retrievedChunks.push(result);
        streamingState.citationManager.assignCitation(result.chunkId);
    }

    const context = streamingState.retrievedChunks.map((c) => `[${c.documentTitle}]: ${c.content}`).join("\n\n");

    const agentTools = createAgentTools(language, streamingState);

    const systemWithLanguage = `${AGENTIC_SYSTEM_PROMPT}\n\n[PENEGAK BAHASA] Selalu jawab HANYA dalam Bahasa Indonesia.`;

    consola.debug(`[streamAgenticRag] Using enforced language: ${language}`);
    consola.debug(
        `[streamAgenticRag] Top-of-context chunk languages: ${streamingState.retrievedChunks
            .slice(0, 5)
            .map((c) => detectQueryLanguage(c.content))
            .join(", ")}`
    );

    const result = streamText({
        model: CHAT_MODEL,
        system: systemWithLanguage,
        prompt: `Context:\n${context}\n\nQuestion: ${query}`,
        tools: agentTools,
        stopWhen: stepCountIs(maxSteps),
        temperature: 0.4,
        experimental_telemetry: {
            ...telemetryConfig,
            functionId: "stream-agentic-rag",
        },
        onStepFinish: ({ toolCalls, toolResults }) => {
            if (toolCalls) {
                for (const call of toolCalls) {
                    const toolResult = toolResults?.find((r) => r.toolCallId === call.toolCallId);
                    steps.push({
                        stepIndex: steps.length,
                        stepType: "tool_call",
                        toolName: call.toolName,
                        toolInput: call.input as Record<string, unknown>,
                        toolOutput: toolResult?.output,
                        durationMs: 0,
                        timestamp: Date.now(),
                    });
                }
            }
        },
    });

    return {
        stream: result,
        steps,
        retrievedChunks: streamingState.retrievedChunks,
        citations: streamingState.citationManager.getCitations(),
        language,
    };
}

// ==================== New Streaming Version with Progress Callbacks ====================

/**
 * Streaming agentic RAG with real-time progress callbacks.
 * This function provides callbacks for each step, allowing the caller to
 * stream progress updates to the client in real-time.
 */
export async function streamAgenticRagWithProgress(
    query: string,
    options: {
        sessionId?: string;
        retrievalStrategy?: "vector" | "keyword" | "hybrid";
        enableGuardrails?: boolean;
        maxSteps?: number;
        useReranker?: boolean;
        rerankerStrategy?: RerankerStrategy;
        // Real-time callbacks
        onStepStart?: (step: AgentStep) => void;
        onStepComplete?: (step: AgentStep) => void;
        onChunksRetrieved?: (chunks: RetrievalResult[]) => void;
    } = {}
) {
    const {
        sessionId = crypto.randomUUID(),
        retrievalStrategy = "hybrid",
        enableGuardrails = true,
        maxSteps = 5,
        onStepStart,
        onStepComplete,
        onChunksRetrieved,
    } = options;

    const language = "id" as const;
    const streamingState = getOrCreateStreamingState(sessionId);
    const steps: AgentStep[] = [];

    consola.debug(`[streamAgenticRagWithProgress] Starting with sessionId: ${sessionId}`);

    // Input validation
    if (enableGuardrails) {
        const inputValidation = await validateInput(query);
        if (!inputValidation.passed) {
            throw new Error("Validasi input gagal");
        }
    }

    // Initial retrieval for context
    consola.debug("[streamAgenticRagWithProgress] Performing initial retrieval...");
    const initialResults = await hybridRetrieve(query, {
        strategy: retrievalStrategy,
        topK: 5,
        language,
        useReranker: true,
        rerankerStrategy: "cross_encoder",
    });

    // Add to streaming state and notify
    for (const result of initialResults) {
        streamingState.retrievedChunks.push(result);
        streamingState.citationManager.assignCitation(result.chunkId);
    }

    // Notify about initial chunks
    if (initialResults.length > 0 && onChunksRetrieved) {
        onChunksRetrieved(initialResults);
    }

    consola.debug(`[streamAgenticRagWithProgress] Initial retrieval found ${initialResults.length} chunks`);

    const context = streamingState.retrievedChunks.map((c) => `[${c.documentTitle}]: ${c.content}`).join("\n\n");

    // Create tools with callbacks for real-time updates
    const agentTools = createAgentToolsWithCallbacks(language, streamingState, onChunksRetrieved);

    const systemWithLanguage = `${AGENTIC_SYSTEM_PROMPT}\n\n[PENEGAK BAHASA] Selalu jawab HANYA dalam Bahasa Indonesia.`;

    consola.debug("[streamAgenticRagWithProgress] Starting LLM stream with tools...");

    const llmStream = streamText({
        model: CHAT_MODEL,
        system: systemWithLanguage,
        prompt: `Context:\n${context}\n\nQuestion: ${query}`,
        tools: agentTools,
        stopWhen: stepCountIs(maxSteps),
        temperature: 0.4,
        experimental_telemetry: {
            ...telemetryConfig,
            functionId: "stream-agentic-rag-progress",
            metadata: {
                ...telemetryConfig.metadata,
                language,
                retrievalStrategy,
                sessionId,
            },
        },
        onStepFinish: ({ toolCalls, toolResults, usage }) => {
            if (toolCalls && toolCalls.length > 0) {
                consola.debug(`[streamAgenticRagWithProgress] Step finished with ${toolCalls.length} tool calls`);

                for (const call of toolCalls) {
                    const toolResult = toolResults?.find((r) => r.toolCallId === call.toolCallId);
                    const stepStartTime = Date.now();

                    // Create step in "executing" state
                    const step: AgentStep = {
                        stepIndex: steps.length,
                        stepType: "tool_call",
                        toolName: call.toolName,
                        toolInput: call.input as Record<string, unknown>,
                        toolOutput: undefined,
                        durationMs: 0,
                        timestamp: stepStartTime,
                        tokenUsage: usage
                            ? {
                                  inputTokens: usage.inputTokens ?? 0,
                                  outputTokens: usage.outputTokens ?? 0,
                                  totalTokens: usage.totalTokens ?? 0,
                              }
                            : undefined,
                    };

                    // Notify step started
                    if (onStepStart) {
                        onStepStart(step);
                    }

                    // Update with result and duration
                    step.toolOutput = toolResult?.output;
                    step.durationMs = Date.now() - stepStartTime;

                    steps.push(step);

                    // Notify step completed
                    if (onStepComplete) {
                        onStepComplete(step);
                    }
                }
            }
        },
    });

    return {
        llmStream,
        steps,
        retrievedChunks: streamingState.retrievedChunks,
        citations: streamingState.citationManager.getCitations(),
        language,
    };
}

/**
 * Create agent tools with callbacks for chunk retrieval notifications
 */
function createAgentToolsWithCallbacks(
    language: "id",
    streamingState: StreamingState,
    onChunksRetrieved?: (chunks: RetrievalResult[]) => void
) {
    return {
        search_documents: tool({
            description:
                "Cari basis pengetahuan untuk dokumen yang relevan menggunakan pengambilan hibrida (Okapi BM25 + kesamaan vektor). Gunakan untuk setiap sub-pertanyaan setelah dekomposisi.",
            inputSchema: z.object({
                query: z.string().describe("The search query"),
                strategy: z.enum(["vector", "keyword", "hybrid"]).default("hybrid"),
                topK: z.number().min(1).max(20).default(5),
            }),
            execute: async ({ query, strategy, topK }) => {
                consola.debug(`[searchTool] Executing search - query: "${query.substring(0, 80)}..."`);

                const results = await hybridRetrieve(query, {
                    strategy,
                    topK,
                    language,
                    useReranker: true,
                    rerankerStrategy: "cross_encoder",
                });

                // Collect new chunks
                const newChunks: RetrievalResult[] = [];
                for (const result of results) {
                    const exists = streamingState.retrievedChunks.some((c) => c.chunkId === result.chunkId);
                    if (!exists) {
                        streamingState.retrievedChunks.push(result);
                        streamingState.citationManager.assignCitation(result.chunkId);
                        newChunks.push(result);
                    }
                }

                // Notify about new chunks
                if (newChunks.length > 0 && onChunksRetrieved) {
                    onChunksRetrieved(newChunks);
                }

                consola.debug(
                    `[searchTool] Found ${results.length} results, ${newChunks.length} new (total: ${streamingState.retrievedChunks.length})`
                );

                return {
                    found: results.length,
                    documents: results.map((r) => ({
                        title: r.documentTitle,
                        content: r.content.substring(0, 500) + (r.content.length > 500 ? "..." : ""),
                        score: r.fusedScore.toFixed(3),
                        method: r.retrievalMethod,
                    })),
                };
            },
        }),
        expand_query: createExpandQueryTool(language),
        decompose_query: createDecomposeQueryTool(language),
        verify_claim: createVerifyClaimTool(),
        synthesize_answer: createSynthesizeAnswerTool(),
    };
}
