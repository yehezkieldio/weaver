/**
 * @fileoverview Simulated Conversation Runner
 *
 * WHY This Approach:
 * - Tests end-to-end system: API → RAG → Response
 * - Evaluates multi-turn conversation quality
 * - Measures task completion and user satisfaction
 * - Validates context retention across turns
 * - Provides system-level metrics complementing RAGAS
 *
 * This is the main orchestrator that:
 * 1. Creates a chat session
 * 2. Generates user messages (LLM-as-a-User)
 * 3. Calls chat API
 * 4. Evaluates responses
 * 5. Continues until task complete or max turns
 * 6. Computes conversation metrics
 */

import { generateId } from "ai";
import consola from "consola";
import { db } from "@/lib/db";
import { chatSessions } from "@/lib/db/schema";
import { calculateConversationMetrics, evaluateSuccessCriteria, evaluateTurnMetricsBatched } from "./evaluator";
import type {
    ConversationScenario,
    ConversationTurnResult,
    SimulatedConversationResult,
    SimulatedUserTestConfig,
    SystemLevelMetrics,
    UserSimulatorConfig,
} from "./types";
import { generateUserMessage, getUserMessageFromTemplate, shouldContinueConversation } from "./user-simulator";

/**
 * Retrieved chunk structure from the API
 */
interface RetrievedChunk {
    chunkId: string;
    documentTitle: string;
    content: string;
    similarity: number;
    retrievalMethod?: "vector" | "keyword" | "hybrid";
    vectorScore?: number;
    bm25Score?: number;
}

/**
 * Result of parsing an SSE JSON payload
 */
interface SSEParseResult {
    handled: boolean;
    textDelta?: string;
}

/**
 * Try to parse SSE JSON payload and extract retrieved chunks or text deltas
 *
 * The newer Vercel AI SDK UI message stream format uses JSON payloads like:
 * - {"type":"data-retrieved-chunk","data":{...}} - Retrieved document chunks
 * - {"type":"text-delta","id":"0","delta":"..."} - Text content deltas
 * - {"type":"text-end","id":"0"} - End of text stream
 * - {"type":"data-agent-progress",...} - Agent progress updates (ignored for text)
 * - {"type":"tool-input-start/delta/available",...} - Tool calls (ignored for text)
 */
function tryParseSSEPayload(contentLine: string, retrievedChunks: RetrievedChunk[]): SSEParseResult {
    try {
        const ssePayload = JSON.parse(contentLine);

        // Handle text-delta type - this contains the actual response text
        if (ssePayload?.type === "text-delta" && typeof ssePayload?.delta === "string") {
            return { handled: true, textDelta: ssePayload.delta };
        }

        // Handle data-retrieved-chunk type in SSE format
        if (ssePayload?.type === "data-retrieved-chunk" && ssePayload?.data) {
            const chunk = ssePayload.data as RetrievedChunk;
            if (chunk.chunkId && !retrievedChunks.some((c) => c.chunkId === chunk.chunkId)) {
                retrievedChunks.push({
                    chunkId: chunk.chunkId,
                    documentTitle: chunk.documentTitle || "",
                    content: chunk.content || "",
                    similarity: chunk.similarity || 0,
                    retrievalMethod: chunk.retrievalMethod,
                    vectorScore: chunk.vectorScore,
                    bm25Score: chunk.bm25Score,
                });
            }
            return { handled: true };
        }

        // Handle other known types that don't contribute to text
        if (
            ssePayload?.type === "data-agent-progress" ||
            ssePayload?.type === "data-agent-step" ||
            ssePayload?.type === "data-agent-result" ||
            ssePayload?.type === "tool-input-start" ||
            ssePayload?.type === "tool-input-delta" ||
            ssePayload?.type === "tool-input-available" ||
            ssePayload?.type === "tool-output-available" ||
            ssePayload?.type === "start-step" ||
            ssePayload?.type === "finish-step" ||
            ssePayload?.type === "text-end" ||
            ssePayload?.type === "finish"
        ) {
            return { handled: true };
        }
    } catch {
        // Not a JSON payload
    }
    return { handled: false };
}

/**
 * Parse AI SDK protocol text chunks (type 0)
 */
