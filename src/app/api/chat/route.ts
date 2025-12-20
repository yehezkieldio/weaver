/**
 * @fileoverview API Route: Chat Endpoint
 *
 * WHY This Endpoint Exists:
 * - Serves as the main interface between frontend chat UI and RAG pipeline
 * - Provides flexible chat modes: direct LLM, standard RAG, and agentic RAG
 * - Implements streaming responses for real-time user feedback
 * - Integrates guardrails for content safety and quality control
 *
 * Request/Response Flow:
 * 1. Parse incoming message and configuration (RAG mode, retrieval strategy, etc.)
 * 2. Detect query language (Indonesian/English) for domain-specific processing
 * 3. Apply input guardrails (validation, negative reaction detection)
 * 4. Route to appropriate processing mode (agentic/standard RAG/direct)
 * 5. Stream response chunks with metadata (retrieved chunks, agent steps, citations)
 * 6. Apply output guardrails (hallucination detection, factual consistency)
 * 7. Persist conversation to database for history and analysis
 *
 * Integration Points:
 * - Frontend: ChatInterface component consumes streaming responses
 * - RAG Pipeline: Hybrid retrieval, reranking, context building
 * - Guardrails: Input validation, output validation, negative reaction handling
 * - Database: Session and message persistence for continuity
 * - Telemetry: Performance monitoring and debugging
 */

import {
    convertToModelMessages,
    createUIMessageStream,
    createUIMessageStreamResponse,
    streamText,
    type UIMessage,
} from "ai";
import consola from "consola";
import { eq } from "drizzle-orm";
import { CHAT_MODEL, telemetryConfig } from "@/lib/ai";
import { db } from "@/lib/db";
import { agentSteps, chatMessages, chatSessions, guardrailLogs } from "@/lib/db/schema";
import { type AgentStep, streamAgenticRagWithProgress } from "@/lib/rag/agentic-rag";
import { buildRagPrompt, retrieveContext, SYSTEM_PROMPTS } from "@/lib/rag/context-builder";
import { detectNegativeReaction, validateInput, validateOutput } from "@/lib/rag/guardrails";
import type { RetrievalResult } from "@/lib/rag/hybrid-retrieval";
import { detectQueryLanguage } from "@/lib/rag/university-domain";
import type {
    AgentProgressDataPart,
    AgentResultDataPart,
    AgentStepDataPart,
    RetrievedChunkDataPart,
} from "@/lib/types";

/**
 * Maximum execution duration for serverless function (in seconds)
 * WHY 60 seconds: Allows sufficient time for complex agentic RAG workflows with multiple retrieval and reasoning steps
 */
export const maxDuration = 60;

/**
 * Metadata for agentic RAG responses
 *
 * @property type - Response type identifier
 * @property retrievedChunks - Document chunks retrieved and used for generation
 * @property steps - Agent reasoning and tool execution steps
 * @property language - Detected query language
 * @property latencyMs - Total response generation time
 * @property citations - Formatted citations for academic context
 */
interface AgenticMetadata {
    type: "agentic";
    retrievedChunks: Array<{
        chunkId: string;
        documentTitle: string;
        content: string;
        similarity: number;
        retrievalMethod?: string;
        vectorScore?: number;
        bm25Score?: number;
    }>;
    steps: AgentStep[];
    language: "en" | "id";
    latencyMs?: number;
    citations: Array<{ id: string; documentTitle: string; citationNumber: number }>;
}

/**
 * Metadata for standard RAG responses
 *
 * @property type - Response type identifier
 * @property retrievedChunks - Document chunks retrieved for context
 * @property language - Detected query language
 * @property latencyMs - Total response generation time
 */
interface StandardRagMetadata {
    type: "standard-rag";
    retrievedChunks: Array<{
        chunkId: string;
        documentTitle: string;
        content: string;
        similarity: number;
        retrievalMethod?: string;
        vectorScore?: number;
        bm25Score?: number;
    }>;
    language: "en" | "id";
    latencyMs?: number;
}

/**
 * Metadata for direct LLM responses (no RAG)
 *
 * @property type - Response type identifier
 * @property language - Detected query language
 * @property latencyMs - Total response generation time
 */
interface DirectMetadata {
    type: "direct";
    language: "en" | "id";
    latencyMs?: number;
}

/**
 * Union type for all possible chat response metadata
 */
