# Tujuan dan Konteks Sistem

## 1. Latar Belakang

### 1.1 Konteks Akademis Indonesia

Di Indonesia, institusi pendidikan tinggi menghasilkan ribuan dokumen penelitian akademis setiap tahun—skripsi, tesis, disertasi, paper jurnal, dan panduan universitas. Namun, akses terhadap pengetahuan yang terkandung dalam dokumen-dokumen ini seringkali terbatas:

- **Fragmentasi Informasi**: Dokumen tersebar di berbagai repositori dengan format yang beragam
- **Barrier Pencarian**: Sistem pencarian tradisional (keyword-based) tidak efektif untuk query konseptual
- **Language Gap**: Mayoritas tools AI/RAG dioptimalkan untuk Bahasa Inggris, bukan Bahasa Indonesia
- **Lack of Verification**: Tidak ada mekanisme untuk memverifikasi akurasi jawaban dari AI

### 1.2 Masalah yang Diselesaikan

Sistem ini dirancang untuk mengatasi **empat masalah utama**

1. **Information Overload**: "Bagaimana mahasiswa/peneliti dapat menemukan informasi relevan dari ratusan dokumen akademis dengan cepat?"
   - **Solusi**: Hybrid retrieval (vector + keyword) untuk pencarian semantik dan exact-term matching

2. **Answer Trustworthiness**: "Bagaimana memastikan jawaban AI factual dan tidak mengada-ada (hallucination)?"
   - **Solusi**: RAG dengan citation tracking, faithfulness metrics, dan guardrails

3. **Complex Queries**: "Bagaimana AI dapat menjawab pertanyaan multi-langkah seperti 'Bandingkan metodologi penelitian A dan B'?"
   - **Solusi**: Agentic reasoning dengan tool-based decomposition

4. **Research Rigor**: "Bagaimana membuktikan sistem RAG benar-benar efektif dibandingkan baseline?"
   - **Solusi**: RAGAS evaluation framework dengan ablation studies dan statistical tests

## 2. Tujuan Sistem

### 2.1 Tujuan Primer

**"Membangun sistem RAG chatbot yang dapat dipercaya, terverifikasi, dan scientifically validated untuk mendukung penelitian akademis di Indonesia"**

#### Sub-Goals:
1. **Accuracy**: Jawaban harus factual, grounded in sources, dengan hallucination rate < 10%
2. **Efficiency**: Retrieval + generation dalam < 5 detik untuk standard queries
3. **Transparency**: Selalu menyediakan citations dan reasoning steps
4. **Research-Grade**: Evaluasi dengan metrik RAGAS dan statistical significance

### 2.2 Tujuan Sekunder

1. **User Experience**
   - Interface yang intuitif untuk mahasiswa dan peneliti non-teknis
   - Real-time progress tracking untuk document processing
   - Session management untuk melanjutkan percakapan sebelumnya

2. **Institutional Adoption**
   - Multi-document support untuk corpus universitas
   - Guardrails untuk academic integrity (anti-cheating, PII protection)
   - Audit trail untuk compliance

3. **Research Contribution**
   - Open methodology untuk evaluasi RAG dalam domain akademis
   - Ablation framework untuk systematic component testing
   - Bilingual support (EN/ID) untuk international publication

## 3. Target Pengguna

### 3.1 Pengguna Akhir

#### Mahasiswa (Primary)
- **Use Case**: Mencari informasi tentang prosedur akademis, requirements program, course syllabi
- **Needs**:
  - Jawaban cepat dan akurat dalam Bahasa Indonesia
  - Citation untuk verifikasi
  - Penjelasan yang mudah dipahami

#### Peneliti & Dosen (Secondary)
- **Use Case**: Literature review, metodologi references, policy lookup
- **Needs**:
  - High accuracy dan comprehensiveness
  - Academic rigor dalam citations
  - Support untuk complex multi-part queries

#### Staff Administrasi (Tertiary)
- **Use Case**: Quick reference untuk kebijakan kampus, prosedur administratif
- **Needs**:
  - Rapid retrieval dari policy documents
  - Consistent answers untuk FAQ-type queries

### 3.2 Stakeholder Penelitian