function parseTextChunk(dataStr: string): string {
    try {
        const textContent = JSON.parse(dataStr);
        if (typeof textContent === "string") {
            return textContent;
        }
    } catch {
        // Ignore parse errors
    }
    return "";
}

/**
 * Parse AI SDK protocol data parts (type 2)
 */
function parseDataParts(dataStr: string, retrievedChunks: RetrievedChunk[]): void {
    try {
        const dataParts = JSON.parse(dataStr);
        if (Array.isArray(dataParts)) {
            for (const part of dataParts) {
                if (part?.type === "data-retrieved-chunk" && part?.data) {
                    const chunk = part.data as RetrievedChunk;
                    if (chunk.chunkId && !retrievedChunks.some((c) => c.chunkId === chunk.chunkId)) {
                        retrievedChunks.push({
                            chunkId: chunk.chunkId,
                            documentTitle: chunk.documentTitle || "",
                            content: chunk.content || "",
                            similarity: chunk.similarity || 0,
                            retrievalMethod: chunk.retrievalMethod,
                            vectorScore: chunk.vectorScore,
                            bm25Score: chunk.bm25Score,
                        });
                    }
                }
            }
        }
    } catch {
        // Ignore parse errors
    }
}

/**
 * Parse Vercel AI SDK UI Message Stream format
 *
 * The stream format uses Server-Sent Events (SSE) with "data:" prefix.
 * Inside the SSE payload, the AI SDK uses different message formats:
 *
 * NEW FORMAT (createUIMessageStream):
 * - {"type":"text-delta","id":"0","delta":"..."} - Text chunks
 * - {"type":"text-end","id":"0"} - End of text
 * - {"type":"data-retrieved-chunk","data":{...}} - Retrieved chunks
 * - {"type":"data-agent-progress",...} - Agent progress
 * - {"type":"tool-input-start/delta/available",...} - Tool calls
 * - {"type":"finish","finishReason":"stop"} - Stream finished
 *
 * LEGACY FORMAT (streamText):
 * - `0:` - Text chunks (JSON strings)
 * - `2:` - Data parts (arrays of data)
 * - `8:` - Finish messages
 * - `e:` - Error messages
 * - `d:` - Done signals
 *
 * This parser handles both formats for compatibility.
 */
function parseAISDKStream(rawStream: string): {
    text: string;
    retrievedChunks: RetrievedChunk[];
} {
    let text = "";
    const retrievedChunks: RetrievedChunk[] = [];
    const lines = rawStream.split("\n");

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Skip SSE comments and [DONE] markers
        if (trimmedLine.startsWith(":") || trimmedLine === "[DONE]" || trimmedLine === "data: [DONE]") {
            continue;
        }

        // Handle SSE format: "data: {...}" or direct protocol format "0:..."
        let contentLine = trimmedLine;
        if (trimmedLine.startsWith("data:")) {
            contentLine = trimmedLine.substring(5).trim();

            // Skip empty data or [DONE]
            if (!contentLine || contentLine === "[DONE]") {
                continue;
            }

            // Try to parse as SSE JSON payload (new format)
            const sseResult = tryParseSSEPayload(contentLine, retrievedChunks);
            if (sseResult.handled) {
                if (sseResult.textDelta) {
                    text += sseResult.textDelta;
                }
                continue;
            }
        }

        // Parse legacy AI SDK protocol format: TYPE:DATA
        const colonIndex = contentLine.indexOf(":");
        if (colonIndex === -1) continue;

        const typeCode = contentLine.substring(0, colonIndex);
        const dataStr = contentLine.substring(colonIndex + 1);

        switch (typeCode) {
            case "0":
                // Text chunk (legacy format)
                text += parseTextChunk(dataStr);
                break;
            case "2":
                // Data parts (legacy format)
                parseDataParts(dataStr, retrievedChunks);
                break;
            default:
                // Types 8, e, d are finish/error/done signals - skip
                break;
        }
    }

    return { text, retrievedChunks };
}

/**
 * Call the chat API to get a response
 * This simulates a real user interacting with the system
 */
