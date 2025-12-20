/**
 * @fileoverview Conversation Quality Evaluator
 *
 * WHY These Metrics:
 * - Coherence: Does the conversation flow naturally?
 * - Context Retention: Does the system remember previous turns?
 * - Task Completion: Did the user achieve their goal?
 * - Information Coverage: Was all necessary information provided?
 *
 * These are SYSTEM-LEVEL metrics that complement component-level RAGAS metrics.
 * RAGAS measures: faithfulness, relevancy of individual Q&A pairs
 * This measures: conversation quality, multi-turn coherence, task success
 */

import { generateText } from "ai";
import consola from "consola";
import { JUDGE_MODEL } from "@/lib/ai";
import type {
    ConversationMetrics,
    ConversationTurnResult,
    SimulatedConversationResult,
    SuccessCriteria,
} from "./types";

// Define regex patterns at top level to avoid performance issues
const JSON_MATCH_REGEX = /\{[\s\S]*\}/;

// ============================================================================
// BATCHED TURN METRICS CALCULATION
// ============================================================================
// These functions batch multiple metrics into single LLM calls to reduce
// API overhead by ~70%. Combines coherence and context retention evaluation.

/**
 * Batched Turn Metrics Calculation
 *
 * WHY BATCH: Previously 2 separate LLM calls for coherence and context retention.
 * Now 1 call returns both metrics in a single JSON response.
 *
 * Metrics included:
 * - coherence: How well does the response connect to the conversation flow? (0-1)
 * - contextRetained: Does the response demonstrate awareness of required context? (boolean)
 * - reasoning: Brief explanation of the evaluation
 */
export interface TurnMetrics {
    coherence: number;
    contextRetained: boolean;
    reasoning: string;
}

export async function evaluateTurnMetricsBatched(
    userMessage: string,
    assistantResponse: string,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
    requiredContext: string[]
): Promise<TurnMetrics> {
    const defaultMetrics: TurnMetrics = {
        coherence: 0.5,
        contextRetained: true,
        reasoning: "Default fallback evaluation",
    };

    const historyText = conversationHistory
        .slice(-6) // Last 3 turns for context
        .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
        .join("\n");

    const contextRequirements =
        requiredContext.length > 0
            ? `**Required Context Topics:**\n${requiredContext.map((ctx) => `- ${ctx}`).join("\n")}`
            : "**Required Context Topics:** (None specified)";

    try {
        const { text } = await generateText({
            model: JUDGE_MODEL,
            temperature: 0.1,
            prompt: `Evaluate this conversation turn for coherence and context retention.

**Recent Conversation History:**
${historyText || "(No prior history)"}

**Current Turn:**
User: ${userMessage}
Assistant: ${assistantResponse}

${contextRequirements}

**EVALUATION TASK:**
Evaluate TWO metrics:

1. **coherence** (0.0-1.0): How well does the assistant's response:
   - Address the user's message directly?
   - Maintain context from previous turns?
   - Flow logically in the conversation?
   - Avoid unnecessary repetition?
   Scoring: 1.0=Perfect flow, 0.7-0.9=Good with minor issues, 0.4-0.6=Moderate disconnection, 0.0-0.3=Poor fit

2. **contextRetained** (true/false): Does the response demonstrate awareness of the required context topics?
   - The response doesn't need exact keywords, but should semantically relate to or build upon them
   - Return true if at least 50% of required context is acknowledged

**OUTPUT FORMAT (JSON ONLY):**
{"coherence": 0.0-1.0, "contextRetained": true/false, "reasoning": "Brief explanation"}`,
            maxOutputTokens: 200,
        });

        const jsonMatch = text.match(JSON_MATCH_REGEX);
        if (!jsonMatch) {
            consola.warn("[evaluateTurnMetricsBatched] Could not parse JSON, using defaults");
            return defaultMetrics;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            coherence: Math.max(0, Math.min(1, Number(parsed.coherence) || 0.5)),
            contextRetained: Boolean(parsed.contextRetained),
            reasoning: String(parsed.reasoning || ""),
        };
    } catch (error) {
        consola.error("[evaluateTurnMetricsBatched] Error:", error);
        // Fallback to individual evaluations
        const coherence = await evaluateCoherence(userMessage, assistantResponse, conversationHistory);
        const contextRetained = evaluateContextRetention(assistantResponse, requiredContext);
        return { coherence, contextRetained, reasoning: "Fallback to individual metrics" };
    }
}

