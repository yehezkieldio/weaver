"use client";

import "katex/dist/katex.min.css";
import { AlertTriangle, BarChart3, BookOpen, CheckCircle, FlaskConical, Layers, Target, Zap } from "lucide-react";
import Latex from "react-latex-next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function InformationView() {
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
                                        "$\text{Faithfulness} = \frac{|\text{claims} cap \text{context}|}{|\text{claims}|}$"
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
                                        "$\text{Relevancy} = cos(\vec{q}, \vec{a}) = \frac{\vec{q} cdot \vec{a}}{|\vec{q}| |\vec{a}|}$"
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
                                    {"$\text{Precision@K} = \frac{sum_{k=1}^{K} r_k cdot P@k}{sum_{k=1}^{K} r_k}$"}
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
                                <Latex>{"$\text{Recall} = \frac{|\text{GT} cap \text{C}|}{|\text{GT}|}$"}</Latex>
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
                                        "$\text{Correctness} = 0.3 \times \text{Semantic}_{sim} + 0.7 \times \text{Factual}_{acc}$"
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
                                <Latex>{"$\text{NDCG} = \frac{DCG}{IDCG}$"}</Latex>
                            </div>
                            <div className="rounded bg-muted p-2 font-mono text-xs">
                                <Latex>{"$DCG = sum_{i=1}^{k} \frac{rel_i}{log_2(i+1)}$"}</Latex>
                            </div>
                            <p className="text-muted-foreground text-xs">
                                Järvelin & Kekäläinen (2002) - Mengukur kualitas ranking dengan mempertimbangkan posisi
                                dokumen relevan.
                            </p>
                        </div>

                        <div className="space-y-3 rounded-lg border p-4">
                            <h4 className="font-medium">MRR (Mean Reciprocal Rank)</h4>
                            <div className="rounded bg-muted p-2 font-mono text-xs">
                                <Latex>{"$\text{MRR} = \frac{1}{|Q|}sum_{i=1}^{|Q|} \frac{1}{rank_i}$"}</Latex>
                            </div>
                            <p className="text-muted-foreground text-xs">
                                Mengukur seberapa cepat dokumen relevan pertama ditemukan dalam hasil pencarian.
                            </p>
                        </div>

                        <div className="space-y-3 rounded-lg border p-4">
                            <h4 className="font-medium">Precision@K</h4>
                            <div className="rounded bg-muted p-2 font-mono text-xs">
                                <Latex>{"$P@K = \frac{|{\text{relevant}} cap {\text{retrieved}}|}{K}$"}</Latex>
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
                                { param: "rerankerStrategy", desc: "'cross_encoder' | 'llm' | 'cohere' | 'ensemble'" },
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
                                { name: "Mean", formula: "\bar{x} = \frac{1}{n}sum_{i=1}^{n} x_i" },
                                { name: "Median", formula: "\tilde{x}" },
                                { name: "Std Dev", formula: "s = sqrt{\frac{sum(x_i - \bar{x})^2}{n-1}}" },
                                { name: "SEM", formula: "SE = \frac{s}{sqrt{n}}" },
                                {
                                    name: "Skewness",
                                    formula: "gamma_1 = \frac{n}{(n-1)(n-2)}sumleft(\frac{x_i-\bar{x}}{s}\right)^3",
                                },
                                {
                                    name: "Kurtosis",
                                    formula:
                                        "gamma_2 = \frac{n(n+1)}{(n-1)(n-2)(n-3)}sumleft(\frac{x_i-\bar{x}}{s}\right)^4 - 3",
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
                                <Latex>{"$\t = \frac{\bar{d}}{s_d / sqrt{n}}$"}</Latex>
                            </div>
                            <p className="text-muted-foreground text-xs">
                                di mana <Latex>{"$\bar{d}$"}</Latex> = mean perbedaan, <Latex>{"$s_d$"}</Latex> =
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
                                    {"$t = \frac{\bar{x}_1 - \bar{x}_2}{sqrt{\frac{s_1^2}{n_1} + \frac{s_2^2}{n_2}}}$"}
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
                                    {"$F = \frac{MS_{between}}{MS_{within}} = \frac{SS_B / (k-1)}{SS_W / (N-k)}$"}
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
                                    {"$q = \frac{|\bar{x}_i - \bar{x}_j|}{sqrt{MS_W cdot (1/n_i + 1/n_j) / 2}}$"}
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
                                    <Latex>{"$d = \frac{\bar{x}_1 - \bar{x}_2}{s_{pooled}}$"}</Latex>
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
                                    <Latex>{"$eta^2 = \frac{SS_{between}}{SS_{total}}$"}</Latex>
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
                                    <Latex>{"$CI = \bar{x} pm t_{alpha/2, df} \times SE$"}</Latex>
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
