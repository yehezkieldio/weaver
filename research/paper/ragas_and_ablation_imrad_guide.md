# Panduan Penulisan Evaluasi RAGAS & Ablation Study dalam Format IMRAD

**Dokumen ini**: Panduan untuk menulis hasil evaluasi komponen (RAGAS) dan studi ablasi dalam paper "Implementasi Agentic Retrieval-Augmented Generation (RAG) Untuk Sistem Layanan Informasi Perguruan Tinggi".

---

## 🎯 Posisi dalam Paper

Evaluasi ini adalah **pondasi kuantitatif** paper yang menjawab pertanyaan "seberapa akurat dan efektif sistem ini?". Berbeda dengan Simulated User Testing (level sistem/interaksi), bagian ini fokus pada **validitas teknis** dan **kontribusi komponen**.

- **RAGAS**: Menjawab "Apakah jawaban sistem setia pada fakta dan relevan?"
- **Ablation Study**: Menjawab "Apakah setiap komponen (Hybrid, Reranker, Agentic) benar-benar memberikan peningkatan?"

---

## 📝 INTRODUCTION

### What to Write

**Masalah yang Diangkat**:
```
Tantangan utama sistem RAG adalah halusinasi (generasi tanpa dasar fakta) dan
kegagalan retrieval (konteks yang salah). Evaluasi manual tidak scalable,
sehingga diperlukan evaluasi otomatis berbasis metrik terstandar.
Selain itu, kompleksitas sistem RAG modern (Hybrid, Reranking, Agentic) menimbulkan
pertanyaan mengenai trade-off antara akurasi dan latensi/biaya.
```

**Research Questions (RQ) yang Dijawab**:
1. **RQ1**: Seberapa efektif sistem RAG dalam meningkatkan akurasi jawaban dibandingkan LLM dasar?
2. **RQ2**: Bagaimana kontribusi metode *Hybrid Retrieval* dan *Reranking* terhadap kualitas konteks?
3. **RQ3**: Apakah *Agentic Workflow* memberikan peningkatan signifikan dibandingkan pipeline RAG standar?

### Key Points to Mention
1. **Framework RAGAS**: Standar industri menggunakan LLM-as-a-Judge.
2. **Comprehensive Metrics**: Mengukur Retrieval (Precision/Recall) dan Generation (Faithfulness/Relevancy).
3. **Systematic Ablation**: Mengisolasi variabel untuk membuktikan efektivitas desain.

---

## 🔬 METHODS

### Subsection: Evaluation Dataset & Framework

#### 3.X.1 Evaluation Dataset
**Yang perlu dijelaskan**:
- Dataset terdiri dari **50 pertanyaan akademik** yang dikurasi.
- Mencakup berbagai kategori: Prosedur Akademik, Info Biaya, Kurikulum, Fasilitas, Syarat Pendaftaran.
- Setiap pertanyaan memiliki **Ground Truth** (jawaban referensi) dan **Supporting Documents** (dokumen sumber yang benar).

#### 3.X.2 RAGAS Metrics
**Jelaskan metrik yang digunakan (singkat saja, referensi ke teori):**
1. **Generation Metrics**:
   - *Faithfulness*: Bebas dari halusinasi (fakta ada di konteks).
   - *Answer Relevancy*: Jawaban nyambung dengan pertanyaan.
   - *Answer Correctness*: Akurasi semantik vs Ground Truth.
2. **Retrieval Metrics**:
   - *Context Precision*: Dokumen relevan ada di ranking atas.
   - *Context Recall*: Konteks yang diambil mencakup semua info yang dibutuhkan.

### Subsection: Ablation Study Design

#### 3.X.3 Experimental Configurations
Jelaskan **9 konfigurasi** yang diuji untuk mengisolasi variabel:

1. **Baseline**:
   - `No RAG` (LLM Only): Mengukur pengetahuan parametrik model.

2. **Retrieval Variations** (menguji dampak strategi pencarian):
   - `Vector Only`: Dense retrieval saja.
   - `BM25 Only`: Keyword retrieval saja.
   - `Hybrid (No Rerank)`: Gabungan Vector + BM25 (RRF).

3. **Reranking Variations** (menguji dampak perbaikan ranking):
   - `Hybrid + Cross-Encoder`: Reranking presisi tinggi (lambat).
   - `Hybrid + LLM Rerank`: Reranking semantic (mahal).
   - `Hybrid + Ensemble`: Kombinasi optimal (metode yang diusulkan).

4. **System Architecture Variations** (menguji dampak arsitektur):
   - `Agentic Mode`: Multi-step reasoning.
   - `Full System`: Implementasi lengkap (Hybrid + Ensemble + Agentic + Guardrails).

#### 3.X.4 Statistical Analysis
Sebutkan penggunaan **One-Way ANOVA** dan **Tukey HSD Post-hoc Test** untuk memvalidasi signifikansi perbedaan antar konfigurasi (p < 0.05).

---

## 📊 RESULTS

### What to Report

#### 4.X.1 Overall Performance (Full System)
Laporkan kinerja konfigurasi terbaik (`Full System`) sebagai hasil utama.

**Template**:
```
Sistem usulan (Full System) mencapai skor Answer Correctness sebesar [0.XX] dan
Faithfulness [0.XX]. Kinerja retrieval menunjukkan Context Recall [0.XX] dan
Context Precision [0.XX], mengindikasikan kemampuan sistem mengambil dokumen
yang tepat secara konsisten.
```

