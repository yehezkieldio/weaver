import { generateText } from "ai";
import consola from "consola";
import { CHAT_MODEL, JUDGE_MODEL } from "@/lib/ai";
import { generateEmbedding } from "@/lib/ai/embeddings";

async function run(): Promise<void> {
    consola.start("Starting lightweight AI model tests...");

    // Check embedding
    try {
        const e = await generateEmbedding("test");
        consola.success("Embedding OK — dimension:", e.embedding.length, "tokens:", e.usage.tokens);
    } catch (err) {
        consola.error("Embedding failed:", err);
    }

    await generateText({
        model: CHAT_MODEL,
        prompt: 'Reply in one word: "Hello"',
        maxOutputTokens: 5,
        temperature: 0,
    });
    consola.success("Chat model call OK.");

    await generateText({
        model: JUDGE_MODEL,
        prompt: 'Is "Hello" a greeting? Reply "yes" or "no".',
        maxOutputTokens: 5,
        temperature: 0,
    });
    consola.success("Judge model call OK.");

    consola.info("\nFinished. Keep in mind these calls are real API requests — prompts were kept intentionally tiny.");
}

// run when executed directly
if (require.main === module) {
    run()
        .then(() => process.exit(0))
        .catch((e) => {
            consola.error("Test runner failed:", e);
            process.exit(1);
        });
}
