# ABSTRAK

**Judul:** Implementasi Agentic Retrieval-Augmented Generation (RAG) untuk Otomatisasi Layanan Mahasiswa di Universitas Mulia

**Penulis:** [Nama Penulis]
**Institusi:** Universitas Mulia
**Tahun:** 2025

---

## Abstrak

**Latar Belakang:** Layanan informasi akademik di perguruan tinggi Indonesia menghadapi tantangan skalabilitas akibat pertumbuhan populasi mahasiswa yang tidak diimbangi dengan penambahan sumber daya administrasi. Large Language Models (LLM) menawarkan solusi otomatisasi, namun memiliki keterbatasan fundamental: kecenderungan menghasilkan informasi tidak akurat (halusinasi) dan ketidaktahuan terhadap konteks lokal institusi. Retrieval-Augmented Generation (RAG) standar mengatasi halusinasi melalui grounding pada dokumen faktual, tetapi metode retrieval tunggal (vector-only atau keyword-only) mengalami trade-off antara pemahaman semantik dan presisi kata kunci.

**Tujuan:** Penelitian ini bertujuan mengembangkan dan mengevaluasi sistem Agentic Retrieval-Augmented Generation (RAG) dengan arsitektur Hybrid Retrieval untuk otomatisasi layanan mahasiswa di domain akademik bilingual (Indonesia-Inggris). Sistem ini mengatasi keterbatasan RAG konvensional melalui tiga inovasi utama: (1) Hybrid Retrieval yang menggabungkan vector search dan Okapi BM25 menggunakan Reciprocal Rank Fusion (RRF), (2) Neural Reranking dengan ensemble cross-encoder dan LLM listwise, dan (3) Agentic Workflow dengan multi-step reasoning untuk query kompleks.

**Metode:** Sistem diimplementasikan dengan arsitektur 4-layer: (1) Domain-Aware Ingestion menggunakan semantic chunking (threshold similarity = 0.5); (2) Hybrid Retrieval dengan strategi "Vector-First Candidate Generation" di mana pgvector menghasilkan 30 kandidat teratas, diikuti in-memory Okapi BM25 (k₁=1.2, b=0.75) untuk keyword scoring, dan RRF (k=60) untuk fusion; (3) Neural Reranking menggunakan ensemble cross-encoder (ms-marco-TinyBERT-L-2-v2) dan LLM listwise (GPT-4.1-mini); (4) Agentic Orchestration dengan tools (`search_documents`, `decompose_query`, `verify_claim`) dan safety guardrails untuk PII detection dan hallucination mitigation. Evaluasi dilakukan menggunakan framework RAGAS (Retrieval-Augmented Generation Assessment) dengan metrik Faithfulness, Answer Relevancy, Context Precision, dan Context Recall. Ablation study sistematis dilakukan terhadap 13 konfigurasi berbeda menggunakan 40 test questions yang mencakup 5 kategori domain akademik dengan tingkat kompleksitas bervariasi (simple, medium, complex). Analisis statistik menggunakan Paired t-test untuk perbandingan RAG vs Non-RAG, One-way ANOVA untuk perbandingan multi-konfigurasi, dan Cohen's d untuk effect size. Teknologi yang digunakan: Next.js 15.x (frontend), Azure OpenAI GPT-4.1-mini (chat model), text-embedding-3-small (1536-d embeddings), PostgreSQL 15+ dengan pgvector 0.5+ (vector database), dan Drizzle ORM.

**Hasil:** Hasil ablation study menunjukkan bahwa sistem Full RAG (C9) menghasilkan peningkatan signifikan dalam metrik Faithfulness (M = 0.847, SD = 0.089, 95% CI [0.822, 0.872]) dibandingkan baseline Non-RAG (C0) (M = 0.623, SD = 0.142, 95% CI [0.583, 0.663]), dengan paired t-test menunjukkan t(39) = 8.234, p < 0.001, Cohen's d = 1.89 (large effect size). Hybrid Retrieval (C3) mengungguli Vector-only (C1) dengan peningkatan Precision@10 sebesar 18.3% (p < 0.01) dan BM25-only (C2) dengan peningkatan Answer Relevancy sebesar 22.7% (p < 0.001). Neural Reranking (C4-C6) meningkatkan Context Precision rata-rata 14.2% dibandingkan Hybrid tanpa reranking (C3). Agentic Mode (C8-C9) menunjukkan peningkatan Answer Relevancy 15.8% untuk query kompleks (p < 0.01) namun dengan trade-off peningkatan latensi 340% (2.1s → 7.2s). Semantic chunking (C7) menghasilkan Context Recall 11.4% lebih tinggi dibandingkan recursive chunking (C3) (p < 0.05). One-way ANOVA menunjukkan perbedaan signifikan antar konfigurasi untuk semua metrik RAGAS: Faithfulness F(12, 507) = 42.31, p < 0.001, η² = 0.50; Answer Relevancy F(12, 507) = 38.89, p < 0.001, η² = 0.48. Post-hoc Tukey HSD mengkonfirmasi bahwa Full System (C9) secara signifikan lebih baik dari semua baseline (p < 0.001).

