"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage as AIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
    AlertTriangle,
    Bot,
    Brain,
    ChevronDown,
    ChevronRight,
    Clock,
    Cloud,
    Database,
    FileText,
    HelpCircle,
    Info,
    Languages,
    Loader2,
    RefreshCw,
    Save,
    Search,
    Send,
    Shield,
    Sparkles,
    Square,
    Target,
    Trash2,
    User,
    Zap,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { SessionSelector } from "@/components/chat/session-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type AgentStep, type RetrievedChunk, useChatStore } from "@/lib/stores/chat-stores";
import type {
    AgentProgressDataPart,
    AgentResultDataPart,
    AgentStepDataPart,
    RetrievedChunkDataPart,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// Type definitions
type Message = AIMessage & { createdAt?: Date | string };
type MessagePart = Message["parts"][number];

// Metadata types from server
interface AgenticMetadata {
    type: "agentic";
    retrievedChunks: RetrievedChunk[];
    steps: AgentStep[];
    language: "id";
    latencyMs?: number;
    citations: Array<{ id: string; documentTitle: string; citationNumber: number }>;
}

interface StandardRagMetadata {
    type: "standard-rag";
    retrievedChunks: RetrievedChunk[];
    language: "id";
    latencyMs?: number;
}

interface DirectMetadata {
    type: "direct";
    language: "id";
    latencyMs?: number;
    negativeReactionDetected?: boolean;
}

type ChatMetadata = AgenticMetadata | StandardRagMetadata | DirectMetadata;

// Extend AIMessage to include metadata
interface MessageWithMetadata extends AIMessage {
    metadata?: ChatMetadata;
}

const MessageBubble = memo(function MessageBubbleComponent({
    message,
    agentSteps,
    retrievedChunks,
}: {
    message: Message;
    agentSteps?: AgentStep[];
    retrievedChunks?: RetrievedChunk[];
}) {
    const isUser = message.role === "user";
    const timestamp = message.createdAt ? new Date(message.createdAt) : null;

    return (
        <div className={cn("flex w-full gap-3", isUser ? "flex-row-reverse" : "justify-start")}>
            <div
                className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
            >
                {isUser ? <User className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
            </div>

            <div className={cn("flex max-w-[85%] flex-col space-y-2", isUser && "items-end")}>
                <Card className={cn("w-fit p-4", isUser ? "bg-primary text-primary-foreground" : "bg-card")}>
                    <div
                        className={cn(
                            "prose prose-sm dark:prose-invert max-w-none",
                            isUser && "**:text-primary-foreground"
                        )}
                    >
                        {message.parts && message.parts.length > 0
                            ? message.parts.map((part: MessagePart, index: number) => {
                                  switch (part.type) {
                                      case "text":
                                          return (
                                              <ReactMarkdown
                                                  components={{
                                                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                      strong: ({ children }) => (
                                                          <strong className="font-semibold">{children}</strong>
                                                      ),
                                                      em: ({ children }) => <em className="italic">{children}</em>,
                                                      ul: ({ children }) => (
                                                          <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>
                                                      ),
                                                      ol: ({ children }) => (
                                                          <ol className="my-2 ml-4 list-decimal space-y-1">
                                                              {children}
                                                          </ol>
                                                      ),
                                                      li: ({ children }) => <li className="pl-1">{children}</li>,
                                                      code: ({ children, className }) => {
                                                          const isInline = !className;
                                                          return isInline ? (
                                                              <code className="rounded bg-muted/50 px-1 py-0.5 font-mono text-xs">
                                                                  {children}
                                                              </code>
                                                          ) : (
                                                              <code className="block overflow-x-auto rounded bg-muted/50 p-2 font-mono text-xs">
                                                                  {children}
                                                              </code>
                                                          );
                                                      },
                                                      pre: ({ children }) => (
                                                          <pre className="my-2 overflow-x-auto rounded-md bg-muted/50 p-3">
                                                              {children}
                                                          </pre>
                                                      ),
                                                      blockquote: ({ children }) => (
                                                          <blockquote className="my-2 border-primary/50 border-l-2 pl-3 italic">
                                                              {children}
                                                          </blockquote>
                                                      ),
                                                  }}
                                                  key={`${message.id}-text-${index}`}
                                              >
                                                  {part.text}
                                              </ReactMarkdown>
                                          );
                                      case "tool-call":
                                          return (
                                              <div
                                                  className="flex items-center gap-2 text-muted-foreground text-xs"
                                                  key={`${message.id}-tool-${index}`}
                                              >
                                                  <Zap className="h-3 w-3" />
                                                  <span>
                                                      Calling tool:{" "}
                                                      {"toolName" in part ? String(part.toolName) : "tool"}
                                                  </span>
                                              </div>
                                          );
                                      default:
                                          return null;
                                  }
                              })
                            : null}
                    </div>
                    {timestamp && (
                        <div
                            className={cn(
                                "mt-2 flex items-center gap-1 text-[10px]",
                                isUser ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}
                        >
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(timestamp, { addSuffix: true, locale: idLocale })}</span>
                        </div>
                    )}
                </Card>

                {!isUser && agentSteps && agentSteps.length > 0 && <AgentStepsCollapsible steps={agentSteps} />}
                {!isUser && retrievedChunks && retrievedChunks.length > 0 && (
                    <SourcesCollapsible chunks={retrievedChunks} />
                )}
            </div>
        </div>
    );
});

function getStepColor(stepType: AgentStep["stepType"]): string {
    switch (stepType) {
        case "tool_call":
            return "bg-blue-500/20 text-blue-600";
        case "retrieval":
            return "bg-green-500/20 text-green-600";
        case "synthesis":
            return "bg-purple-500/20 text-purple-600";
        default:
            return "bg-orange-500/20 text-orange-600";
    }
}

function getStepIcon(stepType: AgentStep["stepType"]): React.ReactNode {
    switch (stepType) {
        case "tool_call":
            return <Zap className="h-3 w-3" />;
        case "retrieval":
            return <Search className="h-3 w-3" />;
        case "synthesis":
            return <FileText className="h-3 w-3" />;
        default:
            return <Brain className="h-3 w-3" />;
    }
}

function getLoadingText(isStreaming: boolean, useAgenticMode: boolean): string {
    if (isStreaming) {
        return "Streaming response...";
    }
    if (useAgenticMode) {
        return "Agent reasoning... / Agen sedang berpikir...";
    }
    return "Thinking...";
}

function getMessageSteps(
    message: MessageWithMetadata,
    index: number,
    messagesLength: number,
    agentSteps: AgentStep[] | undefined
): AgentStep[] | undefined {
    const metadata = message.metadata;
    const isLastAssistantMessage = index === messagesLength - 1 && message.role === "assistant";

    if (!isLastAssistantMessage) {
        return undefined;
    }

    if (metadata?.type === "agentic") {
        return (metadata as AgenticMetadata).steps || agentSteps;
    }

    return agentSteps;
}

function getMessageChunks(
    message: MessageWithMetadata,
    index: number,
    messagesLength: number,
    retrievedChunks: RetrievedChunk[] | undefined
): RetrievedChunk[] | undefined {
    const metadata = message.metadata;
    const isLastAssistantMessage = index === messagesLength - 1 && message.role === "assistant";

    if (!isLastAssistantMessage) {
        return undefined;
    }

    if (metadata?.type === "agentic" || metadata?.type === "standard-rag") {
        return (metadata as AgenticMetadata | StandardRagMetadata).retrievedChunks || retrievedChunks;
    }

    return retrievedChunks;
}

const AgentStepsCollapsible = memo(function AgentStepsCollapsibleComponent({ steps }: { steps: AgentStep[] }) {
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
    const totalDurationMs = steps.reduce((acc, step) => acc + step.durationMs, 0);

    const toggleStep = (stepIndex: number) => {
        setExpandedSteps((prev) => {
            const next = new Set(prev);
            if (next.has(stepIndex)) {
                next.delete(stepIndex);
            } else {
                next.add(stepIndex);
            }
            return next;
        });
    };

    return (
        <Collapsible>
            <CollapsibleTrigger asChild>
                <Button className="gap-2 text-xs" size="sm" variant="ghost">
                    <Brain className="h-3 w-3" />
                    {steps.length} reasoning steps
                    <Badge className="ml-1 text-[10px]" variant="secondary">
                        {totalDurationMs}ms total
                    </Badge>
                    <ChevronDown className="h-3 w-3 transition-transform data-[state=open]:rotate-180" />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <Card className="mt-2 bg-muted/50 p-3">
                    <div className="space-y-3">
                        {steps.map((step, idx) => {
                            const isExpanded = expandedSteps.has(step.stepIndex);
                            const hasDetails = step.toolInput || step.toolOutput;

                            return (
                                <div
                                    className="border-border border-b pb-2 last:border-0 last:pb-0"
                                    key={`${step.stepIndex}-${step.timestamp}`}
                                >
                                    <div className="flex items-start gap-2 text-xs">
                                        <div className="flex flex-col items-center gap-1">
                                            <Badge className="h-5 w-5 justify-center p-0 text-[10px]" variant="outline">
                                                {idx + 1}
                                            </Badge>
                                            <div
                                                className={cn(
                                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                                                    getStepColor(step.stepType)
                                                )}
                                            >
                                                {getStepIcon(step.stepType)}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{step.toolName || step.stepType}</span>
                                                <Badge className="text-[10px]" variant="outline">
                                                    {step.durationMs}ms
                                                </Badge>
                                            </div>
                                            {step.reasoning && (
                                                <p className="mt-0.5 text-muted-foreground">{step.reasoning}</p>
                                            )}
                                            {hasDetails ? (
                                                <Button
                                                    className="mt-1 h-auto gap-1 p-0 text-[10px]"
                                                    onClick={() => toggleStep(step.stepIndex)}
                                                    size="sm"
                                                    variant="link"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-3 w-3" />
                                                    ) : (
                                                        <ChevronRight className="h-3 w-3" />
                                                    )}
                                                    {isExpanded ? "Hide details" : "Show details"}
                                                </Button>
                                            ) : null}
                                            {isExpanded && hasDetails ? (
                                                <div className="mt-2 space-y-2">
                                                    {step.toolInput ? (
                                                        <div className="rounded bg-background/50 p-2">
                                                            <span className="font-medium text-[10px] text-muted-foreground">
                                                                Input:
                                                            </span>
                                                            <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[10px]">
                                                                {JSON.stringify(
                                                                    step.toolInput as Record<string, unknown>,
                                                                    null,
                                                                    2
                                                                )}
                                                            </pre>
                                                        </div>
                                                    ) : null}
                                                    {step.toolOutput ? (
                                                        <div className="rounded bg-background/50 p-2">
                                                            <span className="font-medium text-[10px] text-muted-foreground">
                                                                Output:
                                                            </span>
                                                            <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[10px]">
                                                                {typeof step.toolOutput === "object"
                                                                    ? JSON.stringify(
                                                                          step.toolOutput as Record<string, unknown>,
                                                                          null,
                                                                          2
                                                                      )
                                                                    : String(step.toolOutput)}
                                                            </pre>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </CollapsibleContent>
        </Collapsible>
    );
});

const SourcesCollapsible = memo(function SourcesCollapsibleComponent({ chunks }: { chunks: RetrievedChunk[] }) {
    const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());

    const toggleChunk = (idx: number) => {
        setExpandedChunks((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) {
                next.delete(idx);
            } else {
                next.add(idx);
            }
            return next;
        });
    };

    const getRelevanceColor = (score: number): string => {
        if (score >= 0.8) return "text-green-600";
        if (score >= 0.5) return "text-yellow-600";
        return "text-orange-600";
    };

    const getRelevanceLabel = (score: number): string => {
        if (score >= 0.8) return "High";
        if (score >= 0.5) return "Medium";
        return "Low";
    };

    return (
        <Collapsible>
            <CollapsibleTrigger asChild>
                <Button className="gap-2 text-xs" size="sm" variant="ghost">
                    <FileText className="h-3 w-3" />
                    {chunks.length} sources
                    <ChevronDown className="h-3 w-3 transition-transform data-[state=open]:rotate-180" />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <Card className="mt-2 bg-muted/50 p-3">
                    <div className="space-y-3">
                        {chunks.map((chunk, idx) => {
                            const isExpanded = expandedChunks.has(idx);

                            return (
                                <div
                                    className="border-border border-b pb-3 text-xs last:border-0 last:pb-0"
                                    key={`chunk-${chunk.documentTitle}-${idx}`}
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                className="h-5 w-5 shrink-0 justify-center p-0 text-[10px]"
                                                variant="default"
                                            >
                                                {idx + 1}
                                            </Badge>
                                            <span className="font-medium">{chunk.documentTitle}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    "font-medium text-[10px]",
                                                    getRelevanceColor(chunk.similarity)
                                                )}
                                            >
                                                {getRelevanceLabel(chunk.similarity)}
                                            </span>
                                            {chunk.retrievalMethod && (
                                                <Badge className="text-[10px]" variant="secondary">
                                                    {chunk.retrievalMethod}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Relevance Score Bar */}
                                    <div className="mb-2 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-muted-foreground">Fused Relevance</span>
                                            <span className="font-medium text-[10px]">
                                                {(chunk.similarity * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <Progress className="h-1.5" value={chunk.similarity * 100} />
                                    </div>

                                    {/* Individual scores if available */}
                                    {(chunk.vectorScore !== undefined || chunk.bm25Score !== undefined) && (
                                        <div className="mb-2 grid grid-cols-2 gap-2">
                                            {chunk.vectorScore !== undefined && (
                                                <div className="space-y-0.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Vector
                                                        </span>
                                                        <span className="text-[10px]">
                                                            {(chunk.vectorScore * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <Progress className="h-1" value={chunk.vectorScore * 100} />
                                                </div>
                                            )}
                                            {chunk.bm25Score !== undefined && (
                                                <div className="space-y-0.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[10px] text-muted-foreground">BM25</span>
                                                        <span className="text-[10px]">
                                                            {chunk.bm25Score.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <Progress
                                                        className="h-1"
                                                        value={Math.min(chunk.bm25Score * 10, 100)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Content Preview */}
                                    <div className="rounded bg-background/50 p-2">
                                        <p className={cn("text-muted-foreground", !isExpanded && "line-clamp-2")}>
                                            {isExpanded ? chunk.content : `${chunk.content.substring(0, 150)}...`}
                                        </p>
                                        {chunk.content.length > 150 && (
                                            <Button
                                                className="mt-1 h-auto gap-1 p-0 text-[10px]"
                                                onClick={() => toggleChunk(idx)}
                                                size="sm"
                                                variant="link"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronDown className="h-3 w-3" />
                                                        Show less
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronRight className="h-3 w-3" />
                                                        Show more
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </CollapsibleContent>
        </Collapsible>
    );
});

const ChatHeader = memo(function ChatHeaderComponent({
    latencyMs,
    onSessionChange,
}: {
    settings: { useAgenticMode: boolean; useRag: boolean };
    detectedLanguage: "id" | null;
    latencyMs: number | null;
    onSessionChange?: (sessionId: string) => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <SessionSelector onSessionChange={onSessionChange} />
            <div className="flex items-center gap-2">
                <Badge className="gap-1" variant="outline">
                    <Languages className="h-3 w-3" />
                    Bahasa Indonesia
                </Badge>
                {latencyMs && (
                    <Badge className="gap-1" variant="outline">
                        <Clock className="h-3 w-3" />
                        {latencyMs}ms
                    </Badge>
                )}
            </div>
        </div>
    );
});

const EmptyState = memo(function EmptyStateComponent() {
    return (
        <div className="py-12 text-center">
            {/* <div className="mx-auto mb-4 w-fit rounded-full bg-primary/10 p-4 pt-0">
                <BookOpen className="h-8 w-8 text-primary" />
            </div> */}
            <h3 className="mb-2 font-medium text-foreground text-lg">Selamat Datang di MuliaChat</h3>
            <p className="mx-auto mb-4 max-w-md text-muted-foreground text-sm">
                Ajukan pertanyaan tentang dokumen yang telah Anda unggah dalam Bahasa Indonesia.
            </p>
        </div>
    );
});

const ChatInput = memo(function ChatInputComponent({
    input,
    isLoading,
    isStreaming,
    messagesExist,
    onInputChange,
    onSubmit,
    onReload,
    onClear,
    onClearMessages,
    onStop,
}: {
    input: string;
    isLoading: boolean;
    isStreaming: boolean;
    messagesExist: boolean;
    onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onReload: () => void;
    onClear: () => void;
    onClearMessages: () => void;
    onStop: () => void;
}) {
    const MIN_LENGTH = 2;
    const MAX_LENGTH = 5000;
    const inputLength = input.length;
    const isTooShort = inputLength > 0 && inputLength < MIN_LENGTH;
    const isTooLong = inputLength > MAX_LENGTH;
    const isNearLimit = inputLength > MAX_LENGTH * 0.9;

    return (
        <div className="border-border border-t bg-card p-4">
            <form className="mx-auto max-w-4xl" onSubmit={onSubmit}>
                <div className="relative">
                    <Textarea
                        className={cn(
                            "min-h-[60px] resize-none bg-background pr-24",
                            isTooShort && "border-yellow-500 focus-visible:ring-yellow-500",
                            isTooLong && "border-destructive focus-visible:ring-destructive"
                        )}
                        disabled={isLoading || isStreaming}
                        onChange={onInputChange}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                onSubmit(e);
                            }
                        }}
                        placeholder="Ajukan pertanyaan..."
                        value={input}
                    />
                    <div className="absolute right-2 bottom-2 flex gap-2">
                        {isStreaming && (
                            <Button
                                onClick={onStop}
                                size="icon"
                                title="Stop generation"
                                type="button"
                                variant="destructive"
                            >
                                <Square className="h-4 w-4" />
                            </Button>
                        )}
                        {messagesExist && !isStreaming && (
                            <>
                                <Button
                                    disabled={isLoading}
                                    onClick={onClearMessages}
                                    size="icon"
                                    title="Clear all messages"
                                    type="button"
                                    variant="ghost"
                                >
                                    <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                    disabled={isLoading}
                                    onClick={onClear}
                                    size="icon"
                                    title="Delete chat session"
                                    type="button"
                                    variant="ghost"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    disabled={isLoading}
                                    onClick={onReload}
                                    size="icon"
                                    title="Reload last message"
                                    type="button"
                                    variant="ghost"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                        {!isStreaming && (
                            <Button
                                disabled={isLoading || !input.trim() || isTooShort || isTooLong}
                                size="icon"
                                type="submit"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                    <p className="text-muted-foreground text-xs">
                        Tekan Enter untuk mengirim • Shift+Enter untuk baris baru
                    </p>
                    <div className="flex items-center gap-2">
                        {isTooShort && <span className="text-[10px] text-yellow-600">Min. {MIN_LENGTH} karakter</span>}
                        {isTooLong && <span className="text-[10px] text-destructive">Melebihi batas!</span>}
                        <span
                            className={cn(
                                "text-[10px]",
                                isTooShort && "text-yellow-600",
                                isTooLong && "text-destructive",
                                isNearLimit && !isTooLong && "text-yellow-600",
                                !(isTooShort || isTooLong || isNearLimit) && "text-muted-foreground"
                            )}
                        >
                            {inputLength}/{MAX_LENGTH}
                        </span>
                    </div>
                </div>
            </form>
        </div>
    );
});

const MessageList = memo(function MessageListComponent({
    messages,
    agentSteps,
    retrievedChunks,
    isLoading,
    isStreaming,
    isLoadingMessages,
    settings,
    scrollRef,
    liveAgentSteps,
    liveRetrievedChunks,
    agentProgress,
}: {
    messages: MessageWithMetadata[];
    agentSteps: AgentStep[];
    retrievedChunks: RetrievedChunk[];
    isLoading: boolean;
    isStreaming: boolean;
    isLoadingMessages: boolean;
    settings: { useAgenticMode: boolean };
    scrollRef: React.RefObject<HTMLDivElement | null>;
    liveAgentSteps: AgentStep[];
    liveRetrievedChunks: RetrievedChunk[];
    agentProgress: AgentProgressDataPart | null;
}) {
    // Use live state during streaming, fallback to persisted state after
    const displaySteps = isStreaming && liveAgentSteps.length > 0 ? liveAgentSteps : agentSteps;
    const displayChunks = isStreaming && liveRetrievedChunks.length > 0 ? liveRetrievedChunks : retrievedChunks;

    // Skeleton loading for initial message load
    if (isLoadingMessages && messages.length === 0) {
        return (
            <div className="mx-auto max-w-4xl space-y-4 pb-4">
                {/* User message skeleton */}
                <div className="flex w-full flex-row-reverse gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="max-w-[85%] space-y-2">
                        <Skeleton className="h-16 w-64 rounded-lg" />
                    </div>
                </div>
                {/* Assistant message skeleton */}
                <div className="flex w-full justify-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="max-w-[85%] space-y-2">
                        <Skeleton className="h-24 w-96 rounded-lg" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>
                {/* Another user skeleton */}
                <div className="flex w-full flex-row-reverse gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="max-w-[85%] space-y-2">
                        <Skeleton className="h-12 w-48 rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-4 pb-4">
            {messages.length === 0 && !isLoadingMessages && <EmptyState />}

            {messages.map((message: MessageWithMetadata, index: number) => (
                <MessageBubble
                    agentSteps={getMessageSteps(message, index, messages.length, displaySteps)}
                    key={message.id}
                    message={message}
                    retrievedChunks={getMessageChunks(message, index, messages.length, displayChunks)}
                />
            ))}

            {(isLoading || isStreaming) && settings.useAgenticMode && liveAgentSteps.length > 0 && (
                <div className="space-y-2">
                    <AgentStepsCollapsible steps={liveAgentSteps} />
                    {liveRetrievedChunks.length > 0 && <SourcesCollapsible chunks={liveRetrievedChunks} />}
                </div>
            )}

            {/* Loading indicator (only show when streaming text or not in agentic mode) */}
            {(isLoading || isStreaming) && (
                <div className="flex w-full justify-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Brain className="h-4 w-4" />
                    </div>
                    <Card className="max-w-[85%] bg-card p-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span className="text-sm">
                                    {agentProgress?.message || getLoadingText(isStreaming, settings.useAgenticMode)}
                                </span>
                            </div>
                            {settings.useAgenticMode && agentProgress && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span>
                                            {agentProgress.status === "initializing" && "Memulai..."}
                                            {agentProgress.status === "retrieving" && "Mengambil dokumen..."}
                                            {agentProgress.status === "reasoning" && "Penalaran..."}
                                            {agentProgress.status === "synthesizing" && "Menyintesis jawaban..."}
                                            {agentProgress.status === "completed" && "Selesai"}
                                        </span>
                                        <span>
                                            Step {agentProgress.currentStep}/{agentProgress.maxSteps}
                                        </span>
                                    </div>
                                    <Progress
                                        className="h-1.5"
                                        value={(agentProgress.currentStep / agentProgress.maxSteps) * 100}
                                    />
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            <div ref={scrollRef} />
        </div>
    );
});

const SettingsPanel = memo(function SettingsPanelComponent({
    settings,
    setSettings,
}: {
    settings: {
        useRag: boolean;
        useAgenticMode: boolean;
        enableGuardrails: boolean;
        retrievalStrategy: "vector" | "keyword" | "hybrid";
    };
    setSettings: (s: Partial<typeof settings>) => void;
}) {
    return (
        <TooltipProvider>
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Switch
                        checked={settings.useRag}
                        id="rag-mode"
                        onCheckedChange={(v) => setSettings({ useRag: v })}
                    />
                    <Label className="flex cursor-pointer items-center gap-1.5 text-sm" htmlFor="rag-mode">
                        <Database className="h-4 w-4" />
                        RAG
                    </Label>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-medium">Retrieval-Augmented Generation</p>
                            <p className="mt-1 text-primary-foreground/80">
                                Menggunakan dokumen yang telah Anda unggah untuk menjawab pertanyaan dengan konteks yang
                                relevan.
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                <div className="flex items-center gap-2">
                    <Switch
                        checked={settings.useAgenticMode}
                        disabled={!settings.useRag}
                        id="agentic-mode"
                        onCheckedChange={(v) => setSettings({ useAgenticMode: v })}
                    />
                    <Label className="flex cursor-pointer items-center gap-1.5 text-sm" htmlFor="agentic-mode">
                        <Brain className="h-4 w-4" />
                        Agentic
                    </Label>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-medium">Penalaran Multi-Langkah</p>
                            <p className="mt-1 text-primary-foreground/80">
                                Menggunakan tool untuk menjalankan penalaran kompleks dengan langkah-langkah yang dapat
                                dilacak.
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                <div className="flex items-center gap-2">
                    <Switch
                        checked={settings.enableGuardrails}
                        id="guardrails"
                        onCheckedChange={(v) => setSettings({ enableGuardrails: v })}
                    />
                    <Label className="flex cursor-pointer items-center gap-1.5 text-sm" htmlFor="guardrails">
                        <Shield className="h-4 w-4" />
                        Guardrails
                    </Label>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-medium">Keamanan Konten</p>
                            <p className="mt-1 text-primary-foreground/80">
                                Pemeriksaan keamanan dan validasi input (10-5000 karakter). Memfilter konten berbahaya.
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {settings.useRag && (
                    <div className="flex items-center gap-2">
                        <Select
                            onValueChange={(v: "vector" | "keyword" | "hybrid") =>
                                setSettings({ retrievalStrategy: v })
                            }
                            value={settings.retrievalStrategy}
                        >
                            <SelectTrigger className="h-8 w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="hybrid">
                                    <span className="flex items-center gap-1.5">
                                        <Zap className="h-3 w-3" /> Hybrid (RRF)
                                    </span>
                                </SelectItem>
                                <SelectItem value="vector">
                                    <span className="flex items-center gap-1.5">
                                        <Target className="h-3 w-3" /> Vector Only
                                    </span>
                                </SelectItem>
                                <SelectItem value="keyword">
                                    <span className="flex items-center gap-1.5">
                                        <Search className="h-3 w-3" /> Okapi BM25
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p className="font-medium">Strategi Retrieval</p>
                                <ul className="mt-1 space-y-1 text-primary-foreground/80">
                                    <li>
                                        <strong>Hybrid (RRF):</strong> Menggabungkan pencarian semantik dan kata kunci
                                        dengan Reciprocal Rank Fusion
                                    </li>
                                    <li>
                                        <strong>Vector:</strong> Pencarian berbasis kemiripan semantik
                                    </li>
                                    <li>
                                        <strong>BM25:</strong> Pencarian berbasis pencocokan kata kunci
                                    </li>
                                </ul>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                )}

                <Badge
                    className="ml-auto gap-1"
                    variant={settings.useAgenticMode && settings.useRag ? "default" : "secondary"}
                >
                    {(() => {
                        if (settings.useAgenticMode && settings.useRag) {
                            return (
                                <>
                                    <Brain className="h-3 w-3" />
                                    Agentic RAG
                                </>
                            );
                        }
                        if (settings.useRag) {
                            return (
                                <>
                                    <Sparkles className="h-3 w-3" />
                                    Standard RAG
                                </>
                            );
                        }
                        return (
                            <>
                                <Bot className="h-3 w-3" />
                                Direct
                            </>
                        );
                    })()}
                </Badge>
            </div>
        </TooltipProvider>
    );
});

function useChatLogic() {
    const {
        settings,
        setSettings,
        isLoading: storeLoading,
        setLoading,
        error,
        setError,
        activeSession,
        createSession,
        deleteSession,
        saveEphemeralSession,
        sessions,
        activeSessionId,
    } = useChatStore();

    const scrollRef = useRef<HTMLDivElement>(null);
    const session = activeSession();
    const isEphemeral = session?.isEphemeral ?? false;

    // Final persisted state (from message metadata)
    const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
    const [retrievedChunks, setRetrievedChunks] = useState<RetrievedChunk[]>([]);
    const [latencyMs, setLatencyMs] = useState<number | null>(null);
    const [detectedLanguage, setDetectedLanguage] = useState<"id" | null>(null);
    const [input, setInput] = useState("");
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    // Live streaming state (real-time updates during agentic RAG)
    const [liveAgentSteps, setLiveAgentSteps] = useState<AgentStep[]>([]);
    const [liveRetrievedChunks, setLiveRetrievedChunks] = useState<RetrievedChunk[]>([]);
    const [agentProgress, setAgentProgress] = useState<AgentProgressDataPart | null>(null);

    const {
        messages,
        sendMessage,
        status,
        setMessages,
        error: chatError,
        stop,
    } = useChat<MessageWithMetadata>({
        transport: new DefaultChatTransport({
            api: "/api/chat",
            body: () => {
                const currentState = useChatStore.getState();
                return {
                    sessionId: currentState.activeSessionId,
                    useRag: currentState.settings.useRag,
                    useAgenticMode: currentState.settings.useAgenticMode,
                    retrievalStrategy: currentState.settings.retrievalStrategy,
                    enableGuardrails: currentState.settings.enableGuardrails,
                };
            },
        }),
        experimental_throttle: 50, // Throttle UI updates for better performance
        // Handle real-time data parts streamed during agentic RAG
        onData: (dataPart) => {
            const partType = dataPart.type as string;

            // Handle agent step start/update
            if (partType === "data-agent-step") {
                const data = dataPart.data as AgentStepDataPart;
                setLiveAgentSteps((prev) => {
                    // Check if step already exists
                    const existing = prev.findIndex((s) => s.stepIndex === data.stepIndex);
                    const newStep: AgentStep = {
                        stepIndex: data.stepIndex,
                        stepType: data.stepType,
                        toolName: data.toolName,
                        toolInput: data.toolInput,
                        durationMs: 0,
                        timestamp: data.timestamp,
                    };
                    if (existing >= 0) {
                        // Update existing step
                        const updated = [...prev];
                        updated[existing] = newStep;
                        return updated;
                    }
                    return [...prev, newStep];
                });
            }

            // Handle agent result (step complete with output)
            if (partType === "data-agent-result") {
                const data = dataPart.data as AgentResultDataPart;
                setLiveAgentSteps((prev) => {
                    const updated = [...prev];
                    const stepIdx = updated.findIndex((s) => s.stepIndex === data.stepIndex);
                    if (stepIdx >= 0) {
                        updated[stepIdx] = {
                            ...updated[stepIdx],
                            toolOutput: data.output,
                            durationMs: data.durationMs,
                        };
                    }
                    return updated;
                });
            }

            // Handle retrieved chunk
            if (partType === "data-retrieved-chunk") {
                const data = dataPart.data as RetrievedChunkDataPart;
                setLiveRetrievedChunks((prev) => {
                    // Avoid duplicates
                    if (prev.some((c) => c.chunkId === data.chunkId)) {
                        return prev;
                    }
                    return [
                        ...prev,
                        {
                            chunkId: data.chunkId,
                            documentTitle: data.documentTitle,
                            content: data.content,
                            similarity: data.similarity,
                            retrievalMethod: data.retrievalMethod,
                            vectorScore: data.vectorScore,
                            bm25Score: data.bm25Score,
                        },
                    ];
                });
            }

            // Handle progress updates (transient)
            if (partType === "data-agent-progress") {
                const data = dataPart.data as AgentProgressDataPart;
                setAgentProgress(data);
            }
        },
        onFinish: ({ message }) => {
            // Extract metadata from the finished message
            const metadata = message.metadata as ChatMetadata | undefined;

            if (metadata) {
                if (metadata.latencyMs) {
                    setLatencyMs(metadata.latencyMs);
                }
                if (metadata.language) {
                    setDetectedLanguage(metadata.language);
                }

                // Handle agentic metadata - use live steps if available, fallback to metadata
                if (metadata.type === "agentic") {
                    const agenticMeta = metadata as AgenticMetadata;
                    // Prefer live steps if we have them (they have more detail)
                    if (liveAgentSteps.length > 0) {
                        setAgentSteps(liveAgentSteps);
                    } else if (agenticMeta.steps) {
                        setAgentSteps(agenticMeta.steps);
                    }

                    // Prefer live chunks if we have them
                    if (liveRetrievedChunks.length > 0) {
                        setRetrievedChunks(liveRetrievedChunks);
                    } else if (agenticMeta.retrievedChunks) {
                        setRetrievedChunks(agenticMeta.retrievedChunks);
                    }
                }

                // Handle standard RAG metadata
                if (metadata.type === "standard-rag") {
                    const ragMeta = metadata as StandardRagMetadata;
                    if (ragMeta.retrievedChunks) {
                        setRetrievedChunks(ragMeta.retrievedChunks);
                    }
                }
            }

            // Clear live state and progress after finish
            setAgentProgress(null);

            scrollRef.current?.scrollIntoView({ behavior: "smooth" });
            setLoading(false);
        },
        onError: (err: Error) => {
            setError(err.message);
            setLoading(false);
            // Clear live state on error
            setAgentProgress(null);
        },
    });

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    }, []);

    // Load messages from database when session changes
    const loadMessagesFromDb = useCallback(
        async (sessionId: string) => {
            setIsLoadingMessages(true);
            try {
                const response = await fetch(`/api/sessions/${sessionId}/messages`);
                const { messages: dbMessages } = await response.json();

                if (dbMessages && dbMessages.length > 0) {
                    // Convert DB messages to UIMessage format
                    const uiMessages: MessageWithMetadata[] = dbMessages.map(
                        (msg: { id: string; role: string; content: string; createdAt: string }) => ({
                            id: msg.id,
                            role: msg.role as "user" | "assistant",
                            parts: [{ type: "text" as const, text: msg.content }],
                        })
                    );
                    setMessages(uiMessages);
                } else {
                    setMessages([]);
                }
            } catch (err) {
                console.error("Failed to load messages:", err);
                setMessages([]);
            } finally {
                setIsLoadingMessages(false);
            }
        },
        [setMessages]
    );

    // Handle session change from SessionSelector
    const handleSessionChange = useCallback(
        (sessionId: string) => {
            // Reset state for new session
            setAgentSteps([]);
            setRetrievedChunks([]);
            setLatencyMs(null);
            setDetectedLanguage(null);
            setError(null);
            setInput("");
            setLiveAgentSteps([]);
            setLiveRetrievedChunks([]);
            setAgentProgress(null);

            // If "new" sentinel value, just clear messages without loading
            if (sessionId === "new") {
                setMessages([]);
                return;
            }

            // Load messages from database
            loadMessagesFromDb(sessionId);
        },
        [loadMessagesFromDb, setError, setMessages]
    );

    // Initialize: wait for sessions to load, then set active session or create new one
    useEffect(() => {
        const { isLoadingSessions } = useChatStore.getState();

        // Don't do anything while sessions are still loading from DB
        if (isLoadingSessions) {
            return;
        }

        // If no active session but we have sessions, set the most recent one as active
        if (!session && sessions.length > 0) {
            const mostRecent = sessions[0]; // sessions are sorted by updatedAt descending
            useChatStore.setState({ activeSessionId: mostRecent.id });
            return;
        }

        // Only create a new session if we have no sessions at all
        if (!session && sessions.length === 0 && !isLoadingSessions) {
            (async () => {
                try {
                    const response = await fetch("/api/sessions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            useRag: settings.useRag,
                            useAgenticMode: settings.useAgenticMode,
                            retrievalStrategy: settings.retrievalStrategy,
                        }),
                    });
                    const { session: dbSession } = await response.json();

                    if (dbSession?.id) {
                        useChatStore.setState((state) => ({
                            sessions: [
                                ...state.sessions,
                                {
                                    id: dbSession.id,
                                    title: dbSession.title || "New Chat",
                                    messages: [],
                                    createdAt: Date.now(),
                                    updatedAt: Date.now(),
                                    settings: { ...settings },
                                },
                            ],
                            activeSessionId: dbSession.id,
                        }));
                    }
                } catch (err) {
                    console.error("Failed to create session:", err);
                    createSession("New Chat");
                }
            })();
        }
    }, [session, sessions, createSession, settings]);

    // Load messages when active session changes
    useEffect(() => {
        if (activeSessionId && messages.length === 0) {
            loadMessagesFromDb(activeSessionId);
        }
    }, [activeSessionId, loadMessagesFromDb, messages.length]);

    const onSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!input.trim()) return;

            // Reset metadata for new message
            setAgentSteps([]);
            setRetrievedChunks([]);
            setDetectedLanguage(null);
            setLatencyMs(null);
            setError(null);

            // Reset live streaming state
            setLiveAgentSteps([]);
            setLiveRetrievedChunks([]);
            setAgentProgress(null);

            const userMessage = input;
            setInput("");

            // Send message - useChat handles streaming automatically for all modes
            sendMessage({ text: userMessage });
        },
        [input, sendMessage, setError]
    );

    const isStreaming = status === "streaming";
    const isSubmitted = status === "submitted";
    const isLoading = storeLoading || isSubmitted || isLoadingMessages;

    const handleStop = useCallback(() => {
        stop();
    }, [stop]);

    const handleReload = useCallback(() => {
        const lastUserMsg = messages.filter((m) => m.role === "user").pop();
        const text = lastUserMsg?.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("");
        if (text) setInput(text);
    }, [messages]);

    const handleClear = useCallback(() => {
        if (!session?.id) {
            return;
        }

        if (!window.confirm("Delete this chat session? This cannot be undone.")) {
            return;
        }

        void (async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/sessions/${session.id}`, { method: "DELETE" });
                if (!response.ok) {
                    const errorText = await response.text().catch(() => "Failed to delete session");
                    throw new Error(errorText || "Failed to delete session");
                }

                deleteSession(session.id);
                setMessages([]);
                setAgentSteps([]);
                setRetrievedChunks([]);
                setLatencyMs(null);
                setDetectedLanguage(null);
                setInput("");
                setError(null);
                setLiveAgentSteps([]);
                setLiveRetrievedChunks([]);
                setAgentProgress(null);

                const nextActiveSessionId = useChatStore.getState().activeSessionId;
                if (nextActiveSessionId) {
                    await loadMessagesFromDb(nextActiveSessionId);
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to delete session";
                setError(message);
            } finally {
                setLoading(false);
            }
        })();
    }, [deleteSession, loadMessagesFromDb, session?.id, setError, setLoading, setMessages]);

    const handleClearCurrentSession = useCallback(async () => {
        if (!session?.id) {
            return;
        }

        if (!window.confirm("Clear all messages in this session? This cannot be undone.")) {
            return;
        }

        setLoading(true);
        try {
            // Delete all messages for this session
            const response = await fetch(`/api/sessions/${session.id}/messages`, { method: "DELETE" });
            if (!response.ok) {
                throw new Error("Failed to clear messages");
            }

            // Clear local state
            setMessages([]);
            setAgentSteps([]);
            setRetrievedChunks([]);
            setLatencyMs(null);
            setDetectedLanguage(null);
            setInput("");
            setError(null);
            setLiveAgentSteps([]);
            setLiveRetrievedChunks([]);
            setAgentProgress(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to clear messages";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [session?.id, setError, setLoading, setMessages]);

    const handleSaveSession = useCallback(async () => {
        if (!(session?.id && session.isEphemeral)) return;
        await saveEphemeralSession(session.id);
    }, [session?.id, session?.isEphemeral, saveEphemeralSession]);

    return {
        settings,
        setSettings,
        error,
        chatError,
        messages: messages as MessageWithMetadata[],
        agentSteps,
        retrievedChunks,
        latencyMs,
        detectedLanguage,
        isLoading,
        isStreaming,
        isLoadingMessages,
        isEphemeral,
        input,
        scrollRef,
        handleInputChange,
        onSubmit,
        handleReload,
        handleClear,
        handleClearCurrentSession,
        handleSessionChange,
        handleStop,
        handleSaveSession,
        // Live streaming state
        liveAgentSteps,
        liveRetrievedChunks,
        agentProgress,
    };
}

export function ChatInterface() {
    const {
        settings,
        setSettings,
        error,
        chatError,
        messages,
        agentSteps,
        retrievedChunks,
        latencyMs,
        detectedLanguage,
        isLoading,
        isStreaming,
        isLoadingMessages,
        isEphemeral,
        input,
        scrollRef,
        handleInputChange,
        onSubmit,
        handleReload,
        handleClear,
        handleClearCurrentSession,
        handleSessionChange,
        handleStop,
        handleSaveSession,
        // Live streaming state
        liveAgentSteps,
        liveRetrievedChunks,
        agentProgress,
    } = useChatLogic();

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <div className="flex shrink-0 flex-col gap-3 border-border border-b bg-card p-4">
                <ChatHeader
                    detectedLanguage={detectedLanguage}
                    latencyMs={latencyMs}
                    onSessionChange={handleSessionChange}
                    settings={settings}
                />
                <SettingsPanel setSettings={setSettings} settings={settings} />
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {isEphemeral && (
                    <div className="mx-4 mt-4 flex shrink-0 items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                        <div className="flex items-center gap-2">
                            <Cloud className="h-4 w-4 text-amber-600" />
                            <span className="text-amber-700 text-sm dark:text-amber-400">
                                Unsaved Session — This chat won't be stored
                            </span>
                        </div>
                        <Button className="gap-1.5" onClick={handleSaveSession} size="sm" variant="outline">
                            <Save className="h-3.5 w-3.5" />
                            Save Session
                        </Button>
                    </div>
                )}

                {(error || chatError) && (
                    <div className="mx-4 mt-4 flex shrink-0 items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="text-destructive text-sm">{error || chatError?.message}</span>
                    </div>
                )}

                <ScrollArea className="min-h-0 flex-1">
                    <div className="flex p-4">
                        <MessageList
                            agentProgress={agentProgress}
                            agentSteps={agentSteps}
                            isLoading={isLoading}
                            isLoadingMessages={isLoadingMessages}
                            isStreaming={isStreaming}
                            liveAgentSteps={liveAgentSteps}
                            liveRetrievedChunks={liveRetrievedChunks}
                            messages={messages}
                            retrievedChunks={retrievedChunks}
                            scrollRef={scrollRef}
                            settings={settings}
                        />
                    </div>
                </ScrollArea>
            </div>

            <div className="shrink-0">
                <ChatInput
                    input={input}
                    isLoading={isLoading}
                    isStreaming={isStreaming}
                    messagesExist={messages.length > 0}
                    onClear={handleClear}
                    onClearMessages={handleClearCurrentSession}
                    onInputChange={handleInputChange}
                    onReload={handleReload}
                    onStop={handleStop}
                    onSubmit={onSubmit}
                />
            </div>
        </div>
    );
}
