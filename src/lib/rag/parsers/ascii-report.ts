/**
 * @fileoverview ASCII Report Parser for Structured Text Preprocessing
 *
 * WHY This Module:
 * - Indonesian academic reports often have rigid ASCII structures
 * - Raw chunking destroys table context (headers separated from data)
 * - ASCII noise (|, +, =, -) wastes tokens and confuses embeddings
 *
 * Processing Pipeline:
 * 1. Detection: Check if text matches structured report patterns
 * 2. Parsing: Extract tables, key-value pairs, and sections
 * 3. Serialization: Convert to LLM-ready natural language sentences
 *
 * Key Features:
 * - Robust whitespace handling in ASCII tables
 * - Context preservation (rows inherit section/header context)
 * - Indonesian-focused sentence templates
 */

import type { AsciiReportParserResult, KeyValuePair, ParsedReport, ParsedSection, ParsedTable } from "./types";

// ============================================================================
// Detection Patterns
// ============================================================================

/**
 * Patterns that indicate a structured ASCII report
 */
const STRUCTURED_REPORT_PATTERNS = {
    // ASCII table patterns: | column1 | column2 |
    tableRow: /^\s*\|.+\|/m,
    // Table separator: +----+----+ or |----|----|
    tableSeparator: /^[\s|+]*[-+]+[\s|+]*$/m,
    // Section delimiters: ====== or ------
    sectionDelimiter: /^[=]{3,}$|^[-]{3,}$/m,
    // Key-Value patterns: Key: Value or Key : Value
    keyValue: /^[A-Za-z\s]+\s*:\s*.+$/m,
    // Header patterns (all caps or title case with delimiters)
    header: /^[A-Z][A-Z\s]+[A-Z]$/m,
};

/**
 * Minimum thresholds for detection
 */
const DETECTION_THRESHOLDS = {
    minTableRows: 2, // At least 2 table-like rows
    minKeyValuePairs: 2, // At least 2 key-value pairs
    minPatternMatches: 3, // Total pattern matches needed
};

// Top-level regex patterns for performance (Biome lint requirement)
const TABLE_SEPARATOR_LINE_PATTERN = /^[|+\-\s]+$/;
const TABLE_CELL_SPLIT_PATTERN = /\s*\|\s*/;
const KV_SEPARATOR_LINE_PATTERN = /^[-=+]+$/;
const KV_PATTERN = /^([A-Za-z][A-Za-z0-9\s]*?)\s*:\s*(.+)$/;
const TITLE_PUNCTUATION_PATTERN = /[.!?]$/;
const ALL_CAPS_TITLE_PATTERN = /^[A-Z][A-Z\s0-9]+$/;
// Prerequisite parsing patterns
const BULLET_POINT_PATTERN = /^[•\-*]\s+/;
const PREREQ_SECTION_PATTERN = /mata\s+kuliah\s+dengan\s+prasyarat/i;
const PREREQ_LINE_PATTERN = /prasyarat/i;
const PREREQ_VALUE_PATTERN = /prasyarat\s*:\s*(.+)/i;
// Section splitting patterns
const LINE_SPLIT_PATTERN = /\r?\n/;
const EQUALS_DELIMITER_PATTERN = /^=+$/;
const DASH_DELIMITER_PATTERN = /^-+$/;

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Detects if the input text is a structured ASCII report
 *
 * WHY Pattern Scoring:
 * - Single pattern match isn't reliable (could be coincidence)
 * - Multiple patterns increase confidence
 * - Different patterns have different weights
 *
 * @param text - Raw text to analyze
 * @returns True if text appears to be a structured report
 */
