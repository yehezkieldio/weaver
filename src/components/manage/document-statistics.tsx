"use client";

import { format, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
    BarChart3,
    BookOpen,
    Database,
    FileText,
    GraduationCap,
    Layers,
    PieChart as PieChartIcon,
    TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    createdAt: string;
    metadata?: {
        chunksCount?: number;
        documentType?: string;
        wordCount?: number;
        pages?: number;
        department?: string;
        faculty?: string;
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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export function DocumentStatistics() {
    const { data, isLoading } = useSWR("/api/documents", fetcher, {
        refreshInterval: 30_000,
    });

    const documents: Document[] = data?.documents || [];

    const stats = useMemo(() => {
        const totalDocuments = documents.length;
        const totalChunks = documents.reduce((sum, doc) => sum + (doc.metadata?.chunksCount || 0), 0);
        const totalFileSize = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
        const totalWords = documents.reduce((sum, doc) => sum + (doc.metadata?.wordCount || 0), 0);
        const totalPages = documents.reduce((sum, doc) => sum + (doc.metadata?.pages || 0), 0);

        const avgChunksPerDoc = totalDocuments > 0 ? Math.round(totalChunks / totalDocuments) : 0;
        const avgWordsPerDoc = totalDocuments > 0 ? Math.round(totalWords / totalDocuments) : 0;

        // Status breakdown
        const statusCounts = documents.reduce(
            (acc, doc) => {
                acc[doc.processingStatus] = (acc[doc.processingStatus] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        const statusData = Object.entries(statusCounts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
        }));

        // Document type breakdown
        const typeCounts = documents.reduce(
            (acc, doc) => {
                const type = doc.metadata?.documentType ? doc.metadata.documentType.replace(/_/g, " ") : "other";
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        const typeData = Object.entries(typeCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));

        // Department breakdown
        const deptCounts = documents.reduce(
            (acc, doc) => {
                if (doc.metadata?.department) {
                    acc[doc.metadata.department] = (acc[doc.metadata.department] || 0) + 1;
                }
                return acc;
            },
            {} as Record<string, number>
        );

        const deptData = Object.entries(deptCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, value]) => ({ name, value }));

        // Timeline (Last 7 days)
        const timelineData: { date: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const dateStr = format(date, "yyyy-MM-dd");
            const label = format(date, "dd MMM", { locale: idLocale });

            const count = documents.filter((doc) => doc.createdAt.startsWith(dateStr)).length;

            timelineData.push({ date: label, count });
        }

        return {
            totalDocuments,
            totalChunks,
            totalFileSize,
            totalWords,
            totalPages,
            avgChunksPerDoc,
            avgWordsPerDoc,
            statusData,
            typeData,
            deptData,
            timelineData,
        };
    }, [documents]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Failed":
                return "bg-destructive";
            case "Processing":
                return "bg-blue-500";
            case "Pending":
                return "bg-yellow-500";
            default:
                return "bg-green-500";
        }
    };

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
                    description={`${stats.statusData.find((s) => s.name === "Completed")?.value || 0} selesai diproses`}
                    icon={<FileText className="h-4 w-4" />}
                    title="Total Dokumen"
                    value={stats.totalDocuments.toLocaleString()}
                />
                <StatCard
                    description={`~${stats.avgWordsPerDoc.toLocaleString()} kata/dokumen`}
                    icon={<BookOpen className="h-4 w-4" />}
                    title="Total Kata"
                    value={stats.totalWords.toLocaleString()}
                />
                <StatCard
                    description={`${stats.avgChunksPerDoc} chunks/dokumen`}
                    icon={<Layers className="h-4 w-4" />}
                    title="Total Chunks"
                    value={stats.totalChunks.toLocaleString()}
                />
                <StatCard
                    description={`${stats.totalPages.toLocaleString()} halaman total`}
                    icon={<Database className="h-4 w-4" />}
                    title="Total Ukuran"
                    value={formatFileSize(stats.totalFileSize)}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Growth Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Aktivitas Upload
                        </CardTitle>
                        <CardDescription>Jumlah dokumen yang diunggah 7 hari terakhir</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer height="100%" width="100%">
                                <BarChart data={stats.timelineData}>
                                    <XAxis
                                        axisLine={false}
                                        dataKey="date"
                                        fontSize={12}
                                        stroke="#888888"
                                        tickLine={false}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        axisLine={false}
                                        fontSize={12}
                                        stroke="#888888"
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "var(--background)", borderRadius: "8px" }}
                                        labelStyle={{ color: "var(--foreground)" }}
                                    />
                                    <Bar
                                        className="fill-primary"
                                        dataKey="count"
                                        fill="currentColor"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Type Distribution */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="h-4 w-4" />
                            Jenis Dokumen
                        </CardTitle>
                        <CardDescription>Distribusi tipe dokumen (Top 5)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer height="100%" width="100%">
                                <PieChart>
                                    <Pie
                                        cx="50%"
                                        cy="50%"
                                        data={stats.typeData}
                                        dataKey="value"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                    >
                                        {stats.typeData.map((entry, index) => (
                                            <Cell fill={COLORS[index % COLORS.length]} key={entry.name} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "var(--background)", borderRadius: "8px" }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Department Breakdown & Status */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            Distribusi Departemen
                        </CardTitle>
                        <CardDescription>Dokumen berdasarkan departemen/prodi</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.deptData.length > 0 ? (
                            <div className="space-y-4">
                                {stats.deptData.map((item) => (
                                    <div className="flex items-center gap-2" key={item.name}>
                                        {" "}
                                        <div className="w-full flex-1">
                                            <div className="mb-1 flex justify-between text-sm">
                                                <span className="font-medium">{item.name}</span>
                                                <span className="text-muted-foreground">{item.value}</span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                                                <div
                                                    className="h-full bg-primary"
                                                    style={{
                                                        width: `${(item.value / stats.totalDocuments) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                                Belum ada data departemen
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Status Pemrosesan
                        </CardTitle>
                        <CardDescription>Status pipeline RAG saat ini</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.statusData.map((item) => (
                                <div className="flex items-center gap-2" key={item.name}>
                                    {" "}
                                    <div className="w-full flex-1">
                                        <div className="mb-1 flex justify-between text-sm">
                                            <span className="font-medium">{item.name}</span>
                                            <span className="text-muted-foreground">{item.value}</span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                                            <div
                                                className={`h-full ${getStatusColor(item.name)}`}
                                                style={{
                                                    width: `${(item.value / stats.totalDocuments) * 100}%`,
                                                }}
                                            />
                                        </div>
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
