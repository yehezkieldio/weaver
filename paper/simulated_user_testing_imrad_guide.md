# Panduan Penulisan Simulated User Testing dalam Format IMRAD

**Dokumen ini**: Panduan untuk menulis hasil simulated user testing dalam paper "Implementasi Agentic Retrieval-Augmented Generation (RAG) Untuk Sistem Layanan Informasi Perguruan Tinggi"

---

## 🎯 Posisi dalam Paper

Simulated User Testing adalah **evaluasi level sistem** yang melengkapi **evaluasi level komponen (RAGAS)**:

- **RAGAS**: Mengukur kualitas komponen RAG (faithfulness, relevancy, precision, recall)
- **Simulated User Testing**: Mengukur kualitas sistem secara keseluruhan (task completion, coherence, multi-turn conversation)

**Justifikasi**: Judul paper menyebut "Implementasi" → perlu validasi sistem lengkap, bukan hanya komponen.

---

## 📝 INTRODUCTION

### What to Write

**Masalah yang Diangkat**:
```
Evaluasi sistem RAG sering kali hanya fokus pada metrik komponen individual
(faithfulness, answer relevancy) namun tidak mengevaluasi apakah sistem dapat
menyelesaikan tugas pengguna dalam konteks percakapan multi-turn yang realistis.
```

**Gap yang Diidentifikasi**:
```
Meskipun metrik RAGAS memberikan validasi komponen RAG, dibutuhkan evaluasi
sistem-level yang menguji:
1. Kemampuan menyelesaikan tugas pengguna (task completion)
2. Koherensi percakapan multi-turn (conversation coherence)
3. Retensi konteks percakapan (context retention)
4. Integrasi seluruh komponen sistem (UI → API → RAG → Response)
```

**Research Question (RQ)**:
```
RQ4: Apakah sistem yang diimplementasikan dapat menyelesaikan tugas pengguna
secara efektif dalam skenario percakapan realistis?
```

### Key Points to Mention

1. **LLM-as-a-User approach**: Menggunakan LLM untuk mensimulasikan pengguna nyata
2. **Reproducibility**: Tes dapat diulang secara konsisten
3. **Scalability**: Dapat menguji banyak skenario tanpa pengguna manual
4. **Complementary**: Melengkapi, bukan menggantikan, evaluasi RAGAS

---

## 🔬 METHODS

### Subsection: Simulated User Testing Framework

#### 4.X.1 Test Configuration

**Yang perlu dijelaskan**:

```typescript
// Dari run-simulated-user-tests.ts
const config: SimulatedUserTestConfig = {
    scenarios,                          // Skenario percakapan
    repetitionsPerScenario: 1,          // Jumlah repetisi per skenario
    useAgenticMode: true,               // Mode agentic RAG
    retrievalStrategy: "hybrid",        // Strategi retrieval
    enableGuardrails: true,             // Guardrails aktif
    maxTurnsPerConversation: 10,        // Maksimal giliran percakapan
    saveDetailedLogs: true,             // Simpan log detail
};
```

**Tulis seperti ini**:
```
Konfigurasi pengujian simulasi pengguna:
- Setiap skenario dijalankan 1 kali (dapat diulang dengan --repetitions flag)
- Mode agentic RAG diaktifkan untuk pengambilan keputusan otomatis
- Strategi retrieval: hybrid (semantic + keyword)
- Guardrails diaktifkan untuk validasi respons
- Maksimal 10 giliran percakapan per skenario
- Log detail disimpan untuk analisis mendalam
```

#### 4.X.2 Test Scenarios

**Yang perlu dijelaskan**:

```typescript
// Dari types.ts
interface SimulatedUserScenario {
    id: string;                         // ID unik skenario
    name: string;                       // Nama skenario
    description: string;                // Deskripsi skenario
    userPersona: string;                // Persona pengguna
    initialQuery: string;               // Query awal
    expectedInformation: string[];      // Informasi yang diharapkan
    successCriteria: string[];          // Kriteria sukses
    maxTurns: number;                   // Maksimal giliran
}
```

**Contoh skenario yang diuji**:
1. **KRS Registration**: Mahasiswa baru mendaftar KRS
2. **Academic Information**: Mahasiswa mencari info akademik
3. **Program Information**: Calon mahasiswa mencari info program studi
4. **Administrative Procedures**: Mahasiswa mengurus administrasi
5. **Facility Services**: Mahasiswa mencari info fasilitas

