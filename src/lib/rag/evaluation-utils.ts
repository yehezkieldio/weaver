/**
 * @fileoverview Evaluation Utilities for RAG Pipeline
 *
 * Shared utilities for evaluation including:
 * - LRU cache for embeddings to avoid redundant calculations
 * - Robust JSON extraction from LLM outputs
 * - Extended progress tracking types
 * - Metric error tracking
 */

import consola from "consola";
import { generateEmbedding } from "@/lib/ai/embeddings";

// ==================== Embedding Cache ====================

/**
 * LRU cache for embeddings to avoid recalculating for identical text inputs.
 *
 * WHY caching matters:
 * - Embedding API calls are slow (~100-200ms each)
 * - Same text may be embedded multiple times across evaluation runs
 * - Reduces API costs and improves execution time
 *
 * Cache size increased to 1000 to accommodate 50-question evaluation runs
 * where ground truth texts are repeatedly embedded.
 */
const EMBEDDING_CACHE_MAX_SIZE = 1000;

interface CacheEntry {
    embedding: number[];
    lastUsed: number;
}

const embeddingCache = new Map<string, CacheEntry>();
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Get embedding with caching. Uses LRU eviction when cache is full.
 */
export async function getCachedEmbedding(text: string): Promise<{ embedding: number[] }> {
    const cacheKey = text.substring(0, 500); // Use first 500 chars as key

    const cached = embeddingCache.get(cacheKey);
    if (cached) {
        cached.lastUsed = Date.now();
        cacheHits += 1;
        const hitRate = ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(1);
        consola.debug(`[EmbeddingCache] HIT (${hitRate}% hit rate) for text: "${text.substring(0, 50)}..."`);
        return { embedding: cached.embedding };
    }

    cacheMisses += 1;
    const hitRate = ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(1);
    consola.debug(`[EmbeddingCache] MISS (${hitRate}% hit rate) for text: "${text.substring(0, 50)}..."`);
    const result = await generateEmbedding(text);

    // Evict oldest entry if cache is full
    if (embeddingCache.size >= EMBEDDING_CACHE_MAX_SIZE) {
        let oldestKey = "";
        let oldestTime = Number.POSITIVE_INFINITY;
        for (const [key, entry] of embeddingCache) {
            if (entry.lastUsed < oldestTime) {
                oldestTime = entry.lastUsed;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            embeddingCache.delete(oldestKey);
            consola.debug(`[EmbeddingCache] Evicted oldest entry (cache full at ${EMBEDDING_CACHE_MAX_SIZE})`);
        }
    }

    embeddingCache.set(cacheKey, {
        embedding: result.embedding,
        lastUsed: Date.now(),
    });

    return result;
}

/**
 * Clear the embedding cache. Useful for testing or memory management.
 */
export function clearEmbeddingCache(): void {
    embeddingCache.clear();
    cacheHits = 0;
    cacheMisses = 0;
    consola.debug("[EmbeddingCache] Cache cleared, statistics reset");
}

/**
 * Get cache statistics for debugging.
 */
export function getEmbeddingCacheStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
} {
    const total = cacheHits + cacheMisses;
    return {
        size: embeddingCache.size,
        maxSize: EMBEDDING_CACHE_MAX_SIZE,
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: total > 0 ? cacheHits / total : 0,
    };
}

// ==================== JSON Extraction ====================

// Top-level regex patterns for performance (avoid re-creation in function calls)
const MARKDOWN_CODE_BLOCK_REGEX = /```(?:json)?\s*([\s\S]*?)```/;
const JSON_ARRAY_REGEX = /\[[\s\S]*\]/;
const SINGLE_QUOTE_REGEX = /'/g;
const TRAILING_COMMA_ARRAY_REGEX = /,\s*]/g;
const TRAILING_COMMA_OBJECT_REGEX = /,\s*}/g;
const NUMERIC_SCORE_REGEX = /\d+\.?\d*/;

/**
 * Robustly extract JSON array from LLM output that may contain markdown or extra text.
 *
 * WHY this is needed:
 * - LLMs often wrap JSON in markdown code blocks
 * - Sometimes add explanatory text before/after JSON
 * - May use single quotes instead of double quotes
 *
 * @param text - Raw LLM output
 * @returns Parsed array or null if extraction fails
 */
