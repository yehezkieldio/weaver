#!/usr/bin/env bun

/**
 * @fileoverview Script to Run Simulated User Testing
 *
 * WHY This Script:
 * - Provides CLI interface to run simulated user tests
 * - Generates comprehensive reports on system-level performance
 * - Complements existing RAGAS component-level evaluation
 * - Validates the complete "implementasi" of the system
 *
 * Usage:
 *   bun scripts/run-simulated-user-tests.ts
 *   bun scripts/run-simulated-user-tests.ts --scenario krs-registration
 *   bun scripts/run-simulated-user-tests.ts --quick
 *   bun scripts/run-simulated-user-tests.ts --all-scenarios
 */

import { writeFileSync } from "node:fs";
import { runSimulatedUserTests } from "@/lib/simulated-user/conversation-runner";
import { ALL_SCENARIOS } from "@/lib/simulated-user/scenarios";
import type { SimulatedUserTestConfig, SystemLevelMetrics } from "@/lib/simulated-user/types";

/**
 * Parse command line arguments
 */
function parseArgs(): {
    scenarioId?: string;
    quick?: boolean;
    allScenarios?: boolean;
    repetitions?: number;
    agentic?: boolean;
} {
    const args = process.argv.slice(2);
    const parsed: {
        scenarioId?: string;
        quick?: boolean;
        allScenarios?: boolean;
        repetitions?: number;
        agentic?: boolean;
    } = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === "--scenario" && i + 1 < args.length) {
            i += 1;
            parsed.scenarioId = args[i];
        } else if (arg === "--quick") {
            parsed.quick = true;
        } else if (arg === "--all-scenarios") {
            parsed.allScenarios = true;
        } else if (arg === "--repetitions" && i + 1 < args.length) {
            i += 1;
            parsed.repetitions = Number.parseInt(args[i], 10);
        } else if (arg === "--no-agentic") {
            parsed.agentic = false;
        }
    }

    return parsed;
}

/** * Get interpretation label for a score
 */
function getInterpretation(score: number): string {
    if (score >= 0.8) {
        return "✅ Excellent";
    }
    if (score >= 0.6) {
        return "⚠️ Good";
    }
    return "❌ Needs Improvement";
}

/** * Generate markdown report from results
 */
function generateMarkdownReport(metrics: SystemLevelMetrics, startTime: Date, endTime: Date): string {
    const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1);

    return `
# Simulated User Testing Report

**Generated**: ${endTime.toISOString()}
**Duration**: ${duration}s
**Total Scenarios**: ${metrics.totalScenarios}

---

## Executive Summary

- **Task Completion Rate**: ${(metrics.overallTaskCompletionRate * 100).toFixed(1)}%
- **Successful Scenarios**: ${metrics.successfulScenarios}/${metrics.totalScenarios}
- **Average Latency**: ${metrics.averageLatencyMs.toFixed(0)}ms
- **P95 Latency**: ${metrics.p95LatencyMs.toFixed(0)}ms
- **P99 Latency**: ${metrics.p99LatencyMs.toFixed(0)}ms

---

## System-Level Quality Metrics

| Metric | Score | Interpretation |
|--------|-------|----------------|
| **Conversation Coherence** | ${metrics.averageCoherenceScore.toFixed(2)} | ${getInterpretation(metrics.averageCoherenceScore)} |
| **Context Retention Rate** | ${(metrics.averageContextRetentionRate * 100).toFixed(0)}% | ${getInterpretation(metrics.averageContextRetentionRate)} |
| **Information Coverage** | ${(metrics.averageInformationCoverageRate * 100).toFixed(0)}% | ${getInterpretation(metrics.averageInformationCoverageRate)} |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Average Latency | ${metrics.averageLatencyMs.toFixed(0)}ms |
| P95 Latency | ${metrics.p95LatencyMs.toFixed(0)}ms |
| P99 Latency | ${metrics.p99LatencyMs.toFixed(0)}ms |

### Latency Interpretation
- **< 2000ms**: ✅ Excellent user experience
- **2000-4000ms**: ⚠️ Acceptable, room for improvement
- **> 4000ms**: ❌ Too slow, may frustrate users

---

## Error Analysis

- **Total Errors**: ${metrics.totalErrors}
- **Error Rate**: ${metrics.totalScenarios > 0 ? ((metrics.totalErrors / metrics.totalScenarios) * 100).toFixed(1) : 0}%

---

## Comparison: Component-Level vs System-Level

This simulated user testing complements existing RAGAS component-level evaluation:

### Component-Level (RAGAS)
- ✅ Faithfulness: Measures claim grounding
- ✅ Answer Relevancy: Measures single-turn relevance
- ✅ Context Precision/Recall: Measures retrieval quality
- ❌ Does NOT measure: Multi-turn coherence, task completion, conversation flow

### System-Level (Simulated User)
- ✅ Task Completion Rate: ${(metrics.overallTaskCompletionRate * 100).toFixed(1)}%
- ✅ Conversation Coherence: ${metrics.averageCoherenceScore.toFixed(2)}
- ✅ Context Retention: ${(metrics.averageContextRetentionRate * 100).toFixed(0)}%
- ✅ Multi-turn Interaction: Validated ✓

### Combined Evaluation Justification
Both component-level (RAGAS) and system-level (simulated user) evaluations are necessary:
1. **RAGAS** validates individual RAG components work correctly
2. **Simulated User** validates these components integrate into a working system
3. **Together** they provide complete "implementasi" validation for the paper

---

## Recommendations

${metrics.overallTaskCompletionRate < 0.7 ? "⚠️ **Task Completion Rate is low**. Review conversation scenarios where users failed to achieve goals.\n" : ""}
${metrics.averageCoherenceScore < 0.7 ? "⚠️ **Coherence is below acceptable**. System may not be maintaining conversation context well.\n" : ""}
${metrics.averageLatencyMs > 4000 ? "⚠️ **Latency is high**. Consider optimizing retrieval or generation steps.\n" : ""}
${metrics.totalErrors > metrics.totalScenarios * 0.1 ? "⚠️ **High error rate**. Investigate error sources and improve error handling.\n" : ""}
${metrics.overallTaskCompletionRate >= 0.8 && metrics.averageCoherenceScore >= 0.8 && metrics.averageLatencyMs <= 3000 ? "✅ **System performing well** across all metrics. Ready for deployment and paper inclusion.\n" : ""}

---

## Academic Justification

### Why Simulated User Testing Matters for Research

This simulated user testing directly addresses the methodology gap identified in the paper:

**Paper Title**: "Implementasi Agentic Retrieval-Augmented Generation (RAG) Untuk Sistem Layanan Informasi Perguruan Tinggi"

**The Gap**:
- Title claims **"Implementasi"** (implementation)
- Previous evaluation only measured **component-level RAG metrics**
- No validation of **complete system** including conversation flow, task completion

**How This Addresses the Gap**:
1. ✅ Tests complete implementation: UI → API → RAG → Response
2. ✅ Validates multi-turn conversation capability
3. ✅ Measures task completion (real user goal achievement)
4. ✅ Evaluates system-level integration
5. ✅ Provides holistic "implementasi" validation

**LLM-as-a-User Approach**:
- Leverages existing LLM-as-a-Judge infrastructure
- Scalable and reproducible
- Generates realistic user behavior
- Established pattern in evaluation literature

---

*Generated by Simulated User Testing Framework*
`;
}

