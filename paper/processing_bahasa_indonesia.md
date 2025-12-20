# Metodologi: Pemrosesan Bahasa Indonesia (*Processing Bahasa Indonesia*)

Penelitian ini menerapkan pipa pemrosesan bahasa alami (*Natural Language Processing* - NLP) yang dikhususkan untuk Bahasa Indonesia ragam akademik. Tantangan utama dalam memproses dokumen universitas di Indonesia meliputi variasi morfologi kata yang kaya (afiksasi), penggunaan istilah teknis/administratif yang spesifik, serta struktur dokumen formal yang kompleks. Bagian ini merinci teknik *preprocessing*, normalisasi, dan strategi *chunking* yang diadaptasi untuk konteks ini.

## 1. Normalisasi dan Pembersihan Teks

Sebelum tahap pemrosesan semantik, dokumen mentah (terutama hasil ekstraksi PDF) melalui serangkaian normalisasi untuk memperbaiki artefak OCR dan format yang tidak konsisten.

### 1.1. Perbaikan Artefak PDF
Dokumen administratif sering kali dikonversi dari format spreadsheet atau *layout* kompleks yang menyebabkan masalah spasi. Sistem menerapkan heuristik berbasis *Regular Expression* (Regex) untuk:
*   **Penyatuan Kata Terpisah**: Menggabungkan karakter yang terpisah spasi berlebih akibat *justify alignment* (contoh: "B A B  1" $\rightarrow$ "BAB 1", "P E N D A H U L U A N" $\rightarrow$ "PENDAHULUAN").
*   **Normalisasi Angka**: Memperbaiki format angka tahun atau nominal yang terpecah (contoh: "2 0 2 4" $\rightarrow$ "2024").
*   **Pembersihan Karakter Kontrol**: Menghapus *wide spaces* (U+2000-U+200B) dan normalisasi *line breaks*.

### 1.2. Deteksi Bahasa
Sistem menggunakan pendekatan heuristik berbasis kata kunci (*keyword-based heuristics*) untuk mendeteksi bahasa dokumen (Indonesia vs Inggris). Deteksi ini krusial untuk memilih *stemmer* dan *stopword list* yang tepat.
*   **Indikator Bahasa Indonesia**: Kehadiran kata fungsi seperti "yang", "dengan", "untuk", "dalam", "adalah", "serta istilah akademik seperti "skripsi", "prodi", "fakultas".
*   **Ambang Batas**: Dokumen diklasifikasikan sebagai Bahasa Indonesia jika skor kecocokan pola melebihi ambang batas tertentu ($score > 10$). 

## 2. Pemrosesan Leksikal (BM25)

Untuk mendukung pencarian kata kunci (*sparse retrieval*), teks diproses untuk meningkatkan *recall* melalui normalisasi bentuk kata.

### 2.1. Stemming Bahasa Indonesia
Sistem menerapkan algoritma *stemming* ringan (*lightweight stemming*) yang disesuaikan untuk kebutuhan *information retrieval*. Berbeda dengan *stemmer* agresif yang mungkin mengubah makna, pendekatan ini fokus pada penghapusan afiks infleksional umum untuk menyatukan variasi kata ke bentuk dasarnya:
*   **Penghapusan Sufiks**: `-kan`, `-an`, `-i`, `-lah`, `-kah`, `-nya`.
*   **Penghapusan Prefiks**: `meng-`, `mem-`, `ber-`, `di-`, `ke-`, `ter-`, `pe-`, `se-`.

Tujuannya adalah agar kueri "mengajukan cuti" dapat cocok dengan dokumen yang berisi "pengajuan cuti" atau "diajukan".

### 2.2. Stopword Removal
Daftar kata henti (*stopwords*) dikurasi khusus untuk domain akademik Indonesia. Selain kata umum ("dan", "yang", "di"), daftar ini menyaring kata-kata yang sering muncul dalam dokumen formal namun memiliki nilai diskriminatif rendah bagi pencarian, seperti "tersebut", "berdasarkan", "merupakan", dan "terdapat".

