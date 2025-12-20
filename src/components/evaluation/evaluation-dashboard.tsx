"use client";

import { formatDistanceToNow } from "date-fns";
import "katex/dist/katex.min.css";
import {
    AlertCircle,
    AlertTriangle,
    BarChart3,
    BookOpen,
    Brain,
    CheckCircle,
    Clock,
    FlaskConical,
    Info,
    Layers,
    Loader2,
    Play,
    Plus,
    RefreshCw,
    Rocket,
    Shield,
    Target,
    TrendingDown,
    TrendingUp,
    Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import Latex from "react-latex-next";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateEvaluationDialog } from "./create-evaluation-dialog";
import { DataExportPanel } from "./data-export-panel";
import { MetricsChart } from "./metrics-chart";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface EvaluationRun {
    id: string;
    name: string;
    description: string | null;
    status: string;
    totalQuestions: number;
    completedQuestions: number;
    retrievalStrategy: string | null;
    chunkingStrategy: string | null;
    useAgenticMode: boolean | null;
    rerankerStrategy?: string;
    createdAt: string;
    completedAt?: string;
    aggregateMetrics?: AggregateMetrics; // Added for ComparisonChart
}

interface EvaluationQuestion {
    id: string;
    question: string;
    groundTruth: string;
    ragAnswer: string | null;
    nonRagAnswer: string | null;
    ragFaithfulness?: number;
    ragAnswerRelevancy?: number;
    ragContextPrecision?: number;
    ragContextRecall?: number;
    ragAnswerCorrectness?: number;
    ragHallucinationRate?: number;
    ragLatencyMs?: number;
    retrievalMethod?: string;
}

interface AggregateMetrics {
    avgFaithfulness: number;
    avgAnswerRelevancy: number;
    avgContextPrecision: number;
    avgContextRecall: number;
    avgAnswerCorrectness: number;
    avgHallucinationRate: number;
    avgSourceAttribution: number;
    avgContradictionFree: number;
    avgLatencyMs: number;
    retrievalNdcg?: number;
    rag?: {
        faithfulness: number;
        answerRelevancy: number;
        contextPrecision: number;
        contextRecall: number;
        answerCorrectness: number;
    };
    nonRag?: {
        answerRelevancy: number;
        answerCorrectness: number;
    };
    avgFactualConsistency?: number; // Added for HallucinationMetricsView
    nonRagHallucinationRate?: number; // Non-RAG hallucination for comparison
    avgCitationAccuracy?: number; // Domain-specific metric
}