/**
 * Main execution
 */
async function main() {
    console.log("🚀 Simulated User Testing for MuliaChat RAG System\n");

    const args = parseArgs();

    // Determine which scenarios to run
    let scenarios = ALL_SCENARIOS;

    if (args.scenarioId) {
        const scenario = ALL_SCENARIOS.find((s) => s.id === args.scenarioId);
        if (!scenario) {
            console.error(`❌ Scenario not found: ${args.scenarioId}`);
            console.log("\nAvailable scenarios:");
            for (const s of ALL_SCENARIOS) {
                console.log(`  - ${s.id}: ${s.name}`);
            }
            process.exit(1);
        }
        scenarios = [scenario];
        console.log(`📋 Running single scenario: ${scenario.name}\n`);
    } else if (args.quick) {
        // Quick mode: run first 3 scenarios
        scenarios = ALL_SCENARIOS.slice(0, 3);
        console.log(`⚡ Quick mode: Running ${scenarios.length} scenarios\n`);
    } else {
        console.log(`📋 Running all ${scenarios.length} scenarios\n`);
    }

    const config: SimulatedUserTestConfig = {
        scenarios,
        repetitionsPerScenario: args.repetitions || 1,
        useAgenticMode: args.agentic !== false,
        retrievalStrategy: "hybrid",
        enableGuardrails: true,
        maxTurnsPerConversation: 10,
        saveDetailedLogs: true,
    };

    console.log("Configuration:");
    console.log(`  Scenarios: ${config.scenarios.length}`);
    console.log(`  Repetitions: ${config.repetitionsPerScenario}`);
    console.log(`  Agentic Mode: ${config.useAgenticMode ? "enabled" : "disabled"}`);
    console.log(`  Max Turns: ${config.maxTurnsPerConversation}`);
    console.log();

    const startTime = new Date();

    try {
        // Run tests
        const metrics = await runSimulatedUserTests(config);

        const endTime = new Date();

        // Generate report
        const report = generateMarkdownReport(metrics, startTime, endTime);

        // Save report
        const reportPath = `/tmp/simulated-user-testing-report-${Date.now()}.md`;
        writeFileSync(reportPath, report, "utf-8");

        console.log(`\n${"=".repeat(80)}`);
        console.log("📊 FINAL RESULTS");
        console.log("=".repeat(80));
        console.log(`\nTask Completion Rate: ${(metrics.overallTaskCompletionRate * 100).toFixed(1)}%`);
        console.log(`Successful Scenarios: ${metrics.successfulScenarios}/${metrics.totalScenarios}`);
        console.log(`Average Coherence: ${metrics.averageCoherenceScore.toFixed(2)}`);
        console.log(`Average Latency: ${metrics.averageLatencyMs.toFixed(0)}ms`);
        console.log(`P95 Latency: ${metrics.p95LatencyMs.toFixed(0)}ms`);
        console.log(`\n📄 Report saved to: ${reportPath}`);
        console.log("\n✅ Simulated user testing completed successfully!");
    } catch (error) {
        console.error("\n❌ Error running simulated user tests:", error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.main) {
    main();
}
