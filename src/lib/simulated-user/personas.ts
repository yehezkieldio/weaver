/**
 * @fileoverview User Personas for Simulated User Testing
 *
 * Personas are derived from:
 * 1. Corpus content analysis (documents about different university services)
 * 2. Existing evaluation questions (ACADEMIC_QUESTIONS)
 * 3. Realistic university stakeholder profiles
 *
 * Each persona has distinct:
 * - Knowledge level (novice to expert)
 * - Communication style (formal to casual)
 * - Goals and information needs
 * - Typical question patterns
 */

import type { UserPersona } from "./types";

/**
 * New Student (Mahasiswa Baru)
 * - Just enrolled, needs basic information
 * - Unfamiliar with university systems and procedures
 * - Asks foundational questions about registration, KRS, facilities
 */
export const NEW_STUDENT_PERSONA: UserPersona = {
    id: "new-student",
    name: "Mahasiswa Baru",
    description: "Mahasiswa tahun pertama yang baru mendaftar",
    background:
        "Baru diterima di Universitas Mulia, belum familiar dengan sistem akademik, prosedur, dan layanan kampus.",
    goals: [
        "Memahami cara mengisi KRS",
        "Mengetahui fasilitas yang tersedia",
        "Memahami prosedur administrasi dasar",
        "Mencari informasi tentang layanan mahasiswa",
    ],
    knowledgeLevel: "novice",
    communicationStyle: "casual",
    language: "id",
    typicalQuestions: [
        "Bagaimana cara mengisi KRS?",
        "Apa saja fasilitas yang ada di kampus?",
        "Dimana lokasi perpustakaan?",
        "Berapa biaya kuliah per semester?",
        "Bagaimana cara mendaftar beasiswa?",
    ],
};

/**
 * Senior Student (Mahasiswa Senior)
 * - In final year, preparing for graduation
 * - Knows basic procedures, needs advanced information
 * - Asks about thesis, graduation requirements, academic leave
 */
export const SENIOR_STUDENT_PERSONA: UserPersona = {
    id: "senior-student",
    name: "Mahasiswa Senior",
    description: "Mahasiswa tingkat akhir yang sedang menyiapkan kelulusan",
    background:
        "Sudah menjalani perkuliahan 3-4 tahun, familiar dengan sistem, fokus pada penyelesaian skripsi dan kelulusan.",
    goals: [
        "Memahami syarat kelulusan",
        "Mengetahui prosedur pengajuan skripsi",
        "Memahami jadwal yudisium",
        "Mencari informasi tentang wisuda",
        "Memahami prosedur cuti akademik jika diperlukan",
    ],
    knowledgeLevel: "intermediate",
    communicationStyle: "formal",
    language: "id",
    typicalQuestions: [
        "Apa saja syarat kelulusan untuk program sarjana?",
        "Bagaimana prosedur pengajuan judul skripsi?",
        "Kapan jadwal yudisium semester ini?",
        "Bagaimana prosedur cuti akademik?",
        "Berapa maksimal SKS yang boleh diambil dengan IPK 3.5?",
    ],
};

/**
 * Faculty Member (Dosen)
 * - Teaching staff, needs curriculum and administrative information
 * - Expert level knowledge of academic processes
 * - Formal communication style
 */
export const FACULTY_PERSONA: UserPersona = {
    id: "faculty",
    name: "Dosen",
    description: "Staf pengajar yang memerlukan informasi kurikulum dan administrasi",
    background: "Dosen di Universitas Mulia yang mengajar dan membimbing mahasiswa.",
    goals: [
        "Memahami struktur kurikulum program studi",
        "Mengetahui kalender akademik",
        "Mencari informasi tentang peraturan akademik",
        "Memahami prosedur penilaian",
    ],
    knowledgeLevel: "expert",
    communicationStyle: "formal",
    language: "id",
    typicalQuestions: [
        "Apa struktur kurikulum untuk program studi Teknik Informatika?",
        "Kapan periode pengisian KRS semester depan?",
        "Bagaimana kebijakan penilaian dan grading?",
        "Siapa koordinator program studi Farmasi?",
    ],
};

/**
 * Administrative Staff (Staf Administrasi)
 * - Works in university administration
 * - Needs detailed procedural and organizational information
 * - Formal communication
 */
export const STAFF_PERSONA: UserPersona = {
    id: "staff",
    name: "Staf Administrasi",
    description: "Pegawai administrasi yang memerlukan informasi prosedur dan organisasi",
    background:
        "Bekerja di salah satu unit administrasi Universitas Mulia, memerlukan informasi tentang struktur organisasi dan prosedur.",
    goals: [
        "Memahami struktur organisasi universitas",
        "Mengetahui tugas dan fungsi setiap unit",
        "Mencari informasi tentang prosedur administratif",
        "Memahami alur kerja antar unit",
    ],
    knowledgeLevel: "intermediate",
    communicationStyle: "formal",
    language: "id",
    typicalQuestions: [
        "Apa peran Biro Akademik dan Sistem Informasi?",
        "Siapa yang memimpin Bagian Kemahasiswaan?",
        "Apa saja layanan yang ditangani Bagian Sekretariat?",
        "Bagaimana struktur organisasi Fakultas Ilmu Komputer?",
    ],
};

/**
 * Prospective Student (Calon Mahasiswa)
 * - Considering enrollment, needs admission and program information
 * - No prior knowledge of the university
 * - Mixed formal/casual communication
 */
export const PROSPECTIVE_STUDENT_PERSONA: UserPersona = {
    id: "prospective-student",
    name: "Calon Mahasiswa",
    description: "Calon mahasiswa yang sedang mencari informasi tentang universitas",
    background:
        "Sedang mempertimbangkan mendaftar ke Universitas Mulia, memerlukan informasi tentang program studi, biaya, dan proses pendaftaran.",
    goals: [
        "Mengetahui program studi yang tersedia",
        "Memahami biaya kuliah",
        "Mengetahui prosedur pendaftaran",
        "Mencari informasi tentang akreditasi",
        "Memahami fasilitas kampus",
    ],
    knowledgeLevel: "novice",
    communicationStyle: "mixed",
    language: "id",
    typicalQuestions: [
        "Apa saja program studi yang ada di Universitas Mulia?",
        "Berapa biaya kuliah untuk program Teknik Informatika?",
        "Bagaimana cara mendaftar sebagai mahasiswa baru?",
        "Apakah Universitas Mulia sudah terakreditasi?",
        "Apa saja fasilitas yang tersedia untuk mahasiswa?",
    ],
};

/**
 * All available personas for simulated user testing
 */
export const ALL_PERSONAS: UserPersona[] = [
    NEW_STUDENT_PERSONA,
    SENIOR_STUDENT_PERSONA,
    FACULTY_PERSONA,
    STAFF_PERSONA,
    PROSPECTIVE_STUDENT_PERSONA,
];

/**
 * Get persona by ID
 */
export function getPersonaById(id: string): UserPersona | undefined {
    return ALL_PERSONAS.find((p) => p.id === id);
}

/**
 * Get personas by knowledge level
 */
export function getPersonasByKnowledge(level: "novice" | "intermediate" | "expert"): UserPersona[] {
    return ALL_PERSONAS.filter((p) => p.knowledgeLevel === level);
}
