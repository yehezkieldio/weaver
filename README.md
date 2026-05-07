# Weaver

Weaver adalah sistem *Question Answering* berbasis *Large Language Model* untuk informasi akademik Universitas Mulia. Sistem ini menggunakan arsitektur *Agentic Retrieval-Augmented Generation* (RAG) agar jawaban tetap terhubung ke dokumen sumber dan dapat disertai sitasi.

Proyek ini dikembangkan sebagai objek penelitian Skripsi/Tugas Akhir mahasiswa Program Studi Informatika, Fakultas Ilmu Komputer, Universitas Mulia. Hasil evaluasi tersedia di `research/results`.

## Informasi Penelitian

- **Judul:** Implementasi Agentic Retrieval-Augmented Generation (RAG) Untuk Sistem Layanan Informasi Perguruan Tinggi: Studi Kasus pada Universitas Mulia Balikpapan
- **Peneliti:** Yehezkiel Dio Sinolungan, Adryo Faresy Devera, Andre Marthinus Lumempouw
- **Institusi:** Universitas Mulia, Balikpapan
- **Fokus:** Perbandingan RAG standar dan Agentic RAG menggunakan metrik RAGAS serta uji signifikansi statistik.

## Fitur Utama

### Agentic RAG

Weaver tidak langsung menjawab setiap pertanyaan dari satu pencarian. Sistem dapat merencanakan langkah pencarian, memecah pertanyaan kompleks, menjalankan beberapa tool retrieval, lalu menyusun jawaban dari beberapa dokumen.

Kemampuan utama:

- Dekomposisi kueri menjadi sub-pertanyaan.
- Pencarian paralel untuk menurunkan latensi.
- Sintesis jawaban dari PDF, DOCX, TXT, Markdown, dan sumber web.
- Verifikasi klaim sebelum jawaban dikirim ke pengguna.
- Sitasi sumber dalam format `[1]`, `[2]`, dan seterusnya.

### Hybrid Retrieval

Retrieval menggabungkan pencarian semantik dan leksikal:

- **Vector search:** Embedding `text-embedding-3-small` dengan PostgreSQL dan `pgvector`.
- **Keyword search:** Okapi BM25 untuk menangkap istilah spesifik seperti nama dosen, kode mata kuliah, dan istilah administratif.
- **Reciprocal Rank Fusion:** Penggabungan hasil vector dan keyword search tanpa normalisasi skor manual.

### Pemrosesan Dokumen

Pipeline dokumen mendukung:

- PDF melalui `unpdf`.
- DOCX melalui `mammoth`.
- TXT dan Markdown.
- Strategi chunking adaptif, termasuk recursive, semantic, sentence window, dan hierarchical chunking.
- Ekstraksi metadata seperti kode mata kuliah, nama dosen, bab, pasal, dan tipe dokumen.
- Stemming dan stopword removal Bahasa Indonesia untuk BM25.

### Reranking

Dokumen kandidat dapat dinilai ulang sebelum digunakan sebagai konteks jawaban:

- Cross-encoder `ms-marco-MiniLM-L2-v2`.
- LLM-based reranking menggunakan GPT-4o-mini.
- Ensemble reranking dari beberapa metode.

### Evaluasi

Modul evaluasi tersedia untuk kebutuhan penelitian:

- RAGAS: faithfulness, answer relevancy, context precision, context recall, dan answer correctness.
- Deteksi halusinasi berbasis *Natural Language Inference*.
- Studi ablasi untuk mengukur kontribusi retrieval, chunking, reranking, dan komponen lain.
- Analisis statistik dengan paired t-test, ANOVA, effect size, dan bootstrap confidence interval.

## Stack

- **Framework:** Next.js 15 App Router
- **Runtime dan package manager:** Bun
- **Database:** PostgreSQL dengan ekstensi `pgvector`
- **ORM:** Drizzle ORM
- **AI provider:** Azure OpenAI
- **Model chat:** GPT-4.1-mini, GPT-4o-mini
- **Model embedding:** `text-embedding-3-small`
- **Styling:** Tailwind CSS dan shadcn/ui

## Pipeline

1. Pengguna mengirim pertanyaan.
2. Guardrails memvalidasi input.
3. Agen menyusun rencana retrieval.
4. Sistem menjalankan hybrid retrieval dengan vector search, BM25, dan RRF.
5. Kandidat dokumen diproses oleh reranker.
6. LLM menyusun jawaban dengan sitasi.
7. Guardrails output memeriksa jawaban akhir.

## Evaluasi Penelitian

Dashboard evaluasi tersedia di `/evaluation`. Dataset pertanyaan akademik mencakup regulasi, prosedur, biaya, program studi, dan informasi kampus.

Evaluasi dilakukan dalam dua tingkat:

- **Component-level evaluation:** Mengukur kualitas retrieval dan generation per pertanyaan menggunakan RAGAS.
- **System-level evaluation:** Menggunakan simulasi pengguna berbasis LLM dengan persona seperti mahasiswa baru, mahasiswa tingkat akhir, dan dosen.

Metrik system-level mencakup:

- Task completion rate.
- Conversation coherence.
- Context retention.

Analisis statistik mencakup:

- Paired t-test untuk membandingkan konfigurasi pada pertanyaan yang sama.
- One-way ANOVA untuk membandingkan strategi retrieval atau chunking.
- Bootstrap confidence interval untuk estimasi metrik rata-rata.

## Struktur Folder

```text
/
├── research/
│   ├── corpus/             # Dokumen sumber Universitas Mulia
│   ├── docs/               # Dokumentasi teknis dan laporan
│   │   ├── guides/
│   │   └── reports/
│   ├── paper/              # Materi penulisan akademik
│   ├── results/            # Output evaluasi dan analisis statistik
│   └── data.txt            # Dump data sumber mentah
├── scripts/                # Utilitas evaluasi, analisis, dan ingestion
├── src/
│   ├── app/                # Next.js App Router
│   ├── components/         # Komponen UI
│   └── lib/
│       ├── ai/             # Konfigurasi Azure OpenAI
│       ├── db/             # Schema database dan koneksi
│       ├── rag/            # Core RAG logic
│       └── statistics/     # Analisis statistik
```

## Menjalankan Proyek

### Prasyarat

- Bun
- PostgreSQL dengan ekstensi `vector`
- Akun Azure OpenAI

### Instalasi

```bash
git clone https://github.com/username/weaver.git
cd weaver
bun install
```

### Environment

Salin `.env.example` ke `.env`, lalu isi kredensial yang diperlukan.

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/weaver"
AZURE_OPENAI_API_KEY="..."
AZURE_OPENAI_RESOURCE_NAME="..."
AZURE_OPENAI_CHAT_DEPLOYMENT="gpt-4.1-mini"
AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-3-small"
```

### Database

```bash
bun run db:push
```

### Development

```bash
bun dev
```

Rute utama:

- Chat: `http://localhost:3000`
- Knowledge base: `http://localhost:3000/manage`
- Evaluation dashboard: `http://localhost:3000/evaluation`

## Batasan

- Sistem dioptimalkan untuk Bahasa Indonesia.
- Struktur tabel kompleks dalam PDF dapat berubah saat ekstraksi.
- Mode agentic memiliki latensi lebih tinggi daripada RAG standar karena ada tahap perencanaan dan verifikasi tambahan.

## Lisensi

MIT License, copyright 2025-2026 Yehezkiel Dio Sinolungan, Adryo Faresy Devera, and Andre Marthinus Lumempouw. Lihat `LICENSE`.
