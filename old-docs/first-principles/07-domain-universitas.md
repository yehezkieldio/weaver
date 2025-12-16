# Domain Universitas Indonesia

## Pendahuluan

Modul domain universitas menyediakan intelijen khusus untuk pemrosesan konten informasi universitas Indonesia. Modul ini menangani 12 kategori dokumen akademik, ekspansi sinonim bahasa Indonesia, ekstraksi metadata, dan normalisasi teks yang umum ditemui dalam dokumen PDF.

---

## Kategori Dokumen Akademik

Sistem mendukung 12 kategori utama dokumen universitas Indonesia:

### 1. Dokumen Akademik Tradisional

| Tipe             | Deskripsi           | Contoh Pola                     |
| ---------------- | ------------------- | ------------------------------- |
| `syllabus`       | Silabus mata kuliah | "silabus", "RPS"                |
| `thesis`         | Skripsi/Tesis       | "skripsi", "tesis", "disertasi" |
| `research_paper` | Karya ilmiah        | "jurnal", "paper", "artikel"    |
| `lecture_notes`  | Catatan kuliah      | "materi kuliah", "slide"        |
| `assignment`     | Tugas               | "tugas", "PR", "assignment"     |
| `exam`           | Soal ujian          | "UTS", "UAS", "kuis"            |

### 2. Informasi Akademik

| Tipe                | Deskripsi            | Contoh Pola                       |
| ------------------- | -------------------- | --------------------------------- |
| `curriculum`        | Kurikulum            | "kurikulum", "struktur kurikulum" |
| `academic_calendar` | Kalender akademik    | "kalender akademik"               |
| `cpl`               | Capaian Pembelajaran | "CPL", "CPMK"                     |
| `grade_report`      | Transkrip/KHS        | "KHS", "transkrip"                |

### 3. Administrasi Akademik

| Tipe                     | Deskripsi          | Contoh Pola                  |
| ------------------------ | ------------------ | ---------------------------- |
| `registration_guide`     | Panduan registrasi | "KRS", "herregistrasi"       |
| `graduation_requirement` | Syarat kelulusan   | "wisuda", "yudisium"         |
| `academic_regulation`    | Peraturan akademik | "peraturan", "SK Rektor"     |
| `study_program`          | Info prodi         | "profil prodi", "akreditasi" |

### 4-12. Kategori Tambahan

```typescript
// src/lib/rag/university-domain.ts

type AcademicDocumentType =
    // 1. Traditional Academic
    | "syllabus" | "thesis" | "research_paper" | "lecture_notes" | "assignment" | "exam"
    // 2. Informasi Akademik
    | "curriculum" | "academic_calendar" | "cpl" | "grade_report"
    // 3. Administrasi Akademik
    | "registration_guide" | "graduation_requirement" | "academic_regulation" | "study_program"
    // 4. Kepegawaian
    | "organizational_structure" | "staff_directory" | "employee_regulation"
    // 5. Penelitian & Pengabdian
    | "research_grant" | "publication_guide" | "pkm_guide"
    // 6. Kerjasama
    | "mou" | "partnership" | "exchange_program"
    // 7. Kemahasiswaan
    | "scholarship" | "ukm" | "student_affairs"
    // 8. Sarana & Prasarana
    | "lab_guide" | "library" | "facilities"
    // 9. PMB
    | "admission" | "tuition" | "prospectus"
    // 10. Keuangan
    | "payment" | "refund" | "financial_aid"
    // 11. Alumni
    | "tracer_study" | "alumni_association"
    // 12. Humas & Publik
    | "news" | "announcement" | "event"
    | "unknown";
```

---

## Ekspansi Sinonim Akademik

### Mengapa Ekspansi Penting

Query pengguna seringkali tidak persis sama dengan istilah dalam dokumen:

| User Query     | Istilah di Dokumen     |
| -------------- | ---------------------- |
| "cara daftar"  | "prosedur pendaftaran" |
| "syarat lulus" | "ketentuan kelulusan"  |
| "berapa SKS"   | "beban studi"          |

### Kelompok Sinonim

