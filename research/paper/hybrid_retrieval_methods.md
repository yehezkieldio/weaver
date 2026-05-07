# Metodologi: Mesin Temu Kembali Hibrida (Hybrid Retrieval Engine)

Bagian ini menguraikan arsitektur dan formulasi matematis dari mesin temu kembali informasi (*information retrieval engine*) yang dikembangkan untuk sistem *Retrieval-Augmented Generation* (RAG) akademik. Sistem ini menerapkan pendekatan hibrida yang menggabungkan pencarian vektor semantik (*dense retrieval*) dan pencarian kata kunci leksikal (*sparse retrieval*), diikuti dengan mekanisme fusi peringkat dan tahap peringkatan ulang (*reranking*) untuk mengoptimalkan relevansi dokumen.

## 1. Arsitektur Pencarian Hibrida

Sistem menggunakan strategi *Hybrid Retrieval* untuk mengatasi keterbatasan masing-masing metode pencarian tunggal. Pencarian vektor unggul dalam menangkap makna semantik dan konteks konseptual, namun sering kali kurang presisi dalam mencocokkan terminologi spesifik atau entitas bernama yang jarang muncul. Sebaliknya, pencarian kata kunci (BM25) sangat efektif untuk pencocokan istilah eksak namun gagal menangkap variasi sinonim atau makna tersirat.

Proses temu kembali terdiri dari tiga tahap utama:
1.  **Kandidasi (Retrieval)**: Mengambil himpunan dokumen kandidat menggunakan pencarian vektor dan BM25 secara paralel.
2.  **Fusi (Fusion)**: Menggabungkan hasil dari kedua metode menggunakan algoritma *Reciprocal Rank Fusion* (RRF).
3.  **Peringkatan Ulang (Reranking)**: Menyaring dan mengurutkan ulang dokumen teratas menggunakan model *Cross-Encoder* atau LLM.

### Deskripsi Diagram Alur Sistem (Untuk Visualisasi)
> **Gambar 1: Alur Kerja Hybrid Retrieval Engine.**
>
> *Visualisasi yang disarankan harus menggambarkan aliran data dari kiri ke kanan:*
> 1.  **Input**: "Query Pengguna" masuk ke dalam sistem.
> 2.  **Percabangan**: Query dipecah menjadi dua jalur paralel:
>     *   *Jalur Atas (Semantik)*: Query -> Embedding Model (Azure OpenAI) -> Vector Search (pgvector/Cosine Similarity) -> Daftar Hasil Vektor.
>     *   *Jalur Bawah (Leksikal)*: Query -> Tokenisasi & Stemming (Sastrawi/Custom) -> BM25 Search -> Daftar Hasil Keyword.
> 3.  **Konvergensi**: Kedua daftar hasil masuk ke blok "Reciprocal Rank Fusion (RRF)".
> 4.  **Filter**: Hasil fusi masuk ke blok "Top-K Filtering".
> 5.  **Refinement**: Hasil terfilter masuk ke blok "Reranker (Cross-Encoder/LLM)".
> 6.  **Output**: Menghasilkan "Dokumen Relevan Final" untuk konteks LLM.

## 2. Pencarian Vektor Semantik (*Dense Retrieval*)

Komponen pencarian semantik menggunakan representasi vektor dimensi tinggi untuk menghitung kesamaan makna antara *query* dan dokumen.

### 2.1. Model Embedding
Sistem menggunakan model `text-embedding-3-small` dari Azure OpenAI yang menghasilkan vektor $v \in \mathbb{R}^{1536}$. Representasi vektor ini memungkinkan sistem untuk menangkap nuansa semantik lintas bahasa (Indonesia-Inggris) dan variasi frasa.

