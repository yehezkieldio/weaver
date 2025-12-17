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
    relevantChunkIds?: string[]; // Ground truth chunk IDs for retrieval metrics
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
    {
        question: "Bagaimana cara mengisi KRS dan apa saja yang perlu diperhatikan?",
        groundTruth:
            "Pengisian KRS (Kartu Rencana Studi) dilakukan secara daring melalui sistem SIAS (Smart Integrated Academic System). Mahasiswa wajib berkonsultasi dengan Penasehat Akademik (PA). Perubahan mata kuliah dapat dilakukan pada masa KPRS (Kartu Perubahan Rencana Studi) maksimal 2 minggu setelah perkuliahan berlangsung. Jumlah SKS yang diambil harus sesuai dengan ketentuan kurikulum program studi.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "d7fa9e4b-6d11-4741-a897-15803093566a",
            "adb8e7d9-7155-4b0d-b70c-a9e60d8c735b",
            "34ef169b-fee4-4a9a-9cfe-2b32b086bbb6",
        ],
    },
    {
        question: "Apa saja syarat kelulusan untuk program sarjana (S1)?",
        groundTruth:
            "Syarat kelulusan program sarjana (S1) umumnya meliputi: (1) Menyelesaikan beban studi sekitar 144 SKS (tergantung prodi), (2) Menyelesaikan Skripsi/Tugas Akhir, (3) Lulus mata kuliah wajib dan pilihan sesuai kurikulum, (4) Memenuhi persyaratan administrasi dan keuangan. Mahasiswa dinyatakan lulus jika telah mengikuti Yudisium setelah memenuhi semua syarat akademik dan administratif.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "81456428-0a03-494f-aeb1-9d3d157852da",
            "bd0df981-ed1c-49e5-8339-2180cae57a50",
            "fcb702e3-456a-431b-8d93-b9a3371046fb",
        ],
    },
    {
        question: "Bagaimana prosedur cuti akademik?",
        groundTruth:
            "Mahasiswa yang ingin Cuti Akademik harus mengajukan permohonan melalui Dekan untuk mendapatkan izin dari Rektor. Status Cuti Akademik berarti mahasiswa tidak terdaftar pada semester tertentu namun dengan izin resmi. Ketentuan lebih lanjut biasanya diatur dalam kalender akademik dan prosedur administrasi BAAK.",
        category: "administrative_procedures",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "a70aabb5-9ceb-4a4f-81dd-058a7f1fbb6d",
            "921b6853-f970-4421-85ea-95937fa08852",
            "f93e3b3d-a775-4b33-b473-81c986795d48",
        ],
    },
    {
        question: "Apa peran Biro Akademik dan Sistem Informasi?",
        groundTruth:
            "Biro Akademik dan Sistem Informasi dipimpin oleh Kepala Biro yang membawahi tiga bagian: (1) Bagian Akademik (registrasi, penjadwalan, administrasi), (2) Bagian Pusat Sistem dan Teknologi Informasi (sistem informasi, jaringan, keamanan data), dan (3) Bagian Media Kreatif (produksi konten digital, publikasi). Biro ini bertanggung jawab kepada Wakil Rektor Bidang Akademik dan Sistem Informasi.",
        category: "administrative_procedures",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "eb749c3d-1bf9-4f8c-9fe8-e02980a6e7d8",
            "62f65034-6558-4e62-bbd8-17d8ab30efe8",
            "3d87d8c9-3921-47d4-ae86-fe0bd82410db",
        ],
    },
    {
        question: "Apa saja layanan yang ditangani oleh Bagian Sekretariat di Biro Sumber Daya?",
        groundTruth:
            "Bagian Sekretariat di bawah Biro Sumber Daya bertugas menangani persuratan masuk dan keluar, kearsipan dokumen, serta layanan front office.",
        category: "administrative_procedures",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "62f65034-6558-4e62-bbd8-17d8ab30efe8",
            "eb749c3d-1bf9-4f8c-9fe8-e02980a6e7d8",
            "3d87d8c9-3921-47d4-ae86-fe0bd82410db",
        ],
    },
    {
        question: "Apa fungsi Bagian Career Development Center (CDC)?",
        groundTruth:
            "Bagian Career Development Center (CDC), yang berada di bawah Biro Kemahasiswaan dan Alumni, menyediakan layanan pembinaan minat dan bakat, informasi bursa kerja, serta pengembangan karier bagi mahasiswa dan alumni.",
        category: "student_services",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "3d87d8c9-3921-47d4-ae86-fe0bd82410db",
            "988f894a-415d-4a60-9f56-b1bcf7825689",
            "def60385-9a19-4b51-85d2-19474303d6da",
        ],
    },
    {
        question: "Layanan apa yang disediakan oleh Bagian Konseling?",
        groundTruth:
            "Bagian Konseling memberikan layanan bimbingan baik akademik maupun non-akademik untuk mendukung keberhasilan dan kesejahteraan mahasiswa. Bagian ini berada di bawah koordinasi Biro Kemahasiswaan dan Alumni.",
        category: "student_services",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "3d87d8c9-3921-47d4-ae86-fe0bd82410db",
            "6fce8d33-49cc-4a28-aff5-813f1e40e195",
            "eb749c3d-1bf9-4f8c-9fe8-e02980a6e7d8",
        ],
    },
    {
        question: "Apa saja konsentrasi yang tersedia di program studi Sarjana Informatika?",
        groundTruth:
            "Program studi Sarjana Informatika di Universitas Mulia menawarkan dua konsentrasi utama: (1) Robotics and Artificial Intelligence, dan (2) Mobile Application Development.",
        category: "faculty_programs",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "d0e5a32b-7a30-4cbb-8b85-6dc400bcda34",
            "23b3b99e-0e96-4d9d-bce8-599f72916adb",
            "56c826cb-bb31-4903-a8e4-534a17ec7af6",
        ],
    },
    {
        question: "Apa saja prospek karir untuk lulusan S1 Desain Komunikasi Visual?",
        groundTruth:
            "Prospek karir lulusan S1 DKV meliputi: Desainer Grafis, Animator dan Desainer Multimedia, Desainer UX/UI, Art Director, Desainer Interaktif, dan Creative Entrepreneur.",
        category: "faculty_programs",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "77c5761f-687b-4a04-ad98-beb0e7c628c3",
            "251d6e03-d836-4a4d-a89e-df3e24dd8f47",
            "f59e4969-3bb3-41a1-b8a7-47fb3ae0d864",
        ],
    },
    {
        question: "Sertifikasi apa saja yang bisa didapatkan mahasiswa Teknologi Informasi?",
        groundTruth:
            "Mahasiswa S1 Teknologi Informasi berpeluang mendapatkan sertifikasi seperti: BNSP, Cisco (CCNA 1-4, CCNA Security), CHFI (Computer Hacking Forensic Investigator), CEH (Certified Ethical Hacker), Microsoft, Mikrotik MTCNA, dan Oracle.",
        category: "faculty_programs",
        difficulty: "hard",
        language: "id",
        relevantChunkIds: [
            "e7920b3e-a4ca-4828-ac35-826986f99d4b",
            "ddbb54cf-db2e-4815-9b85-eae9d55d77b2",
            "b8dd0ef2-b54a-438e-90f8-3f68b5f1171a",
        ],
    },
    {
        question: "Mata kuliah apa saja yang dipelajari di Semester 1 program S1 Akuntansi?",
        groundTruth:
            "Mata kuliah Semester 1 S1 Akuntansi meliputi: Bahasa Indonesia, Bahasa Inggris Bisnis, Pancasila, Pendidikan Agama, Akuntansi Pengantar I, Bank dan Lembaga Keuangan Lainnya, Hukum Pajak, Matematika Bisnis, Pengantar Ekonomi Mikro, dan Pengantar Manajemen.",
        category: "faculty_programs",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "ba17e9f6-a7f7-465f-9963-e0e55153465a",
            "a2b69ea4-367e-48c6-a9a7-9bf0aad908c7",
            "042c4752-87e5-4761-bc1b-e27394330914",
        ],
    },
    {
        question: "Apa fokus dari konsentrasi Cyber Law pada Prodi S1 Hukum?",
        groundTruth:
            "Konsentrasi Cyber Law mempelajari ilmu hukum yang berhubungan dengan aspek teknologi dan elektronik, termasuk komputer, perangkat lunak, dan sistem informasi. Tujuannya adalah mencegah atau mengurangi kerusakan akibat kejahatan dunia maya (cybercrime) dalam penggunaan internet dan teknologi.",
        category: "faculty_programs",
        difficulty: "hard",
        language: "id",
        relevantChunkIds: [
            "4dba46cd-7757-4f7b-91e8-0ecd9b5f3a81",
            "6acb82c7-aa42-40a5-a9fc-d2297dece253",
            "c68e4316-37ea-47c7-9a5d-f75a0933afdd",
        ],
    },
    {
        question: "Fasilitas apa saja yang tersedia di Laboratorium Multimedia?",
        groundTruth:
            "Laboratorium Multimedia dilengkapi fasilitas komputer yang cukup untuk eksplorasi multimedia seperti video editing, audio editing, desain, dan pembuatan game, sesuai dengan mata kuliah khusus yang diambil.",
        category: "facilities_services",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "ea29574a-c68f-405c-94ab-03e1adbd47d0",
            "2e5a247b-90db-4b69-b519-44d9838256e7",
            "20e4d21f-07c5-46d9-b54a-ede4a25dc8e2",
        ],
    },
    {
        question: "Apa fungsi dari Laboratorium Robotik?",
        groundTruth:
            "Laboratorium Robotik digunakan untuk praktikum khusus, berdiskusi, belajar, dan mempraktekkan ilmu dalam membuat kreasi robot-robot atau alat cerdas.",
        category: "facilities_services",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "2e5a247b-90db-4b69-b519-44d9838256e7",
            "20e4d21f-07c5-46d9-b54a-ede4a25dc8e2",
            "34fa294f-8a2f-4947-8a08-f4684f36b9a0",
        ],
    },
    {
        question: "Bagaimana cara mengakses Wi-Fi kampus?",
        groundTruth:
            "Wi-Fi Kampus tersedia di seluruh bagian kampus dan dapat diakses menggunakan username dan password khusus yang dimiliki oleh setiap mahasiswa.",
        category: "facilities_services",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "0d190fa5-0815-4852-a752-23143eea0049",
            "41546de1-11c6-4923-9a50-99334195f652",
            "4c2339af-9894-426b-8524-51b63c1c3b72",
        ],
    },
    {
        question: "Apa itu 'Mulia Corner'?",
        groundTruth:
            "Mulia Corner adalah salah satu tempat untuk berkumpulnya mahasiswa ('tempat nongkrong') yang didesain secara khusus dan menarik untuk melakukan berbagai hal seperti belajar, makan, dan bersosialisasi.",
        category: "facilities_services",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "d0861a23-206e-4d08-97bb-9fbdd1b283eb",
            "41546de1-11c6-4923-9a50-99334195f652",
            "7d9dbfcf-67c9-4fc2-a520-2a92292b9593",
        ],
    },
    {
        question: "Apa konten yang dipelajari di Laboratorium Jaringan?",
        groundTruth:
            "Laboratorium Jaringan khusus untuk proses belajar mengajar mengenai Jaringan, dengan pokok bahasan menarik seperti CCNA dan Mikrotik. Fasilitas meliputi kabel, switch, dan router.",
        category: "facilities_services",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "ea29574a-c68f-405c-94ab-03e1adbd47d0",
            "31f82eed-50fe-4167-b995-85620e023d36",
            "20e4d21f-07c5-46d9-b54a-ede4a25dc8e2",
        ],
    },
    {
        question: "Bagaimana cara pembayaran biaya kuliah di Universitas Mulia?",
        groundTruth:
            "Pembayaran biaya kuliah dilakukan menggunakan Virtual Account Bank Negara Indonesia (BNI). Nomor Virtual Account dan tagihan dapat dilihat pada menu neraca di sistem informasi akademik mahasiswa (SIAM). Pembayaran dapat dilakukan via ATM BNI, Mobile Banking BNI, iBank Personal, Teller BNI, Agen46, ATM Bersama, ATM Bank lain, atau OVO.",
        category: "financial_procedures",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "d1213ecc-c1b0-4110-ad1c-c755496379dc",
            "33317842-7cf8-4eda-aef0-00b707d13da9",
            "a426d083-ce62-405d-a808-06bc7243247d",
        ],
    },
    {
        question: "Dimana mahasiswa bisa melihat tagihan yang harus dibayarkan?",
        groundTruth:
            "Mahasiswa dapat melihat tagihan yang harus dibayarkan pada menu neraca di sistem informasi akademik mahasiswa (SIAM).",
        category: "financial_procedures",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "33317842-7cf8-4eda-aef0-00b707d13da9",
            "d1213ecc-c1b0-4110-ad1c-c755496379dc",
            "0e087488-ce80-4c0c-be59-4a010b97f0f3",
        ],
    },
    {
        question: "Bagaimana alur pendaftaran calon mahasiswa baru?",
        groundTruth:
            "Alur pendaftaran: (1) Mengisi Formulir Pendaftaran di website SIAS untuk mendapatkan username dan password (dikirim via WA/Email), (2) Login menggunakan username dan password tersebut, (3) Melakukan tes online. Hasil dapat dilihat setelah validasi admin.",
        category: "admissions_registration",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "432e354a-39a4-46a2-86e5-81932cb29318",
            "38e7cf47-85e0-418c-8fa7-140a855c4ebc",
            "0d190fa5-0815-4852-a752-23143eea0049",
        ],
    },
    {
        question: "Apa syarat untuk menjadi mahasiswa baru yang sah?",
        groundTruth:
            "Calon mahasiswa dinyatakan sah apabila: (1) Lulus seleksi, (2) Melakukan registrasi ulang, (3) Membayar Uang Kuliah Tunggal (UKT), dan (4) Melengkapi persyaratan administrasi yang ditetapkan panitia penerimaan.",
        category: "admissions_registration",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "bb9a4eb3-1871-4c97-9db2-358d9979f330",
            "34ef169b-fee4-4a9a-9cfe-2b32b086bbb6",
            "ae3f344c-4b02-4c73-aa29-cf804775a20f",
        ],
    },
    {
        question: "Siapa Rektor Universitas Mulia saat ini?",
        groundTruth: "Rektor Universitas Mulia adalah Prof. Dr. Ir. Muhammad Ahsin Rifa’i, M.Si.",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "29334c70-40ca-4734-8c71-320044132635",
            "9346c433-f48a-48c9-9866-5ca15340ba6b",
            "726d61bb-b1c0-49f6-8168-f0015565c917",
        ],
    },
    {
        question: "Apa visi Universitas Mulia tahun 2045?",
        groundTruth:
            "Visi Universitas Mulia adalah menjadi perguruan tinggi yang unggul dan berwawasan global di bidang Technopreneurship pada tahun 2045.",
        category: "general_university_info",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "14ef7ae0-4e1b-45b0-9f8c-a40af6e0dd4f",
            "726d61bb-b1c0-49f6-8168-f0015565c917",
            "559248ae-4f95-44ca-915d-78a8e6290e84",
        ],
    },
    {
        question: "Apa saja tahapan dalam Roadmap Universitas Mulia?",
        groundTruth:
            "Roadmap Universitas Mulia terdiri dari 5 tahapan: (1) Teaching University (2019-2023), (2) Research & Innovation University (2024-2028), (3) National Technopreneur Campus (2029-2033), (4) Regional Technopreneur Campus (2034-2038), dan (5) Global Technopreneur Campus (2039-2043).",
        category: "general_university_info",
        difficulty: "hard",
        language: "id",
        relevantChunkIds: [
            "0554459d-4cf9-458c-99dd-2c2a38e89f79",
            "cf3b426c-7e87-46f2-aa3d-0b3dda0da983",
            "7e65b834-34b6-45ad-af01-5b726bdfa1cc",
        ],
    },
    {
        question: "Apa status akreditasi Program Studi Informatika?",
        groundTruth: "Program Studi S1 Informatika telah mendapatkan akreditasi 'Baik Sekali' oleh BAN-PT.",
        category: "general_university_info",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "123d374c-cd93-44a5-b235-987680b01601",
            "fe4e231c-1449-4dad-a761-31f9423b8351",
            "5715a95f-5de5-435d-9a28-99a3c759b320",
        ],
    },
    {
        question: "Dimana lokasi Kampus Universitas Mulia?",
        groundTruth:
            "Kampus Utama terletak di Balikpapan (Jl. Letjen Z.A. Maulani No. 9), dan Kampus PSDKU terletak di Samarinda (Jl. Pahlawan No. 2A).",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "1a74f178-a478-467f-ad8a-28576660c067",
            "82edcad3-965f-44c6-b94b-be9634f04e8b",
            "4bf813f6-18cb-46e1-a5e4-3e85091ad6c7",
        ],
    },
    {
        question: "Apa saja fakultas yang ada di Universitas Mulia?",
        groundTruth:
            "Universitas Mulia memiliki tiga fakultas utama: Fakultas Ilmu Komputer, Fakultas Ekonomi dan Bisnis, dan Fakultas Humaniora dan Kesehatan.",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "fe4e231c-1449-4dad-a761-31f9423b8351",
            "23b3b99e-0e96-4d9d-bce8-599f72916adb",
            "56c826cb-bb31-4903-a8e4-534a17ec7af6",
        ],
    },
    {
        question: "Apa misi Universitas Mulia terkait tata kelola?",
        groundTruth:
            "Mewujudkan tata kelola perguruan tinggi yang akuntabel dan transparan sesuai dengan Good University Governance (GUG) berstandar internasional.",
        category: "general_university_info",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "9186e931-ff9c-4ea6-9b59-e459695d7fe4",
            "a3a32b7a-730f-40a4-a1b6-b1e1202dda0d",
            "bc910f76-8501-4c1d-aecd-29b61409def4",
        ],
    },
    {
        question: "Apa fasilitas yang disediakan oleh Laboratorium Farmasi?",
        groundTruth:
            "Laboratorium Farmasi menyediakan alat-alat khusus untuk praktikum program studi Farmasi, memungkinkan mahasiswa melakukan praktikum dan menyalurkan bakat serta minat di bidang kefarmasian.",
        category: "facilities_services",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "bb30b182-0c1a-4d89-94e2-990e02d88c8c",
            "20e4d21f-07c5-46d9-b54a-ede4a25dc8e2",
            "2292217b-e955-4780-bb24-20c46151761c",
        ],
    },
    {
        question: "Apa syarat kehadiran minimal agar mahasiswa diperbolehkan mengikuti ujian?",
        groundTruth:
            "Mahasiswa wajib mengikuti perkuliahan minimal 80% dari jumlah tatap muka atau proses pembelajaran efektif selama semester tersebut untuk dapat mengikuti ujian.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "589323f8-a4f0-4cb5-ab7b-640dee17fa2f",
            "226d2bca-24ba-4246-afba-de02f1c98f8d",
            "79890207-48bb-42fc-874b-33b19e037a65",
        ],
    },
    {
        question: "Apa sanksi yang dapat diberikan kepada mahasiswa yang melakukan plagiat?",
        groundTruth:
            "Mahasiswa yang terbukti melakukan plagiat dilarang keras dan dapat dikenakan sanksi mulai dari teguran hingga diberhentikan (Drop Out) sebagai mahasiswa, sesuai dengan tingkat pelanggaran yang diatur dalam Tata Tertib Kehidupan Kampus.",
        category: "academic_regulations",
        difficulty: "hard",
        language: "id",
        relevantChunkIds: [
            "e20faccf-582d-4dd7-9fa2-50e63755095a",
            "93cd03f2-38b9-45fc-962c-1c97db945c4c",
            "9acbd253-c7d1-4d23-af3d-2c81156e73dd",
        ],
    },
    {
        question: "Apa yang dimaksud dengan status mahasiswa 'Non-Aktif'?",
        groundTruth:
            "Mahasiswa Non-Aktif adalah mahasiswa yang tidak terdaftar pada semester tertentu tanpa izin Rektor, berbeda dengan Cuti Akademik yang memiliki izin resmi.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "270e388f-8df3-4da5-9870-13d902a11a8a",
            "0e25ab33-0e3f-4508-b22d-ab3352fab87b",
            "f93e3b3d-a775-4b33-b473-81c986795d48",
        ],
    },
    {
        question: "Apa dua jenis penelitian yang dapat dipilih mahasiswa untuk penyusunan Skripsi?",
        groundTruth:
            "Mahasiswa dapat memilih antara Penelitian Dasar (pengembangan ilmu pengetahuan/teori) atau Penelitian Terapan (solusi praktis/pemecahan masalah).",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "4bfbdf58-3d2b-4428-b4d0-8b843c02b2d6",
            "d91c54d4-b164-4155-a629-3d0fae2ed346",
            "8c98cb7a-7255-4e98-98b6-d3a909ab9713",
        ],
    },
    {
        question: "Apa gelar akademik yang diperoleh lulusan Program Studi S1 Manajemen?",
        groundTruth: "Lulusan Program Studi S1 Manajemen berhak menyandang gelar Sarjana Manajemen (S.M.).",
        category: "faculty_programs",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "e584aa97-76da-44f6-91cd-0b7fc683393e",
            "fedc8695-b1f6-462d-afbd-5a471957a794",
            "8cf0fb7f-62b3-4378-9ae0-ce6cc561ee56",
        ],
    },
    {
        question: "Siapa Direktur Eksekutif Yayasan Airlangga?",
        groundTruth: "Direktur Eksekutif Yayasan Airlangga adalah Dr. Agung Sakti Pribadi, S.H., M.H.",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "29334c70-40ca-4734-8c71-320044132635",
            "9346c433-f48a-48c9-9866-5ca15340ba6b",
            "ded5f254-f345-41f3-90b2-3ee598cd5c41",
        ],
    },
    {
        question: "Berapa Indeks Prestasi Kumulatif (IPK) minimal untuk dapat mengajukan judul Skripsi?",
        groundTruth: "Mahasiswa harus memiliki IPK minimal 2,00 untuk dapat mengajukan usulan judul Skripsi.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "06e077cc-e33a-406e-8e61-520010c3436d",
            "8e7c4351-5296-422d-8f46-33d9a881e643",
            "d10727ca-2316-47fe-b76f-aec5fcb0417b",
        ],
    },
    {
        question: "Fasilitas digital apa saja yang didapatkan mahasiswa melalui Akun Universitas?",
        groundTruth:
            "Setiap mahasiswa mendapatkan Akun Universitas yang memberikan akses ke fasilitas seperti Unlimited G-Drive, Google Meet, dan Google Classroom untuk menunjang pembelajaran.",
        category: "facilities_services",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "0d190fa5-0815-4852-a752-23143eea0049",
            "41546de1-11c6-4923-9a50-99334195f652",
            "2e5a247b-90db-4b69-b519-44d9838256e7",
        ],
    },
    {
        question: "Kapan tanggal resmi berdirinya Universitas Mulia?",
        groundTruth:
            "Universitas Mulia resmi berdiri pada tanggal 18 Desember 2018, berdasarkan SK Pendirian Nomor 1149/KPT/I/2018.",
        category: "general_university_info",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "02063ca9-968c-4f5e-b236-f82c29e22028",
            "fb41ed8b-8420-42df-9cef-b1bf83ec6829",
            "f7490172-4da0-4843-bcbd-3c3acc1b4c8c",
        ],
    },
    {
        question: "Berapa rata-rata masa studi untuk jenjang Diploma 3 (D3) di Universitas Mulia?",
        groundTruth: "Rata-rata masa studi untuk jenjang Diploma 3 (D3) adalah 2,8 tahun.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "a373e970-63c4-4141-bb1f-bf271bd77f14",
            "643e54bf-97d2-4ac2-8879-37430056a5f1",
            "3112b467-d0b9-41f3-9b5a-2455b1e5bf2a",
        ],
    },
    {
        question: "Apa status akreditasi Program Studi S1 Farmasi?",
        groundTruth: "Program Studi S1 Farmasi telah terakreditasi 'Baik' oleh LAM-PTKes.",
        category: "general_university_info",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "5715a95f-5de5-435d-9a28-99a3c759b320",
            "3e14d974-29c5-4842-8119-3ca057ccd37f",
            "a2d29bce-85cc-4b8e-9975-431b20de30d9",
        ],
    },
    {
        question: "Apa tugas utama Bagian Kerja Sama dan Humas?",
        groundTruth:
            "Bagian Kerja Sama dan Humas bertugas membangun jejaring kemitraan dengan mitra nasional maupun internasional, serta mengelola kehumasan dan keprotokolan universitas.",
        category: "administrative_procedures",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "4d80dc0b-ffd2-49a9-89bb-ef27a740066b",
            "f36ac7f5-8723-4c15-bd70-95c8f433d353",
            "379e6c21-db85-4227-ad3a-000ce4b15fac",
        ],
    },
    {
        question: "Apa ketentuan mengenai Semester Pendek?",
        groundTruth:
            "Semester Pendek diselenggarakan di antara semester genap dan ganjil (biasanya untuk perbaikan nilai) dengan beban belajar maksimal 9 SKS dan pelaksanaan minimal 16 kali pertemuan.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "130e380d-cafa-4e5e-9b55-b2a6a5aac05a",
            "53a9471e-7855-460d-995a-d000e78decf8",
            "5385ca92-6eb9-4566-8abc-7cd1ea21cde0",
        ],
    },
    {
        question: "Program studi apa saja yang diselenggarakan di Kampus PSDKU Samarinda?",
        groundTruth:
            "Kampus PSDKU Samarinda menyelenggarakan Program Studi S1 Sistem Informasi dan D3 Manajemen Informatika.",
        category: "faculty_programs",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "23b3b99e-0e96-4d9d-bce8-599f72916adb",
            "e667bfe9-3d89-46e1-b091-452097362098",
            "79df4893-ee51-40b8-8fac-d1d52585f631",
        ],
    },
    {
        question: "Bagaimana aturan pengerjaan Skripsi secara berkelompok?",
        groundTruth:
            "Skripsi berkelompok dapat dikerjakan oleh maksimal 3 orang mahasiswa dari prodi yang sama. Skema ini hanya diperbolehkan untuk Penelitian Terapan, dan setiap anggota memiliki tanggung jawab yang sama.",
        category: "academic_regulations",
        difficulty: "hard",
        language: "id",
        relevantChunkIds: [
            "9405c0b1-212d-4505-87bc-9753eb3fbc9a",
            "c4b90997-b4e0-429a-b8a3-52c72f4f7c61",
            "ecd9ff4d-8a31-419d-84d6-249bfddf463d",
        ],
    },
    {
        question: "Apa motto Universitas Mulia?",
        groundTruth: "Motto Universitas Mulia adalah 'Global Technopreneur Campus: Inovatif, Mandiri, Humanis'.",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "1f79e456-b8a8-4119-af70-f589ea63e1ea",
            "c39ede11-386d-4220-9492-4a3a9b20ce64",
            "e9a686d2-8bae-49b7-98d7-91dccab2e3d0",
        ],
    },
    {
        question: "Apa fungsi dari Ruang Peradilan Semu?",
        groundTruth:
            "Ruang Peradilan Semu adalah fasilitas yang didesain menyerupai ruang pengadilan asli, digunakan untuk melatih mahasiswa Prodi Hukum dalam praktik simulasi persidangan.",
        category: "facilities_services",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "bb30b182-0c1a-4d89-94e2-990e02d88c8c",
            "20e4d21f-07c5-46d9-b54a-ede4a25dc8e2",
            "e529107a-2887-4895-b9e0-7b231575fe11",
        ],
    },
    {
        question: "Apa tanggung jawab Bagian Kemahasiswaan dan Alumni?",
        groundTruth:
            "Bagian Kemahasiswaan dan Alumni bertanggung jawab mendampingi kegiatan mahasiswa, mengelola administrasi kemahasiswaan, serta memfasilitasi kegiatan dan jejaring alumni.",
        category: "student_services",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "3d87d8c9-3921-47d4-ae86-fe0bd82410db",
            "9d4f67a2-0c51-4934-bb46-00db00105883",
            "547cd6dd-d6b6-4374-a159-ed6784b05cbc",
        ],
    },
    {
        question: "Apa saja konsentrasi yang ditawarkan di Program Studi S1 Hukum?",
        groundTruth:
            "Program Studi S1 Hukum menawarkan dua konsentrasi: (1) Cyber Law (Hukum Siber) dan (2) Business Law (Hukum Bisnis).",
        category: "faculty_programs",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "4dba46cd-7757-4f7b-91e8-0ecd9b5f3a81",
            "6acb82c7-aa42-40a5-a9fc-d2297dece253",
            "6ad65b5e-7d9c-4ab4-bfb4-62727b7917f8",
        ],
    },
    {
        question: "Apa itu STDC dan apa fungsinya?",
        groundTruth:
            "STDC (Student Technopreneur Development Center) adalah badan/organisasi yang bertugas membina organisasi kemahasiswaan (HMJ dan UKM) dalam rangka pengembangan aktivitas organisasi.",
        category: "general_university_info",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "988f894a-415d-4a60-9f56-b1bcf7825689",
            "e0849ed4-db06-4591-9bda-90ea94ef012d",
            "b8e2ce59-cc28-4466-bfb3-f33667da75c7",
        ],
    },
    {
        question: "Siapa Dekan Fakultas Ilmu Komputer (FIKOM) saat ini?",
        groundTruth: "Dekan Fakultas Ilmu Komputer (FIKOM) adalah Djumhadi, S.T., M.Kom.",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "3f892370-1c6e-4f39-b908-a52075d6a8c5",
            "4d47ff88-94ef-404b-8050-f3b90019b8a6",
            "23b3b99e-0e96-4d9d-bce8-599f72916adb",
        ],
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
