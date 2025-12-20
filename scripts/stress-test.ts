import { parseArgs } from "node:util";
import consola from "consola";

/**
 * Retrieved chunk structure from the API
 */
interface RetrievedChunk {
    chunkId: string;
    documentTitle: string;
    content: string;
    similarity: number;
    retrievalMethod?: "vector" | "keyword" | "hybrid";
    vectorScore?: number;
    bm25Score?: number;
}

/**
 * Result of parsing an SSE JSON payload
 */
interface SSEParseResult {
    handled: boolean;
    textDelta?: string;
}

/**
 * Try to parse SSE JSON payload and extract retrieved chunks or text deltas
 */
function tryParseSSEPayload(contentLine: string, retrievedChunks: RetrievedChunk[]): SSEParseResult {
    try {
        const ssePayload = JSON.parse(contentLine);

        // Handle text-delta type - this contains the actual response text
        if (ssePayload?.type === "text-delta" && typeof ssePayload?.delta === "string") {
            return { handled: true, textDelta: ssePayload.delta };
        }

        // Handle data-retrieved-chunk type in SSE format
        if (ssePayload?.type === "data-retrieved-chunk" && ssePayload?.data) {
            const chunk = ssePayload.data as RetrievedChunk;
            if (chunk.chunkId && !retrievedChunks.some((c) => c.chunkId === chunk.chunkId)) {
                retrievedChunks.push({
                    chunkId: chunk.chunkId,
                    documentTitle: chunk.documentTitle || "",
                    content: chunk.content || "",
                    similarity: chunk.similarity || 0,
                    retrievalMethod: chunk.retrievalMethod,
                    vectorScore: chunk.vectorScore,
                    bm25Score: chunk.bm25Score,
                });
            }
            return { handled: true };
        }

        // Handle other known types that don't contribute to text
        if (
            ssePayload?.type === "data-agent-progress" ||
            ssePayload?.type === "data-agent-step" ||
            ssePayload?.type === "data-agent-result" ||
            ssePayload?.type === "tool-input-start" ||
            ssePayload?.type === "tool-input-delta" ||
            ssePayload?.type === "tool-input-available" ||
            ssePayload?.type === "tool-output-available" ||
            ssePayload?.type === "start-step" ||
            ssePayload?.type === "finish-step" ||
            ssePayload?.type === "text-end" ||
            ssePayload?.type === "finish"
        ) {
            return { handled: true };
        }
    } catch {
        // Not a JSON payload
    }
    return { handled: false };
}

/**
 * Parse AI SDK protocol text chunks (type 0)
 */
function parseTextChunk(dataStr: string): string {
    try {
        const textContent = JSON.parse(dataStr);
        if (typeof textContent === "string") {
            return textContent;
        }
    } catch {
        // Ignore parse errors
    }
    return "";
}

/**
 * Parse AI SDK protocol data parts (type 2)
 */
function parseDataParts(dataStr: string, retrievedChunks: RetrievedChunk[]): void {
    try {
        const dataParts = JSON.parse(dataStr);
        if (Array.isArray(dataParts)) {
            for (const part of dataParts) {
                if (part?.type === "data-retrieved-chunk" && part?.data) {
                    const chunk = part.data as RetrievedChunk;
                    if (chunk.chunkId && !retrievedChunks.some((c) => c.chunkId === chunk.chunkId)) {
                        retrievedChunks.push({
                            chunkId: chunk.chunkId,
                            documentTitle: chunk.documentTitle || "",
                            content: chunk.content || "",
                            similarity: chunk.similarity || 0,
                            retrievalMethod: chunk.retrievalMethod,
                            vectorScore: chunk.vectorScore,
                            bm25Score: chunk.bm25Score,
                        });
                    }
                }
            }
        }
    } catch {
        // Ignore parse errors
    }
}

/**
 * Parse Vercel AI SDK UI Message Stream format
 * Handles both new (createUIMessageStream) and legacy (streamText) formats
 */
