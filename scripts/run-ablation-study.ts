import { consola } from "consola";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ablationStudies } from "@/lib/db/schema";
import { ACADEMIC_QUESTIONS } from "@/lib/evaluation-questions";
import { ABLATION_CONFIGS, type AblationConfig, generateAblationReport, runAblationStudy } from "@/lib/rag/evaluation";

async function main() {
    const args = process.argv.slice(2);
    const modeArg = args.find((arg) => arg.startsWith("--mode="));
    const mode = modeArg ? modeArg.split("=")[1] : "quick";

    if (mode !== "quick" && mode !== "production") {
        consola.error("Invalid mode. Use --mode=quick or --mode=production");
        process.exit(1);
    }

    consola.start(`Starting Ablation Study in ${mode.toUpperCase()} mode...`);

    // Determine question count
    const questionCount = mode === "quick" ? 5 : 50;
    const configs: AblationConfig[] = ABLATION_CONFIGS; // Use all configs
    const selectedQuestions = ACADEMIC_QUESTIONS.slice(0, questionCount);

    const testQuestions = selectedQuestions.map((q) => ({
        question: q.question,
        groundTruth: q.groundTruth,
    }));

    consola.info(`Configurations: ${configs.length}`);
    consola.info(`Questions: ${testQuestions.length}`);

    // Create DB entry
    const [study] = await db
        .insert(ablationStudies)
        .values({
            name: `CLI Ablation Study ${new Date().toISOString()}`,
            description: `CLI execution (${mode} mode) comparing ${configs.length} configs with ${testQuestions.length} questions`,
            status: "running",
            configurations: configs.map((c) => ({
                name: c.name,
                useRag: c.useRag,
                useReranker: c.useReranker,
                rerankerStrategy: c.rerankerStrategy,
                retrievalStrategy: c.retrievalStrategy,
                chunkingStrategy: c.chunkingStrategy,
                useAgenticMode: c.useAgenticMode,
                useGuardrails: c.useGuardrails,
                topK: c.topK,
            })),
        })
        .returning();

    consola.info(`Study ID: ${study.id}`);

    try {
        const ablationResults = await runAblationStudy(testQuestions, configs, {
            onProgress: (configIdx, questionIdx, totalConfigs, totalQuestions) => {
                consola.info(
                    `[${configIdx + 1}/${totalConfigs}] Config: ${configs[configIdx].name} - Question ${questionIdx + 1}/${totalQuestions}`
                );
            },
        });

        const results = ablationResults.map((result) => ({
            configName: result.config.name,
            metrics: {
                faithfulness: result.metrics.faithfulness,
                answerRelevancy: result.metrics.answerRelevancy,
                contextPrecision: result.metrics.contextPrecision,
                contextRecall: result.metrics.contextRecall,
                contextRelevancy: result.metrics.contextRelevancy,
                answerCorrectness: result.metrics.answerCorrectness,
                citationAccuracy: result.metrics.citationAccuracy,
                hallucinationRate: result.metrics.hallucinationRate,
                factualConsistency: result.metrics.factualConsistency,
                sourceAttribution: result.metrics.sourceAttribution,
                contradictionScore: result.metrics.contradictionScore,
                retrievalNdcg: result.metrics.retrievalNdcg,
                retrievalMrr: result.metrics.retrievalMrr,
                retrievalPrecision: result.metrics.retrievalPrecision,
                totalLatencyMs: result.metrics.totalLatencyMs,
                retrievalLatencyMs: result.metrics.retrievalLatencyMs,
                rerankingLatencyMs: result.metrics.rerankingLatencyMs,
                generationLatencyMs: result.metrics.generationLatencyMs,
                agentReasoningLatencyMs: result.metrics.agentReasoningLatencyMs,
                planningLatencyMs: result.metrics.planningLatencyMs,
                synthesisLatencyMs: result.metrics.synthesisLatencyMs,
                avgStepLatencyMs: result.metrics.avgStepLatencyMs,
                toolCallLatencyMs: result.metrics.toolCallLatencyMs,
                tokensPerSecond: result.metrics.tokensPerSecond,
                totalAgentSteps: result.metrics.totalAgentSteps,
            },
            perQuestionMetrics: result.perQuestionMetrics.map((m) => ({
                faithfulness: m.faithfulness,
                answerRelevancy: m.answerRelevancy,
                contextPrecision: m.contextPrecision,
                contextRecall: m.contextRecall,
                contextRelevancy: m.contextRelevancy,
                answerCorrectness: m.answerCorrectness,
                hallucinationRate: m.hallucinationRate,
                totalLatencyMs: m.totalLatencyMs,
                planningLatencyMs: m.planningLatencyMs,
                synthesisLatencyMs: m.synthesisLatencyMs,
                avgStepLatencyMs: m.avgStepLatencyMs,
            })),
        }));

        const report = generateAblationReport(ablationResults);

        await db
            .update(ablationStudies)
            .set({
                status: "completed",
                results,
                report,
                completedAt: new Date(),
            })
            .where(eq(ablationStudies.id, study.id));

        consola.success("Ablation study completed successfully!");
        consola.info(
            `Run 'uv run scripts/run-statistical-analysis-v2.py --ablation-id=${study.id}' to analyze results.`
        );
    } catch (error) {
        consola.error("Ablation study failed:", error);
        await db.update(ablationStudies).set({ status: "failed" }).where(eq(ablationStudies.id, study.id));
        process.exit(1);
    }
}

main();
