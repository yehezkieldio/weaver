# First Principles Documentation

This directory contains a series of deep-dive analyses into the "Academic Research RAG Chatbot" system. These documents are written from "First Principles," meaning they focus on the fundamental concepts, architectural decisions, and logical foundations of the system, rather than just listing API endpoints or code snippets.

## Table of Contents

1.  **[System Architecture](./01-System-Architecture.md)**
    *   High-level overview of the technology stack (Next.js, Bun, Drizzle).
    *   Architectural layers: Data, AI, API, and Presentation.
    *   Directory structure analysis.

2.  **[Data Infrastructure](./02-Data-Infrastructure.md)**
    *   Database schema design (`drizzle`).
    *   The "Converged Database" paradigm using `pgvector`.
    *   Core entities: Documents, Chunks, Agent Steps, and Evaluation Metrics.

3.  **[Retrieval Engine](./03-Retrieval-Engine.md)**
    *   The theory of Hybrid Retrieval (Vector + Lexical).
    *   Mathematical foundation of Reciprocal Rank Fusion (RRF).
    *   Handling of Semantic vs. Keyword search.

4.  **[Agentic Reasoning](./04-Agentic-Reasoning.md)**
    *   Moving beyond linear RAG pipelines.
    *   The "Cognitive Loop": Reasoning, Tool Use, Observation.
    *   Tools: `search_documents`, `verify_claim`, `decompose_query`.

5.  **[Evaluation Methodology](./05-Evaluation-Methodology.md)**
    *   Integration of the RAGAS framework.
    *   Defining metrics: Faithfulness, Answer Relevance, Context Precision/Recall.
    *   The process of A/B testing and Ablation Studies.

6.  **[Frontend Architecture](./06-Frontend-Architecture.md)**
    *   Visualizing the "Black Box" of AI reasoning.
    *   Handling structured data streams in the `useChat` hook.
    *   UX components for transparency: `AgentSteps`, `Sources`.

## How to Read

These documents are designed to be read sequentially to build a complete mental model of the system, starting from the high-level architecture down to the specific algorithms and UI implementations. They are intended for researchers, developers, and architects who wish to understand the "Why" behind the code.
