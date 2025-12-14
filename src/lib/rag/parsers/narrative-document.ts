/**
 * @fileoverview Narrative Document Parser for Wikipedia-style Content
 *
 * WHY This Module:
 * - Narrative documents (Wikipedia exports, formatted articles) have decorative delimiters
 * - ASCII art boxes and separator lines waste tokens in chunks
 * - Key-value metadata sections need clean formatting
 * - Section headers should be preserved but delimiters removed
 *
 * Processing Goals:
 * 1. Remove decorative delimiter lines (====, ----, etc.)
 * 2. Clean up ASCII art boxes while preserving headers
 * 3. Format key-value pairs cleanly
 * 4. Preserve paragraph structure and narrative flow
 * 5. Keep section organization for context
 */

// Module-level patterns
const DELIMITER_LINE_PATTERN = /^[=\-+*_]{3,}$/;
const CENTERED_HEADER_PATTERN = /^\s{10,}(.+?)\s{10,}$/; // Heavily padded text (centered)
const KEY_VALUE_INDENT_PATTERN = /^(\s+)([A-Za-z][A-Za-z\s]+?):\s*$/; // "  Moto:" on separate line
const KEY_VALUE_INLINE_PATTERN = /^([A-Za-z][A-Za-z\s]+?):\s*(.+)$/; // "Moto: value" on same line
const SECTION_HEADER_PATTERN = /^([A-Z][A-Z\s0-9]+)$/; // ALL CAPS section headers
const MULTIPLE_BLANK_LINES_PATTERN = /\n{3,}/g;
const LEADING_TRAILING_BLANK_PATTERN = /^\s+|\s+$/g;

export interface NarrativeParserResult {
    isNarrative: boolean;
    cleanedText: string;
    sections: Array<{
        title: string;
        content: string;
    }>;
    metadata: Record<string, string>;
}

/**
 * Detects if text is a narrative document with decorative formatting
 *
 * Characteristics:
 * - Multiple long delimiter lines (====, ----)
 * - Centered headers (heavily padded)
 * - Key-value pairs with indentation
 * - Narrative paragraphs (>80 chars)
 * - Few or no ASCII tables
 */
export function isNarrativeDocument(text: string): boolean {
    const lines = text.split("\n");

    // Count delimiter lines
    const delimiterLines = lines.filter((line) => DELIMITER_LINE_PATTERN.test(line.trim())).length;

    // Count centered headers
    const centeredHeaders = lines.filter((line) => CENTERED_HEADER_PATTERN.test(line)).length;

    // Count key-value pairs
    const keyValueLines = lines.filter((line) => {
        const trimmed = line.trim();
        return KEY_VALUE_INLINE_PATTERN.test(trimmed) || KEY_VALUE_INDENT_PATTERN.test(line);
    }).length;

    // Count prose lines (long lines without table markers)
    const proseLines = lines.filter((line) => {
        const trimmed = line.trim();
        return trimmed.length > 80 && !trimmed.includes("|") && !DELIMITER_LINE_PATTERN.test(trimmed);
    }).length;

    // Narrative documents should have:
    // - Many delimiter lines (decorative)
    // - Some centered headers OR key-value pairs
    // - At least some prose content
    return delimiterLines >= 5 && (centeredHeaders >= 1 || keyValueLines >= 3) && proseLines >= 1;
}

/**
 * Parse and clean narrative document
 */
