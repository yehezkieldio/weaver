import consola from "consola";
import { ACADEMIC_QUESTIONS, type EvaluationQuestion } from "@/lib/evaluation-questions";
import { retrieveContext } from "@/lib/rag/context-builder";

async function main() {
    consola.start("Generating relevant chunk IDs for ACADEMIC_QUESTIONS...");
    consola.info("---------------------------------------------------------");

    const updatedQuestions: EvaluationQuestion[] = [];

    for (const [index, q] of ACADEMIC_QUESTIONS.entries()) {
        consola.info(`[${index + 1}/${ACADEMIC_QUESTIONS.length}] Processing: ${q.question.substring(0, 50)}...`);

        // Use ground truth to find the chunks that contain the answer (Gold Standard)
        // We use hybrid strategy with a higher topK to cast a wider net, then we'll take the top ones.
        // NOTE: topK=5 matches the evaluation retrieval to ensure fair comparison
        const result = await retrieveContext(q.groundTruth, {
            topK: 5, // Match evaluation topK for fair retrieval metric calculation
            strategy: "hybrid",
            minSimilarity: 0.01, // Lower threshold to ensure we find candidates (RRF scores are typically low)
        });

        const chunkIds = result.chunks.map((c) => c.chunkId);

        consola.info(`   -> Found ${chunkIds.length} relevant chunks`);
        if (chunkIds.length > 0) {
            consola.debug(`   -> IDs: ${chunkIds.join(", ")}`);
            // log the titles to verify
            const titles = [...new Set(result.chunks.map((c) => c.documentTitle))];
            consola.debug(`   -> Sources: ${titles.join(", ")}`);
        } else {
            consola.warn("   -> NO CHUNKS FOUND (Try manual search or lower threshold)");
        }

        updatedQuestions.push({
            ...q,
            relevantChunkIds: chunkIds.length > 0 ? chunkIds : undefined,
        });
    }

    consola.info("\n---------------------------------------------------------");
    consola.success("GENERATION COMPLETE.");
    consola.info("You can update 'src/lib/evaluation-questions.ts' with the following object:");
    consola.info("---------------------------------------------------------");

    // Helper to print the object as valid TS code
    const output = JSON.stringify(updatedQuestions, null, 4)
        // Fix the formatting to look more like the source file if needed,
        // or the user can just use the JSON
        .replace(/"(\w+)":/g, "$1:"); // Remove quotes from keys

    consola.info(`export const ACADEMIC_QUESTIONS: EvaluationQuestion[] = ${output};`);
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((e) => {
            consola.error("Script failed:", e);
            process.exit(1);
        });
}