```typescript
// src/lib/rag/university-domain.ts

const SYNONYM_GROUPS: SynonymGroup[] = [
    // Prosedur/Cara
    {
        terms: ["prosedur", "tata cara", "mekanisme", "alur", "cara", "langkah", "tahapan"],
        context: "administration"
    },

    // Persyaratan
    {
        terms: ["syarat", "ketentuan", "kriteria", "persyaratan", "kualifikasi"],
        context: "administration"
    },

    // Pendaftaran
    {
        terms: ["pendaftaran", "registrasi", "enrollment", "daftar"],
        context: "administration"
    },

    // Pembayaran
    {
        terms: ["pembayaran", "biaya", "tarif", "uang kuliah", "UKT", "SPP"],
        context: "finance"
    },

    // Jadwal
    {
        terms: ["jadwal", "waktu", "tanggal", "periode", "tenggat", "deadline"],
        context: "general"
    },

    // Nilai
    {
        terms: ["nilai", "skor", "grade", "indeks prestasi", "IP", "IPK"],
        context: "education"
    },

    // Mata Kuliah
    {
        terms: ["mata kuliah", "matkul", "course", "kelas", "perkuliahan"],
        context: "education"
    },

    // Dosen
    {
        terms: ["dosen", "pengajar", "instruktur", "profesor", "lecturer"],
        context: "education"
    },

    // Mahasiswa
    {
        terms: ["mahasiswa", "siswa", "peserta didik", "student"],
        context: "education"
    }
];
```

### Implementasi Ekspansi

```typescript
function expandQueryWithSynonyms(query: string): string[] {
    const expansions: string[] = [query];
    const lowerQuery = query.toLowerCase();

    for (const group of SYNONYM_GROUPS) {
        for (const term of group.terms) {
            // Word boundary matching to prevent false matches
            const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, "gi");

            if (regex.test(lowerQuery)) {
                // Add variations with other synonyms in the group
                for (const synonym of group.terms) {
                    if (synonym !== term) {
                        const expanded = query.replace(regex, synonym);
                        if (!expansions.includes(expanded)) {
                            expansions.push(expanded);
                        }
                    }
                }
            }
        }
    }

    return expansions;
}
```

**Contoh Ekspansi**:

```typescript
expandQueryWithSynonyms("cara daftar ulang")
// Returns:
// [
//   "cara daftar ulang",
//   "prosedur daftar ulang",
//   "tata cara daftar ulang",
//   "mekanisme daftar ulang",
//   "cara registrasi ulang",
//   "cara pendaftaran ulang"
// ]
```

---

## Ekspansi Query Bahasa Indonesia

```typescript
function expandQueryIndonesian(query: string): string[] {
    const expansions: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Expand common Indonesian education terms
    const termExpansions: Record<string, string[]> = {
        "krs": ["kartu rencana studi", "pengisian krs", "mata kuliah"],
        "khs": ["kartu hasil studi", "transkrip semester", "nilai"],
        "ip": ["indeks prestasi", "ipk", "nilai rata-rata"],
        "sks": ["satuan kredit semester", "beban studi"],
        "ukt": ["uang kuliah tunggal", "biaya kuliah", "spp"],
        "nim": ["nomor induk mahasiswa", "id mahasiswa"],
        "dpa": ["dosen pembimbing akademik", "wali dosen"],
        "pa": ["pembimbing akademik"],
        "wisuda": ["kelulusan", "yudisium", "graduation"],
        "skripsi": ["tugas akhir", "ta", "karya ilmiah akhir"],
        "sidang": ["ujian skripsi", "defense", "presentasi akhir"]
    };

    for (const [term, synonyms] of Object.entries(termExpansions)) {
        if (lowerQuery.includes(term)) {
            for (const synonym of synonyms) {
                expansions.push(query.replace(new RegExp(term, "gi"), synonym));
            }
        }
    }

    return expansions;
}
```

---

## Ekstraksi Metadata Universitas

### Struktur Metadata

```typescript
interface UniversityMetadata {
    documentType: AcademicDocumentType;
    courseCode?: string;      // "IF1234", "MK-201"
    courseName?: string;      // "Algoritma dan Pemrograman"
    department?: string;      // "Informatika"
    faculty?: string;         // "Fakultas Teknik"
    instructor?: string;      // "Dr. Budi Santoso, M.Kom"
    semester?: string;        // "Ganjil 2024/2025"
    academicYear?: string;    // "2024/2025"
    institution?: string;     // "Universitas XYZ"
    citations?: Citation[];
    keywords?: string[];
    sections?: DocumentSection[];
    language?: "en" | "id";
}
```

### Pola Ekstraksi Kode Mata Kuliah

```typescript
const COURSE_CODE_PATTERNS = [
    /\b([A-Z]{2,4})[\s-]?(\d{3,4}[A-Z]?)\b/,  // IF1234, CS-101
    /\b(\d{2})\.(\d{3})\b/,                    // 01.234
    /\b([A-Z]{4})(\d{4})\b/,                   // COMP1234
    /\b(MK|SKS|KD)[\s-]?(\d{2,4})\b/i,         // MK-01, SKS001
];

function extractCourseCode(content: string): string | undefined {
    for (const pattern of COURSE_CODE_PATTERNS) {
        const match = content.match(pattern);
        if (match) {
            return match[0];
        }
    }
    return undefined;
}
```

