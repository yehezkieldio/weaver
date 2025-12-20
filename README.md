# MuliaChat: Sistem Agentic RAG untuk Informasi Akademik Universitas Mulia

**MuliaChat** adalah platform *Question Answering* (QA) berbasis *Large Language Model* (LLM) yang dirancang khusus untuk domain akademik Universitas Mulia. Sistem ini mengimplementasikan arsitektur **Agentic Retrieval-Augmented Generation (RAG)** untuk mengatasi keterbatasan *hallucination* pada LLM standar dan memberikan jawaban yang akurat, terverifikasi, serta memiliki sitasi yang dapat dilacak ke dokumen resmi universitas.

Proyek ini dikembangkan sebagai objek penelitian untuk Skripsi/Tugas Akhir mahasiswa Program Studi Informatika, Fakultas Ilmu Komputer, Universitas Mulia.

---

## 📄 Informasi Penelitian

- **Judul Penelitian:** Implementasi Agentic Retrieval-Augmented Generation (RAG) Untuk Sistem Layanan Informasi Perguruan Tinggi: Studi Kasus pada Universitas Mulia Balikpapan
- **Peneliti:**
  1. Yehezkiel Dio Sinolungan
  2. Adryo Faresy Devera
  3. Andre Marthinus Lumempouw
- **Institusi:** Universitas Mulia, Balikpapan
- **Fokus Penelitian:** Evaluasi komparatif antara arsitektur RAG standar vs Agentic RAG menggunakan metrik RAGAS dan uji signifikansi statistik.

---

## 🚀 Fitur Utama

Sistem ini memiliki kapabilitas teknis tingkat lanjut yang membedakannya dari chatbot standar:

### 1. Agentic Reasoning & Planning
Alih-alih langsung menjawab, sistem menggunakan agen cerdas yang dapat:
- **Dekomposisi Kueri:** Memecah pertanyaan kompleks menjadi sub-pertanyaan (misal: "Bandingkan biaya UKT prodi A dan B" menjadi dua pencarian terpisah).
- **Eksekusi Tool Paralel:** Menjalankan pencarian informasi secara simultan untuk efisiensi latensi.
- **Self-Correction:** Memverifikasi jawaban sebelum diberikan ke pengguna (*Verify Claim*).
- **Sintesis Multi-Dokumen:** Menggabungkan informasi dari berbagai sumber (PDF, DOCX, Web) menjadi satu jawaban koheren.

### 2. Hybrid Retrieval Engine
Menggabungkan dua paradigma pencarian untuk akurasi maksimal:
- **Semantic Search (Vector):** Menggunakan embedding `text-embedding-3-small` (1536 dimensi) dengan penyimpanan di **PostgreSQL (pgvector)**. Menangkap makna kontekstual.
- **Keyword Search (Lexical):** Implementasi **Okapi BM25** dengan parameter teroptimasi untuk Bahasa Indonesia (k1=1.2, b=0.75). Menangkap istilah spesifik (nama dosen, kode mata kuliah).
- **Reciprocal Rank Fusion (RRF):** Menggabungkan hasil kedua metode dengan algoritma RRF (k=60) tanpa perlu normalisasi skor yang rumit.

### 3. Advanced Document Processing
Pipeline pengolahan dokumen yang tangguh:
- **Multi-Format Support:** PDF (`unpdf`), DOCX (`mammoth`), TXT, Markdown.
- **Adaptive Chunking:** Strategi pemecahan teks otomatis (Recursive, Semantic, Sentence Window, Hierarchical) berdasarkan karakteristik dokumen.
- **Metadata Extraction:** Ekstraksi otomatis kode mata kuliah, nama dosen, bab/pasal, dan tipe dokumen.
- **Indonesian NLP:** *Stemming* dan *stopword removal* khusus Bahasa Indonesia untuk meningkatkan akurasi BM25.

### 4. Multi-Stage Re-ranking
Meningkatkan presisi dokumen yang diambil dengan tahap penilaian ulang:
- **Cross-Encoder:** Menggunakan model `ms-marco-MiniLM-L2-v2` untuk menilai relevansi kueri-dokumen secara mendalam.
- **LLM-based Reranking:** (Opsional) Menggunakan GPT-4o-mini untuk penilaian *listwise* atau *pointwise*.
- **Ensemble:** Kombinasi bobot dari berbagai metode reranking.

