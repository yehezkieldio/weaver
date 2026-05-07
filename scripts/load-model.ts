import { pipeline } from "@huggingface/transformers";
import consola from "consola";

type TextClassificationPipeline = Awaited<ReturnType<typeof pipeline>>;

let classifier: TextClassificationPipeline | null = null;

async function init(): Promise<void> {
    consola.start("Loading model...");
    classifier = await pipeline("text-classification", "cross-encoder/ms-marco-MiniLM-L2-v2");
    consola.success("Model loaded.");
}

await init();