function parseAISDKStream(rawStream: string): {
    text: string;
    retrievedChunks: RetrievedChunk[];
} {
    let text = "";
    const retrievedChunks: RetrievedChunk[] = [];
    const lines = rawStream.split("\n");

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Skip SSE comments and [DONE] markers
        if (trimmedLine.startsWith(":") || trimmedLine === "[DONE]" || trimmedLine === "data: [DONE]") {
            continue;
        }

        // Handle SSE format: "data: {...}" or direct protocol format "0:..."
        let contentLine = trimmedLine;
        if (trimmedLine.startsWith("data:")) {
            contentLine = trimmedLine.substring(5).trim();

            // Skip empty data or [DONE]
            if (!contentLine || contentLine === "[DONE]") {
                continue;
            }

            // Try to parse as SSE JSON payload (new format)
            const sseResult = tryParseSSEPayload(contentLine, retrievedChunks);
            if (sseResult.handled) {
                if (sseResult.textDelta) {
                    text += sseResult.textDelta;
                }
                continue;
            }
        }

        // Parse legacy AI SDK protocol format: TYPE:DATA
        const colonIndex = contentLine.indexOf(":");
        if (colonIndex === -1) continue;

        const typeCode = contentLine.substring(0, colonIndex);
        const dataStr = contentLine.substring(colonIndex + 1);

        switch (typeCode) {
            case "0":
                // Text chunk (legacy format)
                text += parseTextChunk(dataStr);
                break;
            case "2":
                // Data parts (legacy format)
                parseDataParts(dataStr, retrievedChunks);
                break;
            default:
                // Types 8, e, d are finish/error/done signals - skip
                break;
        }
    }

    return { text, retrievedChunks };
}

// Parse command line arguments
const { values } = parseArgs({
    args: Bun.argv,
    options: {
        url: {
            type: "string",
            default: "http://localhost:3000/api/chat",
        },
        concurrency: {
            type: "string",
            default: "10",
        },
        requests: {
            type: "string",
            default: "50",
        },
        verbose: {
            type: "boolean",
            default: false,
        },
    },
    strict: true,
    allowPositionals: true,
});

const BASE_URL = values.url || "http://localhost:3000/api/chat";
const CONCURRENCY = Number.parseInt(values.concurrency || "10", 10);
const TOTAL_REQUESTS = Number.parseInt(values.requests || "50", 10);
const VERBOSE = values.verbose;

consola.start("Starting Stress Test");
consola.info(`Target: ${BASE_URL}`);
consola.info(`Concurrency: ${CONCURRENCY}`);
consola.info(`Total Requests: ${TOTAL_REQUESTS}\n`);

interface TestResult {
    id: number;
    status: "success" | "error";
    latency: number;
    error?: string;
    tokens?: number;
}

const results: TestResult[] = [];
let completed = 0;
let started = 0;

const SAMPLE_QUESTIONS = [
    "Apa visi dan misi Universitas Mulia?",
    "Bagaimana cara mendaftar mahasiswa baru?",
    "What is the tuition fee for Computer Science?",
    "Jelaskan tentang program studi Informatika.",
    "Siapa rektor Universitas Mulia?",
    "Does the university have a library?",
    "Berapa biaya kuliah per semester?",
    "Apa saja fasilitas yang tersedia?",
    "Tell me about the scholarship programs.",
    "Di mana lokasi kampus Universitas Mulia?",
];