export function isStructuredAsciiReport(text: string): boolean {
    const lines = text.split("\n");
    let score = 0;

    // Count table-like rows (lines with | characters)
    const tableRowMatches = lines.filter((line) => STRUCTURED_REPORT_PATTERNS.tableRow.test(line)).length;
    if (tableRowMatches >= DETECTION_THRESHOLDS.minTableRows) {
        score += 2;
    }

    // Count table separators (+----+ or |----| patterns)
    const separatorMatches = lines.filter((line) => STRUCTURED_REPORT_PATTERNS.tableSeparator.test(line)).length;
    if (separatorMatches >= 1) {
        score += 1;
    }

    // Count section delimiters (====== or ------)
    const delimiterMatches = lines.filter((line) => STRUCTURED_REPORT_PATTERNS.sectionDelimiter.test(line)).length;
    if (delimiterMatches >= 1) {
        score += 1;
    }

    // Count key-value pairs
    const keyValueMatches = lines.filter((line) => STRUCTURED_REPORT_PATTERNS.keyValue.test(line)).length;
    if (keyValueMatches >= DETECTION_THRESHOLDS.minKeyValuePairs) {
        score += 1;
    }

    return score >= DETECTION_THRESHOLDS.minPatternMatches;
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Normalizes whitespace in a cell value
 *
 * @param cell - Raw cell content
 * @returns Trimmed and normalized cell value
 */
function normalizeCell(cell: string): string {
    return cell.trim().replace(/\s+/g, " ");
}

/**
 * Parses an ASCII table from lines of text
 *
 * WHY Robust Whitespace Handling:
 * - Tables may have inconsistent spacing
 * - Cell content may have leading/trailing spaces
 * - Separator lines should be skipped
 *
 * @param lines - Lines containing the table (including separators)
 * @param title - Optional table title
 * @returns Parsed table structure or null if parsing fails
 */
export function parseAsciiTable(lines: string[], title?: string): ParsedTable | null {
    // Filter out separator lines (----, +--+, etc.)
    const dataLines = lines.filter((line) => {
        const trimmed = line.trim();
        // Skip empty lines
        if (!trimmed) return false;
        // Skip separator lines
        if (TABLE_SEPARATOR_LINE_PATTERN.test(trimmed)) return false;
        // Must contain pipe character
        return trimmed.includes("|");
    });

    if (dataLines.length < 2) {
        return null; // Need at least header + 1 data row
    }

    // Parse header row (first data line)
    const headerLine = dataLines[0];
    const headers = headerLine
        .split(TABLE_CELL_SPLIT_PATTERN)
        .filter((h) => h.trim().length > 0)
        .map(normalizeCell);

    if (headers.length === 0) {
        return null;
    }

    // Parse data rows
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < dataLines.length; i++) {
        const cells = dataLines[i]
            .split(TABLE_CELL_SPLIT_PATTERN)
            .filter((c) => c.trim().length > 0)
            .map(normalizeCell);

        if (cells.length > 0) {
            const row: Record<string, string> = {};
            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = cells[j] || "";
            }
            rows.push(row);
        }
    }

    return {
        headers,
        rows,
        title,
    };
}

/**
 * Parses prerequisite list structure
 *
 * Format:
 * • COURSE NAME
 *   Prasyarat: prerequisite1, prerequisite2
 *
 * @param text - Text to parse
 * @returns Array of key-value pairs with course-prerequisite relationships
 */
function parsePrerequisiteList(text: string): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    const lines = text.split("\n");

    let currentCourse: string | null = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check if line starts with bullet point (•, -, *)
        if (BULLET_POINT_PATTERN.test(trimmed)) {
            // This is a course name
            currentCourse = trimmed.replace(BULLET_POINT_PATTERN, "").trim();
        } else if (currentCourse && PREREQ_LINE_PATTERN.test(trimmed)) {
            // This is a prerequisite line for the current course
            const match = PREREQ_VALUE_PATTERN.exec(trimmed);
            if (match) {
                const prereq = match[1].trim();
                pairs.push({
                    key: `Prasyarat ${currentCourse}`,
                    value: prereq,
                });
            }
        }
    }

    return pairs;
}