**Tulis seperti ini**:
```
Lima kategori skenario diuji untuk mencerminkan use case nyata:
1. Registrasi KRS (4 langkah verifikasi)
2. Informasi Akademik (multi-turn query refinement)
3. Informasi Program Studi (decision-making support)
4. Prosedur Administratif (step-by-step guidance)
5. Layanan Fasilitas (location-based information)

Setiap skenario memiliki:
- User persona (mahasiswa baru/lama, calon mahasiswa, dll)
- Initial query yang memicu percakapan
- Expected information yang harus diberikan sistem
- Success criteria untuk menentukan task completion
```

#### 4.X.3 Evaluation Metrics

**System-Level Metrics yang diukur**:

```typescript
// Dari types.ts
interface SystemLevelMetrics {
    // Task Completion
    overallTaskCompletionRate: number;      // 0-1, rata-rata task completion
    successfulScenarios: number;            // Jumlah skenario berhasil
    totalScenarios: number;                 // Total skenario

    // Conversation Quality
    averageCoherenceScore: number;          // 0-1, koherensi percakapan
    averageContextRetentionRate: number;    // 0-1, retensi konteks
    averageInformationCoverageRate: number; // 0-1, coverage informasi

    // Performance
    averageLatencyMs: number;               // Rata-rata latency (ms)
    p95LatencyMs: number;                   // P95 latency
    p99LatencyMs: number;                   // P99 latency

    // Errors
    totalErrors: number;                    // Total error
}
```

**Tulis seperti ini**:
```
Metrik evaluasi sistem-level:

A. Task Completion Metrics:
   - Overall Task Completion Rate: Persentase skenario yang diselesaikan
   - Successful Scenarios: Jumlah skenario yang memenuhi success criteria

B. Conversation Quality Metrics:
   - Coherence Score: Skor koherensi percakapan (0-1)
     * Mengukur apakah respons konsisten dengan konteks sebelumnya
   - Context Retention Rate: Persentase informasi konteks yang dipertahankan
     * Mengukur kemampuan sistem mengingat informasi sebelumnya
   - Information Coverage Rate: Persentase informasi yang diberikan
     * Mengukur kelengkapan informasi vs expected information

C. Performance Metrics:
   - Average Latency: Rata-rata waktu respons
   - P95/P99 Latency: Persentil latency untuk worst-case analysis

D. Error Metrics:
   - Total Errors: Jumlah error selama pengujian
   - Error Rate: Persentase error terhadap total skenario
```

#### 4.X.4 LLM-as-a-User Approach

**Tulis seperti ini**:
```
Pendekatan LLM-as-a-User digunakan untuk mensimulasikan pengguna:

1. **User Simulation**: GPT-4 bertindak sebagai pengguna dengan persona spesifik
   - Mengikuti goal-driven behavior
   - Melakukan query refinement alami
   - Memberikan feedback seperti pengguna nyata

2. **Conversation Runner**: Menjalankan dialog multi-turn
   - Mengirim query ke sistem RAG
   - Menerima respons
   - Menghasilkan follow-up query berdasarkan konteks

3. **Automated Evaluation**: LLM-as-a-Judge mengevaluasi hasil
   - Menilai coherence score
   - Mengukur context retention
   - Menentukan task completion

Keuntungan approach ini:
- Reproducible: Hasil konsisten untuk penelitian
- Scalable: Dapat menguji banyak skenario
- Cost-effective: Tidak memerlukan rekrutmen pengguna manual
- Realistic: Mensimulasikan behavior pengguna nyata
```

#### 4.X.5 Execution Procedure

**Tulis seperti ini**:
```
Prosedur eksekusi pengujian:

1. Setup:
   ```bash
   bun scripts/run-simulated-user-tests.ts --all-scenarios
   ```

2. Untuk setiap skenario:
   a. Load scenario configuration
   b. Initialize simulated user dengan persona
   c. Jalankan conversation loop (max 10 turns):
      - User mengirim query
      - Sistem memproses dengan RAG pipeline
      - Sistem memberikan respons
      - User mengevaluasi respons dan lanjutkan/selesai
   d. Evaluasi task completion
   e. Kalkulasi metrics (coherence, retention, coverage)
   f. Log hasil detail

3. Agregasi hasil:
   - Kalkulasi system-level metrics
   - Generate comprehensive report
   - Save to markdown file

4. Output:
   - Markdown report dengan visualisasi
   - Detailed logs untuk analisis
   - Timestamp dan metadata eksekusi
```

