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
            "Pengisian KRS (Kartu Rencana Studi) dilakukan secara daring melalui sistem SIAS (Smart Integrated Academic System). Mahasiswa wajib berkonsultasi dengan Penasehat Akademik (PA). Perubahan mata kuliah dapat dilakukan pada masa KPRS (Kartu Perubahan Rencana Studi) maksimal 2 minggu setelah perkuliahan berlangsung. Jumlah SKS yang diambil harus sesuai dengan ketentuan kurikulum program studi.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa saja syarat kelulusan untuk program sarjana (S1)?",
        groundTruth:
            "Syarat kelulusan program sarjana (S1) umumnya meliputi: (1) Menyelesaikan beban studi sekitar 144 SKS (tergantung prodi), (2) Menyelesaikan Skripsi/Tugas Akhir, (3) Lulus mata kuliah wajib dan pilihan sesuai kurikulum, (4) Memenuhi persyaratan administrasi dan keuangan. Mahasiswa dinyatakan lulus jika telah mengikuti Yudisium setelah memenuhi semua syarat akademik dan administratif.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Bagaimana prosedur cuti akademik?",
        groundTruth:
            "Mahasiswa yang ingin Cuti Akademik harus mengajukan permohonan melalui Dekan untuk mendapatkan izin dari Rektor. Status Cuti Akademik berarti mahasiswa tidak terdaftar pada semester tertentu namun dengan izin resmi. Ketentuan lebih lanjut biasanya diatur dalam kalender akademik dan prosedur administrasi BAAK.",
        category: "administrative_procedures",
        difficulty: "medium",
        language: "id",
    },

    // Administrative Procedures
    {
        question: "Apa peran Biro Akademik dan Sistem Informasi?",
        groundTruth:
            "Biro Akademik dan Sistem Informasi dipimpin oleh Kepala Biro yang membawahi tiga bagian: (1) Bagian Akademik (registrasi, penjadwalan, administrasi), (2) Bagian Pusat Sistem dan Teknologi Informasi (sistem informasi, jaringan, keamanan data), dan (3) Bagian Media Kreatif (produksi konten digital, publikasi). Biro ini bertanggung jawab kepada Wakil Rektor Bidang Akademik dan Sistem Informasi.",
        category: "administrative_procedures",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa saja layanan yang ditangani oleh Bagian Sekretariat di Biro Sumber Daya?",
        groundTruth:
            "Bagian Sekretariat di bawah Biro Sumber Daya bertugas menangani persuratan masuk dan keluar, kearsipan dokumen, serta layanan front office.",
        category: "administrative_procedures",
        difficulty: "easy",
        language: "id",
    },

    // Student Services
    {
        question: "Apa fungsi Bagian Career Development Center (CDC)?",
        groundTruth:
            "Bagian Career Development Center (CDC), yang berada di bawah Biro Kemahasiswaan dan Alumni, menyediakan layanan pembinaan minat dan bakat, informasi bursa kerja, serta pengembangan karier bagi mahasiswa dan alumni.",
        category: "student_services",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Layanan apa yang disediakan oleh Bagian Konseling?",
        groundTruth:
            "Bagian Konseling memberikan layanan bimbingan baik akademik maupun non-akademik untuk mendukung keberhasilan dan kesejahteraan mahasiswa. Bagian ini berada di bawah koordinasi Biro Kemahasiswaan dan Alumni.",
        category: "student_services",
        difficulty: "easy",
        language: "id",
    },

    // Faculty and Programs
    {
        question: "Apa saja konsentrasi yang tersedia di program studi Sarjana Informatika?",
        groundTruth:
            "Program studi Sarjana Informatika di Universitas Mulia menawarkan dua konsentrasi utama: (1) Robotics and Artificial Intelligence, dan (2) Mobile Application Development.",
        category: "faculty_programs",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa saja prospek karir untuk lulusan S1 Desain Komunikasi Visual?",
        groundTruth:
            "Prospek karir lulusan S1 DKV meliputi: Desainer Grafis, Animator dan Desainer Multimedia, Desainer UX/UI, Art Director, Desainer Interaktif, dan Creative Entrepreneur.",
        category: "faculty_programs",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Sertifikasi apa saja yang bisa didapatkan mahasiswa Teknologi Informasi?",
        groundTruth:
            "Mahasiswa S1 Teknologi Informasi berpeluang mendapatkan sertifikasi seperti: BNSP, Cisco (CCNA 1-4, CCNA Security), CHFI (Computer Hacking Forensic Investigator), CEH (Certified Ethical Hacker), Microsoft, Mikrotik MTCNA, dan Oracle.",
        category: "faculty_programs",
        difficulty: "hard",
        language: "id",
    },
    {
        question: "Mata kuliah apa saja yang dipelajari di Semester 1 program S1 Akuntansi?",
        groundTruth:
            "Mata kuliah Semester 1 S1 Akuntansi meliputi: Bahasa Indonesia, Bahasa Inggris Bisnis, Pancasila, Pendidikan Agama, Akuntansi Pengantar I, Bank dan Lembaga Keuangan Lainnya, Hukum Pajak, Matematika Bisnis, Pengantar Ekonomi Mikro, dan Pengantar Manajemen.",
        category: "faculty_programs",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa fokus dari konsentrasi Cyber Law pada Prodi S1 Hukum?",
        groundTruth:
            "Konsentrasi Cyber Law mempelajari ilmu hukum yang berhubungan dengan aspek teknologi dan elektronik, termasuk komputer, perangkat lunak, dan sistem informasi. Tujuannya adalah mencegah atau mengurangi kerusakan akibat kejahatan dunia maya (cybercrime) dalam penggunaan internet dan teknologi.",
        category: "faculty_programs",
        difficulty: "hard",
        language: "id",
    },

    // Facilities and Services
    {
        question: "Fasilitas apa saja yang tersedia di Laboratorium Multimedia?",
        groundTruth:
            "Laboratorium Multimedia dilengkapi fasilitas komputer yang cukup untuk eksplorasi multimedia seperti video editing, audio editing, desain, dan pembuatan game, sesuai dengan mata kuliah khusus yang diambil.",
        category: "facilities_services",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Apa fungsi dari Laboratorium Robotik?",
        groundTruth:
            "Laboratorium Robotik digunakan untuk praktikum khusus, berdiskusi, belajar, dan mempraktekkan ilmu dalam membuat kreasi robot-robot atau alat cerdas.",
        category: "facilities_services",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Bagaimana cara mengakses Wi-Fi kampus?",
        groundTruth:
            "Wi-Fi Kampus tersedia di seluruh bagian kampus dan dapat diakses menggunakan username dan password khusus yang dimiliki oleh setiap mahasiswa.",
        category: "facilities_services",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Apa itu 'Mulia Corner'?",
        groundTruth:
            "Mulia Corner adalah salah satu tempat untuk berkumpulnya mahasiswa ('tempat nongkrong') yang didesain secara khusus dan menarik untuk melakukan berbagai hal seperti belajar, makan, dan bersosialisasi.",
        category: "facilities_services",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Apa konten yang dipelajari di Laboratorium Jaringan?",
        groundTruth:
            "Laboratorium Jaringan khusus untuk proses belajar mengajar mengenai Jaringan, dengan pokok bahasan menarik seperti CCNA dan Mikrotik. Fasilitas meliputi kabel, switch, dan router.",
        category: "facilities_services",
        difficulty: "medium",
        language: "id",
    },

    // Financial Procedures
    {
        question: "Bagaimana cara pembayaran biaya kuliah di Universitas Mulia?",
        groundTruth:
            "Pembayaran biaya kuliah dilakukan menggunakan Virtual Account Bank Negara Indonesia (BNI). Nomor Virtual Account dan tagihan dapat dilihat pada menu neraca di sistem informasi akademik mahasiswa (SIAM). Pembayaran dapat dilakukan via ATM BNI, Mobile Banking BNI, iBank Personal, Teller BNI, Agen46, ATM Bersama, ATM Bank lain, atau OVO.",
        category: "financial_procedures",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Dimana mahasiswa bisa melihat tagihan yang harus dibayarkan?",
        groundTruth:
            "Mahasiswa dapat melihat tagihan yang harus dibayarkan pada menu neraca di sistem informasi akademik mahasiswa (SIAM).",
        category: "financial_procedures",
        difficulty: "easy",
        language: "id",
    },

    // Admissions and Registration
    {
        question: "Bagaimana alur pendaftaran calon mahasiswa baru?",
        groundTruth:
            "Alur pendaftaran: (1) Mengisi Formulir Pendaftaran di website SIAS untuk mendapatkan username dan password (dikirim via WA/Email), (2) Login menggunakan username dan password tersebut, (3) Melakukan tes online. Hasil dapat dilihat setelah validasi admin.",
        category: "admissions_registration",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa syarat untuk menjadi mahasiswa baru yang sah?",
        groundTruth:
            "Calon mahasiswa dinyatakan sah apabila: (1) Lulus seleksi, (2) Melakukan registrasi ulang, (3) Membayar Uang Kuliah Tunggal (UKT), dan (4) Melengkapi persyaratan administrasi yang ditetapkan panitia penerimaan.",
        category: "admissions_registration",
        difficulty: "medium",
        language: "id",
    },

    // General Info & Accreditation
    {
        question: "Siapa Rektor Universitas Mulia saat ini?",
        groundTruth: "Rektor Universitas Mulia adalah Prof. Dr. Ir. Muhammad Ahsin Rifa’i, M.Si.",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Apa visi Universitas Mulia tahun 2045?",
        groundTruth:
            "Visi Universitas Mulia adalah menjadi perguruan tinggi yang unggul dan berwawasan global di bidang Technopreneurship pada tahun 2045.",
        category: "general_university_info",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa saja tahapan dalam Roadmap Universitas Mulia?",
        groundTruth:
            "Roadmap Universitas Mulia terdiri dari 5 tahapan: (1) Teaching University (2019-2023), (2) Research & Innovation University (2024-2028), (3) National Technopreneur Campus (2029-2033), (4) Regional Technopreneur Campus (2034-2038), dan (5) Global Technopreneur Campus (2039-2043).",
        category: "general_university_info",
        difficulty: "hard",
        language: "id",
    },
    {
        question: "Apa status akreditasi Program Studi Informatika?",
        groundTruth: "Program Studi S1 Informatika telah mendapatkan akreditasi 'Baik Sekali' oleh BAN-PT.",
        category: "general_university_info",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Dimana lokasi Kampus Universitas Mulia?",
        groundTruth:
            "Kampus Utama terletak di Balikpapan (Jl. Letjen Z.A. Maulani No. 9), dan Kampus PSDKU terletak di Samarinda (Jl. Pahlawan No. 2A).",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Apa saja fakultas yang ada di Universitas Mulia?",
        groundTruth:
            "Universitas Mulia memiliki tiga fakultas utama: Fakultas Ilmu Komputer, Fakultas Ekonomi dan Bisnis, dan Fakultas Humaniora dan Kesehatan.",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Apa misi Universitas Mulia terkait tata kelola?",
        groundTruth:
            "Mewujudkan tata kelola perguruan tinggi yang akuntabel dan transparan sesuai dengan Good University Governance (GUG) berstandar internasional.",
        category: "general_university_info",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa fasilitas yang disediakan oleh Laboratorium Farmasi?",
        groundTruth:
            "Laboratorium Farmasi menyediakan alat-alat khusus untuk praktikum program studi Farmasi, memungkinkan mahasiswa melakukan praktikum dan menyalurkan bakat serta minat di bidang kefarmasian.",
        category: "facilities_services",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Apa syarat kehadiran minimal agar mahasiswa diperbolehkan mengikuti ujian?",
        groundTruth:
            "Mahasiswa wajib mengikuti perkuliahan minimal 80% dari jumlah tatap muka atau proses pembelajaran efektif selama semester tersebut untuk dapat mengikuti ujian.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa sanksi yang dapat diberikan kepada mahasiswa yang melakukan plagiat?",
        groundTruth:
            "Mahasiswa yang terbukti melakukan plagiat dilarang keras dan dapat dikenakan sanksi mulai dari teguran hingga diberhentikan (Drop Out) sebagai mahasiswa, sesuai dengan tingkat pelanggaran yang diatur dalam Tata Tertib Kehidupan Kampus.",
        category: "academic_regulations",
        difficulty: "hard",
        language: "id",
    },
    {
        question: "Apa yang dimaksud dengan status mahasiswa 'Non-Aktif'?",
        groundTruth:
            "Mahasiswa Non-Aktif adalah mahasiswa yang tidak terdaftar pada semester tertentu tanpa izin Rektor, berbeda dengan Cuti Akademik yang memiliki izin resmi.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa dua jenis penelitian yang dapat dipilih mahasiswa untuk penyusunan Skripsi?",
        groundTruth:
            "Mahasiswa dapat memilih antara Penelitian Dasar (pengembangan ilmu pengetahuan/teori) atau Penelitian Terapan (solusi praktis/pemecahan masalah).",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa gelar akademik yang diperoleh lulusan Program Studi S1 Manajemen?",
        groundTruth: "Lulusan Program Studi S1 Manajemen berhak menyandang gelar Sarjana Manajemen (S.M.).",
        category: "faculty_programs",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Siapa Direktur Eksekutif Yayasan Airlangga?",
        groundTruth: "Direktur Eksekutif Yayasan Airlangga adalah Dr. Agung Sakti Pribadi, S.H., M.H.",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Berapa Indeks Prestasi Kumulatif (IPK) minimal untuk dapat mengajukan judul Skripsi?",
        groundTruth: "Mahasiswa harus memiliki IPK minimal 2,00 untuk dapat mengajukan usulan judul Skripsi.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Fasilitas digital apa saja yang didapatkan mahasiswa melalui Akun Universitas?",
        groundTruth:
            "Setiap mahasiswa mendapatkan Akun Universitas yang memberikan akses ke fasilitas seperti Unlimited G-Drive, Google Meet, dan Google Classroom untuk menunjang pembelajaran.",
        category: "facilities_services",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Kapan tanggal resmi berdirinya Universitas Mulia?",
        groundTruth:
            "Universitas Mulia resmi berdiri pada tanggal 18 Desember 2018, berdasarkan SK Pendirian Nomor 1149/KPT/I/2018.",
        category: "general_university_info",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Berapa rata-rata masa studi untuk jenjang Diploma 3 (D3) di Universitas Mulia?",
        groundTruth: "Rata-rata masa studi untuk jenjang Diploma 3 (D3) adalah 2,8 tahun.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa status akreditasi Program Studi S1 Farmasi?",
        groundTruth: "Program Studi S1 Farmasi telah terakreditasi 'Baik' oleh LAM-PTKes.",
        category: "general_university_info",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa tugas utama Bagian Kerja Sama dan Humas?",
        groundTruth:
            "Bagian Kerja Sama dan Humas bertugas membangun jejaring kemitraan dengan mitra nasional maupun internasional, serta mengelola kehumasan dan keprotokolan universitas.",
        category: "administrative_procedures",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa ketentuan mengenai Semester Pendek?",
        groundTruth:
            "Semester Pendek diselenggarakan di antara semester genap dan ganjil (biasanya untuk perbaikan nilai) dengan beban belajar maksimal 9 SKS dan pelaksanaan minimal 16 kali pertemuan.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Program studi apa saja yang diselenggarakan di Kampus PSDKU Samarinda?",
        groundTruth:
            "Kampus PSDKU Samarinda menyelenggarakan Program Studi S1 Sistem Informasi dan D3 Manajemen Informatika.",
        category: "faculty_programs",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Bagaimana aturan pengerjaan Skripsi secara berkelompok?",
        groundTruth:
            "Skripsi berkelompok dapat dikerjakan oleh maksimal 3 orang mahasiswa dari prodi yang sama. Skema ini hanya diperbolehkan untuk Penelitian Terapan, dan setiap anggota memiliki tanggung jawab yang sama.",
        category: "academic_regulations",
        difficulty: "hard",
        language: "id",
    },
    {
        question: "Apa motto Universitas Mulia?",
        groundTruth: "Motto Universitas Mulia adalah 'Global Technopreneur Campus: Inovatif, Mandiri, Humanis'.",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Apa fungsi dari Ruang Peradilan Semu?",
        groundTruth:
            "Ruang Peradilan Semu adalah fasilitas yang didesain menyerupai ruang pengadilan asli, digunakan untuk melatih mahasiswa Prodi Hukum dalam praktik simulasi persidangan.",
        category: "facilities_services",
        difficulty: "easy",
        language: "id",
    },
    {
        question: "Apa tanggung jawab Bagian Kemahasiswaan dan Alumni?",
        groundTruth:
            "Bagian Kemahasiswaan dan Alumni bertanggung jawab mendampingi kegiatan mahasiswa, mengelola administrasi kemahasiswaan, serta memfasilitasi kegiatan dan jejaring alumni.",
        category: "student_services",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa saja konsentrasi yang ditawarkan di Program Studi S1 Hukum?",
        groundTruth:
            "Program Studi S1 Hukum menawarkan dua konsentrasi: (1) Cyber Law (Hukum Siber) dan (2) Business Law (Hukum Bisnis).",
        category: "faculty_programs",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Apa itu STDC dan apa fungsinya?",
        groundTruth:
            "STDC (Student Technopreneur Development Center) adalah badan/organisasi yang bertugas membina organisasi kemahasiswaan (HMJ dan UKM) dalam rangka pengembangan aktivitas organisasi.",
        category: "general_university_info",
        difficulty: "medium",
        language: "id",
    },
    {
        question: "Siapa Dekan Fakultas Ilmu Komputer (FIKOM) saat ini?",
        groundTruth: "Dekan Fakultas Ilmu Komputer (FIKOM) adalah Djumhadi, S.T., M.Kom.",
        category: "general_university_info",
        difficulty: "easy",
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

/**
 *Get total number of predefined questions
 */
export function getQuestionCount(): number {
    return ACADEMIC_QUESTIONS.length;
}
