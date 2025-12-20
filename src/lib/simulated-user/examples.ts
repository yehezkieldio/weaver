/**
 * @fileoverview Example Usage of Simulated User Testing Framework
 *
 * This file demonstrates how to use the simulated user testing framework
 * in different ways for various testing scenarios.
 */

import consola from "consola";
import { runConversationScenario, runSimulatedUserTests } from "@/lib/simulated-user/conversation-runner";
import { NEW_STUDENT_PERSONA } from "@/lib/simulated-user/personas";
import { ALL_SCENARIOS, KRS_REGISTRATION_SCENARIO } from "@/lib/simulated-user/scenarios";
import type { SimulatedUserTestConfig } from "@/lib/simulated-user/types";

/**
 * Example 1: Run a single conversation scenario
 */
export async function exampleSingleScenario() {
    consola.debug("Example 1: Running single scenario\n");

    const result = await runConversationScenario(KRS_REGISTRATION_SCENARIO, {
        useAgenticMode: true,
        maxTurns: 10,
        useTemplate: true,
    });

    consola.debug("Results:");
    consola.debug(`  Task Completed: ${result.taskCompleted}`);
    consola.debug(`  Turns: ${result.turns.length}`);
    consola.debug(`  Average Coherence: ${result.metrics.averageCoherenceScore.toFixed(2)}`);
    consola.debug(`  Context Retention: ${(result.metrics.contextRetentionRate * 100).toFixed(0)}%`);
    consola.debug(`  Average Latency: ${result.metrics.averageLatencyMs.toFixed(0)}ms`);

    return result;
}

/**
 * Example 2: Run quick test with subset of scenarios
 */
export async function exampleQuickTest() {
    consola.debug("Example 2: Running quick test (first 3 scenarios)\n");

    const config: SimulatedUserTestConfig = {
        scenarios: ALL_SCENARIOS.slice(0, 3),
        repetitionsPerScenario: 1,
        useAgenticMode: true,
        maxTurnsPerConversation: 10,
    };

    const metrics = await runSimulatedUserTests(config);

    consola.debug("Aggregate Results:");
    consola.debug(`  Task Completion Rate: ${(metrics.overallTaskCompletionRate * 100).toFixed(1)}%`);
    consola.debug(`  Successful: ${metrics.successfulScenarios}/${metrics.totalScenarios}`);
    consola.debug(`  Average Coherence: ${metrics.averageCoherenceScore.toFixed(2)}`);
    consola.debug(`  Average Latency: ${metrics.averageLatencyMs.toFixed(0)}ms`);
    consola.debug(`  P95 Latency: ${metrics.p95LatencyMs.toFixed(0)}ms`);

    return metrics;
}

/**
 * Example 3: Run full test suite with repetitions
 */
export async function exampleFullTestSuite() {
    consola.debug("Example 3: Running full test suite with repetitions\n");

    const config: SimulatedUserTestConfig = {
        scenarios: ALL_SCENARIOS,
        repetitionsPerScenario: 2, // Run each scenario twice
        useAgenticMode: true,
        retrievalStrategy: "hybrid",
        enableGuardrails: true,
        maxTurnsPerConversation: 10,
        saveDetailedLogs: true,
    };

    const metrics = await runSimulatedUserTests(config);

    // Print detailed results
    consola.debug("Full Test Results:");
    consola.debug(`  Total Scenarios: ${metrics.totalScenarios}`);
    consola.debug(`  Successful: ${metrics.successfulScenarios}`);
    consola.debug(`  Task Completion Rate: ${(metrics.overallTaskCompletionRate * 100).toFixed(1)}%`);
    consola.debug(`  Average Coherence: ${metrics.averageCoherenceScore.toFixed(2)}`);
    consola.debug(`  Context Retention: ${(metrics.averageContextRetentionRate * 100).toFixed(0)}%`);
    consola.debug(`  Info Coverage: ${(metrics.averageInformationCoverageRate * 100).toFixed(0)}%`);
    consola.debug(`  Average Latency: ${metrics.averageLatencyMs.toFixed(0)}ms`);
    consola.debug(`  P95 Latency: ${metrics.p95LatencyMs.toFixed(0)}ms`);
    consola.debug(`  P99 Latency: ${metrics.p99LatencyMs.toFixed(0)}ms`);
    consola.debug(`  Total Errors: ${metrics.totalErrors}`);

    return metrics;
}

/**
 * Example 4: Custom scenario testing
 */