#### 4.X.2 Impact of Retrieval Strategy (Ablation 1)
Bandingkan `Vector`, `BM25`, dan `Hybrid`.

**Narrative**:
- `Vector Only` unggul di pertanyaan konseptual tapi lemah di *exact match* (nama mata kuliah, kode).
- `BM25 Only` unggul di *exact keyword* tapi gagal di pertanyaan semantik.
- `Hybrid` memberikan keseimbangan terbaik, meningkatkan *Context Recall* sebesar [X]% dibanding Vector Only.

#### 4.X.3 Impact of Reranking (Ablation 2)
Bandingkan `Hybrid (No Rerank)` vs `Ensemble Rerank`.

**Narrative**:
- Penambahan *Ensemble Reranking* meningkatkan *Context Precision* secara signifikan ([X] ke [Y]).
- Hal ini membuktikan bahwa reranking efektif memfilter *noise* dari hasil hybrid retrieval, memastikan LLM hanya mendapat konteks relevan.

#### 4.X.4 Impact of Agentic Reasoning (Ablation 3)
Bandingkan `Agentic Mode` vs `Standard RAG`.

**Narrative**:
- `Agentic Mode` menunjukkan peningkatan pada *Answer Correctness* untuk pertanyaan kompleks multi-hop.
- Namun, trade-off terlihat pada **Latensi** (naik [X] ms) dan **Biaya** (naik [Y] token).

#### 4.X.5 Latency & Efficiency Analysis
Sajikan data operasional.

**Tabel Latensi**:
| Configuration | Avg Latency (ms) | Tokens/Sec | Cost Impact |
|---------------|------------------|------------|-------------|
| No RAG        | 500              | 80         | Low         |
| Hybrid RAG    | 1200             | 45         | Medium      |
| Agentic RAG   | 3500             | 30         | High        |

---

## 💬 DISCUSSION

### What to Discuss

#### 5.X.1 Significance of Hybrid Retrieval
Diskusi:
```
Hasil menunjukkan bahwa Hybrid Retrieval secara statistik lebih unggul daripada
metode tunggal (p < 0.05). Ini mengonfirmasi bahwa domain akademik membutuhkan
kombinasi pencarian semantik (untuk konsep) dan leksikal (untuk entitas kode/nama).
```

#### 5.X.2 The Reranking Trade-off
Diskusi:
```
Meskipun Reranking menambah latensi [X]ms, peningkatan *Faithfulness* dan *Precision*
sangat krusial untuk mencegah misinformasi akademik. Dalam konteks institusi,
akurasi > kecepatan instan.
```

#### 5.X.3 Effectiveness of Agentic Workflow
Diskusi:
```
Agentic mode terbukti efektif menangani pertanyaan ambigu yang membutuhkan
klarifikasi atau pencarian bertahap. Meskipun lebih lambat, kapabilitas ini
penting untuk meniru interaksi manusia (petugas layanan) yang cerdas.
```

#### 5.X.4 Comparison with Baseline
Diskusi:
```
Dibandingkan Baseline (No RAG) yang memiliki Answer Correctness [Low Score] dan
Faithfulness [Low Score], implementasi RAG meningkatkan akurasi faktual secara
drastis. Ini memvalidasi kebutuhan RAG untuk knowledge-intensive task seperti ini.
```

---

## 📈 FIGURES & TABLES

### Recommended Visualizations

#### Figure 1: Ablation Study Comparison Chart
Grafik batang (Bar Chart) yang membandingkan **Answer Correctness** dan **Context Recall** untuk 5 konfigurasi kunci:
1. No RAG
2. Vector Only
3. Hybrid (No Rerank)
4. Hybrid + Ensemble
5. Full System (Agentic)

#### Table 1: Detailed RAGAS Metrics
| Configuration | Faithfulness | Ans. Relevancy | Ctx. Precision | Ctx. Recall | Ans. Correctness |
|---------------|--------------|----------------|----------------|-------------|------------------|
| No RAG        | 0.45         | 0.80           | N/A            | N/A         | 0.50             |
| ...           | ...          | ...            | ...            | ...         | ...              |
| Full System   | **0.95**     | **0.98**       | **0.92**       | **0.94**    | **0.96**         |

#### Figure 2: Latency vs Performance Scatter Plot
- Sumbu X: Latency (ms)
- Sumbu Y: Answer Correctness
- Titik: Konfigurasi eksperimen
- *Insight*: Menunjukkan "Pareto Frontier" (mana yang paling efisien).

---

## ✅ CHECKLIST SEBELUM MENULIS

- [ ] Data evaluasi (CSV/JSON) dari `scripts/run-statistical-analysis.ts` sudah ada.
- [ ] Nilai rata-rata metrik per konfigurasi sudah dihitung.
- [ ] Hasil uji signifikansi (p-value) sudah ada (jika script mendukung).
- [ ] Grafik perbandingan sudah di-generate.
- [ ] Analisis trade-off latensi vs akurasi sudah siap.

---

*Gunakan panduan ini bersamaan dengan `simulated_user_testing_imrad_guide.md` untuk menyusun bab Results dan Discussion yang utuh.*