export function extractJsonArray(text: string): string[] | null {
    if (!text) return null;

    // Strategy 1: Try direct JSON parse
    try {
        const parsed = JSON.parse(text.trim());
        if (Array.isArray(parsed)) return parsed;
    } catch {
        // Continue to other strategies
    }

    // Strategy 2: Extract from markdown code block
    const codeBlockMatch = text.match(MARKDOWN_CODE_BLOCK_REGEX);
    if (codeBlockMatch) {
        try {
            const parsed = JSON.parse(codeBlockMatch[1].trim());
            if (Array.isArray(parsed)) return parsed;
        } catch {
            // Continue to other strategies
        }
    }

    // Strategy 3: Find JSON array pattern in text
    const arrayMatch = text.match(JSON_ARRAY_REGEX);
    if (arrayMatch) {
        try {
            const parsed = JSON.parse(arrayMatch[0]);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            // Continue to other strategies
        }
    }

    // Strategy 4: Try fixing common issues (single quotes -> double quotes)
    const fixedText = text
        .replace(SINGLE_QUOTE_REGEX, '"')
        .replace(TRAILING_COMMA_ARRAY_REGEX, "]") // Remove trailing commas
        .replace(TRAILING_COMMA_OBJECT_REGEX, "}");

    const fixedArrayMatch = fixedText.match(JSON_ARRAY_REGEX);
    if (fixedArrayMatch) {
        try {
            const parsed = JSON.parse(fixedArrayMatch[0]);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            // All strategies failed
        }
    }

    consola.warn(`[extractJsonArray] Failed to extract JSON array from: "${text.substring(0, 100)}..."`);
    return null;
}

/**
 * Extract a numeric score from LLM output.
 *
 * @param text - Raw LLM output expected to contain a number
 * @returns Parsed number or null if extraction fails
 */
export function extractNumericScore(text: string): number | null {
    if (!text) return null;

    // Try to find a decimal number in the text
    const match = text.match(NUMERIC_SCORE_REGEX);
    if (match) {
        const num = Number.parseFloat(match[0]);
        if (!Number.isNaN(num)) {
            return Math.min(1, Math.max(0, num)); // Clamp to 0-1
        }
    }

    return null;
}

// ==================== Error Tracking ====================

/**
 * Represents a metric calculation error for debugging.
 */
export interface MetricError {
    metricName: string;
    errorMessage: string;
    timestamp: number;
}

/**
 * Result of a metric calculation with optional error tracking.
 */
export interface MetricResult {
    value: number;
    error?: MetricError;
}

/**
 * Create a metric result with error tracking.
 */
export function createMetricResult(value: number, error?: { name: string; message: string }): MetricResult {
    if (error) {
        return {
            value,
            error: {
                metricName: error.name,
                errorMessage: error.message,
                timestamp: Date.now(),
            },
        };
    }
    return { value };
}

// ==================== Progress Tracking ====================

/**
 * Extended progress callback with detailed metrics.
 */
export interface ExtendedProgressData {
    configIndex: number;
    questionIndex: number;
    totalConfigs: number;
    totalQuestions: number;
    currentConfigName?: string;
    currentQuestion?: string;
    estimatedTimeRemainingMs?: number;
    currentMetrics?: Partial<{
        faithfulness: number;
        answerRelevancy: number;
        answerCorrectness: number;
    }>;
    errorCount: number;
    completedCount: number;
    avgLatencyMs?: number;
}

export type ExtendedProgressCallback = (data: ExtendedProgressData) => void;

/**
 * Calculate estimated time remaining based on completed items.
 */
export function calculateETA(completedCount: number, totalCount: number, elapsedMs: number): number {
    if (completedCount === 0) return 0;
    const avgTimePerItem = elapsedMs / completedCount;
    const remainingItems = totalCount - completedCount;
    return Math.round(avgTimePerItem * remainingItems);
}

// ==================== Batch Processing ====================

/**
 * Default concurrency for parallel processing.
 * Can be overridden via environment variable EVAL_CONCURRENCY.
 */
export const DEFAULT_CONCURRENCY = Number(process.env.EVAL_CONCURRENCY) || 3;

/**
 * Process items in parallel batches with configurable concurrency.
 *
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param concurrency - Number of parallel processes (default: 3)
 * @returns Array of results in same order as input
 */
export async function processBatches<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    concurrency: number = DEFAULT_CONCURRENCY
): Promise<R[]> {
    const results: R[] = new Array(items.length);

    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        const batchNumber = Math.floor(i / concurrency) + 1;
        const totalBatches = Math.ceil(items.length / concurrency);

        consola.debug(`[processBatches] Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);

        const batchResults = await Promise.all(batch.map((item, batchIndex) => processor(item, i + batchIndex)));

        for (let j = 0; j < batchResults.length; j++) {
            results[i + j] = batchResults[j];
        }
    }

    return results;
}