async function runRequest(id: number): Promise<TestResult> {
    const question = SAMPLE_QUESTIONS[id % SAMPLE_QUESTIONS.length];
    const startTime = performance.now();

    try {
        if (VERBOSE) consola.debug(`[Req ${id}] Starting: "${question}"`);

        const response = await fetch(BASE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [
                    {
                        role: "user",
                        parts: [{ type: "text", text: question }],
                    },
                ],
                useRag: true,
                useAgenticMode: false, // Use standard RAG for faster/simpler stress testing
                stream: true,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error("No response body");
        }

        // Read the full stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let rawStream = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            rawStream += decoder.decode(value, { stream: true });
        }
        // Final decode to flush any remaining bytes
        rawStream += decoder.decode();

        // Parse the AI SDK stream format to ensure complete processing
        const { text } = parseAISDKStream(rawStream);

        if (VERBOSE && text) {
            consola.debug(`[Req ${id}] Received ${text.length} characters`);
        }

        const endTime = performance.now();
        const latency = endTime - startTime;

        if (VERBOSE) consola.debug(`[Req ${id}] Completed in ${latency.toFixed(2)}ms`);

        return {
            id,
            status: "success",
            latency,
        };
    } catch (error) {
        const endTime = performance.now();
        const latency = endTime - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (VERBOSE) consola.debug(`[Req ${id}] Failed: ${errorMessage}`);

        return {
            id,
            status: "error",
            latency,
            error: errorMessage,
        };
    } finally {
        completed += 1;
        process.stdout.write(`\rProgress: ${completed}/${TOTAL_REQUESTS} requests completed`);
    }
}

async function main() {
    const startTime = performance.now();
    const queue: number[] = Array.from({ length: TOTAL_REQUESTS }, (_, i) => i);
    const active: Promise<void>[] = [];

    // Initial fill
    while (active.length < CONCURRENCY && queue.length > 0) {
        const id = queue.shift();
        if (id === undefined) break;
        started += 1;
        const p = runRequest(id).then((result) => {
            results.push(result);
            active.splice(active.indexOf(p), 1);
        });
        active.push(p);
    }

    // Loop until done
    while (active.length > 0 || queue.length > 0) {
        if (active.length < CONCURRENCY && queue.length > 0) {
            const id = queue.shift();
            if (id === undefined) break;
            started += 1;
            const p = runRequest(id).then((result) => {
                results.push(result);
                active.splice(active.indexOf(p), 1);
            });
            active.push(p);
        } else {
            await Promise.race(active);
        }
    }

    const totalTime = performance.now() - startTime;
    consola.success(`Stress Test Completed in ${(totalTime / 1000).toFixed(2)}s`);

    // Analyze results
    const successful = results.filter((r) => r.status === "success");
    const failed = results.filter((r) => r.status === "error");

    const latencies = successful.map((r) => r.latency).sort((a, b) => a - b);
    const min = latencies[0] || 0;
    const max = latencies.at(-1) || 0;
    const avg = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

    consola.info("\n📊 Results Summary:");
    consola.info("----------------------------------------");
    consola.info(`Total Requests:   ${TOTAL_REQUESTS}`);
    consola.info(
        `Successful:       ${successful.length} (${((successful.length / TOTAL_REQUESTS) * 100).toFixed(1)}%)`
    );
    consola.info(`Failed:           ${failed.length} (${((failed.length / TOTAL_REQUESTS) * 100).toFixed(1)}%)`);
    consola.info(`Throughput:       ${(successful.length / (totalTime / 1000)).toFixed(2)} req/s`);
    consola.info("\n⏱️  Latency Metrics (ms):");
    consola.info(`Min:              ${min.toFixed(2)}`);
    consola.info(`Average:          ${avg.toFixed(2)}`);
    consola.info(`P95:              ${p95.toFixed(2)}`);
    consola.info(`P99:              ${p99.toFixed(2)}`);
    consola.info(`Max:              ${max.toFixed(2)}`);
    consola.info("----------------------------------------");

    if (failed.length > 0) {
        consola.warn("\n❌ Error Analysis:");
        const errors = new Map<string, number>();
        for (const r of failed) {
            const msg = r.error || "Unknown error";
            errors.set(msg, (errors.get(msg) || 0) + 1);
        }

        for (const [msg, count] of errors) {
            consola.warn(`- ${count}x: ${msg}`);
        }
        process.exit(1);
    }
}

main().catch((err) => consola.error(err));
