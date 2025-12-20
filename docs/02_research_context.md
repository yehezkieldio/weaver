# Konteks Penelitian dan Tujuan

## 1. Latar Belakang Penelitian

### 1.1 Evolusi Sistem Tanya Jawab

Sistem tanya jawab (Question Answering Systems) telah mengalami evolusi signifikan dari pendekatan berbasis aturan hingga model bahasa besar (Large Language Models). Namun, LLM konvensional menghadapi beberapa keterbatasan fundamental:

1. **Knowledge Cutoff**: Pengetahuan terbatas pada data pelatihan dengan batas waktu tertentu
2. **Halusinasi**: Kecenderungan menghasilkan informasi yang terdengar masuk akal namun faktual salah
3. **Kurangnya Transparansi**: Ketidakmampuan menyediakan sumber untuk klaim yang dibuat
4. **Domain Generality**: Performa suboptimal pada domain khusus tanpa fine-tuning

### 1.2 Paradigma Retrieval-Augmented Generation (RAG)

RAG muncul sebagai solusi untuk mengatasi keterbatasan di atas dengan mengintegrasikan komponen retrieval eksternal ke dalam pipeline generasi. Konsep ini pertama kali diperkenalkan oleh Lewis et al. (2020) dalam paper "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks".

```
Paradigma RAG:
Query → Retrieval → Context Augmentation → Generation → Answer
```

### 1.3 Munculnya Agentic RAG

Evolusi lebih lanjut memperkenalkan konsep "Agentic RAG" di mana sistem memiliki kemampuan untuk:
- Merencanakan strategi retrieval secara dinamis
- Mendekomposisi query kompleks menjadi sub-query
- Menggunakan tools secara iteratif
- Melakukan verifikasi dan validasi

---

## 2. Gap dalam Pengetahuan

### 2.1 Keterbatasan Penelitian Existing

| Area                     | Gap yang Teridentifikasi                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| **Bahasa Indonesia**     | Mayoritas penelitian RAG fokus pada bahasa Inggris; resource untuk bahasa Indonesia terbatas       |
| **Domain Akademik**      | Kurangnya benchmark dan evaluasi untuk domain informasi akademik perguruan tinggi                  |
| **Hybrid Retrieval**     | Penelitian terbatas tentang fusion optimal antara vector dan keyword search untuk bahasa Indonesia |
| **Agentic Systems**      | Belum ada studi sistematis tentang benefit agentic approach untuk information retrieval            |
| **Evaluation Framework** | Framework evaluasi yang ada belum mengakomodir karakteristik unik domain akademik Indonesia        |

### 2.2 Tantangan Spesifik Domain

Domain informasi akademik universitas Indonesia memiliki karakteristik unik yang belum terakomodir oleh sistem existing:

1. **Terminologi Administratif**: NIM, SKS, UKT, KRS, KHS, SNBP, SNBT, dll.
2. **Pola Dokumen**: RPS (Rencana Pembelajaran Semester), buku pedoman, peraturan rektor
3. **Sinonim Indonesia**: prosedur ≈ tata cara ≈ mekanisme ≈ alur
4. **Struktur Hierarkis**: Fakultas → Program Studi → Konsentrasi
5. **Campuran Bahasa**: Dokumen sering mencampurkan Indonesia dan Inggris

---

## 3. Tujuan Penelitian

### 3.1 Tujuan Primer

**Mengembangkan dan mengevaluasi sistem RAG komprehensif untuk domain informasi akademik universitas Indonesia yang mengintegrasikan:**

1. Hybrid retrieval (vector + keyword) dengan optimasi untuk bahasa Indonesia
2. Agentic capabilities untuk query kompleks
3. Multi-strategy reranking untuk presisi tinggi
4. Guardrails untuk keamanan dan kepatuhan
5. Framework evaluasi berbasis RAGAS

### 3.2 Tujuan Sekunder

