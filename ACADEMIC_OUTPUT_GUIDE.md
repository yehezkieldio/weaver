# Panduan Data Output & Penulisan IMRAD untuk Penelitian RAG

Dokumen ini mendata seluruh output data ilmiah yang dihasilkan oleh proyek ini dan memberikan panduan cara melaporkannya dalam paper akademik mengikuti struktur IMRAD (*Introduction, Methods, Results, and Discussion*).

---

## Bagian 1: Inventaris Data Output

### 1. Metrik Evaluasi
Metrik-metrik ini dihitung untuk setiap pertanyaan dalam satu kali proses evaluasi (*evaluation run*) dan disimpan dalam database.

#### A. Metrik Kualitas (RAGAS & Turunan)
*   **Faithfulness (`faithfulness`):** Mengukur apakah jawaban diturunkan *hanya* dari konteks yang tersedia. (0.0 - 1.0)
*   **Answer Relevancy (`answerRelevancy`):** Mengukur apakah jawaban benar-benar menjawab pertanyaan pengguna. (0.0 - 1.0)
*   **Answer Correctness (`answerCorrectness`):** Kesamaan semantik dan kesesuaian faktual dengan jawaban "Ground Truth". (0.0 - 1.0)

#### B. Metrik Retrieval (Pengambilan Dokumen)
*   **Context Precision (`contextPrecision`):** Proporsi potongan (*chunks*) relevan dalam konteks yang diambil. (0.0 - 1.0)
*   **Context Recall (`contextRecall`):** Proporsi fakta dari *ground truth* yang ditemukan dalam konteks yang diambil. (0.0 - 1.0)
*   **Context Relevancy (`contextRelevancy`):** Seberapa banyak bagian dari konteks yang diambil yang benar-benar dibutuhkan untuk menjawab. (0.0 - 1.0)
*   **NDCG (Normalized Discounted Cumulative Gain):** Mengukur kualitas peringkat dokumen yang diambil. (0.0 - 1.0)
*   **MRR (Mean Reciprocal Rank):** Mengukur seberapa tinggi dokumen relevan pertama muncul dalam daftar. (0.0 - 1.0)

#### C. Metrik Domain-Spesifik
*   **Hallucination Rate (`hallucinationRate`):** Frekuensi informasi yang dihasilkan tanpa dukungan konteks. (0.0 - 1.0, Lebih rendah lebih baik)
*   **Citation Accuracy (`citationAccuracy`):** Tingkat sitasi yang diverifikasi benar terhadap dokumen sumber. (0.0 - 1.0)

#### D. Metrik Efisiensi & Latensi
*   **Total Latency (`latencyMs`):** Waktu respon total dari awal hingga akhir.
*   **Retrieval Latency:** Waktu yang dibutuhkan untuk pencarian di *vector store*.
*   **Reranking Latency:** Waktu yang dibutuhkan oleh model *re-ranker*.
*   **Agent Planning/Reasoning/Synthesis:** Waktu untuk langkah kognitif spesifik (untuk alur kerja Agentic).
*   **Agent Steps Used (`agentStepsUsed`):** Ukuran kompleksitas jalur penalaran agen.

### 2. Analisis Statistik
Script `scripts/run-statistical-analysis.ts` melakukan pengujian ketat pada metrik.

#### A. Statistik Deskriptif
*   N (Ukuran Sampel)
*   Mean (Rerata), Median
*   Standard Deviation (SD) - Simpangan Baku
*   Standard Error of the Mean (SEM)
*   Skewness & Kurtosis (Bentuk Distribusi)
*   95% Confidence Intervals (Interval Kepercayaan Standar & Bootstrap)

#### B. Analisis Komparatif (RAG vs. Non-RAG)
Digunakan untuk membuktikan efektivitas dasar sistem.
*   **Uji Hipotesis:** Paired T-Test (parametrik) atau Wilcoxon Signed-Rank Test (non-parametrik), dipilih otomatis berdasarkan cek normalitas.
*   **Effect Size (Ukuran Efek):** Cohen's *d* (besarnya peningkatan).
*   **Cek Asumsi:** Shapiro-Wilk (Normalitas), Levene's Test (Homogenitas Varians).

#### C. Analisis Studi Ablasi
Digunakan untuk membandingkan konfigurasi berbeda (misal: "Naive RAG" vs. "Hybrid Search" vs. "Agentic RAG").
*   **One-Way ANOVA:** Untuk mendeteksi apakah ada *salah satu* konfigurasi yang berbeda secara signifikan.
*   **Uji Post-Hoc:** Perbandingan berpasangan untuk mengidentifikasi konfigurasi *mana* yang berbeda.
*   **Peringkat:** Konfigurasi diurutkan berdasarkan Faithfulness dan Correctness dengan Interval Kepercayaan.

### 3. Visualisasi Data
Tersedia di Dashboard Frontend (`/evaluation`).