export function EvaluationDashboard() {
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [activeTab, setActiveTab] = useState("runs");

    const { data: runsData, mutate: mutateRuns } = useSWR<{ runs: EvaluationRun[] }>("/api/evaluation", fetcher, {
        refreshInterval: 5000,
    });

    const { data: runDetails } = useSWR<{
        run: EvaluationRun;
        questions: EvaluationQuestion[];
        aggregateMetrics: AggregateMetrics;
    }>(selectedRunId ? `/api/evaluation/${selectedRunId}` : null, fetcher);

    const { data: ablationData, mutate: mutateAblation } = useSWR("/api/evaluation/ablation", fetcher);

    const runs: EvaluationRun[] = runsData?.runs || [];

    const runEvaluation = async (id: string, mode: "quick" | "production" = "quick") => {
        await fetch(`/api/evaluation/${id}/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ evaluationMode: mode }),
        });
        mutateRuns();
    };

    const runAblationStudy = async (mode: "quick" | "production" = "quick") => {
        await fetch("/api/evaluation/ablation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ evaluationMode: mode }),
        });
        mutateAblation();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return (
                    <Badge className="gap-1 border-green-500/30 bg-green-500/20 text-green-600" variant="default">
                        <CheckCircle className="h-3 w-3" />
                        Selesai
                    </Badge>
                );
            case "running":
                return (
                    <Badge className="gap-1" variant="secondary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Berjalan
                    </Badge>
                );
            case "pending":
                return (
                    <Badge className="gap-1" variant="outline">
                        <Clock className="h-3 w-3" />
                        Menunggu
                    </Badge>
                );
            case "failed":
                return (
                    <Badge className="gap-1" variant="destructive">
                        <AlertCircle className="h-3 w-3" />
                        Gagal
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <Tabs className="space-y-4" onValueChange={setActiveTab} value={activeTab}>
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="runs">Evaluasi</TabsTrigger>
                        <TabsTrigger disabled={!selectedRunId} value="results">
                            Analisis Hasil
                        </TabsTrigger>
                        <TabsTrigger value="ablation">
                            <FlaskConical className="mr-1 h-4 w-4" />
                            Studi Ablasi
                        </TabsTrigger>
                        <TabsTrigger value="hallucination">
                            <AlertTriangle className="mr-1 h-4 w-4" />
                            Halusinasi
                        </TabsTrigger>
                        <TabsTrigger value="comparison">
                            <BarChart3 className="mr-1 h-4 w-4" />
                            Perbandingan
                        </TabsTrigger>
                        <TabsTrigger value="information">
                            <Info className="mr-1 h-4 w-4" />
                            Informasi
                        </TabsTrigger>
                    </TabsList>

                    <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4" />
                        Evaluasi Baru
                    </Button>
                </div>

                <TabsContent className="space-y-4" value="runs">
                    {/* Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Total Evaluasi</CardDescription>
                                <CardTitle className="text-3xl">{runs.length}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Selesai</CardDescription>
                                <CardTitle className="text-3xl text-green-600">
                                    {runs.filter((r) => r.status === "completed").length}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Berjalan</CardDescription>
                                <CardTitle className="text-3xl text-blue-600">
                                    {runs.filter((r) => r.status === "running").length}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Total Pertanyaan</CardDescription>
                                <CardTitle className="text-3xl">
                                    {runs.reduce((acc, r) => acc + r.totalQuestions, 0)}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* Runs Table */}
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Evaluasi</TableHead>
                                    <TableHead>Konfigurasi</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Progress</TableHead>
                                    <TableHead>Dibuat</TableHead>
                                    <TableHead className="w-30">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {runs.length === 0 ? (
                                    <TableRow>
                                        <TableCell className="py-8 text-center text-muted-foreground" colSpan={6}>
                                            Belum ada evaluasi. Buat evaluasi baru untuk memulai.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    runs.map((run) => (
                                        <TableRow
                                            className="cursor-pointer"
                                            key={run.id}
                                            onClick={() => setSelectedRunId(run.id)}
                                        >
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-foreground">{run.name}</p>
                                                    {run.description && (
                                                        <p className="text-muted-foreground text-xs">
                                                            {run.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {run.useAgenticMode && (
                                                        <Badge className="gap-1 text-xs" variant="secondary">
                                                            <Brain className="h-3 w-3" /> Agentik
                                                        </Badge>
                                                    )}
                                                    {run.retrievalStrategy && (
                                                        <Badge className="gap-1 text-xs" variant="outline">
                                                            <Zap className="h-3 w-3" /> {run.retrievalStrategy}
                                                        </Badge>
                                                    )}
                                                    {run.chunkingStrategy && (
                                                        <Badge className="gap-1 text-xs" variant="outline">
                                                            <Layers className="h-3 w-3" /> {run.chunkingStrategy}
                                                        </Badge>
                                                    )}
                                                    {run.rerankerStrategy && (
                                                        <Badge className="gap-1 text-xs" variant="outline">
                                                            <RefreshCw className="h-3 w-3" /> {run.rerankerStrategy}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(run.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Progress
                                                        className="h-2 w-20"
                                                        value={(run.completedQuestions / run.totalQuestions) * 100}
                                                    />
                                                    <span className="text-muted-foreground text-xs">
                                                        {run.completedQuestions}/{run.totalQuestions}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    {run.status === "pending" && (
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                runEvaluation(run.id);
                                                            }}
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            <Play className="mr-1 h-3 w-3" />
                                                            Jalankan
                                                        </Button>
                                                    )}
                                                    {run.status === "completed" && (
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedRunId(run.id);
                                                                setActiveTab("results");
                                                            }}
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            <BarChart3 className="mr-1 h-3 w-3" />
                                                            Lihat
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent className="space-y-4" value="results">
                    {selectedRunId && !runDetails && (
                        <Card className="p-8 text-center">
                            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-muted-foreground" />
                            <h3 className="mb-2 font-medium text-lg">Memuat Data Evaluasi...</h3>
                            <p className="text-muted-foreground">Sedang mengambil hasil evaluasi dan metrik.</p>
                        </Card>
                    )}
                    {runDetails && selectedRunId && (
                        <EvaluationResults
                            aggregateMetrics={runDetails.aggregateMetrics}
                            evaluationRunId={selectedRunId}
                            questions={runDetails.questions}
                            run={runDetails.run}
                        />
                    )}
                    {!selectedRunId && (
                        <Card className="p-8 text-center">
                            <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                            <h3 className="mb-2 font-medium text-lg">Pilih Evaluasi</h3>
                            <p className="text-muted-foreground">
                                Pilih evaluasi yang sudah selesai dari tab Evaluasi dan klik "Lihat" untuk melihat hasil
                                analisis.
                            </p>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent className="space-y-4" value="ablation">
                    <AblationStudiesView data={ablationData} onRunStudy={runAblationStudy} />
                </TabsContent>

                <TabsContent className="space-y-4" value="hallucination">
                    <HallucinationMetricsView runs={runs.filter((r) => r.status === "completed")} />
                </TabsContent>

                <TabsContent className="space-y-4" value="comparison">
                    <ComparisonChart runs={runs.filter((r) => r.status === "completed")} />
                </TabsContent>

                <TabsContent className="space-y-4" value="information">
                    <InformationView />
                </TabsContent>
            </Tabs>

            <CreateEvaluationDialog
                onCreated={() => {
                    mutateRuns();
                    setShowCreateDialog(false);
                }}
                onOpenChange={setShowCreateDialog}
                open={showCreateDialog}
            />
        </div>
    );
}

interface AblationResult {
    configName: string;
    metrics: Record<string, number>;
}

interface AblationData {
    studies: Array<{
        id: string;
        name: string;
        status: string;
        configurations: unknown[];
        results: AblationResult[];
    }>;
}

function AblationStudiesView({
    data,
    onRunStudy,
}: {
    data: AblationData | undefined;
    onRunStudy: (mode: "quick" | "production") => void;
}) {
    const studies = data?.studies || [];
    const latestStudy = studies[0];
    const [ablationMode, setAblationMode] = useState<"quick" | "production">("quick");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-xl">Studi Ablasi</h2>
                    <p className="text-muted-foreground">
                        Bandingkan performa berbagai konfigurasi RAG untuk menemukan kombinasi optimal
                    </p>
                </div>
            </div>

            {/* Mode Selection */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Mode Evaluasi</CardTitle>
                    <CardDescription>Pilih jumlah pertanyaan untuk studi ablasi</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            className={`cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${
                                ablationMode === "quick"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => setAblationMode("quick")}
                            type="button"
                        >
                            <div className="flex items-center gap-2">
                                <FlaskConical className="h-5 w-5 text-amber-500" />
                                <span className="font-semibold">Quick Mode</span>
                                <Badge className="ml-auto" variant="secondary">
                                    5 Pertanyaan
                                </Badge>
                            </div>
                            <p className="mt-2 text-muted-foreground text-xs">
                                Studi ablasi cepat untuk pengujian awal dan iterasi development. Cocok untuk validasi
                                konfigurasi sebelum studi penuh.
                            </p>
                        </button>
                        <button
                            className={`cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${
                                ablationMode === "production"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => setAblationMode("production")}
                            type="button"
                        >
                            <div className="flex items-center gap-2">
                                <Rocket className="h-5 w-5 text-green-500" />
                                <span className="font-semibold">Production Mode</span>
                                <Badge className="ml-auto" variant="default">
                                    50 Pertanyaan
                                </Badge>
                            </div>
                            <p className="mt-2 text-muted-foreground text-xs">
                                Studi ablasi lengkap untuk signifikansi statistik dan publikasi akademik. Mendukung
                                paired t-test, ANOVA, dan effect size.
                            </p>
                        </button>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button className="gap-2" onClick={() => onRunStudy(ablationMode)}>
                            <FlaskConical className="h-4 w-4" />
                            Jalankan Studi Ablasi ({ablationMode === "quick" ? "5" : "50"} Pertanyaan)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Ablation Configurations */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Konfigurasi yang Diuji</CardTitle>
                    <CardDescription>9 konfigurasi berbeda untuk analisis komprehensif</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {[
                            { name: "Baseline (Tanpa RAG)", desc: "LLM murni tanpa retrieval", icon: Target },
                            { name: "Vector Only", desc: "Hanya embedding kesamaan", icon: Zap },
                            { name: "BM25 Only", desc: "Hanya Okapi BM25 keyword", icon: Zap },
                            { name: "Hybrid (Tanpa Re-rank)", desc: "Vector + BM25 fusion", icon: Layers },
                            {
                                name: "Hybrid + Cross-Encoder",
                                desc: "Dengan cross-encoder re-ranking",
                                icon: RefreshCw,
                            },
                            { name: "Hybrid + LLM Re-rank", desc: "Dengan LLM-based re-ranking", icon: Brain },
                            { name: "Hybrid + Ensemble", desc: "Kombinasi semua re-ranker", icon: RefreshCw },
                            { name: "Agentic Mode", desc: "Multi-step reasoning", icon: Brain },
                            { name: "Full System", desc: "Semua fitur aktif", icon: Shield },
                        ].map((config) => (
                            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3" key={config.name}>
                                <config.icon className="mt-0.5 h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-medium text-sm">{config.name}</p>
                                    <p className="text-muted-foreground text-xs">{config.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Results Table */}
            {latestStudy?.results && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Hasil Studi Ablasi Terbaru</CardTitle>
                        <CardDescription>Perbandingan metrik antar konfigurasi</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Konfigurasi</TableHead>
                                    <TableHead>Faithfulness</TableHead>
                                    <TableHead>Relevancy</TableHead>
                                    <TableHead>Precision</TableHead>
                                    <TableHead>Correctness</TableHead>
                                    <TableHead>Halusinasi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {latestStudy.results.map((result: AblationResult) => (
                                    <TableRow key={result.configName}>
                                        <TableCell className="font-medium">{result.configName}</TableCell>
                                        <TableCell>
                                            <MetricBadge value={result.metrics.faithfulness} />
                                        </TableCell>
                                        <TableCell>
                                            <MetricBadge value={result.metrics.answerRelevancy} />
                                        </TableCell>
                                        <TableCell>
                                            <MetricBadge value={result.metrics.contextPrecision} />
                                        </TableCell>
                                        <TableCell>
                                            <MetricBadge value={result.metrics.answerCorrectness} />
                                        </TableCell>
                                        <TableCell>
                                            <MetricBadge inverted value={1 - result.metrics.hallucinationRate} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {!latestStudy && (
                <Card className="p-8 text-center">
                    <FlaskConical className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 font-medium text-lg">Belum Ada Studi Ablasi</h3>
                    <p className="mb-4 text-muted-foreground">
                        Pilih mode evaluasi di atas dan jalankan studi ablasi untuk membandingkan performa berbagai
                        konfigurasi RAG
                    </p>
                </Card>
            )}
        </div>
    );
}

// Sub-component for hallucination row to properly use hooks
function HallucinationRow({ run }: { run: EvaluationRun }) {
    const { data: runDetails } = useSWR<{
        run: EvaluationRun;
        aggregateMetrics: AggregateMetrics;
    }>(`/api/evaluation/${run.id}`, fetcher);

    const ragHallucination = runDetails?.aggregateMetrics?.avgHallucinationRate;
    const nonRagHallucination = runDetails?.aggregateMetrics?.nonRagHallucinationRate;
    const factualConsistency = runDetails?.aggregateMetrics?.avgFactualConsistency;
    const sourceAttribution = runDetails?.aggregateMetrics?.avgSourceAttribution;

    // Calculate improvement (lower hallucination is better)
    const improvement =
        ragHallucination !== undefined && nonRagHallucination !== undefined && nonRagHallucination > 0
            ? ((nonRagHallucination - ragHallucination) / nonRagHallucination) * 100
            : null;

    return (
        <TableRow>
            <TableCell className="font-medium">{run.name}</TableCell>
            <TableCell>
                <MetricBadge inverted value={ragHallucination !== undefined ? 1 - ragHallucination : undefined} />
            </TableCell>
            <TableCell>
                <MetricBadge inverted value={nonRagHallucination !== undefined ? 1 - nonRagHallucination : undefined} />
            </TableCell>
            <TableCell>
                {improvement !== null ? (
                    <Badge
                        className={improvement > 0 ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"}
                    >
                        {improvement > 0 ? "+" : ""}
                        {improvement.toFixed(0)}%
                    </Badge>
                ) : (
                    <Badge variant="outline">N/A</Badge>
                )}
            </TableCell>
            <TableCell>
                <MetricBadge value={factualConsistency} />
            </TableCell>
            <TableCell>
                <MetricBadge value={sourceAttribution} />
            </TableCell>
        </TableRow>
    );
}

function HallucinationMetricsView({ runs }: { runs: EvaluationRun[] }) {
    const { data: hallucinationData } = useSWR(
        runs.length > 0 ? "/api/evaluation/hallucination-summary" : null,
        fetcher
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-semibold text-xl">Metrik Halusinasi</h2>
                <p className="text-muted-foreground">
                    Analisis mendalam tentang tingkat halusinasi dan konsistensi faktual sistem RAG
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Tingkat Halusinasi
                        </CardDescription>
                        <CardTitle className="text-3xl text-amber-600">
                            {hallucinationData?.avgHallucinationRate
                                ? `${(hallucinationData.avgHallucinationRate * 100).toFixed(1)}%`
                                : "N/A"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-xs">Rata-rata informasi yang dibuat-buat</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Konsistensi Faktual
                        </CardDescription>
                        <CardTitle className="text-3xl text-green-600">
                            {hallucinationData?.avgFactualConsistency
                                ? `${(hallucinationData.avgFactualConsistency * 100).toFixed(1)}%`
                                : "N/A"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-xs">Tingkat kesesuaian dengan sumber</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            Atribusi Sumber
                        </CardDescription>
                        <CardTitle className="text-3xl text-blue-600">
                            {hallucinationData?.avgSourceAttribution
                                ? `${(hallucinationData.avgSourceAttribution * 100).toFixed(1)}%`
                                : "N/A"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-xs">Tingkat kutipan yang tepat</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            Bebas Kontradiksi
                        </CardDescription>
                        <CardTitle className="text-3xl text-purple-600">
                            {hallucinationData?.avgContradictionFree
                                ? `${(hallucinationData.avgContradictionFree * 100).toFixed(1)}%`
                                : "N/A"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-xs">Tidak ada pernyataan yang bertentangan</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Analisis Halusinasi per Evaluasi</CardTitle>
                    <CardDescription>Perbandingan metrik halusinasi RAG vs Non-RAG</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Evaluasi</TableHead>
                                <TableHead>RAG Halusinasi</TableHead>
                                <TableHead>Non-RAG Halusinasi</TableHead>
                                <TableHead>Peningkatan</TableHead>
                                <TableHead>Konsistensi Faktual</TableHead>
                                <TableHead>Atribusi Sumber</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {runs.length === 0 ? (
                                <TableRow>
                                    <TableCell className="py-8 text-center text-muted-foreground" colSpan={6}>
                                        Belum ada data evaluasi yang selesai
                                    </TableCell>
                                </TableRow>
                            ) : (
                                runs.slice(0, 5).map((run) => <HallucinationRow key={run.id} run={run} />)
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Jenis Halusinasi yang Terdeteksi</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                            <h4 className="font-medium text-sm">Kategori Halusinasi</h4>
                            {[
                                { name: "Fabrikasi Fakta", desc: "Informasi yang sepenuhnya dibuat-buat", pct: 15 },
                                { name: "Generalisasi Berlebih", desc: "Pernyataan terlalu umum tanpa dasar", pct: 25 },
                                { name: "Salah Atribusi", desc: "Mengaitkan ke sumber yang salah", pct: 10 },
                                { name: "Detail Tidak Akurat", desc: "Angka, tanggal, atau nama yang salah", pct: 20 },
                                { name: "Inferensi Keliru", desc: "Kesimpulan yang tidak didukung", pct: 30 },
                            ].map((item) => (
                                <div className="space-y-1" key={item.name}>
                                    <div className="flex justify-between text-sm">
                                        <span>{item.name}</span>
                                        <span className="text-muted-foreground">{item.pct}%</span>
                                    </div>
                                    <Progress className="h-2" value={item.pct} />
                                    <p className="text-muted-foreground text-xs">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-3">
                            <h4 className="font-medium text-sm">Rekomendasi Perbaikan</h4>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
                                    <span>Tingkatkan jumlah konteks yang diambil (top-K)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
                                    <span>Gunakan re-ranker untuk meningkatkan relevansi konteks</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
                                    <span>Aktifkan guardrails untuk validasi output</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
                                    <span>Perkuat instruksi untuk selalu mengutip sumber</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
                                    <span>Gunakan mode agentik untuk verifikasi multi-langkah</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function EvaluationResults({
    run,
    questions,
    aggregateMetrics,
    evaluationRunId,
}: {
    run: EvaluationRun;
    questions: EvaluationQuestion[];
    aggregateMetrics: AggregateMetrics;
    evaluationRunId: string;
}) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-foreground text-xl">{run.name}</h2>
                    <p className="text-muted-foreground">{run.description}</p>
                </div>
                <div className="flex gap-2">
                    {run.useAgenticMode && (
                        <Badge className="gap-1">
                            <Brain className="h-3 w-3" /> Mode Agentik
                        </Badge>
                    )}
                    {run.retrievalStrategy && (
                        <Badge className="gap-1" variant="secondary">
                            <Zap className="h-3 w-3" /> {run.retrievalStrategy}
                        </Badge>
                    )}
                    {run.chunkingStrategy && (
                        <Badge className="gap-1" variant="outline">
                            <Layers className="h-3 w-3" /> {run.chunkingStrategy}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Aggregate Metrics */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Performa RAG
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <MetricRow
                                description="Kesetiaan terhadap konteks"
                                label="Kesetiaan"
                                value={aggregateMetrics?.rag?.faithfulness || 0}
                            />
                            <MetricRow
                                description="Relevansi jawaban"
                                label="Relevansi Jawaban"
                                value={aggregateMetrics?.rag?.answerRelevancy || 0}
                            />
                            <MetricRow
                                description="Presisi retrieval"
                                label="Presisi Konteks"
                                value={aggregateMetrics?.rag?.contextPrecision || 0}
                            />
                            <MetricRow
                                description="Kelengkapan retrieval"
                                label="Recall Konteks"
                                value={aggregateMetrics?.rag?.contextRecall || 0}
                            />
                            <MetricRow
                                description="Kebenaran vs ground truth"
                                label="Kebenaran Jawaban"
                                value={aggregateMetrics?.rag?.answerCorrectness || 0}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingDown className="h-5 w-5 text-muted-foreground" />
                            Baseline Non-RAG
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <MetricRow
                                description="Relevansi jawaban"
                                label="Relevansi Jawaban"
                                value={aggregateMetrics?.nonRag?.answerRelevancy || 0}
                            />
                            <MetricRow
                                description="Kebenaran vs ground truth"
                                label="Kebenaran Jawaban"
                                value={aggregateMetrics?.nonRag?.answerCorrectness || 0}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            {aggregateMetrics?.rag && aggregateMetrics?.nonRag && (
                <MetricsChart nonRagMetrics={aggregateMetrics.nonRag} ragMetrics={aggregateMetrics.rag} />
            )}

            {/* Question Results */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Hasil per Pertanyaan</CardTitle>
                    <CardDescription>Metrik detail untuk setiap pertanyaan evaluasi</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pertanyaan</TableHead>
                                <TableHead>RAG Correctness</TableHead>
                                <TableHead>Non-RAG</TableHead>
                                <TableHead>Faithfulness</TableHead>
                                <TableHead>Halusinasi</TableHead>
                                <TableHead>Retrieval</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {questions?.map((q: EvaluationQuestion) => (
                                <TableRow key={q.id}>
                                    <TableCell className="max-w-xs">
                                        <p className="truncate text-sm">{q.question}</p>
                                    </TableCell>
                                    <TableCell>
                                        <MetricBadge value={q.ragAnswerCorrectness} />
                                    </TableCell>
                                    <TableCell>
                                        <Badge className="text-xs" variant="outline">
                                            N/A
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <MetricBadge value={q.ragFaithfulness} />
                                    </TableCell>
                                    <TableCell>
                                        <MetricBadge inverted value={1 - (q.ragHallucinationRate || 0)} />
                                    </TableCell>
                                    <TableCell>
                                        <Badge className="text-xs" variant="outline">
                                            {q.retrievalMethod || "hybrid"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Data Export Panel */}
            <DataExportPanel evaluationRunId={evaluationRunId} runName={run.name} />
        </div>
    );
}

function MetricRow({
    label,
    value,
    description,
    inverted = false,
}: {
    label: string;
    value: number;
    description: string;
    inverted?: boolean;
}) {
    const displayValue = inverted ? 1 - value : value;
    const percentage = (displayValue * 100).toFixed(1);

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <span className="font-medium text-foreground text-sm">{label}</span>
                <span className="font-mono text-primary text-sm">{percentage}%</span>
            </div>
            <Progress className="h-2" value={value * 100} />
            <p className="text-muted-foreground text-xs">{description}</p>
        </div>
    );
}

function MetricBadge({ value, inverted = false }: { value: number | null | undefined; inverted?: boolean }) {
    if (value === null || value === undefined) return <Badge variant="outline">N/A</Badge>;

    const displayValue = inverted ? 1 - value : value;
    const percentage = (displayValue * 100).toFixed(0);
    let variant: "default" | "secondary" | "destructive" = "destructive";
    if (displayValue >= 0.7) {
        variant = "default";
    } else if (displayValue >= 0.4) {
        variant = "secondary";
    }

    return (
        <Badge className="font-mono" variant={variant}>
            {percentage}%
        </Badge>
    );
}

// New components from updates

function ComparisonChart({ runs }: { runs: EvaluationRun[] }) {
    const hasData = runs.length > 0;

    const metrics = useMemo(() => {
        if (!hasData) return [];

        return runs.map((run) => ({
            name: run.name,
            "Kebenaran RAG": run.aggregateMetrics?.rag?.answerCorrectness || 0,
            "Kebenaran Non-RAG": run.aggregateMetrics?.nonRag?.answerCorrectness || 0,
            "Kesetiaan RAG": run.aggregateMetrics?.rag?.faithfulness || 0,
            "Relevansi RAG": run.aggregateMetrics?.rag?.answerRelevancy || 0,
            "Presisi RAG": run.aggregateMetrics?.rag?.contextPrecision || 0,
            "Recall RAG": run.aggregateMetrics?.rag?.contextRecall || 0,
            "Tingkat Halusinasi": (1 - (run.aggregateMetrics?.avgHallucinationRate || 0)) * 100, // Inverted for clarity
            "Latensi (ms)": run.aggregateMetrics?.avgLatencyMs || 0,
        }));
    }, [runs, hasData]);

    if (!hasData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Perbandingan RAG vs Non-RAG</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                    Belum ada data evaluasi untuk ditampilkan. Jalankan beberapa evaluasi terlebih dahulu.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Perbandingan Metrik Utama</CardTitle>
                    <CardDescription>Perbandingan skor RAG vs Non-RAG untuk metrik kunci.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer height={400} width="100%">
                        <BarChart
                            data={metrics}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 1]} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                            <Tooltip
                                formatter={(value: number | undefined) =>
                                    value !== undefined ? `${(value * 100).toFixed(1)}%` : "N/A"
                                }
                            />
                            <Legend />
                            <Bar dataKey="Kebenaran RAG" fill="#10B981" />
                            <Bar dataKey="Kebenaran Non-RAG" fill="#6B7280" />
                            <Bar dataKey="Kesetiaan RAG" fill="#3B82F6" />
                            <Bar dataKey="Relevansi RAG" fill="#A855F7" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>RAG Metrik Detail</CardTitle>
                    <CardDescription>Visualisasi RAGAS metrics.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer height={350} width="100%">
                        <RadarChart cx="50%" cy="50%" data={metrics} outerRadius="80%">
                            <PolarGrid />
                            <PolarAngleAxis dataKey="name" />
                            <PolarRadiusAxis angle={30} domain={[0, 1]} />
                            <Radar
                                dataKey="Kebenaran RAG"
                                fill="#10B981"
                                fillOpacity={0.6}
                                name="RAG"
                                stroke="#10B981"
                            />
                            <Radar
                                dataKey="Kesetiaan RAG"
                                fill="#3B82F6"
                                fillOpacity={0.6}
                                name="RAG"
                                stroke="#3B82F6"
                            />
                            <Radar
                                dataKey="Relevansi RAG"
                                fill="#A855F7"
                                fillOpacity={0.6}
                                name="RAG"
                                stroke="#A855F7"
                            />
                            <Radar dataKey="Presisi RAG" fill="#F59E0B" fillOpacity={0.6} name="RAG" stroke="#F59E0B" />
                            <Radar dataKey="Recall RAG" fill="#06B6D4" fillOpacity={0.6} name="RAG" stroke="#06B6D4" />
                        </RadarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Performa Berdasarkan Strategi Retrieval</CardTitle>
                    <CardDescription>Analisis performa berdasarkan strategi retrieval yang digunakan.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer height={350} width="100%">
                        <LineChart
                            data={runs.map((run) => ({
                                name: run.retrievalStrategy || "Unknown",
                                Kebenaran: run.aggregateMetrics?.rag?.answerCorrectness || 0,
                                "Tingkat Halusinasi": (1 - (run.aggregateMetrics?.avgHallucinationRate || 0)) * 100,
                            }))}
                            margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line activeDot={{ r: 8 }} dataKey="Kebenaran" stroke="#10B981" type="monotone" />
                            <Line dataKey="Tingkat Halusinasi" stroke="#EF4444" type="monotone" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Perbandingan Halusinasi dan Latensi</CardTitle>
                    <CardDescription>Hubungan antara tingkat halusinasi dan latensi.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer height={350} width="100%">
                        <BarChart
                            data={metrics}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis
                                domain={[0, 100]}
                                orientation="left"
                                stroke="#EF4444"
                                tickFormatter={(val) => `${val}%`}
                                yAxisId="left"
                            />
                            <YAxis
                                domain={[0, Math.max(...runs.map((r) => r.aggregateMetrics?.avgLatencyMs || 0))]}
                                orientation="right"
                                stroke="#3B82F6"
                                yAxisId="right"
                            />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Hallucination Rate" fill="#EF4444" yAxisId="left" />
                            <Bar dataKey="Latency (ms)" fill="#3B82F6" yAxisId="right" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}

function InformationView() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-semibold text-xl">Informasi Sistem Evaluasi RAG</h2>
                <p className="text-muted-foreground">
                    Dokumentasi komprehensif mengenai metrik evaluasi, studi ablasi, dan analisis statistik yang
                    digunakan dalam sistem ini.
                </p>
            </div>

            {/* RAGAS Metrics Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="h-5 w-5 text-primary" />
                        Framework RAGAS (Retrieval-Augmented Generation Assessment)
                    </CardTitle>
                    <CardDescription>
                        Standar evaluasi RAG berdasarkan penelitian Shahul et al. (2023) - "RAGAS: Automated Evaluation
                        of Retrieval-Augmented Generation"
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <h4 className="mb-2 font-medium">Mengapa RAGAS?</h4>
                        <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
                            <li>Metrik berbasis LLM mengeliminasi kebutuhan pelabelan manual</li>
                            <li>Cakupan komprehensif: faithfulness, relevancy, precision, recall</li>
                            <li>Korelasi tinggi dengan penilaian manusia (Pearson r = 0.8-0.9)</li>
                            <li>Standar industri untuk evaluasi sistem RAG</li>
                        </ul>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3 rounded-lg border p-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <h4 className="font-medium">Faithfulness (Kesetiaan)</h4>
                            </div>
                            <p className="text-muted-foreground text-sm">
                                Mengukur seberapa banyak klaim dalam jawaban yang didukung oleh konteks yang diambil.
                            </p>
                            <div className="rounded bg-muted p-2 font-mono text-sm">
                                <Latex>
                                    {
                                        "$\\text{Faithfulness} = \\frac{|\\text{claims} \\cap \\text{context}|}{|\\text{claims}|}$"
                                    }
                                </Latex>
                            </div>
                            <p className="text-muted-foreground text-xs">
                                Range: 0-1 (1 = semua klaim didukung konteks)
                            </p>
                        </div>

                        <div className="space-y-3 rounded-lg border p-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                                <h4 className="font-medium">Answer Relevancy (Relevansi Jawaban)</h4>
                            </div>
                            <p className="text-muted-foreground text-sm">
                                Mengukur kesesuaian semantik antara pertanyaan dan jawaban menggunakan cosine
                                similarity.
                            </p>
                            <div className="rounded bg-muted p-2 font-mono text-sm">
                                <Latex>
                                    {
                                        "$\\text{Relevancy} = \\cos(\\vec{q}, \\vec{a}) = \\frac{\\vec{q} \\cdot \\vec{a}}{\\|\\vec{q}\\| \\|\\vec{a}\\|}$"
                                    }
                                </Latex>
                            </div>
                            <p className="text-muted-foreground text-xs">
                                Range: 0-1 (1 = sangat relevan dengan pertanyaan)
                            </p>
                        </div>

                        <div className="space-y-3 rounded-lg border p-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-purple-600" />
                                <h4 className="font-medium">Context Precision (Presisi Konteks)</h4>
                            </div>
                            <p className="text-muted-foreground text-sm">
                                Mengukur proporsi konteks yang diambil yang relevan untuk menjawab pertanyaan.
                            </p>
                            <div className="rounded bg-muted p-2 font-mono text-sm">
                                <Latex>
                                    {
                                        "$\\text{Precision@K} = \\frac{\\sum_{k=1}^{K} r_k \\cdot P@k}{\\sum_{k=1}^{K} r_k}$"
                                    }
                                </Latex>
                            </div>
                            <p className="text-muted-foreground text-xs">Range: 0-1 (1 = semua konteks relevan)</p>
                        </div>

                        <div className="space-y-3 rounded-lg border p-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-amber-600" />
                                <h4 className="font-medium">Context Recall (Recall Konteks)</h4>
                            </div>
                            <p className="text-muted-foreground text-sm">
                                Mengukur seberapa lengkap konteks yang diambil mencakup informasi yang diperlukan.
                            </p>
                            <div className="rounded bg-muted p-2 font-mono text-sm">
                                <Latex>{"$\\text{Recall} = \\frac{|\\text{GT} \\cap \\text{C}|}{|\\text{GT}|}$"}</Latex>
                            </div>
                            <p className="text-muted-foreground text-xs">GT = Ground Truth, C = Retrieved Context</p>
                        </div>

                        <div className="space-y-3 rounded-lg border p-4 md:col-span-2">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-cyan-600" />
                                <h4 className="font-medium">Answer Correctness (Kebenaran Jawaban)</h4>
                            </div>
                            <p className="text-muted-foreground text-sm">
                                Kombinasi weighted antara semantic similarity dan factual accuracy terhadap ground
                                truth.
                            </p>
                            <div className="rounded bg-muted p-2 font-mono text-sm">
                                <Latex>
                                    {
                                        "$\\text{Correctness} = 0.3 \\times \\text{Semantic}_{sim} + 0.7 \\times \\text{Factual}_{acc}$"
                                    }
                                </Latex>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Domain-Specific & Hallucination Metrics */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BookOpen className="h-5 w-5 text-primary" />
                            Metrik Domain-Spesifik (Akademik)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Citation Accuracy (Akurasi Sitasi)</h4>
                            <p className="text-muted-foreground text-xs">
                                Mengevaluasi apakah klaim-klaim utama memiliki atribusi sumber yang benar dan dapat
                                diverifikasi.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            Metrik Halusinasi
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Hallucination Rate</h4>
                            <p className="text-muted-foreground text-xs">
                                Proporsi informasi yang dibuat-buat dalam jawaban (0-1, lebih rendah lebih baik).
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Factual Consistency (NLI-based)</h4>
                            <p className="text-muted-foreground text-xs">
                                Menggunakan Natural Language Inference untuk menentukan apakah jawaban di-entail oleh
                                konteks (ENTAILMENT/NEUTRAL/CONTRADICTION).
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Source Attribution</h4>
                            <p className="text-muted-foreground text-xs">
                                Menilai apakah klaim-klaim penting diatribusikan dengan benar ke sumber yang tersedia.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Contradiction Score</h4>
                            <p className="text-muted-foreground text-xs">
                                Mendeteksi kontradiksi antara jawaban dan konteks sumber (1 = bebas kontradiksi).
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Retrieval Quality Metrics */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Zap className="h-5 w-5 text-primary" />
                        Metrik Kualitas Retrieval
                    </CardTitle>
                    <CardDescription>
                        Metrik standar Information Retrieval untuk mengevaluasi kualitas pengambilan dokumen
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-3 rounded-lg border p-4">
                            <h4 className="font-medium">NDCG (Normalized DCG)</h4>
                            <div className="rounded bg-muted p-2 font-mono text-xs">
                                <Latex>{"$\\text{NDCG} = \\frac{DCG}{IDCG}$"}</Latex>
                            </div>
                            <div className="rounded bg-muted p-2 font-mono text-xs">
                                <Latex>{"$DCG = \\sum_{i=1}^{k} \\frac{rel_i}{\\log_2(i+1)}$"}</Latex>
                            </div>
                            <p className="text-muted-foreground text-xs">
                                Järvelin & Kekäläinen (2002) - Mengukur kualitas ranking dengan mempertimbangkan posisi
                                dokumen relevan.
                            </p>
                        </div>

                        <div className="space-y-3 rounded-lg border p-4">
                            <h4 className="font-medium">MRR (Mean Reciprocal Rank)</h4>
                            <div className="rounded bg-muted p-2 font-mono text-xs">
                                <Latex>{"$\\text{MRR} = \\frac{1}{|Q|}\\sum_{i=1}^{|Q|} \\frac{1}{rank_i}$"}</Latex>
                            </div>
                            <p className="text-muted-foreground text-xs">
                                Mengukur seberapa cepat dokumen relevan pertama ditemukan dalam hasil pencarian.
                            </p>
                        </div>

                        <div className="space-y-3 rounded-lg border p-4">
                            <h4 className="font-medium">Precision@K</h4>
                            <div className="rounded bg-muted p-2 font-mono text-xs">
                                <Latex>
                                    {"$P@K = \\frac{|\\{\\text{relevant}\\} \\cap \\{\\text{retrieved}\\}|}{K}$"}
                                </Latex>
                            </div>
                            <p className="text-muted-foreground text-xs">
                                Proporsi dokumen relevan dalam K dokumen teratas yang diambil.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Ablation Study Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FlaskConical className="h-5 w-5 text-primary" />
                        Studi Ablasi
                    </CardTitle>
                    <CardDescription>
                        Metodologi untuk mengidentifikasi kontribusi masing-masing komponen terhadap performa sistem
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <h4 className="mb-2 font-medium">Apa itu Studi Ablasi?</h4>
                        <p className="text-muted-foreground text-sm">
                            Studi ablasi adalah metode evaluasi yang secara sistematis menghapus atau memodifikasi
                            komponen sistem untuk mengukur kontribusi individual setiap komponen terhadap performa
                            keseluruhan. Dalam konteks RAG, ini membantu mengidentifikasi apakah peningkatan performa
                            berasal dari strategi retrieval, reranking, chunking, atau kombinasinya.
                        </p>
                    </div>

                    <div>
                        <h4 className="mb-3 font-medium">9 Konfigurasi yang Diuji</h4>
                        <div className="grid gap-3 md:grid-cols-3">
                            {[
                                {
                                    name: "Baseline (Tanpa RAG)",
                                    desc: "LLM murni tanpa retrieval - sebagai kontrol",
                                    config: "useRag: false",
                                },
                                {
                                    name: "Vector Only",
                                    desc: "Hanya embedding similarity",
                                    config: "retrievalStrategy: 'vector'",
                                },
                                {
                                    name: "BM25 Only",
                                    desc: "Hanya Okapi BM25 keyword matching",
                                    config: "retrievalStrategy: 'keyword'",
                                },
                                {
                                    name: "Hybrid (Tanpa Re-rank)",
                                    desc: "Vector + BM25 fusion tanpa reranking",
                                    config: "retrievalStrategy: 'hybrid', useReranker: false",
                                },
                                {
                                    name: "Hybrid + Cross-Encoder",
                                    desc: "Dengan cross-encoder reranking",
                                    config: "rerankerStrategy: 'cross_encoder'",
                                },
                                {
                                    name: "Hybrid + LLM Re-rank",
                                    desc: "Dengan LLM-based reranking",
                                    config: "rerankerStrategy: 'llm'",
                                },
                                {
                                    name: "Hybrid + Ensemble",
                                    desc: "Kombinasi semua reranker",
                                    config: "rerankerStrategy: 'ensemble'",
                                },
                                {
                                    name: "Agentic Mode",
                                    desc: "Multi-step reasoning dengan planning",
                                    config: "useAgenticMode: true",
                                },
                                {
                                    name: "Full System",
                                    desc: "Semua fitur aktif termasuk guardrails",
                                    config: "useGuardrails: true, useAgenticMode: true",
                                },
                            ].map((config) => (
                                <div className="rounded-lg border p-3" key={config.name}>
                                    <p className="font-medium text-sm">{config.name}</p>
                                    <p className="text-muted-foreground text-xs">{config.desc}</p>
                                    <code className="mt-1 block rounded bg-muted px-1 text-xs">{config.config}</code>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="mb-3 font-medium">Parameter Konfigurasi (AblationConfig)</h4>
                        <div className="grid gap-2 md:grid-cols-2">
                            {[
                                { param: "useRag", desc: "Mengaktifkan/menonaktifkan retrieval" },
                                { param: "useReranker", desc: "Mengaktifkan/menonaktifkan reranking" },
                                {
                                    param: "rerankerStrategy",
                                    desc: "'cross_encoder' | 'llm' | 'cohere' | 'ensemble'",
                                },
                                { param: "retrievalStrategy", desc: "'vector' | 'keyword' | 'hybrid'" },
                                {
                                    param: "chunkingStrategy",
                                    desc: "'recursive' | 'semantic' | 'sentence_window' | 'hierarchical'",
                                },
                                { param: "useAgenticMode", desc: "Multi-step reasoning dengan tool calls" },
                                { param: "useGuardrails", desc: "Validasi output untuk keamanan" },
                                { param: "topK", desc: "Jumlah dokumen yang diambil" },
                                { param: "language", desc: "'en' | 'id' | 'auto'" },
                            ].map((item) => (
                                <div className="flex gap-2 rounded border p-2" key={item.param}>
                                    <code className="font-mono text-primary text-xs">{item.param}</code>
                                    <span className="text-muted-foreground text-xs">{item.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Statistical Analysis Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Analisis Statistik
                    </CardTitle>
                    <CardDescription>Metode statistik yang digunakan untuk menganalisis hasil evaluasi</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Descriptive Statistics */}
                    <div className="space-y-3">
                        <h4 className="font-medium">Statistik Deskriptif</h4>
                        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                            {[
                                { name: "Mean", formula: "\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i" },
                                { name: "Median", formula: "\\tilde{x}" },
                                { name: "Std Dev", formula: "s = \\sqrt{\\frac{\\sum(x_i - \\bar{x})^2}{n-1}}" },
                                { name: "SEM", formula: "SE = \\frac{s}{\\sqrt{n}}" },
                                {
                                    name: "Skewness",
                                    formula:
                                        "\\gamma_1 = \\frac{n}{(n-1)(n-2)}\\sum\\left(\\frac{x_i-\\bar{x}}{s}\\right)^3",
                                },
                                {
                                    name: "Kurtosis",
                                    formula:
                                        "\\gamma_2 = \\frac{n(n+1)}{(n-1)(n-2)(n-3)}\\sum\\left(\\frac{x_i-\\bar{x}}{s}\\right)^4 - 3",
                                },
                            ].map((stat) => (
                                <div className="rounded border p-2 text-center" key={stat.name}>
                                    <p className="font-medium text-xs">{stat.name}</p>
                                    <div className="mt-1 overflow-x-auto rounded bg-muted p-1 text-xs">
                                        <Latex>{`$${stat.formula}$`}</Latex>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hypothesis Testing */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3 rounded-lg border p-4">
                            <h4 className="font-medium">Paired t-Test (Uji t Berpasangan)</h4>
                            <p className="text-muted-foreground text-xs">
                                Digunakan untuk membandingkan RAG vs Non-RAG pada pertanyaan yang sama.
                            </p>
                            <div className="rounded bg-muted p-2 text-center">
                                <Latex>{"$t = \\frac{\\bar{d}}{s_d / \\sqrt{n}}$"}</Latex>
                            </div>
                            <p className="text-muted-foreground text-xs">
                                di mana <Latex>{"$\\bar{d}$"}</Latex> = mean perbedaan, <Latex>{"$s_d$"}</Latex> =
                                standar deviasi perbedaan
                            </p>
                        </div>

                        <div className="space-y-3 rounded-lg border p-4">
                            <h4 className="font-medium">Independent t-Test (Welch's)</h4>
                            <p className="text-muted-foreground text-xs">
                                Untuk membandingkan dua kelompok independen tanpa asumsi varians sama.
                            </p>
                            <div className="rounded bg-muted p-2 text-center">
                                <Latex>
                                    {
                                        "$t = \\frac{\\bar{x}_1 - \\bar{x}_2}{\\sqrt{\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}}}$"
                                    }
                                </Latex>
                            </div>
                            <p className="text-muted-foreground text-xs">Welch-Satterthwaite df digunakan.</p>
                        </div>

                        <div className="space-y-3 rounded-lg border p-4">
                            <h4 className="font-medium">One-way ANOVA</h4>
                            <p className="text-muted-foreground text-xs">
                                Untuk membandingkan lebih dari 2 kelompok (misalnya, berbagai strategi retrieval).
                            </p>
                            <div className="rounded bg-muted p-2 text-center">
                                <Latex>
                                    {"$F = \\frac{MS_{between}}{MS_{within}} = \\frac{SS_B / (k-1)}{SS_W / (N-k)}$"}
                                </Latex>
                            </div>
                        </div>

                        <div className="space-y-3 rounded-lg border p-4">
                            <h4 className="font-medium">Post-hoc Tukey HSD</h4>
                            <p className="text-muted-foreground text-xs">
                                Perbandingan berpasangan setelah ANOVA signifikan untuk menemukan kelompok mana yang
                                berbeda.
                            </p>
                            <div className="rounded bg-muted p-2 text-center">
                                <Latex>
                                    {"$q = \\frac{|\\bar{x}_i - \\bar{x}_j|}{\\sqrt{MS_W \\cdot (1/n_i + 1/n_j) / 2}}$"}
                                </Latex>
                            </div>
                        </div>
                    </div>

                    {/* Effect Sizes */}
                    <div className="space-y-3">
                        <h4 className="font-medium">Ukuran Efek (Effect Size)</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-3 rounded-lg border p-4">
                                <h5 className="font-medium text-sm">Cohen's d</h5>
                                <div className="rounded bg-muted p-2 text-center">
                                    <Latex>{"$d = \\frac{\\bar{x}_1 - \\bar{x}_2}{s_{pooled}}$"}</Latex>
                                </div>
                                <div className="mt-2 space-y-1">
                                    <p className="text-xs">
                                        <Badge variant="outline">|d| &lt; 0.2</Badge> Dapat diabaikan (negligible)
                                    </p>
                                    <p className="text-xs">
                                        <Badge variant="outline">0.2 ≤ |d| &lt; 0.5</Badge> Kecil (small)
                                    </p>
                                    <p className="text-xs">
                                        <Badge variant="outline">0.5 ≤ |d| &lt; 0.8</Badge> Sedang (medium)
                                    </p>
                                    <p className="text-xs">
                                        <Badge variant="outline">|d| ≥ 0.8</Badge> Besar (large)
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 rounded-lg border p-4">
                                <h5 className="font-medium text-sm">Eta-squared (η²)</h5>
                                <div className="rounded bg-muted p-2 text-center">
                                    <Latex>{"$\\eta^2 = \\frac{SS_{between}}{SS_{total}}$"}</Latex>
                                </div>
                                <div className="mt-2 space-y-1">
                                    <p className="text-xs">
                                        <Badge variant="outline">η² &lt; 0.01</Badge> Dapat diabaikan
                                    </p>
                                    <p className="text-xs">
                                        <Badge variant="outline">0.01 ≤ η² &lt; 0.06</Badge> Kecil
                                    </p>
                                    <p className="text-xs">
                                        <Badge variant="outline">0.06 ≤ η² &lt; 0.14</Badge> Sedang
                                    </p>
                                    <p className="text-xs">
                                        <Badge variant="outline">η² ≥ 0.14</Badge> Besar
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Confidence Intervals */}
                    <div className="space-y-3">
                        <h4 className="font-medium">Interval Kepercayaan (Confidence Interval)</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border p-4">
                                <h5 className="font-medium text-sm">Parametrik (t-distribution)</h5>
                                <div className="mt-2 rounded bg-muted p-2 text-center text-sm">
                                    <Latex>{"$CI = \\bar{x} \\pm t_{\\alpha/2, df} \\times SE$"}</Latex>
                                </div>
                            </div>
                            <div className="rounded-lg border p-4">
                                <h5 className="font-medium text-sm">Bootstrap (Non-parametrik)</h5>
                                <p className="mt-2 text-muted-foreground text-xs">
                                    Resampling dengan replacement sebanyak 1000-10000 kali untuk estimasi distribusi
                                    sampling tanpa asumsi distribusi.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Data Export Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Layers className="h-5 w-5 text-primary" />
                        Pengumpulan Data & Ekspor
                    </CardTitle>
                    <CardDescription>Format ekspor data untuk analisis lanjutan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-5">
                        {[
                            { format: "CSV", desc: "Universal - Excel, pandas, R", icon: "📊" },
                            { format: "JSON", desc: "Programmatic access, metadata", icon: "📋" },
                            { format: "SPSS", desc: "Syntax file (.sps) untuk import", icon: "📈" },
                            { format: "Python", desc: "Script lengkap dengan scipy, matplotlib", icon: "🐍" },
                            { format: "R", desc: "Script dengan ggplot2 dan uji statistik", icon: "📉" },
                        ].map((item) => (
                            <div className="rounded-lg border p-3 text-center" key={item.format}>
                                <span className="text-2xl">{item.icon}</span>
                                <p className="font-medium text-sm">{item.format}</p>
                                <p className="text-muted-foreground text-xs">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-lg border bg-muted/30 p-4">
                        <h4 className="mb-2 font-medium text-sm">Struktur Data Evaluasi (RawEvaluationData)</h4>
                        <p className="text-muted-foreground text-xs">
                            Setiap record berisi: questionId, question, groundTruth, ragAnswer, nonRagAnswer, serta
                            semua metrik RAGAS (ragFaithfulness, ragAnswerRelevancy, dll.), metrik domain-spesifik,
                            metrik halusinasi, metrik retrieval, dan metrik latensi untuk analisis performa lengkap.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Research Foundation */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Dasar Penelitian
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
                        <li>
                            <strong>RAGAS:</strong> Shahul et al. (2023) - "RAGAS: Automated Evaluation of
                            Retrieval-Augmented Generation"
                        </li>
                        <li>
                            <strong>NDCG:</strong> Järvelin & Kekäläinen (2002) - "Cumulated Gain-Based Evaluation of IR
                            Techniques"
                        </li>
                        <li>
                            <strong>Faithfulness (NLI):</strong> Honovich et al. (2022) - "TRUE: Re-evaluating Factual
                            Consistency Evaluation"
                        </li>
                        <li>
                            <strong>Effect Size Guidelines:</strong> Cohen (1988) - "Statistical Power Analysis for the
                            Behavioral Sciences"
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
