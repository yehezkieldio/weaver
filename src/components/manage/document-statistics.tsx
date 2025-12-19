"use client";

import { BarChart3, Database, FileText, Layers } from "lucide-react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Format file size to human-readable string with appropriate unit
 */
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

interface Document {
    id: string;
    fileSize: number;
    processingStatus: string;
    chunkingStrategy?: string;
    metadata?: {
        chunksCount?: number;
        documentType?: string;
    };
}

interface StatCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: React.ReactNode;
}

function StatCard({ title, value, description, icon }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">{title}</CardTitle>
                <div className="text-muted-foreground">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="font-bold text-2xl">{value}</div>
                {description && <p className="text-muted-foreground text-xs">{description}</p>}
            </CardContent>
        </Card>
    );
}

export function DocumentStatistics() {
    const { data, isLoading } = useSWR("/api/documents", fetcher, {
        refreshInterval: 10_000,
    });

    const documents: Document[] = data?.documents || [];

    // Calculate statistics
    const totalDocuments = documents.length;
    const totalChunks = documents.reduce((sum, doc) => sum + (doc.metadata?.chunksCount || 0), 0);
    const totalFileSize = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
    const avgChunksPerDoc = totalDocuments > 0 ? Math.round(totalChunks / totalDocuments) : 0;

    // Status breakdown
    const statusCounts = {
        completed: documents.filter((d) => d.processingStatus === "completed").length,
        processing: documents.filter((d) => d.processingStatus === "processing").length,
        pending: documents.filter((d) => d.processingStatus === "pending").length,
        failed: documents.filter((d) => d.processingStatus === "failed").length,
    };

    // Chunking strategy breakdown
    const strategyCountsMap = documents.reduce(
        (acc, doc) => {
            const strategy = doc.chunkingStrategy || "unknown";
            acc[strategy] = (acc[strategy] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    // Document type breakdown (top 5)
    const typeCountsMap = documents.reduce(
        (acc, doc) => {
            const type = doc.metadata?.documentType || "other";
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );
    const sortedTypes = Object.entries(typeCountsMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Main Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    description="Total dokumen yang diunggah"
                    icon={<FileText className="h-4 w-4" />}
                    title="Total Dokumen"
                    value={totalDocuments.toLocaleString()}
                />
                <StatCard
                    description={`Rata-rata ${avgChunksPerDoc} per dokumen`}
                    icon={<Layers className="h-4 w-4" />}
                    title="Total Chunks"
                    value={totalChunks.toLocaleString()}
                />
                <StatCard
                    description="Ukuran semua dokumen"
                    icon={<Database className="h-4 w-4" />}
                    title="Total Ukuran"
                    value={formatFileSize(totalFileSize)}
                />
                <StatCard
                    description="Chunks per dokumen"
                    icon={<BarChart3 className="h-4 w-4" />}
                    title="Rata-rata Chunks"
                    value={avgChunksPerDoc}
                />
            </div>

            {/* Status Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Status Pemrosesan</CardTitle>
                    <CardDescription>Distribusi status dokumen</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-green-600">Selesai diindeks</span>
                            <span className="font-medium">{statusCounts.completed}</span>
                        </div>
                        <Progress
                            className="h-2"
                            value={totalDocuments > 0 ? (statusCounts.completed / totalDocuments) * 100 : 0}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-blue-600">Sedang diproses</span>
                            <span className="font-medium">{statusCounts.processing}</span>
                        </div>
                        <Progress
                            className="h-2 [&>div]:bg-blue-500"
                            value={totalDocuments > 0 ? (statusCounts.processing / totalDocuments) * 100 : 0}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-yellow-600">Menunggu</span>
                            <span className="font-medium">{statusCounts.pending}</span>
                        </div>
                        <Progress
                            className="h-2 [&>div]:bg-yellow-500"
                            value={totalDocuments > 0 ? (statusCounts.pending / totalDocuments) * 100 : 0}
                        />
                    </div>
                    {statusCounts.failed > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-red-600">Gagal</span>
                                <span className="font-medium">{statusCounts.failed}</span>
                            </div>
                            <Progress
                                className="h-2 [&>div]:bg-red-500"
                                value={totalDocuments > 0 ? (statusCounts.failed / totalDocuments) * 100 : 0}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Chunking Strategy */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Strategi Chunking</CardTitle>
                        <CardDescription>Distribusi strategi yang digunakan</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(strategyCountsMap)
                                .sort(([, a], [, b]) => b - a)
                                .map(([strategy, count]) => (
                                    <div className="flex items-center justify-between" key={strategy}>
                                        <span className="font-medium text-sm capitalize">{strategy}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-24 rounded-full bg-muted">
                                                <div
                                                    className="h-2 rounded-full bg-primary"
                                                    style={{
                                                        width: `${totalDocuments > 0 ? (count / totalDocuments) * 100 : 0}%`,
                                                    }}
                                                />
                                            </div>
                                            <span className="w-8 text-muted-foreground text-sm">{count}</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Document Types */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Jenis Dokumen</CardTitle>
                        <CardDescription>5 jenis dokumen teratas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {sortedTypes.map(([type, count]) => (
                                <div className="flex items-center justify-between" key={type}>
                                    <span className="font-medium text-sm capitalize">{type.replace(/_/g, " ")}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-24 rounded-full bg-muted">
                                            <div
                                                className="h-2 rounded-full bg-primary"
                                                style={{
                                                    width: `${totalDocuments > 0 ? (count / totalDocuments) * 100 : 0}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="w-8 text-muted-foreground text-sm">{count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