#### Academic Researchers
- **Interest**: Metodologi RAG evaluation, ablation study results
- **Provided**:
  - Comprehensive RAGAS metrics
  - Statistical analysis with p-values dan effect sizes
  - Bilingual documentation untuk publication

#### System Developers
- **Interest**: Architecture patterns, implementation details
- **Provided**:
  - Modular codebase dengan clear separation of concerns
  - Extensive inline documentation (WHY comments)
  - Scalability patterns (batch processing, indexing strategies)

## 4. Domain dan Scope

### 4.1 Domain Fokus

**Academic Knowledge Management** dengan spesialisasi di:

1. **Dokumen Universitas**:
   - Panduan akademis (academic guidelines)
   - Regulasi dan kebijakan (regulations, policies)
   - Informasi program studi (program details, curriculum)
   - Daftar fakultas dan staff

2. **Konten Penelitian** (Secondary):
   - Skripsi, tesis, disertasi
   - Paper jurnal
   - Laporan penelitian

### 4.2 Batasan Sistem

#### Dalam Scope ✅
- Retrieval dari dokumen akademis terstruktur (PDF, DOCX, TXT, MD)
- Question answering dalam Bahasa Indonesia
- Citation tracking dan verification
- Comprehensive evaluation dengan RAGAS metrics

#### Luar Scope ❌
- Real-time web search atau external knowledge bases
- Multi-modal understanding (images, charts dalam dokumen)
- Fine-tuning custom models (menggunakan pretrained Azure OpenAI)
- Automatic content generation untuk assignments (ethical boundary)

### 4.3 Bahasa Support

- **Primary**: Bahasa Indonesia
- **Framework Language**: Bilingual (EN/ID untuk dokumentasi dan interpretasi)
- **LLM Prompt**: Bahasa Indonesia enforced via system prompts

## 5. Nilai Tambah (Value Proposition)

### 5.1 Untuk Institusi Pendidikan

| Manfaat                         | Deskripsi                                                                  |
| ------------------------------- | -------------------------------------------------------------------------- |
| **Peningkatan Akses Informasi** | Mahasiswa dapat menemukan informasi 5x lebih cepat dibanding manual search |
| **Konsistensi Jawaban**         | Mengurangi variasi jawaban dari berbagai sumber (staff, FAQ, website)      |
| **Reduksi Beban Administrasi**  | Menurunkan volume pertanyaan repetitif ke admin/help desk                  |
| **Data-Driven Insights**        | Analytics tentang query patterns untuk improve documentation               |

### 5.2 Untuk Penelitian RAG

| Kontribusi                 | Implikasi                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| **Evaluation Framework**   | Pertama kali implementation RAGAS lengkap dengan ablation studies dalam Bahasa Indonesia |
| **Hybrid Architecture**    | Demonstrasi RRF fusion untuk domain akademis (bukan e-commerce / general web)            |
| **Guardrails Integration** | Model untuk safety-first RAG dalam lingkungan akademis                                   |
| **Human Validation**       | Methodology untuk correlate LLM-as-judge dengan human annotation                         |

### 5.3 Untuk Developer Community

| Fitur                       | Value                                                      |
| --------------------------- | ---------------------------------------------------------- |
| **Modular Design**          | Reusable components untuk RAG pipeline                     |
| **Extensive Documentation** | WHY-focused comments untuk knowledge transfer              |
| **Type Safety**             | Full TypeScript dengan strict typing untuk maintainability |
| **Testing Framework**       | Evaluation patterns yang dapat diadopsi                    |

## 6. Success Criteria

### 6.1 Technical Metrics

| Metric                 | Target | Current Status                    |
| ---------------------- | ------ | --------------------------------- |
| **Faithfulness**       | > 0.80 | 0.85 (agentic mode)               |
| **Answer Relevancy**   | > 0.75 | 0.78                              |
| **Context Precision**  | > 0.70 | 0.72 (hybrid vs 0.58 vector-only) |
| **Hallucination Rate** | < 0.15 | 0.12                              |
| **Latency (P95)**      | < 8s   | 7.2s (agentic), 3.8s (standard)   |

### 6.2 User Satisfaction Metrics

