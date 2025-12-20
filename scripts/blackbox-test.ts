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

// Regex constants for validation
const REGEX_UNIVERSITAS_MULIA = /Universitas Mulia/i;
const REGEX_UNIVERSITY = /University/i;
const REGEX_ILMU_KOMPUTER = /Ilmu Komputer/i;
const REGEX_COMPUTER_SCIENCE = /Computer Science/i;
const REGEX_EKONOMI = /Ekonomi/i;
const REGEX_ECONOMICS = /Economics/i;
const REGEX_IJAZAH = /Ijazah/i;
const REGEX_CERTIFICATE = /Certificate/i;
const REGEX_RAPOR = /Rapor/i;
const REGEX_REPORT = /Report/i;
const REGEX_SCHOLARSHIP = /Scholarship/i;
const REGEX_BEASISWA = /Beasiswa/i;

const { values } = parseArgs({
    args: Bun.argv,
    options: {
        url: {
            type: "string",
            default: "http://localhost:3000/api/chat",
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
const VERBOSE = values.verbose;

interface TestCase {
    id: string;
    query: string;
    expectedKeywords: string[]; // At least one of these should be present, or all? Let's say ALL for now to be strict, or maybe a flexible check.
    // Let's use a function for validation for more flexibility
    validate: (response: string) => boolean;
    description: string;
}

const TEST_CASES: TestCase[] = [
    {
        id: "TC-001",
        description: "Verify university name recognition",
        query: "Apa nama universitas ini?",
        expectedKeywords: ["Mulia", "Universitas Mulia"],
        validate: (res) => REGEX_UNIVERSITAS_MULIA.test(res) || REGEX_UNIVERSITY.test(res),
    },
    {
        id: "TC-002",
        description: "Verify faculty information retrieval",
        query: "Sebutkan fakultas yang ada.",
        expectedKeywords: ["Ilmu Komputer", "Ekonomi", "Humaniora"],
        validate: (res) =>
            (REGEX_ILMU_KOMPUTER.test(res) || REGEX_COMPUTER_SCIENCE.test(res)) &&
            (REGEX_EKONOMI.test(res) || REGEX_ECONOMICS.test(res)),
    },
    {
        id: "TC-003",
        description: "Verify admission requirements query",
        query: "Apa syarat pendaftaran mahasiswa baru?",
        expectedKeywords: ["Ijazah", "Rapor", "Foto"],
        validate: (res) =>
            REGEX_IJAZAH.test(res) || REGEX_CERTIFICATE.test(res) || REGEX_RAPOR.test(res) || REGEX_REPORT.test(res),
    },
    {
        id: "TC-004",
        description: "Verify English language capability",
        query: "What are the scholarship opportunities?",
        expectedKeywords: ["Scholarship", "Beasiswa"],
        validate: (res) => REGEX_SCHOLARSHIP.test(res) || REGEX_BEASISWA.test(res),
    },
    {
        id: "TC-005",
        description: "Verify irrelevant query handling (Fallout/General)",
        query: "Siapa presiden Amerika?",
        expectedKeywords: [],
        validate: (_res) => true, // Just ensure it doesn't crash, content check is hard without strict guardrails
    },
];

consola.start("Starting Blackbox Test Suite");
consola.info(`Target: ${BASE_URL}\n`);

async function runTest(testCase: TestCase): Promise<boolean> {
    process.stdout.write(`Testing ${testCase.id}: ${testCase.description}... `);

    try {
        const response = await fetch(BASE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [
                    {
                        role: "user",
                        parts: [{ type: "text", text: testCase.query }],
                    },
                ],
                useRag: true,
                useAgenticMode: false, // Standard RAG is enough for fact checking
                stream: false, // Turn off streaming for easier text parsing if supported, actually API always streams
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        // Read the full stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No body");

        const decoder = new TextDecoder();
        let rawStream = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            rawStream += decoder.decode(value, { stream: true });
        }
        // Final decode to flush any remaining bytes
        rawStream += decoder.decode();

        // Parse the AI SDK stream format using the robust parser
        const { text: cleanText } = parseAISDKStream(rawStream);

        if (VERBOSE) {
            consola.debug(`[Response]: ${cleanText.substring(0, 100)}...`);
        }

        const passed = testCase.validate(cleanText);

        if (passed) {
            consola.success("PASS");
            return true;
        }

        consola.error("FAIL");
        consola.info(`   Expected matches for: ${testCase.expectedKeywords.join(", ")}`);
        consola.info(`   Got: ${cleanText.substring(0, 200)}...`);
        return false;
    } catch (error) {
        consola.error("ERROR");
        consola.error(`   ${error}`);
        return false;
    }
}

async function main() {
    let passed = 0;

    for (const testCase of TEST_CASES) {
        if (await runTest(testCase)) {
            passed += 1;
        }
    }

    consola.info("\n----------------------------------------");
    consola.info(`Test Summary: ${passed}/${TEST_CASES.length} passed`);

    if (passed !== TEST_CASES.length) {
        process.exit(1);
    }
}

main().catch((err) => consola.error(err));
