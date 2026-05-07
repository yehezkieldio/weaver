# Metodologi: Pengujian Sistem (*System Testing*)

Untuk menjamin keandalan, stabilitas, dan kebenaran fungsional dari arsitektur *Retrieval-Augmented Generation* (RAG) yang dikembangkan, diterapkan strategi pengujian perangkat lunak berlapis (*multi-layered testing strategy*). Pengujian ini mencakup verifikasi logika internal, interaksi antar modul, fungsionalitas eksternal, dan ketahanan di bawah beban tinggi.

## 1. Pengujian Unit (*Unit Testing*)

Pengujian unit difokuskan pada verifikasi kebenaran logika deterministik pada komponen-komponen individual yang tidak bergantung pada layanan eksternal.

*   **Cakupan**: Modul *chunking* dokumen, algoritma pembersihan teks (*preprocessing*), dan logika domain universitas (misal: ekstraksi kode mata kuliah).
*   **Tujuan**: Memastikan bahwa fungsi pemotongan teks membagi dokumen sesuai batasan token tanpa memotong kalimat di tengah, dan bahwa heuristik deteksi bahasa bekerja sesuai spesifikasi.
*   **Alat**: Bun Test Runner.

## 2. Pengujian Integrasi (*Integration Testing*)

Pengujian integrasi memverifikasi interaksi antara modul logika dan lapisan data, memastikan alur data berjalan dengan benar sebelum melibatkan panggilan API eksternal yang mahal.

*   **Cakupan**: Mesin *Hybrid Retrieval*.
*   **Metodologi**: Menggunakan teknik *mocking* untuk mensimulasikan respons basis data vektor dan skor BM25.
*   **Verifikasi**: Memastikan algoritma *Reciprocal Rank Fusion* (RRF) menghitung skor gabungan dengan benar sesuai rumus:
    $$
    S_{RRF}(d) = \sum_{r \in \mathcal{R}} \frac{1}{k + r(d)}
    $$
    Pengujian ini memvalidasi bahwa dokumen yang relevan secara leksikal maupun semantik diprioritaskan dengan benar dalam daftar hasil.

## 3. Pengujian Kotak Hitam (*Blackbox Testing*)

Pengujian kotak hitam (*Blackbox Verification*) melakukan validasi fungsional terhadap *endpoint* API yang telah di-*deploy* tanpa melihat kode internal, mensimulasikan akses dari aplikasi klien (frontend).

*   **Skenario Uji**: Serangkaian kueri kontrol (*control queries*) yang mencakup identitas universitas, informasi fakultas, dan prosedur dasar.
*   **Validasi**: Respons API diperiksa terhadap pola ekspresi reguler (*Regex*) untuk memastikan keberadaan kata kunci wajib (misal: "Universitas Mulia", "Fakultas Ilmu Komputer").
*   **Tujuan**: Memastikan sistem yang berjalan mampu melayani permintaan HTTP, memproses RAG, dan mengembalikan jawaban yang mengandung entitas domain yang benar.

## 4. Pengujian Beban (*Stress Testing*)

Pengujian beban (*Stress Testing*) dilakukan untuk mengevaluasi stabilitas dan kinerja latensi sistem di bawah kondisi konkurensi tinggi.

*   **Parameter**: 10-50 pengguna konkuren (*concurrent users*) mengirimkan permintaan secara simultan.
*   **Metrik**:
    *   **Throughput**: Jumlah permintaan per detik (req/s) yang berhasil dilayani.
    *   **Latensi Ekor (*Tail Latency*)**: Persentil ke-95 (P95) dan ke-99 (P99) dari waktu respons.
    *   **Success Rate**: Persentase permintaan yang berhasil (HTTP 200 OK) tanpa *timeout* atau *error*.
*   **Relevansi**: Pengujian ini krusial untuk memastikan arsitektur *asynchronous* dan manajemen koneksi *database* (pool) dapat menangani lonjakan lalu lintas yang mungkin terjadi pada periode sibuk akademik (misal: masa pengisian KRS).

## 5. Ringkasan Strategi Pengujian

| Tipe Pengujian | Fokus | Alat | Metrik Utama |
| :--- | :--- | :--- | :--- |
| **Unit** | Logika Komponen | Bun Test | Pass/Fail |
| **Integrasi** | Alur Data & Algoritma | Bun Test + Mocks | Skor RRF yang Benar |
| **Blackbox** | Fungsionalitas API | Skrip Kustom (Fetch) | Regex Match |
| **Stress** | Konkurensi & Latensi | Skrip Beban Kustom | P95 Latency, Throughput |

Strategi pengujian komprehensif ini melengkapi evaluasi kualitas RAG (RAGAS), memberikan jaminan kualitas dari aspek rekayasa perangkat lunak (*software engineering*) yang sering kali terabaikan dalam penelitian NLP murni.
