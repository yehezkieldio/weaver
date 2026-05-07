# Metodologi: Pelacakan Latensi (*Latency Tracking*)

Dalam sistem layanan informasi *real-time*, latensi adalah metrik kinerja kritis yang berdampak langsung pada pengalaman pengguna. Metodologi ini tidak hanya mengukur waktu respons total, tetapi juga melakukan profilasi mendalam (*profiling*) untuk membedah kontribusi setiap komponen dalam arsitektur RAG terhadap total waktu eksekusi.

## 1. Instrumen Pelacakan Latensi

Sistem menggunakan instrumen pelacakan kustom `createLatencyTracker` yang beroperasi sebagai *stopwatch* cerdas, mencatat durasi setiap fase pemrosesan dengan presisi milidetik.

### 1.1. Profil Latensi (*Latency Profile*)
Pelacak ini merekam serangkaian peristiwa (*events*) yang berisi:
*   `timestamp`: Waktu kejadian.
*   `phase`: Tahap pemrosesan (misal: `retrieval`, `reranking`, `generation`).
*   `durationMs`: Durasi yang dihabiskan dalam fase tersebut.
*   `metadata`: Informasi tambahan (misal: jumlah dokumen yang diproses, jumlah token yang dihasilkan).

Struktur data ini memungkinkan analisis statistik yang kaya, termasuk perhitungan rata-rata, deviasi standar, dan persentil (P50, P95, P99).

## 2. Dekomposisi Fase Pemrosesan

Total latensi sistem ($T_{\text{total}}$) dimodelkan sebagai penjumlahan dari latensi komponen-komponennya. Model ini bervariasi tergantung pada mode operasi (Standar vs. Agenik).

### 2.1. Model Latensi RAG Standar
Untuk konfigurasi RAG standar (Retrieval + Generation), latensi total didekomposisi menjadi:

$$
  T_{\text{total}} = T_{\text{retrieval}} + T_{\text{reranking}} + T_{\text{generation}} + T_{\text{overhead}}
$$

*   **$T_{\text{retrieval}}$**: Waktu untuk melakukan pencarian vektor (pgvector) dan pencarian kata kunci (BM25), serta fusi skor.
*   **$T_{\text{reranking}}$**: Waktu yang dibutuhkan oleh *Cross-Encoder* atau LLM untuk mengurutkan ulang kandidat dokumen.
*   **$T_{\text{generation}}$**: Waktu inferensi LLM untuk menghasilkan jawaban akhir.

### 2.2. Model Latensi RAG Agenik
Untuk mode agenik yang lebih kompleks, komponen latensi mencakup langkah-langkah penalaran dan penggunaan alat:

$$ T_{\text{total}} = T_{\text{planning}} + \sum_{i=1}^{k} T_{\text{tool\_call}}^{(i)} + T_{\text{synthesis}} $$

*   **$T_{\text{planning}}$**: Waktu bagi agen untuk "berpikir" dan memutuskan alat mana yang akan digunakan.
*   **$T_{\text{tool\_call}}$**: Waktu eksekusi alat (misal: pencarian dokumen, verifikasi klaim).
*   **$T_{\text{synthesis}}$**: Waktu untuk merangkum hasil dari berbagai langkah menjadi jawaban akhir.

## 3. Metrik Efisiensi Turunan

Selain waktu absolut, sistem juga menghitung metrik efisiensi relatif untuk menormalkan kinerja terhadap panjang konten.

### 3.1. Throughput Token (*Tokens Per Second*)
Metrik ini mengukur kecepatan generasi teks LLM, yang merupakan indikator responsivitas yang dirasakan pengguna (*perceived responsiveness*). 

$$ \text{TPS} = \frac{N_{\text{output\_tokens}}}{T_{\text{generation}} / 1000} $$

### 3.2. Efisiensi Token (*Token Efficiency*)
Mengukur seberapa ringkas jawaban yang dihasilkan relatif terhadap konteks yang diberikan. Rasio yang sangat rendah mungkin mengindikasikan bahwa model mengabaikan konteks, sementara rasio yang sangat tinggi mungkin mengindikasikan halusinasi.

$$ \eta_{\text{token}} = \frac{N_{\text{output\_tokens}}}{N_{\text{context\_tokens}}} $$

## 4. Agregasi dan Analisis

Data latensi yang dikumpulkan dari setiap *run* evaluasi diekspor ke dalam bentuk `LatencyProfile` yang mencakup:
*   **Breakdown**: Daftar rinci durasi per fase.
*   **Statistik**: Total, Rata-rata, P50 (Median), P95, P99, dan Deviasi Standar.

Analisis ini memungkinkan identifikasi *bottleneck* sistem. Misalnya, jika $T_{\text{reranking}}$ mendominasi $T_{\text{total}}$, maka strategi optimasi harus difokuskan pada penggunaan model *reranker* yang lebih kecil atau distilasi model, alih-alih mengoptimalkan *query* database.