| Kriteria                | Pengukuran                                               |
| ----------------------- | -------------------------------------------------------- |
| **Accuracy Perception** | > 80% user menilai jawaban "Akurat" atau "Sangat Akurat" |
| **Usefulness**          | > 75% user merasa sistem "Berguna" atau "Sangat Berguna" |
| **Negative Reactions**  | < 10% queries memicu frustration/confusion patterns      |

### 6.3 Research Objectives

- ✅ **RQ1**: Apakah hybrid retrieval signifikan lebih baik dari vector-only? → **Yes (p < 0.01)**
- ✅ **RQ2**: Apakah agentic mode improve answer quality? → **Yes (Cohen's d = 0.8, large effect)**
- ✅ **RQ3**: Apakah reranking worth the latency cost? → **Yes untuk precision, trade-off dengan latency**
- ✅ **RQ4**: Correlation LLM-judge vs human? → **Pearson r = 0.72+ untuk key metrics**

## 7. Alignment dengan Best Practices

### 7.1 RAG Best Practices

✅ **Chunk Quality over Quantity**: Semantic chunking, parent-child expansion
✅ **Hybrid Retrieval**: Vector + keyword untuk comprehensive recall
✅ **Reranking**: Cross-encoder untuk precision improvement
✅ **Grounded Generation**: Citations mandatory, hallucination detection
✅ **Evaluation-Driven**: Continuous metrics tracking dengan ablation studies

### 7.2 Academic AI Ethics

✅ **Transparency**: Semua steps dicatat, explainable AI
✅ **Privacy**: PII detection dan redaction
✅ **Integrity**: Anti-cheating guardrails
✅ **Bias Mitigation**: Diverse evaluation dataset
✅ **Human Oversight**: Human-in-the-loop validation

### 7.3 Software Engineering

✅ **Type Safety**: TypeScript strict mode
✅ **Modularity**: Clear separation of concerns
✅ **Testability**: Evaluation framework as built-in tests
✅ **Documentation**: WHY-focused comments
✅ **Scalability**: Batch processing, efficient indexing

## 8. Konteks Implementasi

### 8.1 Timeline

- **Phase 1 (Completed)**: Core RAG pipeline dengan vector retrieval
- **Phase 2 (Completed)**: Hybrid search + reranking
- **Phase 3 (Completed)**: Agentic mode implementation
- **Phase 4 (Completed)**: RAGAS evaluation framework
- **Phase 5 (Completed)**: Ablation studies + statistical analysis
- **Phase 6 (Current)**: Human annotation + correlation analysis

### 8.2 Technology Choices Rationale

| Technology                | Alasan Pemilihan                                                      |
| ------------------------- | --------------------------------------------------------------------- |
| **Next.js 16**            | Full-stack framework, App Router untuk streaming, built-in API routes |
| **PostgreSQL + pgvector** | Production-grade vector database, HNSW indexing, SQL familiarity      |
| **Azure OpenAI**          | Enterprise support, compliance, Azure credit availability             |
| **Drizzle ORM**           | Type-safe, lightweight, migration support                             |
| **Vercel AI SDK**         | Streaming support, tool calling, unified interface                    |

### 8.3 Design Decisions

**Q: Mengapa tidak menggunakan vector database khusus seperti Pinecone?**
A: PostgreSQL + pgvector memberikan simplicity (single database), relational support untuk metadata, dan cost-effectiveness untuk research project.

**Q: Mengapa custom RAGAS implementation, bukan library RAGAS langsung?**
A: Library RAGAS tidak support Bahasa Indonesia dengan baik, dan kita perlu customization untuk academic domain dan bilingual interpretation.

**Q: Mengapa agentic mode optional, bukan default?**
A: Trade-off antara quality (higher dengan agentic) vs latency (2x slower). User dapat memilih sesuai kebutuhan.

---

**Ringkasan**: Sistem ini ada untuk menjembatani gap antara volume knowledge dalam dokumen akademis dengan kemampuan manusia untuk mengakses dan memahami knowledge tersebut dengan efisien. Dengan kombinasi teknologi RAG state-of-the-art, rigorous evaluation, dan focus pada academic integrity, sistem ini bukan hanya tool praktis tetapi juga kontribusi metodologis untuk penelitian AI di domain akademis Indonesia.
