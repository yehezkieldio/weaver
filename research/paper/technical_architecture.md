# Metodologi: Arsitektur Teknis Sistem (*Technical Architecture*)

Bagian ini mendetailkan spesifikasi teknis, tumpukan teknologi (*tech stack*), dan infrastruktur yang mendasari sistem *Academic Research RAG Chatbot*. Arsitektur dirancang dengan prinsip modularitas, skalabilitas, dan keamanan data, khususnya dalam konteks pengelolaan informasi akademik.

## 1. Tumpukan Teknologi (*Tech Stack*)

Sistem dibangun menggunakan arsitektur aplikasi web modern berbasis TypeScript yang menjamin keamanan tipe data (*type safety*) di seluruh lapisan aplikasi (*full-stack type safety*).

### 1.1. Frontend & Backend Framework
*   **Framework**: Next.js 15 (App Router architecture)
*   **Bahasa**: TypeScript 5.0+
*   **Runtime**: Bun (menggantikan Node.js untuk kinerja eksekusi dan manajemen paket yang lebih cepat)
*   **UI Library**: React 19, TailwindCSS v4, dan Radix UI untuk komponen aksesibel.

### 1.2. Lapisan Kecerdasan Buatan (AI Layer)
Integrasi model bahasa dilakukan melalui **Vercel AI SDK** yang menyediakan abstraksi standar untuk *streaming* teks dan pemanggilan alat (*tool calling*).
*   **Provider**: Azure OpenAI Service (dipilih karena kepatuhan keamanan *enterprise* dan latensi rendah).
*   **Model Chat**: GPT-4o-mini (`gpt-4o-mini`) untuk penalaran dan generasi jawaban.
*   **Model Embedding**: `text-embedding-3-small` (dimensi output: 1536) untuk representasi vektor dokumen.

### 1.3. Basis Data & Penyimpanan
Sistem menggunakan **PostgreSQL 18** sebagai basis data relasional utama, diperkuat dengan ekstensi **pgvector** untuk operasi vektor.
*   **ORM**: Drizzle ORM (untuk interaksi tipe-aman dengan database).
*   **Vector Index**: HNSW (*Hierarchical Navigable Small World*) index untuk pencarian *Approximate Nearest Neighbor* (ANN) yang cepat.
*   **Full-Text Search**: GIN (*Generalized Inverted Index*) dengan modul `pg_trgm` untuk pencarian kata kunci BM25 yang efisien.

## 2. Skema Basis Data

Desain skema basis data mendukung kebutuhan eksperimental riset RAG serta operasional produksi.

### 2.1. Tabel Dokumen (`documents` & `document_chunks`)
Penyimpanan dokumen dipisahkan menjadi dua level:
1.  `documents`: Metadata level file (judul, tipe, status pemrosesan).
2.  `document_chunks`: Segmen teks terproses.
    *   Kolom `embedding`: Tipe `vector(1536)` untuk menyimpan representasi semantik.
    *   Kolom `keywords`: Array teks untuk indeks pencarian leksikal.
    *   Kolom `metadata`: JSONB untuk menyimpan informasi struktural (nomor halaman, bab).

### 2.2. Tabel Evaluasi & Logging
Untuk mendukung metodologi penelitian yang ketat, sistem mencatat data granular:
*   `evaluation_runs`: Menyimpan konfigurasi eksperimen (strategi *chunking*, parameter *retrieval*).
*   `evaluation_questions`: Menyimpan metrik per-pertanyaan (Faithfulness, Relevancy, Latency).
*   `agent_steps`: Log eksekusi langkah demi langkah dari agen (alat yang dipanggil, durasi, output).
*   `guardrail_logs`: Catatan pelanggaran keamanan dan privasi.

### Deskripsi Diagram Arsitektur Sistem (Untuk Visualisasi)
> **Gambar 1: Diagram Arsitektur Teknis.**
>
> *Visualisasi skematis layer aplikasi:*
> 1.  **Client Layer**: Browser pengguna (Next.js React UI).
> 2.  **Application Layer (Next.js Server Actions)**:
>     *   *Orchestrator*: Mengelola sesi chat.
>     *   *RAG Pipeline*: Modul `hybrid-retrieval`, `reranker`, `agentic-rag`.
>     *   *Evaluation Engine*: Modul kalkulasi metrik RAGAS.
> 3.  **Data Layer (PostgreSQL)**:
>     *   Menyimpan Vektor (pgvector).
>     *   Menyimpan Teks (GIN Index).
>     *   Menyimpan Log Riset.
> 4.  **External Services**:
>     *   Azure OpenAI (LLM & Embeddings).

## 3. Infrastruktur & Penerapan (*Deployment*)

### 3.1. Kontainerisasi
Seluruh layanan basis data dikemas menggunakan **Docker** dan diorkestrasi dengan `docker-compose`. Layanan PostgreSQL menggunakan citra `pgvector/pgvector:pg18` untuk memastikan ketersediaan ekstensi vektor terbaru.

### 3.2. Keamanan & Konfigurasi
Konfigurasi lingkungan dikelola melalui variabel lingkungan (`.env`) yang divalidasi secara ketat menggunakan pustaka `@t3-oss/env-nextjs` saat waktu kompilasi (*build time*) dan waktu jalan (*runtime*). Ini mencegah kesalahan konfigurasi kritis seperti kebocoran kunci API atau URL database yang salah.

### 3.3. Skalabilitas
Arsitektur *stateless* pada lapisan aplikasi memungkinkan penskalaan horizontal yang mudah. Pemrosesan dokumen berat (ingestion) dilakukan secara asinkron dengan status yang dilacak di database (`processing_status`), memungkinkan sistem tetap responsif meskipun sedang memproses korpus dokumen besar.
