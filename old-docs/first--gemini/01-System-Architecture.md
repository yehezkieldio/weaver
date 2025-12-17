# System Architecture: A First Principles Analysis

## Abstract

This document presents a foundational analysis of the "Academic Research RAG Chatbot" system architecture. Unlike conventional chatbots designed solely for response generation, this system is engineered as a research platform for **Agentic Retrieval-Augmented Generation (RAG)**. Its primary architectural imperative is **transparency**—the ability to decompose, observe, and measure every step of the reasoning process. This document outlines the high-level architectural layers, technology choices, and the structural organization that supports these goals.

## 1. Architectural Philosophy

The system is built upon three core design principles:

1.  **Hybrid Intelligence:** The system does not rely on a single retrieval method. Instead, it fuses semantic understanding (Vector Search) with precise keyword matching (Lexical Search) to maximize recall and precision.
2.  **Agentic Reasoning:** The system moves beyond simple "Retrieve-then-Generate" pipelines. It employs an **agentic loop** capable of decomposing complex queries, utilizing tools (search, verification), and iteratively refining its answer.
3.  **Observability & Evaluation:** Every interaction is treated as a data point. The system persists granular traces of agent steps, retrieval scores, and user feedback to facilitate rigorous A/B testing and academic evaluation (using frameworks like RAGAS).

## 2. Technology Stack

The technology stack is selected to provide strict type safety, high performance, and seamless integration with modern AI ecosystems.

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Runtime & Package Manager** | **Bun** | Selected for superior startup time and package installation speed compared to Node/npm. |
| **Framework** | **Next.js (App Router)** | Provides a unified backend/frontend environment, server-side streaming capabilities, and simplified API routing. |
| **Language** | **TypeScript** | Enforces type safety across the full stack, essential for maintaining the complex data structures of agent traces and evaluation metrics. |
| **Database** | **PostgreSQL + pgvector** | A robust relational database extended with vector similarity search capabilities. This unifies relational data (users, logs) and semantic data (embeddings) in a single store. |
| **ORM** | **Drizzle ORM** | Chosen for its "SQL-like" typescript API and lightweight abstraction, offering better performance and transparency than heavier ORMs like Prisma. |
| **AI Orchestration** | **Vercel AI SDK** | specific abstraction layer for LLM interaction, streamlining tool calling and response streaming. |
| **Styling** | **Tailwind CSS + shadcn/ui** | Facilitates rapid UI development with a consistent, accessible design system. |

## 3. High-Level Architecture Layers

The system uses a layered architecture to separate concerns, ensuring that the complex logic of the RAG engine is decoupled from the user interface.

### 3.1. The Data Layer (`src/lib/db`)
The foundation of the system. It manages persistent storage for:
*   **Corpus:** Raw documents and their chunked, embedded representations.
*   **Operational Data:** Chat sessions, message history.
*   **Research Data:** Detailed traces of agent reasoning steps, retrieval metrics, and evaluation results.

### 3.2. The AI Engine (`src/lib/rag`)
The core logic layer containing the "brain" of the application. It consists of two sub-systems:
*   **Retrieval Engine:** Implements the Hybrid Search algorithm (Vector + BM25) and Reciprocal Rank Fusion (RRF).
*   **Agentic Core:** Manages the LLM's tool use loop, decision making, and answer synthesis.

### 3.3. The API Layer (`src/app/api`)
Acts as the interface between the client and the AI Engine. Key responsibilities include:
*   **State Management:** Hydrating and persisting chat sessions.
*   **Streaming:** transforming internal agent events into a structured stream for the client.
*   **Routing:** Dispatching requests to the appropriate pipeline (Agentic vs. Standard RAG).

### 3.4. The Presentation Layer (`src/components`)
A React-based frontend designed for **visualizing the black box**. It consumes the structured stream to render:
*   Real-time agent thoughts and tool usage.
*   Interactive citations linking generated text to source documents.
*   Evaluation dashboards for analyzing system performance.

## 4. Directory Structure Analysis

The project follows a standard Next.js directory structure, augmented with domain-specific libraries.

```text
/
├── corpus/                 # Raw source documents (PDF, TXT) for ingestion.
├── src/
│   ├── app/                # Next.js App Router (Pages & API endpoints).
│   │   └── api/            # Backend endpoints (chat, ingest, evaluation).
│   ├── components/         # React UI components.
│   │   ├── chat/           # Chat interface, message bubbles, visualizations.
│   │   └── evaluation/     # Dashboards for research metrics.
│   ├── lib/                # Core business logic and utilities.
│   │   ├── ai/             # AI model configuration & embedding generation.
│   │   ├── db/             # Drizzle schema and DB connection.
│   │   └── rag/            # RAG algorithms (hybrid search, agent loop).
│   └── scripts/            # CLI utilities for data ingestion and analysis.
├── drizzle/                # SQL migration files.
└── public/                 # Static assets.
```

## 5. Conclusion

The architecture of this system is defined by its dual purpose: providing a high-quality user experience while simultaneously serving as a rigorous instrument for AI research. By strictly separating the retrieval, reasoning, and evaluation concerns, the system allows researchers to isolate variables and measure the impact of specific architectural decisions on overall performance.
