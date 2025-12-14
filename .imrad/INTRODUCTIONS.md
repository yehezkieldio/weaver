# PENDAHULUAN (INTRODUCTION)

## 1.1 Latar Belakang

Perkembangan teknologi kecerdasan buatan (Artificial Intelligence/AI), khususnya Large Language Models (LLM), telah membawa transformasi signifikan dalam berbagai domain aplikasi, termasuk sistem tanya-jawab otomatis (Question-Answering Systems). Model seperti GPT-4 (OpenAI, 2023), Claude 3 (Anthropic, 2024), dan Gemini (Google DeepMind, 2023) menunjukkan kemampuan luar biasa dalam memahami dan menghasilkan teks natural language dengan koherensi tinggi. Kemampuan ini membuka peluang otomatisasi layanan informasi yang sebelumnya memerlukan keterlibatan manusia secara intensif, termasuk layanan akademik di perguruan tinggi.

Layanan informasi akademik di perguruan tinggi Indonesia menghadapi tantangan struktural yang kompleks. Pertumbuhan populasi mahasiswa yang pesat—dengan rata-rata peningkatan 8-12% per tahun di universitas-universitas besar (Kemenristekdikti, 2022)—tidak diimbangi dengan penambahan proporsional sumber daya administrasi. Akibatnya, staf administrasi menghadapi volume pertanyaan berulang yang tinggi terkait prosedur akademik (misal: pengisian Kartu Rencana Studi/KRS, pengajuan cuti akademik, persyaratan wisuda), yang menyebabkan keterlambatan respons, inkonsistensi informasi, dan inefisiensi operasional. Survei internal di beberapa universitas menunjukkan bahwa 60-70% pertanyaan mahasiswa bersifat repetitif dan dapat dijawab melalui dokumen akademik yang sudah tersedia (Widyastuti & Purwanto, 2023).

Large Language Models menawarkan solusi potensial untuk otomatisasi layanan tersebut. Namun, LLM generik memiliki keterbatasan fundamental yang membatasi aplikasi langsungnya dalam konteks akademik institusional. Pertama, LLM rentan terhadap **halusinasi**—kecenderungan menghasilkan informasi yang terdengar masuk akal namun faktual tidak akurat atau tidak berdasar (Ji et al., 2023). Dalam konteks akademik, halusinasi dapat menyebabkan mahasiswa menerima informasi keliru tentang kebijakan institusi, deadline, atau prosedur administratif, yang berpotensi merugikan. Kedua, LLM memiliki **knowledge cut-off**—pengetahuan terbatas pada data pelatihan yang dikumpulkan sebelum tanggal tertentu. Ini berarti LLM tidak mengetahui kebijakan atau peraturan akademik lokal yang spesifik untuk institusi tertentu (misal: aturan akademik Universitas Mulia), apalagi perubahan kebijakan terkini. Ketiga, LLM mengalami **lexical gap**—kesulitan mengenali terminologi domain-spesifik atau akronim yang tidak umum dalam korpus pelatihan umum. Sebagai contoh, LLM mungkin tidak memahami bahwa "KRS" merujuk pada "Kartu Rencana Studi" dalam konteks akademik Indonesia.

Untuk mengatasi keterbatasan ini, paradigma **Retrieval-Augmented Generation (RAG)** telah muncul sebagai pendekatan yang menjanjikan (Lewis et al., 2020). RAG menggabungkan kekuatan retrieval systems (pengambilan informasi relevan dari basis pengetahuan eksternal) dengan generative capabilities LLM. Mekanisme kerjanya: ketika pengguna mengajukan pertanyaan, sistem RAG terlebih dahulu mengambil (retrieve) dokumen atau potongan teks (chunks) yang relevan dari knowledge base, kemudian menyediakan dokumen tersebut sebagai konteks (context grounding) kepada LLM untuk menghasilkan jawaban. Pendekatan ini secara empiris terbukti mengurangi halusinasi karena LLM diarahkan untuk menjawab berdasarkan fakta yang terkandung dalam dokumen yang diambil (Es et al., 2023; Gao et al., 2023).

Namun, sistem RAG konvensional menghadapi trade-off mendasar dalam strategi retrieval. Metode retrieval dapat dikategorikan menjadi dua paradigma utama: **dense retrieval (vector search)** dan **sparse retrieval (keyword search)**. Dense retrieval menggunakan neural embeddings untuk mengkodekan query dan dokumen ke dalam vector space berdimensi tinggi (misal: 768-dimensi untuk BERT, 1536-dimensi untuk OpenAI embeddings), kemudian mengukur kesamaan semantik melalui cosine similarity atau dot product (Karpukhin et al., 2020). Keunggulan dense retrieval adalah kemampuannya menangkap makna semantik yang dalam, sehingga dapat mengambil dokumen relevan meskipun tidak ada kecocokan kata kunci eksak (misal: query "bagaimana cara mengundurkan diri dari kampus" dapat menemukan dokumen tentang "cuti akademik" meskipun tidak ada kata "mengundurkan diri" dalam dokumen). Namun, dense retrieval mengalami **lexical gap**—kesulitan menangkap kata kunci spesifik yang penting, terutama nama entitas, akronim, atau terminologi teknis (Formal et al., 2021). Sebagai contoh, query "KRS" mungkin tidak meng-retrieve dokumen yang relevan jika embedding model tidak terlatih dengan baik pada korpus akademik Indonesia.