### Pola Administratif Indonesia

```typescript
const ADMIN_PATTERNS = {
    // Nomor Induk Mahasiswa
    nim: /\b(NIM|No\.?\s*Mahasiswa)[\s:]*(\d{8,12})\b/i,

    // Nomor Induk Pegawai
    nip: /\b(NIP)[\s:]*(\d{18})\b/i,

    // Surat Keputusan
    sk: /\b(SK|Surat Keputusan)[\s:]*(?:Rektor|Dekan)?\s*(?:No\.?|Nomor)?\s*(\d+[/\d\w-]+)/i,

    // Uang Kuliah Tunggal
    ukt: /\b(UKT|Uang Kuliah Tunggal)[\s:]*(?:Kelompok\s*)?(I{1,3}|[1-8])/i,

    // Jalur Masuk
    jalurMasuk: /\b(SNBP|SNBT|Mandiri|Jalur Prestasi|Reguler)\b/i
};

function extractAdminMetadata(content: string): Record<string, string> {
    const metadata: Record<string, string> = {};

    for (const [key, pattern] of Object.entries(ADMIN_PATTERNS)) {
        const match = content.match(pattern);
        if (match) {
            metadata[key] = match[0];
        }
    }

    return metadata;
}
```

---

## Normalisasi Teks PDF

### Masalah Umum PDF

1. **Spasi berlebihan**: "B A B 1" → "BAB 1"
2. **Karakter unicode aneh**: Wide spaces (U+2000-U+200B)
3. **OCR artifacts**: "fl" terpisah menjadi "f l"
4. **Hyphenation**: "pem-\nbelajaran" → "pembelajaran"

### Implementasi Normalisasi

```typescript
function normalizePDFText(text: string): string {
    let normalized = text;

    // 1. Normalize unicode spaces to regular space
    normalized = normalized.replace(/[\u2000-\u200B\u00A0]/g, " ");

    // 2. Fix spaced-out uppercase words (OCR issue)
    // "B A B 1" → "BAB 1"
    normalized = normalized.replace(
        /\b([A-Z])\s+([A-Z])\s+([A-Z])\s*(\d*)/g,
        "$1$2$3$4"
    );

    // 3. Fix spaced-out common Indonesian words
    const spacedPatterns = [
        ["P E N D A H U L U A N", "PENDAHULUAN"],
        ["K E S I M P U L A N", "KESIMPULAN"],
        ["M E T O D O L O G I", "METODOLOGI"],
        ["P E M B A H A S A N", "PEMBAHASAN"]
    ];

    for (const [pattern, replacement] of spacedPatterns) {
        normalized = normalized.replace(new RegExp(pattern, "g"), replacement);
    }

    // 4. Fix hyphenation at line breaks
    normalized = normalized.replace(/-\n(\w)/g, "$1");

    // 5. Normalize multiple spaces to single space
    normalized = normalized.replace(/\s+/g, " ");

    // 6. Normalize multiple newlines to double newline (paragraph)
    normalized = normalized.replace(/\n{3,}/g, "\n\n");

    return normalized.trim();
}
```

---

## Deteksi dan Ekstraksi Seksi

### Pola Seksi Bahasa Indonesia

```typescript
const ID_SECTION_PATTERNS = {
    abstrak: /^abstrak/i,
    pendahuluan: /^(bab\s+[i1][\s:.]*)?(pendahuluan|latar\s+belakang)/i,
    tinjauan_pustaka: /^(bab\s+[ii2][\s:.]*)?(tinjauan\s+pustaka|kajian\s+pustaka)/i,
    metode: /^(bab\s+[iii3][\s:.]*)?(metode|metodologi)/i,
    hasil: /^(bab\s+[iv4][\s:.]*)?(hasil|pembahasan)/i,
    kesimpulan: /^(bab\s+[v5][\s:.]*)?(kesimpulan|simpulan|penutup)/i,
    daftar_pustaka: /^(daftar\s+pustaka|referensi|bibliografi)/i,
    lampiran: /^lampiran/i,
};

function extractSections(content: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    const lines = content.split("\n");

    let currentSection: DocumentSection | null = null;
    let offset = 0;

    for (const line of lines) {
        const trimmedLine = line.trim();

        for (const [type, pattern] of Object.entries(ID_SECTION_PATTERNS)) {
            if (pattern.test(trimmedLine)) {
                // Close previous section
                if (currentSection) {
                    currentSection.endOffset = offset - 1;
                    sections.push(currentSection);
                }

                // Start new section
                currentSection = {
                    title: trimmedLine,
                    type: type as DocumentSection["type"],
                    startOffset: offset,
                    endOffset: offset
                };
                break;
            }
        }

        offset += line.length + 1; // +1 for newline
    }

    // Close last section
    if (currentSection) {
        currentSection.endOffset = content.length;
        sections.push(currentSection);
    }

    return sections;
}
```