async function callChatAPI(
    sessionId: string,
    userMessage: string,
    options: {
        useAgenticMode?: boolean;
        retrievalStrategy?: "vector" | "keyword" | "hybrid";
        useReranker?: boolean;
        rerankerStrategy?: "ensemble" | "cross_encoder" | "llm" | "cohere";
    } = {}
): Promise<{
    response: string;
    retrievedChunks: Array<{
        chunkId: string;
        documentTitle: string;
        content: string;
        relevanceScore: number;
    }>;
    latencyMs: number;
}> {
    const {
        useAgenticMode = true,
        retrievalStrategy = "hybrid",
        useReranker = true,
        rerankerStrategy = "cross_encoder",
    } = options;
    const startTime = Date.now();

    try {
        // Call the chat API endpoint
        const response = await fetch("http://localhost:3000/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [{ id: generateId(), role: "user", content: userMessage }],
                sessionId,
                useAgenticMode,
                retrievalStrategy,
                useReranker,
                rerankerStrategy,
            }),
        });

        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }

        // Read the full stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let rawStream = "";

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                rawStream += decoder.decode(value, { stream: true });
            }
            // Final decode to flush any remaining bytes
            rawStream += decoder.decode();
        }

        // Parse the AI SDK stream format
        const { text, retrievedChunks } = parseAISDKStream(rawStream);

        const latencyMs = Date.now() - startTime;

        // Log for debugging if response is empty
        if (!text && rawStream.length > 0) {
            consola.debug(
                `[callChatAPI] Empty text extracted from stream. Raw stream length: ${rawStream.length}, first 500 chars: ${rawStream.substring(0, 500)}`
            );
        }

        return {
            response: text,
            retrievedChunks: retrievedChunks.map((chunk) => ({
                chunkId: chunk.chunkId,
                documentTitle: chunk.documentTitle,
                content: chunk.content,
                relevanceScore: chunk.similarity,
            })),
            latencyMs,
        };
    } catch (error) {
        consola.error("Error calling chat API:", error);
        const latencyMs = Date.now() - startTime;

        return {
            response: "Error: Failed to get response from system",
            retrievedChunks: [],
            latencyMs,
        };
    }
}

/**
 * Run a single conversation scenario
 */