### 2.2. Metrik Kesamaan (Cosine Similarity)
Pencarian dilakukan menggunakan ekstensi `pgvector` pada basis data PostgreSQL. Metrik yang digunakan untuk mengukur kedekatan antara vektor *query* ($Q$) dan vektor dokumen ($D$) adalah *Cosine Similarity*. Karena `pgvector` mengoptimalkan operator jarak ($<=>$), sistem menghitung skor kesamaan ($S_{vec}$) sebagai invers dari jarak kosinus:

$$
S_{vec}(Q, D) = 1 - \text{CosineDistance}(Q, D) = \frac{Q \cdot D}{\|Q\| \|D\|} = \frac{\sum_{i=1}^{n} Q_i D_i}{\sqrt{\sum_{i=1}^{n} Q_i^2} \sqrt{\sum_{i=1}^{n} D_i^2}}
$$

Dimana $n = 1536$ adalah dimensi vektor. Nilai skor berkisar antara -1 hingga 1, namun dalam ruang embedding modern, nilai biasanya berada dalam rentang $[0, 1]$ dimana 1 menunjukkan kesamaan identik.

## 3. Pencarian Kata Kunci (*Sparse Retrieval*)

Komponen leksikal menggunakan algoritma Okapi BM25 (*Best Matching 25*), yang merupakan standar industri untuk fungsi peringkat probabilistik.

### 3.1. Pra-pemrosesan Teks (Bahasa Indonesia)
Sebelum perhitungan skor, teks dokumen dan *query* melalui tahap normalisasi:
*   **Tokenisasi**: Pemecahan teks menjadi unit kata, penghapusan karakter khusus, dan konversi ke huruf kecil (*lowercasing*).
*   **Stemming**: Penerapan algoritma stemming khusus Bahasa Indonesia (berbasis aturan morfologi) untuk mereduksi kata berimbuhan ke bentuk dasarnya (contoh: "meneliti", "penelitian" $\rightarrow$ "teliti"). Hal ini krusial untuk meningkatkan *recall* pada dokumen akademik berbahasa Indonesia.
*   **Stopword Removal**: Penghapusan kata umum yang tidak membawa makna signifikan (contoh: "yang", "dan", "di").

### 3.2. Formulasi Okapi BM25
Skor BM25 untuk pasangan dokumen $D$ dan *query* $Q$ dihitung sebagai penjumlahan skor untuk setiap istilah *query* $q_i$. Implementasi menggunakan varian BM25+ (dengan parameter $\delta$) untuk mencegah penalti berlebih pada istilah yang sangat umum, namun implementasi kode saat ini mengikuti standar BM25 dengan parameter $k_1$ dan $b$ yang disesuaikan untuk teks akademik:

$$ \text{BM25}(D, Q) = \sum_{q \in Q} \text{IDF}(q) \cdot \frac{f(q, D) \cdot (k_1 + 1)}{f(q, D) + k_1 \cdot (1 - b + b \cdot \frac{|D|}{\text{avgdl}})} $$

Dimana:
*   $f(q, D)$ adalah frekuensi istilah $q$ dalam dokumen $D$.
*   $|D|$ adalah panjang dokumen $D$ (jumlah token).
*   $	ext{avgdl}$ adalah rata-rata panjang dokumen dalam korpus.
*   $k_1$ adalah parameter saturasi frekuensi istilah. Nilai $k_1 = 1.2$ dipilih untuk mengakomodasi teks akademik yang cukup panjang.
*   $b$ adalah parameter normalisasi panjang. Nilai $b = 0.75$ digunakan untuk menyeimbangkan penalti terhadap dokumen panjang.

Komponen *Inverse Document Frequency* (IDF) dihitung menggunakan rumus probabilistik:

$$ \text{IDF}(q) = \ln \left( \frac{N - n(q) + 0.5}{n(q) + 0.5} + 1 \right) $$

Dimana:
*   $N$ adalah total jumlah dokumen dalam koleksi.
*   $n(q)$ adalah jumlah dokumen yang mengandung istilah $q$.

