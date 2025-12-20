# Laporan Pengujian Sistem: Chatbot RAG Riset Akademik

**Tanggal**: 20 Desember 2025
**Sistem**: Chatbot RAG Universitas Mulia
**Lingkungan**: Linux / Bun Runtime

---

## Ringkasan Eksekutif

Untuk memastikan ketahanan, keandalan, dan validitas akademis sistem RAG (*Retrieval-Augmented Generation*), strategi pengujian berlapis yang komprehensif telah diterapkan. Strategi ini melampaui pengujian unit sederhana hingga mencakup verifikasi integrasi, pengujian blackbox seluruh sistem, dan stress testing dengan konkurensi tinggi. Tujuan utamanya adalah untuk memvalidasi aspek "implementasi" dari penelitian, memastikan bahwa jalur pipa (*pipeline*) RAG teoretis diterjemahkan menjadi artefak perangkat lunak yang berkinerja baik dan benar secara fungsional.

Rangkaian pengujian ini mengonfirmasi bahwa logika domain inti (entitas khusus universitas) diproses dengan benar, mesin pencarian hibrida berfungsi sesuai desain, dan sistem tetap stabil di bawah kondisi beban yang khas dari portal informasi universitas.

---

## Poin-Poin Eksekutif

*   **Verifikasi Berlapis**: Pengujian mencakup fungsi individual (Unit), interaksi modul (Integrasi), hingga perilaku sistem penuh (Blackbox/Stress).
*   **Validasi Deterministik**: Pengetahuan domain utama (misalnya, "Universitas Mulia", fakultas, syarat pendaftaran) diverifikasi menggunakan pola regex yang ketat untuk memastikan halusinasi diminimalkan pada fakta-fakta kritis.
*   **Tolok Ukur Kinerja**: Stress test mengukur latensi sistem (P95, P99) dan *throughput*, memberikan data empiris tentang skalabilitas.
*   **Integritas Pencarian Hibrida**: Pengujian integrasi secara khusus memvalidasi penggabungan algoritma Pencarian Vektor dan BM25, memastikan kebaruan inti dari jalur pipa RAG berfungsi.

---

## 1. Pengujian Unit (Tingkat Komponen)

**Tujuan**: Memverifikasi kebenaran fungsi individual dan modul logika yang terisolasi, memastikan pemrosesan teks deterministik dan heuristik khusus domain berfungsi sebelum masuk ke jalur pipa.

*   **Alat**: Bun Test (kompatibel dengan Jest).
*   **Cakupan**:
    *   **Strategi Chunking** (`src/lib/rag/chunking.ts`): Memverifikasi bahwa pemecahan teks mematuhi batas token (misalnya, 512 token), mempertahankan kutipan akademik, dan mengidentifikasi struktur dokumen seperti tajuk dan daftar dengan benar.
    *   **Logika Domain** (`src/lib/rag/university-domain.ts`): Menguji ekstraksi metadata (kode mata kuliah, nama fakultas) dan perluasan sinonim kueri (misalnya, memetakan "TI" ke "Teknik Informatika").
*   **Validasi Kunci**: Memastikan bahwa penyerapan data bersih dan struktur data dasar untuk RAG kuat.

## 2. Pengujian Integrasi (Tingkat Modul)

**Tujuan**: Memverifikasi interaksi antara sumber data dan lapisan logika tanpa bergantung pada layanan eksternal yang tidak stabil (seperti API OpenAI langsung) untuk setiap pengujian. Ini berfokus pada kebenaran algoritmik dari mesin pencarian.

*   **Alat**: Bun Test dengan Mocking Modul.
*   **Cakupan**:
    *   **Pencarian Hibrida** (`src/lib/rag/hybrid-retrieval.ts`): Menguji algoritma **Reciprocal Rank Fusion (RRF)**.
    *   **Logika**: Melakukan *mocking* pada lapisan basis data dan penyimpanan vektor untuk memastikan bahwa logika yang menggabungkan skor kesamaan vektor dan skor kata kunci Okapi BM25 memprioritaskan dokumen yang memenuhi relevansi semantik dan leksikal dengan benar.
*   **Validasi Kunci**: Mengonfirmasi bahwa "Hibrida" dalam "RAG Hibrida" benar-benar berfungsi dan tidak hanya kembali ke metode tunggal.

## 3. Verifikasi Blackbox (Tingkat Sistem Fungsional)

**Tujuan**: Melakukan verifikasi fungsional deterministik dari *endpoint* API yang digunakan untuk memastikan pengetahuan domain inti dapat diakses dan diformat dengan benar dari perspektif pengguna.

*   **Alat**: Rangkaian Tes Blackbox Kustom (`scripts/blackbox-test.ts`).
*   **Metodologi**:
    *   Mengirimkan serangkaian kueri kontrol standar ke API yang berjalan (misalnya, "Apa nama universitas ini?", "Sebutkan fakultas yang ada").
    *   **Validasi**: Menggunakan **Ekspresi Reguler (Regex)** yang ketat untuk memeriksa keberadaan kata kunci wajib (misalnya, "Universitas Mulia", "Ilmu Komputer", "Beasiswa") dalam respons.
    *   **Cakupan**: Meliputi 5 kasus uji kritis mulai dari identitas dasar hingga kemampuan bilingual (Inggris/Indonesia).
*   **Validasi Kunci**: Memastikan sistem "membumi" dalam realitas dan menyajikan fakta yang benar tentang domain universitas tertentu.

## 4. Stress Testing (Tingkat Non-Fungsional)

**Tujuan**: Mengevaluasi stabilitas sistem, latensi, dan tingkat kesalahan di bawah kondisi konkurensi tinggi untuk mensimulasikan lonjakan penggunaan dunia nyata (misalnya, selama periode pendaftaran).

*   **Alat**: Skrip Stress Test Kustom (`scripts/stress-test.ts`).
*   **Konfigurasi**:
    *   **Konkurensi**: 10 pengguna simultan (dapat dikonfigurasi).
    *   **Total Permintaan**: 50 permintaan per jalan (dapat dikonfigurasi).
*   **Metrik yang Dikumpulkan**:
    *   **Latensi**: Waktu respons Rata-rata, P95 (persentil ke-95), dan P99 (persentil ke-99).
    *   **Throughput**: Permintaan per detik (Req/s).
    *   **Tingkat Kesalahan**: Persentase permintaan HTTP yang gagal atau *timeout*.
*   **Validasi Kunci**: Menyediakan data kinerja empiris yang diperlukan untuk bagian "Hasil" dari makalah akademik, menunjukkan kelayakan praktis sistem.