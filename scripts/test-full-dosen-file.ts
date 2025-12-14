/**
 * Test script to verify ASCII report parsing with the full Dosen_Semua_Prodi.txt file
 */

import { readFileSync } from "node:fs";
import { parseAndSerializeReport } from "../src/lib/rag/parsers/ascii-report";

const filePath = "/home/elizielx/Documents/Laboratarium/academic-research-rag-chatbot/Dosen_Semua_Prodi.txt";
const content = readFileSync(filePath, "utf-8");

console.log("=== Testing Full Dosen_Semua_Prodi.txt File ===\n");

const result = parseAndSerializeReport(content);

console.log("Is Structured Report:", result.isStructuredReport);

if (result.isStructuredReport && result.parsedReport) {
    console.log(`Total Sections: ${result.parsedReport.sections.length}`);

    // Debug: show first few section titles
    console.log("\nFirst 10 Section Titles:");
    for (let i = 0; i < Math.min(10, result.parsedReport.sections.length); i++) {
        const section = result.parsedReport.sections[i];
        console.log(
            `  ${i + 1}. "${section.title}" (tables: ${section.tables.length}, metadata: ${section.metadata.length})`
        );
    }

    // Count sections with tables
    const sectionsWithTables = result.parsedReport.sections.filter((s) => s.tables.length > 0);
    console.log(`\nSections with Tables: ${sectionsWithTables.length}`);

    // Count total rows
    const totalRows = sectionsWithTables.reduce(
        (sum, s) => sum + s.tables.reduce((tSum, t) => tSum + t.rows.length, 0),
        0
    );
    console.log(`Total Dosen Entries: ${totalRows}`);
}

console.log("\n=== Sample Serialized Entries ===\n");

// Get sample entries from different study programs
const lines = result.serializedText.split("\n");
const dosenLines = lines.filter((line) => line.includes("Nama Dosen:"));

// Show first 10 entries
console.log("First 10 Dosen Entries:");
for (const line of dosenLines.slice(0, 10)) {
    console.log(`  ${line.substring(0, 120)}...`);
}

// Verify context preservation
console.log("\n=== Context Preservation Check ===");
const hasContext = dosenLines.every((line) => line.startsWith("["));
const contextCount = dosenLines.filter((line) => line.includes("[")).length;

console.log(`Lines with Context: ${contextCount} / ${dosenLines.length}`);
console.log(`✓ All entries have context: ${hasContext ? "YES" : "NO"}`);

// Sample different study programs
console.log("\n=== Study Programs Found ===");
const studyPrograms = new Set<string>();
for (const line of dosenLines) {
    const match = line.match(/^\[([^\]]+)\]/);
    if (match) {
        studyPrograms.add(match[1]);
    }
}
console.log(`Total Study Programs: ${studyPrograms.size}`);
console.log("Sample Programs:");
for (const program of Array.from(studyPrograms).slice(0, 10)) {
    console.log(`  - ${program}`);
}