/**
 * Extracts key-value pairs from text
 *
 * Patterns matched:
 * - "Key: Value"
 * - "Key : Value"
 * - "Key    :    Value"
 *
 * WHY Prerequisite Detection:
 * - Prerequisite sections have special bullet-point list structure
 * - Need to preserve course-prerequisite associations
 *
 * @param text - Text to parse
 * @returns Array of key-value pairs
 */
export function parseKeyValuePairs(text: string): KeyValuePair[] {
    // Check if this is a prerequisite section
    if (PREREQ_SECTION_PATTERN.test(text)) {
        return parsePrerequisiteList(text);
    }

    const pairs: KeyValuePair[] = [];
    const lines = text.split("\n");

    for (const line of lines) {
        const trimmed = line.trim();
        // Skip lines that look like table rows
        if (trimmed.includes("|")) continue;
        // Skip separator lines
        if (KV_SEPARATOR_LINE_PATTERN.test(trimmed)) continue;

        const match = KV_PATTERN.exec(trimmed);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            // Validate: key shouldn't be too long (likely not a key-value pair)
            if (key.length <= 50 && value.length > 0) {
                pairs.push({ key, value });
            }
        }
    }

    return pairs;
}

/**
 * Splits text into sections based on delimiters
 *
 * WHY Full-Width Delimiter Check:
 * - Short `----` lines are used as table separators and subsection markers
 * - Only full-width delimiters (60+ chars) should split major sections
 * - This prevents over-splitting of prerequisite sections and table internals
 *
 * Delimiters recognized:
 * - ======= (major section, 60+ chars)
 * - ------- (minor section, 60+ chars)
 *
 * @param text - Text to split
 * @returns Array of text chunks (sections)
 */
function splitIntoSections(text: string): string[] {
    const lines = text.split(LINE_SPLIT_PATTERN);
    const sections: string[] = [];
    let currentSection: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Check if this is a full-width delimiter line
        // Must be at least 60 characters of = or - to be a section delimiter
        const isFullDelimiter =
            (EQUALS_DELIMITER_PATTERN.test(trimmed) && trimmed.length >= 60) ||
            (DASH_DELIMITER_PATTERN.test(trimmed) && trimmed.length >= 60);

        if (isFullDelimiter) {
            // Check context: Don't split if previous line is a prerequisite header
            const prevLine = i > 0 ? lines[i - 1].trim() : "";
            const isPrereqDelimiter = PREREQ_SECTION_PATTERN.test(prevLine);

            if (isPrereqDelimiter) {
                // This is a subsection delimiter, not a section delimiter
                // Keep it in the current section
                currentSection.push(line);
            } else if (currentSection.length > 0) {
                // This is a real section delimiter
                // Save current section if it has content
                sections.push(currentSection.join("\n"));
                currentSection = [];
                // Skip the delimiter line itself
            }
        } else {
            currentSection.push(line);
        }
    }

    // Add final section
    if (currentSection.length > 0) {
        sections.push(currentSection.join("\n"));
    }

    return sections.filter((s) => s.trim().length > 0);
}

/**
 * Extracts tables from a section of text
 *
 * @param text - Section text
 * @returns Array of parsed tables
 */
