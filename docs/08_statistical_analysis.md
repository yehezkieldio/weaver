# Analisis Statistik (Statistical Analysis)

## 1. Pendahuluan

Dokumen ini menjelaskan metodologi analisis statistik yang digunakan untuk memvalidasi hasil evaluasi sistem RAG.

**Lokasi**: `src/lib/statistics/statistical-analysis.ts`, `src/lib/statistics/data-validation.ts`

---

## 2. Data Validation

### 2.1 Validasi yang Dilakukan

| Validasi        | Deskripsi                     | Threshold      |
| --------------- | ----------------------------- | -------------- |
| Metric Range    | Nilai dalam range valid (0-1) | 0 ≤ value ≤ 1  |
| Null Values     | Deteksi nilai null            | Max 10% null   |
| Sample Size     | Minimum sample                | n ≥ 5 per grup |
| Infinite Values | Deteksi Infinity/NaN          | 0 allowed      |
| Outliers        | Deteksi ekstrem               | IQR method     |

---

## 3. Statistik Deskriptif

### 3.1 Metrik yang Dihitung

- **n**: Sample size
- **mean**: Rata-rata aritmetik
- **median**: Nilai tengah (Q2)
- **stdDev**: Simpangan baku
- **variance**: Varians
- **min/max**: Nilai minimum/maksimum
- **q1/q3**: Kuartil pertama/ketiga
- **iqr**: Interquartile range
- **skewness**: Kemencengan
- **kurtosis**: Keruncingan
- **sem**: Standard error of mean
- **cv**: Coefficient of variation

### 3.2 Formula Utama

**Mean**: $\bar{x} = \frac{1}{n} \sum_{i=1}^{n} x_i$

**Standard Deviation**: $s = \sqrt{\frac{1}{n-1} \sum_{i=1}^{n} (x_i - \bar{x})^2}$

---

## 4. Uji Asumsi

### 4.1 Shapiro-Wilk Test (Normalitas)

- **Hipotesis**: $H_0$: Data berdistribusi normal
- **Keputusan**: Jika p > α, data normal

### 4.2 Levene's Test (Homogenitas Varians)

- **Hipotesis**: $H_0$: Varians sama di semua grup
- **Formula** (Brown-Forsythe): Menggunakan deviasi dari median grup

### 4.3 Deteksi Outlier

**IQR Method**:
- Lower Fence = Q1 - 1.5 × IQR
- Upper Fence = Q3 + 1.5 × IQR

---

## 5. Uji Hipotesis Parametrik

### 5.1 Paired t-test

**Tujuan**: Membandingkan dua kondisi berpasangan

**Formula**: $t = \frac{\bar{d}}{s_d / \sqrt{n}}$

**Effect Size**: Cohen's d = $\bar{d} / s_d$

### 5.2 Independent t-test (Welch)

**Tujuan**: Membandingkan dua grup independen

**Formula**: $t = \frac{\bar{X}_1 - \bar{X}_2}{\sqrt{s_1^2/n_1 + s_2^2/n_2}}$

### 5.3 One-way ANOVA

**Tujuan**: Membandingkan 3+ grup

**Formula**: $F = \frac{MS_{between}}{MS_{within}}$

**Post-hoc**: Tukey HSD

---

## 6. Uji Non-Parametrik

### 6.1 Mann-Whitney U Test

**Tujuan**: Alternatif untuk independent t-test

**Digunakan ketika**: Asumsi normalitas tidak terpenuhi

### 6.2 Kruskal-Wallis H Test

**Tujuan**: Alternatif untuk ANOVA

**Formula**: $H = \frac{12}{N(N+1)} \sum \frac{R_i^2}{n_i} - 3(N+1)$

---

## 7. Effect Size

### 7.1 Cohen's d (t-tests)

| d         | Interpretasi |
| --------- | ------------ |
| < 0.2     | Negligible   |
| 0.2 - 0.5 | Small        |
| 0.5 - 0.8 | Medium       |
| > 0.8     | Large        |

### 7.2 Eta-squared (ANOVA)

| η²          | Interpretasi |
| ----------- | ------------ |
| < 0.01      | Negligible   |
| 0.01 - 0.06 | Small        |
| 0.06 - 0.14 | Medium       |
| > 0.14      | Large        |

---

## 8. Confidence Intervals

### 8.1 Parametric CI

$CI = \bar{x} \pm t_{\alpha/2, df} \times \frac{s}{\sqrt{n}}$

### 8.2 Bootstrap CI

Non-parametric resampling dengan 1000 iterasi.

---

## 9. Smart Test Selection

Algoritma pemilihan tes otomatis:
1. Cek asumsi (normalitas, homogenitas)
2. Jika terpenuhi → tes parametrik
3. Jika tidak → tes non-parametrik

---

## 10. Bilingual Reporting

Laporan dihasilkan dalam Bahasa Indonesia dan Inggris dengan interpretasi effect size yang diterjemahkan.

---

*Dokumen ini merupakan bagian dari dokumentasi teknis Academic Research RAG Chatbot.*
