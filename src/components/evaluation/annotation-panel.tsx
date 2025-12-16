"use client";

import {
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Filter,
    Loader2,
    RefreshCw,
    User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type AnnotationData, AnnotationForm } from "./annotation-form";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SampledQuestion {
    id: string;
    question: string;
    groundTruth: string;
    ragAnswer: string | null;
    retrievedContexts: string[] | null;
    difficulty: "easy" | "medium" | "hard" | "unknown";
    automatedScores: {
        faithfulness: number | null;
        relevancy: number | null;
        correctness: number | null;
        hallucinationRate: number | null;
    };
    annotationCount: number;
    priority: "high" | "medium" | "low";
}

interface SamplingResponse {
    questions: SampledQuestion[];
    sampling: {
        total: number;
        sampled: number;
        strategy: string;
        byDifficulty: Record<string, number>;
        byScoreRange: Record<string, number>;
    };
    coverage: {
        annotated: number;
        pending: number;
        total: number;
        percentComplete: number;
    };
}

interface AnnotationPanelProps {
    evaluationRunId: string;
    runName?: string;
}

// Helper components - defined outside to prevent recreating on every render
function PriorityBadge({ priority }: { priority: string }) {
    const variants: Record<string, "destructive" | "default" | "secondary"> = {
        high: "destructive",
        medium: "default",
        low: "secondary",
    };
    return <Badge variant={variants[priority] || "secondary"}>{priority}</Badge>;
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
    const colors: Record<string, string> = {
        easy: "bg-green-100 text-green-800",
        medium: "bg-yellow-100 text-yellow-800",
        hard: "bg-red-100 text-red-800",
        unknown: "bg-gray-100 text-gray-800",
    };
    return (
        <Badge className={colors[difficulty]} variant="outline">
            {difficulty}
        </Badge>
    );
}

/**
 * AnnotationPanel Component
 *
 * Manages the human annotation workflow for a specific evaluation run.
 *
 * Features:
 * - Question sampling with different strategies (stratified, random, outliers)
 * - Progress tracking
 * - Filter by difficulty and priority
 * - Sequential annotation mode
 */
