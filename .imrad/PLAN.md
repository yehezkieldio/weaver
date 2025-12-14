Publikasi Ilmiah Writing Plan:

Judul:

Implementasi Agentic Retrieval-Augmented Generation (RAG) untuk Otomatisasi Layanan Mahasiswa di Universitas Mulia

Jenis Penelitian:

Penelitian Eksperimental Terapan

Metodologi Penelitian:

Research and Development (R&D)
Rapid Application Development (RAD)
Kuantitatif Eksperimental
Studi Ablasi Otomatis

Isu Utama:

Chatbot domain spesifik seperti akademik tradisional dan LLM standar sering mengalami halusinasi dan gagal menjawab pertanyaan spesifik konteks lokal domain.

Keterbatasan Solusi Lama:

Retrieval-Augmented Generation (RAG) standar sering melewatkan kata kunci spesifik, sementara pencarian keyword biasa gagal memahami konteks semantik.

Solusi Baru yang Dicoba:

Melakukan implementasi multi-stage agentic Retrieval-Augmented Generation (RAG). Tidak seperti arsitektur tradisional yang mengandalkan mesin pencari teks lengkap bawaan basis data, sistem ini memisahkan penskoran kata kunci dari lapisan penyimpanan.

Sistem ini menggunakan strategi "Generasi Kandidat Berbasis Vektor-Pertama" (Vector-First Candidate Generation), di mana pencarian semantik dengan daya ingat tinggi (high-recall) mengambil kumpulan kandidat, yang kemudian diikuti oleh implementasi algoritma Okapi BM25 yang berada di memori (in-memory) dan sisi aplikasi untuk penataan ulang (reranking) dengan presisi tinggi.