| ID  | Tujuan                                                       | Metrik Sukses           |
| --- | ------------------------------------------------------------ | ----------------------- |
| T1  | Mencapai faithfulness score ≥ 0.85                           | RAGAS Faithfulness      |
| T2  | Mengurangi hallucination rate ≤ 0.15                         | Hallucination Rate      |
| T3  | Membuktikan superioritas hybrid vs single-method retrieval   | Paired t-test, p < 0.05 |
| T4  | Mengidentifikasi konfigurasi optimal via ablation study      | ANOVA, effect size      |
| T5  | Memvalidasi korelasi automated metrics dengan human judgment | Pearson/Spearman r      |

### 3.3 Research Questions

1. **RQ1**: Seberapa efektif hybrid retrieval (vector + BM25) dibandingkan single-method retrieval untuk domain akademik Indonesia?

2. **RQ2**: Apakah agentic mode meningkatkan kualitas jawaban untuk pertanyaan kompleks secara signifikan?

3. **RQ3**: Strategi reranking mana yang memberikan trade-off terbaik antara kualitas dan latensi?

4. **RQ4**: Bagaimana karakteristik dokumen mempengaruhi pemilihan strategi chunking optimal?

5. **RQ5**: Seberapa valid metrik RAGAS otomatis dibandingkan penilaian manusia untuk domain ini?

---

## 4. Hipotesis Penelitian

### 4.1 Hipotesis Utama

> **H1**: Sistem RAG dengan hybrid retrieval dan agentic capabilities akan mencapai faithfulness score yang secara signifikan lebih tinggi (p < 0.05) dibandingkan baseline LLM tanpa RAG untuk domain informasi akademik Indonesia.

### 4.2 Hipotesis Pendukung

| ID  | Hipotesis                                                          | Variabel Independen | Variabel Dependen         |
| --- | ------------------------------------------------------------------ | ------------------- | ------------------------- |
| H2  | Hybrid retrieval > vector-only retrieval                           | Strategi retrieval  | Context Recall, Precision |
| H3  | Reranking meningkatkan precision tanpa degradasi recall signifikan | Penggunaan reranker | Precision@K, NDCG         |
| H4  | Agentic mode meningkatkan kualitas untuk query kompleks            | Mode operasi        | Answer Correctness        |
| H5  | Semantic chunking > recursive chunking untuk dokumen terstruktur   | Strategi chunking   | Faithfulness              |
| H6  | Guardrails mengurangi hallucination rate                           | Aktivasi guardrails | Hallucination Rate        |

---

## 5. Kontribusi Ilmiah

### 5.1 Kontribusi Teoritis

1. **Framework Evaluasi Domain-Specific**: Pengembangan metrik evaluasi yang mengakomodir karakteristik unik domain akademik Indonesia.

2. **Analisis Hybrid Retrieval**: Studi sistematis tentang weight optimal untuk fusion vector dan BM25 pada bahasa Indonesia.

3. **Agentic RAG Architecture**: Dokumentasi arsitektur agentic RAG dengan parallel tool execution untuk efisiensi.

### 5.2 Kontribusi Praktis

1. **Implementasi Reference**: Codebase open-source sebagai referensi implementasi RAG untuk Bahasa Indonesia.

2. **Benchmark Dataset**: Kumpulan pertanyaan evaluasi untuk domain akademik Indonesia dengan ground truth.

3. **Best Practices**: Dokumentasi best practices untuk setiap komponen (chunking, retrieval, reranking).

### 5.3 Kontribusi Metodologis

1. **Ablation Study Framework**: Metodologi sistematis untuk mengevaluasi kontribusi setiap komponen RAG.

2. **Statistical Analysis Pipeline**: Pipeline analisis statistik otomatis dengan assumption testing dan adaptive test selection.

---

## 6. Limitasi Penelitian

### 6.1 Limitasi Scope