---

## 📊 RESULTS

### What to Report

#### 5.X.1 Overall System Performance

**Template laporan**:

```
Hasil pengujian simulated user pada [N] skenario:

- Task Completion Rate: [X]% ([Y]/[N] skenario berhasil)
- Average Coherence Score: [X.XX] (skala 0-1)
- Average Context Retention: [X]%
- Average Information Coverage: [X]%
- Average Latency: [X]ms (P95: [Y]ms, P99: [Z]ms)
- Error Rate: [X]% ([Y]/[N] skenario)
```

**Interpretasi threshold**:
```
Coherence Score:
- ≥ 0.8: Excellent (percakapan sangat koheren)
- 0.6-0.8: Good (percakapan koheren, minor issues)
- < 0.6: Needs Improvement (percakapan tidak koheren)

Context Retention:
- ≥ 80%: Excellent (sistem mengingat konteks dengan baik)
- 60-80%: Good (sistem mengingat sebagian besar konteks)
- < 60%: Needs Improvement (sistem kehilangan konteks)

Latency:
- < 2000ms: Excellent (user experience optimal)
- 2000-4000ms: Acceptable (masih toleransi pengguna)
- > 4000ms: Too Slow (dapat mengganggu pengguna)
```

#### 5.X.2 Per-Scenario Analysis

**Buat tabel seperti ini**:

| Scenario          | Task Completion | Coherence | Retention | Latency (ms) | Status |
| ----------------- | --------------- | --------- | --------- | ------------ | ------ |
| KRS Registration  | 90%             | 0.85      | 85%       | 1800         | ✅      |
| Academic Info     | 85%             | 0.82      | 80%       | 1600         | ✅      |
| Program Info      | 95%             | 0.88      | 90%       | 1900         | ✅      |
| Admin Procedures  | 80%             | 0.78      | 75%       | 2100         | ⚠️      |
| Facility Services | 88%             | 0.83      | 82%       | 1700         | ✅      |

**Analisis per skenario**:
- Identifikasi skenario dengan performance terbaik
- Identifikasi skenario dengan performance terburuk
- Jelaskan mengapa ada perbedaan

#### 5.X.3 Comparison: Component-Level vs System-Level

**Buat tabel perbandingan**:

| Aspect          | RAGAS (Component)                          | Simulated User (System)               |
| --------------- | ------------------------------------------ | ------------------------------------- |
| **Scope**       | Individual RAG components                  | Complete system integration           |
| **Metrics**     | Faithfulness, Relevancy, Precision, Recall | Task Completion, Coherence, Retention |
| **Interaction** | Single-turn Q&A                            | Multi-turn conversation               |
| **Context**     | Independent questions                      | Contextual, sequential queries        |
| **Validation**  | Component correctness                      | End-to-end functionality              |

**Narrative untuk paper**:
```
Evaluasi komponen-level (RAGAS) menunjukkan faithfulness score [X] dan
answer relevancy [Y], memvalidasi bahwa komponen RAG berfungsi dengan baik.

Namun, evaluasi sistem-level (simulated user testing) memberikan perspektif
tambahan dengan task completion rate [Z]%, menunjukkan bahwa komponen yang
valid dapat terintegrasi menjadi sistem yang fungsional.

Kombinasi kedua evaluasi ini memberikan validasi komprehensif:
1. RAGAS membuktikan komponen bekerja secara individual
2. Simulated user membuktikan sistem bekerja secara keseluruhan
3. Bersama-sama, mereka memvalidasi "implementasi" yang diklaim di judul paper
```

#### 5.X.4 Error Analysis

**Kategorikan error yang ditemukan**:

