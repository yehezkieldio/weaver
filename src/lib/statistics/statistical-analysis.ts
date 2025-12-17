/**
 * @fileoverview Statistical Analysis for RAG Evaluation
 *
 * This module provides rigorous statistical tests for evaluating RAG system performance.
 * Uses jstat library for accurate p-value calculations via proper distribution CDFs.
 *
 * WHY jstat:
 * - Provides accurate t-distribution, F-distribution, and chi-squared CDFs
 * - Better than rough approximations for academic publication quality
 * - Well-maintained library with proper statistical foundations
 */

import jStat from "jstat";

/**
 * Statistical test result with interpretation
 *
 * WHY Bilingual Fields:
 * - Target audience includes Indonesian researchers
 * - Facilitates academic reporting in local context
 *
 * @property testName - Test name in English
 * @property testNameId - Test name in Indonesian
 * @property statistic - Test statistic value (t, F, etc.)
 * @property pValue - Significance probability
 * @property significant - Whether p < alpha
 * @property significanceLevel - Alpha threshold (typically 0.05)
 * @property effectSize - Effect size measure (Cohen's d, eta-squared)
 * @property effectSizeInterpretation - Effect magnitude label
 * @property confidenceInterval - CI for parameter estimate
 * @property degreesOfFreedom - Degrees of freedom
 * @property sampleSize - Total sample size
 * @property interpretation - English interpretation
 * @property interpretationId - Indonesian interpretation
 */
export interface StatisticalResult {
    testName: string;
    testNameId: string;
    statistic: number;
    pValue: number;
    significant: boolean;
    significanceLevel: number;
    effectSize?: number;
    effectSizeInterpretation?: string;
    confidenceInterval?: { lower: number; upper: number; level: number };
    degreesOfFreedom?: number;
    sampleSize: number;
    interpretation: string;
    interpretationId: string;
}

/**
 * Descriptive statistics summary
 *
 * @property mean - Arithmetic mean
 * @property median - Middle value
 * @property stdDev - Sample standard deviation
 * @property variance - Sample variance
 * @property min - Minimum value
 * @property max - Maximum value
 * @property range - Max - min
 * @property n - Sample size
 * @property sem - Standard error of mean (stdDev / sqrt(n))
 * @property skewness - Distribution asymmetry (Fisher's)
 * @property kurtosis - Distribution tailedness (excess kurtosis)
 */
export interface DescriptiveStats {
    mean: number;
    median: number;
    stdDev: number;
    variance: number;
    min: number;
    max: number;
    range: number;
    n: number;
    sem: number; // Standard Error of Mean
    skewness: number;
    kurtosis: number;
}

/**
 * Calculate descriptive statistics for a dataset
 *
 * WHY: Provides comprehensive summary statistics for RAG evaluation metrics
 * - Includes measures of central tendency (mean, median)
 * - Dispersion (standard deviation, variance, range)
 * - Distribution shape (skewness, kurtosis)
 * - Inference support (standard error)
 *
 * @param data - Array of numeric values
 * @returns Descriptive statistics object
 */
