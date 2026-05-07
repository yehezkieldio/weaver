# Metodologi: Evaluasi RAGAS dan Metrik Kinerja

Evaluasi kualitas sistem *Retrieval-Augmented Generation* (RAG) dilakukan menggunakan kerangka kerja RAGAS (*Retrieval Augmented Generation Assessment*), yang merupakan standar industri untuk evaluasi otomatis sistem RAG. Pendekatan ini menggunakan *Large Language Model* (LLM) sebagai juri (*judge*) untuk menilai kualitas generasi dan pengambilan informasi tanpa memerlukan label manusia yang ekstensif.

## 1. Metrik Generasi (*Generation Metrics*)

Metrik ini mengevaluasi kualitas teks jawaban akhir yang dihasilkan oleh sistem.

### 1.1. Faithfulness (Kesetiaan)
Metrik ini mengukur sejauh mana jawaban yang dihasilkan didasarkan pada fakta yang terdapat dalam konteks yang diambil, untuk mendeteksi halusinasi. Dihitung dengan membagi jumlah klaim dalam jawaban yang dapat diverifikasi oleh konteks dengan total jumlah klaim yang dibuat.

$$ 
\text{Faithfulness} = \frac{|S_{\text{supported}}|}{|S_{\text{total}}|} 
$$ 

Dimana:
*   $S_{\text{supported}}$ adalah himpunan klaim dalam jawaban yang secara logis didukung (*entailed*) oleh konteks yang diambil.
*   $S_{\text{total}}$ adalah total klaim faktual yang diekstraksi dari jawaban.

### 1.2. Answer Relevancy (Relevansi Jawaban)
Metrik ini mengukur seberapa relevan jawaban terhadap pertanyaan pengguna, mengabaikan akurasi faktualnya (yang diukur oleh *Faithfulness*). Dihitung dengan menghasilkan pertanyaan sintetis $q_i$ dari jawaban $a$ dan menghitung rata-rata kesamaan kosinus (*cosine similarity*) antara *embedding* pertanyaan asli $q$ dan pertanyaan sintetis.

$$ 
\text{Answer Relevancy} = \frac{1}{N} \sum_{i=1}^{N} \cos(E(q), E(q_i)) 
$$ 

Dimana:
*   $E(\cdot)$ adalah fungsi *embedding*.
*   $q_i$ adalah pertanyaan sintetis ke-$i$ yang dihasilkan dari jawaban $a$.
*   $N$ adalah jumlah pertanyaan sintetis yang dibangkitkan (biasanya $N=3$). 

### 1.3. Answer Correctness (Kebenaran Jawaban)
Metrik ini mengukur akurasi jawaban dibandingkan dengan *Ground Truth* (jawaban referensi manusia). Ini merupakan kombinasi berbobot antara kesamaan semantik dan kesamaan faktual.

$$ 
\text{Answer Correctness} = w_1 \cdot \text{Sim}_{\text{semantic}}(a, g) + w_2 \cdot \text{Sim}_{\text{factual}}(a, g) 
$$ 

Dimana:
*   $a$ adalah jawaban sistem.
*   $g$ adalah *Ground Truth*.
*   $w_1$ dan $w_2$ adalah bobot (umumnya $w_1 = 0.3$ untuk semantik, $w_2 = 0.7$ untuk faktual).

## 2. Metrik Pengambilan (*Retrieval Metrics*)

Metrik ini mengevaluasi efektivitas komponen pencarian dalam menemukan dokumen yang relevan dari korpus.

### 2.1. Context Precision (Presisi Konteks)
Mengukur proporsi potongan (*chunks*) yang relevan di antara $K$ potongan teratas yang diambil, dengan memberikan bobot lebih tinggi pada dokumen relevan yang muncul di peringkat atas.

$$ 
\text{Context Precision@K} = \frac{\sum_{k=1}^{K} P@k \times \text{rel}_k}{\text{Total Relevant Retrieved}} 
$$ 

Dimana:
*   $P@k$ adalah presisi pada peringkat $k$.
*   $\text{rel}_k$ adalah indikator biner (1 jika relevan, 0 jika tidak).

### 2.2. Context Recall (Recall Konteks)
Mengukur sejauh mana konteks yang diambil mencakup seluruh informasi yang diperlukan untuk menjawab pertanyaan (berdasarkan *Ground Truth*).

$$ 
\text{Context Recall} = \frac{|\text{GT Sentences Attributed}|}{|\text{Total GT Sentences}|} 
$$ 

### 2.3. Context Relevancy (Relevansi Konteks)
Metrik tambahan yang mengukur relevansi absolut setiap *chunk* yang diambil terhadap kueri, dihitung sebagai rata-rata skor relevansi (0-1) yang diberikan oleh LLM-Juri untuk setiap *chunk*.

$$ 
\text{Context Relevancy} = \frac{1}{|C|} \sum_{c \in C} \text{Score}_{\text{LLM}}(q, c) 
$$ 

## 3. Metrik Efisiensi dan Operasional

Selain kualitas konten, aspek efisiensi sistem diukur untuk mengevaluasi kelayakan implementasi (*deployment*).

### 3.1. Latensi Total dan Komponen
Waktu eksekusi diukur secara *end-to-end* ($T_{\text{total}}$) serta dipecah per komponen:
*   $T_{\text{retrieval}}$: Waktu pencarian vektor dan kata kunci.
*   $T_{\text{reranking}}$: Waktu pemrosesan ulang peringkat dokumen.
*   $T_{\text{generation}}$: Waktu inferensi LLM.

### 3.2. Throughput Token
Kecepatan generasi teks diukur dalam token per detik (TPS), yang merupakan indikator penting untuk pengalaman pengguna (*User Experience*).

$$ 
\text{TPS} = \frac{\text{Total Output Tokens}}{T_{\text{generation}} \text{ (detik)}} 
$$