export async function runConversationScenario(
    scenario: ConversationScenario,
    config: {
        useAgenticMode?: boolean;
        retrievalStrategy?: "vector" | "keyword" | "hybrid";
        useReranker?: boolean;
        rerankerStrategy?: "ensemble" | "cross_encoder" | "llm" | "cohere";
        maxTurns?: number;
        useTemplate?: boolean;
    } = {}
): Promise<SimulatedConversationResult> {
    const {
        useAgenticMode = true,
        retrievalStrategy = "hybrid",
        useReranker = true,
        rerankerStrategy = "cross_encoder",
        maxTurns = 10,
        useTemplate = true,
    } = config;

    // Create a new chat session
    const sessionId = crypto.randomUUID();
    await db.insert(chatSessions).values({
        id: sessionId,
        title: scenario.name,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
    const turns: ConversationTurnResult[] = [];
    let taskCompleted = false;
    let completionReason: "success" | "max_turns_reached" | "user_gave_up" | "error" = "max_turns_reached";

    consola.debug(`\n🎭 Starting scenario: ${scenario.name}`);
    consola.debug(`👤 Persona: ${scenario.persona.name}`);
    consola.debug(`🎯 Goal: ${scenario.initialGoal}\n`);

    // Run conversation turns
    for (let turnNumber = 1; turnNumber <= maxTurns; turnNumber++) {
        consola.debug(`\n--- Turn ${turnNumber} ---`);

        // Generate user message
        let userMessage: string;
        let isTemplatedTurn = false;

        if (useTemplate && scenario.conversationTemplate && scenario.conversationTemplate[turnNumber - 1]) {
            // Use predefined template
            const templateTurn = scenario.conversationTemplate[turnNumber - 1];
            userMessage = getUserMessageFromTemplate(templateTurn);
            isTemplatedTurn = true;
            consola.debug("📝 Using template message");
        } else {
            // Generate using LLM-as-a-User
            const simulatorConfig: UserSimulatorConfig = {
                model: "gpt-4.1-mini",
                temperature: 0.7,
                persona: scenario.persona,
                conversationHistory,
                currentGoal: scenario.initialGoal,
                satisfactionThreshold: 0.8,
            };

            const generated = await generateUserMessage(simulatorConfig);
            userMessage = generated.message;

            consola.debug(`🤖 Generated message (satisfaction: ${generated.reasoning})`);

            if (generated.taskComplete) {
                taskCompleted = true;
                completionReason = "success";
                consola.debug("✅ User satisfied, ending conversation");
                break;
            }
        }

        consola.debug(`👤 User: ${userMessage}`);

        // Call chat API with full configuration
        const apiResult = await callChatAPI(sessionId, userMessage, {
            useAgenticMode,
            retrievalStrategy,
            useReranker,
            rerankerStrategy,
        });
        consola.debug(`🤖 Assistant (${apiResult.latencyMs}ms): ${apiResult.response.substring(0, 100)}...`);

        // Add to history
        conversationHistory.push({ role: "user", content: userMessage });
        conversationHistory.push({ role: "assistant", content: apiResult.response });

        // Evaluate turn using BATCHED metrics (reduces 2 LLM calls to 1)
        const templateTurn = scenario.conversationTemplate?.[turnNumber - 1];
        const requiredContext = templateTurn?.requiredContext || [];

        const turnMetrics = await evaluateTurnMetricsBatched(
            userMessage,
            apiResult.response,
            conversationHistory.slice(0, -2), // Exclude current turn
            requiredContext
        );

        const coherenceScore = turnMetrics.coherence;
        const contextRetained = turnMetrics.contextRetained;

        // Check if intent was satisfied (simple check: response is not empty and not an error)
        const satisfiedIntent = apiResult.response.length > 20 && !apiResult.response.toLowerCase().includes("error");

        const turnResult: ConversationTurnResult = {
            turnNumber,
            userMessage,
            assistantResponse: apiResult.response,
            retrievedChunks: apiResult.retrievedChunks,
            latencyMs: apiResult.latencyMs,
            contextRetained,
            coherenceScore,
            satisfiedIntent,
            errors: apiResult.response.toLowerCase().includes("error") ? ["API error"] : undefined,
        };

        turns.push(turnResult);

        consola.debug(`📊 Coherence: ${coherenceScore.toFixed(2)}, Context: ${contextRetained ? "✓" : "✗"}`);

        // Check if we should continue
        if (!isTemplatedTurn) {
            const shouldContinue = await shouldContinueConversation(
                conversationHistory,
                scenario.initialGoal,
                maxTurns
            );

            if (!shouldContinue.shouldContinue) {
                taskCompleted = shouldContinue.goalAchievement >= 0.7;
                completionReason = taskCompleted ? "success" : "user_gave_up";
                consola.debug(`\n🏁 Conversation ended: ${shouldContinue.reason}`);
                break;
            }
        }

        // If using template and we've completed all template turns, we're done
        if (useTemplate && scenario.conversationTemplate && turnNumber >= scenario.conversationTemplate.length) {
            taskCompleted = true;
            completionReason = "success";
            consola.debug("\n✅ Template completed successfully");
            break;
        }
    }

    // Calculate metrics (synchronous - no LLM call needed)
    const metrics = calculateConversationMetrics(turns, scenario.successCriteria, taskCompleted);

    const result: SimulatedConversationResult = {
        scenarioId: scenario.id,
        sessionId,
        persona: scenario.persona,
        turns,
        metrics,
        taskCompleted,
        completionReason,
        timestamp: new Date(),
    };

    // Evaluate success criteria
    const criteriaEval = evaluateSuccessCriteria(result, scenario.successCriteria);

    consola.debug("\n📈 Final Metrics:");
    consola.debug(`   Task Completed: ${taskCompleted ? "✅" : "❌"}`);
    consola.debug(`   Turns: ${turns.length}`);
    consola.debug(`   Avg Coherence: ${metrics.averageCoherenceScore.toFixed(2)}`);
    consola.debug(`   Context Retention: ${(metrics.contextRetentionRate * 100).toFixed(0)}%`);
    consola.debug(`   Info Coverage: ${(metrics.informationCoverageRate * 100).toFixed(0)}%`);
    consola.debug(`   Success Criteria Met: ${criteriaEval.met ? "✅" : "❌"}`);

    return result;
}

/**
 * Run multiple conversation scenarios and aggregate results
 */
export async function runSimulatedUserTests(config: SimulatedUserTestConfig): Promise<SystemLevelMetrics> {
    const {
        scenarios,
        repetitionsPerScenario = 1,
        useAgenticMode = true,
        retrievalStrategy = "hybrid",
        useReranker = true,
        rerankerStrategy = "cross_encoder",
    } = config;

    consola.debug("\n🚀 Starting Simulated User Testing");
    consola.debug(`   Scenarios: ${scenarios.length}`);
    consola.debug(`   Repetitions per scenario: ${repetitionsPerScenario}`);
    consola.debug(`   Agentic mode: ${useAgenticMode ? "enabled" : "disabled"}\n`);

    const allResults: SimulatedConversationResult[] = [];

    for (const scenario of scenarios) {
        for (let rep = 0; rep < repetitionsPerScenario; rep++) {
            consola.debug(
                `\n${"=".repeat(80)}\nScenario ${scenarios.indexOf(scenario) + 1}/${scenarios.length}, Repetition ${rep + 1}/${repetitionsPerScenario}`
            );

            const result = await runConversationScenario(scenario, {
                useAgenticMode,
                retrievalStrategy,
                useReranker,
                rerankerStrategy,
                maxTurns: config.maxTurnsPerConversation || 10,
                useTemplate: true, // Use templates for predictable testing
            });

            allResults.push(result);
        }
    }

    // Aggregate metrics
    return aggregateSystemMetrics(allResults);
}

/**
 * Aggregate results into system-level metrics
 */
function aggregateSystemMetrics(results: SimulatedConversationResult[]): SystemLevelMetrics {
    if (results.length === 0) {
        throw new Error("No results to aggregate");
    }

    const successfulScenarios = results.filter((r) => r.taskCompleted).length;
    const totalScenarios = results.length;

    // Latency metrics
    const allLatencies = results.flatMap((r) => r.turns.map((t) => t.latencyMs));
    allLatencies.sort((a, b) => a - b);
    const averageLatencyMs = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
    const p95LatencyMs = allLatencies[Math.floor(allLatencies.length * 0.95)] || 0;
    const p99LatencyMs = allLatencies[Math.floor(allLatencies.length * 0.99)] || 0;

    // Quality metrics
    const avgCoherence = results.reduce((sum, r) => sum + r.metrics.averageCoherenceScore, 0) / results.length;
    const avgContextRetention = results.reduce((sum, r) => sum + r.metrics.contextRetentionRate, 0) / results.length;
    const avgInfoCoverage = results.reduce((sum, r) => sum + r.metrics.informationCoverageRate, 0) / results.length;

    // By persona
    const metricsByPersona = new Map();
    for (const result of results) {
        const personaId = result.persona.id;
        if (!metricsByPersona.has(personaId)) {
            metricsByPersona.set(personaId, []);
        }
        metricsByPersona.get(personaId).push(result.metrics);
    }

    // By category
    const metricsByCategory = new Map();
    // Would need scenario category info in results

    // Error analysis
    const totalErrors = results.reduce(
        (sum, r) => sum + r.turns.filter((t) => t.errors && t.errors.length > 0).length,
        0
    );

    // Build raw scenario results for detailed reporting
    const scenarioResults = results.map((r) => ({
        scenarioId: r.scenarioId,
        scenarioName: r.scenarioId, // Use ID as name for now; can enhance later
        taskCompleted: r.taskCompleted,
        coherenceScore: r.metrics.averageCoherenceScore,
        contextRetentionRate: r.metrics.contextRetentionRate,
        informationCoverageRate: r.metrics.informationCoverageRate,
        averageLatencyMs: r.metrics.averageLatencyMs,
        turnsToCompletion: r.metrics.turnsToCompletion,
    }));

    return {
        totalScenarios,
        successfulScenarios,
        overallTaskCompletionRate: successfulScenarios / totalScenarios,
        averageLatencyMs,
        p95LatencyMs,
        p99LatencyMs,
        averageCoherenceScore: avgCoherence,
        averageContextRetentionRate: avgContextRetention,
        averageInformationCoverageRate: avgInfoCoverage,
        metricsByPersona,
        metricsByCategory,
        totalErrors,
        errorsByType: new Map(),
        scenarioResults, // Add raw results for detailed reporting
    };
}
