# Metodologi: Studi Ablasi (*Ablation Study*)

Untuk memvalidasi kontribusi setiap komponen arsitektur terhadap kinerja sistem secara keseluruhan, dilakukan studi ablasi (*ablation study*) yang sistematis. Eksperimen ini dirancang untuk mengisolasi dampak dari strategi pengambilan (*retrieval*), pemotongan dokumen (*chunking*), dan mekanisme agenik (*agentic reasoning*).

## 1. Konfigurasi Eksperimen

Sembilan konfigurasi berbeda diuji menggunakan dataset evaluasi standar yang terdiri dari 50 pertanyaan akademik.

### 1.1. Konfigurasi Baseline
*   **Baseline (No RAG)**: Menggunakan LLM murni (GPT-4o-mini) tanpa akses ke basis pengetahuan eksternal. Tujuannya adalah menetapkan batas bawah kinerja dan mengukur pengetahuan parametrik model.

### 1.2. Variasi Strategi Pengambilan (*Retrieval*)
*   **Vector Only**: Menggunakan hanya pencarian semantik (*dense retrieval*) berbasis *embedding* vektor.
*   **BM25 Only**: Menggunakan hanya pencarian kata kunci (*sparse retrieval*) dengan algoritma Okapi BM25.
*   **Hybrid (No Rerank)**: Menggabungkan hasil pencarian vektor dan BM25 menggunakan algoritma *Reciprocal Rank Fusion* (RRF) tanpa tahap *reranking*.

### 1.3. Variasi Strategi Peringkatan Ulang (*Reranking*)
Menggunakan basis *Hybrid Retrieval*, diuji dampak dari berbagai metode *reranking*:
*   **Hybrid + Cross-Encoder**: Menggunakan model *Cross-Encoder* (TinyBERT) untuk menilai ulang relevansi pasangan kueri-dokumen.
*   **Hybrid + LLM Rerank**: Menggunakan LLM untuk menilai relevansi secara *pointwise*.
*   **Hybrid + Ensemble**: Menggabungkan skor dari *Cross-Encoder*, LLM, dan skor awal pencarian secara linear.

$$ 
S_{\text{ensemble}} = w_1 \cdot S_{\text{CE}} + w_2 \cdot S_{\text{LLM}} + w_3 \cdot S_{\text{init}} 
$$ 

### 1.4. Variasi Mode Sistem
*   **Agentic Mode**: Mengaktifkan modul perencanaan multi-langkah (*multi-step reasoning*) di mana sistem dapat memecah pertanyaan kompleks dan melakukan pencarian berulang.
*   **Full System**: Konfigurasi lengkap yang mencakup *Hybrid Retrieval*, *Ensemble Reranking*, *Semantic Chunking*, *Agentic Mode*, dan mekanisme *Guardrails*.

## 2. Prosedur Evaluasi

Setiap konfigurasi dievaluasi menggunakan prosedur otomatis sebagai berikut:

1.  **Eksekusi Pipeline**: Untuk setiap pertanyaan $q$ dalam dataset evaluasi $Q$, sistem menghasilkan jawaban $a$ dan konteks $C$ menggunakan konfigurasi yang diuji.
2.  **Pengukuran Latensi**: Waktu eksekusi dicatat secara granular untuk setiap tahap (*retrieval*, *reranking*, *generation*).
3.  **Kalkulasi Metrik**: Metrik RAGAS (*Faithfulness*, *Relevancy*, dll.) dihitung menggunakan LLM-Juri independen (GPT-4o).
4.  **Agregasi**: Nilai rata-rata metrik dihitung untuk seluruh dataset guna memberikan skor kinerja tunggal untuk setiap konfigurasi.

## 3. Analisis Statistik

Untuk memastikan bahwa perbedaan kinerja antar konfigurasi adalah signifikan secara statistik dan bukan akibat variasi acak, dilakukan analisis varians (ANOVA) satu arah pada metrik utama (*Answer Correctness* dan *Faithfulness*). Jika ditemukan perbedaan signifikan ($p < 0.05$), dilakukan uji lanjut *post-hoc* (Tukey HSD) untuk mengidentifikasi pasangan konfigurasi yang berbeda secara nyata.

Tujuan utama dari analisis ini adalah menjawab pertanyaan penelitian:
1.  Apakah RAG secara signifikan meningkatkan akurasi dibandingkan *Baseline*?
2.  Apakah *Hybrid Retrieval* lebih unggul daripada metode tunggal (*Vector/BM25*)?
3.  Apakah biaya komputasi tambahan dari *Agentic Mode* sebanding dengan peningkatan kualitas jawaban?
