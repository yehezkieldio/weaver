"use client";

import { Brain, FileText, FlaskConical, Globe, Layers, Loader2, RefreshCw, Rocket, Shield, Zap } from "lucide-react";
import { type SetStateAction, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getQuestionCount } from "@/lib/evaluation-questions";

type EvaluationMode = "quick" | "production";

interface CreateEvaluationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: () => void;
}

export function CreateEvaluationDialog({ open, onOpenChange, onCreated }: CreateEvaluationDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [useAgenticMode, setUseAgenticMode] = useState(true);
    const [retrievalStrategy, setRetrievalStrategy] = useState<"vector" | "keyword" | "hybrid">("hybrid");
    const [chunkingStrategy, setChunkingStrategy] = useState<string>("recursive");
    const [enableGuardrails, setEnableGuardrails] = useState(true);
    const [useReranker, setUseReranker] = useState(true);
    const [rerankerStrategy, setRerankerStrategy] = useState<string>("ensemble");
    const [language, setLanguage] = useState<string>("id");
    const [evaluationMode, setEvaluationMode] = useState<EvaluationMode>("quick");

    const totalQuestions = getQuestionCount();

    const handleSubmit = async () => {
        if (!name) {
            console.error("Validation failed: name is required");
            return;
        }

        setIsLoading(true);
        try {
            console.log("Creating evaluation with config:", {
                name,
                useAgenticMode,
                retrievalStrategy,
                chunkingStrategy,
                evaluationMode,
            });

            const response = await fetch("/api/evaluation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    description,
                    // Questions will be seeded from ACADEMIC_QUESTIONS when run starts
                    useAgenticMode,
                    retrievalStrategy,
                    chunkingStrategy,
                    enableGuardrails,
                    useReranker,
                    rerankerStrategy,
                    language,
                    evaluationMode,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                console.error("Failed to create evaluation:", errorData);
                throw new Error(errorData.error || "Failed to create evaluation");
            }

            const data = await response.json();
            console.log("Evaluation created successfully:", data);

            // Reset form state
            setName("");
            setDescription("");

            // Refresh data and close dialog
            onCreated();
            onOpenChange(false);
        } catch (error) {
            console.error("Error creating evaluation:", error);
            alert(error instanceof Error ? error.message : "Failed to create evaluation");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog onOpenChange={onOpenChange} open={open}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Buat Evaluasi Baru</DialogTitle>
                    <DialogDescription>
                        Konfigurasi pengaturan RAG untuk evaluasi sistem. Pertanyaan uji akan menggunakan dataset
                        ACADEMIC_QUESTIONS yang telah dikurasi.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nama Evaluasi</Label>
                        <Input
                            id="name"
                            onChange={(e) => setName(e.target.value)}
                            placeholder="cth: Evaluasi Hybrid RAG dengan Semantic Chunking v1"
                            value={name}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Deskripsi (Opsional)</Label>
                        <Textarea
                            id="description"
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Jelaskan tujuan dan konfigurasi evaluasi ini..."
                            rows={2}
                            value={description}
                        />
                    </div>

                    {/* Evaluation Mode Selection */}
                    <Card className="space-y-4 p-4">
                        <h4 className="font-medium text-sm">Mode Evaluasi</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                className={`cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${
                                    evaluationMode === "quick"
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => setEvaluationMode("quick")}
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
                                    Evaluasi cepat untuk pengujian awal dan iterasi development. Cocok untuk validasi
                                    konfigurasi sebelum evaluasi penuh.
                                </p>
                            </button>
                            <button
                                className={`cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${
                                    evaluationMode === "production"
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => setEvaluationMode("production")}
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
                                    Evaluasi lengkap untuk signifikansi statistik dan publikasi akademik. Mendukung
                                    Paired t-test, One-way ANOVA, dan perhitungan effect size.
                                </p>
                            </button>
                        </div>
                    </Card>

                    {/* Dataset Notice */}
                    <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertTitle>Dataset Evaluasi</AlertTitle>
                        <AlertDescription>
                            Evaluasi akan menggunakan <strong>ACADEMIC_QUESTIONS</strong> dataset yang berisi{" "}
                            <strong>{totalQuestions} pertanyaan</strong> terkurasi seputar informasi Universitas Mulia.
                            Dataset ini mencakup kategori: regulasi akademik, prosedur administratif, layanan mahasiswa,
                            program studi, fasilitas, keuangan, dan informasi umum universitas. Setiap pertanyaan
                            dilengkapi dengan ground truth dan relevantChunkIds untuk evaluasi retrieval.
                        </AlertDescription>
                    </Alert>

                    <Card className="space-y-4 p-4">
                        <h4 className="font-medium text-sm">Konfigurasi RAG</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={useAgenticMode}
                                    id="agentic-mode"
                                    onCheckedChange={setUseAgenticMode}
                                />
                                <Label className="cursor-pointer" htmlFor="agentic-mode">
                                    <span className="flex items-center gap-1.5">
                                        <Brain className="h-4 w-4" />
                                        Mode Agentik
                                    </span>
                                    <span className="block text-muted-foreground text-xs">
                                        Penalaran multi-langkah dengan tools
                                    </span>
                                </Label>
                            </div>

                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={enableGuardrails}
                                    id="guardrails"
                                    onCheckedChange={setEnableGuardrails}
                                />
                                <Label className="cursor-pointer" htmlFor="guardrails">
                                    <span className="flex items-center gap-1.5">
                                        <Shield className="h-4 w-4" />
                                        Guardrails
                                    </span>
                                    <span className="block text-muted-foreground text-xs">Validasi input/output</span>
                                </Label>
                            </div>

                            <div className="flex items-center gap-3">
                                <Switch checked={useReranker} id="reranker" onCheckedChange={setUseReranker} />
                                <Label className="cursor-pointer" htmlFor="reranker">
                                    <span className="flex items-center gap-1.5">
                                        <RefreshCw className="h-4 w-4" />
                                        Re-ranker
                                    </span>
                                    <span className="block text-muted-foreground text-xs">
                                        Peringkat ulang hasil retrieval
                                    </span>
                                </Label>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-sm">
                                    <Globe className="h-4 w-4" />
                                    Bahasa
                                </Label>
                                <Select onValueChange={setLanguage} value={language}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-sm">
                                    <Zap className="h-4 w-4" />
                                    Strategi Retrieval
                                </Label>
                                <Select
                                    onValueChange={(v) =>
                                        setRetrievalStrategy(v as SetStateAction<"vector" | "keyword" | "hybrid">)
                                    }
                                    value={retrievalStrategy}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hybrid">Hybrid (Vector + BM25)</SelectItem>
                                        <SelectItem value="vector">Vector Only</SelectItem>
                                        <SelectItem value="keyword">Keyword Only (Okapi BM25)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-sm">
                                    <Layers className="h-4 w-4" />
                                    Strategi Chunking
                                </Label>
                                <Select onValueChange={setChunkingStrategy} value={chunkingStrategy}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="recursive">Recursive</SelectItem>
                                        <SelectItem value="semantic">Semantic</SelectItem>
                                        <SelectItem value="sentence_window">Sentence Window</SelectItem>
                                        <SelectItem value="hierarchical">Hierarchical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {useReranker && (
                                <div className="space-y-1.5">
                                    <Label className="flex items-center gap-1.5 text-sm">
                                        <RefreshCw className="h-4 w-4" />
                                        Strategi Re-ranker
                                    </Label>
                                    <Select onValueChange={setRerankerStrategy} value={rerankerStrategy}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ensemble">Ensemble (Kombinasi)</SelectItem>
                                            <SelectItem value="cross_encoder">Cross-Encoder</SelectItem>
                                            <SelectItem value="llm">LLM-based</SelectItem>
                                            <SelectItem value="cohere">Cohere-style Pairwise</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} variant="outline">
                        Batal
                    </Button>
                    <Button disabled={isLoading || !name} onClick={handleSubmit}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Buat Evaluasi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