Sebaliknya, sparse retrieval seperti **BM25 (Best Matching 25)** atau full-text search berbasis pada term frequency-inverse document frequency (TF-IDF) dengan length normalization (Robertson & Zaragoza, 2009). BM25 sangat efektif untuk keyword matching eksak dan telah menjadi baseline standar dalam information retrieval selama lebih dari dua dekade. Namun, sparse retrieval gagal menangkap nuansa semantik—dokumen yang menggunakan sinonim atau parafrase tidak akan ter-retrieve meskipun semantik identik. Sebagai contoh, query "persyaratan untuk lulus kuliah" mungkin tidak menemukan dokumen yang menggunakan frasa "kriteria kelulusan" karena tidak ada term overlap.

Penelitian terkini menunjukkan bahwa **hybrid retrieval**—kombinasi dense dan sparse methods—dapat mengatasi trade-off ini (Luan et al., 2021; Sawarkar et al., 2024). Namun, implementasi hybrid retrieval di sebagian besar sistem RAG bergantung pada database-native full-text search (FTS) engines seperti Postgres `tsvector` atau Elasticsearch, yang menciptakan vendor lock-in. Jika institusi ingin migrasi dari satu vector database ke database lain (misal: dari Postgres pgvector ke Qdrant atau Milvus), mereka akan kehilangan kapabilitas keyword search karena logika tersebut terikat pada database engine. Pendekatan alternatif yang lebih agile adalah mengimplementasikan keyword scoring (BM25) di **application layer** (bukan database layer), sehingga logika retrieval menjadi bagian dari kode aplikasi yang dapat di-port ke berbagai backend storage.

Bahkan dengan hybrid retrieval yang optimal, sistem RAG tradisional menghadapi keterbatasan lain: ketidakmampuan menangani **query kompleks yang memerlukan multi-step reasoning**. Query akademik sering bersifat multi-faceted dan memerlukan dekomposisi. Sebagai contoh, pertanyaan "Bandingkan metodologi penelitian kuantitatif dan kualitatif, kapan sebaiknya saya menggunakan masing-masing untuk skripsi saya?" tidak dapat dijawab dengan optimal melalui single-step retrieval karena memerlukan: (1) pengambilan informasi tentang metodologi kuantitatif, (2) pengambilan informasi tentang metodologi kualitatif, (3) pengambilan kriteria pemilihan metodologi, dan (4) sintesis komparatif dari ketiga aspek tersebut. Single-step RAG akan meng-retrieve satu set dokumen secara generik, yang mungkin tidak mencakup semua aspek pertanyaan secara komprehensif.

Paradigma **Agentic AI** telah muncul sebagai solusi untuk limitasi ini (Yao et al., 2023; Singh et al., 2025). Agentic systems tidak hanya melakukan retrieval dan generation dalam satu langkah, tetapi menggunakan **multi-step reasoning**—di mana LLM bertindak sebagai "agent" yang dapat: (1) merencanakan langkah-langkah (planning), (2) menggunakan tools eksternal (tool use), (3) merefleksikan hasil intermediate (reflection), dan (4) melakukan iterasi hingga mencapai solusi optimal (iteration). Dalam konteks RAG, agentic approach memungkinkan sistem untuk melakukan query decomposition (memecah pertanyaan kompleks menjadi sub-pertanyaan), parallel retrieval (mengambil informasi dari berbagai aspek secara paralel), dan multi-document synthesis (menggabungkan informasi dari berbagai sumber menjadi jawaban koheren). Framework seperti ReAct (Reason + Act) pattern (Yao et al., 2023) dan Reflexion (Shinn et al., 2023) telah menunjukkan peningkatan signifikan dalam akurasi untuk task yang memerlukan penalaran kompleks.