/**
 * Evaluate coherence of a conversation turn
 *
 * Coherence = how well the response connects to the user's message and conversation history
 */
export async function evaluateCoherence(
    userMessage: string,
    assistantResponse: string,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<number> {
    const historyText = conversationHistory
        .slice(-4) // Last 2 turns for context
        .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
        .join("\n");

    const prompt = `Evaluate the coherence of this conversation turn.

**Recent History**:
${historyText || "(No history)"}

**Current Turn**:
User: ${userMessage}
Assistant: ${assistantResponse}

**Evaluation Criteria**:
1. Does the assistant's response address the user's message?
2. Does the response maintain context from previous turns?
3. Is the response logically connected to the conversation flow?
4. Does the response avoid repeating information unnecessarily?

**Output**: A coherence score from 0.0 to 1.0, where:
- 1.0 = Perfect coherence, natural conversation flow
- 0.7-0.9 = Good coherence, minor issues
- 0.4-0.6 = Moderate coherence, some disconnection
- 0.0-0.3 = Poor coherence, response doesn't fit context

Output only the numerical score (e.g., 0.85):`;

    try {
        const { text } = await generateText({
            model: JUDGE_MODEL,
            temperature: 0.1,
            prompt,
        });

        const score = Number.parseFloat(text.trim());
        return Number.isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (error) {
        consola.error("Error evaluating coherence:", error);
        return 0.5; // Default moderate score on error
    }
}

/**
 * Check if required context from previous turns is retained (keyword-based, fast fallback)
 */
export function evaluateContextRetention(assistantResponse: string, requiredContext: string[]): boolean {
    if (!requiredContext || requiredContext.length === 0) {
        return true; // No context required
    }

    const responseLower = assistantResponse.toLowerCase();
    const retainedCount = requiredContext.filter((ctx) => responseLower.includes(ctx.toLowerCase())).length;

    // At least 50% of required context should be referenced
    return retainedCount >= Math.ceil(requiredContext.length * 0.5);
}

/**
 * Check if required context from previous turns is retained using LLM-based semantic evaluation
 *
 * This approach understands semantic similarity rather than exact keyword matching.
 * For example, "prosedur pengisian KRS" will match responses that explain "cara mengisi KRS"
 * or "langkah-langkah registrasi mata kuliah".
 */
export async function evaluateContextRetentionLLM(
    assistantResponse: string,
    requiredContext: string[],
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<boolean> {
    if (!requiredContext || requiredContext.length === 0) {
        return true; // No context required
    }

    const historyText = conversationHistory
        .slice(-6) // Last 3 turns for context
        .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
        .join("\n");

    const prompt = `Evaluate if the assistant's response demonstrates awareness and retention of required context topics.

**Required Context Topics**:
${requiredContext.map((ctx) => `- ${ctx}`).join("\n")}

**Recent Conversation History**:
${historyText || "(No history)"}

**Current Assistant Response**:
${assistantResponse}

**Evaluation Task**:
Does the assistant's response show awareness of the required context topics?
The response doesn't need to contain exact keywords, but should semantically relate to or acknowledge these topics.

**Criteria**:
- Does the response build upon or reference previous conversation context?
- Does it maintain continuity with the discussed topics?
- Would a user feel the assistant "remembers" what was discussed?

**Output**: Answer with only "true" if at least 50% of required context is semantically retained, or "false" otherwise.`;

    try {
        const { text } = await generateText({
            model: JUDGE_MODEL,
            temperature: 0.1,
            prompt,
        });

        const result = text.trim().toLowerCase();
        return result === "true" || result.includes("true");
    } catch (error) {
        consola.error("Error in LLM context retention evaluation, falling back to keyword-based:", error);
        // Fallback to keyword-based evaluation
        return evaluateContextRetention(assistantResponse, requiredContext);
    }
}

/**
 * Evaluate if success criteria are met
 */
export function evaluateSuccessCriteria(
    conversationResult: SimulatedConversationResult,
    criteria: SuccessCriteria
): {
    met: boolean;
    details: {
        keywordsCovered: boolean;
        contextRetained: boolean;
        coherenceAcceptable: boolean;
        turnsAcceptable: boolean;
        informationCovered: boolean;
        latencyAcceptable: boolean;
    };
} {
    const allResponses = conversationResult.turns
        .map((t) => t.assistantResponse)
        .join(" ")
        .toLowerCase();

    // Check keywords
    const keywordsCovered =
        !criteria.mustContainKeywords ||
        criteria.mustContainKeywords.every((kw) => allResponses.includes(kw.toLowerCase()));

    // Check context retention
    const contextRetentionResults = conversationResult.turns.map((t) => t.contextRetained);
    const contextRetained =
        contextRetentionResults.length === 0 ||
        contextRetentionResults.filter((r) => r).length / contextRetentionResults.length >= 0.7;

    // Check coherence
    const avgCoherence = conversationResult.metrics.averageCoherenceScore;
    const coherenceAcceptable = !criteria.minimumCoherenceScore || avgCoherence >= criteria.minimumCoherenceScore;

    // Check turn count
    const turnsAcceptable = !criteria.maximumTurns || conversationResult.turns.length <= criteria.maximumTurns;

    // Check information coverage (keyword-based approximation)
    const informationCovered =
        !criteria.requiredInformationCoverage ||
        criteria.requiredInformationCoverage.every((info) => allResponses.includes(info.toLowerCase()));

    // Check latency
    const avgLatency = conversationResult.metrics.averageLatencyMs;
    const latencyAcceptable = !criteria.acceptableLatencyMs || avgLatency <= criteria.acceptableLatencyMs;

    const met =
        keywordsCovered &&
        contextRetained &&
        coherenceAcceptable &&
        turnsAcceptable &&
        informationCovered &&
        latencyAcceptable;

    return {
        met,
        details: {
            keywordsCovered,
            contextRetained,
            coherenceAcceptable,
            turnsAcceptable,
            informationCovered,
            latencyAcceptable,
        },
    };
}

/**
 * Calculate overall conversation metrics
 * Uses LLM-based semantic evaluation for information coverage
 */
export async function calculateConversationMetrics(
    turns: ConversationTurnResult[],
    criteria: SuccessCriteria,
    taskCompleted: boolean
): Promise<ConversationMetrics> {
    if (turns.length === 0) {
        return {
            taskCompletionRate: 0,
            turnsToCompletion: 0,
            averageLatencyMs: 0,
            totalLatencyMs: 0,
            averageCoherenceScore: 0,
            contextRetentionRate: 0,
            followUpHandlingScore: 0,
            informationCoverageRate: 0,
            citationQuality: 0,
            perceivedUsability: 0,
            errorRate: 0,
            clarificationNeedRate: 0,
        };
    }

    // Latency metrics
    const latencies = turns.map((t) => t.latencyMs);
    const totalLatencyMs = latencies.reduce((a, b) => a + b, 0);
    const averageLatencyMs = totalLatencyMs / latencies.length;

    // Coherence
    const coherenceScores = turns.map((t) => t.coherenceScore);
    const averageCoherenceScore = coherenceScores.reduce((a, b) => a + b, 0) / coherenceScores.length;

    // Context retention
    const contextRetentionCount = turns.filter((t) => t.contextRetained).length;
    const contextRetentionRate = contextRetentionCount / turns.length;

    // Follow-up handling (turns 2+)
    const followUpTurns = turns.slice(1);
    const followUpHandlingScore =
        followUpTurns.length > 0 ? followUpTurns.filter((t) => t.satisfiedIntent).length / followUpTurns.length : 1.0;

    // Information coverage using LLM-based semantic evaluation
    let informationCoverageRate = 0;
    if (criteria.requiredInformationCoverage && criteria.requiredInformationCoverage.length > 0) {
        // Build conversation history for evaluation
        const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = turns.flatMap((t) => [
            { role: "user" as const, content: t.userMessage },
            { role: "assistant" as const, content: t.assistantResponse },
        ]);

        try {
            const coverageResult = await evaluateInformationCoverage(
                conversationHistory,
                criteria.requiredInformationCoverage
            );
            informationCoverageRate = coverageResult.score;
        } catch (error) {
            consola.error("Error in LLM information coverage, falling back to keyword-based:", error);
            // Fallback to keyword-based evaluation
            const allResponses = turns
                .map((t) => t.assistantResponse)
                .join(" ")
                .toLowerCase();
            const coveredInfo = criteria.requiredInformationCoverage.filter((info) =>
                allResponses.includes(info.toLowerCase())
            ).length;
            informationCoverageRate = coveredInfo / criteria.requiredInformationCoverage.length;
        }
    } else {
        informationCoverageRate = 1.0; // No required coverage, consider it complete
    }

    // Citation quality (percentage of turns with citations)
    const turnsWithCitations = turns.filter((t) => t.retrievedChunks && t.retrievedChunks.length > 0).length;
    const citationQuality = turnsWithCitations / turns.length;

    // Error rate
    const turnsWithErrors = turns.filter((t) => t.errors && t.errors.length > 0).length;
    const errorRate = turnsWithErrors / turns.length;

    // Clarification need (estimate: low coherence or unsatisfied intent)
    const clarificationNeeded = turns.filter((t) => t.coherenceScore < 0.6 || !t.satisfiedIntent).length;
    const clarificationNeedRate = clarificationNeeded / turns.length;

    // Perceived usability (composite of coherence, latency, errors)
    const latencyScore = Math.max(0, 1 - (averageLatencyMs - 1000) / 4000); // 1.0 at <1s, 0.0 at >5s
    const errorScore = 1 - errorRate;
    const perceivedUsability = (averageCoherenceScore + latencyScore + errorScore) / 3;

    return {
        taskCompletionRate: taskCompleted ? 1.0 : 0.0,
        turnsToCompletion: taskCompleted ? turns.length : 0,
        averageLatencyMs,
        totalLatencyMs,
        averageCoherenceScore,
        contextRetentionRate,
        followUpHandlingScore,
        informationCoverageRate,
        citationQuality,
        perceivedUsability,
        errorRate,
        clarificationNeedRate,
    };
}

/**
 * Evaluate information coverage using LLM
 */
export async function evaluateInformationCoverage(
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
    requiredInformation: string[]
): Promise<{
    score: number;
    coveredTopics: string[];
    missingTopics: string[];
}> {
    const historyText = conversationHistory
        .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
        .join("\n");

    const prompt = `Evaluate if the following conversation covered all required information.

**Required Information**:
${requiredInformation.map((info) => `- ${info}`).join("\n")}

**Conversation**:
${historyText}

**Question**: Which required information topics were covered?

**Output Format** (JSON):
{
  "coveredTopics": ["topic1", "topic2", ...],
  "missingTopics": ["topic3", ...],
  "coverageScore": 0.0 to 1.0
}`;

    try {
        const { text } = await generateText({
            model: JUDGE_MODEL,
            temperature: 0.1,
            prompt,
        });

        const jsonMatch = text.match(JSON_MATCH_REGEX);
        if (!jsonMatch) {
            throw new Error("Failed to parse JSON");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            score: parsed.coverageScore || 0,
            coveredTopics: parsed.coveredTopics || [],
            missingTopics: parsed.missingTopics || requiredInformation,
        };
    } catch (error) {
        consola.error("Error evaluating information coverage:", error);
        return {
            score: 0.5,
            coveredTopics: [],
            missingTopics: requiredInformation,
        };
    }
}
