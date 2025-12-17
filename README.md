
## Ringkasan Eksekutif

**MuliaChat** (nama sementara, tidak berafiliasi dengan Universitas Mulia) adalah platform percakapan berbasis AI yang dikembangkan sebagai studi kasus dan objek penelitian untuk penulisan paper ilmiah. Sistem ini dirancang untuk menguji dan mendokumentasikan proses perancangan, implementasi, serta evaluasi chatbot kontekstual berbasis dokumen akademik.

Platform ini mengintegrasikan pendekatan **Retrieval-Augmented Generation (RAG)** dan **agentic multi-step reasoning** untuk menghasilkan jawaban yang akurat, terverifikasi, dan terdokumentasi secara sistematis dari sumber akademik relevan.

---

## Informasi Paper Ilmiah

- **Judul:** Implementasi Agentic Retrieval-Augmented Generation (RAG) untuk Sistem Tanya Jawab Universitas Mulia
- **Kata kunci:** Retrieval-Augmented Generation, RAG, Agentic AI, Hybrid Retrieval, BM25, RAGAS, Natural Language Processing, Large Language Models
- **Penulis:** Yehezkiel Dio Sinolungan<sup>1</sup>, Adryo Faresy Devera<sup>2</sup>, Andre Marthinus Lumempouw<sup>3</sup>
  *<sup>1</sup>, <sup>2</sup>, <sup>3</sup> Program Studi Informatika, Fakultas Ilmu Komputer, Universitas Mulia*
- **Tipe penelitian:** Eksperimental terapan
- **Metodologi penelitian:** *Research and Development (R&D)* dengan pendekatan *Rapid Application Development (RAD)*

---

## Pendekatan Konseptual

- **Isu utama:** Chatbot domain-spesifik di lingkungan universitas sering mengalami halusinasi jawaban dan kegagalan menjawab pertanyaan dengan konteks lokal.
- **Tujuan penelitian:**
  - Membuktikan keunggulan RAG berbasis agen dengan penalaran multi-langkah dibandingkan RAG satu-langkah pada kueri kontekstual universitas.
  - Menentukan konfigurasi optimal (strategi pengambilan data, metode *re-ranking*, teknik *chunking*, mode agen) untuk menyeimbangkan kualitas jawaban dan latensi pada penerapan nyata.
- **Metode utama:** Studi ablasi untuk mengukur kontribusi tiap komponen dengan menghilangkan atau memodifikasi komponen secara sistematis, lalu mengevaluasi dampaknya terhadap kinerja sistem.

---

## Pilihan Desain dan Arsitektur

- **Arsitektur sistem:**
  - Agentic multi-step reasoning
  - Integrasi *Large Language Model* (LLM) dengan *hybrid retrieval* (BM25 untuk pencarian leksikal, vector search untuk pencarian semantik)
- **Pertimbangan desain:**
  - Kompleksitas dan latensi dikorbankan demi kualitas jawaban
  - Mode agen memiliki latensi 2–5× lebih tinggi, namun memberikan akurasi lebih baik untuk kueri multi-hop dan kontekstual

---

## Pemilihan Model dan Rancangan Eksperimen

Penelitian memanfaatkan layanan Microsoft Azure OpenAI untuk operasi LLM dan model Hugging Face *Transformers* untuk proses *re-ranking*.

- **GPT-4.1 Mini (`gpt-4.1-mini`)**
  - Penggunaan: Generasi teks dan agen percakapan
  - Justifikasi: Kemampuan instruksional kuat, latensi rendah, dan efisiensi biaya tinggi untuk interaksi real-time
- **GPT-4o Mini (`gpt-4o-mini`)**
  - Penggunaan: Evaluasi (*LLM-as-a-Judge*)
  - Justifikasi: Model yang berbeda dari generator untuk memitigasi *self-preference bias* (kecenderungan model menilai outputnya sendiri lebih tinggi), memastikan objektivitas evaluasi
- **`text-embedding-3-small`**
  - Penggunaan: Pembuatan embedding dokumen
  - Justifikasi: Keseimbangan kualitas representasi dan kecepatan komputasi
- **`cross-encoder/ms-marco-MiniLM-L2-v2`**
  - Penggunaan: *Cross-encoder scoring* untuk *re-ranking*
  - Justifikasi: Efisien dan efektif untuk skenario *Information Retrieval* (IR) dan RAG

Penggunaan model dan layanan Azure memastikan konsistensi kinerja, skalabilitas, serta konfigurasi model yang terstandarisasi untuk eksperimen terkontrol. Replikasi hasil terjamin karena versi model, parameter, dan pipeline inferensi berada pada lingkungan eksekusi yang stabil dan terdokumentasi. Pendekatan ini menghilangkan variasi performa akibat perbedaan hardware atau optimisasi runtime, sehingga perbandingan antar konfigurasi pada studi ablasi berlangsung adil dan bebas bias teknis.