Namun, penelitian tentang **Agentic RAG** masih terbatas, terutama dalam konteks domain-spesifik seperti akademik, dan lebih terbatas lagi untuk bahasa Indonesia. Sebagian besar penelitian existing fokus pada dataset English-only seperti Natural Questions (Kwiatkowski et al., 2019), MS MARCO (Nguyen et al., 2016), atau HotpotQA (Yang et al., 2018). Evaluasi sistem RAG juga menghadapi tantangan metodologis: metrik tradisional seperti BLEU atau ROUGE tidak adequate untuk mengukur kualitas generation (Liu et al., 2023). Framework **RAGAS (Retrieval-Augmented Generation Assessment)** (Es et al., 2023) telah diperkenalkan sebagai solusi—menggunakan LLM-as-a-Judge untuk mengevaluasi dimensi-dimensi seperti faithfulness (apakah jawaban didukung oleh konteks), answer relevancy (apakah jawaban menjawab pertanyaan), context precision (apakah dokumen yang diambil relevan), dan context recall (apakah semua informasi relevan diambil). Namun, aplikasi RAGAS pada domain akademik bilingual (Indonesia-Inggris) belum dieksplorasi secara sistematis.

## 1.2 Tinjauan Literatur (Literature Review)

### 1.2.1 Retrieval-Augmented Generation (RAG)

Paradigma RAG pertama kali diperkenalkan oleh Lewis et al. (2020) dalam paper seminal "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" yang dipresentasikan di NeurIPS 2020. Mereka mengusulkan arsitektur yang menggabungkan pre-trained sequence-to-sequence model (BART atau T5) dengan dense passage retriever (DPR) berbasis BERT. Evaluasi pada lima task knowledge-intensive—Natural Questions, TriviaQA, WebQuestions, CuratedTREC, dan Jeopardy—menunjukkan bahwa RAG mengungguli large language models tanpa retrieval (misal: GPT-3 175B) meskipun menggunakan model yang jauh lebih kecil (BART-large 400M parameters). Keunggulan utama RAG adalah kemampuannya untuk: (1) men-ground generation pada fakta eksternal, mengurangi halusinasi; (2) memperbarui pengetahuan tanpa retraining model (cukup update knowledge base); dan (3) menyediakan eksplainability melalui retrieved documents sebagai evidensi.

Sejak publikasi Lewis et al. (2020), ekosistem RAG telah berkembang pesat. Gao et al. (2023) dalam survey komprehensif "Retrieval-Augmented Generation for Large Language Models: A Survey" mengidentifikasi tiga kategori utama RAG: (1) **Naive RAG**—retrieve-then-read pipeline sederhana; (2) **Advanced RAG**—dengan pre-retrieval optimization (query rewriting), retrieval optimization (hybrid search), dan post-retrieval optimization (reranking); dan (3) **Modular RAG**—dengan komponen yang dapat di-swap seperti iterative retrieval, adaptive retrieval, atau multi-modal RAG. Penelitian kami termasuk dalam kategori Advanced RAG dengan tambahan agentic orchestration.

### 1.2.2 Hybrid Retrieval: Dense + Sparse Methods

Keterbatasan dense retrieval (vector search) dan sparse retrieval (keyword search) telah memotivasi pengembangan hybrid approaches. Luan et al. (2021) dalam "Sparse, Dense, and Attentional Representations for Text Retrieval" mengusulkan framework unifikasi yang menggabungkan dense (BERT-based), sparse (BM25), dan learned sparse representations (DeepCT). Evaluasi pada MS MARCO passage retrieval menunjukkan bahwa kombinasi dense + sparse meningkatkan MRR@10 sebesar 8-12% dibandingkan metode tunggal.

Namun, challenge utama hybrid retrieval adalah **fusion strategy**—bagaimana menggabungkan skor dari dua metode yang heterogen (cosine similarity dari vector search vs BM25 score dari keyword search) menjadi ranking terpadu. Beberapa pendekatan telah diusulkan:

1. **Linear Interpolation**: `score_final = α·score_vector + β·score_BM25` (Ma et al., 2021). Simple namun memerlukan normalization skor dan tuning bobot α, β.

2. **Reciprocal Rank Fusion (RRF)**: `RRF(d) = Σ[1/(k + rank(d))]` untuk semua ranking r ∈ R (Cormack et al., 2009). Keunggulan RRF adalah parameter-free (hanya konstanta k, biasanya k=60) dan tidak memerlukan normalization skor karena berbasis rank.

3. **Learning-to-Rank (LTR)**: Melatih model supervisi (misal: LambdaMART, RankNet) untuk mempelajari kombinasi optimal dari berbagai features (Liu, 2011). Memerlukan labeled data dan kompleksitas tinggi.

Penelitian kami mengadopsi RRF karena simplicity dan efektivitasnya yang terbukti. Cormack et al. (2009) menunjukkan bahwa RRF sering mengungguli metod fusion yang lebih kompleks pada TREC benchmark.

### 1.2.3 Okapi BM25: The Gold Standard for Keyword Search

BM25 (Best Matching 25) adalah probabilistic relevance framework yang dikembangkan oleh Robertson & Zaragoza (2009) sebagai evolusi dari BM11, BM15, dan varian sebelumnya. BM25 mengatasi keterbatasan TF-IDF melalui dua mekanisme kunci:

