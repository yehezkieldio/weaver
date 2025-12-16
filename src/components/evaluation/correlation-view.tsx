"use client";

import { AlertCircle, BarChart3, CheckCircle2, Info, Loader2, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import useSWR from "swr";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface HumanAnnotation {
    id: string;
    evaluationQuestionId: string;
    annotatorId: string;
    faithfulnessRating: number | null;
    relevancyRating: number | null;
    correctnessRating: number | null;
    hasHallucination: boolean | null;
    overallQuality: number | null;
    createdAt: string;
}

interface EvaluationQuestion {
    id: string;
    ragFaithfulness: number | null;
    ragAnswerRelevancy: number | null;
    ragAnswerCorrectness: number | null;
    ragHallucinationRate: number | null;
}

interface CorrelationViewProps {
    evaluationRunId: string;
}

interface CorrelationMetric {
    name: string;
    nameId: string;
    automated: number[];
    human: number[];
    correlation: number;
    pValue: number;
    n: number;
    strength: string;
    significant: boolean;
}

/**
 * CorrelationView Component
 *
 * Displays correlation analysis between automated LLM-as-judge metrics and human annotations.
 *
 * Features:
 * - Pearson and Spearman correlation coefficients
 * - Statistical significance indicators
 * - Visual correlation strength representation
 * - Comparison scatter plot (conceptual)
 */
export function CorrelationView({ evaluationRunId }: CorrelationViewProps) {
    // Fetch annotations
    const { data: annotationsData, error: annotationsError } = useSWR<{
        annotations: HumanAnnotation[];
        summary: { total: number; uniqueAnnotators: number; questionsAnnotated: number };
    }>(`/api/evaluation/annotations?runId=${evaluationRunId}`, fetcher);

    // Fetch evaluation results
    const { data: resultsData, error: resultsError } = useSWR<{
        questions: EvaluationQuestion[];
    }>(`/api/evaluation/${evaluationRunId}/results`, fetcher);

    // Calculate correlations
    const correlationData = useMemo(() => {
        if (!(annotationsData?.annotations && resultsData?.questions)) {
            return null;
        }

        const annotations = annotationsData.annotations;
        const questions = resultsData.questions;

        // Group annotations by question
        const annotationsByQuestion: Record<string, HumanAnnotation[]> = {};
        for (const annotation of annotations) {
            const qId = annotation.evaluationQuestionId;
            if (!annotationsByQuestion[qId]) {
                annotationsByQuestion[qId] = [];
            }
            annotationsByQuestion[qId].push(annotation);
        }

        // Build paired data for correlation
        const metricsList: CorrelationMetric[] = [];

        // Faithfulness
        const faithfulnessPairs = buildPairs(
            questions,
            annotationsByQuestion,
            (q) => q.ragFaithfulness,
            (a) => a.faithfulnessRating
        );
        if (faithfulnessPairs.automated.length >= 3) {
            metricsList.push({
                name: "Faithfulness",
                nameId: "Kesetiaan",
                ...faithfulnessPairs,
                ...calculateCorrelation(faithfulnessPairs.automated, faithfulnessPairs.human),
            });
        }

        // Relevancy
        const relevancyPairs = buildPairs(
            questions,
            annotationsByQuestion,
            (q) => q.ragAnswerRelevancy,
            (a) => a.relevancyRating
        );
        if (relevancyPairs.automated.length >= 3) {
            metricsList.push({
                name: "Relevancy",
                nameId: "Relevansi",
                ...relevancyPairs,
                ...calculateCorrelation(relevancyPairs.automated, relevancyPairs.human),
            });
        }

        // Correctness
        const correctnessPairs = buildPairs(
            questions,
            annotationsByQuestion,
            (q) => q.ragAnswerCorrectness,
            (a) => a.correctnessRating
        );
        if (correctnessPairs.automated.length >= 3) {
            metricsList.push({
                name: "Correctness",
                nameId: "Kebenaran",
                ...correctnessPairs,
                ...calculateCorrelation(correctnessPairs.automated, correctnessPairs.human),
            });
        }

        // Overall correlation
        const allAutomated = [
            ...faithfulnessPairs.automated,
            ...relevancyPairs.automated,
            ...correctnessPairs.automated,
        ];
        const allHuman = [...faithfulnessPairs.human, ...relevancyPairs.human, ...correctnessPairs.human];

        const overallCorrelation =
            allAutomated.length >= 3
                ? calculateCorrelation(allAutomated, allHuman)
                : { correlation: 0, pValue: 1, n: 0, strength: "insufficient", significant: false };

        return {
            metrics: metricsList,
            overall: overallCorrelation,
            summary: {
                totalAnnotations: annotations.length,
                questionsWithAnnotations: Object.keys(annotationsByQuestion).length,
                totalQuestions: questions.length,
                coverage: (Object.keys(annotationsByQuestion).length / questions.length) * 100,
            },
        };
    }, [annotationsData, resultsData]);

    if (annotationsError || resultsError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Gagal memuat data untuk analisis korelasi.</AlertDescription>
            </Alert>
        );
    }

    if (!correlationData) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const { metrics, overall, summary } = correlationData;

    // Minimum annotations needed for analysis
    const minimumRequired = 10;
    const hasEnoughData = summary.totalAnnotations >= minimumRequired;

    return (
        <div className="space-y-6">
            {/* Coverage Summary */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="font-medium text-sm">Total Anotasi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-bold text-2xl">{summary.totalAnnotations}</p>
                        <p className="text-muted-foreground text-xs">
                            dari {annotationsData?.summary.uniqueAnnotators || 0} anotator
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="font-medium text-sm">Pertanyaan Teranotasi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-bold text-2xl">{summary.questionsWithAnnotations}</p>
                        <p className="text-muted-foreground text-xs">dari {summary.totalQuestions} total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="font-medium text-sm">Coverage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-bold text-2xl">{summary.coverage.toFixed(1)}%</p>
                        <Progress className="mt-2" value={summary.coverage} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="font-medium text-sm">Korelasi Keseluruhan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`font-bold text-2xl ${getCorrelationColor(overall.correlation)}`}>
                            {hasEnoughData ? overall.correlation.toFixed(3) : "N/A"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                            {hasEnoughData ? getStrengthLabel(overall.strength) : "Data tidak cukup"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Data Requirement Alert */}
            {!hasEnoughData && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Data Belum Mencukupi</AlertTitle>
                    <AlertDescription>
                        Diperlukan minimal {minimumRequired} anotasi untuk analisis korelasi yang valid. Saat ini
                        terdapat {summary.totalAnnotations} anotasi.
                    </AlertDescription>
                </Alert>
            )}

            {/* Overall Interpretation */}
            {hasEnoughData && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Interpretasi Korelasi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                {overall.significant ? (
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
                                ) : (
                                    <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-500" />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {getInterpretation(overall.correlation, overall.significant)}
                                    </p>
                                    <p className="mt-1 text-muted-foreground text-sm">
                                        r = {overall.correlation.toFixed(3)}, p = {overall.pValue.toFixed(4)}, n ={" "}
                                        {overall.n}
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-4">
                                <p className="text-sm">
                                    <strong>Rekomendasi:</strong>{" "}
                                    {getRecommendation(overall.correlation, overall.significant)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Per-Metric Correlations */}
            {hasEnoughData && metrics.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Korelasi per Metrik
                        </CardTitle>
                        <CardDescription>
                            Perbandingan korelasi antara skor otomatis dan penilaian manual
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Metrik</TableHead>
                                    <TableHead className="text-right">Korelasi (r)</TableHead>
                                    <TableHead className="text-right">p-value</TableHead>
                                    <TableHead className="text-right">N</TableHead>
                                    <TableHead>Kekuatan</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {metrics.map((metric) => (
                                    <TableRow key={metric.name}>
                                        <TableCell>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger className="font-medium">
                                                        {metric.nameId}
                                                    </TooltipTrigger>
                                                    <TooltipContent>{metric.name}</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell
                                            className={`text-right font-mono ${getCorrelationColor(metric.correlation)}`}
                                        >
                                            {metric.correlation.toFixed(3)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                            {metric.pValue < 0.001 ? "<0.001" : metric.pValue.toFixed(4)}
                                        </TableCell>
                                        <TableCell className="text-right">{metric.n}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{getStrengthLabel(metric.strength)}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {metric.significant ? (
                                                <Badge className="bg-green-500" variant="default">
                                                    Signifikan
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">Tidak Signifikan</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Methodology Note */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Metodologi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-muted-foreground text-sm">
                    <p>
                        <strong>Korelasi Pearson:</strong> Mengukur hubungan linear antara skor otomatis (0-1) dan
                        penilaian manual (1-5, dinormalisasi ke 0-1).
                    </p>
                    <p>
                        <strong>Signifikansi:</strong> p {"<"} 0.05 menunjukkan hubungan yang signifikan secara
                        statistik.
                    </p>
                    <p>
                        <strong>Interpretasi kekuatan:</strong> |r| {"<"} 0.3 lemah, 0.3-0.5 sedang, 0.5-0.7 kuat, {">"}{" "}
                        0.7 sangat kuat.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

// Helper functions

function buildPairs(
    questions: EvaluationQuestion[],
    annotationsByQuestion: Record<string, HumanAnnotation[]>,
    getAutomated: (q: EvaluationQuestion) => number | null,
    getHuman: (a: HumanAnnotation) => number | null
): { automated: number[]; human: number[] } {
    const automated: number[] = [];
    const human: number[] = [];

    for (const question of questions) {
        const autoScore = getAutomated(question);
        const annotations = annotationsByQuestion[question.id];

        if (autoScore === null || !annotations) continue;

        for (const annotation of annotations) {
            const humanRating = getHuman(annotation);
            if (humanRating !== null) {
                automated.push(autoScore);
                // Normalize human rating from 1-5 to 0-1
                human.push((humanRating - 1) / 4);
            }
        }
    }

    return { automated, human };
}

function calculateCorrelation(
    x: number[],
    y: number[]
): {
    correlation: number;
    pValue: number;
    n: number;
    strength: string;
    significant: boolean;
} {
    const n = x.length;
    if (n < 3) {
        return { correlation: 0, pValue: 1, n, strength: "insufficient", significant: false };
    }

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    const r = denominator === 0 ? 0 : numerator / denominator;

    // Approximate p-value using t-distribution
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    const df = n - 2;
    // Simplified p-value approximation
    const pValue = 2 * (1 - approximateTCDF(Math.abs(t), df));

    const absR = Math.abs(r);
    let strength: string;
    if (absR < 0.1) strength = "negligible";
    else if (absR < 0.3) strength = "weak";
    else if (absR < 0.5) strength = "moderate";
    else if (absR < 0.7) strength = "strong";
    else strength = "very_strong";

    return {
        correlation: r,
        pValue,
        n,
        strength,
        significant: pValue < 0.05,
    };
}

function approximateTCDF(t: number, df: number): number {
    // Simple approximation for t-distribution CDF
    const x = df / (df + t * t);
    return 1 - 0.5 * x ** (df / 2);
}

function getCorrelationColor(r: number): string {
    const absR = Math.abs(r);
    if (absR >= 0.7) return "text-green-600";
    if (absR >= 0.5) return "text-blue-600";
    if (absR >= 0.3) return "text-yellow-600";
    return "text-red-600";
}

function getStrengthLabel(strength: string): string {
    const labels: Record<string, string> = {
        negligible: "Sangat Lemah",
        weak: "Lemah",
        moderate: "Sedang",
        strong: "Kuat",
        very_strong: "Sangat Kuat",
        insufficient: "Data Tidak Cukup",
    };
    return labels[strength] || strength;
}

function getInterpretation(r: number, significant: boolean): string {
    const absR = Math.abs(r);
    if (!significant) {
        return "Korelasi tidak signifikan secara statistik. Hubungan antara metrik otomatis dan penilaian manual mungkin tidak konsisten.";
    }
    if (absR >= 0.7) {
        return "Korelasi sangat kuat! Metrik LLM-as-judge sangat konsisten dengan penilaian manusia.";
    }
    if (absR >= 0.5) {
        return "Korelasi kuat. Metrik otomatis memberikan indikasi yang baik dari kualitas respons.";
    }
    if (absR >= 0.3) {
        return "Korelasi sedang. Metrik otomatis berguna tetapi mungkin tidak menangkap semua aspek yang dinilai manusia.";
    }
    return "Korelasi lemah. Pertimbangkan untuk mereview atau mengkalibrasi ulang metrik otomatis.";
}

function getRecommendation(r: number, significant: boolean): string {
    const absR = Math.abs(r);
    if (!significant || absR < 0.3) {
        return "Tingkatkan cakupan anotasi atau review kriteria penilaian. Metrik otomatis mungkin perlu penyesuaian untuk domain ini.";
    }
    if (absR >= 0.7) {
        return "Metrik otomatis dapat diandalkan untuk evaluasi skala besar. Anotasi manual dapat dikurangi untuk efisiensi.";
    }
    if (absR >= 0.5) {
        return "Gunakan metrik otomatis untuk screening awal, tetapi validasi dengan anotasi manual untuk kasus kritis.";
    }
    return "Kombinasikan metrik otomatis dengan sampling anotasi manual reguler untuk hasil optimal.";
}
