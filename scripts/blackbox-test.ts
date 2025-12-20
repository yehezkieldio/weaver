import { parseArgs } from "node:util";
import consola from "consola";

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
                messages: [{ role: "user", content: testCase.query }],
                useRag: true,
                useAgenticMode: false, // Standard RAG is enough for fact checking
                stream: false, // Turn off streaming for easier text parsing if supported, actually API always streams
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        // The API returns a stream even if we don't ask for it (based on route code),
        // unless we use useChat hook client side.
        // The route.ts always uses `streamText` or `createUIMessageStreamResponse`.
        // So we must parse the stream.

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No body");

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            // The chunk is in AI SDK format, which is complex to parse manually regex.
            // Format is typically: 0:"text content"\n
            // We will just look for the raw text inside the chunks.
            fullText += chunk;
        }

        // Simple cleanup to extract readable text from stream protocol if needed.
        // AI SDK stream format is like: 0:"Hello" 0:" world"
        // We can just strip the protocol markers roughly.
        const cleanText = fullText.replace(/^\d+:/gm, "").replace(/"/g, "").replace(/\n/g, " ");

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