1. **Term Frequency Saturation**: TF-IDF meningkatkan skor secara linear dengan frequency, yang problematic untuk dokumen panjang. BM25 menggunakan saturation function dengan parameter k₁ yang membuat marginal gain berkurang pada high frequency.

2. **Document Length Normalization**: BM25 menormalisasi panjang dokumen dengan parameter b, menghindari bias terhadap dokumen pendek atau panjang.

Formula BM25:
```
BM25(D, Q) = Σ IDF(qᵢ) · [f(qᵢ,D) · (k₁+1)] / [f(qᵢ,D) + k₁·(1-b+b·|D|/avgdl)]
```

di mana IDF (Inverse Document Frequency):
```
IDF(qᵢ) = ln[(N - n(qᵢ) + 0.5) / (n(qᵢ) + 0.5) + 1]
```

Robertson & Zaragoza (2009) merekomendasikan k₁=1.2 dan b=0.75 sebagai standar untuk long documents, meskipun optimal values dapat bervariasi by domain.

**BM25+ Modification** (Lv & Zhai, 2011) menambahkan konstanta δ untuk mengatasi issue lower-bounding pada BM25 original:
```
BM25+(D, Q) = Σ IDF(qᵢ) · [(f(qᵢ,D) + δ) · (k₁+1)] / [f(qᵢ,D) + k₁·(1-b+b·|D|/avgdl)]
```

dengan δ=1 sebagai default. Penelitian kami menggunakan BM25+ dengan δ=1.

### 1.2.4 Neural Reranking

Meskipun hybrid retrieval meningkatkan recall, presisi dapat ditingkatkan lebih lanjut melalui **reranking**—proses menyusun ulang hasil retrieval menggunakan model yang lebih sophisticated. Nogueira & Cho (2019) memperkenalkan **monoT5**—model T5 yang di-fine-tune untuk binary relevance classification (relevant/not relevant) pada setiap pasangan query-document. Lin et al. (2021) mengembangkan **cross-encoder rerankers** berbasis BERT yang secara langsung meng-encode pasangan [query, document] dan menghasilkan relevance score.

Keunggulan cross-encoder dibanding bi-encoder (yang digunakan dalam vector search) adalah cross-attention mechanism yang memungkinkan interaksi langsung antara query dan document tokens. Namun, cross-encoder memiliki computational cost tinggi (O(n) forward passes untuk n dokumen vs O(1) untuk bi-encoder setelah indexing). Oleh karena itu, strategi umum adalah two-stage pipeline: bi-encoder untuk candidate generation (high recall, low cost), cross-encoder untuk reranking (high precision, high cost).

Sun et al. (2023) mengusulkan **LLM-based listwise reranking**: alih-alih scoring setiap dokumen independently (pointwise) atau pairwise, LLM menerima list dokumen dan menghasilkan ranking lengkap dalam satu inference. Pendekatan ini memanfaatkan kemampuan in-context learning LLM untuk memahami relative relevance. Evaluasi pada BEIR benchmark menunjukkan LLM listwise reranking (GPT-4) mengungguli cross-encoder pada 8 dari 13 dataset.

**Ensemble Reranking** menggabungkan multiple rerankers untuk robustness (Wang et al., 2023). Penelitian kami menggunakan ensemble cross-encoder + LLM listwise dengan weighted averaging.

### 1.2.5 Semantic Chunking

Chunking strategy—bagaimana dokumen panjang dipecah menjadi chunks yang dapat di-embed dan di-retrieve—memiliki dampak signifikan pada performa RAG (Nori et al., 2023). Strategi tradisional termasuk:

1. **Fixed-size Chunking**: Memotong dokumen setiap N tokens (misal: 512 tokens). Simple namun sering memotong di tengah kalimat atau paragraf, merusak koherensi semantik.

2. **Recursive Chunking**: Memotong berdasarkan hierarchical delimiters (section → paragraph → sentence). Lebih baik mempertahankan struktur namun tidak optimal untuk dokumen tanpa struktur jelas.

3. **Sentence-window**: Satu kalimat sebagai chunk, namun menyediakan window konteks sebelum/sesudah saat generation (Anthropic, 2023).

**Semantic Chunking** (Kamradt, 2024) menggunakan embedding similarity untuk menentukan boundaries: embed setiap kalimat, hitung cosine similarity antar kalimat berurutan, buat chunk baru ketika similarity turun di bawah threshold. Pendekatan ini memastikan setiap chunk memiliki topical coherence. Evaluasi empiris menunjukkan semantic chunking meningkatkan context recall 10-15% dibandingkan fixed-size (Liu et al., 2024).

### 1.2.6 Agentic AI dan ReAct Pattern

