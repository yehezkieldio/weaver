import { describe, expect, it } from "bun:test";
import {
    detectQueryLanguage,
    expandQueryIndonesian,
    expandQueryWithSynonyms,
    extractCourseInfo,
} from "@/lib/rag/university-domain";

describe("University Domain Logic", () => {
    describe("Query Expansion", () => {
        it("should expand English research terms", () => {
            const query = "What is the methodology?";
            const expanded = expandQueryWithSynonyms(query);
            // methodology -> methods, approach, procedure...
            expect(expanded.length).toBeGreaterThan(1);
            expect(expanded.some((q) => q.includes("methods"))).toBe(true);
        });

        it("should expand Indonesian education terms", () => {
            const query = "Bagaimana cara bayar ukt?";
            const expanded = expandQueryIndonesian(query);
            // ukt -> spp, biaya kuliah
            expect(expanded.length).toBeGreaterThan(1);
            expect(expanded.some((q) => q.includes("spp") || q.includes("biaya kuliah"))).toBe(true);
        });

        it("should not expand unrelated terms excessively", () => {
            const query = "xyz123";
            const expanded = expandQueryWithSynonyms(query);
            expect(expanded.length).toBe(1); // Only original
        });
    });

    describe("Course Info Extraction", () => {
        it("should extract course code and name", () => {
            const content = "Mata Kuliah: IF1234 Pemrograman Web";
            const info = extractCourseInfo(content);
            expect(info.courseCode).toBeTruthy(); // The regex might need specific format checking
            // Based on regex in file: \b([A-Z]{2,4})[\s-]?(\d{3,4}[A-Z]?)\b
            // IF1234 matches.
            expect(info.courseCode).toBe("IF1234");
        });

        it("should extract semester", () => {
            const content = "Semester Ganjil 2024/2025";
            const info = extractCourseInfo(content);
            expect(info.semester).toContain("Semester Ganjil");
        });

        it("should extract faculty", () => {
            const content = "Fakultas Ilmu Komputer";
            const info = extractCourseInfo(content);
            expect(info.faculty).toBe("Ilmu Komputer");
        });
    });

    describe("Language Detection", () => {
        it("should default to id", () => {
            expect(detectQueryLanguage("hello")).toBe("id");
        });
    });
});