type ChatMetadata = AgenticMetadata | StandardRagMetadata | DirectMetadata;

/**
 * POST /api/chat
 *
 * WHY Streaming Response:
 * - Provides real-time feedback during long RAG pipeline execution (retrieval → reranking → generation)
 * - Reduces perceived latency - users see progressive output instead of waiting 5-10 seconds
 * - Allows progressive rendering of agent steps and citations in UI
 * - Better UX for complex queries requiring multi-step reasoning
 *
 * Request Body:
 * - messages: UIMessage[] - Conversation history in Vercel AI SDK format
 * - sessionId?: string - Session identifier for conversation persistence
 * - useRag: boolean - Enable RAG mode (default: true)
 * - useAgenticMode: boolean - Enable multi-step agentic reasoning (default: true)
 * - retrievalStrategy: "vector" | "keyword" | "hybrid" - Document retrieval method (default: "hybrid")
 * - enableGuardrails: boolean - Enable content safety checks (default: true)
 * - useReranker: boolean - Enable reranking for better relevance (default: true)
 * - rerankerStrategy: string - Reranking algorithm selection (default: "cross_encoder")
 *
 * Response:
 * - Success (200): Server-Sent Events stream with text chunks and metadata
 *   - Metadata includes: retrieved chunks, agent steps, citations, latency metrics
 * - Error (400): { error: string, violations?: string[] } - Input validation failure
 * - Error (500): { error: string, details: string } - Processing error
 *
 * @param request - Next.js request object with JSON body
 * @returns Streaming response with UI message format and metadata
 * @throws Error - When message parsing fails or RAG pipeline encounters errors
 *
 * @example
 * ```typescript
 * // Frontend usage with Vercel AI SDK
 * const { messages, append } = useChat({
 *   api: '/api/chat',
 *   body: {
 *     sessionId: 'session-123',
 *     useRag: true,
 *     useAgenticMode: true,
 *     retrievalStrategy: 'hybrid'
 *   }
 * });
 * ```
 */
