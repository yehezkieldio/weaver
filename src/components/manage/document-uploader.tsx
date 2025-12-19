"use client";

import {
    AlertCircle,
    CheckCircle,
    FileText,
    GitBranch,
    GraduationCap,
    Languages,
    Layers,
    Loader2,
    RefreshCw,
    Sparkles,
    Square,
    Type,
    Upload,
    X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BatchProgressResponse } from "@/lib/rag/batch-manager";
import { cn } from "@/lib/utils";

type ChunkingStrategy = "auto" | "recursive" | "semantic" | "sentence_window" | "hierarchical";
type LanguageHint = "auto" | "en" | "id";

interface UploadFile {
    id: string;
    file: File;
    progress: number;
    status: "pending" | "uploading" | "processing" | "completed" | "error";
    error?: string;
    documentId?: string;
    progressMessage?: string;
}

interface DocumentUploaderProps {
    onUploadComplete?: () => void;
}

/**
 * Format file size to human-readable string with appropriate unit
 */
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Polling interval in milliseconds */
const POLL_INTERVAL_MS = 2000;

export function DocumentUploader({ onUploadComplete }: DocumentUploaderProps) {
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [chunkingStrategy, setChunkingStrategy] = useState<ChunkingStrategy>("auto");
    const [category, setCategory] = useState("");
    const [tags, setTags] = useState("");
    const [documentType, setDocumentType] = useState<string>("auto");
    const [languageHint, setLanguageHint] = useState<LanguageHint>("id");

    // Batch upload state
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);
    const [batchId, setBatchId] = useState<string | null>(null);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

    // Polling and abort control
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const generateFileId = useCallback(
        (file: File) =>
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? (crypto as { randomUUID: () => string }).randomUUID()
                : `${file.name.replace(/\s+/g, "-")}-${file.size}-${file.lastModified}-${Math.random()
                      .toString(36)
                      .slice(2, 9)}`,
        []
    );

    const languageLabelMap: Record<LanguageHint, string> = {
        auto: "Auto",
        en: "EN",
        id: "ID",
    };

    // Cleanup polling on unmount
    useEffect(
        () => () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        },
        []
    );

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
                id: generateFileId(file),
                file,
                progress: 0,
                status: "pending",
            }));
            setFiles((prev) => [...prev, ...newFiles]);
        },
        [generateFileId]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/pdf": [".pdf"],
            "text/plain": [".txt"],
            "text/markdown": [".md"],
        },
        maxSize: 50 * 1024 * 1024,
    });

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    /**
     * Poll batch progress and update file states
     */
    const pollBatchProgress = useCallback(async (currentBatchId: string) => {
        try {
            const response = await fetch(`/api/documents/batch/${currentBatchId}`);
            if (!response.ok) {
                console.error("[DocumentUploader] Failed to poll batch progress");
                return;
            }

            const data: BatchProgressResponse = await response.json();

            // Update file states based on batch progress
            setFiles((prev) => {
                const updated = [...prev];
                for (const item of data.items) {
                    const fileIndex = updated.findIndex((f) => f.documentId === item.documentId);
                    if (fileIndex !== -1) {
                        const file = updated[fileIndex];
                        // Map batch status to file status
                        let newStatus = file.status;
                        if (item.status === "completed") {
                            newStatus = "completed";
                        } else if (item.status === "failed") {
                            newStatus = "error";
                        } else if (item.status === "processing") {
                            newStatus = "processing";
                        }
                        updated[fileIndex] = {
                            ...file,
                            progress: item.progress,
                            status: newStatus,
                            error: item.error,
                        };
                    }
                }
                return updated;
            });

            setBatchProgress({
                current: data.completedDocuments + data.failedDocuments,
                total: data.totalDocuments,
            });

            // Stop polling if batch is complete or cancelled
            if (data.status === "completed" || data.status === "cancelled") {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
                setIsProcessingBatch(false);
                setBatchId(null);
            }
        } catch (error) {
            console.error("[DocumentUploader] Polling error:", error);
        }
    }, []);

    /**
     * Start polling for batch progress
     */
    const startPolling = useCallback(
        (currentBatchId: string) => {
            // Clear any existing poll interval
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }

            // Poll immediately
            pollBatchProgress(currentBatchId);

            // Then poll at interval
            pollIntervalRef.current = setInterval(() => {
                pollBatchProgress(currentBatchId);
            }, POLL_INTERVAL_MS);
        },
        [pollBatchProgress]
    );

    /**
     * Cancel the current batch upload
     */
    const cancelBatch = useCallback(async () => {
        if (!batchId) return;

        try {
            await fetch(`/api/documents/batch/${batchId}`, { method: "DELETE" });
        } catch (error) {
            console.error("[DocumentUploader] Failed to cancel batch:", error);
        }

        // Stop polling
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        // Abort any pending requests
        abortControllerRef.current?.abort();

        setIsProcessingBatch(false);
        setBatchId(null);
        setBatchProgress({ current: 0, total: 0 });
    }, [batchId]);

    /**
     * Upload all pending files using batch API
     */
    const uploadAll = async () => {
        const pendingFiles = files.filter((f) => f.status === "pending");
        if (pendingFiles.length === 0 || isProcessingBatch) return;

        setIsProcessingBatch(true);
        abortControllerRef.current = new AbortController();

        // Mark all files as uploading
        setFiles((prev) =>
            prev.map((f) => (f.status === "pending" ? { ...f, status: "uploading" as const, progress: 5 } : f))
        );

        try {
            // Create FormData with all files
            const formData = new FormData();
            for (const fileItem of pendingFiles) {
                formData.append("files", fileItem.file);
            }
            formData.append("chunkingStrategy", chunkingStrategy);
            formData.append("documentType", documentType);
            formData.append("languageHint", languageHint);
            if (category) formData.append("category", category);
            if (tags) formData.append("tags", tags);

            // Upload to batch endpoint
            const response = await fetch("/api/documents/batch", {
                method: "POST",
                body: formData,
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Batch upload failed");
            }

            const result = await response.json();

            // Update files with document IDs from response
            setFiles((prev) => {
                const updated = [...prev];
                for (const doc of result.documents) {
                    // Match by filename
                    const fileIndex = updated.findIndex(
                        (f) => f.file.name === doc.fileName && f.status === "uploading"
                    );
                    if (fileIndex !== -1) {
                        updated[fileIndex] = {
                            ...updated[fileIndex],
                            documentId: doc.id,
                            status: doc.status === "failed" ? "error" : "processing",
                            progress: doc.status === "failed" ? 0 : 15,
                            error: doc.error,
                        };
                    }
                }
                return updated;
            });

            // Start polling for progress
            if (result.batchId) {
                setBatchId(result.batchId);
                setBatchProgress({ current: 0, total: pendingFiles.length });
                startPolling(result.batchId);
            } else {
                setIsProcessingBatch(false);
            }

            // Call onUploadComplete when batch is done (handled by polling)
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                // Upload was cancelled
                setFiles((prev) =>
                    prev.map((f) => (f.status === "uploading" ? { ...f, status: "pending" as const, progress: 0 } : f))
                );
            } else {
                // Mark all uploading files as error
                setFiles((prev) =>
                    prev.map((f) =>
                        f.status === "uploading"
                            ? {
                                  ...f,
                                  status: "error" as const,
                                  error: error instanceof Error ? error.message : "Upload failed",
                              }
                            : f
                    )
                );
            }
            setIsProcessingBatch(false);
            setBatchId(null);
        }
    };

    /**
     * Upload a single file (for individual upload buttons)
     */
    const uploadFile = async (fileItem: UploadFile, index: number) => {
        setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, status: "uploading", progress: 10 } : f)));

        try {
            const formData = new FormData();
            formData.append("file", fileItem.file);
            formData.append("chunkingStrategy", chunkingStrategy);
            formData.append("documentType", documentType);
            formData.append("languageHint", languageHint);
            if (category) formData.append("category", category);
            if (tags) formData.append("tags", tags);

            const response = await fetch("/api/documents/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Upload failed");
            }

            const result = await response.json();
            const documentId = result.document.id;

            // Mark as processing and start checking status via document list SWR
            setFiles((prev) =>
                prev.map((f, i) =>
                    i === index
                        ? {
                              ...f,
                              status: "processing",
                              progress: 50,
                              documentId,
                              progressMessage: "Processing document...",
                          }
                        : f
                )
            );

            // Simple polling for individual file (fallback for single uploads)
            const checkStatus = async () => {
                try {
                    const statusResponse = await fetch(`/api/documents?id=${documentId}`);
                    if (statusResponse.ok) {
                        const statusData = await statusResponse.json();
                        const doc = statusData.documents?.[0] || statusData.document;
                        if (doc) {
                            if (doc.processingStatus === "completed") {
                                setFiles((prev) =>
                                    prev.map((f, i) => (i === index ? { ...f, status: "completed", progress: 100 } : f))
                                );
                                onUploadComplete?.();
                                return true;
                            }
                            if (doc.processingStatus === "failed") {
                                setFiles((prev) =>
                                    prev.map((f, i) =>
                                        i === index
                                            ? {
                                                  ...f,
                                                  status: "error",
                                                  error: doc.processingError || "Processing failed",
                                              }
                                            : f
                                    )
                                );
                                return true;
                            }
                        }
                    }
                } catch {
                    // Ignore polling errors
                }
                return false;
            };

            // Poll status every 3 seconds for up to 5 minutes
            let attempts = 0;
            const maxAttempts = 100;
            const interval = setInterval(async () => {
                attempts += 1;
                const done = await checkStatus();
                if (done || attempts >= maxAttempts) {
                    clearInterval(interval);
                    if (attempts >= maxAttempts) {
                        setFiles((prev) =>
                            prev.map((f, i) => (i === index ? { ...f, status: "completed", progress: 100 } : f))
                        );
                        onUploadComplete?.();
                    }
                }
            }, 3000);
        } catch (error) {
            setFiles((prev) =>
                prev.map((f, i) =>
                    i === index
                        ? {
                              ...f,
                              status: "error",
                              error: error instanceof Error ? error.message : "Upload failed",
                          }
                        : f
                )
            );
        }
    };

    const retryDocument = async (fileItem: UploadFile, index: number) => {
        if (!fileItem.documentId) return;

        setFiles((prev) =>
            prev.map((f, i) =>
                i === index
                    ? { ...f, status: "processing", progress: 10, error: undefined, progressMessage: "Retrying..." }
                    : f
            )
        );

        try {
            const response = await fetch(`/api/documents/${fileItem.documentId}/retry`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enableProgressTracking: true }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Retry failed");
            }

            // Poll status using simple approach
            const checkStatus = async () => {
                try {
                    const statusResponse = await fetch(`/api/documents?id=${fileItem.documentId}`);
                    if (statusResponse.ok) {
                        const statusData = await statusResponse.json();
                        const doc = statusData.documents?.[0] || statusData.document;
                        if (doc?.processingStatus === "completed") {
                            setFiles((prev) =>
                                prev.map((f, i) => (i === index ? { ...f, status: "completed", progress: 100 } : f))
                            );
                            onUploadComplete?.();
                            return true;
                        }
                        if (doc?.processingStatus === "failed") {
                            setFiles((prev) =>
                                prev.map((f, i) =>
                                    i === index
                                        ? { ...f, status: "error", error: doc.processingError || "Retry failed" }
                                        : f
                                )
                            );
                            return true;
                        }
                    }
                } catch {
                    // Ignore
                }
                return false;
            };

            // Poll for up to 5 minutes
            let attempts = 0;
            const interval = setInterval(async () => {
                attempts += 1;
                const done = await checkStatus();
                if (done || attempts >= 100) clearInterval(interval);
            }, 3000);
        } catch (error) {
            setFiles((prev) =>
                prev.map((f, i) =>
                    i === index
                        ? { ...f, status: "error", error: error instanceof Error ? error.message : "Retry failed" }
                        : f
                )
            );
        }
    };

    const pendingCount = files.filter((f) => f.status === "pending").length;

    const chunkingDescriptions: Record<ChunkingStrategy, string> = {
        auto: "Memilih strategi optimal secara otomatis berdasarkan struktur dokumen",
        recursive: "Memecah berdasarkan struktur (paragraf, kalimat) dengan overlap",
        semantic: "Memecah berdasarkan perubahan topik/makna menggunakan embeddings",
        sentence_window: "Kalimat individu dengan konteks sekitarnya",
        hierarchical: "Relasi induk-anak untuk pengambilan multi-level",
    };

    return (
        <div className="space-y-6">
            {/* Upload Zone */}
            <div
                {...getRootProps()}
                className={cn(
                    "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                    isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-4">
                        <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <p className="font-medium text-foreground">
                            {isDragActive ? "Lepaskan file di sini" : "Seret & lepaskan file di sini"}
                        </p>
                        <p className="mt-1 text-muted-foreground text-sm">
                            atau klik untuk memilih. Mendukung file PDF, TXT, MD hingga 50MB
                        </p>
                        <p className="mt-1 text-muted-foreground text-xs">Mendukung dokumen Bahasa Indonesia</p>
                    </div>
                </div>
            </div>

            {/* Options */}
            <Card className="p-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                            <Layers className="h-4 w-4" />
                            Chunking Strategy
                        </Label>
                        <Select
                            onValueChange={(v: ChunkingStrategy) => setChunkingStrategy(v)}
                            value={chunkingStrategy}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">
                                    <span className="flex items-center gap-2">
                                        <Sparkles className="h-3 w-3" /> Adaptif (Otomatis)
                                    </span>
                                </SelectItem>
                                <SelectItem value="recursive">
                                    <span className="flex items-center gap-2">
                                        <GitBranch className="h-3 w-3" /> Rekursif
                                    </span>
                                </SelectItem>
                                <SelectItem value="semantic">
                                    <span className="flex items-center gap-2">
                                        <Type className="h-3 w-3" /> Semantik
                                    </span>
                                </SelectItem>
                                <SelectItem value="sentence_window">
                                    <span className="flex items-center gap-2">
                                        <Layers className="h-3 w-3" /> Jendela Kalimat
                                    </span>
                                </SelectItem>
                                <SelectItem value="hierarchical">
                                    <span className="flex items-center gap-2">
                                        <GitBranch className="h-3 w-3" /> Hierarkis
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-muted-foreground text-xs">{chunkingDescriptions[chunkingStrategy]}</p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                            <Languages className="h-4 w-4" />
                            Bahasa Dokumen
                        </Label>
                        <Select onValueChange={(v: LanguageHint) => setLanguageHint(v)} value={languageHint}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="id">Bahasa Indonesia</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-muted-foreground text-xs">Mempengaruhi tokenisasi & stopwords</p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                            <GraduationCap className="h-4 w-4" />
                            Document Type
                        </Label>
                        <Select onValueChange={setDocumentType} value={documentType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-80">
                                <SelectItem value="auto">🔍 Auto-detect</SelectItem>

                                {/* Traditional Academic */}
                                <SelectItem value="syllabus">📋 Syllabus / RPS</SelectItem>
                                <SelectItem value="lecture_notes">📝 Lecture Notes / Catatan Kuliah</SelectItem>
                                <SelectItem value="research_paper">📄 Research Paper / Makalah</SelectItem>
                                <SelectItem value="textbook">📚 Textbook / Buku Teks</SelectItem>
                                <SelectItem value="assignment">✏️ Assignment / Tugas</SelectItem>
                                <SelectItem value="exam">📝 Exam / Ujian</SelectItem>
                                <SelectItem value="skripsi">🎓 Skripsi (S1)</SelectItem>
                                <SelectItem value="tesis">🎓 Tesis (S2)</SelectItem>
                                <SelectItem value="disertasi">🎓 Disertasi (S3)</SelectItem>
                                <SelectItem value="lab_report">🔬 Lab Report / Laporan Praktikum</SelectItem>
                                <SelectItem value="modul_kuliah">📖 Modul Perkuliahan</SelectItem>

                                {/* Informasi Akademik */}
                                <SelectItem value="profil_prodi">🏫 Profil Program Studi</SelectItem>
                                <SelectItem value="cpl">🎯 Capaian Pembelajaran (CPL)</SelectItem>
                                <SelectItem value="kurikulum">📑 Struktur Kurikulum</SelectItem>
                                <SelectItem value="daftar_matkul">📋 Daftar Mata Kuliah</SelectItem>
                                <SelectItem value="kalender_akademik">📅 Kalender Akademik</SelectItem>
                                <SelectItem value="ketentuan_krs">📝 Ketentuan KRS/KHS</SelectItem>
                                <SelectItem value="ketentuan_ip">📊 Ketentuan IP/IPK</SelectItem>
                                <SelectItem value="syarat_kelulusan">✅ Syarat Kelulusan</SelectItem>
                                <SelectItem value="aturan_ta">📜 Aturan Skripsi/TA</SelectItem>
                                <SelectItem value="aturan_yudisium">🎓 Aturan Yudisium/Wisuda</SelectItem>

                                {/* Dokumen Regulasi */}
                                <SelectItem value="buku_pedoman_akademik">📕 Buku Pedoman Akademik</SelectItem>
                                <SelectItem value="buku_pedoman_kemahasiswaan">
                                    📗 Buku Pedoman Kemahasiswaan
                                </SelectItem>
                                <SelectItem value="peraturan_rektor">⚖️ Peraturan Rektor</SelectItem>
                                <SelectItem value="sk_akademik">📜 SK Akademik</SelectItem>
                                <SelectItem value="sop">📋 SOP Akademik/Administrasi</SelectItem>
                                <SelectItem value="tata_tertib">📖 Tata Tertib Mahasiswa</SelectItem>
                                <SelectItem value="panduan_etika">⚖️ Panduan Etika Akademik</SelectItem>
                                <SelectItem value="panduan_plagiarisme">🚫 Panduan Plagiarisme</SelectItem>

                                {/* Administrasi */}
                                <SelectItem value="prosedur_ukt">💳 Prosedur Pembayaran UKT</SelectItem>
                                <SelectItem value="prosedur_cuti">🏖️ Prosedur Cuti Akademik</SelectItem>
                                <SelectItem value="prosedur_surat_aktif">📄 Prosedur Surat Aktif</SelectItem>
                                <SelectItem value="prosedur_legalisir">✅ Prosedur Legalisir</SelectItem>
                                <SelectItem value="prosedur_pindah_prodi">🔄 Prosedur Pindah Prodi</SelectItem>
                                <SelectItem value="prosedur_magang">💼 Prosedur Magang/PKL</SelectItem>
                                <SelectItem value="jam_layanan">🕐 Jam Layanan</SelectItem>
                                <SelectItem value="formulir_administrasi">📝 Formulir Administrasi</SelectItem>
                                <SelectItem value="faq_layanan">❓ FAQ Layanan Akademik</SelectItem>

                                {/* Dosen */}
                                <SelectItem value="daftar_dosen">👨‍🏫 Daftar Dosen</SelectItem>
                                <SelectItem value="profil_dosen">👤 Profil Dosen</SelectItem>
                                <SelectItem value="jadwal_mengajar">📅 Jadwal Mengajar</SelectItem>
                                <SelectItem value="publikasi_dosen">📚 Publikasi Dosen</SelectItem>

                                {/* Penelitian */}
                                <SelectItem value="daftar_penelitian">🔬 Daftar Penelitian</SelectItem>
                                <SelectItem value="roadmap_penelitian">🗺️ Roadmap Penelitian</SelectItem>
                                <SelectItem value="hibah_penelitian">💰 Hibah Penelitian</SelectItem>
                                <SelectItem value="pengabdian">🤝 Pengabdian Masyarakat</SelectItem>
                                <SelectItem value="jurnal_kampus">📰 Jurnal Kampus</SelectItem>
                                <SelectItem value="prosiding">📑 Prosiding</SelectItem>
                                <SelectItem value="call_for_papers">📢 Call for Papers</SelectItem>

                                {/* Kemahasiswaan */}
                                <SelectItem value="pengumuman_mahasiswa">📢 Pengumuman Mahasiswa</SelectItem>
                                <SelectItem value="beasiswa">🎓 Informasi Beasiswa</SelectItem>
                                <SelectItem value="lomba_kompetisi">🏆 Lomba/Kompetisi</SelectItem>
                                <SelectItem value="ukm_organisasi">👥 UKM/Organisasi</SelectItem>
                                <SelectItem value="agenda_kampus">📅 Agenda Kampus</SelectItem>
                                <SelectItem value="prestasi_mahasiswa">🏅 Prestasi Mahasiswa</SelectItem>
                                <SelectItem value="kerjasama_industri">🏢 Kerjasama Industri</SelectItem>
                                <SelectItem value="layanan_konseling">💬 Layanan Konseling</SelectItem>

                                {/* Fasilitas */}
                                <SelectItem value="fasilitas_kampus">🏛️ Fasilitas Kampus</SelectItem>
                                <SelectItem value="fasilitas_lab">🔬 Fasilitas Laboratorium</SelectItem>
                                <SelectItem value="jadwal_lab">📅 Jadwal Lab</SelectItem>
                                <SelectItem value="peraturan_lab">📋 Peraturan Lab</SelectItem>
                                <SelectItem value="perpustakaan">📚 Perpustakaan</SelectItem>
                                <SelectItem value="denah_kampus">🗺️ Denah Kampus</SelectItem>
                                <SelectItem value="layanan_it">💻 Layanan IT</SelectItem>

                                {/* PMB */}
                                <SelectItem value="jalur_penerimaan">🚪 Jalur Penerimaan</SelectItem>
                                <SelectItem value="syarat_pendaftaran">📋 Syarat Pendaftaran</SelectItem>
                                <SelectItem value="biaya_kuliah">💰 Biaya Kuliah</SelectItem>
                                <SelectItem value="kuota_prodi">📊 Kuota Prodi</SelectItem>
                                <SelectItem value="panduan_pendaftaran">📖 Panduan Pendaftaran</SelectItem>
                                <SelectItem value="faq_pmb">❓ FAQ PMB</SelectItem>
                                <SelectItem value="jadwal_seleksi">📅 Jadwal Seleksi</SelectItem>
                                <SelectItem value="prosedur_registrasi">✅ Prosedur Registrasi</SelectItem>

                                {/* Keuangan */}
                                <SelectItem value="rincian_biaya">💵 Rincian Biaya</SelectItem>
                                <SelectItem value="alur_pembayaran">💳 Alur Pembayaran</SelectItem>
                                <SelectItem value="rekening_kampus">🏦 Rekening Kampus</SelectItem>
                                <SelectItem value="prosedur_refund">↩️ Prosedur Refund</SelectItem>
                                <SelectItem value="keterlambatan_bayar">⏰ Keterlambatan Bayar</SelectItem>
                                <SelectItem value="bantuan_biaya">🤝 Bantuan Biaya</SelectItem>

                                {/* Alumni */}
                                <SelectItem value="tracer_study">📊 Tracer Study</SelectItem>
                                <SelectItem value="statistik_lulusan">📈 Statistik Lulusan</SelectItem>
                                <SelectItem value="lowongan_alumni">💼 Lowongan Alumni</SelectItem>
                                <SelectItem value="ikatan_alumni">🤝 Ikatan Alumni</SelectItem>

                                {/* Humas */}
                                <SelectItem value="berita_kampus">📰 Berita Kampus</SelectItem>
                                <SelectItem value="rilis_pers">📢 Rilis Pers</SelectItem>
                                <SelectItem value="artikel_publik">📝 Artikel Publik</SelectItem>
                                <SelectItem value="dokumentasi_kegiatan">📸 Dokumentasi Kegiatan</SelectItem>
                                <SelectItem value="pengumuman_resmi">📋 Pengumuman Resmi</SelectItem>

                                <SelectItem value="other">📄 Other / Lainnya</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="category">Kategori</Label>
                        <Input
                            id="category"
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="mis., Ilmu Komputer"
                            value={category}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="tags">Tag</Label>
                        <Input
                            id="tags"
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="mis., machine-learning, nlp, penelitian"
                            value={tags}
                        />
                    </div>
                </div>
            </Card>

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-foreground">Berkas ({files.length})</h3>
                        {pendingCount > 0 && (
                            <div className="flex items-center gap-2">
                                {isProcessingBatch && batchProgress.total > 0 && (
                                    <span className="text-muted-foreground text-sm">
                                        {batchProgress.current} / {batchProgress.total}
                                    </span>
                                )}
                                {isProcessingBatch ? (
                                    <Button onClick={cancelBatch} size="sm" variant="destructive">
                                        <Square className="mr-1 h-3 w-3" />
                                        Hentikan
                                    </Button>
                                ) : (
                                    <Button onClick={uploadAll} size="sm">
                                        Unggah Semua ({pendingCount})
                                    </Button>
                                )}
                            </div>
                        )}
                        {isProcessingBatch && pendingCount === 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-sm">
                                    {batchProgress.current} / {batchProgress.total}
                                </span>
                                <Button onClick={cancelBatch} size="sm" variant="destructive">
                                    <Square className="mr-1 h-3 w-3" />
                                    Hentikan
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        {files.map((fileItem, index) => (
                            <Card className="p-3" key={fileItem.id}>
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-muted p-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate font-medium text-foreground text-sm">
                                                {fileItem.file.name}
                                            </p>
                                            <Badge className="text-xs" variant="outline">
                                                {formatFileSize(fileItem.file.size)}
                                            </Badge>
                                            <Badge className="text-xs" variant="secondary">
                                                {chunkingStrategy}
                                            </Badge>
                                            <Badge className="text-xs" variant="outline">
                                                {languageLabelMap[languageHint]}
                                            </Badge>
                                        </div>

                                        {fileItem.status !== "pending" && fileItem.status !== "completed" && (
                                            <div className="mt-2">
                                                <Progress className="h-1" value={fileItem.progress} />
                                                {fileItem.progressMessage && (
                                                    <div className="mt-1 flex items-center justify-between">
                                                        <p className="text-muted-foreground text-xs">
                                                            {fileItem.progressMessage}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {fileItem.error && (
                                            <p className="mt-1 text-destructive text-xs">{fileItem.error}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {fileItem.status === "pending" && !isProcessingBatch && (
                                            <Button
                                                onClick={() => uploadFile(fileItem, index)}
                                                size="sm"
                                                variant="outline"
                                            >
                                                Unggah
                                            </Button>
                                        )}

                                        {fileItem.status === "uploading" && (
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        )}

                                        {fileItem.status === "processing" && (
                                            <Badge className="gap-1" variant="secondary">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                Memproses
                                            </Badge>
                                        )}

                                        {fileItem.status === "completed" && (
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                        )}

                                        {fileItem.status === "error" && (
                                            <AlertCircle className="h-5 w-5 text-destructive" />
                                        )}

                                        {fileItem.status === "error" && fileItem.documentId && (
                                            <Button
                                                className="gap-1"
                                                onClick={() => retryDocument(fileItem, index)}
                                                size="sm"
                                                variant="outline"
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                                Ulangi
                                            </Button>
                                        )}

                                        {(fileItem.status === "pending" || fileItem.status === "error") && (
                                            <Button
                                                className="h-8 w-8"
                                                onClick={() => removeFile(index)}
                                                size="icon"
                                                variant="ghost"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
