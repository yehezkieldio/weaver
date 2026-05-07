# Metodologi: Pengujian Pengguna Tersimulasi (*Simulated User Testing*)

Selain evaluasi tingkat komponen menggunakan metrik RAGAS, penelitian ini menerapkan metodologi pengujian tingkat sistem (*system-level testing*) yang komprehensif menggunakan kerangka kerja "Pengguna Tersimulasi" (*Simulated User*). Pendekatan ini bertujuan untuk mengevaluasi kinerja sistem dalam interaksi percakapan multi-giliran (*multi-turn conversation*) yang realistis, meniru perilaku pengguna manusia.

## 1. Kerangka Kerja Simulasi

Sistem simulasi terdiri dari dua agen otonom yang berinteraksi:
1.  **Agen Pengguna (*Simulated User Agent*)**: Diberi persona (misal: "Mahasiswa Baru yang Bingung") dan tujuan spesifik (*goal*). Agen ini bertugas menghasilkan pertanyaan dan menanggapi jawaban sistem secara dinamis untuk mencapai tujuannya.
2.  **Sistem Target (*Chatbot*)**: Sistem RAG yang sedang diuji.

### 1.1. Skenario Pengujian
Pengujian dilakukan berdasarkan serangkaian skenario yang telah ditentukan (`ALL_SCENARIOS`), yang mencakup domain utama layanan universitas:
*   **Pendaftaran Akademik**: Mahasiswa mencoba mendaftar KRS atau cuti akademik.
*   **Informasi Fasilitas**: Pertanyaan tentang lokasi dan jam operasional laboratorium.
*   **Prosedur Administrasi**: Mengurus surat keterangan aktif kuliah atau transkrip.

### 1.2. Parser Streaming yang Diperbaiki

Komunikasi dengan API dilakukan melalui streaming dalam format Vercel AI SDK UI Message Stream. Parser telah diperbaiki untuk menangani semua jenis protocol message:

```typescript
// Mendukung semua tipe protocol AI SDK:
// - 0: Text chunks (string yang dikodekan JSON)
// - 2: Data parts (metadata terstruktur)
// - 8: Finish signals
// - e: Error messages
// - d: Done signals

function parseAISDKStream(rawStream: string): {
    text: string;
    retrievedChunks: RetrievedChunk[];
}
```

Perbaikan ini:
- ✅ Menangani respon streaming dengan benar
- ✅ Mengekstrak teks dan metadata dari stream
- ✅ Robust terhadap variasi format protocol
- ✅ Mencegah kehilangan informasi selama parsing

## 2. Metrik Evaluasi Tingkat Sistem

Evaluasi dilakukan terhadap log percakapan lengkap, bukan hanya pasangan pertanyaan-jawaban tunggal. Metrik yang digunakan meliputi:

### 2.1. Task Completion Rate (TCR)
Persentase skenario di mana pengguna tersimulasi berhasil mencapai tujuan yang ditentukan (misal: mendapatkan informasi lengkap tentang syarat pendaftaran). Penilaian dilakukan oleh agen evaluator pihak ketiga.

$$
\text{TCR} = \frac{\text{Jumlah Skenario Berhasil}}{\text{Total Skenario}} \times 100\%
$$

### 2.2. Conversation Coherence (Koherensi Percakapan)
Mengukur seberapa baik sistem mempertahankan konteks percakapan antar giliran. Dinilai pada skala 0-1.

$$
\text{Coherence} = \frac{1}{T-1} \sum_{t=2}^{T} \text{Score}(u_t, a_{t-1})
$$
Dimana $u_t$ adalah input pengguna pada giliran $t$ dan $a_{t-1}$ adalah jawaban sistem sebelumnya.

### 2.3. Context Retention Rate
Mengukur kemampuan sistem mengingat informasi yang diberikan pengguna di awal percakapan (misal: nama atau prodi pengguna) tanpa perlu pengulangan.

### 2.4. Information Coverage dengan Pattern-Based Matching

Persentase pola informasi kunci yang berhasil disampaikan sistem. Pola menggunakan format **OR** untuk mendukung sinonimitas:

```typescript
requiredInformationCoverage: [
  "SIAS|Sistem Informasi Akademik|daring|online",  // Cocok JIKA ADA SATU dari ini
  "registrasi|pembayaran|aktif",                    // Cocok JIKA ADA SATU dari ini
  "validasi|Penasehat Akademik|PA|Dosen PA",       // Cocok JIKA ADA SATU dari ini
]
```

Pendekatan pattern-based ini:
- ✅ Lebih fleksibel (mendukung sinonim dan alternatif)
- ✅ Menangani parafrase dalam respons
- ✅ Mengurangi false negative
- ✅ Lebih robust terhadap variasi bahasa alami

Evaluasi menggunakan pattern matching yang ringan (tanpa panggilan LLM):

```typescript
function matchesPattern(text: string, pattern: string): boolean {
  const textLower = text.toLowerCase();
  return pattern
    .split("|")
    .map((alt) => alt.trim().toLowerCase())
    .some((alt) => textLower.includes(alt));
}
```

Keuntungan:
- ✅ Cepat (tidak ada panggilan LLM)
- ✅ Deterministik (input sama = output sama)
- ✅ Transparan (mudah memahami mengapa coverage cocok/tidak)

## 3. Analisis Kinerja dan Latensi

Selain kualitas interaksi, pengujian ini juga mengukur aspek teknis dari perspektif pengguna akhir:
*   **Average Latency**: Waktu rata-rata sistem merespons dalam konteks percakapan.
*   **P95 & P99 Latency**: Persentil ke-95 dan ke-99 dari latensi, untuk mengukur konsistensi kinerja di bawah kondisi beban.
*   **Error Rate**: Persentase giliran percakapan yang menghasilkan kesalahan teknis atau kegagalan sistem.

## 4. Justifikasi Akademik

Penggunaan *Simulated User Testing* menutup kesenjangan metodologis dalam evaluasi RAG tradisional yang sering kali hanya bersifat statis (*single-turn QA*). Pendekatan ini memvalidasi klaim "implementasi" dalam penelitian dengan membuktikan bahwa sistem tidak hanya mampu menjawab pertanyaan, tetapi juga mampu memfasilitasi proses penyelesaian masalah (*task-oriented dialogue*) yang koheren dan efektif dalam konteks layanan perguruan tinggi.
