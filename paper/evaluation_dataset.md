# Metodologi: Dataset Evaluasi dan Metrik (*Evaluation Dataset*)

Untuk memastikan validitas ilmiah dan kinerja sistem *Retrieval-Augmented Generation* (RAG) yang dikembangkan, penelitian ini menggunakan kerangka kerja evaluasi komprehensif yang mengintegrasikan metrik pengambilan informasi (*information retrieval*), kualitas generasi teks, dan deteksi halusinasi. Evaluasi dilakukan secara otomatis menggunakan paradigma *LLM-as-a-Judge*, di mana model bahasa yang lebih kuat (GPT-4o) bertindak sebagai penilai objektif terhadap output sistem.

## 1. Kerangka Kerja Evaluasi RAGAS

Sistem evaluasi utama mengadopsi kerangka kerja RAGAS (*Retrieval Augmented Generation Assessment*), yang dirancang khusus untuk mengukur kinerja pipa RAG secara granular. Metrik-metrik ini dibagi menjadi dua kategori utama: metrik generasi (kualitas jawaban) dan metrik pengambilan (kualitas konteks).

### 1.1. Metrik Generasi (*Generation Metrics*)

Metrik ini menilai kualitas jawaban akhir yang dihasilkan oleh LLM.

#### a. Faithfulness (Kesetiaan)
Mengukur sejauh mana jawaban yang dihasilkan didasarkan pada konteks yang diambil, tanpa menambahkan informasi eksternal atau halusinasi.
$$
\text{Faithfulness} = \frac{|S_{\text{supported}}|}{|S_{\text{total}}|}\ 
$$
Dimana $|S_{\text{supported}}|$ adalah jumlah klaim dalam jawaban yang dapat diverifikasi/didukung oleh konteks, dan $|S_{\text{total}}|$ adalah total jumlah klaim yang dibuat.

#### b. Answer Relevancy (Relevansi Jawaban)
Mengukur seberapa relevan jawaban terhadap pertanyaan pengguna, terlepas dari kebenaran faktualnya. Dihitung dengan membangkitkan pertanyaan sintetis $q_i$ dari jawaban $a$ dan mengukur kesamaan kosinus rata-rata dengan pertanyaan asli $q$.
$$
\text{Relevancy} = \frac{1}{N} \sum_{i=1}^{N} \cos(E(q), E(q_i))\ 
$$
Dimana $E(\cdot)$ adalah fungsi embedding.

#### c. Answer Correctness (Kebenaran Jawaban)
Mengukur akurasi jawaban dibandingkan dengan *Ground Truth* (jawaban referensi manusia). Ini merupakan kombinasi dari kesamaan semantik dan kesamaan faktual.
$$
\text{Correctness} = w_1 \cdot \text{Sim}_{\text{semantic}}(a, g) + w_2 \cdot \text{Sim}_{\text{factual}}(a, g)\ 
$$
Biasanya $w_1 = 0.3$ dan $w_2 = 0.7$.

### 1.2. Metrik Pengambilan (*Retrieval Metrics*)

Metrik ini menilai efektivitas komponen pencarian dalam menemukan dokumen yang relevan.

#### a. Context Precision (Presisi Konteks)
Mengukur proporsi potongan (*chunks*) yang relevan di antara $K$ potongan teratas yang diambil.
$$
\text{Context Precision@K} = \frac{\sum_{k=1}^{K} P@k \times \text{rel}_k}{\text{Total Relevant Retrieved}}\ 
$$

#### b. Context Recall (Recall Konteks)
Mengukur sejauh mana konteks yang diambil mencakup informasi yang diperlukan untuk menjawab pertanyaan (berdasarkan *Ground Truth*).
$$
\text{Context Recall} = \frac{|\text{Ground Truth Sentences Attributed to Context}|}{|\text{Total Ground Truth Sentences}|}\ 
$$

## 2. Metrik Deteksi Halusinasi & Konsistensi

Mengingat pentingnya akurasi dalam konteks akademik, metrik tambahan dikembangkan khusus untuk mendeteksi fabrikasi informasi.

### 2.1. Hallucination Rate
Menggunakan teknik *Natural Language Inference* (NLI) untuk mengklasifikasikan setiap kalimat jawaban sebagai *Entailment* (didukung), *Neutral* (tidak relevan), atau *Contradiction* (bertentangan) terhadap dokumen sumber.
$$
\text{Hallucination Rate} = \frac{\text{Count}(\text{Unsupported Claims})}{\text{Total Claims}}\ 
$$

### 2.2. Citation Accuracy
Memverifikasi apakah sitasi `[k]` yang dicantumkan dalam teks benar-benar merujuk pada dokumen yang relevan.
$$
\text{Citation Accuracy} = \frac{\text{Valid Citations}}{\text{Total Citations Generated}}\ 
$$

## 3. Desain Eksperimen (Ablation Studies)

Untuk mengisolasi kontribusi setiap komponen sistem, dilakukan studi ablasi (*ablation study*) dengan membandingkan konfigurasi berikut:

| Konfigurasi | Retrieval | Reranker | Agentic | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| **Baseline** | None | - | No | LLM murni tanpa akses dokumen (Zero-shot). |
| **Vector Only** | Dense | - | No | Pencarian semantik standar (Cosine Similarity). |
| **BM25 Only** | Sparse | - | No | Pencarian kata kunci tradisional. |
| **Hybrid** | Dense + Sparse | - | No | Penggabungan hasil vektor dan BM25 (RRF). |
| **Hybrid + Rerank** | Dense + Sparse | Cross-Encoder | No | Hybrid dengan tahap *reranking* (TinyBERT). |
| **Agentic RAG** | Dense + Sparse | Cross-Encoder | **Yes** | Sistem penuh dengan perencanaan multi-langkah. |

Setiap konfigurasi dievaluasi menggunakan dataset standar 50 pertanyaan (lihat bagian Dataset Pertanyaan) dan hasilnya dianalisis menggunakan uji signifikansi statistik (ANOVA dan t-test) untuk memastikan validitas temuan.
