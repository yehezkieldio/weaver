/**
 * @fileoverview Data Validation for RAG Evaluation Pipeline
 *
 * This module provides comprehensive data integrity validation before statistical analysis.
 * Validates that evaluation metrics are within valid ranges, detects null values,
 * and ensures minimum sample sizes for statistical significance.
 *
 * WHY this matters:
 * - Parametric statistical tests assume data is complete and within expected ranges
 * - Null values can silently break statistical calculations or produce NaN results
 * - Insufficient sample sizes lead to unreliable statistical conclusions
 * - Early detection of data issues prevents wasted computation and misleading results
 */

/**
 * Single data validation issue
 */
export interface DataValidationIssue {
    type: "null_value" | "out_of_range" | "insufficient_sample" | "high_null_rate" | "invalid_value";
    field: string;
    count: number;
    severity: "low" | "medium" | "high";
    message: string;
    messageId: string;
}

/**
 * Complete data validation result
 */
export interface DataValidationResult {
    isValid: boolean;
    totalRecords: number;
    validRecords: number;
    qualityScore: number; // 0-1, higher is better
    issues: DataValidationIssue[];
    warnings: string[];
    warningsId: string[];
}

/**
 * Minimum sample size requirements by test type
 * Based on statistical power analysis recommendations
 */
export const MINIMUM_SAMPLE_SIZES: Record<string, number> = {
    descriptive: 3,
    paired_ttest: 5,
    independent_ttest: 5,
    anova: 3, // Per group
    mann_whitney: 5,
    kruskal_wallis: 5, // Per group
    correlation: 5,
    bootstrap: 10,
};

/**
 * Valid metric ranges for evaluation metrics
 * Most RAGAS metrics are 0-1, latency is unbounded positive
 */
export const METRIC_RANGES: Record<string, { min: number; max: number }> = {
    faithfulness: { min: 0, max: 1 },
    answerRelevancy: { min: 0, max: 1 },
    contextPrecision: { min: 0, max: 1 },
    contextRecall: { min: 0, max: 1 },
    contextRelevancy: { min: 0, max: 1 },
    answerCorrectness: { min: 0, max: 1 },
    hallucinationRate: { min: 0, max: 1 },
    academicRigor: { min: 0, max: 1 },
    citationAccuracy: { min: 0, max: 1 },
    terminologyCorrectness: { min: 0, max: 1 },
    factualConsistency: { min: 0, max: 1 },
    sourceAttribution: { min: 0, max: 1 },
    contradictionScore: { min: 0, max: 1 },
    latencyMs: { min: 0, max: Number.POSITIVE_INFINITY },
    retrievalLatencyMs: { min: 0, max: Number.POSITIVE_INFINITY },
    rerankingLatencyMs: { min: 0, max: Number.POSITIVE_INFINITY },
    generationLatencyMs: { min: 0, max: Number.POSITIVE_INFINITY },
    agentReasoningLatencyMs: { min: 0, max: Number.POSITIVE_INFINITY },
};

/**
 * Validate that metric values are within expected range
 *
 * @param data - Array of numeric values
 * @param fieldName - Name of the field being validated
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns Validation issue if out-of-range values found, null otherwise
 */
export function validateMetricRange(data: number[], fieldName: string, min = 0, max = 1): DataValidationIssue | null {
    const outOfRange = data.filter((v) => v < min || v > max);

    if (outOfRange.length === 0) {
        return null;
    }

    const percentage = (outOfRange.length / data.length) * 100;
    let severity: "low" | "medium" | "high";
    if (percentage > 20) {
        severity = "high";
    } else if (percentage > 5) {
        severity = "medium";
    } else {
        severity = "low";
    }

    return {
        type: "out_of_range",
        field: fieldName,
        count: outOfRange.length,
        severity,
        message: `${outOfRange.length} values (${percentage.toFixed(1)}%) in "${fieldName}" are outside valid range [${min}, ${max}]`,
        messageId: `${outOfRange.length} nilai (${percentage.toFixed(1)}%) di "${fieldName}" berada di luar rentang valid [${min}, ${max}]`,
    };
}

/**
 * Detect null, undefined, or NaN values in data
 *
 * @param data - Array of possibly null/undefined values
 * @param fieldName - Name of the field being validated
 * @returns Validation issue if null values found, null otherwise
 */