**ReAct (Reasoning + Acting)** (Yao et al., 2023) adalah framework agentic yang mengintegrasikan reasoning traces dengan action execution dalam interleaved manner. Pada setiap step, agent: (1) menghasilkan thought (penalaran tentang apa yang harus dilakukan), (2) mengeksekusi action (menggunakan tool), (3) menerima observation (hasil dari action), dan (4) repeat hingga task selesai. ReAct mengungguli chain-of-thought prompting pada task yang memerlukan akses ke external information (HotpotQA, FEVER).

Singh et al. (2025) dalam "Agentic Retrieval-Augmented Generation: A Survey" mengkategorikan Agentic RAG menjadi:
- **Query Planning Agents**: Dekomposisi query kompleks menjadi sub-queries
- **Retrieval Agents**: Adaptive retrieval dengan multi-iteration
- **Generation Agents**: Self-correction dan verification
- **Orchestration Agents**: Koordinasi multiple specialized agents

Penelitian kami mengimplementasikan Query Planning + Retrieval + Generation agents dengan tools: `search_documents`, `decompose_query`, `expand_query`, `verify_claim`, dan `synthesize_answer`.

### 1.2.7 Evaluasi RAG: RAGAS Framework

Evaluasi generasi teks secara tradisional menggunakan metrik n-gram overlap seperti BLEU, ROUGE, atau METEOR. Namun, metrik ini tidak adequate untuk RAG karena tidak mengukur dimensi penting seperti faithfulness (grounding pada konteks) atau hallucination. Es et al. (2023) memperkenalkan **RAGAS** dengan empat metrik utama:

1. **Faithfulness**: Proporsi klaim dalam jawaban yang dapat di-verify dari retrieved context. Dihitung dengan: (a) LLM ekstrak klaim dari answer, (b) LLM verify setiap klaim vs context menggunakan NLI, (c) Faithfulness = |Claims_supported| / |Claims_total|.

2. **Answer Relevancy**: Seberapa relevan jawaban terhadap pertanyaan. Dihitung dengan reverse QA: LLM generate N pertanyaan dari answer, hitung embedding similarity dengan original question, average cosine similarity.

3. **Context Precision**: Proporsi dokumen retrieved yang relevan untuk menjawab pertanyaan (presisi retrieval).

4. **Context Recall**: Proporsi informasi relevan yang berhasil di-retrieve (recall retrieval).

RAGAS telah diadopsi secara luas dalam industri (LangChain, LlamaIndex) dan penelitian akademis sebagai standar evaluasi RAG.

### 1.2.8 LLM-as-a-Judge

