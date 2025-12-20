# Metodologi: Analisis Statistik Komparatif dan Asumsi (*Statistical Analysis - Comparative & Assumptions*)

Untuk memvalidasi keunggulan sistem RAG yang dikembangkan secara ilmiah, penelitian ini tidak hanya mengandalkan perbandingan rata-rata (*mean comparison*), tetapi menerapkan pengujian hipotesis statistik yang ketat. Bagian ini merinci prosedur pemilihan uji statistik, pemeriksaan asumsi data, dan metode komparatif yang digunakan.

## 1. Prosedur Pemilihan Uji Statistik Cerdas (*Smart Statistical Test Selection*)

Sistem analisis statistik yang dikembangkan (`smartStatisticalTest`) secara otomatis memilih uji hipotesis yang paling sesuai berdasarkan karakteristik distribusi data. Pendekatan ini menghindari kesalahan metodologis umum, seperti menggunakan uji parametrik pada data yang tidak berdistribusi normal.

### 1.1. Logika Keputusan
Pemilihan uji mengikuti pohon keputusan (*decision tree*) berikut:

1.  **Pemeriksaan Normalitas**: Menggunakan uji Shapiro-Wilk untuk menentukan apakah data berdistribusi normal ($p > 0.05$).
2.  **Pemeriksaan Homogenitas Varian**: Menggunakan uji Levene untuk menentukan kesamaan varians antar kelompok.
3.  **Pemilihan Uji**:
    *   **2 Kelompok (Berpasangan)**:
        *   Normal: *Paired t-test*.
        *   Tidak Normal: *Wilcoxon Signed-Rank Test*.
    *   **2 Kelompok (Independen)**:
        *   Normal & Homogen: *Independent t-test*.
        *   Normal & Tidak Homogen: *Welch’s t-test*.
        *   Tidak Normal: *Mann-Whitney U Test*.
    *   **>2 Kelompok (ANOVA)**:
        *   Normal & Homogen: *One-way ANOVA*.
        *   Normal & Tidak Homogen: *Welch’s ANOVA*.
        *   Tidak Normal: *Kruskal-Wallis H Test*.

## 2. Pemeriksaan Asumsi Statistik

Sebelum melakukan inferensi, serangkaian uji asumsi dilakukan secara otomatis untuk memvalidasi prasyarat uji statistik.

### 2.1. Uji Normalitas (Shapiro-Wilk)
Menguji hipotesis nol ($H_0$) bahwa sampel berasal dari populasi berdistribusi normal. Statistik uji $W$ dihitung sebagai:

$$
W = \frac{(\sum_{i=1}^{n} a_i x_{(i)})^2}{\sum_{i=1}^{n} (x_i - \bar{x})^2}
$$

Jika $p < 0.05$, asumsi normalitas ditolak, dan analisis beralih ke metode non-parametrik.

### 2.2. Uji Homogenitas Varian (Levene’s Test)
Menguji kesamaan varians antar kelompok, yang merupakan asumsi penting untuk ANOVA klasik dan t-test standar. Statistik uji $W$ didefinisikan sebagai:

$$
W = \frac{(N-k)}{(k-1)} \frac{\sum_{i=1}^{k} N_i (Z_{i\cdot} - Z_{\cdot\cdot})^2}{\sum_{i=1}^{k} \sum_{j=1}^{N_i} (Z_{ij} - Z_{i\cdot})^2}
$$

Dimana $Z_{ij} = |Y_{ij} - \bar{Y}_{i\cdot}|$ adalah deviasi absolut dari rata-rata grup.

### 2.3. Deteksi Outlier (IQR Method)
Pencilan (*outliers*) dapat mendistorsi hasil uji parametrik. Sistem mendeteksi outlier menggunakan metode *Interquartile Range* (IQR). Data poin $x$ dianggap outlier jika:

$$ 
 x < Q_1 - 1.5 \cdot \text{IQR} \quad \text{atau} \quad x > Q_3 + 1.5 \cdot \text{IQR} 
$$

Jika persentase outlier melebihi 5%, peringatan diberikan, dan metode robust atau transformasi data mungkin direkomendasikan.

## 3. Analisis Komparatif: RAG vs Non-RAG

Analisis utama bertujuan untuk membuktikan efektivitas RAG dibandingkan dengan *baseline* LLM standar.

### 3.1. Desain Berpasangan (*Paired Design*)
Karena setiap pertanyaan evaluasi ($q_i$) dijawab oleh kedua sistem (RAG dan Non-RAG), data yang dihasilkan bersifat berpasangan (*paired*). Oleh karena itu, uji *Paired t-test* (atau *Wilcoxon*) digunakan untuk mengontrol variabilitas antar-pertanyaan dan meningkatkan *power* statistik.

$$ 
t = \frac{\bar{d}}{s_d / \sqrt{n}} 
$$

Dimana $\bar{d}$ adalah rata-rata selisih skor per pertanyaan, dan $s_d$ adalah deviasi standar dari selisih tersebut.

### 3.2. Metrik yang Diuji
Perbandingan dilakukan pada tiga metrik kunci:
1.  **Answer Relevancy**: Apakah RAG memberikan jawaban yang lebih relevan?
2.  **Answer Correctness**: Apakah RAG meningkatkan akurasi faktual?
3.  **Factual Accuracy**: Apakah RAG secara signifikan mengurangi tingkat halusinasi (dihitung sebagai $1 - \text{Hallucination Rate}$)?

Hasil analisis ini memberikan bukti empiris apakah implementasi RAG memberikan peningkatan kinerja yang signifikan secara statistik ($p < 0.05$) dibandingkan penggunaan LLM konvensional.
