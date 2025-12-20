# Metodologi: Dokumen Korpus (*Corpus Document*)

Penelitian ini menggunakan korpus dokumen yang dikurasi secara khusus dari lingkungan Universitas Mulia untuk merepresentasikan ekosistem informasi universitas yang komprehensif. Korpus ini mencakup berbagai jenis dokumen, mulai dari regulasi akademik formal hingga panduan prosedur administratif, yang dirancang untuk menguji kemampuan sistem *Retrieval-Augmented Generation* (RAG) dalam menangani pertanyaan spesifik domain universitas di Indonesia.

## 1. Komposisi Korpus

Dataset terdiri dari dokumen-dokumen otentik yang mencakup 12 kategori domain utama, dengan total 37 dokumen yang terdiri dari format PDF dan teks (TXT).

### 1.1. Distribusi Dokumen
Dokumen dalam korpus dikategorikan ke dalam kelompok-kelompok berikut:

| Kategori Domain | Deskripsi | Contoh Dokumen |
| :--- | :--- | :--- |
| **Informasi Akademik** | Informasi terkait kurikulum, program studi, dan akreditasi. | `Program_Pendidikan.txt`, `Akreditasi.txt`, `PDDikti.txt`, `Kalender_Akademik.txt` |
| **Dokumen Regulasi** | Peraturan resmi universitas dan pedoman perilaku. | `Peraturan_Akademik.pdf`, `Tata_Tertib_Kehidupan_Kampus...pdf`, `Statuta_Universitas.pdf` |
| **Administrasi & Biro** | Prosedur administratif, layanan biro, dan panduan pembayaran. | `Biro_Akademik_Dan_Sistem_Informasi.txt`, `Panduan_Pembayaran.pdf`, `Biro_Sumber_Daya.txt` |
| **Program Studi (Prodi)** | Informasi spesifik per program studi (kurikulum, profil lulusan). | `Sarjana_Informatika.txt`, `Sarjana_Hukum.txt`, `Sarjana_Farmasi.txt`, `Sarjana_Manajemen.txt` |
| **Panduan Akademik** | Pedoman untuk tugas akhir dan studi mahasiswa. | `Panduan_Skripsi.pdf`, `Booklet.pdf`, `Study_In_Mulia_University.pdf` |
| **Profil & Organisasi** | Profil institusi, struktur organisasi, dan rencana strategis. | `Profil.txt`, `Organisasi.txt`, `Rencana_Strategis...2019_2025.pdf`, `Roadmap.txt` |
| **Layanan & Fasilitas** | Informasi fasilitas kampus dan layanan pendukung. | `Layanan_dan_Fasilitas.txt`, `Kontak.txt`, `Biro_Kemahasiswaan_Dan_Alumni.txt` |

### 1.2. Format dan Struktur Data
Korpus terdiri dari dua format utama yang memerlukan strategi pemrosesan berbeda:
*   **PDF (Portable Document Format)**: Dokumen formal seperti SK Rektor, Buku Pedoman, dan Peraturan Akademik. Dokumen ini kaya akan struktur (bab, sub-bab, tabel) namun memerlukan ekstraksi teks yang cermat untuk menangani *layout* dua kolom, *header/footer*, dan tabel administratif.
*   **TXT (Plain Text)**: Dokumen informasi web yang telah diekstraksi dan dibersihkan, berisi informasi profil prodi, deskripsi fasilitas, dan konten statis lainnya. Struktur ditandai dengan *heading* markdown atau pemisah baris yang jelas.

## 2. Taksonomi Dokumen Universitas

Untuk memfasilitasi temu kembali yang presisi, sistem mengimplementasikan taksonomi dokumen yang mendalam (*fine-grained document taxonomy*) yang mencakup lebih dari 50 tipe dokumen spesifik. Taksonomi ini digunakan untuk:
1.  **Pemberian Bobot (*Weighting*)**: Memberikan prioritas pada dokumen regulasi (SK, Peraturan) dibandingkan dokumen informasi umum (Berita) untuk pertanyaan normatif.
2.  **Strategi Chunking**: Menentukan metode pemotongan teks yang optimal (misal: *hierarchical chunking* untuk Buku Pedoman vs *semantic chunking* untuk Profil Prodi).

### 2.1. Klasifikasi Tipe Dokumen
Sistem secara otomatis mengklasifikasikan dokumen ke dalam tipe-tipe berikut berdasarkan pola konten dan kata kunci:

*   **Regulasi & Pedoman**: `buku_pedoman_akademik`, `peraturan_rektor`, `sk_akademik`, `sop`, `tata_tertib`.
*   **Akademik & Kurikulum**: `kurikulum`, `silabus`, `kalender_akademik`, `cpl` (Capaian Pembelajaran Lulusan).
*   **Tugas Akhir & Riset**: `panduan_skripsi`, `pedoman_tesis`, `jurnal_kampus`, `roadmap_penelitian`.
*   **Administrasi & Keuangan**: `prosedur_ukt`, `prosedur_cuti`, `rincian_biaya`, `alur_pembayaran`.
*   **Kemahasiswaan**: `beasiswa`, `ukm_organisasi`, `prestasi_mahasiswa`.

## 3. Karakteristik Linguistik Korpus

Korpus ini didominasi oleh Bahasa Indonesia ragam formal/akademik dengan karakteristik khusus:
*   **Terminologi Administratif**: Penggunaan akronim khusus (KRS, KHS, IPK, UKT, BEM, SKS) yang memerlukan pemahaman konteks.
*   **Struktur Hierarkis**: Penggunaan penomoran bertingkat (Bab I, Pasal 1, Ayat 1) dalam dokumen regulasi.
*   **Campuran Kode (*Code Mixing*)**: Penggunaan istilah Inggris dalam konteks akademik (misal: *Learning Outcomes*, *Tracer Study*, *Center of Excellence*) di tengah teks Bahasa Indonesia.

Pemahaman mendalam terhadap karakteristik korpus ini menjadi landasan bagi desain strategi *preprocessing* dan *retrieval* yang diterapkan dalam penelitian ini.
