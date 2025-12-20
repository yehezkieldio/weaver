/**
 * @fileoverview Type definitions for Simulated User Testing Framework
 *
 * WHY Simulated User Testing:
 * - Bridges the gap between component-level evaluation (RAGAS) and system-level validation
 * - Tests the complete implementation: UI → API → RAG → Response
 * - Evaluates conversation quality, context retention, and multi-turn coherence
 * - Provides evidence for "Implementasi" claim in paper title
 * - Uses LLM-as-a-User approach (similar to LLM-as-a-Judge) for scalable testing
 *
 * This framework complements (not replaces) existing RAGAS evaluation by adding:
 * - Multi-turn conversation testing
 * - Task completion rate measurement
 * - Context retention across turns
 * - Conversation coherence evaluation
 * - System-level integration validation
 */

/**
 * User persona representing different types of university stakeholders
 *
 * Personas are based on actual corpus content and use cases:
 * - New Student: Needs basic info about registration, KRS, facilities
 * - Senior Student: Asks about thesis, graduation requirements, cuti akademik
 * - Faculty: Inquiries about curriculum, academic calendar, regulations
 * - Staff: Administrative procedures, organizational structure
 * - Prospective Student: Admission process, programs, fees
 */
export interface UserPersona {
    id: string;
    name: string;
    description: string;
    background: string;
    goals: string[];
    knowledgeLevel: "novice" | "intermediate" | "expert";
    communicationStyle: "formal" | "casual" | "mixed";
    language: "id" | "en";
    typicalQuestions: string[];
}

/**
 * Conversation scenario for testing multi-turn interactions
 *
 * Each scenario represents a realistic task that a user might complete:
 * - Sequential questions building on previous context
 * - Follow-up clarifications
 * - Complex information-seeking tasks requiring multiple steps
 */
export interface ConversationScenario {
    id: string;
    name: string;
    description: string;
    persona: UserPersona;
    initialGoal: string;
    expectedTurnCount: number;
    conversationTemplate?: ConversationTurn[];
    successCriteria: SuccessCriteria;
    category:
        | "academic_regulations"
        | "administrative_procedures"
        | "student_services"
        | "faculty_programs"
        | "facilities_services"
        | "financial_procedures"
        | "admissions_registration"
        | "general_university_info";
}

/**
 * Individual turn in a multi-turn conversation
 */
export interface ConversationTurn {
    turnNumber: number;
    userMessage: string;
    expectedIntent: string;
    requiredContext?: string[]; // Context that should be retained from previous turns
    isFollowUp: boolean;
    expectedResponseType: "informational" | "clarification" | "confirmation" | "summary";
}

/**
 * Criteria for determining task completion success
 */
export interface SuccessCriteria {
    mustContainKeywords?: string[]; // Keywords that must appear in responses
    mustRetainContext?: string[]; // Context from earlier turns that must persist
    minimumCoherenceScore?: number; // 0-1
    maximumTurns?: number; // Task should complete within N turns
    requiredInformationCoverage?: string[]; // Topics that must be addressed
    acceptableLatencyMs?: number; // Maximum acceptable latency per turn
}

/**
 * Results from a single simulated conversation
 */
export interface SimulatedConversationResult {
    scenarioId: string;
    sessionId: string;
    persona: UserPersona;
    turns: ConversationTurnResult[];
    metrics: ConversationMetrics;
    taskCompleted: boolean;
    completionReason: "success" | "max_turns_reached" | "user_gave_up" | "error";
    timestamp: Date;
}

/**
 * Result for a single conversation turn
 */
export interface ConversationTurnResult {
    turnNumber: number;
    userMessage: string;
    assistantResponse: string;
    retrievedChunks?: Array<{
        chunkId: string;
        documentTitle: string;
        content: string;
        relevanceScore: number;
    }>;
    latencyMs: number;
    contextRetained: boolean;
    coherenceScore: number;
    satisfiedIntent: boolean;
    errors?: string[];
}

/**
 * Metrics for evaluating conversation quality
 *
 * System-Level Metrics (not captured by component-level RAGAS):
 * - Conversation coherence across multiple turns
 * - Context retention and memory
 * - Task completion rate
 * - User satisfaction (simulated)
 * - Time to task completion
 */
export interface ConversationMetrics {
    // Task Completion Metrics
    taskCompletionRate: number; // 0-1
    turnsToCompletion: number;
    averageLatencyMs: number;
    totalLatencyMs: number;

    // Conversation Quality Metrics
    averageCoherenceScore: number; // 0-1
    contextRetentionRate: number; // % of required context retained
    followUpHandlingScore: number; // 0-1, how well system handles clarifications

    // Information Coverage
    informationCoverageRate: number; // % of required info provided
    citationQuality: number; // 0-1, average quality of citations

    // User Experience (Simulated)
    perceivedUsability: number; // 0-1, simulated satisfaction
    errorRate: number; // % of turns with errors
    clarificationNeedRate: number; // % of turns requiring clarification
}

/**
 * Aggregate metrics across multiple conversation scenarios
 */
export interface SystemLevelMetrics {
    totalScenarios: number;
    successfulScenarios: number;
    overallTaskCompletionRate: number;

    // Performance
    averageLatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;

    // Quality Metrics (System-Level)
    averageCoherenceScore: number;
    averageContextRetentionRate: number;
    averageInformationCoverageRate: number;

    // By Persona
    metricsByPersona: Map<string, ConversationMetrics>;

    // By Category
    metricsByCategory: Map<string, ConversationMetrics>;

    // Error Analysis
    totalErrors: number;
    errorsByType: Map<string, number>;

    // Comparison with Component-Level
    componentVsSystemComparison?: {
        ragasFaithfulness: number;
        conversationCoherence: number;
        ragasRelevancy: number;
        taskCompletionRate: number;
    };
}

/**
 * Configuration for running simulated user tests
 */
export interface SimulatedUserTestConfig {
    scenarios: ConversationScenario[];
    repetitionsPerScenario?: number; // Run each scenario N times for statistical validity
    useAgenticMode?: boolean;
    retrievalStrategy?: "vector" | "keyword" | "hybrid";
    enableGuardrails?: boolean;
    maxTurnsPerConversation?: number;
    randomizationSeed?: number; // For reproducible test runs
    saveDetailedLogs?: boolean;
}

/**
 * LLM-as-a-User simulator configuration
 */
export interface UserSimulatorConfig {
    model: string; // LLM model to use for simulating user behavior
    temperature: number; // Higher = more varied user behavior
    persona: UserPersona;
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
    currentGoal: string;
    satisfactionThreshold: number; // When to consider task complete
}