```
Analisis error (jika ada):

1. Retrieval Failures (X%):
   - Sistem tidak menemukan dokumen relevan
   - Penyebab: Query terlalu ambigu atau corpus tidak lengkap

2. Generation Errors (Y%):
   - Sistem gagal menghasilkan respons koheren
   - Penyebab: Konteks terlalu panjang atau prompt tidak optimal

3. Context Loss (Z%):
   - Sistem kehilangan konteks percakapan sebelumnya
   - Penyebab: Manajemen history tidak optimal

4. Timeout/Latency (W%):
   - Respons terlalu lambat (> 5000ms)
   - Penyebab: Reranking atau retrieval terlalu kompleks
```

---

## 💬 DISCUSSION

### What to Discuss

#### 6.X.1 Interpretation of Results

**Template diskusi**:

```
Hasil simulated user testing menunjukkan bahwa sistem dapat menyelesaikan
[X]% tugas pengguna dengan coherence score rata-rata [Y]. Hal ini mengindikasikan
bahwa sistem tidak hanya memiliki komponen RAG yang valid (berdasarkan RAGAS),
tetapi juga mampu mengintegrasikan komponen-komponen tersebut menjadi sistem
yang fungsional untuk use case nyata.

Task completion rate [X]% berada di threshold [Excellent/Good/Needs Improvement],
yang menunjukkan [interpretasi]. Coherence score [Y] mengindikasikan bahwa
sistem mampu [menjaga koherensi percakapan dengan baik / perlu peningkatan
dalam manajemen konteks].

Performance latency rata-rata [Z]ms berada dalam [acceptable range / perlu
optimisasi], dengan P95 latency [W]ms menunjukkan bahwa [mayoritas pengguna
akan mendapat experience yang baik / ada room for improvement untuk worst-case].
```

#### 6.X.2 Strengths of the Implementation

**Highlight kekuatan**:

```
Kekuatan implementasi berdasarkan simulated user testing:

1. **Multi-turn Capability**: Sistem mampu menangani percakapan multi-turn
   dengan context retention [X]%, membuktikan kemampuan agentic RAG dalam
   mempertahankan state percakapan.

2. **Task-Oriented Performance**: Task completion rate [Y]% menunjukkan sistem
   dapat membantu pengguna mencapai goals mereka, tidak hanya menjawab
   pertanyaan isolated.

3. **Consistent Quality**: Coherence score konsisten di berbagai skenario
   ([min]-[max]), menunjukkan robustness implementasi.

4. **Acceptable Latency**: Latency rata-rata [Z]ms memberikan user experience
   yang baik untuk aplikasi chatbot akademik.
```

#### 6.X.3 Limitations and Future Work

**Identifikasi keterbatasan**:

```
Keterbatasan simulated user testing:

1. **LLM-as-a-User Bias**:
   - Simulated user mungkin tidak sepenuhnya mencerminkan behavior pengguna nyata
   - Future work: Validasi dengan user study nyata

2. **Limited Scenario Coverage**:
   - Hanya [N] skenario diuji, belum mencakup semua possible use cases
   - Future work: Ekspansi skenario dan edge cases

3. **Evaluation Subjectivity**:
   - Coherence dan task completion dinilai oleh LLM-as-a-Judge
   - Future work: Human evaluation untuk validasi silang

4. **Single Language Focus**:
   - Hanya menguji Bahasa Indonesia
   - Future work: Multi-language testing
```

#### 6.X.4 Contribution to Research Gap

**Jelaskan kontribusi**:

```
Simulated user testing berkontribusi pada penutupan gap metodologi:

**Gap yang diidentifikasi**:
Paper berjudul "Implementasi..." namun evaluasi sebelumnya hanya fokus pada
komponen RAG, tidak pada sistem lengkap.

**Kontribusi simulated user testing**:
1. ✅ Validasi end-to-end implementation (UI → API → RAG → Response)
2. ✅ Validasi multi-turn conversation capability
3. ✅ Validasi task completion (real user goals)
4. ✅ Validasi system-level integration
5. ✅ Melengkapi evaluasi komponen-level (RAGAS)

**Dampak**:
Dengan kombinasi RAGAS dan simulated user testing, paper dapat mengklaim
"implementasi" yang valid karena telah membuktikan:
- Komponen bekerja (RAGAS)
- Sistem terintegrasi (Simulated User)
- Pengguna dapat menyelesaikan tugas (Task Completion)
```

---

## 📈 FIGURES & TABLES

