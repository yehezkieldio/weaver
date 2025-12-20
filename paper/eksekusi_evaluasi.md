# Metodologi: Eksekusi Evaluasi (*Evaluation Execution*)

Proses evaluasi sistem RAG ini dirancang untuk berjalan secara otomatis, dapat direproduksi, dan kuat terhadap kegagalan parsial. Bagian ini menjelaskan arsitektur eksekusi evaluasi, mulai dari pengambilan data, pemrosesan *batch*, hingga mekanisme pemulihan kesalahan.

## 1. Arsitektur Alur Kerja Evaluasi

Eksekusi evaluasi diimplementasikan sebagai skrip TypeScript yang berjalan di lingkungan *runtime* Bun, memanfaatkan konkurensi untuk mempercepat proses evaluasi yang melibatkan ratusan panggilan ke LLM.

### 1.1. Alur Eksekusi Utama
Proses evaluasi mengikuti langkah-langkah sekuensial berikut:

1.  **Inisialisasi**: Memuat konfigurasi ablasi (*Ablation Configs*) dan dataset pertanyaan evaluasi (*Evaluation Questions*).
2.  **Pemrosesan Paralel**: Mengeksekusi setiap konfigurasi ablasi secara berurutan, namun memproses pertanyaan dalam setiap konfigurasi secara paralel (*concurrency* default = 3).
3.  **Pipeline RAG**: Untuk setiap pertanyaan, sistem menjalankan pipeline RAG penuh (Retrieval $\rightarrow$ Reranking $\rightarrow$ Generation) sesuai konfigurasi yang diuji.
4.  **Evaluasi LLM-as-a-Judge**: Output sistem dievaluasi oleh LLM juri (GPT-4o) untuk menghitung metrik RAGAS.
5.  **Penyimpanan Data**: Hasil evaluasi granular (per pertanyaan) dan agregat (per konfigurasi) disimpan ke basis data PostgreSQL.

### Deskripsi Diagram Alur Eksekusi (Untuk Visualisasi)
> **Gambar 1: Alur Eksekusi Evaluasi Otomatis.**
>
> *Visualisasi yang disarankan:*
> 1.  **Input**: `ABLATON_CONFIGS` (Array) dan `ACADEMIC_QUESTIONS` (Array).
> 2.  **Loop Konfigurasi**: Iterator yang memilih satu konfigurasi eksperimen.
> 3.  **Batch Processor**: Komponen yang memecah 50 pertanyaan menjadi *batch* paralel (misal: 3 pertanyaan sekaligus).
> 4.  **RAG System**: Kotak hitam yang menerima pertanyaan + config, menghasilkan jawaban + konteks.
> 5.  **Evaluator (Judge)**: Menerima jawaban sistem + *Ground Truth*, menghasilkan skor metrik (0-1).
> 6.  **Database**: Menyimpan hasil evaluasi.

## 2. Mekanisme Pemrosesan Batch dan Konkurensi

Mengingat evaluasi melibatkan panggilan API LLM yang intensif dan berpotensi lambat, sistem menggunakan strategi pemrosesan *batch* dengan batas konkurensi yang dapat dikonfigurasi.

### 2.1. Kontrol Konkurensi
Fungsi `processBatches` mengelola eksekusi paralel untuk menghindari *rate limiting* dari penyedia API (Azure OpenAI).

$$ 
N_{\text{batch}} = \lceil \frac{N_{\text{total}}}{C} \rceil 
$$ 

Dimana:
*   $N_{\text{total}}$: Total jumlah pertanyaan (50).
*   $C$: Tingkat konkurensi (default 3, dapat diatur via env `EVAL_CONCURRENCY`).

Setiap *batch* berisi $C$ janji (*promises*) yang diselesaikan secara bersamaan (`Promise.all`), dan sistem menunggu seluruh *batch* selesai sebelum melanjutkan ke *batch* berikutnya. Hal ini menyeimbangkan kecepatan eksekusi dengan stabilitas sistem.

## 3. Manajemen Kesalahan dan Pemulihan

Evaluasi skala besar rentan terhadap kegagalan jaringan atau *timeout* API. Sistem menerapkan mekanisme robust untuk menangani kegagalan tanpa menghentikan keseluruhan proses evaluasi.

### 3.1. Penanganan Kegagalan Granular
Jika evaluasi satu pertanyaan gagal (misal: *timeout* saat generasi jawaban), sistem:
1.  Menangkap kesalahan (*catch error*) dan mencatatnya ke log *console*.
2.  Mengembalikan nilai *null* atau objek metrik kosong untuk pertanyaan tersebut.
3.  Melanjutkan evaluasi pertanyaan lain dalam *batch* yang sama.
4.  Di akhir proses, pertanyaan yang gagal dapat diidentifikasi dari nilai *null* di database dan dievaluasi ulang secara terpisah jika diperlukan.

### 3.2. Caching Embedding
Untuk mengurangi redundansi dan biaya, sistem menggunakan *LRU Cache* (`embeddingCache`) untuk vektor *embedding*. Jika teks yang sama (misal: pertanyaan yang sama dalam konfigurasi berbeda) perlu di-*embed* ulang untuk perhitungan metrik *Answer Relevancy*, sistem mengambil vektor dari memori alih-alih memanggil API.

$$ 
\text{Cost Reduction} \approx 1 - \frac{N_{\text{unique}}}{N_{\text{total}} \times K_{\text{configs}}} 
$$ 

## 4. Pelaporan Kemajuan (*Progress Tracking*)

Sistem menyediakan umpan balik *real-time* kepada pengamat melalui `ExtendedProgressCallback`. Informasi yang dilaporkan meliputi:
*   Persentase penyelesaian (misal: "Config 2/5, Question 15/50").
*   Estimasi waktu tersisa (ETA) berdasarkan rata-rata latensi historis.
*   Statistik kesalahan (*error count*).
*   Metrik rata-rata berjalan (*running average*) untuk konfigurasi saat ini.

Transparansi ini memungkinkan peneliti memantau kesehatan eksperimen yang berjalan lama (bisa memakan waktu >30 menit) dan mendeteksi anomali lebih awal.