Untuk memitigasi bias preferensi diri (*self-preference bias*), penelitian berfokus pada pengukuran peningkatan relatif antar konfigurasi ablasi, bukan pada nilai absolut metrik.

---

## Pipeline Evaluasi dan Studi Ablasi

Evaluasi dilakukan melalui pipeline multi-tahap:

1. **Definisi konfigurasi:** Setiap konfigurasi didefinisikan dengan snapshot parameter lengkap untuk replikasi penuh.
2. **Pemuatan set pertanyaan:** Sistem menyediakan pertanyaan informasi Universitas Mulia yang telah ditentukan.
3. **Eksekusi pipeline RAG:** Untuk setiap pasangan konfigurasi-pertanyaan, engine mengeksekusi jalur yang sesuai.

---

## Korpus Dokumen

Pertanyaan evaluasi dan korpus dokumen diambil dari sumber resmi Universitas Mulia, meliputi:
- Situs web resmi Universitas Mulia
- Situs penerimaan mahasiswa baru Universitas Mulia
- Kementerian Pendidikan Tinggi, Sains, dan Teknologi (PDDikti)
- Wikipedia
- Tata Tertib Kehidupan Kampus bagi Mahasiswa Universitas Mulia
- Booklet Universitas Mulia
- Panduan Skripsi Universitas Mulia
- Peraturan Akademik Universitas Mulia

---

## Fitur Utama

- Agentic RAG dengan eksekusi tool paralel untuk penalaran multi-langkah
- Hybrid retrieval menggabungkan pgvector dan BM25 dengan Reciprocal Rank Fusion
- Adaptive chunking dengan seleksi strategi otomatis berdasarkan karakteristik dokumen
- Advanced reranking dengan lima strategi berbeda (cross-encoder, LLM, ensemble)
- Ekstraksi metadata domain-spesifik untuk >50 tipe dokumen universitas Indonesia
- Quality-aware retrieval dengan penilaian kualitas chunk untuk pembobotan jawaban
- Real-time streaming menggunakan Server-Sent Events untuk visibilitas langkah agen
- Kerangka evaluasi komprehensif dengan metrik RAGAS dan studi ablasi

---

## Penjelasan Teknis Agentic RAG

**Multi-step reasoning dengan eksekusi tool:**
Pendekatan agentic RAG memungkinkan LLM menggunakan tool khusus untuk kueri kompleks. Berbeda dengan RAG standar (retrieval tunggal → generasi), mode agentic mendukung perencanaan, retrieval multi-tahap, verifikasi, dan sintesis.

**Tool utama dan fungsinya:**
- search_documents: Hybrid retrieval untuk sub-pertanyaan
- decompose_query: Memecah kueri kompleks menjadi sub-pertanyaan
- expand_query: Menghasilkan sinonim akademik
- verify_claim: Verifikasi klaim berbasis NLI
- synthesize_answer: Sintesis jawaban multi-sumber

**Hybrid retrieval dengan Reciprocal Rank Fusion:**
Terdapat tiga mode retrieval:
- Vector only
- Keyword only
- Hybrid (vector + keyword)

**pgVector semantic search:**
Menggunakan cosine similarity pada embedding vektor di PostgreSQL (pgvector).

**Okapi BM25:**
Pencarian keyword BM25 menggunakan parameter teroptimasi untuk dokumen Indonesia:
  - K1: 1.2 (standar dokumen panjang, repetisi sedang)
  - B: 0.75 (normalisasi panjang dokumen)
  - K3: 8
  - DELTA: 1 (semua term berkontribusi positif)

**Reciprocal Rank Fusion (RRF):**
RRF menggabungkan ranking dari beberapa retriever tanpa normalisasi skor (k=60, sesuai literatur).

**Quality score boosting:**
Setelah RRF, chunk disesuaikan ±15% berdasarkan kualitas, dihitung dari:
  - Densitas informasi (unique words/total words)
  - Pentingnya struktur
  - Jumlah sitasi
  - Konsentrasi kata kunci (per 100 kata)
  - Kelengkapan (berakhir dengan terminator kalimat)

**Advanced reranking:**
Lima pendekatan reranking dengan trade-off kecepatan dan kualitas:
  - cross_encoder: HuggingFace cross-encoder (~100ms, baik, default produksi)
  - llm (pointwise): GPT-4.1-mini paralel (~3-5s, sangat baik)
  - llm_listwise: GPT-4.1-mini satu panggilan (~2-3s, sangat baik, efisien token)
  - cohere: Cohere rerank API (~10-15s, sangat baik, kualitas maksimum)
  - ensemble: cross_encoder + LLM (weighted, ~3-6s, kualitas-latensi optimal)

