# Data Infrastructure: A First Principles Analysis

## Abstract

The "Academic Research RAG Chatbot" relies on a specialized data infrastructure designed to bridge the gap between structured relational data and high-dimensional vector data. This document analyzes the database schema, focusing on the implementation of **pgvector** for semantic search, the strategy for document chunking, and the comprehensive logging of agentic reasoning steps. The database acts not just as a store of information, but as a detailed registry of the system's "cognitive" processes.

## 1. Database Paradigm

The system utilizes **PostgreSQL** as its primary data store, enhanced with the **pgvector** extension. This choice represents a "Converged Database" paradigm:

*   **Relational Integrity:** Standard SQL foreign keys ensure consistency between documents, chunks, and chat sessions.
*   **Vector Operations:** The `vector` data type allows embeddings to be stored directly alongside their source text, enabling single-query hybrid search (joining metadata filtering with vector similarity).

**Key Technology:** `Drizzle ORM` is used to define the schema in TypeScript, providing a type-safe definition of the database structure that mirrors the application logic.

## 2. Core Entities & Schema

The schema (defined in `src/lib/db/schema.ts`) allows us to trace information flow from raw ingestion to final user response.

### 2.1. Knowledge Base Storage

These entities store the system's "long-term memory."

*   **`documents`**: Represents a raw file (PDF, TXT) ingested into the system.
    *   `id`: UUID.
    *   `title`, `filePath`: Metadata for citation.
    *   `fileType`: Helps the parser determine how to read the content.
*   **`documentChunks`**: The atomic unit of retrieval.
    *   `content`: The actual text segment used for context.
    *   `embedding`: A 768-dimensional vector (using `vector(768)`) representing the semantic meaning of the content.
    *   `metadata`: JSONB field storing page numbers or section headers for precise citations.
    *   `documentId`: Foreign key linking back to the source document.

**Design Insight:** By separating the `document` (source) from the `documentChunk` (retrieval unit), the system allows for flexible re-chunking strategies without losing the original file metadata.

### 2.2. Session & Interaction Storage

These entities track the user's interaction with the system.

*   **`chatSessions`**: A container for a conversation.
    *   `createdAt`, `updatedAt`: Timestamps for session management.
*   **`messages`**: Individual turns in the conversation.
    *   `role`: 'user' or 'assistant'.
    *   `content`: The textual payload.
    *   `tokens`: Tracks token usage for cost analysis.

### 2.3. Agentic Observability (The Research Layer)

This is the most distinct part of the schema, designed for "White Box" AI research.

*   **`agentSteps`**: Logs every discrete action taken by the AI agent during a reasoning loop.
    *   `stepType`: e.g., 'thought', 'tool_call', 'retrieval'.
    *   `toolName`: e.g., 'search_documents'.
    *   `toolInput`: The arguments passed to the tool (e.g., the specific search query used).
    *   `toolOutput`: The raw result returned by the tool.
    *   `messageId`: Links the step to a specific message response.

**Why this matters:** This table allows researchers to reconstruct exactly *why* the agent gave a specific answer. We can see if it failed because of a bad search query (`toolInput`), a failure to find documents (`toolOutput`), or a logic error (`thought`).

### 2.4. Evaluation Metrics

Tables dedicated to the automated assessment of system performance (RAGAS framework).

*   **`evaluationRuns`**: Groups a set of test questions and answers.
*   **`evaluationResults`**: Stores the score for a specific metric on a specific question.
    *   `metricName`: e.g., 'faithfulness', 'answer_relevancy', 'context_precision'.
    *   `score`: A float value (0.0 - 1.0).
    *   `reasoning`: The LLM-generated explanation for why it gave that score.

## 3. Vector Implementation Details

The system uses the `vector` type from `pgvector`.

```typescript
// Conceptual Schema Definition
embedding: vector('embedding', { dimensions: 768 })
```

*   **Indexing:** To speed up retrieval, an **HNSW (Hierarchical Navigable Small World)** index is likely employed (managed via SQL migrations). This allows for approximate nearest neighbor search, which is significantly faster than exact brute-force search for large datasets.
*   **Dimensions:** Fixed at 768, corresponding to standard embedding models like `nomic-embed-text` or OpenAI's `text-embedding-3-small`.

## 4. Conclusion

The data infrastructure is not merely a passive storage bin. It is an active component of the research architecture. The relational link between `documentChunks` and `agentSteps` creates a closed loop: we can trace a final answer back to the specific chunk of text that informed it, and the specific search query that found that chunk. This traceability is the fundamental requirement for "First Principles" analysis of RAG performance.
