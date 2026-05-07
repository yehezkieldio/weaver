# Metodologi: Analisis Statistik - Ukuran Efek dan Interval Kepercayaan (*Effect Size & Confidence Intervals*)

Signifikansi statistik ($p-value$) saja tidak cukup untuk menunjukkan besarnya dampak praktis dari suatu intervensi. Oleh karena itu, penelitian ini melengkapi pengujian hipotesis dengan estimasi besaran efek (*effect size*) dan interval kepercayaan (*confidence intervals*), sesuai dengan standar pelaporan ilmiah modern.

## 1. Estimasi Ukuran Efek (*Effect Size*)

Ukuran efek menguantifikasi besarnya perbedaan antara dua kelompok atau kekuatan hubungan antar variabel, terlepas dari ukuran sampel.

### 1.1. Cohen's d (Untuk Uji-t)
Untuk perbandingan rata-rata dua kelompok (misal: RAG vs Non-RAG), digunakan Cohen's $d$. Metrik ini menyatakan perbedaan rata-rata dalam satuan standar deviasi.

$$ 
d = \frac{\bar{x}_1 - \bar{x}_2}{s_{\text{pooled}}}
$$ 

Dimana $s_{	ext{pooled}}$ adalah deviasi standar gabungan:
$$ 
s_{\text{pooled}} = \sqrt{\frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1+n_2-2}}
$$ 

Interpretasi standar:
*   $d \approx 0.2$: Efek Kecil
*   $d \approx 0.5$: Efek Sedang
*   $d \approx 0.8$: Efek Besar

### 1.2. Eta Squared ($\eta^2$) (Untuk ANOVA)
Dalam analisis varians (studi ablasi multi-konfigurasi), $\eta^2$ digunakan untuk mengukur proporsi varians total yang dapat dijelaskan oleh variabel perlakuan (konfigurasi sistem).

$$ 
\eta^2 = \frac{SS_{\text{between}}}{SS_{\text{total}}}
$$ 

Dimana $SS_{\text{between}}$ adalah jumlah kuadrat antar-kelompok dan $SS_{\text{total}}$ adalah jumlah kuadrat total.

### 1.3. Rank-Biserial Correlation ($r$) (Untuk Non-Parametrik)
Untuk uji Mann-Whitney U atau Wilcoxon, ukuran efek dihitung menggunakan korelasi *rank-biserial*.

$$ 
r = 1 - \frac{2U}{n_1 n_2}
$$ 

## 2. Estimasi Interval Kepercayaan (*Confidence Intervals*)

Interval kepercayaan (CI) memberikan rentang nilai yang kemungkinan besar mencakup parameter populasi sebenarnya (misal: rata-rata skor *Faithfulness*) dengan tingkat kepercayaan tertentu (biasanya 95%).

### 2.1. Interval Kepercayaan Parametrik
Jika asumsi normalitas terpenuhi, CI untuk rata-rata ($\mu$) dihitung menggunakan distribusi-t:

$$ 
\text{CI}_{95\%} = \bar{x} \pm t^* \cdot \frac{s}{\sqrt{n}}
$$ 

Dimana $t^*$ adalah nilai kritis dari distribusi-t dengan derajat kebebasan $n-1$.

### 2.2. Interval Kepercayaan Bootstrap
Untuk data yang tidak berdistribusi normal atau sampel kecil, sistem menggunakan metode *Bootstrapping*. Teknik ini melakukan *resampling* dengan pengembalian (*replacement*) sebanyak $B$ kali (misal: $B=10,000$) dari data sampel asli untuk membangun distribusi sampling empiris.

Algoritma Bootstrap:
1.  Ambil sampel acak berukuran $n$ dari data asli dengan pengembalian.
2.  Hitung statistik yang diminati (misal: rata-rata) dari sampel *bootstrap* tersebut.
3.  Ulangi langkah 1-2 sebanyak $B$ kali.
4.  Tentukan persentil ke-2.5 dan ke-97.5 dari distribusi statistik *bootstrap* sebagai batas bawah dan atas CI 95%.

$$ 
\text{CI}_{\text{boot}} = [\hat{\theta}^*_{0.025}, \hat{\theta}^*_{0.975}]
$$ 

Pendekatan *bootstrap* ini memberikan estimasi ketidakpastian yang lebih robust dan tidak bergantung pada asumsi distribusi teoretis yang sering kali tidak terpenuhi oleh data evaluasi RAG yang nyata.

## 3. Pelaporan Hasil

Dalam pelaporan hasil eksperimen, setiap temuan signifikansi statistik disertai dengan ukuran efek dan interval kepercayaan.

*Contoh Format Pelaporan:*
> "Implementasi modul Reranking meningkatkan skor *Answer Relevancy* secara signifikan ($t(49) = 4.21, p < 0.001$), dengan ukuran efek besar ($d = 0.85$) dan peningkatan rata-rata sebesar 0.12 poin (95% CI [0.08, 0.16])."

Format ini memberikan gambaran lengkap tentang signifikansi statistik, besaran dampak praktis, dan presisi estimasi, yang krusial untuk menarik kesimpulan yang valid dalam penelitian sistem informasi.
