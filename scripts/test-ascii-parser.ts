/**
 * Test script to verify ASCII report parsing with hierarchical context preservation
 */

import { parseAndSerializeReport } from "../src/lib/rag/parsers/ascii-report";

const sampleReport = `
================================================================================
DATA DOSEN - SEMUA PROGRAM STUDI
Universitas Mulia
================================================================================

Dibuat: 11 December 2025, 18:51 WIB
Total Dosen: 141


================================================================================
D3 - MANAJEMEN INDUSTRI
================================================================================
Jumlah Dosen: 5
--------------------------------------------------------------------------------

No   | NIDN            | Nama Dosen
-----+-----------------+--------------------------------------------------------
   1 | 1111027702      | Fx Nanang Sujatmiko, S.Kom., M.M.
   2 | 1109118503      | Musilatin Nikmah, S.Gz., M.M.
   3 | 803098303       | Rizki Fajar Putranto, S.E., M.M.


================================================================================
S1 - INFORMATIKA
================================================================================
Jumlah Dosen: 3
--------------------------------------------------------------------------------

No   | NIDN            | Nama Dosen
-----+-----------------+--------------------------------------------------------
   1 | 1125058801      | Andi Karmila Ningsih, S.Pd., M.A.
   2 | 1107017101      | Djumhadi, S.T., M.Kom.
   3 | 8998420021      | Dr. Muhammad Rusli, M.T.
`;

console.log("=== Testing ASCII Report Parser with Context Preservation ===\n");

const result = parseAndSerializeReport(sampleReport);

console.log("Is Structured Report:", result.isStructuredReport);

if (result.isStructuredReport && result.parsedReport) {
    console.log("\n=== Parsed Structure ===");
    console.log(`Total Sections: ${result.parsedReport.sections.length}`);
    for (let i = 0; i < result.parsedReport.sections.length; i++) {
        const section = result.parsedReport.sections[i];
        console.log(`\nSection ${i + 1}:`);
        console.log(`  Title: ${section.title}`);
        console.log(`  Tables: ${section.tables.length}`);
        console.log(`  Metadata: ${section.metadata.length}`);
        if (section.tables.length > 0) {
            console.log(`  First Table Title: ${section.tables[0].title || "(none)"}`);
            console.log(`  First Table Rows: ${section.tables[0].rows.length}`);
            console.log("  Sample Row:", JSON.stringify(section.tables[0].rows[0]));
        }
    }
}

console.log("\n=== Serialized Output ===\n");
console.log(result.serializedText);
console.log("\n=== Analysis ===");

// Check if study program context is preserved
const lines = result.serializedText.split("\n");
const dosenLines = lines.filter((line) => line.includes("Nama Dosen:"));

console.log("\nSample Dosen Entries:");
for (const line of dosenLines.slice(0, 5)) {
    console.log(`  ${line}`);
}

// Verify context preservation
const hasStudyProgramContext = dosenLines.some(
    (line) => line.includes("D3 - MANAJEMEN INDUSTRI") || line.includes("S1 - INFORMATIKA")
);

console.log("\n✓ Study Program Context Preserved:", hasStudyProgramContext ? "YES" : "NO");
