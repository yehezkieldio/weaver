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
            "18193a76-a679-45f3-883d-43403e5e1d76",
            "e22ca8ee-f47c-4c48-865e-f1fefa125bff",
            "5cf230ab-dbf2-42a0-a469-d29d067ffb95",
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
            "1350b3d7-009f-4e24-bacb-ab1c299de364",
            "0f903b35-487c-493f-b208-a7632d387b58",
            "426926af-51dc-4103-8da5-818730694450",
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
            "6a5e7a49-4717-47d8-bedd-77ee2aef784e",
            "fa16e6db-5448-4961-a6c2-451e24e79231",
            "e784b190-fbfe-407b-b8ab-a77865f16828",
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
            "c97681df-8046-4369-8c17-427c63cb99bf",
            "284bbca2-0836-440d-9295-196bf108f07f",
            "7eed7ac7-be26-4e2b-bdee-50b1f72f29df",
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
            "284bbca2-0836-440d-9295-196bf108f07f",
            "0a015bf0-db07-4a98-b535-cac8032156c9",
            "c97681df-8046-4369-8c17-427c63cb99bf",
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
            "7eed7ac7-be26-4e2b-bdee-50b1f72f29df",
            "40184998-147c-44d0-bfed-3081251f0035",
            "97ce3ae6-efd3-4502-960d-95fd70e87635",
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
            "7eed7ac7-be26-4e2b-bdee-50b1f72f29df",
            "c8bbc8de-16cc-4881-a648-f7583311ee22",
            "5ed878e9-9205-4331-8674-1436bd304a22",
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
            "173bec65-4635-4816-afb5-ee720f95b4f2",
            "f155eda1-e304-48fd-a367-f38cda24110a",
            "76732e4c-5f94-43da-9afb-c3ab5f4e2b38",
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
            "455d8792-7649-4c4c-ba5d-4a2a46461b90",
            "9b572438-e518-4043-b103-ced4d8ce5805",
            "c9091263-406c-44df-acf5-6e48e6bfc5e3",
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
            "7317e629-d696-4ed8-89b2-897623c2ab96",
            "62d53d92-9659-4e34-bece-7bf6d0bd6871",
            "814be061-57b5-4308-ac78-e9c31a8a5524",
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
            "3ca2fb7a-bb51-47aa-998c-131fffc20dde",
            "0e0ce5a0-ea1f-4fec-9765-c675e5c460a0",
            "6229b224-39e9-40cf-8df5-dcccc729f10d",
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
            "83784abc-7051-4d3a-8822-e7e2b82ee063",
            "7aff6f5d-17a2-423b-8e90-791ec6b45e43",
            "f4c31154-244e-4269-ab50-6f39b5b5818a",
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
            "618c530a-c451-49bb-baf3-992ef2f94e93",
            "b72e7142-57a4-4c2b-acad-8ecf1b782ead",
            "4eaa0d48-6d7a-4627-baeb-67655ea1f8cc",
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
            "b72e7142-57a4-4c2b-acad-8ecf1b782ead",
            "c5a8bda0-8325-486d-a79f-e7a09319222c",
            "4eaa0d48-6d7a-4627-baeb-67655ea1f8cc",
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
            "248289a7-9df7-4157-8c34-4518fb4a6722",
            "6bf8e66f-d05d-451d-89a0-73965ba99e5d",
            "5c942a48-d81c-45c2-8383-50090eb0c4ff",
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
            "c93a712c-65ca-4e19-9c4b-b1b1f9bc8a7d",
            "6bf8e66f-d05d-451d-89a0-73965ba99e5d",
            "bc3b66fa-39da-49d7-80d7-9b83494ef016",
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
            "618c530a-c451-49bb-baf3-992ef2f94e93",
            "ceb0d03c-df2a-472a-bec8-beb99f58125a",
            "4eaa0d48-6d7a-4627-baeb-67655ea1f8cc",
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
            "1f4118f6-2e61-4f9a-ae41-a1873d0e45e3",
            "366ff68b-5d61-40d5-ad3a-0950faa755a5",
            "3a655432-6344-4db4-88a0-31b9fc75513c",
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
            "366ff68b-5d61-40d5-ad3a-0950faa755a5",
            "1f4118f6-2e61-4f9a-ae41-a1873d0e45e3",
            "3b879555-7d04-4216-b4c5-b084c707a571",
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
            "7e7bb48a-7b41-4ea4-ba1a-500eac7f7659",
            "7124fc89-f897-429f-bfa7-479392cce0d0",
            "c1c5183b-3bdb-4b23-9cc2-515121b09608",
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
            "935556a2-cee8-4301-814c-9988a5b6aa5c",
            "57b39761-06b4-49a8-97f5-9bb7f3f537e8",
            "d38d00cc-b201-476f-899e-c258217505d8",
        ],
    },
    {
        question: "Siapa Rektor Universitas Mulia saat ini?",
        groundTruth: "Rektor Universitas Mulia adalah Prof. Dr. Ir. Muhammad Ahsin Rifa’i, M.Si.",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "2a4abe54-92fb-4799-83a0-c6b62f50d7eb",
            "8e833bf3-292b-42b1-85b7-33ea079eba11",
            "3b74f220-ad6c-4ae6-a186-4a4954d11c74",
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
            "a9eb21f5-db74-4f7a-baba-5832e5ad4912",
            "bb5560e5-13cc-44ed-894b-a3c1d68997fe",
            "b547b277-14d8-4615-8361-ad5d3b390cee",
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
            "2447b7b2-7f15-4d67-9745-b80115d95070",
            "b547b277-14d8-4615-8361-ad5d3b390cee",
            "08f00ae7-6517-4801-9647-f17506eb0779",
        ],
    },
    {
        question: "Apa status akreditasi Program Studi Informatika?",
        groundTruth: "Program Studi S1 Informatika telah mendapatkan akreditasi 'Baik Sekali' oleh BAN-PT.",
        category: "general_university_info",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "4d1fe3d9-f04f-4faf-a4a2-b5a760e67898",
            "60cdfdb9-504e-494e-bd88-ca262c81c074",
            "21b33cdb-3eac-46b2-86c1-6dc22621fbbe",
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
            "aaca2731-fb9f-4749-876d-da968863cb86",
            "b2eb112b-4afc-491e-b005-972121e0ace6",
            "1a040052-b302-4381-806a-08fcbaaee8ab",
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
            "60cdfdb9-504e-494e-bd88-ca262c81c074",
            "f155eda1-e304-48fd-a367-f38cda24110a",
            "76732e4c-5f94-43da-9afb-c3ab5f4e2b38",
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
            "02439f98-ffdd-4d8b-9b5b-169a30263d38",
            "d082a844-e0ef-48c5-99ee-830c505ba875",
            "659baefc-bd1f-4680-b42a-37a36e2f7ee3",
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
            "3055d32a-3580-4281-a0a1-05f8362419f7",
            "4eaa0d48-6d7a-4627-baeb-67655ea1f8cc",
            "9033709d-99ba-4e09-bbfe-4a747d58967d",
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
            "8f568dc3-0b87-4a1c-ae55-e7480f73dc46",
            "8361ca3e-10ce-43fd-8c66-608909783ba0",
            "60a356c5-b25c-429c-b7af-f9b96559d909",
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
            "ce863b6f-89e1-4233-8a56-0590c3b319a6",
            "569f9543-2db2-4ddb-b64e-619ea2f45739",
            "a11bbe09-a074-4a2a-b362-5b16c628d557",
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
            "64f743a0-48a0-4219-ad05-19c9ffa22d32",
            "ce996b7f-a418-4763-8768-b7cfe9ddbb94",
            "39757a0f-a968-481f-98b4-cc926daa6b97",
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
            "3b22d8a1-7990-4049-aba5-e540189c0727",
            "74d83acd-0211-4d3c-b77d-6446ef7e2aee",
            "8c503427-2039-43fc-b65a-d16a409107c9",
        ],
    },
    {
        question: "Apa gelar akademik yang diperoleh lulusan Program Studi S1 Manajemen?",
        groundTruth: "Lulusan Program Studi S1 Manajemen berhak menyandang gelar Sarjana Manajemen (S.M.).",
        category: "faculty_programs",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "34f4f5a7-f7cd-4db1-98e0-a07810071950",
            "aafb4b99-c98a-4b7d-aa21-e2e7fa48edf2",
            "ecd796bd-7ce9-4eb2-ab2f-c45caba569c7",
        ],
    },
    {
        question: "Siapa Direktur Eksekutif Yayasan Airlangga?",
        groundTruth: "Direktur Eksekutif Yayasan Airlangga adalah Dr. Agung Sakti Pribadi, S.H., M.H.",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "8e833bf3-292b-42b1-85b7-33ea079eba11",
            "3b74f220-ad6c-4ae6-a186-4a4954d11c74",
            "d8f33552-6077-4fed-b7ab-612b7cd9b191",
        ],
    },
    {
        question: "Berapa Indeks Prestasi Kumulatif (IPK) minimal untuk dapat mengajukan judul Skripsi?",
        groundTruth: "Mahasiswa harus memiliki IPK minimal 2,00 untuk dapat mengajukan usulan judul Skripsi.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "0ddd6b09-373e-48cc-8b31-47a6a8e483b4",
            "94a525f7-04b0-433f-b25f-35d9388ca046",
            "1c173324-8f2b-45bf-8aff-147d0e7cd606",
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
            "248289a7-9df7-4157-8c34-4518fb4a6722",
            "6bf8e66f-d05d-451d-89a0-73965ba99e5d",
            "b72e7142-57a4-4c2b-acad-8ecf1b782ead",
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
            "c5599ea1-14d9-47cb-bf23-84bbff47e15b",
            "e27c1534-a819-44e8-b2e5-2a9933ed29ef",
            "904ac012-5a23-4786-b3a7-aeec57e22e73",
        ],
    },
    {
        question: "Berapa rata-rata masa studi untuk jenjang Diploma 3 (D3) di Universitas Mulia?",
        groundTruth: "Rata-rata masa studi untuk jenjang Diploma 3 (D3) adalah 2,8 tahun.",
        category: "academic_regulations",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "0cc6f3c2-e51f-4550-b0ca-c9d00a636f56",
            "fd9df994-5189-4bf6-8566-40f0641dffa1",
            "df9ec856-65b0-42b8-9a2a-4c47ef38b5a2",
        ],
    },
    {
        question: "Apa status akreditasi Program Studi S1 Farmasi?",
        groundTruth: "Program Studi S1 Farmasi telah terakreditasi 'Baik' oleh LAM-PTKes.",
        category: "general_university_info",
        difficulty: "medium",
        language: "id",
        relevantChunkIds: [
            "21b33cdb-3eac-46b2-86c1-6dc22621fbbe",
            "57b4d663-4c50-470d-9a7e-9ba317b5a7a2",
            "3cdfdec4-42fb-40d2-b645-6ccaebe6bb17",
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
            "0bc0068d-e19c-4cc3-b0ce-9cb1d8aa3e06",
            "2ace10fc-542c-4e5b-b6fd-17d749c7a105",
            "419c414c-2a43-48f6-a16c-889d7088a738",
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
            "8361ca3e-10ce-43fd-8c66-608909783ba0",
            "c0f532c7-6eb7-416b-a232-847b04300898",
            "bc22fa9a-9962-4d65-8338-cc682badf456",
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
            "cb5f11d8-cc9c-4ffa-b478-3150ccc57bfe",
            "f155eda1-e304-48fd-a367-f38cda24110a",
            "758d5a72-063a-4fd0-ab67-0dc0ac579471",
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
            "1e6db96a-1860-4531-aaad-f85f3857b398",
            "39703a29-ba70-42d9-b01c-86b33631bc8d",
            "358bd814-1970-40d7-bc2a-c69599feb1a9",
        ],
    },
    {
        question: "Apa motto Universitas Mulia?",
        groundTruth: "Motto Universitas Mulia adalah 'Global Technopreneur Campus: Inovatif, Mandiri, Humanis'.",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "b9ac2d8c-995b-4c5a-95c9-83b8feed4490",
            "01945f2c-0aea-4ae8-90ff-3755c7cf2f6e",
            "b39d49e8-d28d-4239-9bd4-664faf701e5a",
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
            "3055d32a-3580-4281-a0a1-05f8362419f7",
            "4eaa0d48-6d7a-4627-baeb-67655ea1f8cc",
            "5801637a-44ae-4c47-80ce-6f83c37a620e",
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
            "7eed7ac7-be26-4e2b-bdee-50b1f72f29df",
            "2532ef31-8150-4624-b1f6-2d96cf4a39eb",
            "43de42fc-87c4-4a24-8156-220a5a4a3d5a",
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
            "83784abc-7051-4d3a-8822-e7e2b82ee063",
            "7aff6f5d-17a2-423b-8e90-791ec6b45e43",
            "6de02535-693e-43ed-aaf6-6d326a0d73e2",
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
            "97ce3ae6-efd3-4502-960d-95fd70e87635",
            "76e448fe-d6f6-42b3-8cbc-0be1eb85a303",
            "d2cd5e44-9cd6-42a6-91c4-bb6665d3fe1d",
        ],
    },
    {
        question: "Siapa Dekan Fakultas Ilmu Komputer (FIKOM) saat ini?",
        groundTruth: "Dekan Fakultas Ilmu Komputer (FIKOM) adalah Djumhadi, S.T., M.Kom.",
        category: "general_university_info",
        difficulty: "easy",
        language: "id",
        relevantChunkIds: [
            "27ab35ff-8c5a-4686-ab4b-7ddc9239b00b",
            "ce734452-4a6f-4db1-86b2-63845b342992",
            "f155eda1-e304-48fd-a367-f38cda24110a",
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
