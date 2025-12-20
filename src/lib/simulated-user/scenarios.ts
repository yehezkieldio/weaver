/**
 * @fileoverview Conversation Scenarios for Simulated User Testing
 *
 * Scenarios are based on:
 * 1. Existing ACADEMIC_QUESTIONS from evaluation-questions.ts
 * 2. Realistic multi-turn conversation flows
 * 3. Different task complexity levels
 *
 * Each scenario tests:
 * - Multi-turn conversation coherence
 * - Context retention across turns
 * - Follow-up question handling
 * - Task completion tracking
 */

import {
    FACULTY_PERSONA,
    NEW_STUDENT_PERSONA,
    PROSPECTIVE_STUDENT_PERSONA,
    SENIOR_STUDENT_PERSONA,
    STAFF_PERSONA,
} from "./personas";
import type { ConversationScenario } from "./types";

/**
 * KRS Registration Flow - New Student
 * Tests basic information retrieval with follow-up clarifications
 */
export const KRS_REGISTRATION_SCENARIO: ConversationScenario = {
    id: "krs-registration",
    name: "Proses Pengisian KRS",
    description: "Mahasiswa baru belajar cara mengisi KRS dan memahami batas SKS",
    persona: NEW_STUDENT_PERSONA,
    initialGoal: "Memahami cara mengisi KRS dan batas SKS yang boleh diambil",
    expectedTurnCount: 3,
    conversationTemplate: [
        {
            turnNumber: 1,
            userMessage: "Bagaimana cara mengisi KRS dan apa saja yang perlu diperhatikan?",
            expectedIntent: "Mendapatkan informasi prosedur pengisian KRS",
            isFollowUp: false,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 2,
            userMessage: "Apakah saya harus berkonsultasi dengan Penasehat Akademik?",
            expectedIntent: "Memahami peran PA dalam pengisian KRS",
            requiredContext: ["KRS", "pengisian", "SIAS"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 3,
            userMessage: "Kapan bisa melakukan perubahan mata kuliah kalau ada yang salah?",
            expectedIntent: "Mengetahui periode KPRS untuk perubahan",
            requiredContext: ["KRS", "Penasehat Akademik", "PA"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
    ],
    successCriteria: {
        mustContainKeywords: ["KRS", "SIAS"],
        mustRetainContext: ["KRS", "SIAS", "Penasehat Akademik", "PA", "KPRS"],
        minimumCoherenceScore: 0.7,
        maximumTurns: 5,
        // Use semantic keyword-based criteria for better matching
        requiredInformationCoverage: [
            "SIAS|Sistem Informasi Akademik|daring|online", // login/access method
            "registrasi|pembayaran|aktif", // prerequisites
            "validasi|Penasehat Akademik|PA|Dosen PA", // PA validation
            "Prodi|kendala|bantuan|konsultasi", // support channel
        ],
        acceptableLatencyMs: 5000,
    },
    category: "academic_regulations",
};

/**
 * Graduation Requirements - Senior Student
 * Tests complex information retrieval with multiple sub-questions
 */
export const GRADUATION_REQUIREMENTS_SCENARIO: ConversationScenario = {
    id: "graduation-requirements",
    name: "Syarat Kelulusan",
    description: "Mahasiswa senior menanyakan syarat kelulusan dan prosedur yudisium",
    persona: SENIOR_STUDENT_PERSONA,
    initialGoal: "Memahami semua syarat kelulusan dan langkah-langkah untuk lulus",
    expectedTurnCount: 4,
    conversationTemplate: [
        {
            turnNumber: 1,
            userMessage: "Apa saja syarat kelulusan untuk program sarjana (S1)?",
            expectedIntent: "Mendapatkan daftar lengkap syarat kelulusan",
            isFollowUp: false,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 2,
            userMessage: "Berapa total SKS yang harus diselesaikan?",
            expectedIntent: "Mengetahui jumlah SKS spesifik",
            requiredContext: ["kelulusan", "sarjana", "S1", "syarat"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 3,
            userMessage: "Apakah Skripsi atau Tugas Akhir wajib diselesaikan?",
            expectedIntent: "Memahami persyaratan Skripsi",
            requiredContext: ["kelulusan", "SKS", "144"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 4,
            userMessage: "Bagaimana prosedur yudisium setelah semua syarat dipenuhi?",
            expectedIntent: "Memahami proses yudisium",
            requiredContext: ["kelulusan", "Skripsi", "persyaratan"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
    ],
    successCriteria: {
        mustContainKeywords: ["SKS", "Skripsi"],
        mustRetainContext: ["kelulusan", "sarjana", "S1", "yudisium", "SKS", "144"],
        minimumCoherenceScore: 0.75,
        maximumTurns: 6,
        // Use semantic keyword-based criteria for better matching
        requiredInformationCoverage: [
            "yudisium|kelulusan|penetapan|Dekan", // yudisium definition
            "formulir|SKPI|Tracer|dokumen|persyaratan", // requirements list
            "SKPI|Dekan|FEB|ditandatangani", // SKPI details
            "rapat|Senat|Fakultas|keputusan", // process
        ],
        acceptableLatencyMs: 5000,
    },
    category: "academic_regulations",
};

/**
 * Academic Leave (Cuti) Process
 * Tests administrative procedure understanding with clarifications
 */
export const ACADEMIC_LEAVE_SCENARIO: ConversationScenario = {
    id: "academic-leave",
    name: "Prosedur Cuti Akademik",
    description: "Mahasiswa menanyakan prosedur dan konsekuensi cuti akademik",
    persona: SENIOR_STUDENT_PERSONA,
    initialGoal: "Memahami cara mengajukan cuti akademik dan implikasinya",
    expectedTurnCount: 3,
    conversationTemplate: [
        {
            turnNumber: 1,
            userMessage: "Bagaimana prosedur cuti akademik?",
            expectedIntent: "Memahami langkah-langkah pengajuan cuti",
            isFollowUp: false,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 2,
            userMessage: "Apakah cuti akademik berbeda dengan status non-aktif?",
            expectedIntent: "Memahami perbedaan cuti dan non-aktif",
            requiredContext: ["cuti", "akademik", "prosedur"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 3,
            userMessage: "Harus mengajukan permohonan ke siapa untuk mendapatkan izin?",
            expectedIntent: "Mengetahui jalur persetujuan cuti",
            requiredContext: ["cuti", "akademik", "status"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
    ],
    successCriteria: {
        mustContainKeywords: ["cuti"],
        mustRetainContext: ["cuti", "akademik", "permohonan", "BAAK", "form persetujuan"],
        minimumCoherenceScore: 0.7,
        maximumTurns: 5,
        // Use semantic keyword-based criteria for better matching
        requiredInformationCoverage: [
            "permohonan|form|BAAK|Fakultas|persetujuan", // application process
            "cuti akademik|status|izin|non-aktif|tidak terdaftar", // definition/difference
            "semester|maksimum|berturut-turut|3 semester", // duration rules
        ],
        acceptableLatencyMs: 5000,
    },
    category: "administrative_procedures",
};

/**
 * University Organizational Structure
 * Tests staff's need for organizational information
 */
export const ORGANIZATIONAL_STRUCTURE_SCENARIO: ConversationScenario = {
    id: "organizational-structure",
    name: "Struktur Organisasi Universitas",
    description: "Staf menanyakan struktur organisasi dan fungsi unit-unit",
    persona: STAFF_PERSONA,
    initialGoal: "Memahami struktur organisasi dan tugas setiap unit",
    expectedTurnCount: 3,
    conversationTemplate: [
        {
            turnNumber: 1,
            userMessage: "Apa peran Biro Akademik dan Sistem Informasi?",
            expectedIntent: "Memahami fungsi Biro Akademik",
            isFollowUp: false,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 2,
            userMessage: "Bagian apa saja yang ada di bawah biro tersebut?",
            expectedIntent: "Mengetahui tiga bagian di bawah Biro Akademik",
            requiredContext: ["Biro", "Akademik", "Sistem Informasi"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 3,
            userMessage: "Apa tugas dari Bagian Pusat Sistem dan Teknologi Informasi?",
            expectedIntent: "Mengetahui fungsi spesifik bagian IT",
            requiredContext: ["Biro", "Akademik", "bagian"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
    ],
    successCriteria: {
        mustContainKeywords: ["Biro"],
        mustRetainContext: ["Biro", "Akademik", "Sistem Informasi", "Bagian"],
        minimumCoherenceScore: 0.7,
        maximumTurns: 5,
        // Use semantic keyword-based criteria for better matching
        requiredInformationCoverage: [
            "Rektor|Wakil Rektor|Dekan|struktur|organisasi", // structure overview
            "Akademik|Sumber Daya|Kemahasiswaan|Alumni", // areas covered
            "fakultas|Dekan|LPPM|LPMPP|lembaga", // sub-units
        ],
        acceptableLatencyMs: 5000,
    },
    category: "administrative_procedures",
};

/**
 * Program Information for Prospective Students
 * Tests admission-related information retrieval
 */
export const PROGRAM_INFORMATION_SCENARIO: ConversationScenario = {
    id: "program-information",
    name: "Informasi Program Studi",
    description: "Calon mahasiswa mencari informasi tentang program studi",
    persona: PROSPECTIVE_STUDENT_PERSONA,
    initialGoal: "Memahami program studi yang tersedia dan persyaratannya",
    expectedTurnCount: 4,
    conversationTemplate: [
        {
            turnNumber: 1,
            userMessage: "Apa saja program studi yang ada di Universitas Mulia?",
            expectedIntent: "Mendapatkan daftar program studi",
            isFollowUp: false,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 2,
            userMessage: "Apa saja konsentrasi yang tersedia di program studi Sarjana Informatika?",
            expectedIntent: "Mendapatkan detail konsentrasi S1 Informatika",
            requiredContext: ["program", "studi", "Universitas", "Mulia"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 3,
            userMessage: "Berapa biaya kuliah untuk program Informatika?",
            expectedIntent: "Mengetahui biaya kuliah S1 Informatika",
            requiredContext: ["Informatika", "konsentrasi"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 4,
            userMessage: "Bagaimana alur pendaftaran untuk calon mahasiswa baru?",
            expectedIntent: "Memahami prosedur pendaftaran melalui SIAS",
            requiredContext: ["Informatika", "Universitas", "Mulia"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
    ],
    successCriteria: {
        mustContainKeywords: ["Informatika"],
        mustRetainContext: ["Informatika", "konsentrasi", "SIAS", "pendaftaran"],
        minimumCoherenceScore: 0.7,
        maximumTurns: 6,
        // Use semantic keyword-based criteria for better matching
        requiredInformationCoverage: [
            "sarjana|fakultas|program studi|S1", // program list
            "Robotics|Artificial Intelligence|Mobile|konsentrasi", // concentrations
            "biaya|juta|SPP|pembayaran", // costs
            "SIAS|formulir|pendaftaran|username|password", // registration
        ],
        acceptableLatencyMs: 5000,
    },
    category: "admissions_registration",
};

/**
 * Faculty Services and Facilities
 * Tests faculty member's information needs
 */
export const FACULTY_SERVICES_SCENARIO: ConversationScenario = {
    id: "faculty-services",
    name: "Layanan dan Fasilitas Dosen",
    description: "Dosen menanyakan layanan dan fasilitas untuk pengajaran",
    persona: FACULTY_PERSONA,
    initialGoal: "Memahami layanan dan fasilitas yang tersedia untuk dosen",
    expectedTurnCount: 3,
    conversationTemplate: [
        {
            turnNumber: 1,
            userMessage: "Apa saja fasilitas yang tersedia untuk mendukung pengajaran?",
            expectedIntent: "Mendapatkan daftar fasilitas pengajaran",
            isFollowUp: false,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 2,
            userMessage: "Apakah ada fasilitas Google Classroom dan Google Meet?",
            expectedIntent: "Mengetahui layanan digital untuk dosen",
            requiredContext: ["fasilitas", "pengajaran"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 3,
            userMessage: "Bagaimana cara mendapatkan dukungan IT jika ada kendala?",
            expectedIntent: "Mengetahui layanan IT support",
            requiredContext: ["Google", "Classroom", "Meet"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
    ],
    successCriteria: {
        mustContainKeywords: ["fasilitas"],
        mustRetainContext: ["fasilitas", "Google", "Classroom", "Meet", "IT Support"],
        minimumCoherenceScore: 0.7,
        maximumTurns: 5,
        // Use semantic keyword-based criteria for better matching
        requiredInformationCoverage: [
            "ruang|kelas|AC|proyektor|laboratorium", // classroom facilities
            "Google|Classroom|Meet|akun|Universitas", // digital services
            "IT|Support|teknis|bantuan|dukungan", // IT support
        ],
        acceptableLatencyMs: 5000,
    },
    category: "faculty_programs",
};

/**
 * Student Facilities Information
 * Tests new student's facility discovery
 */
export const STUDENT_FACILITIES_SCENARIO: ConversationScenario = {
    id: "student-facilities",
    name: "Fasilitas Mahasiswa",
    description: "Mahasiswa baru mencari tahu fasilitas kampus",
    persona: NEW_STUDENT_PERSONA,
    initialGoal: "Mengetahui fasilitas yang tersedia dan lokasinya",
    expectedTurnCount: 3,
    conversationTemplate: [
        {
            turnNumber: 1,
            userMessage: "Apa saja fasilitas yang ada di kampus?",
            expectedIntent: "Mendapatkan daftar fasilitas",
            isFollowUp: false,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 2,
            userMessage: "Apa itu Mulia Corner?",
            expectedIntent: "Mengetahui fungsi Mulia Corner",
            requiredContext: ["fasilitas", "kampus"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
        {
            turnNumber: 3,
            userMessage: "Fasilitas apa yang tersedia di Laboratorium Multimedia?",
            expectedIntent: "Mengetahui fungsi dan fasilitas lab multimedia",
            requiredContext: ["fasilitas", "Mulia Corner"],
            isFollowUp: true,
            expectedResponseType: "informational",
        },
    ],
    successCriteria: {
        mustContainKeywords: ["fasilitas"],
        mustRetainContext: ["fasilitas", "Mulia Corner", "Laboratorium", "Multimedia"],
        minimumCoherenceScore: 0.7,
        maximumTurns: 5,
        // Use semantic keyword-based criteria for better matching
        requiredInformationCoverage: [
            "perpustakaan|gazebo|kantin|lapangan|laboratorium", // facility list
            "Mulia Corner|berkumpul|belajar|mahasiswa|tempat", // Mulia Corner
            "komputer|video|audio|desain|game|editing", // multimedia lab
        ],
        acceptableLatencyMs: 5000,
    },
    category: "facilities_services",
};

/**
 * All available scenarios for testing
 */
export const ALL_SCENARIOS: ConversationScenario[] = [
    KRS_REGISTRATION_SCENARIO,
    GRADUATION_REQUIREMENTS_SCENARIO,
    ACADEMIC_LEAVE_SCENARIO,
    ORGANIZATIONAL_STRUCTURE_SCENARIO,
    PROGRAM_INFORMATION_SCENARIO,
    FACULTY_SERVICES_SCENARIO,
    STUDENT_FACILITIES_SCENARIO,
];

/**
 * Get scenario by ID
 */
export function getScenarioById(id: string): ConversationScenario | undefined {
    return ALL_SCENARIOS.find((s) => s.id === id);
}

/**
 * Get scenarios by category
 */
export function getScenariosByCategory(category: ConversationScenario["category"]): ConversationScenario[] {
    return ALL_SCENARIOS.filter((s) => s.category === category);
}

/**
 * Get scenarios by persona
 */
export function getScenariosByPersona(personaId: string): ConversationScenario[] {
    return ALL_SCENARIOS.filter((s) => s.persona.id === personaId);
}