export function calculateDescriptiveStats(data: number[]): DescriptiveStats {
    const n = data.length;
    if (n === 0) {
        return {
            mean: 0,
            median: 0,
            stdDev: 0,
            variance: 0,
            min: 0,
            max: 0,
            range: 0,
            n: 0,
            sem: 0,
            skewness: 0,
            kurtosis: 0,
        };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    // Median
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

    // Variance and standard deviation (sample)
    const squaredDiffs = data.map((x) => (x - mean) ** 2);
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1);
    const stdDev = Math.sqrt(variance);

    // Standard Error of Mean
    const sem = stdDev / Math.sqrt(n);

    // Skewness (Fisher's)
    const cubedDiffs = data.map((x) => ((x - mean) / stdDev) ** 3);
    const skewness = n > 2 ? (n / ((n - 1) * (n - 2))) * cubedDiffs.reduce((a, b) => a + b, 0) : 0;

    // Kurtosis (excess kurtosis)
    const fourthDiffs = data.map((x) => ((x - mean) / stdDev) ** 4);
    const kurtosis =
        n > 3
            ? ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * fourthDiffs.reduce((a, b) => a + b, 0) -
              (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
            : 0;

    return {
        mean,
        median,
        stdDev,
        variance,
        min: sorted[0],
        max: sorted[n - 1],
        range: sorted[n - 1] - sorted[0],
        n,
        sem,
        skewness,
        kurtosis,
    };
}

// T-distribution critical values (approximation for common values)
function tCriticalValue(df: number, alpha: number): number {
    // Two-tailed critical values approximation
    const criticalValues: Record<number, Record<number, number>> = {
        0.05: {
            1: 12.706,
            2: 4.303,
            3: 3.182,
            4: 2.776,
            5: 2.571,
            10: 2.228,
            20: 2.086,
            30: 2.042,
            60: 2.0,
            120: 1.98,
        },
        0.01: {
            1: 63.657,
            2: 9.925,
            3: 5.841,
            4: 4.604,
            5: 4.032,
            10: 3.169,
            20: 2.845,
            30: 2.75,
            60: 2.66,
            120: 2.617,
        },
    };

    const alphaValues = criticalValues[alpha] || criticalValues[0.05];

    // Find closest df
    const dfs = Object.keys(alphaValues)
        .map(Number)
        .sort((a, b) => a - b);
    let closestDf = dfs[0];
    for (const d of dfs) {
        if (d <= df) closestDf = d;
        else break;
    }

    return alphaValues[closestDf] || 1.96; // Default to z-score for large df
}

/**
 * Calculate p-value from t-statistic using jstat's Student's t-distribution CDF.
 *
 * WHY This Approach:
 * - Uses proper cumulative distribution function instead of approximation
 * - Two-tailed test appropriate for most hypothesis testing scenarios
 * - Handles all degrees of freedom accurately
 *
 * @param t - The t-statistic value
 * @param df - Degrees of freedom
 * @returns Two-tailed p-value
 */
function tToPValue(t: number, df: number): number {
    if (df <= 0) return 1;
    // Two-tailed p-value: 2 * P(T > |t|) = 2 * (1 - CDF(|t|))
    const absT = Math.abs(t);
    const cdf = jStat.studentt.cdf(absT, df);
    return 2 * (1 - cdf);
}

// Paired t-test
export function pairedTTest(group1: number[], group2: number[], alpha = 0.05): StatisticalResult {
    if (group1.length !== group2.length) {
        throw new Error("Paired t-test requires equal sample sizes");
    }

    const n = group1.length;
    const differences = group1.map((v, i) => v - group2[i]);

    const stats = calculateDescriptiveStats(differences);
    const tStatistic = stats.mean / stats.sem;
    const df = n - 1;
    const pValue = tToPValue(tStatistic, df);

    // Cohen's d effect size
    const cohensD = stats.mean / stats.stdDev;
    const effectSizeInterpretation = interpretCohensD(cohensD);

    // Confidence interval for mean difference
    const tCrit = tCriticalValue(df, alpha);
    const marginOfError = tCrit * stats.sem;
    const ci = {
        lower: stats.mean - marginOfError,
        upper: stats.mean + marginOfError,
        level: 1 - alpha,
    };

    const significant = pValue < alpha;

    return {
        testName: "Paired t-test",
        testNameId: "Uji t Berpasangan",
        statistic: tStatistic,
        pValue,
        significant,
        significanceLevel: alpha,
        effectSize: cohensD,
        effectSizeInterpretation,
        confidenceInterval: ci,
        degreesOfFreedom: df,
        sampleSize: n,
        interpretation: significant
            ? `The difference between groups is statistically significant (t(${df}) = ${tStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}). Effect size (Cohen's d = ${cohensD.toFixed(3)}) indicates a ${effectSizeInterpretation} effect.`
            : `No statistically significant difference found between groups (t(${df}) = ${tStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}).`,
        interpretationId: significant
            ? `Perbedaan antara kelompok signifikan secara statistik (t(${df}) = ${tStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}). Ukuran efek (Cohen's d = ${cohensD.toFixed(3)}) menunjukkan efek ${translateEffectSize(effectSizeInterpretation)}.`
            : `Tidak ditemukan perbedaan signifikan secara statistik antara kelompok (t(${df}) = ${tStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}).`,
    };
}

// Independent samples t-test
export function independentTTest(group1: number[], group2: number[], alpha = 0.05): StatisticalResult {
    const stats1 = calculateDescriptiveStats(group1);
    const stats2 = calculateDescriptiveStats(group2);

    const n1 = stats1.n;
    const n2 = stats2.n;

    // Welch's t-test (doesn't assume equal variances)
    const meanDiff = stats1.mean - stats2.mean;
    const se = Math.sqrt(stats1.variance / n1 + stats2.variance / n2);
    const tStatistic = meanDiff / se;

    // Welch-Satterthwaite degrees of freedom
    const v1 = stats1.variance / n1;
    const v2 = stats2.variance / n2;
    const df = (v1 + v2) ** 2 / (v1 ** 2 / (n1 - 1) + v2 ** 2 / (n2 - 1));

    const pValue = tToPValue(tStatistic, df);

    // Cohen's d effect size (pooled SD)
    const pooledSD = Math.sqrt(((n1 - 1) * stats1.variance + (n2 - 1) * stats2.variance) / (n1 + n2 - 2));
    const cohensD = meanDiff / pooledSD;
    const effectSizeInterpretation = interpretCohensD(cohensD);

    // Confidence interval
    const tCrit = tCriticalValue(Math.round(df), alpha);
    const marginOfError = tCrit * se;
    const ci = {
        lower: meanDiff - marginOfError,
        upper: meanDiff + marginOfError,
        level: 1 - alpha,
    };

    const significant = pValue < alpha;

    return {
        testName: "Independent t-test (Welch's)",
        testNameId: "Uji t Independen (Welch)",
        statistic: tStatistic,
        pValue,
        significant,
        significanceLevel: alpha,
        effectSize: cohensD,
        effectSizeInterpretation,
        confidenceInterval: ci,
        degreesOfFreedom: df,
        sampleSize: n1 + n2,
        interpretation: significant
            ? `Significant difference between groups (t(${df.toFixed(1)}) = ${tStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}). Effect size: ${effectSizeInterpretation} (d = ${cohensD.toFixed(3)}).`
            : `No significant difference between groups (t(${df.toFixed(1)}) = ${tStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}).`,
        interpretationId: significant
            ? `Terdapat perbedaan signifikan antara kelompok (t(${df.toFixed(1)}) = ${tStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}). Ukuran efek: ${translateEffectSize(effectSizeInterpretation)} (d = ${cohensD.toFixed(3)}).`
            : `Tidak ada perbedaan signifikan antara kelompok (t(${df.toFixed(1)}) = ${tStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}).`,
    };
}

// One-way ANOVA
export function oneWayANOVA(groups: number[][], alpha = 0.05): StatisticalResult & { postHoc?: StatisticalResult[] } {
    const k = groups.length; // Number of groups
    const N = groups.reduce((sum, g) => sum + g.length, 0); // Total sample size

    // Grand mean
    const allData = groups.flat();
    const grandMean = allData.reduce((a, b) => a + b, 0) / N;

    // Between-group sum of squares (SSB)
    let ssb = 0;
    const groupMeans: number[] = [];
    for (const group of groups) {
        const groupMean = group.reduce((a, b) => a + b, 0) / group.length;
        groupMeans.push(groupMean);
        ssb += group.length * (groupMean - grandMean) ** 2;
    }

    // Within-group sum of squares (SSW)
    let ssw = 0;
    groups.forEach((group, i) => {
        for (const value of group) {
            ssw += (value - groupMeans[i]) ** 2;
        }
    });

    // Degrees of freedom
    const dfBetween = k - 1;
    const dfWithin = N - k;

    // Mean squares
    const msb = ssb / dfBetween;
    const msw = ssw / dfWithin;

    // F-statistic
    const fStatistic = msb / msw;

    // P-value approximation for F-distribution
    const pValue = fToPValue(fStatistic, dfBetween, dfWithin);

    // Eta-squared effect size
    const etaSquared = ssb / (ssb + ssw);
    const effectSizeInterpretation = interpretEtaSquared(etaSquared);

    const significant = pValue < alpha;

    const result: StatisticalResult & { postHoc?: StatisticalResult[] } = {
        testName: "One-way ANOVA",
        testNameId: "ANOVA Satu Arah",
        statistic: fStatistic,
        pValue,
        significant,
        significanceLevel: alpha,
        effectSize: etaSquared,
        effectSizeInterpretation,
        degreesOfFreedom: dfBetween,
        sampleSize: N,
        interpretation: significant
            ? `Significant differences found among groups (F(${dfBetween}, ${dfWithin}) = ${fStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}). Effect size (η² = ${etaSquared.toFixed(3)}) indicates ${effectSizeInterpretation} effect.`
            : `No significant differences among groups (F(${dfBetween}, ${dfWithin}) = ${fStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}).`,
        interpretationId: significant
            ? `Ditemukan perbedaan signifikan antar kelompok (F(${dfBetween}, ${dfWithin}) = ${fStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}). Ukuran efek (η² = ${etaSquared.toFixed(3)}) menunjukkan efek ${translateEffectSize(effectSizeInterpretation)}.`
            : `Tidak ditemukan perbedaan signifikan antar kelompok (F(${dfBetween}, ${dfWithin}) = ${fStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}).`,
    };

    // Post-hoc tests if significant
    if (significant && k > 2) {
        result.postHoc = performTukeyHSD(groups, groupMeans, msw, alpha);
    }

    return result;
}

// Tukey's HSD post-hoc test
function performTukeyHSD(groups: number[][], groupMeans: number[], msw: number, alpha: number): StatisticalResult[] {
    const results: StatisticalResult[] = [];
    const k = groups.length;

    for (let i = 0; i < k; i++) {
        for (let j = i + 1; j < k; j++) {
            const meanDiff = Math.abs(groupMeans[i] - groupMeans[j]);
            const se = Math.sqrt((msw * (1 / groups[i].length + 1 / groups[j].length)) / 2);
            const q = meanDiff / se;

            // Approximate p-value using Studentized range distribution
            const pValue = qToPValue(q, k, groups.reduce((sum, g) => sum + g.length, 0) - k);

            results.push({
                testName: `Tukey HSD: Group ${i + 1} vs Group ${j + 1}`,
                testNameId: `Tukey HSD: Kelompok ${i + 1} vs Kelompok ${j + 1}`,
                statistic: q,
                pValue,
                significant: pValue < alpha,
                significanceLevel: alpha,
                sampleSize: groups[i].length + groups[j].length,
                interpretation:
                    pValue < alpha
                        ? `Significant difference between groups ${i + 1} and ${j + 1} (q = ${q.toFixed(3)}, p = ${pValue.toFixed(4)})`
                        : `No significant difference between groups ${i + 1} and ${j + 1}`,
                interpretationId:
                    pValue < alpha
                        ? `Perbedaan signifikan antara kelompok ${i + 1} dan ${j + 1} (q = ${q.toFixed(3)}, p = ${pValue.toFixed(4)})`
                        : `Tidak ada perbedaan signifikan antara kelompok ${i + 1} dan ${j + 1}`,
            });
        }
    }

    return results;
}

// Confidence interval for a single mean
export function confidenceInterval(
    data: number[],
    confidenceLevel = 0.95
): { mean: number; lower: number; upper: number; level: number; marginOfError: number } {
    const stats = calculateDescriptiveStats(data);
    const alpha = 1 - confidenceLevel;
    const tCrit = tCriticalValue(stats.n - 1, alpha);
    const marginOfError = tCrit * stats.sem;

    return {
        mean: stats.mean,
        lower: stats.mean - marginOfError,
        upper: stats.mean + marginOfError,
        level: confidenceLevel,
        marginOfError,
    };
}

// Bootstrap confidence interval (non-parametric)
export function bootstrapConfidenceInterval(
    data: number[],
    statistic: (d: number[]) => number = (d) => d.reduce((a, b) => a + b, 0) / d.length,
    confidenceLevel = 0.95,
    nBootstrap = 1000
): { estimate: number; lower: number; upper: number; level: number } {
    const bootstrapStats: number[] = [];

    for (let i = 0; i < nBootstrap; i++) {
        // Resample with replacement
        const sample = Array.from({ length: data.length }, () => data[Math.floor(Math.random() * data.length)]);
        bootstrapStats.push(statistic(sample));
    }

    bootstrapStats.sort((a, b) => a - b);

    const alpha = 1 - confidenceLevel;
    const lowerIdx = Math.floor((alpha / 2) * nBootstrap);
    const upperIdx = Math.floor((1 - alpha / 2) * nBootstrap);

    return {
        estimate: statistic(data),
        lower: bootstrapStats[lowerIdx],
        upper: bootstrapStats[upperIdx],
        level: confidenceLevel,
    };
}

// Helper functions
function interpretCohensD(d: number): string {
    const absD = Math.abs(d);
    if (absD < 0.2) return "negligible";
    if (absD < 0.5) return "small";
    if (absD < 0.8) return "medium";
    return "large";
}

function interpretEtaSquared(eta2: number): string {
    if (eta2 < 0.01) return "negligible";
    if (eta2 < 0.06) return "small";
    if (eta2 < 0.14) return "medium";
    return "large";
}

function translateEffectSize(effect: string): string {
    const translations: Record<string, string> = {
        negligible: "sangat kecil",
        small: "kecil",
        medium: "sedang",
        large: "besar",
    };
    return translations[effect] || effect;
}

/**
 * Calculate p-value from F-statistic using jstat's F-distribution CDF.
 *
 * WHY This Approach:
 * - Uses proper central F-distribution CDF
 * - Correctly uses both degrees of freedom (df1 for numerator, df2 for denominator)
 * - Accurate for ANOVA and variance ratio tests
 *
 * @param f - The F-statistic value
 * @param df1 - Degrees of freedom for numerator (between groups)
 * @param df2 - Degrees of freedom for denominator (within groups)
 * @returns One-tailed p-value (upper tail)
 */
function fToPValue(f: number, df1: number, df2: number): number {
    if (df1 <= 0 || df2 <= 0 || f < 0) return 1;
    // One-tailed p-value: P(F > f) = 1 - CDF(f)
    const cdf = jStat.centralF.cdf(f, df1, df2);
    return 1 - cdf;
}

/**
 * Calculate p-value from q-statistic (Studentized range) using approximation.
 *
 * NOTE: jstat doesn't provide a direct Studentized range distribution.
 * We use a conservative approximation based on the relationship between
 * the Studentized range and the t-distribution for pairwise comparisons.
 *
 * For more accurate Tukey HSD p-values, consider using specialized libraries
 * like 'studentized-range' or implementing the distribution directly.
 *
 * @param q - The Studentized range statistic (q = mean_diff / SE)
 * @param k - Number of groups being compared
 * @param df - Degrees of freedom (typically N - k for error term)
 * @returns Approximate p-value for Tukey HSD test
 */
function qToPValue(q: number, k: number, df: number): number {
    if (k <= 1 || df <= 0 || q < 0) return 1;

    // Approximation: For large df, q/sqrt(2) is approximately t-distributed
    // This is a conservative approximation that tends to give slightly larger p-values
    const tApprox = q / Math.sqrt(2);

    // Use Bonferroni-corrected t-test as approximation
    // Number of pairwise comparisons: k*(k-1)/2
    const numComparisons = (k * (k - 1)) / 2;
    const rawPValue = tToPValue(tApprox, df);

    // Apply Bonferroni correction (conservative)
    return Math.min(1, rawPValue * numComparisons);
}

/**
 * RAG vs Non-RAG comparison result
 *
 * @property metric - Metric name (English)
 * @property metricId - Metric name (Indonesian)
 * @property ragStats - Descriptive stats for RAG
 * @property nonRagStats - Descriptive stats for Non-RAG
 * @property testResult - Statistical test result
 * @property improvement - Absolute improvement (RAG - Non-RAG)
 * @property improvementPercent - Relative improvement percentage
 */
export interface RAGComparisonResult {
    metric: string;
    metricId: string;
    ragStats: DescriptiveStats;
    nonRagStats: DescriptiveStats;
    testResult: StatisticalResult;
    improvement: number;
    improvementPercent: number;
}

export function compareRAGvsNonRAG(
    ragScores: number[],
    nonRagScores: number[],
    metricName: string,
    metricNameId: string,
    paired = true
): RAGComparisonResult {
    const ragStats = calculateDescriptiveStats(ragScores);
    const nonRagStats = calculateDescriptiveStats(nonRagScores);

    const testResult = paired ? pairedTTest(ragScores, nonRagScores) : independentTTest(ragScores, nonRagScores);

    const improvement = ragStats.mean - nonRagStats.mean;
    const improvementPercent = nonRagStats.mean !== 0 ? (improvement / nonRagStats.mean) * 100 : 0;

    return {
        metric: metricName,
        metricId: metricNameId,
        ragStats,
        nonRagStats,
        testResult,
        improvement,
        improvementPercent,
    };
}

// Ablation study analysis
export function analyzeAblationStudy(configurations: { name: string; scores: number[] }[]): {
    anova: StatisticalResult & { postHoc?: StatisticalResult[] };
    rankings: { name: string; mean: number; ci: { lower: number; upper: number } }[];
    bestConfig: string;
    significantDifferences: string[];
} {
    const groups = configurations.map((c) => c.scores);
    const anova = oneWayANOVA(groups);

    // Calculate rankings with confidence intervals
    const rankings = configurations
        .map((c) => {
            const ci = confidenceInterval(c.scores);
            return {
                name: c.name,
                mean: ci.mean,
                ci: { lower: ci.lower, upper: ci.upper },
            };
        })
        .sort((a, b) => b.mean - a.mean);

    // Find significant differences
    const significantDifferences: string[] = [];
    if (anova.postHoc) {
        for (const test of anova.postHoc) {
            if (test.significant) {
                significantDifferences.push(test.testName);
            }
        }
    }

    return {
        anova,
        rankings,
        bestConfig: rankings[0]?.name || "",
        significantDifferences,
    };
}

// Generate statistical report
export function generateStatisticalReport(
    comparisons: RAGComparisonResult[],
    ablationResults?: ReturnType<typeof analyzeAblationStudy>,
    language: "en" | "id" = "en"
): string {
    let report = language === "id" ? "# Laporan Analisis Statistik\n\n" : "# Statistical Analysis Report\n\n";

    report +=
        language === "id"
            ? `Tanggal: ${new Date().toLocaleDateString("id-ID")}\n\n`
            : `Date: ${new Date().toLocaleDateString("en-US")}\n\n`;

    // RAG vs Non-RAG Comparisons
    report += language === "id" ? "## Perbandingan RAG vs Non-RAG\n\n" : "## RAG vs Non-RAG Comparison\n\n";

    for (const comp of comparisons) {
        const metricLabel = language === "id" ? comp.metricId : comp.metric;
        report += `### ${metricLabel}\n\n`;

        report += language === "id" ? "| Statistik | RAG | Non-RAG |\n" : "| Statistic | RAG | Non-RAG |\n";
        report += "|-----------|-----|--------|\n";
        report += `| Mean | ${comp.ragStats.mean.toFixed(4)} | ${comp.nonRagStats.mean.toFixed(4)} |\n`;
        report += `| Std Dev | ${comp.ragStats.stdDev.toFixed(4)} | ${comp.nonRagStats.stdDev.toFixed(4)} |\n`;
        report += `| 95% CI | [${confidenceInterval(new Array(comp.ragStats.n).fill(comp.ragStats.mean)).lower.toFixed(4)}, ${confidenceInterval(new Array(comp.ragStats.n).fill(comp.ragStats.mean)).upper.toFixed(4)}] | - |\n\n`;

        report +=
            language === "id"
                ? `**Hasil Uji t:** ${comp.testResult.interpretationId}\n\n`
                : `**t-test Result:** ${comp.testResult.interpretation}\n\n`;

        const improvementLabel = language === "id" ? "Peningkatan" : "Improvement";
        report += `**${improvementLabel}:** ${comp.improvement > 0 ? "+" : ""}${comp.improvement.toFixed(4)} (${comp.improvementPercent.toFixed(1)}%)\n\n`;
    }

    // Ablation Study Results
    if (ablationResults) {
        report += language === "id" ? "## Hasil Studi Ablasi\n\n" : "## Ablation Study Results\n\n";

        report +=
            language === "id"
                ? `### Hasil ANOVA\n\n${ablationResults.anova.interpretationId}\n\n`
                : `### ANOVA Results\n\n${ablationResults.anova.interpretation}\n\n`;

        report += language === "id" ? "### Peringkat Konfigurasi\n\n" : "### Configuration Rankings\n\n";
        report +=
            language === "id"
                ? "| Peringkat | Konfigurasi | Mean | 95% CI |\n"
                : "| Rank | Configuration | Mean | 95% CI |\n";
        report += "|------|---------------|------|--------|\n";

        ablationResults.rankings.forEach((r, i) => {
            report += `| ${i + 1} | ${r.name} | ${r.mean.toFixed(4)} | [${r.ci.lower.toFixed(4)}, ${r.ci.upper.toFixed(4)}] |\n`;
        });

        if (ablationResults.significantDifferences.length > 0) {
            report +=
                language === "id"
                    ? "\n### Perbedaan Signifikan (Post-hoc)\n\n"
                    : "\n### Significant Differences (Post-hoc)\n\n";

            for (const diff of ablationResults.significantDifferences) {
                report += `- ${diff}\n`;
            }
        }
    }

    return report;
}

// ============================================================================
// Correlation Analysis for Human Annotation Validation
// ============================================================================

/**
 * Correlation result with interpretation
 *
 * WHY this structure:
 * - Matches the bilingual pattern used in other statistical results
 * - Includes both correlation coefficient and p-value for publication quality
 * - Provides human-readable interpretation for non-statisticians
 */
export interface CorrelationResult {
    method: "pearson" | "spearman";
    coefficient: number; // -1 to 1
    pValue: number;
    n: number; // Sample size
    significant: boolean; // p < 0.05
    strength: "negligible" | "weak" | "moderate" | "strong" | "very_strong";
    interpretation: string;
    interpretationId: string;
}

/**
 * Cohen's Kappa result for inter-rater reliability
 */
export interface KappaResult {
    kappa: number; // -1 to 1
    observedAgreement: number; // Po
    expectedAgreement: number; // Pe
    strength: "poor" | "slight" | "fair" | "moderate" | "substantial" | "almost_perfect";
    interpretation: string;
    interpretationId: string;
}

/**
 * Comprehensive correlation report for human vs automated metrics
 */
export interface CorrelationReport {
    overallCorrelation: CorrelationResult;
    byMetric: {
        metricName: string;
        pearson: CorrelationResult;
        spearman: CorrelationResult;
    }[];
    interRaterReliability?: KappaResult;
    summary: {
        strongCorrelations: string[];
        weakCorrelations: string[];
        recommendation: string;
        recommendationId: string;
    };
}

/**
 * Calculate Pearson correlation coefficient
 *
 * WHY: Measures linear correlation between automated and human ratings
 * - Range: -1 (perfect negative) to +1 (perfect positive)
 * - Assumes normally distributed data
 * - Use for interval/ratio scale data
 *
 * @param x - First array of values (e.g., automated scores)
 * @param y - Second array of values (e.g., human ratings)
 * @returns Correlation result with interpretation
 */
export function pearsonCorrelation(x: number[], y: number[]): CorrelationResult {
    if (x.length !== y.length || x.length < 3) {
        return {
            method: "pearson",
            coefficient: 0,
            pValue: 1,
            n: Math.min(x.length, y.length),
            significant: false,
            strength: "negligible",
            interpretation: "Insufficient data for correlation analysis",
            interpretationId: "Data tidak cukup untuk analisis korelasi",
        };
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    const r = denominator === 0 ? 0 : numerator / denominator;

    // Calculate t-statistic for p-value
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    const df = n - 2;
    const pValue = tToPValue(Math.abs(t), df);

    const strength = interpretCorrelationStrength(Math.abs(r));
    const significant = pValue < 0.05;

    return {
        method: "pearson",
        coefficient: r,
        pValue,
        n,
        significant,
        strength,
        interpretation: generateCorrelationInterpretation(r, pValue, n, "en"),
        interpretationId: generateCorrelationInterpretation(r, pValue, n, "id"),
    };
}

/**
 * Calculate Spearman rank correlation coefficient
 *
 * WHY: Measures ordinal correlation, robust to non-linear relationships
 * - Range: -1 (perfect negative) to +1 (perfect positive)
 * - Non-parametric (no normality assumption)
 * - Better for Likert scale ratings (ordinal data)
 *
 * @param x - First array of values
 * @param y - Second array of values
 * @returns Correlation result with interpretation
 */
export function spearmanCorrelation(x: number[], y: number[]): CorrelationResult {
    if (x.length !== y.length || x.length < 3) {
        return {
            method: "spearman",
            coefficient: 0,
            pValue: 1,
            n: Math.min(x.length, y.length),
            significant: false,
            strength: "negligible",
            interpretation: "Insufficient data for correlation analysis",
            interpretationId: "Data tidak cukup untuk analisis korelasi",
        };
    }

    // Calculate ranks
    const rankArray = (arr: number[]): number[] => {
        const sorted = arr.map((v, idx) => ({ v, idx })).sort((a, b) => a.v - b.v);
        const ranks: number[] = new Array<number>(arr.length);

        let pos = 0;
        while (pos < sorted.length) {
            let end = pos;
            // Handle ties by averaging ranks
            while (end < sorted.length && sorted[end].v === sorted[pos].v) {
                end += 1;
            }
            const avgRank = (pos + end + 1) / 2;
            for (let k = pos; k < end; k += 1) {
                ranks[sorted[k].idx] = avgRank;
            }
            pos = end;
        }
        return ranks;
    };

    const rankX = rankArray(x);
    const rankY = rankArray(y);

    // Use Pearson on ranks
    return { ...pearsonCorrelation(rankX, rankY), method: "spearman" };
}

/**
 * Calculate Cohen's Kappa for inter-rater reliability
 *
 * WHY: Measures agreement between annotators beyond chance agreement
 * - Range: -1 (perfect disagreement) to +1 (perfect agreement)
 * - Accounts for chance agreement (unlike simple percent agreement)
 * - Essential for validating annotation quality
 *
 * @param rater1 - Ratings from first annotator (discrete categories)
 * @param rater2 - Ratings from second annotator
 * @returns Kappa result with interpretation
 */
export function cohensKappa(rater1: number[], rater2: number[]): KappaResult {
    if (rater1.length !== rater2.length || rater1.length === 0) {
        return {
            kappa: 0,
            observedAgreement: 0,
            expectedAgreement: 0,
            strength: "poor",
            interpretation: "Insufficient data for reliability analysis",
            interpretationId: "Data tidak cukup untuk analisis reliabilitas",
        };
    }

    const n = rater1.length;

    // Get all unique categories
    const categories = [...new Set([...rater1, ...rater2])].sort((a, b) => a - b);
    const k = categories.length;

    // Build confusion matrix
    const matrix: number[][] = new Array<number[]>(k).fill([]).map(() => new Array<number>(k).fill(0));

    for (let idx = 0; idx < n; idx += 1) {
        const row = categories.indexOf(rater1[idx]);
        const col = categories.indexOf(rater2[idx]);
        matrix[row][col] += 1;
    }

    // Calculate observed agreement (Po)
    let observed = 0;
    for (let i = 0; i < k; i++) {
        observed += matrix[i][i];
    }
    const Po = observed / n;

    // Calculate expected agreement (Pe)
    let Pe = 0;
    for (let i = 0; i < k; i++) {
        const rowSum = matrix[i].reduce((a, b) => a + b, 0);
        const colSum = matrix.reduce((acc, row) => acc + row[i], 0);
        Pe += (rowSum * colSum) / (n * n);
    }

    // Calculate Kappa
    const kappa = Pe === 1 ? 1 : (Po - Pe) / (1 - Pe);

    const strength = interpretKappaStrength(kappa);

    return {
        kappa,
        observedAgreement: Po,
        expectedAgreement: Pe,
        strength,
        interpretation: generateKappaInterpretation(kappa, Po, n, "en"),
        interpretationId: generateKappaInterpretation(kappa, Po, n, "id"),
    };
}

/**
 * Generate comprehensive correlation report for human vs automated metrics
 */
export function generateCorrelationReport(
    automatedMetrics: Record<string, number[]>,
    humanRatings: Record<string, number[]>,
    interRaterData?: { rater1: number[]; rater2: number[] }
): CorrelationReport {
    const byMetric: CorrelationReport["byMetric"] = [];
    const allAutomated: number[] = [];
    const allHuman: number[] = [];

    for (const metric of Object.keys(automatedMetrics)) {
        const automated = automatedMetrics[metric];
        const human = humanRatings[metric];

        if (automated && human && automated.length === human.length) {
            byMetric.push({
                metricName: metric,
                pearson: pearsonCorrelation(automated, human),
                spearman: spearmanCorrelation(automated, human),
            });

            allAutomated.push(...automated);
            allHuman.push(...human);
        }
    }

    const overallCorrelation = pearsonCorrelation(allAutomated, allHuman);

    const interRaterReliability = interRaterData
        ? cohensKappa(interRaterData.rater1, interRaterData.rater2)
        : undefined;

    // Generate summary
    const strongCorrelations = byMetric
        .filter((m) => m.spearman.strength === "strong" || m.spearman.strength === "very_strong")
        .map((m) => m.metricName);

    const weakCorrelations = byMetric
        .filter((m) => m.spearman.strength === "weak" || m.spearman.strength === "negligible")
        .map((m) => m.metricName);

    let recommendation: string;
    let recommendationId: string;

    if (overallCorrelation.coefficient >= 0.7 && overallCorrelation.significant) {
        recommendation =
            "Strong correlation between automated and human ratings indicates LLM-as-judge metrics are reliable for this evaluation context.";
        recommendationId =
            "Korelasi kuat antara penilaian otomatis dan manusia menunjukkan metrik LLM-as-judge dapat diandalkan untuk konteks evaluasi ini.";
    } else if (overallCorrelation.coefficient >= 0.4 && overallCorrelation.significant) {
        recommendation =
            "Moderate correlation suggests automated metrics provide reasonable approximation but should be supplemented with human evaluation for critical decisions.";
        recommendationId =
            "Korelasi sedang menunjukkan metrik otomatis memberikan perkiraan yang wajar tetapi sebaiknya dilengkapi dengan evaluasi manusia untuk keputusan kritis.";
    } else {
        recommendation =
            "Weak correlation indicates automated metrics may not accurately reflect human judgment. Consider recalibrating evaluation criteria or increasing human annotation coverage.";
        recommendationId =
            "Korelasi lemah menunjukkan metrik otomatis mungkin tidak secara akurat mencerminkan penilaian manusia. Pertimbangkan untuk mengkalibrasi ulang kriteria evaluasi atau meningkatkan cakupan anotasi manusia.";
    }

    return {
        overallCorrelation,
        byMetric,
        interRaterReliability,
        summary: {
            strongCorrelations,
            weakCorrelations,
            recommendation,
            recommendationId,
        },
    };
}

// Helper functions for correlation analysis

function interpretCorrelationStrength(absR: number): "negligible" | "weak" | "moderate" | "strong" | "very_strong" {
    if (absR < 0.1) return "negligible";
    if (absR < 0.3) return "weak";
    if (absR < 0.5) return "moderate";
    if (absR < 0.7) return "strong";
    return "very_strong";
}

function interpretKappaStrength(
    kappa: number
): "poor" | "slight" | "fair" | "moderate" | "substantial" | "almost_perfect" {
    if (kappa < 0) return "poor";
    if (kappa < 0.2) return "slight";
    if (kappa < 0.4) return "fair";
    if (kappa < 0.6) return "moderate";
    if (kappa < 0.8) return "substantial";
    return "almost_perfect";
}

function generateCorrelationInterpretation(r: number, p: number, n: number, lang: "en" | "id"): string {
    const strength = interpretCorrelationStrength(Math.abs(r));
    const positiveLabel = lang === "id" ? "positif" : "positive";
    const negativeLabel = lang === "id" ? "negatif" : "negative";
    const direction = r >= 0 ? positiveLabel : negativeLabel;
    const significant = p < 0.05;

    if (lang === "id") {
        const strengthId: Record<string, string> = {
            negligible: "sangat lemah",
            weak: "lemah",
            moderate: "sedang",
            strong: "kuat",
            very_strong: "sangat kuat",
        };
        return `Korelasi ${strengthId[strength]} ${direction} (r = ${r.toFixed(3)}, p = ${p.toFixed(4)}, n = ${n}). ${significant ? "Korelasi signifikan secara statistik." : "Korelasi tidak signifikan secara statistik."}`;
    }

    return `${strength.charAt(0).toUpperCase() + strength.slice(1).replace("_", " ")} ${direction} correlation (r = ${r.toFixed(3)}, p = ${p.toFixed(4)}, n = ${n}). ${significant ? "Correlation is statistically significant." : "Correlation is not statistically significant."}`;
}

function generateKappaInterpretation(kappa: number, Po: number, n: number, lang: "en" | "id"): string {
    const strength = interpretKappaStrength(kappa);

    if (lang === "id") {
        const strengthId: Record<string, string> = {
            poor: "buruk",
            slight: "sangat rendah",
            fair: "cukup",
            moderate: "sedang",
            substantial: "substansial",
            almost_perfect: "hampir sempurna",
        };
        return `Reliabilitas antar-penilai ${strengthId[strength]} (κ = ${kappa.toFixed(3)}, kesepakatan teramati = ${(Po * 100).toFixed(1)}%, n = ${n}).`;
    }

    return `${strength.charAt(0).toUpperCase() + strength.slice(1).replace("_", " ")} inter-rater reliability (κ = ${kappa.toFixed(3)}, observed agreement = ${(Po * 100).toFixed(1)}%, n = ${n}).`;
}