export function validateNullValues(data: (number | null | undefined)[], fieldName: string): DataValidationIssue | null {
    const nullCount = data.filter((v) => v === null || v === undefined || Number.isNaN(v)).length;

    if (nullCount === 0) {
        return null;
    }

    const percentage = (nullCount / data.length) * 100;
    let severity: "low" | "medium" | "high";
    let type: DataValidationIssue["type"];

    if (percentage > 30) {
        severity = "high";
        type = "high_null_rate";
    } else if (percentage > 10) {
        severity = "medium";
        type = "high_null_rate";
    } else {
        severity = "low";
        type = "null_value";
    }

    return {
        type,
        field: fieldName,
        count: nullCount,
        severity,
        message: `${nullCount} null/missing values (${percentage.toFixed(1)}%) found in "${fieldName}"`,
        messageId: `${nullCount} nilai null/kosong (${percentage.toFixed(1)}%) ditemukan di "${fieldName}"`,
    };
}

/**
 * Validate minimum sample size for statistical test
 *
 * @param n - Sample size
 * @param testType - Type of statistical test
 * @param groupName - Optional group name for context
 * @returns Validation issue if sample too small, null otherwise
 */
export function validateSampleSize(n: number, testType: string, groupName?: string): DataValidationIssue | null {
    const minRequired = MINIMUM_SAMPLE_SIZES[testType] || 5;

    if (n >= minRequired) {
        return null;
    }

    const fieldLabel = groupName ? `${groupName} (n=${n})` : `sample (n=${n})`;

    return {
        type: "insufficient_sample",
        field: fieldLabel,
        count: n,
        severity: n < 2 ? "high" : "medium",
        message: `Sample size ${n} is below minimum ${minRequired} required for ${testType}`,
        messageId: `Ukuran sampel ${n} di bawah minimum ${minRequired} yang dibutuhkan untuk ${testType}`,
    };
}

/**
 * Detect invalid values (Infinity, -Infinity)
 *
 * @param data - Array of numeric values
 * @param fieldName - Name of the field being validated
 * @returns Validation issue if invalid values found, null otherwise
 */
export function validateInfiniteValues(data: number[], fieldName: string): DataValidationIssue | null {
    const invalidCount = data.filter((v) => !Number.isFinite(v)).length;

    if (invalidCount === 0) {
        return null;
    }

    return {
        type: "invalid_value",
        field: fieldName,
        count: invalidCount,
        severity: "high",
        message: `${invalidCount} infinite/invalid values found in "${fieldName}"`,
        messageId: `${invalidCount} nilai tak hingga/tidak valid ditemukan di "${fieldName}"`,
    };
}

/**
 * Calculate overall data quality score
 *
 * Quality score is based on:
 * - Completeness: Percentage of non-null values
 * - Validity: Percentage of in-range values
 * - Sample adequacy: Whether minimum sample sizes are met
 *
 * @param metrics - Record of field names to their value arrays
 * @returns Quality score between 0 and 1
 */
export function calculateDataQualityScore(metrics: Record<string, (number | null | undefined)[]>): number {
    const fieldNames = Object.keys(metrics);
    if (fieldNames.length === 0) return 0;

    let totalScore = 0;
    let fieldCount = 0;

    for (const fieldName of fieldNames) {
        const values = metrics[fieldName];
        if (!values || values.length === 0) continue;

        // Completeness score
        const nonNullCount = values.filter((v) => v !== null && v !== undefined && !Number.isNaN(v)).length;
        const completeness = nonNullCount / values.length;

        // Validity score (for 0-1 metrics)
        const numericValues = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
        const range = METRIC_RANGES[fieldName] || { min: 0, max: 1 };
        const inRangeCount = numericValues.filter((v) => v >= range.min && v <= range.max).length;
        const validity = numericValues.length > 0 ? inRangeCount / numericValues.length : 1;

        // Sample adequacy score
        const sampleAdequacy = Math.min(1, nonNullCount / MINIMUM_SAMPLE_SIZES.descriptive);

        // Weighted average: completeness (40%), validity (40%), sample (20%)
        const fieldScore = completeness * 0.4 + validity * 0.4 + sampleAdequacy * 0.2;
        totalScore += fieldScore;
        fieldCount += 1;
    }

    return fieldCount > 0 ? totalScore / fieldCount : 0;
}

/**
 * Comprehensive validation for evaluation data
 *
 * @param data - Array of evaluation data records
 * @returns Complete validation result with all issues and quality score
 */