export async function exampleCustomScenario() {
    consola.debug("Example 4: Running custom scenario\n");

    // You can also create custom scenarios on the fly
    const customScenario = {
        id: "custom-test",
        name: "Custom Test Scenario",
        description: "Testing a specific use case",
        persona: NEW_STUDENT_PERSONA,
        initialGoal: "Get specific information about library services",
        expectedTurnCount: 3,
        conversationTemplate: [
            {
                turnNumber: 1,
                userMessage: "Apa saja layanan yang ada di perpustakaan?",
                expectedIntent: "Get library services information",
                isFollowUp: false,
                expectedResponseType: "informational" as const,
            },
            {
                turnNumber: 2,
                userMessage: "Bagaimana cara meminjam buku?",
                expectedIntent: "Understand borrowing process",
                requiredContext: ["perpustakaan"],
                isFollowUp: true,
                expectedResponseType: "informational" as const,
            },
            {
                turnNumber: 3,
                userMessage: "Berapa lama masa peminjaman?",
                expectedIntent: "Know borrowing duration",
                requiredContext: ["perpustakaan", "pinjam"],
                isFollowUp: true,
                expectedResponseType: "informational" as const,
            },
        ],
        successCriteria: {
            mustContainKeywords: ["perpustakaan", "pinjam", "buku"],
            minimumCoherenceScore: 0.7,
            maximumTurns: 5,
        },
        category: "facilities_services" as const,
    };

    const result = await runConversationScenario(customScenario, {
        useAgenticMode: true,
        maxTurns: 10,
        useTemplate: true,
    });

    consola.debug("Custom Scenario Results:");
    consola.debug(`  Task Completed: ${result.taskCompleted}`);
    consola.debug(`  Metrics: ${JSON.stringify(result.metrics, null, 2)}`);

    return result;
}

/**
 * Example 5: Compare agentic vs non-agentic mode
 */
export async function exampleCompareAgenticMode() {
    consola.debug("Example 5: Comparing agentic vs non-agentic mode\n");

    const scenario = KRS_REGISTRATION_SCENARIO;

    // Run with agentic mode
    const agenticResult = await runConversationScenario(scenario, {
        useAgenticMode: true,
        maxTurns: 10,
    });

    // Run without agentic mode
    const standardResult = await runConversationScenario(scenario, {
        useAgenticMode: false,
        maxTurns: 10,
    });

    consola.debug("Comparison:");
    consola.debug("\nAgentic Mode:");
    consola.debug(`  Coherence: ${agenticResult.metrics.averageCoherenceScore.toFixed(2)}`);
    consola.debug(`  Latency: ${agenticResult.metrics.averageLatencyMs.toFixed(0)}ms`);

    consola.debug("\nStandard Mode:");
    consola.debug(`  Coherence: ${standardResult.metrics.averageCoherenceScore.toFixed(2)}`);
    consola.debug(`  Latency: ${standardResult.metrics.averageLatencyMs.toFixed(0)}ms`);

    return { agentic: agenticResult, standard: standardResult };
}

/**
 * Example 6: Generate report data for academic paper
 */
export async function exampleGenerateReportData() {
    consola.debug("Example 6: Generating data for academic paper\n");

    const config: SimulatedUserTestConfig = {
        scenarios: ALL_SCENARIOS,
        repetitionsPerScenario: 3, // More repetitions for statistical validity
        useAgenticMode: true,
        maxTurnsPerConversation: 10,
    };

    const metrics = await runSimulatedUserTests(config);

    // Format for paper inclusion
    const reportData = {
        systemLevelMetrics: {
            taskCompletionRate: `${(metrics.overallTaskCompletionRate * 100).toFixed(1)}%`,
            conversationCoherence: metrics.averageCoherenceScore.toFixed(2),
            contextRetention: `${(metrics.averageContextRetentionRate * 100).toFixed(0)}%`,
            informationCoverage: `${(metrics.averageInformationCoverageRate * 100).toFixed(0)}%`,
        },
        performanceMetrics: {
            averageLatency: `${metrics.averageLatencyMs.toFixed(0)}ms`,
            p95Latency: `${metrics.p95LatencyMs.toFixed(0)}ms`,
            p99Latency: `${metrics.p99LatencyMs.toFixed(0)}ms`,
        },
        successMetrics: {
            totalScenarios: metrics.totalScenarios,
            successfulScenarios: metrics.successfulScenarios,
            failedScenarios: metrics.totalScenarios - metrics.successfulScenarios,
        },
    };

    consola.debug("Report Data for Paper:");
    consola.debug(JSON.stringify(reportData, null, 2));

    return reportData;
}

// Export all examples
export const examples = {
    singleScenario: exampleSingleScenario,
    quickTest: exampleQuickTest,
    fullTestSuite: exampleFullTestSuite,
    customScenario: exampleCustomScenario,
    compareAgenticMode: exampleCompareAgenticMode,
    generateReportData: exampleGenerateReportData,
};

/**
 * Run all examples
 */
if (import.meta.main) {
    consola.debug("🚀 Running Simulated User Testing Examples\n");
    consola.debug("=".repeat(80));

    // Uncomment the example you want to run:

    // await exampleSingleScenario();
    // await exampleQuickTest();
    // await exampleFullTestSuite();
    // await exampleCustomScenario();
    // await exampleCompareAgenticMode();
    // await exampleGenerateReportData();

    consola.debug("\n✅ Examples completed!");
}