function extractTablesFromSection(text: string): { tables: ParsedTable[]; remainingText: string } {
    const lines = text.split("\n");
    const tables: ParsedTable[] = [];
    const nonTableLines: string[] = [];

    let currentTableLines: string[] = [];
    let tableTitle: string | undefined;
    let inTable = false;

    for (const line of lines) {
        // A line is part of a table if:
        // 1. It contains | (actual table row), OR
        // 2. It's a separator line AND we're currently in a table
        const hasPipe = line.includes("|");
        const isSeparator = TABLE_SEPARATOR_LINE_PATTERN.test(line.trim());
        const isTableLine = hasPipe || (isSeparator && inTable);

        if (isTableLine) {
            if (!inTable) {
                // Starting a new table, check if previous line was title
                if (nonTableLines.length > 0) {
                    const lastLine = nonTableLines.at(-1)?.trim() ?? "";
                    // If last line looks like a title (non-empty, not too long, no punctuation at end)
                    if (lastLine.length > 0 && lastLine.length < 100 && !TITLE_PUNCTUATION_PATTERN.test(lastLine)) {
                        tableTitle = lastLine;
                        nonTableLines.pop();
                    }
                }
                inTable = true;
            }
            currentTableLines.push(line);
        } else {
            if (inTable) {
                // End of table
                const table = parseAsciiTable(currentTableLines, tableTitle);
                if (table) {
                    tables.push(table);
                }
                currentTableLines = [];
                tableTitle = undefined;
                inTable = false;
            }
            nonTableLines.push(line);
        }
    }

    // Handle table at end of section
    if (currentTableLines.length > 0) {
        const table = parseAsciiTable(currentTableLines, tableTitle);
        if (table) {
            tables.push(table);
        }
    }

    return {
        tables,
        remainingText: nonTableLines.join("\n"),
    };
}

/**
 * Parses a section of text into structured data
 *
 * @param sectionText - Raw section text
 * @returns Parsed section
 */
function parseSection(sectionText: string): ParsedSection {
    const lines = sectionText.split("\n").filter((l) => l.trim().length > 0);

    // Try to extract section title (first line if it looks like a header)
    let title: string | undefined;
    let contentStart = 0;

    if (lines.length > 0) {
        const firstLine = lines[0].trim();
        // Check if first line is a title (all caps, or short non-sentence)
        if (
            ALL_CAPS_TITLE_PATTERN.test(firstLine) ||
            (firstLine.length < 80 && !TITLE_PUNCTUATION_PATTERN.test(firstLine) && !firstLine.includes("|"))
        ) {
            title = firstLine;
            contentStart = 1;
        }
    }

    const contentText = lines.slice(contentStart).join("\n");
    const { tables, remainingText } = extractTablesFromSection(contentText);
    const metadata = parseKeyValuePairs(remainingText);

    return {
        title,
        content: sectionText,
        tables,
        metadata,
    };
}

/**
 * Parses a complete ASCII report into structured data
 *
 * @param text - Raw report text
 * @returns Parsed report structure
 */
export function parseReport(text: string): ParsedReport {
    const sectionTexts = splitIntoSections(text);

    // Parse all sections
    const sections = sectionTexts.map(parseSection);

    // Extract global metadata from the first section (before first delimiter)
    // or from lines before any table
    const globalMetadata = sections.length > 0 ? sections[0].metadata : [];

    return {
        sections,
        globalMetadata,
        rawText: text,
    };
}

// ============================================================================
// Serialization Functions
// ============================================================================

/**
 * Serializes a table row to a descriptive sentence
 *
 * @param row - Row data (column -> value mapping)
 * @param headers - Column headers
 * @param tableTitle - Optional table title for context
 * @param sectionContext - Optional section title for hierarchical context (e.g., study program)
 * @returns Natural language sentence describing the row
 */
function serializeRowToSentence(
    row: Record<string, string>,
    headers: string[],
    tableTitle?: string,
    sectionContext?: string
): string {
    const parts: string[] = [];

    for (const header of headers) {
        const value = row[header];
        if (value && value.trim().length > 0) {
            parts.push(`${header}: ${value}`);
        }
    }

    if (parts.length === 0) {
        return "";
    }

    const base = parts.join(", ");

    // Build context prefix with section and table title
    const contextParts: string[] = [];
    if (sectionContext) {
        contextParts.push(sectionContext);
    }
    if (tableTitle) {
        contextParts.push(tableTitle);
    }

    if (contextParts.length > 0) {
        return `[${contextParts.join(" - ")}] ${base}.`;
    }

    return `${base}.`;
}

/**
 * Serializes a table to natural language sentences
 *
 * @param table - Parsed table
 * @param sectionContext - Optional section title for hierarchical context
 * @returns Array of sentences, one per row
 */