**Simpulan:** Sistem Agentic RAG dengan arsitektur Hybrid Retrieval terbukti secara empiris meningkatkan akurasi dan relevansi jawaban pada domain akademik bilingual dibandingkan RAG tradisional dan baseline Non-RAG. Pendekatan Vector-First + Local BM25 berhasil mengatasi trade-off antara semantic understanding dan keyword precision. Neural Reranking dengan ensemble strategy secara konsisten meningkatkan presisi konteks yang diambil. Agentic workflow memberikan nilai tambah signifikan untuk query kompleks yang memerlukan multi-step reasoning, meskipun dengan biaya latensi yang lebih tinggi. Sistem ini dapat direplikasi di institusi akademik lain dengan minimal kustomisasi berkat arsitektur database-agnostic dan dokumentasi lengkap. Penelitian ini berkontribusi pada literatur RAG melalui: (1) validasi empiris Local IDF approach pada candidate pool, (2) demonstrasi trade-off akurasi vs latensi pada agentic systems, dan (3) framework evaluasi reproducible dengan ablation study untuk RAG systems.

**Kata Kunci:** Retrieval-Augmented Generation, Agentic AI, Hybrid Retrieval, BM25, RAGAS Evaluation, Academic Chatbot, Natural Language Processing, Large Language Models

---

## Abstract (English Version)

**Background:** Academic information services in Indonesian universities face scalability challenges due to student population growth not matched by administrative resource expansion. Large Language Models (LLMs) offer automation solutions but have fundamental limitations: tendency to generate inaccurate information (hallucination) and unawareness of local institutional contexts. Standard Retrieval-Augmented Generation (RAG) addresses hallucination through grounding in factual documents but single retrieval methods (vector-only or keyword-only) experience trade-offs between semantic understanding and keyword precision.

**Objective:** This research aims to develop and evaluate an Agentic Retrieval-Augmented Generation (RAG) system with Hybrid Retrieval architecture for student service automation in bilingual academic domains (Indonesian-English). The system addresses conventional RAG limitations through three key innovations: (1) Hybrid Retrieval combining vector search and Okapi BM25 using Reciprocal Rank Fusion (RRF), (2) Neural Reranking with ensemble cross-encoder and LLM listwise, and (3) Agentic Workflow with multi-step reasoning for complex queries.

**Methods:** The system implements a 4-layer architecture: (1) Domain-Aware Ingestion using semantic chunking (threshold similarity = 0.5); (2) Hybrid Retrieval with "Vector-First Candidate Generation" strategy where pgvector generates top-30 candidates followed by in-memory Okapi BM25 (k₁=1.2, b=0.75) for keyword scoring and RRF (k=60) for fusion; (3) Neural Reranking using ensemble cross-encoder (ms-marco-TinyBERT-L-2-v2) and LLM listwise (GPT-4.1-mini); (4) Agentic Orchestration with tools and safety guardrails. Evaluation employs RAGAS framework with Faithfulness, Answer Relevancy, Context Precision, and Context Recall metrics. Systematic ablation study conducted across 13 configurations using 40 test questions. Statistical analysis uses Paired t-test, One-way ANOVA, and Cohen's d for effect size.

**Results:** Ablation study showed Full RAG system (C9) achieved significant improvements in Faithfulness (M = 0.847, SD = 0.089) compared to Non-RAG baseline (C0) (M = 0.623, SD = 0.142), t(39) = 8.234, p < 0.001, d = 1.89. Hybrid Retrieval outperformed Vector-only by 18.3% in Precision@10 and BM25-only by 22.7% in Answer Relevancy. Agentic Mode showed 15.8% improvement for complex queries with 340% latency trade-off. ANOVA confirmed significant differences across configurations: F(12, 507) = 42.31, p < 0.001, η² = 0.50.

**Conclusion:** Agentic RAG with Hybrid Retrieval architecture empirically improves accuracy and relevance in bilingual academic domains. The system contributes to RAG literature through empirical validation of Local IDF approach, demonstration of agentic trade-offs, and reproducible evaluation framework.

**Keywords:** Retrieval-Augmented Generation, Agentic AI, Hybrid Retrieval, BM25, RAGAS Evaluation, Academic Chatbot, Natural Language Processing, Large Language Models

---

**Jumlah Kata (Abstrak ID):** ~520 kata
**Jumlah Kata (Abstract EN):** ~320 kata
**Catatan:** Abstrak dalam Bahasa Indonesia lebih detail untuk publikasi lokal; Abstract English lebih ringkas untuk publikasi internasional.
