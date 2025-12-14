/**
 * @fileoverview Embedding Cache for Optimized Semantic Chunking
 *
 * WHY This Module:
 * - Semantic chunking was generating N embeddings for N sentences (expensive)
 * - Sliding window approach reduces this by 3-5x (window count << sentence count)
 * - Caching allows reuse of embeddings between boundary detection and storage
 *
 * Key Optimizations:
 * 1. **Sliding Windows**: Generate embeddings for overlapping windows (4 sentences)
 *    instead of individual sentences
 * 2. **Content Hashing**: Cache embeddings by content hash for reuse
 * 3. **Mean Pooling**: Aggregate multiple embeddings into single chunk embedding
 *
 * Research Foundation:
 * - Sliding window with stride-2 maintains semantic coherence while reducing API calls
 * - Mean pooling preserves semantic information better than max/min pooling
 */

import { createHash } from "node:crypto";

/**
 * Configuration for sliding window embedding generation
 */
export interface SlidingWindowConfig {
    /** Number of sentences per window (default: 4) */
    windowSize: number;
    /** Step size between windows (default: 2) */
    stride: number;
    /** Similarity threshold for boundary detection (default: 0.5) */
    boundaryThreshold: number;
}

/**
 * Represents a sliding window of sentences
 */
export interface SlidingWindow {
    /** Index of first sentence in window */
    startIndex: number;
    /** Index of last sentence in window (exclusive) */
    endIndex: number;
    /** Combined content of sentences in window */
    content: string;
}

/**
 * In-memory cache for embeddings during document processing
 */
export interface EmbeddingCache {
    /** Sentence content hash -> embedding vector */
    sentenceEmbeddings: Map<string, number[]>;
    /** Window content hash -> embedding vector */
    windowEmbeddings: Map<string, number[]>;
    /** Statistics for debugging */
    stats: {
        hits: number;
        misses: number;
    };
}

/**
 * Default configuration optimized for academic documents
 */
export const DEFAULT_SLIDING_WINDOW_CONFIG: SlidingWindowConfig = {
    windowSize: 4,
    stride: 2,
    boundaryThreshold: 0.5,
};

/**
 * Create a new embedding cache instance
 */
export function createEmbeddingCache(): EmbeddingCache {
    return {
        sentenceEmbeddings: new Map(),
        windowEmbeddings: new Map(),
        stats: { hits: 0, misses: 0 },
    };
}

/**
 * Generate a stable hash for content to use as cache key
 *
 * @param content - Text content to hash
 * @returns SHA-256 hash truncated to 16 chars for efficiency
 */
export function hashContent(content: string): string {
    return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/**
 * Get cached embedding or mark as miss for later generation
 *
 * @param cache - Embedding cache instance
 * @param content - Content to look up
 * @returns Cached embedding or undefined if not found
 */
export function getCachedEmbedding(cache: EmbeddingCache, content: string): number[] | undefined {
    const hash = hashContent(content);
    const cached = cache.sentenceEmbeddings.get(hash) ?? cache.windowEmbeddings.get(hash);

    if (cached) {
        cache.stats.hits += 1;
        return cached;
    }

    cache.stats.misses += 1;
    return undefined;
}

/**
 * Store embedding in cache
 *
 * @param cache - Embedding cache instance
 * @param content - Content that was embedded
 * @param embedding - Embedding vector to cache
 * @param type - Whether this is a sentence or window embedding
 */
export function setCachedEmbedding(
    cache: EmbeddingCache,
    content: string,
    embedding: number[],
    type: "sentence" | "window" = "sentence"
): void {
    const hash = hashContent(content);
    if (type === "sentence") {
        cache.sentenceEmbeddings.set(hash, embedding);
    } else {
        cache.windowEmbeddings.set(hash, embedding);
    }
}

/**
 * Aggregate multiple embeddings into a single embedding using mean pooling
 *
 * WHY Mean Pooling:
 * - Preserves semantic information from all constituent embeddings
 * - More robust than max pooling for variable-length content
 * - Standard approach in sentence-transformers literature
 *
 * @param embeddings - Array of embedding vectors to aggregate
 * @returns Mean-pooled embedding vector
 */
export function aggregateEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
        throw new Error("Cannot aggregate empty embedding array");
    }

    if (embeddings.length === 1) {
        return embeddings[0];
    }

    const dimension = embeddings[0].length;
    const result = new Array<number>(dimension).fill(0);

    for (const embedding of embeddings) {
        for (let i = 0; i < dimension; i++) {
            result[i] += embedding[i];
        }
    }

    // Normalize by count
    for (let i = 0; i < dimension; i++) {
        result[i] /= embeddings.length;
    }

    return result;
}

/**
 * Create sliding windows from an array of sentences
 *
 * @param sentences - Array of sentence strings
 * @param config - Sliding window configuration
 * @returns Array of sliding windows
 */
export function createSlidingWindows(sentences: string[], config: SlidingWindowConfig): SlidingWindow[] {
    const windows: SlidingWindow[] = [];

    if (sentences.length === 0) {
        return windows;
    }

    // Handle case where sentences < windowSize
    if (sentences.length <= config.windowSize) {
        return [
            {
                startIndex: 0,
                endIndex: sentences.length,
                content: sentences.join(" "),
            },
        ];
    }

    // Generate overlapping windows
    for (let i = 0; i <= sentences.length - config.windowSize; i += config.stride) {
        const endIndex = Math.min(i + config.windowSize, sentences.length);
        windows.push({
            startIndex: i,
            endIndex,
            content: sentences.slice(i, endIndex).join(" "),
        });
    }

    // Ensure we have a window that covers the end of the document
    const lastWindow = windows.at(-1);
    if (lastWindow && lastWindow.endIndex < sentences.length) {
        windows.push({
            startIndex: sentences.length - config.windowSize,
            endIndex: sentences.length,
            content: sentences.slice(-config.windowSize).join(" "),
        });
    }

    return windows;
}

/**
 * Map window index to sentence index for boundary detection
 *
 * When a semantic boundary is detected between windows i and i+1,
 * this function determines which sentence represents that boundary.
 *
 * @param windowIndex - Index of the window before the boundary
 * @param config - Sliding window configuration
 * @returns Sentence index representing the boundary
 */
export function windowToSentenceIndex(windowIndex: number, config: SlidingWindowConfig): number {
    // Boundary is at the middle of the window with the detected similarity drop
    return windowIndex * config.stride + Math.floor(config.windowSize / 2);
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(cache: EmbeddingCache): { hits: number; misses: number; hitRate: string } {
    const total = cache.stats.hits + cache.stats.misses;
    const hitRate = total > 0 ? ((cache.stats.hits / total) * 100).toFixed(1) : "0.0";
    return {
        hits: cache.stats.hits,
        misses: cache.stats.misses,
        hitRate: `${hitRate}%`,
    };
}

/**
 * Clear all cached embeddings
 */
export function clearCache(cache: EmbeddingCache): void {
    cache.sentenceEmbeddings.clear();
    cache.windowEmbeddings.clear();
    cache.stats.hits = 0;
    cache.stats.misses = 0;
}
