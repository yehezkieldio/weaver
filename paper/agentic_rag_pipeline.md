# Metodologi: Pipeline RAG Agenik (*Agentic RAG Pipeline*)

Bagian ini menjelaskan arsitektur *Agentic Retrieval-Augmented Generation* (RAG) yang dirancang untuk menangani kompleksitas pertanyaan akademik yang sering kali memerlukan penalaran multi-tahap, dekomposisi masalah, dan verifikasi fakta. Berbeda dengan RAG standar yang mengikuti pola linier (Retrieve $\rightarrow$ Generate), pendekatan agenik ini memungkinkan sistem untuk merencanakan, mengeksekusi alat bantu (*tools*), dan memperbaiki strategi pencarian secara dinamis.

## 1. Arsitektur Agen Otonom

Sistem dibangun di atas paradigma *ReAct* (Reasoning + Acting) yang dimodifikasi untuk konteks akademik. Agen tidak hanya bertindak sebagai antarmuka pencarian, tetapi sebagai orkestrator yang mengelola aliran informasi antara pengguna, basis pengetahuan, dan mesin inferensi.

### 1.1. Komponen Inti Agen
Agen terdiri dari modul-modul fungsional berikut:
1.  **Planner (Perencana)**: Menganalisis pertanyaan pengguna untuk menentukan apakah pertanyaan dapat dijawab langsung atau memerlukan dekomposisi menjadi sub-pertanyaan.
2.  **Tool Executor (Eksekutor Alat)**: Mengelola pemanggilan alat bantu secara paralel untuk efisiensi latensi.
3.  **Synthesizer (Sintesis)**: Menggabungkan informasi dari berbagai sumber menjadi jawaban koheren dengan sitasi yang tepat.
4.  **Verifier (Verifikator)**: Memeriksa kesesuaian antara klaim dalam jawaban dengan bukti dokumen (mekanisme *hallucination check*).

### Deskripsi Diagram Alur Kerja Agen (Untuk Visualisasi)
> **Gambar 1: Alur Kerja Agentic RAG.**
>
> *Visualisasi yang disarankan:*
> 1.  **Input**: Query Kompleks (misal: "Bandingkan syarat skripsi prodi TI dan SI").
> 2.  **Validasi**: Input melewati modul *Guardrails* (cek PII, toksisitas).
> 3.  **Perencanaan**: Model memutuskan untuk menggunakan alat `decompose_query`.
> 4.  **Eksekusi Paralel**:
>     *   *Jalur A*: `search_documents("syarat skripsi TI")`
>     *   *Jalur B*: `search_documents("syarat skripsi SI")`
> 5.  **Observasi**: Agen menerima potongan dokumen dari kedua pencarian.
> 6.  **Sintesis**: Model menghasilkan jawaban komparatif dengan sitasi `[1]`, `[2]`.
> 7.  **Output**: Jawaban final disajikan ke pengguna.

## 2. Inventaris Alat (*Tools*)

Agen dilengkapi dengan serangkaian alat deterministik dan probabilistik yang didefinisikan menggunakan skema JSON (Zod schema) untuk memastikan validitas input/output.

### 2.1. Pencarian Dokumen (`search_documents`)
Alat ini merupakan antarmuka ke *Hybrid Retrieval Engine*. Parameter utamanya adalah strategi pencarian (`vector`, `keyword`, atau `hybrid`) dan jumlah dokumen (`topK`).
*   **Input**: Query string, strategi.
*   **Output**: Daftar kutipan dokumen beserta skor relevansi.

### 2.2. Ekspansi Kueri (`expand_query`)
Menggunakan kamus sinonim domain akademik (misal: "tesis" $\approx$ "tugas akhir") dan model bahasa untuk memperkaya istilah pencarian.
$$
Q_{expanded} = Q_{original} \cup \{s \mid s \in \text{Synonyms}(w), w \in Q_{original}\}
$$

### 2.3. Dekomposisi Kueri (`decompose_query`)
Memecah pertanyaan multi-hop $Q$ menjadi himpunan sub-pertanyaan {$q_1, q_2, \dots, q_n$} yang independen.
*   *Contoh*: "Apa syarat cuti akademik dan berapa biayanya?"
*   *Dekomposisi*:
    1.  "Apa syarat pengajuan cuti akademik?"
    2.  "Berapa biaya cuti akademik?"

Implementasi sistem memaksa eksekusi paralel (*parallel tool calling*) untuk sub-pertanyaan ini guna meminimalkan waktu tunggu pengguna (latensi total $\approx \max(t_{q1}, t_{q2})$ alih-alih $\sum t_{qi}$). 

### 2.4. Verifikasi Klaim (`verify_claim`)
Alat ini berfungsi sebagai mekanisme *Natural Language Inference* (NLI) untuk memvalidasi premis. Diberikan klaim $C$ dan konteks $D$, alat menghasilkan probabilitas dukungan $P(Supported|C, D)$. Jika probabilitas rendah, agen akan merevisi jawaban atau menyatakan ketidakpastian.

## 3. Manajemen Konteks dan Sitasi

Salah satu tantangan utama dalam RAG akademik adalah atribusi sumber yang akurat. Sistem menggunakan `CitationManager` yang menetapkan ID unik untuk setiap potongan dokumen yang diambil selama sesi percakapan.

### 3.1. Mekanisme Penomoran Sitasi
Setiap *chunk* dokumen $d_i$ yang dikembalikan oleh alat pencarian diberi indeks sitasi $k$. Saat LLM menghasilkan teks, instruksi sistem memaksakan format `[k]` setiap kali informasi dari $d_i$ digunakan.

$$
\text{Answer} = \text{Generate}(Q, \{d_1, d_2, \dots, d_m\}) \text{ s.t. } \forall \text{sentence } s, \exists k : \text{Attributed}(s, d_k)
$$

### 3.2. Jendela Konteks Bergulir
Untuk menangani keterbatasan panjang konteks (walaupun model mendukung 128k token), sistem mempertahankan status percakapan ($H_t$) yang berisi ringkasan interaksi sebelumnya dan daftar dokumen yang telah diambil (*retrieved chunks*), memungkinkan referensi silang antar-giliran percakapan.

## 4. Mekanisme Streaming dan Umpan Balik

Untuk meningkatkan pengalaman pengguna (UX), pipeline ini mendukung *streaming* progresif. Callbacks (`onStepStart`, `onStepComplete`) dipicu secara *real-time* saat agen berpindah status (misal: dari "Berpikir" ke "Mencari Dokumen"). Hal ini memberikan transparansi proses kepada pengguna, membangun kepercayaan bahwa sistem sedang bekerja secara logis, bukan sekadar berhalusinasi.
