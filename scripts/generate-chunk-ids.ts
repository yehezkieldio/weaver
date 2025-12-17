import { ACADEMIC_QUESTIONS, type EvaluationQuestion } from "@/lib/evaluation-questions";
import { retrieveContext } from "@/lib/rag/context-builder";

async function main() {
    console.log("Generating relevant chunk IDs for ACADEMIC_QUESTIONS...");
    console.log("---------------------------------------------------------");

    const updatedQuestions: EvaluationQuestion[] = [];

    for (const [index, q] of ACADEMIC_QUESTIONS.entries()) {
        console.log(`[${index + 1}/${ACADEMIC_QUESTIONS.length}] Processing: ${q.question.substring(0, 50)}...`);

        // Use ground truth to find the chunks that contain the answer (Gold Standard)
        // We use hybrid strategy with a higher topK to cast a wider net, then we'll take the top ones.
        const result = await retrieveContext(q.groundTruth, {
            topK: 3, // We usually want the top 1-3 chunks that contain the answer
            strategy: "hybrid",
            minSimilarity: 0.01, // Lower threshold to ensure we find candidates (RRF scores are typically low)
        });

        const chunkIds = result.chunks.map((c) => c.chunkId);

        console.log(`   -> Found ${chunkIds.length} relevant chunks`);
        if (chunkIds.length > 0) {
            console.log(`   -> IDs: ${chunkIds.join(", ")}`);
            // log the titles to verify
            const titles = [...new Set(result.chunks.map((c) => c.documentTitle))];
            console.log(`   -> Sources: ${titles.join(", ")}`);
        } else {
            console.log("   -> NO CHUNKS FOUND (Try manual search or lower threshold)");
        }

        updatedQuestions.push({
            ...q,
            relevantChunkIds: chunkIds.length > 0 ? chunkIds : undefined,
        });
    }

    console.log("\n---------------------------------------------------------");
    console.log("GENERATION COMPLETE.");
    console.log("You can update 'src/lib/evaluation-questions.ts' with the following object:");
    console.log("---------------------------------------------------------");

    // Helper to print the object as valid TS code
    const output = JSON.stringify(updatedQuestions, null, 4)
        // Fix the formatting to look more like the source file if needed,
        // or the user can just use the JSON
        .replace(/"(\w+)":/g, "$1:"); // Remove quotes from keys

    console.log(`export const ACADEMIC_QUESTIONS: EvaluationQuestion[] = ${output};`);
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((e) => {
            console.error("Script failed:", e);
            process.exit(1);
        });
}