export function serializeTableToSentences(table: ParsedTable, sectionContext?: string): string[] {
    return table.rows
        .map((row) => serializeRowToSentence(row, table.headers, table.title, sectionContext))
        .filter((s) => s.length > 0);
}

/**
 * Serializes key-value pairs to natural language
 *
 * @param pairs - Key-value pairs
 * @returns Sentences describing the metadata
 */
export function serializeKeyValuesToSentences(pairs: KeyValuePair[]): string[] {
    return pairs.map((pair) => `${pair.key} adalah ${pair.value}.`);
}

/**
 * Serializes a parsed section to natural language
 *
 * @param section - Parsed section
 * @param effectiveContext - Context from parent/previous sections (for sections without title)
 * @returns Natural language text
 */
function serializeSection(section: ParsedSection, effectiveContext?: string): string {
    const parts: string[] = [];

    // Add section title if present
    if (section.title) {
        parts.push(`## ${section.title}`);
        parts.push("");
    }

    // Serialize metadata
    if (section.metadata.length > 0) {
        parts.push(...serializeKeyValuesToSentences(section.metadata));
        parts.push("");
    }

    // Serialize tables with effective context (section title or inherited context)
    const contextForTables = section.title || effectiveContext;
    for (const table of section.tables) {
        if (table.title) {
            parts.push(`### ${table.title}`);
        }
        // Pass effective context for hierarchical information
        parts.push(...serializeTableToSentences(table, contextForTables));
        parts.push("");
    }

    return parts.join("\n").trim();
}

/**
 * Serializes a complete parsed report to LLM-ready text
 *
 * WHY Context Propagation:
 * - Section delimiters (====, ----) split study program names from tables
 * - Tables end up in sections with undefined title
 * - Need to look back at recent sections for hierarchical context
 *
 * @param report - Parsed report
 * @returns Natural language text suitable for embedding
 */
export function serializeReport(report: ParsedReport): string {
    const parts: string[] = [];

    // Serialize global metadata first
    if (report.globalMetadata.length > 0) {
        parts.push("# Informasi Umum");
        parts.push("");
        parts.push(...serializeKeyValuesToSentences(report.globalMetadata));
        parts.push("");
    }

    // Track the most recent meaningful section title for context propagation
    // Separate tracking for "major" context (study programs, departments) vs metadata
    let lastMajorContext: string | undefined;

    // Serialize each section with context propagation
    for (const section of report.sections) {
        // Update major context if this section has a meaningful title
        // Major sections are typically study programs, departments, etc.
        // Metadata-like titles (containing ":") are not considered major context
        if (section.title && section.title.trim().length > 0 && !section.title.includes(":")) {
            lastMajorContext = section.title;
        }

        // For sections with tables, use major context (not metadata titles)
        // This ensures "D3 - MANAJEMEN INDUSTRI" is used instead of "Jumlah Dosen: 5"
        const effectiveContext = section.tables.length > 0 ? lastMajorContext : section.title || lastMajorContext;

        // Serialize section with effective context
        const serialized = serializeSection(section, effectiveContext);
        if (serialized.length > 0) {
            parts.push(serialized);
            parts.push("");
        }
    }

    return parts.join("\n").trim();
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Main entry point: Parse and serialize an ASCII report
 *
 * This function:
 * 1. Detects if input is a structured report
 * 2. Parses tables, sections, and metadata
 * 3. Serializes to natural language text
 *
 * @param text - Raw text to process
 * @returns Parser result with detection flag, parsed data, and serialized text
 */
export function parseAndSerializeReport(text: string): AsciiReportParserResult {
    const isStructured = isStructuredAsciiReport(text);

    if (!isStructured) {
        return {
            isStructuredReport: false,
            serializedText: text,
            originalText: text,
        };
    }

    const parsedReport = parseReport(text);
    const serializedText = serializeReport(parsedReport);

    return {
        isStructuredReport: true,
        parsedReport,
        serializedText: serializedText.length > 0 ? serializedText : text,
        originalText: text,
    };
}