export function validateEvaluationData(
    data: Array<{
        questionId: string;
        ragScores: Record<string, number>;
        nonRagScores: Record<string, number>;
    }>
): DataValidationResult {
    const issues: DataValidationIssue[] = [];
    const warnings: string[] = [];
    const warningsId: string[] = [];

    // Check overall sample size
    const sampleIssue = validateSampleSize(data.length, "descriptive", "evaluation data");
    if (sampleIssue) {
        issues.push(sampleIssue);
        warnings.push(`⚠️ ${sampleIssue.message}`);
        warningsId.push(`⚠️ ${sampleIssue.messageId}`);
    }

    // Collect all metric values for validation
    const ragMetrics: Record<string, (number | null)[]> = {};
    const nonRagMetrics: Record<string, (number | null)[]> = {};

    for (const record of data) {
        for (const [key, value] of Object.entries(record.ragScores)) {
            if (!ragMetrics[key]) ragMetrics[key] = [];
            ragMetrics[key].push(value);
        }
        for (const [key, value] of Object.entries(record.nonRagScores)) {
            if (!nonRagMetrics[key]) nonRagMetrics[key] = [];
            nonRagMetrics[key].push(value);
        }
    }

    // Validate each RAG metric
    for (const [fieldName, values] of Object.entries(ragMetrics)) {
        const numericValues = values.filter((v): v is number => v !== null);

        // Null check
        const nullIssue = validateNullValues(values, `rag.${fieldName}`);
        if (nullIssue) {
            issues.push(nullIssue);
            if (nullIssue.severity !== "low") {
                warnings.push(`⚠️ ${nullIssue.message}`);
                warningsId.push(`⚠️ ${nullIssue.messageId}`);
            }
        }

        // Range check
        const range = METRIC_RANGES[fieldName];
        if (range && numericValues.length > 0) {
            const rangeIssue = validateMetricRange(numericValues, `rag.${fieldName}`, range.min, range.max);
            if (rangeIssue) {
                issues.push(rangeIssue);
                warnings.push(`⚠️ ${rangeIssue.message}`);
                warningsId.push(`⚠️ ${rangeIssue.messageId}`);
            }
        }

        // Infinite check
        const infiniteIssue = validateInfiniteValues(numericValues, `rag.${fieldName}`);
        if (infiniteIssue) {
            issues.push(infiniteIssue);
            warnings.push(`⚠️ ${infiniteIssue.message}`);
            warningsId.push(`⚠️ ${infiniteIssue.messageId}`);
        }
    }

    // Validate each non-RAG metric
    for (const [fieldName, values] of Object.entries(nonRagMetrics)) {
        const numericValues = values.filter((v): v is number => v !== null);

        const nullIssue = validateNullValues(values, `nonRag.${fieldName}`);
        if (nullIssue) {
            issues.push(nullIssue);
            if (nullIssue.severity !== "low") {
                warnings.push(`⚠️ ${nullIssue.message}`);
                warningsId.push(`⚠️ ${nullIssue.messageId}`);
            }
        }

        const range = METRIC_RANGES[fieldName];
        if (range && numericValues.length > 0) {
            const rangeIssue = validateMetricRange(numericValues, `nonRag.${fieldName}`, range.min, range.max);
            if (rangeIssue) {
                issues.push(rangeIssue);
                warnings.push(`⚠️ ${rangeIssue.message}`);
                warningsId.push(`⚠️ ${rangeIssue.messageId}`);
            }
        }
    }

    // Calculate quality score
    const allMetrics: Record<string, (number | null)[]> = { ...ragMetrics };
    for (const [key, values] of Object.entries(nonRagMetrics)) {
        allMetrics[`nonRag_${key}`] = values;
    }
    const qualityScore = calculateDataQualityScore(allMetrics);

    // Determine overall validity
    const hasHighSeverityIssues = issues.some((i) => i.severity === "high");
    const validRecords = data.filter((d) => {
        const ragComplete = Object.values(d.ragScores).some((v) => v !== null && v !== undefined && !Number.isNaN(v));
        return ragComplete;
    }).length;

    return {
        isValid: !hasHighSeverityIssues && validRecords > 0,
        totalRecords: data.length,
        validRecords,
        qualityScore,
        issues,
        warnings,
        warningsId,
    };
}

/**
 * Comprehensive validation for ablation study data
 *
 * @param data - Array of ablation configuration data
 * @returns Complete validation result with all issues and quality score
 */