export function AnnotationPanel({ evaluationRunId, runName = "Evaluation" }: AnnotationPanelProps) {
    const [annotatorId, setAnnotatorId] = useState("");
    const [samplingStrategy, setSamplingStrategy] = useState<"stratified" | "random" | "outliers">("stratified");
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [completedInSession, setCompletedInSession] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Load annotator ID from localStorage
    useEffect(() => {
        const savedAnnotatorId = localStorage.getItem("annotatorId");
        if (savedAnnotatorId) {
            setAnnotatorId(savedAnnotatorId);
        }
    }, []);

    // Save annotator ID to localStorage
    useEffect(() => {
        if (annotatorId) {
            localStorage.setItem("annotatorId", annotatorId);
        }
    }, [annotatorId]);

    // Fetch sampled questions
    const samplingUrl = annotatorId
        ? `/api/evaluation/annotations/sampling?runId=${evaluationRunId}&strategy=${samplingStrategy}&annotatorId=${annotatorId}&count=30`
        : null;

    const {
        data: samplingData,
        error: samplingError,
        mutate: refreshSampling,
    } = useSWR<SamplingResponse>(samplingUrl, fetcher, { revalidateOnFocus: false });

    const questions = samplingData?.questions || [];
    const currentQuestion = questions[currentQuestionIndex];
    const coverage = samplingData?.coverage;

    const handleSubmitAnnotation = useCallback(
        async (annotation: AnnotationData) => {
            setIsSubmitting(true);
            setSubmitError(null);
            setSubmitSuccess(false);

            try {
                const response = await fetch("/api/evaluation/annotations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(annotation),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Failed to submit annotation");
                }

                setSubmitSuccess(true);
                setCompletedInSession((prev) => prev + 1);

                // Move to next question after short delay
                setTimeout(() => {
                    setSubmitSuccess(false);
                    if (currentQuestionIndex < questions.length - 1) {
                        setCurrentQuestionIndex((prev) => prev + 1);
                    } else {
                        // Refresh to get new questions
                        refreshSampling();
                        setCurrentQuestionIndex(0);
                    }
                }, 1000);
            } catch (err) {
                setSubmitError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setIsSubmitting(false);
            }
        },
        [currentQuestionIndex, questions.length, refreshSampling]
    );

    const handleSkip = useCallback(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
        }
    }, [currentQuestionIndex, questions.length]);

    // Setup view when no annotator ID
    if (!annotatorId) {
        return (
            <Card className="mx-auto mt-8 max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Identifikasi Anotator
                    </CardTitle>
                    <CardDescription>Masukkan ID anotator untuk melacak penilaian Anda</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="annotatorId">ID Anotator</Label>
                        <Input
                            id="annotatorId"
                            onChange={(e) => setAnnotatorId(e.target.value)}
                            placeholder="Contoh: annotator-1 atau nama-anda"
                            value={annotatorId}
                        />
                        <p className="text-muted-foreground text-xs">
                            ID ini akan disimpan di browser untuk sesi berikutnya
                        </p>
                    </div>
                    <Button
                        className="w-full"
                        disabled={!annotatorId.trim()}
                        onClick={() => setAnnotatorId(annotatorId.trim())}
                    >
                        Mulai Anotasi
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Stats */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="font-bold text-2xl">Anotasi Manual</h2>
                    <p className="text-muted-foreground">
                        {runName} • Anotator: <span className="font-medium">{annotatorId}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setAnnotatorId("")} size="sm" variant="outline">
                        Ganti Anotator
                    </Button>
                    <Button onClick={() => refreshSampling()} size="sm" variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Progress Overview */}
            {coverage && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span>Progress Anotasi</span>
                                <span className="font-medium">{coverage.percentComplete}%</span>
                            </div>
                            <Progress value={coverage.percentComplete} />
                            <div className="grid grid-cols-3 gap-4 text-center text-sm">
                                <div>
                                    <p className="font-bold text-2xl text-green-600">{coverage.annotated}</p>
                                    <p className="text-muted-foreground">Teranotasi</p>
                                </div>
                                <div>
                                    <p className="font-bold text-2xl text-yellow-600">{coverage.pending}</p>
                                    <p className="text-muted-foreground">Menunggu</p>
                                </div>
                                <div>
                                    <p className="font-bold text-2xl text-blue-600">{completedInSession}</p>
                                    <p className="text-muted-foreground">Sesi Ini</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Sampling Controls */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Filter className="h-4 w-4" />
                        Strategi Sampling
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <div className="space-y-2">
                            <Label>Metode Sampling</Label>
                            <Select
                                onValueChange={(v) => setSamplingStrategy(v as typeof samplingStrategy)}
                                value={samplingStrategy}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="stratified">Stratified (Proporsional)</SelectItem>
                                    <SelectItem value="random">Random</SelectItem>
                                    <SelectItem value="outliers">Outliers (Skor Ekstrem)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {samplingData?.sampling && (
                            <div className="flex flex-wrap items-end gap-2">
                                <Badge variant="outline">
                                    {samplingData.sampling.sampled} dari {samplingData.sampling.total} pertanyaan
                                </Badge>
                                {Object.entries(samplingData.sampling.byDifficulty).map(([diff, count]) => (
                                    <Badge key={diff} variant="secondary">
                                        {diff}: {count}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Error Display */}
            {samplingError && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>Gagal memuat pertanyaan: {samplingError.message}</AlertDescription>
                </Alert>
            )}

            {submitError && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{submitError}</AlertDescription>
                </Alert>
            )}

            {submitSuccess && (
                <Alert className="border-green-500 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">
                        Anotasi berhasil disimpan! Berpindah ke pertanyaan berikutnya...
                    </AlertDescription>
                </Alert>
            )}

            {/* Loading State */}
            {!samplingData && samplingUrl && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* No Questions */}
            {samplingData && questions.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
                        <h3 className="font-medium text-lg">Semua Pertanyaan Telah Dianotasi!</h3>
                        <p className="mt-2 text-muted-foreground">
                            Tidak ada pertanyaan lagi yang perlu dianotasi oleh Anda.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Annotation Interface */}
            {currentQuestion && (
                <Tabs className="w-full" defaultValue="annotate">
                    <TabsList>
                        <TabsTrigger value="annotate">
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Annotate
                        </TabsTrigger>
                        <TabsTrigger value="list">Daftar Pertanyaan ({questions.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent className="mt-4" value="annotate">
                        {/* Question Navigation */}
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button
                                    disabled={currentQuestionIndex === 0}
                                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                                    size="icon"
                                    variant="outline"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm">
                                    Pertanyaan {currentQuestionIndex + 1} dari {questions.length}
                                </span>
                                <Button
                                    disabled={currentQuestionIndex === questions.length - 1}
                                    onClick={() =>
                                        setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))
                                    }
                                    size="icon"
                                    variant="outline"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <DifficultyBadge difficulty={currentQuestion.difficulty} />
                                <PriorityBadge priority={currentQuestion.priority} />
                                {currentQuestion.annotationCount > 0 && (
                                    <Badge variant="secondary">
                                        {currentQuestion.annotationCount} anotasi sebelumnya
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <AnnotationForm
                            annotatorId={annotatorId}
                            onSkip={handleSkip}
                            onSubmit={handleSubmitAnnotation}
                            question={currentQuestion}
                        />
                    </TabsContent>

                    <TabsContent className="mt-4" value="list">
                        <div className="space-y-2">
                            {questions.map((q, idx) => (
                                <Card
                                    className={`cursor-pointer transition-colors ${
                                        idx === currentQuestionIndex ? "border-primary" : ""
                                    }`}
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                >
                                    <CardContent className="py-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium text-sm">
                                                    {idx + 1}. {q.question}
                                                </p>
                                                <div className="mt-1 flex gap-2">
                                                    <DifficultyBadge difficulty={q.difficulty} />
                                                    <PriorityBadge priority={q.priority} />
                                                </div>
                                            </div>
                                            {q.automatedScores.correctness !== null && (
                                                <Badge variant="outline">
                                                    Auto: {(q.automatedScores.correctness * 100).toFixed(0)}%
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
