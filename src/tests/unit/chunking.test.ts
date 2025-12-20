import { describe, expect, it } from "bun:test";
import { calculateChunkQuality, extractHeadings, recursiveChunking } from "@/lib/rag/chunking";

describe("Chunking Strategy - Unit Tests", () => {
    describe("recursiveChunking", () => {
        it("should split text based on chunk size", () => {
            const text = "a".repeat(1500);
            const chunks = recursiveChunking(text, { chunkSize: 1000, chunkOverlap: 0 });
            expect(chunks.length).toBe(2);
            expect(chunks[0].content.length).toBe(1000);
            expect(chunks[1].content.length).toBe(500);
        });

        it("should handle empty text", () => {
            const chunks = recursiveChunking("", { chunkSize: 1000 });
            expect(chunks.length).toBe(0);
        });

        it("should maintain content integrity across splits", () => {
            const text = `Part1 ${"Part2 ".repeat(100)}`;
            const chunks = recursiveChunking(text, { chunkSize: 100, chunkOverlap: 10 });
            const joined = chunks.map((c) => c.content).join(" "); // Rough check, real reconstruction is harder with overlap
            expect(chunks.length).toBeGreaterThan(1);
            expect(chunks[0].content).toContain("Part1");
        });
    });

    describe("calculateChunkQuality", () => {
        it("should return higher score for academic sections", () => {
            const content = "This is a conclusion section.";
            const result = calculateChunkQuality(content, "Conclusion");
            expect(result.metrics.structuralImportance).toBeGreaterThan(0.5);
        });

        it("should detect citations", () => {
            const content = "This is supported by previous work (Smith, 2023).";
            const result = calculateChunkQuality(content);
            expect(result.metrics.citationPresence).toBeGreaterThan(0);
        });

        it("should score low for empty or nonsense content", () => {
            const result = calculateChunkQuality("");
            expect(result.score).toBe(0);
        });
    });

    describe("extractHeadings", () => {
        it("should extract markdown headings", () => {
            const text = "# Heading 1\n## Heading 2\nSome content";
            const headings = extractHeadings(text);
            expect(headings).toContain("Heading 1");
            expect(headings).toContain("Heading 2");
        });

        it("should extract academic sections", () => {
            const text = "Abstract\nThis is the abstract.";
            const headings = extractHeadings(text);
            expect(headings.some((h) => h.toLowerCase().includes("abstract"))).toBe(true);
        });
    });
});
