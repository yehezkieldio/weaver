# Metodologi: Dataset Pertanyaan Evaluasi (*Evaluation Questions*)

Evaluasi sistem dilakukan menggunakan dataset pertanyaan yang dikurasi secara manual, yang dirancang untuk merepresentasikan distribusi nyata dari kebutuhan informasi di lingkungan universitas. Dataset ini, `ACADEMIC_QUESTIONS`, terdiri dari 50 pasangan pertanyaan dan jawaban referensi (*Ground Truth*) yang telah diverifikasi oleh ahli domain (staf akademik) untuk menjamin akurasi faktual.

## 1. Komposisi dan Kategori Dataset

Dataset ini mencakup 8 kategori domain utama yang mencerminkan spektrum layanan dan informasi universitas. Distribusi ini memastikan bahwa sistem diuji tidak hanya pada satu jenis dokumen, tetapi pada berbagai struktur informasi.

| Kategori | Jumlah Soal | Fokus Evaluasi |
| :--- | :---: | :--- |
| **Academic Regulations** | 8 | Pemahaman aturan kompleks, syarat kelulusan, sanksi plagiarisme. |
| **Faculty & Programs** | 8 | Kurikulum prodi, konsentrasi, profil lulusan, akreditasi. |
| **Administrative Proc.** | 6 | Prosedur birokrasi, cuti, legalisir, surat keterangan. |
| **Facilities & Services** | 6 | Lokasi lab, fungsi fasilitas, akses Wi-Fi, ruang khusus. |
| **Student Services** | 5 | Layanan konseling, karir (CDC), kegiatan kemahasiswaan. |
| **Financial Procedures** | 4 | Pembayaran UKT, denda, metode pembayaran, cek tagihan. |
| **Admissions (PMB)** | 4 | Jalur masuk, syarat pendaftaran, registrasi ulang. |
| **General Info** | 9 | Visi misi, struktur organisasi, sejarah, lokasi kampus. |
| **Total** | **50** | |

## 2. Tingkat Kesulitan (*Difficulty Levels*)

Pertanyaan diklasifikasikan ke dalam tiga tingkat kesulitan berdasarkan kompleksitas penalaran dan pengambilan informasi yang diperlukan:

1.  **Mudah (Easy)**: Pertanyaan faktual langsung yang jawabannya dapat ditemukan secara eksplisit dalam satu dokumen atau satu paragraf.
    *   *Contoh*: "Siapa Rektor Universitas Mulia saat ini?"
    *   *Proporsi*: ~30%

2.  **Sedang (Medium)**: Pertanyaan yang memerlukan sintesis informasi dari beberapa bagian dokumen atau pemahaman prosedur bertahap.
    *   *Contoh*: "Bagaimana prosedur pengajuan cuti akademik?" (Memerlukan urutan langkah yang benar).
    *   *Proporsi*: ~50%

3.  **Sulit (Hard)**: Pertanyaan inferensial, komparatif, atau multi-hop yang memerlukan penggabungan informasi dari dokumen berbeda atau pemahaman implisit.
    *   *Contoh*: "Sertifikasi apa saja yang bisa didapatkan mahasiswa Teknologi Informasi?" (Informasi mungkin tersebar di berbagai silabus mata kuliah).
    *   *Proporsi*: ~20%

## 3. Metodologi *Ground Truth*

Setiap entri dalam dataset terdiri dari komponen-komponen berikut yang memfasilitasi evaluasi otomatis:

*   **Question**: Teks pertanyaan dalam Bahasa Indonesia formal/semi-formal.
*   **Ground Truth**: Jawaban referensi emas yang disusun oleh manusia berdasarkan dokumen resmi universitas. Jawaban ini berfungsi sebagai *baseline* untuk metrik *Correctness* dan *Recall*.
*   **Relevant Chunk IDs**: Daftar ID unik dari potongan dokumen (*chunks*) yang secara otoritatif mengandung informasi untuk menjawab pertanyaan tersebut. Ini digunakan untuk menghitung metrik *Retrieval* seperti NDCG dan MRR.

### Contoh Entri Dataset (Anonimisasi ID)

```json
{
    "question": "Bagaimana aturan pengerjaan Skripsi secara berkelompok?",
    "groundTruth": "Skripsi berkelompok dapat dikerjakan oleh maksimal 3 orang mahasiswa dari prodi yang sama. Skema ini hanya diperbolehkan untuk Penelitian Terapan, dan setiap anggota memiliki tanggung jawab yang sama.",
    "category": "academic_regulations",
    "difficulty": "hard",
    "language": "id",
    "relevantChunkIds": [
        "9405c0b1-...", 
        "c4b90997-...",
        "ecd9ff4d-..."
    ]
}
```

## 4. Validasi Dataset

Untuk memastikan kualitas dataset, dilakukan proses validasi dua tahap:
1.  **Verifikasi Faktual**: Setiap pasangan pertanyaan-jawaban diperiksa silang dengan dokumen sumber (PDF SK Rektor, Buku Pedoman) untuk memastikan tidak ada informasi usang.
2.  **Uji Ambiguitas**: Pertanyaan diuji coba oleh manusia untuk memastikan pertanyaan tidak memiliki makna ganda yang dapat membingungkan sistem evaluasi.

Penggunaan dataset statis yang terkurasi ini memungkinkan perbandingan yang adil (*apples-to-apples*) antar berbagai konfigurasi sistem (misal: membandingkan kinerja *Semantic Chunking* vs *Recursive Chunking*) dalam eksperimen studi ablasi.
