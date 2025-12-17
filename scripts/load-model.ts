import { pipeline } from "@huggingface/transformers";

// @ts-ignore
let classifier: Awaited<ReturnType<typeof pipeline>> | null = null;

async function init() {
    console.log("Loading model...");
    classifier = await pipeline("text-classification", "cross-encoder/ms-marco-MiniLM-L2-v2");
    console.log("Model loaded.");
}

await init();