export function validateAblationData(
    data: Array<{
        configName: string;
        scores: Record<string, number[]>;
    }>
): DataValidationResult {
    const issues: DataValidationIssue[] = [];
    const warnings: string[] = [];
    const warningsId: string[] = [];

    // Check number of configurations
    if (data.length < 2) {
        const issue: DataValidationIssue = {
            type: "insufficient_sample",
            field: "configurations",
            count: data.length,
            severity: "high",
            message: `Only ${data.length} configuration(s) found. ANOVA requires at least 2 groups.`,
            messageId: `Hanya ${data.length} konfigurasi ditemukan. ANOVA memerlukan minimal 2 kelompok.`,
        };
        issues.push(issue);
        warnings.push(`⚠️ ${issue.message}`);
        warningsId.push(`⚠️ ${issue.messageId}`);
    }

    // Validate each configuration
    for (const config of data) {
        for (const [metricName, values] of Object.entries(config.scores)) {
            // Sample size check per group
            const sampleIssue = validateSampleSize(values.length, "anova", `${config.configName}.${metricName}`);
            if (sampleIssue) {
                issues.push(sampleIssue);
                if (values.length < 2) {
                    warnings.push(`⚠️ ${sampleIssue.message}`);
                    warningsId.push(`⚠️ ${sampleIssue.messageId}`);
                }
            }

            // Range check
            const range = METRIC_RANGES[metricName];
            if (range && values.length > 0) {
                const rangeIssue = validateMetricRange(
                    values,
                    `${config.configName}.${metricName}`,
                    range.min,
                    range.max
                );
                if (rangeIssue) {
                    issues.push(rangeIssue);
                    warnings.push(`⚠️ ${rangeIssue.message}`);
                    warningsId.push(`⚠️ ${rangeIssue.messageId}`);
                }
            }
        }
    }

    // Check for balanced design (equal sample sizes)
    const sampleSizes = data.map((d) => d.scores.faithfulness?.length || 0);
    const uniqueSizes = [...new Set(sampleSizes)];
    if (uniqueSizes.length > 1 && uniqueSizes.some((s) => s > 0)) {
        warnings.push(
            `⚠️ Unbalanced design: sample sizes vary (${uniqueSizes.join(", ")}). Results may be less reliable.`
        );
        warningsId.push(
            `⚠️ Desain tidak seimbang: ukuran sampel bervariasi (${uniqueSizes.join(", ")}). Hasil mungkin kurang dapat diandalkan.`
        );
    }

    // Calculate quality score
    const allMetrics: Record<string, (number | null)[]> = {};
    for (const config of data) {
        for (const [key, values] of Object.entries(config.scores)) {
            const metricKey = `${config.configName}_${key}`;
            allMetrics[metricKey] = values;
        }
    }
    const qualityScore = calculateDataQualityScore(allMetrics);

    // Determine validity
    const hasHighSeverityIssues = issues.some((i) => i.severity === "high");
    const validConfigs = data.filter((d) => {
        const hasData = Object.values(d.scores).some((arr) => arr.length > 0);
        return hasData;
    }).length;

    return {
        isValid: !hasHighSeverityIssues && validConfigs >= 2,
        totalRecords: data.length,
        validRecords: validConfigs,
        qualityScore,
        issues,
        warnings,
        warningsId,
    };
}

/**
 * Format validation result for console output
 *
 * @param result - Validation result to format
 * @param language - Output language ('en' or 'id')
 * @returns Formatted string for console
 */
export function formatValidationResult(result: DataValidationResult, language: "en" | "id" = "en"): string {
    const lines: string[] = [];
    const warnings = language === "id" ? result.warningsId : result.warnings;

    const statusIcon = result.isValid ? "✓" : "✗";
    let statusText: string;
    if (result.isValid) {
        statusText = language === "id" ? "Data valid untuk analisis" : "Data valid for analysis";
    } else {
        statusText = language === "id" ? "Ditemukan masalah data" : "Data issues found";
    }

    lines.push(`${statusIcon} ${statusText}`);
    lines.push(`  ${language === "id" ? "Total rekaman" : "Total records"}: ${result.totalRecords}`);
    lines.push(`  ${language === "id" ? "Rekaman valid" : "Valid records"}: ${result.validRecords}`);
    lines.push(
        `  ${language === "id" ? "Skor kualitas" : "Quality score"}: ${(result.qualityScore * 100).toFixed(1)}%`
    );

    if (warnings.length > 0) {
        lines.push("");
        lines.push(language === "id" ? "Peringatan:" : "Warnings:");
        for (const warning of warnings) {
            lines.push(`  ${warning}`);
        }
    }

    return lines.join("\n");
}
