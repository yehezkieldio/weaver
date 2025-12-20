# Metodologi: Peringkatan Ulang Multi-Strategi (*Multi-Strategy Re-Ranking*)

Bagian ini menguraikan tahap peringkatan ulang (*reranking*) yang berfungsi sebagai penyaring akhir dalam pipeline temu kembali informasi. Tahap ini krusial untuk meningkatkan presisi dokumen yang disajikan kepada *Large Language Model* (LLM), mengingat keterbatasan *context window* dan kecenderungan model untuk terdistraksi oleh informasi yang tidak relevan (*lost in the middle phenomenon*).

## 1. Rasionalisasi Peringkatan Ulang

Pencarian awal (tahap *retrieval*) umumnya mengoptimalkan *Recall* (menemukan sebanyak mungkin dokumen relevan) dengan mengorbankan *Precision*. Algoritma seperti BM25 atau kesamaan kosinus vektor sering kali memberikan skor tinggi pada dokumen yang secara leksikal atau semantik mirip namun tidak menjawab pertanyaan spesifik pengguna secara kausal. *Reranker* bertujuan untuk menata ulang daftar $K$ dokumen teratas ($D_{init}$) menjadi daftar terurut baru ($D_{reranked}$) berdasarkan relevansi mendalam.

## 2. Strategi Peringkatan

Sistem mengimplementasikan pendekatan multi-strategi yang memungkinkan pemilihan metode berdasarkan *trade-off* antara latensi dan akurasi.

### 2.1. Cross-Encoder (TinyBERT)
Ini adalah strategi default untuk mode produksi karena keseimbangan optimal antara kecepatan dan kinerja. Berbeda dengan *Bi-Encoder* yang memisahkan pemrosesan query dan dokumen, *Cross-Encoder* memproses pasangan $(Query, Document)$ secara simultan melalui lapisan *self-attention*.

Formulasi skor relevansi $S_{CE}$:
$$
S_{CE}(Q, D) = \sigma(\text{BERT}_{CLS}(Q \oplus [\text{SEP}] \oplus D))
$$
Dimana $\sigma$ adalah fungsi sigmoid yang memetakan logit keluaran model menjadi probabilitas $[0, 1]$. Model yang digunakan adalah varian terdistilasi (TinyBERT) yang memiliki latensi inferensi ~100ms pada CPU.

### 2.2. LLM Pointwise Reranking
Strategi ini memanfaatkan LLM (GPT-4o-mini) untuk menilai setiap dokumen secara independen. Prompt khusus instruksional digunakan untuk meminta model memberikan skor relevansi numerik beserta alasannya.

Format Prompt:
> "Nilai relevansi dokumen berikut terhadap pertanyaan pengguna pada skala 0.0 hingga 1.0. Berikan alasan singkat."

Kelebihan metode ini adalah kemampuan penalaran yang lebih tinggi ("dokumen ini relevan karena menjelaskan metodologi, bukan hanya menyebutkan kata kunci"), namun dengan biaya komputasi yang linear terhadap jumlah dokumen ($O(N)$).

### 2.3. LLM Listwise Reranking
Untuk mengatasi inefisiensi *pointwise*, strategi *listwise* memasukkan seluruh daftar kandidat dokumen ke dalam satu prompt LLM dan meminta model untuk mengurutkannya sekaligus.
$$ 
\text{Rankings} = \text{LLM}(Q, \{D_1, D_2, \dots, D_K\})
$$ 
Metode ini sangat efektif untuk menangkap nuansa komparatif antar dokumen, namun sensitif terhadap urutan input (*positional bias*) dan batasan panjang konteks.

### 2.4. Ensemble Reranking (Mode Riset)
Untuk keperluan evaluasi dan akurasi maksimum, sistem menerapkan metode *Ensemble* yang menggabungkan skor dari berbagai reranker menggunakan pembobotan linear:

$$ 
S_{final}(d) = w_{CE} \cdot S_{CE}(d) + w_{LLM} \cdot S_{LLM}(d) + w_{init} \cdot S_{init}(d) 
$$ 

Dimana:
*   $S_{CE}$: Skor Cross-Encoder
*   $S_{LLM}$: Skor LLM (Pointwise/Listwise)
*   $S_{init}$: Skor awal dari tahap retrieval (RRF)
*   Bobot default: $w_{CE}=0.4, w_{LLM}=0.4, w_{init}=0.2$

## 3. Evaluasi Kinerja Reranker

Efektivitas modul reranker dievaluasi menggunakan metrik standar *Information Retrieval*:

### 3.1. Normalized Discounted Cumulative Gain (NDCG)
Mengukur kualitas peringkat dengan memperhitungkan posisi dokumen relevan (semakin tinggi semakin baik).

$$ 
\text{DCG}_k = \sum_{i=1}^{k} \frac{rel_i}{\log_2(i+1)}
$$ 
$$ 
\text{NDCG}_k = \frac{\text{DCG}_k}{\text{IDCG}_k}
$$ 

### 3.2. Mean Reciprocal Rank (MRR)
Mengukur rata-rata kebalikan peringkat dari dokumen relevan pertama yang ditemukan.

$$ 
\text{MRR} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}
$$ 

### Deskripsi Diagram Perbandingan Strategi (Untuk Visualisasi)
> **Gambar 1: Perbandingan Latensi vs Akurasi Strategi Reranking.**
>
> *Visualisasi berupa Scatter Plot:*
> *   **Sumbu X**: Latensi Rata-rata (ms)
> *   **Sumbu Y**: Akurasi (NDCG@10)
> *   **Titik Data**:
>     *   *None (Baseline)*: Latensi ~0ms, Akurasi Rendah.
>     *   *Cross-Encoder*: Latensi ~100ms, Akurasi Tinggi (Sweet Spot).
>     *   *LLM Pointwise*: Latensi ~2000ms, Akurasi Sangat Tinggi.
>     *   *Ensemble*: Latensi ~2500ms, Akurasi Maksimum.