*   **Radar Charts:** Untuk membandingkan kinerja multivariat (misal: Faithfulness vs. Relevancy vs. Latency) dari model yang berbeda.
*   **Bar/Line Charts:** Untuk distribusi dan tren metrik.
*   **Correlation Matrix:** Heatmap yang menunjukkan hubungan antar metrik (misal: "Apakah Latency lebih tinggi berkorelasi dengan Faithfulness lebih tinggi?").
*   **Scatter Plots:** Sebaran Latency vs. Score.

---

## Bagian 2: Panduan Penulisan IMRAD

### 1. Introduction (Pendahuluan)
*   **Apa yang ditulis:** Sebutkan secara singkat bahwa Anda mengevaluasi sistem menggunakan rangkaian metrik komprehensif mulai dari skor standar RAGAS hingga batasan akademik domain-spesifik.
*   **Frasa kunci:** "Kami menerapkan kerangka evaluasi multi-dimensi yang menilai kualitas retrieval, kesetiaan generasi teks (faithfulness), dan akurasi sitasi."

### 2. Methods (Metode/Setup Eksperimen)
*   **Dataset:** Jelaskan dataset "Ground Truth" (ukuran, dokumen sumber).
*   **Definisi Metrik:** Definisikan metrik yang digunakan secara singkat (rujuk ke Bagian 1.1).
    *   *Contoh:* "Faithfulness diukur menggunakan kerangka kerja RAGAS, mengkuantifikasi sejauh mana klaim didukung oleh konteks yang diambil."
*   **Protokol Statistik:** Nyatakan secara eksplisit uji yang digunakan dari `statistical-analysis.ts`.
    *   *Contoh:* "Kami melakukan paired t-tests untuk membandingkan baseline RAG vs. Non-RAG. Untuk studi ablasi, kami menggunakan One-Way ANOVA dengan analisis post-hoc. Semua uji mencakup pemeriksaan normalitas (Shapiro-Wilk) dan melaporkan Interval Kepercayaan 95%."

### 3. Results (Hasil)
Di sini Anda menempelkan output dari script dan dashboard.

#### Sub-bab 3.1: Performa Baseline (RAG vs. Non-RAG)
*   **Visual:** Tabel perbandingan skor Mean dengan SD/SEM.
*   **Teks:** "Sistem RAG menunjukkan peningkatan signifikan secara statistik dibandingkan baseline Non-RAG dalam Answer Relevancy (t(49) = 5.23, p < .001, Cohen's d = 1.2)."
*   **Data Kunci:** Gunakan output "Comparative Analysis" dari script CLI.

#### Sub-bab 3.2: Analisis Komponen (Studi Ablasi)
*   **Visual:** Radar Chart (dari Dashboard) yang menumpuk konfigurasi berbeda.
*   **Teks:** "Hasil ablasi menunjukkan bahwa Hybrid Search mengungguli Naive Retrieval secara signifikan (p < .05), terutama dalam Context Recall."
*   **Data Kunci:** Gunakan tabel "Ranking" dan "ANOVA" dari script CLI.

#### Sub-bab 3.3: Trade-off Efisiensi vs. Kualitas
*   **Visual:** Scatter plot (Latency vs. Correctness).
*   **Teks:** "Meskipun alur kerja Agentic mencapai Akurasi tertinggi (0.92), hal ini menyebabkan penalti latensi 3x lipat dibandingkan RAG standar (Mean: 4500ms vs 1500ms)."
*   **Data Kunci:** Gunakan bagian "Latency Analysis" dari script CLI.

### 4. Discussion (Pembahasan)
*   **Interpretasi:** Jelaskan *mengapa* angkanya demikian.
    *   *Contoh:* "Tingkat Halusinasi yang tinggi pada konfigurasi Naive menunjukkan bahwa relevansi retrieval yang buruk memaksa LLM untuk memfabrikasi informasi."
*   **Korelasi:** Gunakan Matriks Korelasi.
    *   *Contoh:* "Kami mengamati korelasi positif yang kuat (r=0.78) antara Context Precision dan Faithfulness, memvalidasi hipotesis bahwa retrieval yang lebih baik mengurangi halusinasi."
*   **Keterbatasan:** Sebutkan jika ukuran sampel (N) kecil atau jika dataset memiliki bias.

---

## Cara Mengekspor Data untuk Paper
1.  **Data Mentah (CSV):** Buka `/evaluation/manage` -> "Export Data" untuk mendapatkan CSV mentah bagi Lampiran (Appendix) atau analisis eksternal (SPSS/Python).
2.  **Laporan Statistik:** Jalankan `bun run scripts/run-statistical-analysis.ts --latest` dan salin tabel ASCII secara langsung.
3.  **Grafik:** Ambil tangkapan layar resolusi tinggi dari dashboard `/evaluation`.