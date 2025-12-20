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

import type { ConversationScenario } from "./types";
import {
	FACULTY_PERSONA,
	NEW_STUDENT_PERSONA,
	PROSPECTIVE_STUDENT_PERSONA,
	SENIOR_STUDENT_PERSONA,
	STAFF_PERSONA,
} from "./personas";

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
			userMessage: "Bagaimana cara mengisi KRS?",
			expectedIntent: "Mendapatkan informasi prosedur pengisian KRS",
			isFollowUp: false,
			expectedResponseType: "informational",
		},
		{
			turnNumber: 2,
			userMessage: "Berapa maksimal SKS yang bisa diambil?",
			expectedIntent: "Mengetahui batas maksimal SKS",
			requiredContext: ["KRS"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
		{
			turnNumber: 3,
			userMessage: "Kalau IPK saya 3.5, berapa SKS yang boleh saya ambil?",
			expectedIntent: "Mengetahui SKS spesifik berdasarkan IPK",
			requiredContext: ["KRS", "SKS", "IPK"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
	],
	successCriteria: {
		mustContainKeywords: ["KRS", "SKS", "Penasehat Akademik", "SIAS"],
		mustRetainContext: ["KRS", "SKS"],
		minimumCoherenceScore: 0.7,
		maximumTurns: 5,
		requiredInformationCoverage: ["cara mengisi KRS", "batas SKS", "konsultasi PA"],
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
			userMessage: "Apa saja syarat kelulusan untuk program sarjana?",
			expectedIntent: "Mendapatkan daftar lengkap syarat kelulusan",
			isFollowUp: false,
			expectedResponseType: "informational",
		},
		{
			turnNumber: 2,
			userMessage: "Berapa total SKS yang harus diselesaikan?",
			expectedIntent: "Mengetahui jumlah SKS spesifik",
			requiredContext: ["kelulusan", "sarjana"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
		{
			turnNumber: 3,
			userMessage: "Bagaimana prosedur yudisium?",
			expectedIntent: "Memahami proses yudisium",
			requiredContext: ["kelulusan"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
		{
			turnNumber: 4,
			userMessage: "Apakah ada persyaratan administratif lainnya?",
			expectedIntent: "Memastikan tidak ada persyaratan yang terlewat",
			requiredContext: ["kelulusan", "yudisium"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
	],
	successCriteria: {
		mustContainKeywords: ["SKS", "Skripsi", "Yudisium", "administrasi"],
		mustRetainContext: ["kelulusan", "sarjana"],
		minimumCoherenceScore: 0.75,
		maximumTurns: 6,
		requiredInformationCoverage: ["jumlah SKS", "skripsi", "yudisium", "administrasi"],
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
			userMessage: "Apakah cuti akademik mempengaruhi status mahasiswa?",
			expectedIntent: "Memahami konsekuensi cuti terhadap status",
			requiredContext: ["cuti akademik"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
		{
			turnNumber: 3,
			userMessage: "Kemana saya harus mengajukan permohonan?",
			expectedIntent: "Mengetahui unit yang menangani cuti",
			requiredContext: ["cuti akademik", "permohonan"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
	],
	successCriteria: {
		mustContainKeywords: ["Cuti Akademik", "Dekan", "Rektor", "permohonan"],
		mustRetainContext: ["cuti akademik"],
		minimumCoherenceScore: 0.7,
		maximumTurns: 5,
		requiredInformationCoverage: ["prosedur pengajuan", "status mahasiswa", "unit terkait"],
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
			userMessage: "Bagian apa saja yang ada di bawahnya?",
			expectedIntent: "Mengetahui sub-unit Biro Akademik",
			requiredContext: ["Biro Akademik"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
		{
			turnNumber: 3,
			userMessage: "Siapa yang memimpin bagian-bagian tersebut?",
			expectedIntent: "Mengetahui struktur kepemimpinan",
			requiredContext: ["Biro Akademik", "bagian"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
	],
	successCriteria: {
		mustContainKeywords: ["Biro Akademik", "Kepala Biro", "Bagian"],
		mustRetainContext: ["Biro Akademik", "organisasi"],
		minimumCoherenceScore: 0.7,
		maximumTurns: 5,
		requiredInformationCoverage: ["fungsi biro", "sub-unit", "kepemimpinan"],
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
			userMessage: "Ceritakan tentang program Teknik Informatika",
			expectedIntent: "Mendapatkan detail program Teknik Informatika",
			requiredContext: ["program studi", "Universitas Mulia"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
		{
			turnNumber: 3,
			userMessage: "Berapa biaya kuliahnya?",
			expectedIntent: "Mengetahui biaya kuliah Teknik Informatika",
			requiredContext: ["Teknik Informatika"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
		{
			turnNumber: 4,
			userMessage: "Bagaimana cara mendaftarnya?",
			expectedIntent: "Memahami prosedur pendaftaran",
			requiredContext: ["Teknik Informatika", "Universitas Mulia"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
	],
	successCriteria: {
		mustContainKeywords: ["program studi", "Teknik Informatika", "pendaftaran"],
		mustRetainContext: ["Teknik Informatika", "program studi"],
		minimumCoherenceScore: 0.7,
		maximumTurns: 6,
		requiredInformationCoverage: ["daftar program", "detail program", "biaya", "pendaftaran"],
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
			userMessage: "Apa saja layanan yang tersedia untuk dosen?",
			expectedIntent: "Mendapatkan daftar layanan dosen",
			isFollowUp: false,
			expectedResponseType: "informational",
		},
		{
			turnNumber: 2,
			userMessage: "Bagaimana cara mengakses sistem akademik?",
			expectedIntent: "Memahami cara akses SIAS",
			requiredContext: ["layanan", "dosen"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
		{
			turnNumber: 3,
			userMessage: "Apakah ada dukungan untuk pengembangan metode pengajaran?",
			expectedIntent: "Mengetahui program pengembangan dosen",
			requiredContext: ["layanan", "dosen", "pengajaran"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
	],
	successCriteria: {
		mustContainKeywords: ["layanan", "dosen", "SIAS", "akademik"],
		mustRetainContext: ["layanan", "dosen"],
		minimumCoherenceScore: 0.7,
		maximumTurns: 5,
		requiredInformationCoverage: ["layanan dosen", "sistem akademik", "pengembangan"],
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
			userMessage: "Dimana lokasi perpustakaan?",
			expectedIntent: "Mengetahui lokasi perpustakaan",
			requiredContext: ["fasilitas"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
		{
			turnNumber: 3,
			userMessage: "Apa jam operasional perpustakaan?",
			expectedIntent: "Mengetahui jam buka perpustakaan",
			requiredContext: ["perpustakaan"],
			isFollowUp: true,
			expectedResponseType: "informational",
		},
	],
	successCriteria: {
		mustContainKeywords: ["fasilitas", "perpustakaan"],
		mustRetainContext: ["fasilitas", "perpustakaan"],
		minimumCoherenceScore: 0.7,
		maximumTurns: 5,
		requiredInformationCoverage: ["daftar fasilitas", "lokasi", "jam operasional"],
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
export function getScenariosByCategory(
	category: ConversationScenario["category"],
): ConversationScenario[] {
	return ALL_SCENARIOS.filter((s) => s.category === category);
}

/**
 * Get scenarios by persona
 */
export function getScenariosByPersona(personaId: string): ConversationScenario[] {
	return ALL_SCENARIOS.filter((s) => s.persona.id === personaId);
}