| Aspek         | Limitasi                     | Justifikasi                                |
| ------------- | ---------------------------- | ------------------------------------------ |
| **Bahasa**    | Fokus pada Bahasa Indonesia  | Target deployment di universitas Indonesia |
| **Domain**    | Informasi akademik umum      | Tidak mencakup konten riset spesifik       |
| **LLM**       | Azure OpenAI (GPT-4o series) | Konsistensi dengan production deployment   |
| **Embedding** | text-embedding-3-small       | Balance antara kualitas dan biaya          |

### 6.2 Limitasi Metodologis

1. **Fokus pada Automated Evaluation**: Meskipun evaluasi kegunaan berpusat pada manusia (*human-centered usability evaluation*) bernilai, penelitian ini secara sengaja memprioritaskan evaluasi otomatis dan terukur (*automated and reproducible evaluation*) untuk memastikan skalabilitas, objektivitas, dan keterulangan hasil (*repeatability*). Pendekatan ini sejalan dengan praktik evaluasi terkini dalam penelitian *Retrieval-Augmented Generation* modern di mana metrik sistem (RAGAS + Simulated User) menjadi standar primer.

2. **LLM-as-Judge Bias**: Metrik otomatis mungkin memiliki bias sistematis yang berbeda dari human judgment. Hal ini dimitigasi dengan penggunaan model *state-of-the-art* (GPT-4o) sebagai evaluator.

3. **Sample Size**: Jumlah pertanyaan evaluasi (50) mungkin tidak cukup untuk generalisasi broad, namun valid secara statistik untuk *comparative analysis*.

4. **Document Corpus**: Evaluasi terbatas pada dokumen yang di-upload; tidak mencakup semua dokumen universitas.

5. **Temporal Validity**: Informasi akademik berubah setiap semester; evaluasi mencerminkan snapshot waktu tertentu.

### 6.3 Mitigasi Limitasi

| Limitasi          | Mitigasi                                                                 |
| ----------------- | ------------------------------------------------------------------------ |
| LLM-as-Judge Bias | Validasi dengan human annotation dan correlation analysis                |
| Sample Size       | Power analysis untuk minimum sample size; bootstrap CI untuk uncertainty |
| Document Coverage | Sampling stratified berdasarkan kategori dokumen                         |
| Temporal Validity | Timestamp pada semua evaluasi; reproducibility via versioning            |

---

## 7. Roadmap Penelitian

### 7.1 Fase Completed

- [x] Implementasi core RAG pipeline
- [x] Hybrid retrieval dengan vector + BM25
- [x] Multi-strategy reranking
- [x] Agentic mode dengan parallel tools
- [x] RAGAS evaluation framework
- [x] Statistical analysis pipeline
- [x] Guardrails system

### 7.2 Fase In Progress

- [ ] Human annotation untuk validasi
- [ ] Ablation study execution
- [ ] Statistical significance testing
- [ ] Documentation and reporting

### 7.3 Future Work

- [ ] Fine-tuning embedding model untuk domain akademik
- [ ] Multi-lingual support (Indonesia + Inggris)
- [ ] Integration dengan sistem akademik universitas
- [ ] Adaptive chunking berdasarkan document type
- [ ] Continuous learning dari user feedback

---

## 8. Referensi Silang Dokumentasi

| Dokumen                                                    | Relevansi                     |
| ---------------------------------------------------------- | ----------------------------- |
| [01_overview.md](./01_overview.md)                         | Ringkasan eksekutif sistem    |
| [03_key_features.md](./03_key_features.md)                 | Detail implementasi fitur     |
| [06_evaluation_framework.md](./06_evaluation_framework.md) | Framework evaluasi RAGAS      |
| [08_statistical_analysis.md](./08_statistical_analysis.md) | Metodologi analisis statistik |

---

*Dokumen ini merupakan bagian dari dokumentasi teknis Academic Research RAG Chatbot.*