export function parseNarrativeDocument(text: string): NarrativeParserResult {
    const lines = text.split("\n");
    const sections: Array<{ title: string; content: string }> = [];
    const globalMetadata: Record<string, string> = {};

    let currentSection: { title: string; lines: string[] } | null = null;
    let inMetadataBlock = false;
    let pendingMetadataKey: string | null = null;

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip delimiter lines entirely
        if (DELIMITER_LINE_PATTERN.test(trimmed)) {
            continue;
        }

        // Skip empty lines at boundaries
        if (!trimmed) {
            // Only preserve blank lines within sections (not at boundaries)
            if (currentSection && currentSection.lines.length > 0) {
                currentSection.lines.push("");
            }
            continue;
        }

        // Check for centered headers (extract clean text)
        const centeredMatch = CENTERED_HEADER_PATTERN.exec(line);
        if (centeredMatch) {
            const headerText = centeredMatch[1].trim();

            // Start new section
            if (currentSection) {
                sections.push({
                    title: currentSection.title,
                    content: currentSection.lines.join("\n").trim(),
                });
            }

            currentSection = { title: headerText, lines: [] };
            inMetadataBlock = false;
            continue;
        }

        // Check for ALL CAPS section headers
        if (SECTION_HEADER_PATTERN.test(trimmed) && trimmed.length < 50) {
            // Start new section
            if (currentSection) {
                sections.push({
                    title: currentSection.title,
                    content: currentSection.lines.join("\n").trim(),
                });
            }

            currentSection = { title: trimmed, lines: [] };
            inMetadataBlock = trimmed === "INFORMASI UMUM" || trimmed.includes("METADATA");
            continue;
        }

        // Check for key-value pairs (multi-line format: key on one line, value on next)
        const kvIndentMatch = KEY_VALUE_INDENT_PATTERN.exec(line);
        if (kvIndentMatch) {
            const key = kvIndentMatch[2].trim();
            pendingMetadataKey = key;
            continue; // Value comes on next line(s)
        }

        // Check for inline key-value pairs (key: value on same line)
        const kvInlineMatch = KEY_VALUE_INLINE_PATTERN.exec(trimmed);
        if (kvInlineMatch) {
            const key = kvInlineMatch[1].trim();
            const value = kvInlineMatch[2].trim();

            if (inMetadataBlock || !currentSection) {
                globalMetadata[key] = value;
            }

            // Also add as clean line to section
            if (currentSection) {
                currentSection.lines.push(`${key}: ${value}`);
            }
            continue;
        }

        // If we have a pending metadata key, this line is the value
        if (pendingMetadataKey) {
            const value = trimmed;
            if (inMetadataBlock || !currentSection) {
                globalMetadata[pendingMetadataKey] = value;
            }

            // Add as clean line
            if (currentSection) {
                currentSection.lines.push(`${pendingMetadataKey}: ${value}`);
            }

            pendingMetadataKey = null;
            continue;
        }

        // Regular content line - add to current section
        if (currentSection) {
            currentSection.lines.push(trimmed);
        }
    }

    // Add final section
    if (currentSection) {
        sections.push({
            title: currentSection.title,
            content: currentSection.lines.join("\n").trim(),
        });
    }

    // Build cleaned text
    const cleanedParts: string[] = [];

    // Add global metadata if any
    if (Object.keys(globalMetadata).length > 0) {
        cleanedParts.push("# Informasi Dokumen\n");
        for (const [key, value] of Object.entries(globalMetadata)) {
            cleanedParts.push(`${key}: ${value}`);
        }
        cleanedParts.push("");
    }

    // Add sections
    for (const section of sections) {
        cleanedParts.push(`\n## ${section.title}\n`);
        cleanedParts.push(section.content);
        cleanedParts.push("");
    }

    let cleanedText = cleanedParts.join("\n");

    // Clean up excessive blank lines
    cleanedText = cleanedText.replace(MULTIPLE_BLANK_LINES_PATTERN, "\n\n");
    cleanedText = cleanedText.replace(LEADING_TRAILING_BLANK_PATTERN, "");

    return {
        isNarrative: true,
        cleanedText,
        sections,
        metadata: globalMetadata,
    };
}

/**
 * Main entry point: Detect and parse narrative documents
 */
export function parseAndCleanNarrative(text: string): {
    isNarrative: boolean;
    cleanedText: string;
    originalText: string;
} {
    const isNarrative = isNarrativeDocument(text);

    if (!isNarrative) {
        return {
            isNarrative: false,
            cleanedText: text,
            originalText: text,
        };
    }

    const result = parseNarrativeDocument(text);

    return {
        isNarrative: true,
        cleanedText: result.cleanedText,
        originalText: text,
    };
}
