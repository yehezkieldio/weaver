import { pipeline } from "@huggingface/transformers";
import consola from "consola";

// @ts-ignore
let classifier: Awaited<ReturnType<typeof pipeline>> | null = null;

async function init() {
    consola.start("Loading model...");
    classifier = await pipeline("text-classification", "cross-encoder/ms-marco-MiniLM-L2-v2");
    consola.success("Model loaded.");
}

await init();