### Recommended Visualizations

#### Figure X: System-Level Testing Architecture

```
[Diagram showing]:
┌─────────────┐
│ LLM-as-User │ (Simulated User)
└──────┬──────┘
       │ Query
       ▼
┌─────────────┐
│  RAG System │ (Complete Implementation)
│ UI→API→RAG  │
└──────┬──────┘
       │ Response
       ▼
┌─────────────┐
│ LLM-as-Judge│ (Evaluation)
└─────────────┘
```

#### Table X: Simulated User Testing Results

| Metric               | Value | Interpretation |
| -------------------- | ----- | -------------- |
| Task Completion Rate | X%    | [✅/⚠️/❌]        |
| Coherence Score      | X.XX  | [✅/⚠️/❌]        |
| Context Retention    | X%    | [✅/⚠️/❌]        |
| Information Coverage | X%    | [✅/⚠️/❌]        |
| Average Latency      | Xms   | [✅/⚠️/❌]        |
| P95 Latency          | Xms   | [✅/⚠️/❌]        |

#### Figure X: Comparison - Component vs System Evaluation

```
[Venn diagram or side-by-side comparison showing]:

Component-Level (RAGAS):
- Faithfulness
- Answer Relevancy
- Context Precision/Recall
✓ Validates components work

System-Level (Simulated User):
- Task Completion
- Coherence
- Context Retention
✓ Validates system works

Intersection:
Both validate the IMPLEMENTATION
```

---

## 🎯 KEY MESSAGES FOR PAPER

### Executive Summary Points

1. **Why Simulated User Testing?**
   - Title claims "Implementasi" → need system-level validation
   - RAGAS validates components, simulated user validates integration
   - Together: complete validation of implementation

2. **What Was Tested?**
   - [N] realistic scenarios covering major use cases
   - Multi-turn conversations (up to 10 turns)
   - Task completion, coherence, context retention, performance

3. **What Were the Results?**
   - Task completion rate: [X]%
   - Coherence score: [Y]
   - Latency: [Z]ms (acceptable for chatbot)
   - System successfully integrates all components

4. **What Does This Mean?**
   - Implementation is validated at both component and system levels
   - System can handle realistic user interactions
   - Ready for deployment and real-world usage
   - Methodology gap addressed

---

## 📚 REFERENCES

### Papers to Cite

1. **LLM-as-a-Judge**:
   - Zheng et al. "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena"
   - Justifikasi: Using LLM for evaluation

2. **User Simulation**:
   - Research on using LLMs to simulate user behavior
   - Justifikasi: LLM-as-a-User approach

3. **System-Level Evaluation**:
   - Papers on end-to-end evaluation of conversational AI
   - Justifikasi: Why component-level evaluation is not enough

4. **Multi-turn Conversation Evaluation**:
   - Papers on evaluating coherence and context retention
   - Justifikasi: Metrics used in simulated user testing

---

## ✅ CHECKLIST SEBELUM MENULIS

- [ ] Hasil simulated user testing sudah di-run dan saved
- [ ] Report markdown sudah di-generate
- [ ] Metrics sudah dicatat dengan baik
- [ ] Screenshots/visualizations sudah diambil (jika perlu)
- [ ] Error analysis sudah dilakukan
- [ ] Comparison dengan RAGAS sudah disiapkan
- [ ] Justifikasi mengapa perlu simulated user testing sudah clear
- [ ] Keterbatasan sudah diidentifikasi
- [ ] Future work sudah direncanakan

---

## 🚀 QUICK START MENULIS

### Struktur Minimal yang Harus Ada

**Di Methods**:
- Subsection tentang simulated user testing
- Jelaskan configuration, scenarios, metrics
- Jelaskan LLM-as-a-User approach
- Jelaskan execution procedure

**Di Results**:
- Table dengan system-level metrics
- Per-scenario analysis
- Comparison dengan RAGAS
- Error analysis (jika ada)

**Di Discussion**:
- Interpretasi hasil
- Kekuatan implementasi
- Keterbatasan dan future work
- Kontribusi pada penutupan gap metodologi

---

*Dokumen ini adalah panduan komprehensif untuk menulis hasil simulated user testing dalam paper IMRAD. Sesuaikan dengan hasil aktual dan guidelines journal target.*