export async function POST(request: Request) {
    const startTime = Date.now();
    console.log("[POST] Starting chat request processing");

    consola.level = 999;

    try {
        const {
            messages,
            sessionId,
            useRag = true,
            useAgenticMode = true,
            retrievalStrategy = "hybrid",
            enableGuardrails = true,
            useReranker = true,
            rerankerStrategy = "cross_encoder",
        }: {
            messages: UIMessage[];
            sessionId?: string;
            useRag?: boolean;
            useAgenticMode?: boolean;
            retrievalStrategy?: "vector" | "keyword" | "hybrid";
            enableGuardrails?: boolean;
            useReranker?: boolean;
            rerankerStrategy?: "cross_encoder" | "llm" | "llm_listwise" | "cohere" | "ensemble" | "none";
        } = await request.json();

        console.log(
            `[POST] Parsed request - sessionId: ${sessionId}, useRag: ${useRag}, useAgenticMode: ${useAgenticMode}, retrievalStrategy: ${retrievalStrategy}, enableGuardrails: ${enableGuardrails}, useReranker: ${useReranker}, rerankerStrategy: ${rerankerStrategy}`
        );

        const lastMessage = messages.at(-1);

        // Extract user message from UIMessage format
        let userMessage = "";
        if (lastMessage?.parts && Array.isArray(lastMessage.parts)) {
            userMessage = lastMessage.parts
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join(" ");
        } else if (typeof lastMessage === "object" && "content" in lastMessage) {
            // Fallback for simple message format
            userMessage = String(lastMessage.content || "");
        }

        console.log(`[POST] User message: "${userMessage.substring(0, 100)}...", length: ${userMessage.length}`);

        const language = detectQueryLanguage(userMessage);
        const triggeredGuardrails: string[] = [];

        console.log(`[POST] Detected language: ${language}`);

        if (enableGuardrails) {
            const [inputValidation, negativeReaction] = await Promise.all([
                validateInput(userMessage),
                detectNegativeReaction(userMessage),
            ]);

            console.log(
                `[POST] Guardrails - input passed: ${inputValidation.passed}, negative reaction: ${negativeReaction.detected}`
            );

            // Log guardrail checks
            if (sessionId) {
                await db.insert(guardrailLogs).values({
                    sessionId,
                    guardrailType: "input_validation",
                    triggered: !inputValidation.passed,
                    severity: inputValidation.severity,
                    details: {
                        rule: inputValidation.violations.map((v) => v.rule).join(", ") || "none",
                        action: inputValidation.passed ? "allowed" : "blocked",
                        matchedContent: negativeReaction.detected ? String(negativeReaction.type) : undefined,
                    },
                });
            }

            // Track triggered guardrails
            if (!inputValidation.passed) {
                triggeredGuardrails.push("input_validation");
            }
            if (negativeReaction.detected) {
                triggeredGuardrails.push("negative_reaction");
            }

            // Handle negative reactions with empathetic response (streamed)
            if (negativeReaction.detected && negativeReaction.severity === "high") {
                console.log("[POST] High severity negative reaction detected - responding empathetically");

                const empathyResponse =
                    language === "id"
                        ? `Saya mengerti Anda mungkin merasa ${negativeReaction.type === "frustration" ? "frustrasi" : "bingung"}. ${negativeReaction.suggestedResponse} Bagaimana saya bisa membantu Anda dengan lebih baik?`
                        : `I understand you might be feeling ${negativeReaction.type}. ${negativeReaction.suggestedResponse} How can I better assist you?`;

                // Stream the empathetic response instead of JSON
                const empathyResult = streamText({
                    model: CHAT_MODEL,
                    prompt: empathyResponse,
                    experimental_telemetry: telemetryConfig,
                });

                return empathyResult.toUIMessageStreamResponse({
                    messageMetadata: ({ part }) => {
                        if (part.type === "start" || part.type === "finish") {
                            return {
                                type: "direct" as const,
                                language,
                                negativeReactionDetected: true,
                                latencyMs: part.type === "finish" ? Date.now() - startTime : undefined,
                            };
                        }
                        return undefined;
                    },
                });
            }

            if (!inputValidation.passed) {
                console.log("[POST] Input validation failed - blocking request");

                return new Response(
                    JSON.stringify({
                        error:
                            language === "id"
                                ? "Permintaan diblokir oleh kebijakan konten"
                                : "Query blocked by content policy",
                        violations: inputValidation.violations.map((v) => v.description),
                    }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }
        }

        if (useRag && useAgenticMode) {
            console.log("[POST] Using agentic RAG mode (streaming with real-time steps)");

            // Track accumulated data for final metadata
            const accumulatedSteps: AgentStep[] = [];
            const accumulatedChunks: RetrievalResult[] = [];
            let responseText = "";
            let totalTokens = 0;

            const stream = createUIMessageStream({
                execute: async ({ writer }) => {
                    // Send initial progress notification (transient - won't persist)
                    writer.write({
                        type: "data-agent-progress",
                        data: {
                            currentStep: 0,
                            maxSteps: 5,
                            status: "initializing",
                            message: "Memulai proses agentic RAG...",
                        } satisfies AgentProgressDataPart,
                        transient: true,
                    });

                    // Get the agentic RAG stream with progress callbacks
                    const agentResult = await streamAgenticRagWithProgress(userMessage, {
                        sessionId,
                        retrievalStrategy,
                        enableGuardrails,
                        useReranker,
                        rerankerStrategy,
                        // Callback for each agent step (real-time)
                        onStepStart: (step) => {
                            writer.write({
                                type: "data-agent-step",
                                data: {
                                    stepIndex: step.stepIndex,
                                    stepType: step.stepType,
                                    toolName: step.toolName,
                                    toolInput: step.toolInput,
                                    status: "executing",
                                    timestamp: step.timestamp,
                                } satisfies AgentStepDataPart,
                            });
                            writer.write({
                                type: "data-agent-progress",
                                data: {
                                    currentStep: step.stepIndex + 1,
                                    maxSteps: 5,
                                    status: "reasoning",
                                    message: step.toolName
                                        ? `Menjalankan: ${step.toolName}...`
                                        : "Agent sedang berpikir...",
                                } satisfies AgentProgressDataPart,
                                transient: true,
                            });
                        },
                        // Callback when step completes with result
                        onStepComplete: (step) => {
                            accumulatedSteps.push(step);
                            writer.write({
                                type: "data-agent-result",
                                data: {
                                    stepIndex: step.stepIndex,
                                    toolName: step.toolName || "reasoning",
                                    output: step.toolOutput,
                                    durationMs: step.durationMs,
                                    timestamp: Date.now(),
                                } satisfies AgentResultDataPart,
                            });
                        },
                        // Callback when new chunks are retrieved
                        onChunksRetrieved: (chunks) => {
                            for (const chunk of chunks) {
                                // Avoid duplicates
                                if (!accumulatedChunks.some((c) => c.chunkId === chunk.chunkId)) {
                                    accumulatedChunks.push(chunk);
                                    writer.write({
                                        type: "data-retrieved-chunk",
                                        data: {
                                            chunkId: chunk.chunkId,
                                            documentTitle: chunk.documentTitle,
                                            content: chunk.content,
                                            similarity: chunk.fusedScore,
                                            retrievalMethod: chunk.retrievalMethod,
                                            vectorScore: chunk.vectorScore,
                                            bm25Score: chunk.bm25Score,
                                        } satisfies RetrievedChunkDataPart,
                                    });
                                }
                            }
                            writer.write({
                                type: "data-agent-progress",
                                data: {
                                    currentStep: accumulatedSteps.length,
                                    maxSteps: 5,
                                    status: "retrieving",
                                    message: `Ditemukan ${accumulatedChunks.length} sumber...`,
                                } satisfies AgentProgressDataPart,
                                transient: true,
                            });
                        },
                    });

                    const { llmStream, citations, language: detectedLanguage } = agentResult;

                    // Update progress to synthesizing
                    writer.write({
                        type: "data-agent-progress",
                        data: {
                            currentStep: accumulatedSteps.length,
                            maxSteps: 5,
                            status: "synthesizing",
                            message: "Menyintesis jawaban...",
                        } satisfies AgentProgressDataPart,
                        transient: true,
                    });

                    // Merge the LLM text stream
                    writer.merge(
                        llmStream.toUIMessageStream({
                            sendStart: false,
                            onFinish: ({ responseMessage }) => {
                                // Extract text from response message parts
                                const textParts = responseMessage.parts.filter(
                                    (p): p is { type: "text"; text: string } => p.type === "text"
                                );
                                responseText = textParts.map((p) => p.text).join("") || "";

                                // Send completion progress
                                writer.write({
                                    type: "data-agent-progress",
                                    data: {
                                        currentStep: accumulatedSteps.length,
                                        maxSteps: accumulatedSteps.length,
                                        status: "completed",
                                        message: "Selesai",
                                    } satisfies AgentProgressDataPart,
                                    transient: true,
                                });
                            },
                        })
                    );

                    // Store citations and language for later use
                    const agentMetadata = agentResult as unknown as {
                        _citations?: typeof citations;
                        _language?: typeof detectedLanguage;
                    };
                    agentMetadata._citations = citations;
                    agentMetadata._language = detectedLanguage;
                },
                onFinish: async () => {
                    const latencyMs = Date.now() - startTime;

                    console.log(
                        `[POST] Agentic RAG stream finished - latency: ${latencyMs}ms, steps: ${accumulatedSteps.length}, chunks: ${accumulatedChunks.length}`
                    );

                    // Output validation
                    if (enableGuardrails && responseText) {
                        const outputValidation = await validateOutput(responseText, {
                            retrievedChunks: accumulatedChunks.map((c) => c.content),
                            query: userMessage,
                        });

                        if (sessionId) {
                            await db.insert(guardrailLogs).values({
                                sessionId,
                                guardrailType: "output_validation",
                                triggered: !outputValidation.passed,
                                severity: outputValidation.severity,
                                details: {
                                    rule: outputValidation.violations.map((v) => v.rule).join(", ") || "none",
                                    action: outputValidation.passed ? "allowed" : "flagged",
                                },
                            });
                        }

                        if (!outputValidation.passed) {
                            triggeredGuardrails.push("output_validation");
                        }
                    }

                    // Save messages and agent steps to database
                    if (sessionId) {
                        // Calculate total tokens from agent steps
                        totalTokens = accumulatedSteps.reduce(
                            (sum, step) => sum + (step.tokenUsage?.totalTokens ?? 0),
                            0
                        );

                        // Insert user message
                        await db.insert(chatMessages).values({
                            sessionId,
                            role: "user",
                            content: userMessage,
                            ragEnabled: useRag,
                            agenticMode: true,
                            guardrailsTriggered: triggeredGuardrails.length > 0 ? triggeredGuardrails : undefined,
                            createdAt: new Date(),
                        });

                        // Insert assistant message and get its ID for linking agent steps
                        const [assistantMessage] = await db
                            .insert(chatMessages)
                            .values({
                                sessionId,
                                role: "assistant",
                                content: responseText,
                                retrievedChunks:
                                    accumulatedChunks.length > 0
                                        ? accumulatedChunks.map((c) => ({
                                              chunkId: c.chunkId,
                                              documentTitle: c.documentTitle,
                                              content: c.content,
                                              similarity: c.fusedScore,
                                              retrievalMethod: c.retrievalMethod,
                                              vectorScore: c.vectorScore,
                                              bm25Score: c.bm25Score,
                                          }))
                                        : undefined,
                                ragEnabled: useRag,
                                agenticMode: true,
                                agentStepsCount: accumulatedSteps.length,
                                latencyMs,
                                tokenCount: totalTokens > 0 ? totalTokens : undefined,
                                guardrailsTriggered: triggeredGuardrails.length > 0 ? triggeredGuardrails : undefined,
                                createdAt: new Date(),
                            })
                            .returning({ id: chatMessages.id });

                        // Insert agent steps linked to the assistant message
                        if (accumulatedSteps.length > 0 && assistantMessage?.id) {
                            await db.insert(agentSteps).values(
                                accumulatedSteps.map((step) => ({
                                    sessionId,
                                    messageId: assistantMessage.id,
                                    stepIndex: step.stepIndex,
                                    stepType: step.stepType,
                                    toolName: step.toolName,
                                    toolInput: step.toolInput as Record<string, unknown> | undefined,
                                    toolOutput: step.toolOutput as Record<string, unknown> | undefined,
                                    reasoning: step.reasoning,
                                    durationMs: step.durationMs,
                                    createdAt: new Date(step.timestamp),
                                }))
                            );
                        }

                        // Update session timestamp
                        await db
                            .update(chatSessions)
                            .set({ updatedAt: new Date() })
                            .where(eq(chatSessions.id, sessionId));
                    }
                },
            });

            return createUIMessageStreamResponse({
                stream,
                headers: {
                    "X-Chat-Mode": "agentic",
                },
            });
        }

        if (useRag) {
            console.log("[POST] Using standard RAG mode (streaming)");

            let systemPrompt = SYSTEM_PROMPTS.rag;
            let retrievedChunks: Array<{
                chunkId: string;
                documentTitle: string;
                content: string;
                similarity: number;
                retrievalMethod?: "vector" | "keyword" | "hybrid";
                vectorScore?: number;
                bm25Score?: number;
            }> = [];

            const contextResult = await retrieveContext(userMessage, {
                topK: 5,
                minSimilarity: 0.3,
                maxTokens: 4000,
                strategy: retrievalStrategy,
                useReranker,
                rerankerStrategy,
            });

            retrievedChunks = contextResult.chunks;

            console.log(`[POST] Retrieved ${retrievedChunks.length} chunks for context`);

            if (contextResult.context) {
                systemPrompt = buildRagPrompt(SYSTEM_PROMPTS.rag, contextResult.context, userMessage);
            }

            // Prepare metadata for streaming
            const standardRagMetadata: StandardRagMetadata = {
                type: "standard-rag",
                retrievedChunks,
                language,
            };
            let standardRagTotalTokens = 0;

            const result = streamText({
                model: CHAT_MODEL,
                system: systemPrompt,
                messages: convertToModelMessages(messages),
                experimental_telemetry: {
                    ...telemetryConfig,
                    functionId: "rag-chat",
                    metadata: {
                        ...telemetryConfig.metadata,
                        language,
                        useRag,
                        retrievalStrategy,
                    },
                },
            });

            return result.toUIMessageStreamResponse({
                messageMetadata: ({ part }) => {
                    if (part.type === "finish") {
                        const latencyMs = Date.now() - startTime;
                        // Capture token usage
                        if (part.totalUsage?.totalTokens) {
                            standardRagTotalTokens = part.totalUsage.totalTokens;
                        }
                        return {
                            ...standardRagMetadata,
                            latencyMs,
                        } as ChatMetadata;
                    }
                    if (part.type === "start") {
                        return standardRagMetadata as ChatMetadata;
                    }
                    return undefined;
                },
                onFinish: async ({ responseMessage }) => {
                    const latencyMs = Date.now() - startTime;
                    // Extract text from responseMessage parts
                    const text =
                        responseMessage.parts
                            ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
                            .map((p) => p.text)
                            .join("") || "";
                    console.log(`[POST] Standard RAG response finished - latency: ${latencyMs}ms`);

                    // Output validation
                    if (enableGuardrails) {
                        const outputValidation = await validateOutput(text, {
                            retrievedChunks: retrievedChunks.map((c) => c.content),
                            query: userMessage,
                        });

                        if (sessionId) {
                            await db.insert(guardrailLogs).values({
                                sessionId,
                                guardrailType: "output_validation",
                                triggered: !outputValidation.passed,
                                severity: outputValidation.severity,
                                details: {
                                    rule: outputValidation.violations.map((v) => v.rule).join(", ") || "none",
                                    action: outputValidation.passed ? "allowed" : "flagged",
                                },
                            });
                        }
                    }

                    // Save messages to database
                    if (sessionId) {
                        await Promise.all([
                            db.insert(chatMessages).values({
                                sessionId,
                                role: "user",
                                content: userMessage,
                                ragEnabled: useRag,
                                agenticMode: false,
                                createdAt: new Date(),
                            }),
                            db.insert(chatMessages).values({
                                sessionId,
                                role: "assistant",
                                content: text,
                                retrievedChunks: retrievedChunks.length > 0 ? retrievedChunks : undefined,
                                ragEnabled: useRag,
                                agenticMode: false,
                                latencyMs,
                                tokenCount: standardRagTotalTokens > 0 ? standardRagTotalTokens : undefined,
                                guardrailsTriggered: triggeredGuardrails.length > 0 ? triggeredGuardrails : undefined,
                                createdAt: new Date(),
                            }),
                            db
                                .update(chatSessions)
                                .set({ updatedAt: new Date() })
                                .where(eq(chatSessions.id, sessionId)),
                        ]);
                    }
                },
            });
        }

        console.log("[POST] Using direct mode (no RAG, streaming)");

        const directMetadata: DirectMetadata = {
            type: "direct",
            language,
        };
        let directModeTotalTokens = 0;

        const result = streamText({
            model: CHAT_MODEL,
            system: SYSTEM_PROMPTS.nonRag,
            messages: convertToModelMessages(messages),
            experimental_telemetry: {
                ...telemetryConfig,
                functionId: "direct-chat",
                metadata: {
                    ...telemetryConfig.metadata,
                    language,
                    useRag: false,
                },
            },
        });

        return result.toUIMessageStreamResponse({
            messageMetadata: ({ part }) => {
                if (part.type === "finish") {
                    const latencyMs = Date.now() - startTime;
                    // Capture token usage
                    if (part.totalUsage?.totalTokens) {
                        directModeTotalTokens = part.totalUsage.totalTokens;
                    }
                    return {
                        ...directMetadata,
                        latencyMs,
                    } as ChatMetadata;
                }
                if (part.type === "start") {
                    return directMetadata as ChatMetadata;
                }
                return undefined;
            },
            onFinish: async ({ responseMessage }) => {
                const latencyMs = Date.now() - startTime;
                // Extract text from responseMessage parts
                const text =
                    responseMessage.parts
                        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
                        .map((p) => p.text)
                        .join("") || "";

                console.log(`[POST] Direct mode response finished - latency: ${latencyMs}ms`);

                // Save messages to database
                if (sessionId) {
                    await Promise.all([
                        db.insert(chatMessages).values({
                            sessionId,
                            role: "user",
                            content: userMessage,
                            ragEnabled: false,
                            agenticMode: false,
                            guardrailsTriggered: triggeredGuardrails.length > 0 ? triggeredGuardrails : undefined,
                            createdAt: new Date(),
                        }),
                        db.insert(chatMessages).values({
                            sessionId,
                            role: "assistant",
                            content: text,
                            ragEnabled: false,
                            agenticMode: false,
                            latencyMs,
                            tokenCount: directModeTotalTokens > 0 ? directModeTotalTokens : undefined,
                            guardrailsTriggered: triggeredGuardrails.length > 0 ? triggeredGuardrails : undefined,
                            createdAt: new Date(),
                        }),
                        db.update(chatSessions).set({ updatedAt: new Date() }).where(eq(chatSessions.id, sessionId)),
                    ]);
                }
            },
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return new Response(
            JSON.stringify({
                error: "Failed to process chat request",
                details: error instanceof Error ? error.message : "Unknown error",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}
