/**
 * Evaluation Questions Store
 *
 * This module provides the single source of truth for evaluation questions used in:
 * - Standard evaluation runs
 * - Ablation studies
 * - Statistical analysis
 *
 * Questions can come from:
 * 1. Database (evaluationQuestions table) - Primary source for custom evaluations
 * 2. Predefined questions below - Fallback and default dataset
 *
 * DOMAIN: General university information (guides, regulations, procedures, faculty, programs)
 * NOT research methodology or thesis writing
 */

export type EvaluationQuestion = {
    question: string;
    groundTruth: string;
    category?: EvaluationCategory;
    difficulty?: "easy" | "medium" | "hard";
    language?: "id" | "en";
};

export type EvaluationCategory =
    | "academic_regulations"
    | "administrative_procedures"
    | "student_services"
    | "faculty_programs"
    | "facilities_services"
    | "financial_procedures"
    | "admissions_registration"
    | "general_university_info";

/**
 * Predefined evaluation questions for Indonesian university information domain.
 * These questions cover general university information like regulations, services, procedures, and facilities.
 */
export const ACADEMIC_QUESTIONS: EvaluationQuestion[] = [
    // Academic Regulations
    {
        question: "Bagaimana cara mengisi KRS dan apa saja yang perlu diperhatikan?",
        groundTruth:
            "Pengisian KRS (Kartu Rencana Studi) dilakukan melalui sistem akademik online sesuai jadwal yang ditentukan. Hal yang perlu diperhatikan: (1) Batas maksimal SKS sesuai IP semester sebelumnya, (2) Mata kuliah prasyarat harus sudah lulus, (3) Jadwal kuliah tidak bentrok, (4) Konsultasi dengan dosen pembimbing akademik, (5) Perhatikan deadline pengisian dan perubahan KRS. Mahasiswa dengan IP ≥3.00 umumnya dapat mengambil maksimal 24 SKS, IP 2.50-2.99 maksimal 21 SKS, dan IP <2.50 maksimal 18 SKS.",
        category: "academic_regulations",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Apa saja syarat kelulusan untuk program sarjana (S1)?",
        groundTruth:
            "Syarat kelulusan program sarjana (S1) meliputi: (1) Menyelesaikan minimal 144 SKS sesuai kurikulum program studi, (2) IPK minimal 2.00 dari skala 4.00, (3) Lulus semua mata kuliah wajib dan pilihan sesuai kurikulum, (4) Menyelesaikan dan lulus ujian skripsi/tugas akhir, (5) Tidak memiliki tunggakan pembayaran, (6) Menyelesaikan program magang/PKL jika dipersyaratkan, (7) Lulus ujian kompetensi atau sertifikasi jika ada, (8) Mengikuti yudisium dan wisuda.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Bagaimana prosedur cuti akademik dan apa konsekuensinya?",
        groundTruth:
            "Prosedur cuti akademik: (1) Mengajukan permohonan cuti ke fakultas/program studi dengan mengisi formulir, (2) Melampirkan surat persetujuan orang tua/wali dan alasan cuti, (3) Mendapat persetujuan dosen PA dan dekan, (4) Melunasi biaya cuti jika ada, (5) Mengurus administrasi di bagian akademik. Konsekuensi: mahasiswa tidak mengikuti perkuliahan selama cuti, masa studi tetap berjalan (kecuali cuti sakit dengan surat dokter), maksimal cuti 2 semester berturut-turut, dan harus registrasi ulang saat kembali aktif.",
        category: "administrative_procedures",
        difficulty: "medium",
        language: "id",
    },

    // Administrative Procedures
    {
        question: "Bagaimana cara mengurus surat keterangan aktif kuliah?",
        groundTruth:
            "Cara mengurus surat keterangan aktif kuliah: (1) Mengajukan permohonan ke bagian administrasi akademik/kemahasiswaan, (2) Mengisi formulir permohonan surat keterangan, (3) Melampirkan fotokopi KTM (Kartu Tanda Mahasiswa), (4) Membayar biaya administrasi jika ada, (5) Menunggu proses penerbitan (biasanya 1-3 hari kerja), (6) Mengambil surat yang sudah ditandatangani dan distempel. Surat ini sering dibutuhkan untuk keperluan beasiswa, pembuatan kartu kredit, atau administrasi lainnya.",
        category: "administrative_procedures",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Apa saja langkah untuk legalisir ijazah dan transkrip nilai?",
        groundTruth:
            "Langkah legalisir ijazah dan transkrip: (1) Persiapkan dokumen asli dan fotokopi yang akan dilegalisir, (2) Datang ke bagian akademik/administrasi universitas, (3) Isi formulir permohonan legalisir, (4) Serahkan dokumen dan bayar biaya legalisir per lembar, (5) Tunggu proses verifikasi dan pemberian cap/stempel resmi (biasanya selesai di hari yang sama), (6) Ambil dokumen yang sudah dilegalisir. Legalisir diperlukan untuk melamar kerja, melanjutkan studi, atau keperluan resmi lainnya.",
        category: "administrative_procedures",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Bagaimana prosedur pindah program studi?",
        groundTruth:
            "Prosedur pindah program studi: (1) Memenuhi syarat: IPK minimal 2.75-3.00, maksimal semester 4, tidak ada tunggakan, (2) Mengajukan surat permohonan ke program studi asal dan tujuan, (3) Mengikuti ujian/wawancara jika diperlukan, (4) Mendapat persetujuan dari ketua prodi asal, ketua prodi tujuan, dan dekan, (5) Mengurus konversi nilai mata kuliah yang relevan, (6) Membayar biaya administrasi perpindahan, (7) Registrasi ulang di program studi baru. Perpindahan biasanya hanya dapat dilakukan 1 kali selama masa studi.",
        category: "administrative_procedures",
        difficulty: "hard",
        language: "id",
    },

    // Student Services
    {
        question: "Apa saja jenis beasiswa yang tersedia dan bagaimana cara mendaftarnya?",
        groundTruth:
            "Jenis beasiswa yang umum tersedia: (1) Beasiswa prestasi akademik (IPK tinggi), (2) Beasiswa KIP-Kuliah untuk mahasiswa kurang mampu, (3) Beasiswa dari perusahaan/yayasan, (4) Beasiswa hafiz Quran/prestasi non-akademik, (5) Beasiswa atlet/seni. Cara mendaftar: perhatikan pengumuman dari kampus, siapkan dokumen (KHS, surat keterangan tidak mampu, sertifikat prestasi), isi formulir pendaftaran online/offline, upload dokumen persyaratan, ikuti seleksi wawancara jika ada, tunggu pengumuman hasil seleksi.",
        category: "student_services",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Bagaimana cara mendaftar magang atau PKL?",
        groundTruth:
            "Cara mendaftar magang/PKL: (1) Pastikan sudah memenuhi syarat SKS minimal (biasanya 90-100 SKS), (2) Konsultasi dengan dosen pembimbing atau koordinator magang, (3) Cari tempat magang sesuai bidang studi (bisa dibantu kampus atau mandiri), (4) Ajukan surat pengantar magang ke fakultas/prodi, (5) Serahkan surat pengantar ke perusahaan yang dituju, (6) Ikuti proses seleksi perusahaan jika ada, (7) Setelah diterima, laporkan ke koordinator magang dan dosen pembimbing, (8) Laksanakan magang sesuai durasi yang ditentukan (3-6 bulan), (9) Buat laporan magang dan presentasi.",
        category: "student_services",
        difficulty: "medium",
        language: "id",
    },

    // Faculty and Programs
    {
        question: "Bagaimana cara menghubungi dosen pembimbing akademik?",
        groundTruth:
            "Cara menghubungi dosen pembimbing akademik (PA): (1) Cek informasi dosen PA di portal akademik atau sistem informasi mahasiswa, (2) Lihat jadwal konsultasi/office hours dosen PA yang biasanya dipasang di ruangan atau diinformasikan di awal semester, (3) Hubungi melalui email resmi dosen (biasanya tersedia di website fakultas), (4) Datang langsung ke ruangan dosen sesuai jadwal konsultasi, (5) Hubungi melalui grup WhatsApp/Line kelas jika ada, (6) Koordinasi dengan ketua kelas untuk membuat janji bertemu. Pastikan membawa KHS dan daftar mata kuliah yang akan diambil saat konsultasi.",
        category: "faculty_programs",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Apa perbedaan antara mata kuliah wajib dan mata kuliah pilihan?",
        groundTruth:
            "Mata kuliah wajib adalah mata kuliah yang HARUS diambil dan lulus oleh semua mahasiswa program studi, tercantum dalam kurikulum dengan jumlah SKS yang sudah ditentukan. Mata kuliah pilihan adalah mata kuliah yang dapat dipilih mahasiswa sesuai minat dari daftar yang disediakan prodi, biasanya ada kuota minimum SKS pilihan yang harus dipenuhi untuk kelulusan (misalnya 12-18 SKS). Mata kuliah wajib langsung terkait dengan kompetensi inti lulusan, sedangkan mata kuliah pilihan untuk memperdalam bidang tertentu atau memperluas wawasan.",
        category: "faculty_programs",
        difficulty: "easy",
        language: "id",
    },

    // Facilities and Services
    {
        question: "Bagaimana cara menggunakan fasilitas perpustakaan kampus?",
        groundTruth:
            "Cara menggunakan fasilitas perpustakaan: (1) Daftar sebagai anggota perpustakaan dengan KTM, (2) Pelajari jam operasional perpustakaan (biasanya Senin-Jumat 08.00-16.00), (3) Cari buku melalui katalog online (OPAC) atau tanya petugas, (4) Pinjam buku dengan menunjukkan KTM (batas pinjam biasanya 2-4 buku untuk 1-2 minggu), (5) Kembalikan buku tepat waktu untuk menghindari denda keterlambatan, (6) Manfaatkan ruang baca, akses jurnal digital, dan komputer yang tersedia, (7) Ikuti aturan: tidak boleh makan/minum, jaga ketenangan, simpan tas di loker.",
        category: "facilities_services",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Bagaimana cara booking laboratorium untuk praktikum atau kegiatan?",
        groundTruth:
            "Cara booking laboratorium: (1) Cek jadwal ketersediaan lab melalui sistem booking online atau papan jadwal di lab, (2) Ajukan permohonan peminjaman minimal 3-7 hari sebelumnya, (3) Isi formulir peminjaman dengan detail kegiatan, jumlah peserta, dan peralatan yang dibutuhkan, (4) Dapatkan persetujuan dari kepala laboratorium atau koordinator lab, (5) Bayar biaya sewa lab jika ada (tergantung keperluan), (6) Patuhi aturan lab: gunakan jas lab, sepatu tertutup, jangan makan/minum, (7) Kembalikan peralatan dalam kondisi bersih dan lapor jika ada kerusakan.",
        category: "facilities_services",
        difficulty: "medium",
        language: "id",
    },

    // Financial Procedures
    {
        question: "Bagaimana cara dan jadwal pembayaran UKT?",
        groundTruth:
            "Cara dan jadwal pembayaran UKT: (1) Cek tagihan UKT di portal mahasiswa atau sistem pembayaran kampus, (2) Bayar melalui bank yang ditunjuk (transfer, teller, ATM, mobile banking), (3) Gunakan nomor virtual account atau kode bayar yang unik untuk setiap mahasiswa, (4) Simpan bukti pembayaran, (5) Pembayaran biasanya dibuka di awal semester (sekitar 2 minggu sebelum perkuliahan dimulai), (6) Deadline umumnya 2-4 minggu setelah semester berjalan, (7) Keterlambatan dikenakan denda sesuai aturan, (8) Mahasiswa yang belum bayar tidak bisa mengisi KRS atau mengikuti ujian.",
        category: "financial_procedures",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Bagaimana prosedur pengajuan keringanan UKT atau cicilan?",
        groundTruth:
            "Prosedur pengajuan keringanan/cicilan UKT: (1) Ajukan permohonan tertulis ke bagian keuangan/kemahasiswaan, (2) Lampirkan dokumen pendukung: slip gaji orang tua, SKTM, kartu keluarga, rekening listrik, bukti kondisi ekonomi, (3) Isi formulir pengajuan keringanan/cicilan, (4) Surat permohonan ditujukan ke rektor melalui dekan, (5) Tunggu proses verifikasi tim (biasanya 1-2 minggu), (6) Jika disetujui, akan mendapat surat keputusan besaran keringanan atau jadwal cicilan, (7) Patuhi jadwal cicilan yang telah ditentukan, (8) Biasanya ada batasan IPK minimal (2.75-3.00) untuk mendapat keringanan.",
        category: "financial_procedures",
        difficulty: "medium",
        language: "id",
    },

    // Admissions and Registration
    {
        question: "Apa saja jalur penerimaan mahasiswa baru yang tersedia?",
        groundTruth:
            "Jalur penerimaan mahasiswa baru umumnya meliputi: (1) SNBP (Seleksi Nasional Berdasarkan Prestasi) - jalur undangan berdasarkan nilai rapor dan prestasi, tanpa tes, (2) SNBT (Seleksi Nasional Berdasarkan Tes) - ujian tertulis nasional berbasis komputer, (3) Jalur Mandiri - seleksi yang diselenggarakan universitas sendiri, bisa melalui tes tertulis, rapor, atau wawancara, (4) Jalur Prestasi - untuk siswa berprestasi akademik/non-akademik (olimpiade, olahraga, seni), (5) Jalur Kerjasama - untuk siswa dari sekolah mitra atau program beasiswa tertentu.",
        category: "admissions_registration",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Apa saja dokumen yang diperlukan saat registrasi ulang mahasiswa baru?",
        groundTruth:
            "Dokumen untuk registrasi ulang mahasiswa baru: (1) Bukti lulus seleksi/surat penerimaan, (2) Ijazah SMA/sederajat asli dan fotokopi, (3) Transkrip nilai/rapor asli dan fotokopi, (4) Kartu Keluarga (KK) dan fotokopi, (5) Akta kelahiran dan fotokopi, (6) KTP/identitas diri dan fotokopi, (7) Pas foto terbaru ukuran 3x4 dan 4x6 (berlatar belakang merah/biru), (8) Bukti pembayaran biaya registrasi/UKT, (9) Surat keterangan sehat dari dokter, (10) Surat pernyataan tidak terlibat narkoba, (11) Formulir pendaftaran yang sudah diisi lengkap.",
        category: "admissions_registration",
        difficulty: "medium",
        language: "id",
    },
];

/**
 * Sample questions for quick testing (subset of ACADEMIC_QUESTIONS)
 */
export const SAMPLE_QUESTIONS_ID: EvaluationQuestion[] = ACADEMIC_QUESTIONS.slice(0, 5);

/**
 * Get questions by category
 */
export function getQuestionsByCategory(category: EvaluationCategory): EvaluationQuestion[] {
    return ACADEMIC_QUESTIONS.filter((q) => q.category === category);
}

/**
 * Get questions by difficulty level
 */
export function getQuestionsByDifficulty(difficulty: "easy" | "medium" | "hard"): EvaluationQuestion[] {
    return ACADEMIC_QUESTIONS.filter((q) => q.difficulty === difficulty);
}

/**
 * Get a random subset of questions for evaluation
 */
export function getRandomQuestions(count: number): EvaluationQuestion[] {
    const shuffled = [...ACADEMIC_QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get all available questions
 */
export function getAllQuestions(): EvaluationQuestion[] {
    return ACADEMIC_QUESTIONS;
}
