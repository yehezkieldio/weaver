# Retrieval Engine: A First Principles Analysis

## Abstract

The Retrieval Engine is the subsystem responsible for locating the most relevant information within the corpus to answer a user's query. This system implements a **Hybrid Retrieval** strategy, acknowledging that no single search algorithm is superior in all contexts. By combining **Dense Vector Retrieval** (Semantic Search) with **Sparse Lexical Retrieval** (Keyword Search) and fusing the results via **Reciprocal Rank Fusion (RRF)**, the engine achieves a balance of conceptual understanding and precise keyword matching.

## 1. The Duality of Search

The system operates on the premise that search queries fall into two broad categories, requiring different retrieval methods.

### 1.1. Semantic Search (Dense Vector Retrieval)
*   **Mechanism:** Converts text into high-dimensional vectors (768 dimensions) using an embedding model. Similarity is calculated using **Cosine Similarity**.
*   **Strengths:** Captures intent, synonyms, and conceptual relationships (e.g., "tuition costs" matches "school fees").
*   **Weaknesses:** Struggles with exact matches for proper nouns, acronyms, or specific ID numbers (the "out-of-vocabulary" problem).

### 1.2. Lexical Search (Sparse Keyword Retrieval)
*   **Mechanism:** Uses the **BM25 (Best Matching 25)** algorithm. It ranks documents based on the frequency of query terms in the document relative to their frequency in the entire corpus (TF-IDF principles).
*   **Strengths:** Excellent for exact phrases, names, and specific terminology.
*   **Weaknesses:** Fails if the user uses different vocabulary than the document (e.g., "car" will not match "automobile").

## 2. Hybrid Retrieval Architecture

The `hybridRetrieve` function (located in `src/lib/rag/hybrid-retrieval.ts`) orchestrates the parallel execution of these two methods.

### 2.1. The Algorithm

1.  **Preprocessing:** The user's query is cleaned and normalized.
2.  **Parallel Execution:**
    *   **Vector Query:** The query is embedded, and `pgvector` finds the nearest neighbors in the `documentChunks` table.
    *   **BM25 Query:** A custom SQL implementation or full-text search engine scans the text content of `documentChunks` for keyword matches.
3.  **Normalization & Fusion:** The two distinct lists of results—which have completely different score distributions (cosine similarity is 0-1, BM25 is unbounded)—must be combined.

## 3. Reciprocal Rank Fusion (RRF)

To merge the results, the system employs **Reciprocal Rank Fusion (RRF)**. RRF is a rank-based fusion method that avoids the problem of arbitrary score calibration.

### 3.1. Mathematical Foundation
For each document $d$ found in the set of results, the RRF score is calculated as:

$$
RRFscore(d) = \sum_{r \in R} \frac{1}{k + rank(r, d)}
$$

Where:
*   $R$ is the set of rank lists (one from Vector, one from BM25).
*   $rank(r, d)$ is the position of document $d$ in list $r$ (e.g., 1st, 2nd, 10th).
*   $k$ is a constant (typically 60) that smoothens the impact of high rankings.

### 3.2. Why RRF?
*   **Distribution Agnostic:** It ignores the raw scores (which are incomparable between Vector and BM25) and relies solely on **rank order**.
*   **Robustness:** A document that appears in *both* lists, even at moderate ranks, will be boosted significantly higher than a document that appears at the top of only one list. This enforces a "consensus" between the two search methods.

## 4. Implementation Details

### 4.1. Vector Search Implementation
Leverages the `cosineDistance` function provided by `pgvector`.
```sql
ORDER BY embedding <=> query_embedding ASC
```

### 4.2. BM25 Implementation
The system likely implements BM25 logic either via PostgreSQL's built-in `tsvector` / `ts_rank` full-text search capabilities or a custom approximation if specific weighting is required. It prioritizes terms that are rare in the corpus but present in the specific chunk.

## 5. Conclusion

The Retrieval Engine is designed to mitigate the failure modes of individual search technologies. By using RRF to fuse Semantic and Lexical search, the system creates a "safety net": if the vector model hallucinates a connection, the keyword search grounds it; if the keyword search misses a synonym, the vector search catches it. This is critical for an academic/research context where precision is paramount.