Penggunaan LLM sebagai evaluator otomatis (LLM-as-a-Judge) telah menjadi paradigma emerging untuk evaluasi generasi teks (Zheng et al., 2023). Dibandingkan human evaluation (expensive, slow, low inter-annotator agreement) atau automatic metrics (limited correlation dengan quality), LLM-as-a-Judge menawarkan trade-off optimal: scalable, relatively low-cost, dan high correlation dengan human judgment (Spearman's ρ = 0.80-0.85 untuk GPT-4).

Namun, LLM-as-a-Judge memiliki biases yang perlu dimitigasi (Panickssery et al., 2024):
- **Self-preference bias**: LLM cenderung memberi skor tinggi pada output yang mirip dengan gaya sendiri
- **Position bias**: Preference terhadap jawaban di posisi tertentu (misal: preferensi pertama)
- **Length bias**: Preferensi terhadap jawaban lebih panjang terlepas dari quality

Mitigasi yang kami gunakan: (1) fokus pada **relative comparison** antar konfigurasi (bukan absolute scores), (2) menggunakan model yang sama untuk generasi dan evaluasi (konsistensi bias across configurations).

## 1.3 Kesenjangan Penelitian (Research Gap)

Berdasarkan tinjauan literatur, kami mengidentifikasi kesenjangan penelitian sebagai berikut:

**Gap 1: Hybrid Retrieval dengan Database Agility**
Sebagian besar sistem hybrid retrieval (Luan et al., 2021; Ma et al., 2021) mengandalkan database-native FTS engines (Postgres tsvector, Elasticsearch) yang menciptakan vendor lock-in. Tidak ada penelitian yang mengimplementasikan BM25 di application layer untuk database agility, memungkinkan swap vector store tanpa kehilangan keyword search capability.

**Gap 2: Local IDF vs Global IDF pada RAG**
Implementasi BM25 standar menghitung Global IDF dari entire corpus, memerlukan inverted index yang expensive untuk di-maintain (Robertson & Zaragoza, 2009). Pendekatan Local IDF—menghitung IDF dari candidate pool hasil vector search—belum di-explore secara empiris dalam konteks RAG. Ini berpotensi memberikan trade-off optimal antara precision dan computational overhead.

**Gap 3: Agentic RAG untuk Domain Akademik Bilingual**
Penelitian agentic RAG (Singh et al., 2025; Yao et al., 2023) sebagian besar fokus pada dataset English-only dan domain general (QA, fact-checking). Tidak ada penelitian yang mengimplementasikan agentic RAG untuk domain akademik Indonesia-Inggris dengan evaluasi sistematis menggunakan RAGAS framework.

**Gap 4: Ablation Study Komprehensif untuk RAG Systems**
Sebagian besar penelitian RAG melakukan comparison binary (RAG vs Non-RAG) atau comparison limited (2-3 konfigurasi). Ablation study sistematis dengan 10+ konfigurasi yang mengisolasi kontribusi setiap komponen (retrieval strategy, chunking, reranking, agentic mode) belum dilakukan secara comprehensive.

**Gap 5: Statistical Rigor dalam Evaluasi RAG**
Banyak penelitian melaporkan hasil tanpa statistical significance testing atau effect size (Gao et al., 2023). Aplikasi paired t-test, ANOVA, confidence intervals, dan Cohen's d pada evaluasi RAG masih terbatas.

## 1.4 Pertanyaan Penelitian (Research Questions)

Berdasarkan kesenjangan penelitian di atas, penelitian ini bertujuan menjawab pertanyaan-pertanyaan berikut:

**RQ1**: Seberapa signifikan peningkatan akurasi sistem RAG dibandingkan dengan baseline Non-RAG dalam metrik Faithfulness dan Answer Relevancy pada domain akademik bilingual (Indonesia-Inggris)?

**RQ2**: Apakah pendekatan Hybrid Retrieval (Vector + BM25 + RRF) lebih efektif dibandingkan single-method retrieval (Vector-only atau BM25-only) dalam hal Precision@K dan Recall@K? Bagaimana kontribusi Local IDF approach pada performa sistem?

**RQ3**: Bagaimana trade-off antara akurasi dan latensi pada sistem Agentic RAG dibandingkan dengan Traditional RAG? Pada jenis query apa Agentic mode memberikan peningkatan signifikan?

**RQ4**: Bagaimana kontribusi individual setiap komponen sistem—termasuk chunking strategy (fixed vs recursive vs semantic), reranking method (none vs cross-encoder vs LLM vs ensemble), dan agent configuration (single-step vs multi-step)—terhadap performa keseluruhan berdasarkan ablation study sistematis?

**RQ5**: Bagaimana distribusi performa sistem across kategori pertanyaan akademik yang berbeda (academic_process, research_methodology, academic_writing, university_policy, general_academic) dan tingkat kompleksitas (simple, medium, complex)?

## 1.5 Tujuan Penelitian

### 1.5.1 Tujuan Umum

Mengembangkan dan mengevaluasi sistem Agentic Retrieval-Augmented Generation (RAG) dengan arsitektur Hybrid Retrieval untuk otomatisasi layanan mahasiswa yang akurat, andal, dan dapat direplikasi dalam konteks perguruan tinggi Indonesia.

### 1.5.2 Tujuan Khusus

1. **Merancang dan mengimplementasikan arsitektur Hybrid Retrieval** yang menggabungkan Vector Search (pgvector) dengan Okapi BM25 in-memory menggunakan Reciprocal Rank Fusion (RRF), dengan BM25 diimplementasikan di application layer untuk database agility.

2. **Mengimplementasikan strategi Local IDF** pada BM25 yang menghitung Inverse Document Frequency dari candidate pool hasil vector search (bukan global corpus), untuk mengurangi computational overhead sambil mempertahankan precision.

3. **Mengembangkan Agentic Workflow** dengan multi-step reasoning menggunakan AI SDK 5.x, mengimplementasikan tools untuk query decomposition, query expansion, claim verification, dan multi-source synthesis.

4. **Mengimplementasikan sistem evaluasi otomatis** berbasis RAGAS (Faithfulness, Answer Relevancy, Context Precision, Context Recall) dengan LLM-as-a-Judge menggunakan GPT-4.1-mini.

5. **Melakukan ablation study sistematis** terhadap 13 konfigurasi berbeda untuk mengidentifikasi kontribusi individual komponen: retrieval strategy, chunking method, reranking approach, dan agent configuration.

6. **Menganalisis performa secara statistik** menggunakan Paired t-test (untuk RAG vs Non-RAG), One-way ANOVA (untuk perbandingan multi-konfigurasi), Tukey HSD (post-hoc test), Cohen's d (effect size), dan 95% Confidence Intervals.

7. **Memvalidasi efektivitas sistem** pada domain akademik bilingual (Indonesia-Inggris) dengan dataset mencakup 40 test questions dari 5 kategori domain dan 3 tingkat kompleksitas.

8. **Mendokumentasikan sistem secara comprehensive** untuk reproducibility dan replicability di institusi akademik lain.

## 1.6 Hipotesis Penelitian

### 1.6.1 Hipotesis Utama

**H₁ (RAG vs Non-RAG)**
- **H₀**: Tidak ada perbedaan yang signifikan antara sistem RAG dan Non-RAG dalam metrik Faithfulness.
- **H₁**: Sistem RAG menghasilkan skor Faithfulness yang secara signifikan lebih tinggi dibandingkan Non-RAG (p < 0.05, dengan large effect size Cohen's d > 0.8).
- **Justifikasi**: RAG memberikan grounding pada dokumen faktual, mengurangi halusinasi (Lewis et al., 2020; Ji et al., 2023).

**H₂ (Hybrid vs Single-Method Retrieval)**
- **H₀**: Tidak ada perbedaan yang signifikan antara Hybrid Retrieval dan single-method retrieval (Vector-only atau BM25-only).
- **H₁**: Hybrid Retrieval menghasilkan Precision@K dan Recall@K yang secara signifikan lebih tinggi dibandingkan Vector-only dan BM25-only (p < 0.05).
- **Justifikasi**: Hybrid approach mengatasi trade-off semantic understanding vs keyword precision (Luan et al., 2021).

**H₃ (Agentic vs Traditional RAG)**
- **H₀**: Tidak ada perbedaan yang signifikan antara Agentic RAG dan Traditional RAG dalam menangani query kompleks.
- **H₁**: Agentic RAG menghasilkan Answer Relevancy yang secara signifikan lebih tinggi untuk query kompleks (complexity = "complex") dibandingkan Traditional RAG, meskipun dengan trade-off peningkatan latensi (p < 0.05).
- **Justifikasi**: Multi-step reasoning memungkinkan dekomposisi dan synthesis yang lebih baik untuk query multi-faceted (Yao et al., 2023; Singh et al., 2025).

### 1.6.2 Hipotesis Sekunder

**H₄ (Reranking Impact)**
- **H₀**: Neural Reranking tidak memberikan kontribusi yang signifikan terhadap Context Precision.
- **H₁**: Sistem dengan Neural Reranking (Cross-Encoder, LLM, atau Ensemble) menghasilkan Context Precision lebih tinggi dibandingkan sistem tanpa reranking (p < 0.05).

**H₅ (Semantic Chunking)**
- **H₀**: Tidak ada perbedaan signifikan antara semantic chunking dan recursive chunking.
- **H₁**: Semantic chunking menghasilkan Context Recall lebih tinggi dibandingkan recursive chunking atau fixed chunking (p < 0.05).

**H₆ (Local IDF Effectiveness)**
- **H₀**: Local IDF (pada candidate pool) tidak berbeda secara signifikan dari implementasi BM25 standar.
- **H₁**: Local IDF approach menghasilkan Precision@K yang comparable dengan global BM25 (difference < 5%, p > 0.05), memvalidasi trade-off computational efficiency vs precision.

## 1.7 Signifikansi Penelitian

### 1.7.1 Kontribusi Teoritis

1. **Validasi Empiris Local IDF Approach**: Penelitian ini memberikan bukti empiris bahwa BM25 dengan Local IDF (calculated on vector search candidates) dapat mencapai precision comparable dengan Global IDF, dengan overhead computational jauh lebih rendah. Ini berkontribusi pada teori information retrieval terkait IDF approximation techniques.

2. **Trade-off Analysis untuk Agentic RAG**: Penelitian ini mengkuantifikasi trade-off akurasi vs latensi pada agentic systems secara sistematis, memberikan guidance untuk practitioner tentang kapan agentic approach justified by accuracy gain.

3. **Framework Ablation Study untuk RAG**: Penelitian ini menyediakan template metodologi untuk ablation study komprehensif pada RAG systems, dapat di-adopt oleh penelitian selanjutnya untuk standardisasi evaluasi.

### 1.7.2 Kontribusi Praktis

1. **Production-Ready System**: Implementasi lengkap dengan guardrails (PII detection, prompt injection prevention, hallucination mitigation), monitoring, dan evaluation dashboards yang dapat di-deploy di institusi akademik lain.

2. **Database-Agnostic Architecture**: Implementasi BM25 di application layer (TypeScript) memungkinkan institusi untuk swap vector stores (Postgres → Qdrant → Milvus) tanpa kehilangan keyword search capability, mengurangi vendor lock-in.

3. **Reproducibility dan Replicability**: Dokumentasi lengkap (13 master report files, ~100KB), kode open source dengan type-safe implementation (TypeScript + Drizzle ORM), dan configuration files untuk semua 13 ablation configs memungkinkan replikasi di institusi lain dengan minimal effort.

4. **Tooling untuk Institusi Akademik**: Chat interface, knowledge base management UI, dan evaluation dashboard yang dapat digunakan langsung oleh universitas untuk deploy internal chatbot systems.

### 1.7.3 Manfaat Sosial

1. **Peningkatan Aksesibilitas Layanan Akademik**: Mahasiswa dapat mengakses informasi 24/7 tanpa terbatas jam kerja administrasi, meningkatkan equity terutama untuk mahasiswa yang bekerja atau di zona waktu berbeda.

2. **Efisiensi Operasional**: Mengurangi beban staf administrasi untuk menjawab pertanyaan repetitif, memungkinkan mereka fokus pada task yang memerlukan human judgment.

3. **Konsistensi Informasi**: Semua mahasiswa menerima informasi yang konsisten dan up-to-date berdasarkan dokumen resmi, mengurangi misinformasi.

## 1.8 Ruang Lingkup dan Batasan Penelitian

### 1.8.1 Ruang Lingkup

1. **Domain**: Layanan akademik perguruan tinggi (informasi KRS, cuti, wisuda, metodologi penelitian, penulisan akademik).
2. **Bahasa**: Bilingual Indonesia-Inggris, dengan fokus mayoritas pada Bahasa Indonesia.
3. **Knowledge Base**: Dokumen akademik Universitas Mulia (50-100 dokumen, ~500K tokens).
4. **Test Dataset**: 40 pertanyaan akademik across 5 kategori dan 3 tingkat kompleksitas.
5. **Evaluation Metrics**: RAGAS (Faithfulness, Answer Relevancy, Context Precision/Recall), Precision@K, Recall@K, NDCG, MRR, Latency, Hallucination Rate.
6. **Statistical Tests**: Paired t-test, Independent t-test, One-way ANOVA, Tukey HSD, Cohen's d, η², 95% CI.

### 1.8.2 Batasan Penelitian

1. **Generalizability**: Hasil spesifik untuk domain akademik; transfer ke domain lain (medical, legal, technical) memerlukan validasi lebih lanjut.

2. **Dataset Size**: Knowledge base terbatas pada dokumen Universitas Mulia; corpus lebih besar mungkin menghasilkan performa berbeda.

3. **LLM-as-a-Judge Bias**: Menggunakan GPT-4.1-mini sebagai evaluator dan generator menciptakan potential self-preference bias; mitigasi dilakukan melalui relative comparison across configurations.

4. **Computational Cost**: Evaluasi dilakukan pada Azure OpenAI cloud infrastructure; deployment on-premise atau edge devices belum dieksplorasi.

5. **Temporal Validity**: Kebijakan akademik berubah over time; sistem memerlukan periodic knowledge base updates.

6. **Multimodal Content**: Penelitian fokus pada text-only; dokumen dengan images, tables, atau charts belum dioptimalkan (meskipun OCR diimplementasikan untuk basic extraction).

## 1.9 Definisi Operasional

**Retrieval-Augmented Generation (RAG)**: Paradigma yang menggabungkan information retrieval (pengambilan dokumen relevan dari knowledge base) dengan text generation (LLM menghasilkan jawaban berdasarkan dokumen yang diambil).

**Agentic RAG**: Ekstensi RAG di mana LLM bertindak sebagai "agent" dengan kemampuan multi-step reasoning, tool use, dan reflection untuk menangani query kompleks.

**Hybrid Retrieval**: Kombinasi dense retrieval (vector search berbasis embeddings) dan sparse retrieval (keyword search berbasis BM25) yang di-fuse menggunakan Reciprocal Rank Fusion (RRF).

**Faithfulness**: Metrik RAGAS yang mengukur proporsi klaim dalam jawaban yang dapat di-verify dari retrieved context (range: 0-1, higher is better).

**Answer Relevancy**: Metrik RAGAS yang mengukur seberapa relevan jawaban terhadap pertanyaan original (range: 0-1, higher is better).

**Hallucination**: Fenomena di mana LLM menghasilkan informasi yang terdengar reasonable namun faktual tidak akurat atau tidak berdasar pada konteks yang diberikan.

**Semantic Chunking**: Strategi memecah dokumen berdasarkan kesamaan semantic antar kalimat berurutan (similarity threshold = 0.5), bukan fixed token count.

**Local IDF**: Inverse Document Frequency yang dihitung dari candidate pool hasil vector search (30 chunks), bukan dari entire corpus.

**Ablation Study**: Metodologi eksperimen di mana komponen sistem dihapus atau dimodifikasi secara sistematis untuk mengidentifikasi kontribusi individual terhadap performa keseluruhan.

---

**Struktur Selanjutnya**: Setelah pendahuluan ini, paper akan melanjutkan dengan bagian **Metode** (Methods) yang menjelaskan desain penelitian, implementasi sistem, protokol evaluasi, dan analisis statistik secara detail.