## 4. Fusi Peringkat (*Reciprocal Rank Fusion*)

Untuk menggabungkan hasil dari pencarian vektor dan BM25 yang memiliki distribusi skor berbeda (skor vektor $[0,1]$, skor BM25 tidak terbatas), sistem menggunakan algoritma *Reciprocal Rank Fusion* (RRF). RRF bekerja berdasarkan peringkat dokumen, bukan skor mentah, sehingga lebih robust terhadap perbedaan skala skor.

Skor fusi $S_{RRF}$ untuk sebuah dokumen $d \in D$ dihitung sebagai:

$$ S_{RRF}(d) = \sum_{r \in \mathcal{R}} \frac{1}{k + r(d)} $$

Dimana:
*   $\mathcal{R}$ adalah himpunan sistem perangkingan (dalam hal ini: Vector Ranker dan BM25 Ranker).
*   $r(d)$ adalah posisi peringkat dokumen $d$ dalam sistem perangkingan $r$ (misal: peringkat 1, 2, dst).
*   $k$ adalah konstanta peredam (*damping constant*). Nilai $k = 60$ digunakan sesuai rekomendasi literatur (Cormack et al., 2009) untuk menyeimbangkan pengaruh dokumen berperingkat tinggi dengan dokumen yang muncul di kedua daftar (bias ke arah dokumen yang "cukup relevan" di kedua metode daripada "sangat relevan" hanya di satu metode).

## 5. Peringkatan Ulang (*Reranking*)

Tahap akhir adalah *reranking* untuk meningkatkan presisi pada $K$ dokumen teratas (Top-K) hasil fusi.

### 5.1. Strategi Cross-Encoder
Sistem menggunakan model *Cross-Encoder* berbasis arsitektur Transformer (TinyBERT). Berbeda dengan *Bi-Encoder* yang memproses query dan dokumen secara terpisah, *Cross-Encoder* memproses pasangan (Query, Dokumen) secara bersamaan melalui mekanisme *self-attention* penuh. Hal ini memungkinkan model menangkap interaksi semantik yang mendalam.

Input ke model adalah konkatenasi query dan teks dokumen:
$$ \text{Input} = [\text{CLS}] \oplus Q \oplus [\text{SEP}] \oplus D \oplus [\text{SEP}] $$

Model menghasilkan skor logit yang dinormalisasi menjadi probabilitas relevansi $P(Relevan|Q, D)$ menggunakan fungsi sigmoid.

### 5.2. Strategi Ensemble (Opsional)
Untuk akurasi maksimal dalam mode riset, strategi *Ensemble* menggabungkan skor dari Cross-Encoder ($S_{CE}$) dan penilaian berbasis LLM ($S_{LLM}$) secara linear:

$$ S_{final} = w_{CE} \cdot S_{CE} + w_{LLM} \cdot S_{LLM} + w_{orig} \cdot S_{RRF} $$

Dimana bobot $w$ ditentukan secara eksperimental (default: $w_{CE}=0.4, w_{LLM}=0.4, w_{orig}=0.2$).

### Deskripsi Diagram Reranking (Untuk Visualisasi)
> **Gambar 2: Detail Proses Reranking.**
>
> *Visualisasi yang disarankan:*
> 1.  **Input**: Daftar 10-20 dokumen teratas dari RRF.
> 2.  **Proses**: Setiap pasangan (Query, Dokumen) dimasukkan ke dalam kotak "Cross-Encoder Model".
> 3.  **Internal Model**: Tampilkan representasi skematik lapisan *Attention* yang menghubungkan token query dan token dokumen (menunjukkan interaksi penuh).
> 4.  **Output**: Skor skalar (0-1) untuk setiap dokumen.
> 5.  **Sorting**: Daftar dokumen diurutkan ulang berdasarkan skor baru.
> 6.  **Hasil**: Top-5 dokumen final disajikan ke pengguna/LLM.