---

## Ekstraksi Sitasi Akademik

### Pola Sitasi yang Didukung

```typescript
const CITATION_PATTERNS = {
    // APA: (Author, Year)
    apa: /\(([A-Z][a-z]+(?:\s+(?:et\s+al\.?|&\s+[A-Z][a-z]+))?),?\s*(\d{4})\)/g,

    // IEEE: [1], [2], etc.
    ieee: /\[(\d+)\]/g,

    // Harvard: Author (Year)
    harvard: /([A-Z][a-z]+(?:\s+(?:et\s+al\.?|and\s+[A-Z][a-z]+))?)\s*\((\d{4})\)/g,

    // Numbered: 1., 2., at end of sentence
    numbered: /(?:^|\.\s+)(\d+)\.\s+([A-Z][^.]+\.\s*\d{4})/gm
};

interface Citation {
    text: string;
    authors?: string[];
    year?: string;
    title?: string;
    source?: string;
    style?: "APA" | "MLA" | "Chicago" | "IEEE" | "Harvard" | "unknown";
}

function extractCitations(content: string): Citation[] {
    const citations: Citation[] = [];

    // Try APA pattern
    let match;
    while ((match = CITATION_PATTERNS.apa.exec(content)) !== null) {
        citations.push({
            text: match[0],
            authors: [match[1]],
            year: match[2],
            style: "APA"
        });
    }

    // Try IEEE pattern
    CITATION_PATTERNS.ieee.lastIndex = 0;
    while ((match = CITATION_PATTERNS.ieee.exec(content)) !== null) {
        citations.push({
            text: match[0],
            style: "IEEE"
        });
    }

    return citations;
}
```

---

## Enhance Prompt untuk Konteks Universitas

```typescript
function enhancePromptForUniversity(
    basePrompt: string,
    metadata?: UniversityMetadata
): string {
    if (!metadata) return basePrompt;

    const contextParts: string[] = [];

    if (metadata.documentType && metadata.documentType !== "unknown") {
        contextParts.push(`Tipe dokumen: ${formatDocumentType(metadata.documentType)}`);
    }

    if (metadata.courseCode && metadata.courseName) {
        contextParts.push(`Mata kuliah: ${metadata.courseCode} - ${metadata.courseName}`);
    }

    if (metadata.faculty) {
        contextParts.push(`Fakultas: ${metadata.faculty}`);
    }

    if (metadata.semester && metadata.academicYear) {
        contextParts.push(`Periode: ${metadata.semester} ${metadata.academicYear}`);
    }

    if (contextParts.length === 0) return basePrompt;

    return `${basePrompt}

---
KONTEKS DOKUMEN:
${contextParts.join("\n")}
---`;
}
```

---

## Deteksi Bahasa

```typescript
// Selalu mengembalikan "id" karena sistem fokus pada konten Indonesia
function detectQueryLanguage(query: string): "id" {
    // System is Indonesian-only, always return "id"
    return "id";
}

// Untuk konten dokumen (bisa ada konten Inggris)
function detectLanguage(content: string): "en" | "id" {
    const indonesianMarkers = [
        "yang", "dan", "atau", "untuk", "dengan", "adalah",
        "pada", "ke", "dari", "dalam", "akan", "dapat",
        "BAB", "SKRIPSI", "UNIVERSITAS", "FAKULTAS"
    ];

    const lowerContent = content.toLowerCase();
    let indonesianScore = 0;

    for (const marker of indonesianMarkers) {
        if (lowerContent.includes(marker.toLowerCase())) {
            indonesianScore++;
        }
    }

    // If more than 5 Indonesian markers, classify as Indonesian
    return indonesianScore > 5 ? "id" : "en";
}
```

---

## Referensi Terkait

- [01-ikhtisar-arsitektur.md](./01-ikhtisar-arsitektur.md) - Posisi dalam arsitektur sistem
- [04-pemrosesan-dokumen.md](./04-pemrosesan-dokumen.md) - Integrasi dengan document processing
- [05-sistem-retrieval.md](./05-sistem-retrieval.md) - Query expansion dalam retrieval
- [06-agentic-rag.md](./06-agentic-rag.md) - Penggunaan dalam expand_query tool
- [08-guardrails-keamanan.md](./08-guardrails-keamanan.md) - Validasi topik akademik
