/**
 * Test script to verify ASCII report parsing with course (Mata Kuliah) files
 */

import { readFileSync } from "node:fs";
import { parseAndSerializeReport } from "../src/lib/rag/parsers/ascii-report";

console.log("=== Testing Course Files (Mata Kuliah) ===\n");

const files = [
    "/home/elizielx/Documents/Laboratarium/academic-research-rag-chatbot/Mata_Kuliah_Informatika.txt",
    "/home/elizielx/Documents/Laboratarium/academic-research-rag-chatbot/Mata_Kuliah_D3_ADMINISTRASI_PERKANTORAN.txt",
];

for (const filePath of files) {
    const fileName = filePath.split("/").pop() || "";
    console.log(`\n${"=".repeat(80)}`);
    console.log(`FILE: ${fileName}`);
    console.log("=".repeat(80));

    const content = readFileSync(filePath, "utf-8");
    const result = parseAndSerializeReport(content);

    console.log(`\nIs Structured Report: ${result.isStructuredReport}`);

    if (result.isStructuredReport && result.parsedReport) {
        console.log(`Total Sections: ${result.parsedReport.sections.length}`);

        // Show section structure
        console.log("\nSection Structure:");
        for (let i = 0; i < Math.min(15, result.parsedReport.sections.length); i++) {
            const section = result.parsedReport.sections[i];
            const titlePreview = section.title ? `"${section.title.substring(0, 50)}"` : "(no title)";
            console.log(
                `  ${(i + 1).toString().padStart(2)}. ${titlePreview.padEnd(55)} | Tables: ${section.tables.length}, Metadata: ${section.metadata.length}`
            );
        }

        // Count sections with tables
        const sectionsWithTables = result.parsedReport.sections.filter((s) => s.tables.length > 0);
        console.log(`\nSections with Tables: ${sectionsWithTables.length}`);

        // Analyze table entries
        const allTableRows = sectionsWithTables.flatMap((s) => s.tables.flatMap((t) => t.rows));
        console.log(`Total Table Entries: ${allTableRows.length}`);
    }

    // Analyze serialized output
    console.log("\n--- Serialized Output Analysis ---");
    const lines = result.serializedText.split("\n");
    const courseLines = lines.filter((line) => line.includes("Nama Mata Kuliah:") || line.includes("Kode:"));

    console.log(`Total Lines: ${lines.length}`);
    console.log(`Course Entry Lines: ${courseLines.length}`);

    // Check context preservation
    const contextLines = courseLines.filter((line) => line.startsWith("["));
    console.log(`Lines with Context: ${contextLines.length} / ${courseLines.length}`);

    // Sample entries
    console.log("\nSample Course Entries (first 5):");
    for (const line of courseLines.slice(0, 5)) {
        const preview = line.length > 100 ? `${line.substring(0, 100)}...` : line;
        console.log(`  ${preview}`);
    }

    // Extract unique contexts (semesters/sections)
    const contexts = new Set<string>();
    for (const line of courseLines) {
        const match = line.match(/^\[([^\]]+)\]/);
        if (match) {
            contexts.add(match[1]);
        }
    }

    console.log(`\nUnique Contexts Found: ${contexts.size}`);
    console.log("Contexts:");
    for (const ctx of Array.from(contexts).slice(0, 10)) {
        console.log(`  - ${ctx}`);
    }

    // Check for prerequisite information
    const prereqLines = lines.filter((line) => line.toLowerCase().includes("prasyarat"));
    console.log(`\nPrerequisite Lines: ${prereqLines.length}`);
    if (prereqLines.length > 0) {
        console.log("Sample Prerequisites:");
        for (const line of prereqLines.slice(0, 3)) {
            const preview = line.length > 80 ? `${line.substring(0, 80)}...` : line;
            console.log(`  ${preview}`);
        }
    }

    console.log("\n✓ Context Preservation:", contextLines.length === courseLines.length ? "YES" : "NO");
}

console.log("\n" + "=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));
console.log("Both course files have been analyzed. Check if:");
console.log("  1. All course entries have semester context (e.g., [SEMESTER 1])");
console.log("  2. Prerequisite information is preserved");
console.log("  3. No course/semester associations are lost");
