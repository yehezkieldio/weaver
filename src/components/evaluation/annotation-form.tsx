"use client";

import { AlertCircle, CheckCircle2, Clock, Loader2, Send, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

interface AnnotationFormProps {
    question: {
        id: string;
        question: string;
        groundTruth: string;
        ragAnswer: string | null;
        retrievedContexts: string[] | null;
        automatedScores?: {
            faithfulness: number | null;
            relevancy: number | null;
            correctness: number | null;
            hallucinationRate: number | null;
        };
    };
    annotatorId: string;
    onSubmit: (annotation: AnnotationData) => Promise<void>;
    onSkip?: () => void;
}

export interface AnnotationData {
    evaluationQuestionId: string;
    annotatorId: string;
    faithfulnessRating: number;
    relevancyRating: number;
    correctnessRating: number;
    hasHallucination: boolean;
    hallucinationNotes?: string;
    overallQuality: number;
    annotationTimeMs: number;
    notes?: string;
}

/**
 * AnnotationForm Component
 *
 * Provides a structured form for human annotators to rate RAG responses.
 *
 * Features:
 * - 5-point Likert scales for faithfulness, relevancy, correctness
 * - Binary hallucination detection with optional notes
 * - Timer to track annotation duration
 * - Shows question, RAG answer, and retrieved contexts for reference
 */

const RATING_LABELS: Record<number, string> = {
    1: "Sangat Buruk",
    2: "Buruk",
    3: "Cukup",
    4: "Baik",
    5: "Sangat Baik",
};

interface RatingScaleProps {
    label: string;
    description: string;
    value: number | null;
    onChange: (v: number) => void;
    automatedScore?: number | null;
}

function RatingScale({ label, description, value, onChange, automatedScore }: RatingScaleProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <Label className="font-medium text-sm">{label}</Label>
                    <p className="text-muted-foreground text-xs">{description}</p>
                </div>
                {automatedScore !== null && automatedScore !== undefined && (
                    <Badge className="text-xs" variant="outline">
                        Auto: {(automatedScore * 100).toFixed(0)}%
                    </Badge>
                )}
            </div>
            <RadioGroup
                className="flex gap-2"
                onValueChange={(v) => onChange(Number(v))}
                value={value?.toString() ?? ""}
            >
                {[1, 2, 3, 4, 5].map((rating) => (
                    <div className="flex flex-col items-center gap-1" key={rating}>
                        <RadioGroupItem className="peer sr-only" id={`${label}-${rating}`} value={rating.toString()} />
                        <Label
                            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 font-medium text-sm transition-colors ${
                                value === rating
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted hover:border-primary/50"
                            }`}
                            htmlFor={`${label}-${rating}`}
                        >
                            {rating}
                        </Label>
                        <span className="max-w-[60px] text-center text-[10px] text-muted-foreground">
                            {RATING_LABELS[rating]}
                        </span>
                    </div>
                ))}
            </RadioGroup>
        </div>
    );
}

function getHallucinationValue(hasHallucination: boolean | null): string {
    if (hasHallucination === null) return "";
    return hasHallucination ? "yes" : "no";
}
export function AnnotationForm({ question, annotatorId, onSubmit, onSkip }: AnnotationFormProps) {
    const [faithfulness, setFaithfulness] = useState<number | null>(null);
    const [relevancy, setRelevancy] = useState<number | null>(null);
    const [correctness, setCorrectness] = useState<number | null>(null);
    const [hasHallucination, setHasHallucination] = useState<boolean | null>(null);
    const [hallucinationNotes, setHallucinationNotes] = useState("");
    const [overallQuality, setOverallQuality] = useState<number | null>(null);
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startTime] = useState(Date.now());

    // Reset form when question changes
    useEffect(() => {
        setFaithfulness(null);
        setRelevancy(null);
        setCorrectness(null);
        setHasHallucination(null);
        setHallucinationNotes("");
        setOverallQuality(null);
        setNotes("");
        setError(null);
    }, []);

    const isValid =
        faithfulness !== null &&
        relevancy !== null &&
        correctness !== null &&
        hasHallucination !== null &&
        overallQuality !== null;

    const handleSubmit = useCallback(async () => {
        if (!isValid) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const annotationData: AnnotationData = {
                evaluationQuestionId: question.id,
                annotatorId,
                faithfulnessRating: faithfulness,
                relevancyRating: relevancy,
                correctnessRating: correctness,
                hasHallucination,
                hallucinationNotes: hallucinationNotes || undefined,
                overallQuality,
                annotationTimeMs: Date.now() - startTime,
                notes: notes || undefined,
            };

            await onSubmit(annotationData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit annotation");
        } finally {
            setIsSubmitting(false);
        }
    }, [
        isValid,
        question.id,
        annotatorId,
        faithfulness,
        relevancy,
        correctness,
        hasHallucination,
        hallucinationNotes,
        overallQuality,
        notes,
        startTime,
        onSubmit,
    ]);

    return (
        <div className="space-y-6">
            {/* Question and Context Display */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Pertanyaan</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm">{question.question}</p>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            Jawaban RAG
                            <Badge variant="secondary">Sistem</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[200px]">
                            <p className="whitespace-pre-wrap text-sm">{question.ragAnswer || "Tidak ada jawaban"}</p>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            Ground Truth
                            <Badge variant="outline">Referensi</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[200px]">
                            <p className="whitespace-pre-wrap text-sm">{question.groundTruth}</p>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {question.retrievedContexts && question.retrievedContexts.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                            Konteks yang Diambil ({question.retrievedContexts.length})
                        </CardTitle>
                        <CardDescription>Dokumen sumber yang digunakan untuk menghasilkan jawaban</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[150px]">
                            <div className="space-y-2">
                                {question.retrievedContexts.map((ctx, idx) => (
                                    <div
                                        className="rounded border p-2 text-xs"
                                        key={`ctx-${idx}-${ctx.slice(0, 20).replace(/\s/g, "-")}`}
                                    >
                                        <Badge className="mb-1" variant="outline">
                                            Konteks {idx + 1}
                                        </Badge>
                                        <p className="line-clamp-3 text-muted-foreground">{ctx}</p>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            {/* Rating Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Penilaian Manual
                    </CardTitle>
                    <CardDescription>Berikan penilaian berdasarkan pengamatan Anda (skala 1-5)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <RatingScale
                        automatedScore={question.automatedScores?.faithfulness}
                        description="Seberapa baik jawaban konsisten dengan konteks yang diambil?"
                        label="Kesetiaan (Faithfulness)"
                        onChange={setFaithfulness}
                        value={faithfulness}
                    />

                    <RatingScale
                        automatedScore={question.automatedScores?.relevancy}
                        description="Seberapa relevan jawaban dengan pertanyaan yang diajukan?"
                        label="Relevansi (Relevancy)"
                        onChange={setRelevancy}
                        value={relevancy}
                    />

                    <RatingScale
                        automatedScore={question.automatedScores?.correctness}
                        description="Seberapa akurat jawaban dibandingkan ground truth?"
                        label="Kebenaran (Correctness)"
                        onChange={setCorrectness}
                        value={correctness}
                    />

                    <RatingScale
                        description="Penilaian keseluruhan kualitas jawaban"
                        label="Kualitas Keseluruhan"
                        onChange={setOverallQuality}
                        value={overallQuality}
                    />

                    {/* Hallucination Detection */}
                    <div className="space-y-3 border-t pt-4">
                        <Label className="font-medium text-sm">Deteksi Halusinasi</Label>
                        <p className="text-muted-foreground text-xs">
                            Apakah jawaban mengandung informasi yang dibuat-buat (tidak ada di sumber)?
                        </p>
                        <RadioGroup
                            className="flex gap-4"
                            onValueChange={(v) => setHasHallucination(v === "yes")}
                            value={getHallucinationValue(hasHallucination)}
                        >
                            <div className="flex items-center gap-2">
                                <RadioGroupItem id="no-hallucination" value="no" />
                                <Label className="flex cursor-pointer items-center gap-1" htmlFor="no-hallucination">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    Tidak ada halusinasi
                                </Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem id="has-hallucination" value="yes" />
                                <Label className="flex cursor-pointer items-center gap-1" htmlFor="has-hallucination">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    Terdapat halusinasi
                                </Label>
                            </div>
                        </RadioGroup>

                        {hasHallucination && (
                            <Textarea
                                className="mt-2"
                                onChange={(e) => setHallucinationNotes(e.target.value)}
                                placeholder="Jelaskan bagian mana yang merupakan halusinasi..."
                                value={hallucinationNotes}
                            />
                        )}
                    </div>

                    {/* General Notes */}
                    <div className="space-y-2 border-t pt-4">
                        <Label className="font-medium text-sm">Catatan Tambahan (Opsional)</Label>
                        <Textarea
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Catatan atau observasi tambahan..."
                            value={notes}
                        />
                    </div>
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="flex justify-between">
                {onSkip && (
                    <Button onClick={onSkip} variant="outline">
                        Lewati
                    </Button>
                )}
                <Button className="ml-auto" disabled={!isValid || isSubmitting} onClick={handleSubmit}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Menyimpan...
                        </>
                    ) : (
                        <>
                            <Send className="mr-2 h-4 w-4" />
                            Kirim Anotasi
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
