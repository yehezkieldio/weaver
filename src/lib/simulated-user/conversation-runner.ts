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
import { db } from "@/lib/db";
import { chatSessions } from "@/lib/db/schema";
import {
    calculateConversationMetrics,
    evaluateCoherence,
    evaluateContextRetention,
    evaluateContextRetentionLLM,
    evaluateSuccessCriteria,
} from "./evaluator";
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
 * Call the chat API to get a response
 * This simulates a real user interacting with the system
 */
async function callChatAPI(
    sessionId: string,
    userMessage: string,
    useAgenticMode = true
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
                retrievalStrategy: "hybrid",
                useReranker: true,
            }),
        });

        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }

        // For streaming responses, we need to read the full stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";
        const retrievedChunks: Array<{
            chunkId: string;
            documentTitle: string;
            content: string;
            similarity: number;
            retrievalMethod?: "vector" | "keyword" | "hybrid";
        }> = [];

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n").filter((line) => line.trim().startsWith("0:"));

                for (const line of lines) {
                    try {
                        const jsonStr = line.substring(2); // Remove "0:" prefix
                        const data = JSON.parse(jsonStr);

                        if (data.type === "text") {
                            fullResponse += data.value;
                        } else if (data.type === "retrieved-chunk-data") {
                            retrievedChunks.push(data);
                        }
                    } catch (e) {
                        // Skip unparseable lines
                    }
                }
            }
        }

        const latencyMs = Date.now() - startTime;

        return {
            response: fullResponse,
            retrievedChunks: retrievedChunks.map((chunk) => ({
                chunkId: chunk.chunkId || "",
                documentTitle: chunk.documentTitle || "",
                content: chunk.content || "",
                relevanceScore: chunk.similarity || 0,
            })),
            latencyMs,
        };
    } catch (error) {
        console.error("Error calling chat API:", error);
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
        maxTurns?: number;
        useTemplate?: boolean;
    } = {}
): Promise<SimulatedConversationResult> {
    const { useAgenticMode = true, maxTurns = 10, useTemplate = true } = config;

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

    console.log(`\n🎭 Starting scenario: ${scenario.name}`);
    console.log(`👤 Persona: ${scenario.persona.name}`);
    console.log(`🎯 Goal: ${scenario.initialGoal}\n`);

    // Run conversation turns
    for (let turnNumber = 1; turnNumber <= maxTurns; turnNumber++) {
        console.log(`\n--- Turn ${turnNumber} ---`);

        // Generate user message
        let userMessage: string;
        let isTemplatedTurn = false;

        if (useTemplate && scenario.conversationTemplate && scenario.conversationTemplate[turnNumber - 1]) {
            // Use predefined template
            const templateTurn = scenario.conversationTemplate[turnNumber - 1];
            userMessage = getUserMessageFromTemplate(templateTurn);
            isTemplatedTurn = true;
            console.log("📝 Using template message");
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

            console.log(`🤖 Generated message (satisfaction: ${generated.reasoning})`);

            if (generated.taskComplete) {
                taskCompleted = true;
                completionReason = "success";
                console.log("✅ User satisfied, ending conversation");
                break;
            }
        }

        console.log(`👤 User: ${userMessage}`);

        // Call chat API
        const apiResult = await callChatAPI(sessionId, userMessage, useAgenticMode);
        console.log(`🤖 Assistant (${apiResult.latencyMs}ms): ${apiResult.response.substring(0, 100)}...`);

        // Add to history
        conversationHistory.push({ role: "user", content: userMessage });
        conversationHistory.push({ role: "assistant", content: apiResult.response });

        // Evaluate turn
        const coherenceScore = await evaluateCoherence(
            userMessage,
            apiResult.response,
            conversationHistory.slice(0, -2)
        );

        const templateTurn = scenario.conversationTemplate?.[turnNumber - 1];
        const requiredContext = templateTurn?.requiredContext || [];

        // Use LLM-based context retention evaluation for better semantic matching
        // Fall back to keyword-based if LLM fails
        let contextRetained: boolean;
        try {
            contextRetained = await evaluateContextRetentionLLM(
                apiResult.response,
                requiredContext,
                conversationHistory.slice(0, -2) // Exclude current turn
            );
        } catch (error) {
            console.warn("LLM context retention failed, using keyword fallback:", error);
            contextRetained = evaluateContextRetention(apiResult.response, requiredContext);
        }

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

        console.log(`📊 Coherence: ${coherenceScore.toFixed(2)}, Context: ${contextRetained ? "✓" : "✗"}`);

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
                console.log(`\n🏁 Conversation ended: ${shouldContinue.reason}`);
                break;
            }
        }

        // If using template and we've completed all template turns, we're done
        if (useTemplate && scenario.conversationTemplate && turnNumber >= scenario.conversationTemplate.length) {
            taskCompleted = true;
            completionReason = "success";
            console.log("\n✅ Template completed successfully");
            break;
        }
    }

    // Calculate metrics
    const metrics = await calculateConversationMetrics(turns, scenario.successCriteria, taskCompleted);

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

    console.log("\n📈 Final Metrics:");
    console.log(`   Task Completed: ${taskCompleted ? "✅" : "❌"}`);
    console.log(`   Turns: ${turns.length}`);
    console.log(`   Avg Coherence: ${metrics.averageCoherenceScore.toFixed(2)}`);
    console.log(`   Context Retention: ${(metrics.contextRetentionRate * 100).toFixed(0)}%`);
    console.log(`   Info Coverage: ${(metrics.informationCoverageRate * 100).toFixed(0)}%`);
    console.log(`   Success Criteria Met: ${criteriaEval.met ? "✅" : "❌"}`);

    return result;
}

/**
 * Run multiple conversation scenarios and aggregate results
 */
export async function runSimulatedUserTests(config: SimulatedUserTestConfig): Promise<SystemLevelMetrics> {
    const { scenarios, repetitionsPerScenario = 1, useAgenticMode = true } = config;

    console.log("\n🚀 Starting Simulated User Testing");
    console.log(`   Scenarios: ${scenarios.length}`);
    console.log(`   Repetitions per scenario: ${repetitionsPerScenario}`);
    console.log(`   Agentic mode: ${useAgenticMode ? "enabled" : "disabled"}\n`);

    const allResults: SimulatedConversationResult[] = [];

    for (const scenario of scenarios) {
        for (let rep = 0; rep < repetitionsPerScenario; rep++) {
            console.log(
                `\n${"=".repeat(80)}\nScenario ${scenarios.indexOf(scenario) + 1}/${scenarios.length}, Repetition ${rep + 1}/${repetitionsPerScenario}`
            );

            const result = await runConversationScenario(scenario, {
                useAgenticMode,
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
    };
}