### 5. Evaluasi & Analisis Statistik
Modul evaluasi terintegrasi untuk keperluan akademik:
- **RAGAS Metrics:** Faithfulness, Answer Relevancy, Context Precision/Recall, Answer Correctness.
- **Hallucination Detection:** Deteksi otomatis fabrikasi fakta menggunakan *Natural Language Inference* (NLI).
- **Studi Ablasi:** Kemampuan untuk menghidupkan/mematikan komponen (misal: matikan reranker) untuk mengukur kontribusi masing-masing fitur.
- **Uji Statistik:** Perhitungan otomatis Paired t-test, ANOVA, dan Effect Size (Cohen's d) menggunakan library `jstat`.

---

## 🛠️ Arsitektur Teknis

### Stack Teknologi
- **Framework:** Next.js 15 (App Router)
- **Runtime:** Bun
- **Database:** PostgreSQL dengan ekstensi `pgvector`
- **ORM:** Drizzle ORM
- **AI Provider:** Azure OpenAI (GPT-4.1-mini, GPT-4o-mini, Text-Embedding-3-Small)
- **Styling:** Tailwind CSS + Shadcn/UI

### Alur Kerja (Pipeline)
1. **User Query:** Pengguna mengirim pertanyaan.
2. **Guardrails:** Validasi input (PII, toksisitas, integritas akademik).
3. **Agent Planning:** Model memutuskan tool yang dibutuhkan (Search, Expand Query, Decompose).
4. **Hybrid Retrieval:**
   - Vector Search (HNSW Index di Postgres)
   - BM25 Search (In-memory scoring pada kandidat)
   - Fusion (RRF)
5. **Re-ranking:** Dokumen teratas dinilai ulang relevansinya.
6. **Generation:** LLM menyusun jawaban dengan sitasi `[1]`, `[2]`.
7. **Guardrails Output:** Validasi jawaban terhadap halusinasi.

---

## 📊 Metodologi Evaluasi

Sistem ini menyediakan dasbor evaluasi komprehensif (`/evaluation`) untuk menjalankan eksperimen terkontrol:

1. **Dataset Pertanyaan:** Kumpulan pertanyaan standar (`ACADEMIC_QUESTIONS`) mencakup regulasi, prosedur, dan fakta kampus.

### 1. Component-Level Metrics (RAGAS)
Berfokus pada kualitas retrieval dan generation per pertanyaan individual:
- **Faithfulness:** Seberapa taat jawaban terhadap konteks (0-1).
- **Answer Relevancy:** Seberapa relevan jawaban terhadap pertanyaan (0-1).
- **Context Recall:** Seberapa lengkap informasi yang diambil (0-1).
- **Hallucination Rate:** Persentase informasi yang tidak berdasar.

### 2. System-Level Evaluation (Simulated User)
Mengevaluasi implementasi sistem secara menyeluruh menggunakan **LLM-based User Simulation** untuk mengatasi gap antara metrik komponen dan klaim "Implementasi":
- **Metodologi:** Menggunakan persona (Mahasiswa Baru, Mahasiswa Tingkat Akhir, Dosen) untuk melakukan percakapan multi-turn.
- **Metrics:**
  - **Task Completion Rate:** Keberhasilan pengguna mencapai tujuan informasi.
  - **Conversation Coherence:** Kualitas alur percakapan antar giliran.
  - **Context Retention:** Kemampuan sistem mengingat konteks sebelumnya.
- **Justifikasi:** Memvalidasi aspek interaksi UI/UX dan alur percakapan yang tidak tertangkap oleh RAGAS.

### 3. Statistical Analysis
- **Paired t-test:** Membandingkan performa RAG vs Non-RAG pada pertanyaan yang sama.
   - **One-way ANOVA:** Membandingkan berbagai strategi chunking/retrieval.
   - **Bootstrap Confidence Interval:** Estimasi rentang kepercayaan untuk metrik rata-rata.

---

## 📂 Struktur Folder

```
/
├── corpus/                 # Dokumen sumber (PDF/TXT) Universitas Mulia
├── src/
│   ├── app/                # Next.js App Router (Frontend + API)
│   ├── components/         # Komponen UI (Chat, Evaluation, Upload)
│   ├── lib/
│   │   ├── ai/             # Konfigurasi Azure OpenAI
│   │   ├── db/             # Schema Database & Koneksi
│   │   ├── rag/            # Core RAG Logic
│   │   │   ├── agentic-rag.ts      # Logika Agent
│   │   │   ├── chunking.ts         # Strategi Chunking
│   │   │   ├── hybrid-retrieval.ts # BM25 + Vector + RRF
│   │   │   ├── reranker.ts         # Cross-Encoder & LLM Rerank
│   │   │   ├── evaluation.ts       # Kalkulasi Metrik RAGAS
│   │   │   └── guardrails.ts       # Safety Checks
│   │   └── statistics/     # Analisis Statistik (jstat)
```

---

## 🚀 Instalasi dan Penggunaan

### Prasyarat
- Node.js atau Bun
- PostgreSQL dengan ekstensi `vector` aktif
- Akun Azure OpenAI

### Langkah Instalasi
1. **Clone Repository**
   ```bash
   git clone https://github.com/username/academic-research-rag-chatbot.git
   cd academic-research-rag-chatbot
   ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Konfigurasi Environment**
   Salin `.env.example` ke `.env` dan isi kredensial:
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/muliachat"
   AZURE_OPENAI_API_KEY="..."
   AZURE_OPENAI_RESOURCE_NAME="..."
   AZURE_OPENAI_CHAT_DEPLOYMENT="gpt-4.1-mini"
   AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-3-small"
   ```

4. **Migrasi Database**
   ```bash
   bun run db:push
   ```

5. **Jalankan Server Development**
   ```bash
   bun dev
   ```

### Mengakses Dasbor
- **Chat Interface:** http://localhost:3000
- **Knowledge Base Management:** http://localhost:3000/manage
- **Evaluation Dashboard:** http://localhost:3000/evaluation

---

## ⚠️ Batasan dan Pengembangan Lanjut

- **Bahasa:** Saat ini dioptimalkan khusus untuk Bahasa Indonesia.
- **Format Dokumen:** Tabel kompleks dalam PDF mungkin kehilangan struktur saat ekstraksi.
- **Latensi:** Mode *Agentic* memiliki latensi lebih tinggi dibanding RAG standar karena langkah penalaran tambahan.

---

## 📝 Lisensi

Proyek ini dilisensikan di bawah MIT License. Digunakan untuk keperluan pendidikan dan penelitian.