## 3. Strategi Chunking Adaptif

Pemecahan dokumen menjadi segmen-segmen (*chunks*) yang lebih kecil adalah langkah kritis dalam RAG. Penelitian ini mengembangkan strategi pemilihan *chunking* otomatis berdasarkan karakteristik dokumen.

### 3.1. Analisis Karakteristik Dokumen
Setiap dokumen dianalisis metrik strukturnya:
*   **Kepadatan Heading**: Jumlah sub-bab per 1000 karakter.
*   **Rata-rata Panjang Paragraf**: Indikasi kepadatan informasi.
*   **Kepadatan List**: Proporsi item daftar (*bullet points*).
*   **Penanda Bab**: Keberadaan pola "BAB [Romawi]".

### 3.2. Algoritma Seleksi Strategi
Berdasarkan metrik di atas, sistem memilih salah satu dari tiga strategi:

1.  **Sentence Window Chunking**:
    *   *Kondisi*: Dokumen padat informasi dengan paragraf pendek (<200 karakter) dan banyak daftar (densitas list > 0.15). Contoh: FAQ, Panduan Prosedur.
    *   *Metode*: Memecah per kalimat, namun menyimpan $N=3$ kalimat sebelum dan sesudah sebagai konteks metadata. Ini memastikan pengambilan informasi yang presisi tanpa kehilangan konteks lokal.

2.  **Hierarchical Chunking**:
    *   *Kondisi*: Dokumen terstruktur tinggi dengan penanda bab jelas atau densitas heading tinggi. Contoh: Buku Pedoman, Peraturan Akademik.
    *   *Metode*: Membuat *chunk* induk (Bab/Sub-bab) dan *chunk* anak (Paragraf). Pengambilan *chunk* anak akan menyertakan referensi ke konteks induknya, memungkinkan jawaban yang sadar struktur (misal: "Menurut Bab V Pasal 3...").

3.  **Semantic Chunking (Sliding Window)**:
    *   *Kondisi*: Dokumen naratif panjang dengan struktur heading rendah. Contoh: Laporan Rektor, Artikel Sejarah.
    *   *Metode*: Menggunakan *sliding window* kalimat dan menghitung kesamaan kosinus antar *window* berturutan. Batas *chunk* dibuat ketika terjadi penurunan kesamaan yang signifikan (topik berubah).

    $$
    \text{Boundary}(i) \iff \text{CosineSim}(W_i, W_{i+1}) < \tau
    $$
    Dimana $\tau = 0.5$ adalah ambang batas semantik.

4.  **Recursive Character Chunking** (Default):
    *   *Kondisi*: Dokumen campuran atau tidak memenuhi kriteria di atas.
    *   *Metode*: Pemecahan standar berbasis karakter dengan hierarki pemisah akademik (BAB $\rightarrow$ Paragraf $\rightarrow$ Kalimat).

## 4. Ekspansi Kueri Domain Spesifik

Untuk menjembatani kesenjangan kosakata antara pertanyaan pengguna (informal) dan dokumen (formal), sistem menggunakan kamus sinonim domain universitas.

### 4.1. Grup Sinonim
Sistem mendefinisikan grup sinonim untuk berbagai konteks:
*   **Administrasi**: `prosedur` $\approx$ `tata cara` $\approx$ `mekanisme` $\approx$ `alur`.
*   **Keuangan**: `biaya` $\approx$ `ukt` $\approx$ `spp` $\approx$ `tarif`.
*   **Akademik**: `skripsi` $\approx$ `tugas akhir`, `magang` $\approx$ `pkl` $\approx$ `praktik kerja`.

Saat kueri diproses, istilah yang cocok akan diekspansi (*query expansion*) untuk meningkatkan *recall* pencarian, memastikan pengguna menemukan dokumen relevan meskipun menggunakan terminologi yang berbeda dari teks resmi.
