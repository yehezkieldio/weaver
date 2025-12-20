import { parseArgs } from "node:util";
import consola from "consola";

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

        // Read the stream to ensure full processing
        const reader = response.body.getReader();
        let receivedLength = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            receivedLength += value.length;
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
